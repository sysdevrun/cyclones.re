#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { Storage } from '@google-cloud/storage';

// Configuration
const IMAGE_URL = 'http://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/francais/tpsreel/trajectoire.png';
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'meteo-cyclone-images';
const LOCAL_TEMP_DIR = '/tmp/images';
const JSON_FILE = 'images.json';

interface ImageMetadata {
  path: string;
  date: string;
  timestamp: number;
}

// Initialize Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

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
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });
    }).on('error', reject);
  });
}

// Upload file to GCS
async function uploadToGCS(localPath: string, gcsPath: string): Promise<void> {
  await bucket.upload(localPath, {
    destination: gcsPath,
    metadata: {
      cacheControl: 'public, max-age=300',
    },
  });
  console.log(`Uploaded ${gcsPath} to GCS`);
}

// List all images in GCS bucket
async function listImagesInGCS(): Promise<ImageMetadata[]> {
  const [files] = await bucket.getFiles({ prefix: 'images/' });

  const images: ImageMetadata[] = [];

  for (const file of files) {
    if (file.name.endsWith('.png')) {
      const metadata = await file.getMetadata();
      const timeCreated = new Date(metadata[0].timeCreated);

      // Parse date from path structure
      const pathParts = file.name.split('/');
      if (pathParts.length >= 3) {
        const dateStr = pathParts[1]; // YYYY-MM-DD
        const timeStr = pathParts[2].replace('.png', '').replace(/-/g, ':'); // HH:MM:SS

        images.push({
          path: file.name,
          date: `${dateStr} ${timeStr}`,
          timestamp: Math.floor(timeCreated.getTime() / 1000)
        });
      }
    }
  }

  return images;
}

// Generate and upload JSON index
async function generateAndUploadJSON(): Promise<void> {
  console.log('Generating JSON index...');

  const images = await listImagesInGCS();

  // Sort by timestamp
  images.sort((a, b) => a.timestamp - b.timestamp);

  const jsonContent = JSON.stringify(images, null, 2);

  // Upload JSON to bucket
  await bucket.file(JSON_FILE).save(jsonContent, {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=60',
    },
  });

  console.log(`JSON index uploaded to GCS`);
  console.log(`Total images: ${images.length}`);
}

// Main function
async function main(): Promise<void> {
  try {
    console.log('Starting image fetch process...');

    // Create temp directory
    ensureDir(LOCAL_TEMP_DIR);

    // Get current date and time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

    // Download image to temp location
    const tempImagePath = path.join(LOCAL_TEMP_DIR, `${timeStr}.png`);
    console.log(`Fetching image from ${IMAGE_URL}...`);

    await downloadFile(IMAGE_URL, tempImagePath);
    console.log(`Successfully downloaded image to ${tempImagePath}`);

    // Upload to GCS
    const gcsPath = `images/${dateStr}/${timeStr}.png`;
    await uploadToGCS(tempImagePath, gcsPath);

    // Clean up temp file
    fs.unlinkSync(tempImagePath);

    // Generate and upload JSON index
    await generateAndUploadJSON();

    console.log('Process completed successfully!');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
