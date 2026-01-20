#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  createClient,
  CycloneListResponse,
  CycloneTrajectoryResponse,
  CycloneReport,
  FetchSnapshot,
  ApiData,
  SatelliteImage,
} from './src/index.js';
import WMSDownloader from '../wms-downloader/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const JSON_FILE = path.join(__dirname, 'api_data.json');
const DATA_DIR = path.join(__dirname, 'data');
const BASIN = 'SWI';

// WMS Configuration for Indian Ocean satellite imagery
const WMS_URL = 'https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows';
const WMS_LAYER = 'ir108';
// Indian Ocean bounding box focused on cyclone region
const WMS_BBOX: [number, number, number, number] = [30, -40, 100, 10];
const WMS_WIDTH = 1400;
const WMS_HEIGHT = 1000;

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

// Create directory path from date
function getDateDir(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return path.join(DATA_DIR, `${year}-${month}-${day}`, `${hours}-${minutes}-${seconds}`);
}

// Sanitize cyclone ID for filename
function sanitizeCycloneId(cycloneId: string): string {
  return cycloneId.replace(/[$/]/g, '_');
}

// Load existing api_data.json or create empty array
function loadApiData(): ApiData {
  if (fs.existsSync(JSON_FILE)) {
    try {
      const content = fs.readFileSync(JSON_FILE, 'utf-8');
      return JSON.parse(content) as ApiData;
    } catch {
      console.warn('Warning: Could not parse existing api_data.json, starting fresh');
      return [];
    }
  }
  return [];
}

// Save api_data.json
function saveApiData(data: ApiData): void {
  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
}

// Get relative path from __dirname
function getRelativePath(absolutePath: string): string {
  return path.relative(__dirname, absolutePath);
}

// Download satellite image from WMS
async function downloadSatelliteImage(outputDir: string): Promise<SatelliteImage | null> {
  try {
    const downloader = new WMSDownloader(WMS_URL);

    // Generate filename with layer type for future extensibility
    const filename = `satellite_${WMS_LAYER}.png`;
    const outputPath = path.join(outputDir, filename);

    await downloader.downloadToFile({
      layers: WMS_LAYER,
      bbox: WMS_BBOX,
      width: WMS_WIDTH,
      height: WMS_HEIGHT,
      format: 'image/png',
    }, outputPath);

    return {
      file: getRelativePath(outputPath),
      layer: WMS_LAYER,
      bbox: WMS_BBOX,
      width: WMS_WIDTH,
      height: WMS_HEIGHT,
    };
  } catch (error) {
    console.warn(`   Warning: Could not download satellite image: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    const dateStr = formatDate(now);
    const dateDir = getDateDir(now);

    // Create directory for this run
    fs.mkdirSync(dateDir, { recursive: true });

    // Initialize client
    const client = createClient();
    const season = getCurrentSeason();

    console.log(`Fetching cyclone data for basin ${BASIN}, season ${season}...`);
    console.log(`Timestamp: ${dateStr}`);
    console.log(`Output directory: ${dateDir}`);

    // Fetch cyclone list
    console.log('\n1. Fetching cyclone list...');
    const cycloneList: CycloneListResponse = await client.listCyclones(
      BASIN,
      season as `${number}${number}${number}${number}${number}${number}${number}${number}`
    );

    const cycloneIds = Object.keys(cycloneList.cyclone_list);
    console.log(`   Found ${cycloneIds.length} cyclone(s): ${cycloneIds.map(id => cycloneList.cyclone_list[id].cyclone_name).join(', ') || 'none'}`);

    // Save cyclone list
    const cycloneListFile = path.join(dateDir, 'cyclone_list.json');
    fs.writeFileSync(cycloneListFile, JSON.stringify(cycloneList, null, 2));
    console.log(`   Saved to ${getRelativePath(cycloneListFile)}`);

    // Fetch and save trajectories for each cyclone
    const trajectoryFiles: string[] = [];
    let trajectoryIndex = 2;

    for (const cycloneId of cycloneIds) {
      const cyclone = cycloneList.cyclone_list[cycloneId];
      console.log(`\n${trajectoryIndex}. Fetching trajectory for ${cyclone.cyclone_name} (${cycloneId})...`);

      const trajectory: CycloneTrajectoryResponse = await client.getCycloneTrajectory(cycloneId);

      const analysisCount = trajectory.cyclone_trajectory.features.filter(
        f => f.properties.data_type === 'analysis'
      ).length;
      const forecastCount = trajectory.cyclone_trajectory.features.filter(
        f => f.properties.data_type === 'forecast'
      ).length;
      console.log(`   Features: ${analysisCount} analysis, ${forecastCount} forecast`);

      // Save trajectory
      const trajectoryFile = path.join(dateDir, `trajectory_${sanitizeCycloneId(cycloneId)}.json`);
      fs.writeFileSync(trajectoryFile, JSON.stringify(trajectory, null, 2));
      trajectoryFiles.push(getRelativePath(trajectoryFile));
      console.log(`   Saved to ${getRelativePath(trajectoryFile)}`);

      trajectoryIndex++;
    }

    // Fetch report
    console.log(`\n${trajectoryIndex}. Fetching cyclone activity report...`);
    let reportFile: string | null = null;
    try {
      const report: CycloneReport = await client.getReport(BASIN);
      console.log(`   Report title: ${report.report_title}`);
      console.log(`   Updated: ${new Date(report.update_time * 1000).toLocaleString()}`);

      // Save report
      const reportPath = path.join(dateDir, 'report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      reportFile = getRelativePath(reportPath);
      console.log(`   Saved to ${reportFile}`);
    } catch (error) {
      console.warn(`   Warning: Could not fetch report: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Download satellite image
    const satelliteStepNum = trajectoryIndex + 1;
    console.log(`\n${satelliteStepNum}. Downloading Indian Ocean satellite image (${WMS_LAYER})...`);
    const satelliteImage = await downloadSatelliteImage(dateDir);
    if (satelliteImage) {
      console.log(`   Layer: ${satelliteImage.layer}`);
      console.log(`   Bounding box: [${satelliteImage.bbox.join(', ')}]`);
      console.log(`   Size: ${satelliteImage.width}x${satelliteImage.height}`);
      console.log(`   Saved to ${satelliteImage.file}`);
    }

    // Create snapshot metadata
    const snapshot: FetchSnapshot = {
      timestamp,
      date: dateStr,
      cyclone_list: cycloneList,
      cyclone_list_file: getRelativePath(cycloneListFile),
      trajectory_files: trajectoryFiles,
      report_file: reportFile,
      satellite_image: satelliteImage,
    };

    // Load existing data and append new snapshot
    const apiData = loadApiData();
    apiData.push(snapshot);

    // Sort by timestamp
    apiData.sort((a, b) => a.timestamp - b.timestamp);

    // Save updated data
    saveApiData(apiData);

    console.log(`\nSnapshot metadata saved to ${JSON_FILE}`);
    console.log(`Total snapshots: ${apiData.length}`);
    console.log('\nFetch completed successfully!');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
