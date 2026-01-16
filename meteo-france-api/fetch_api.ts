#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, CycloneListResponse, CycloneTrajectoryResponse } from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(__dirname, 'api_data.json');
const BASIN = 'SWI';

interface ApiDataMetadata {
  path: string;
  type: 'cyclone_list' | 'cyclone_trajectory';
  date: string;
  timestamp: number;
  cyclone_id?: string;
  cyclone_name?: string;
}

// Ensure directory exists
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Get current cyclone season (July to June cycle)
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Season runs from July to June
  if (month >= 7) {
    return `${year}${year + 1}`;
  } else {
    return `${year - 1}${year}`;
  }
}

// Format date for display
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Get all JSON files recursively
function getJsonFiles(dir: string): ApiDataMetadata[] {
  const files: ApiDataMetadata[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function walkDir(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const stats = fs.statSync(fullPath);
        const relativePath = path.relative(BASE_DIR, fullPath);

        // Parse metadata from path structure: YYYY-MM-DD/HH-MM-SS/type.json or cyclone_id.json
        const parts = relativePath.split(path.sep);
        const dateStr = parts[0]; // YYYY-MM-DD
        const timeStr = parts[1]?.replace(/-/g, ':') || '00:00:00'; // HH:MM:SS
        const filename = parts[2] || entry.name;

        // Determine type and extract cyclone info
        let type: 'cyclone_list' | 'cyclone_trajectory';
        let cyclone_id: string | undefined;
        let cyclone_name: string | undefined;

        if (filename === 'cyclone_list.json') {
          type = 'cyclone_list';
        } else {
          type = 'cyclone_trajectory';
          // Try to read the file to get cyclone info
          try {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as CycloneTrajectoryResponse;
            cyclone_id = content.cyclone_trajectory.cyclone_id;
            cyclone_name = content.cyclone_trajectory.cyclone_name;
          } catch {
            // If we can't read, extract from filename
            cyclone_id = filename.replace('.json', '').replace(/_/g, '/');
          }
        }

        files.push({
          path: `data/${relativePath.replace(/\\/g, '/')}`,
          type,
          date: `${dateStr} ${timeStr}`,
          timestamp: Math.floor(stats.mtimeMs / 1000),
          cyclone_id,
          cyclone_name,
        });
      }
    }
  }

  walkDir(dir);
  return files;
}

// Generate JSON index
function generateJSON(): void {
  console.log('Generating JSON index...');

  const files = getJsonFiles(BASE_DIR);

  // Sort by timestamp
  files.sort((a, b) => a.timestamp - b.timestamp);

  fs.writeFileSync(JSON_FILE, JSON.stringify(files, null, 2));
  console.log(`JSON index generated at ${JSON_FILE}`);
  console.log(`Total API responses: ${files.length}`);
}

// Save JSON data to file
function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Main function
async function main(): Promise<void> {
  try {
    // Create base directory
    ensureDir(BASE_DIR);

    // Get current date and time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

    // Create timestamped directory
    const timeDir = path.join(BASE_DIR, dateStr, timeStr);
    ensureDir(timeDir);

    // Initialize client
    const client = createClient();
    const season = getCurrentSeason();

    console.log(`Fetching cyclone data for basin ${BASIN}, season ${season}...`);

    // Fetch cyclone list
    console.log('1. Fetching cyclone list...');
    const cycloneList = await client.listCyclones(BASIN, season as `${number}${number}${number}${number}${number}${number}${number}${number}`);

    const listFile = path.join(timeDir, 'cyclone_list.json');
    saveJson(listFile, cycloneList);
    console.log(`   Saved cyclone list to ${listFile}`);

    const cycloneIds = Object.keys(cycloneList.cyclone_list);
    console.log(`   Found ${cycloneIds.length} cyclone(s): ${cycloneIds.map(id => cycloneList.cyclone_list[id].cyclone_name).join(', ') || 'none'}`);

    // Fetch trajectory for each cyclone
    for (const cycloneId of cycloneIds) {
      const cyclone = cycloneList.cyclone_list[cycloneId];
      console.log(`2. Fetching trajectory for ${cyclone.cyclone_name} (${cycloneId})...`);

      const trajectory = await client.getCycloneTrajectory(cycloneId);

      // Sanitize cyclone ID for filename (replace / and $ with _)
      const safeId = cycloneId.replace(/[/$]/g, '_');
      const trajectoryFile = path.join(timeDir, `${safeId}.json`);
      saveJson(trajectoryFile, trajectory);
      console.log(`   Saved trajectory to ${trajectoryFile}`);

      const analysisCount = trajectory.cyclone_trajectory.features.filter(
        f => f.properties.data_type === 'analysis'
      ).length;
      const forecastCount = trajectory.cyclone_trajectory.features.filter(
        f => f.properties.data_type === 'forecast'
      ).length;
      console.log(`   Features: ${analysisCount} analysis, ${forecastCount} forecast`);
    }

    // Generate JSON index
    generateJSON();

    console.log('\nFetch completed successfully!');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
