#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Configuration
const IMAGE_URL = 'http://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/francais/tpsreel/trajectoire.png';
const BASE_DIR = path.join(__dirname, 'images');
const JSON_FILE = path.join(__dirname, 'images.json');

interface ImageMetadata {
  path: string;
  date: string;
  timestamp: number;
}

// Ensure directory exists
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Download file from URL
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', reject);
  });
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

// Get all image files recursively
function getImageFiles(dir: string): ImageMetadata[] {
  const images: ImageMetadata[] = [];

  if (!fs.existsSync(dir)) {
    return images;
  }

  function walkDir(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.png')) {
        const stats = fs.statSync(fullPath);
        const relativePath = path.relative(BASE_DIR, fullPath);

        // Parse date from path structure
        const parts = relativePath.split(path.sep);
        const dateStr = parts[0]; // YYYY-MM-DD
        const timeStr = parts[1].replace('.png', '').replace(/-/g, ':'); // HH:MM:SS

        images.push({
          path: `images/${relativePath.replace(/\\/g, '/')}`,
          date: `${dateStr} ${timeStr}`,
          timestamp: Math.floor(stats.mtimeMs / 1000)
        });
      }
    }
  }

  walkDir(dir);
  return images;
}

// Generate JSON index
function generateJSON(): void {
  console.log('Generating JSON index...');

  const images = getImageFiles(BASE_DIR);

  // Sort by timestamp
  images.sort((a, b) => a.timestamp - b.timestamp);

  fs.writeFileSync(JSON_FILE, JSON.stringify(images, null, 2));
  console.log(`JSON index generated at ${JSON_FILE}`);
  console.log(`Total images: ${images.length}`);
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

    // Create daily directory
    const dayDir = path.join(BASE_DIR, dateStr);
    ensureDir(dayDir);

    // Download image
    const imageFile = path.join(dayDir, `${timeStr}.png`);
    console.log(`Fetching image from ${IMAGE_URL}...`);

    await downloadFile(IMAGE_URL, imageFile);
    console.log(`Successfully downloaded image to ${imageFile}`);

    // Generate JSON index
    generateJSON();

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
