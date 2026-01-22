#!/usr/bin/env tsx

/**
 * Satellite Image Fetcher
 *
 * Dedicated script for fetching satellite images from EUMETSAT WMS.
 * Designed to be run via cron for periodic image collection.
 *
 * Configuration is read from satellite_metadata.json. If the file doesn't exist,
 * it will be created with default configuration.
 *
 * Usage: tsx fetch_satellite.ts
 *
 * Cron example (every 15 minutes):
 *   0,15,30,45 * * * * cd /path/to/meteo-france-api && tsx fetch_satellite.ts >> logs/satellite.log 2>&1
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WMSDownloader } from '../wms-downloader/index';
import type { SatelliteImageEntry, SatelliteMetadata, SatelliteFetchConfig } from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Metadata file path
const METADATA_FILE = path.join(__dirname, 'satellite_metadata.json');

// ============ Default Configuration ============

const DEFAULT_CONFIG: SatelliteFetchConfig = {
  bbox: [21.1, -41, 103, 21.1],
  height: 1000,
  output_dir: 'satellite_images',
  layers: [
    {
      id: 'ir108',
      name: 'IR108 Infrared',
      url: 'https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows',
      layer: 'ir108',
    },
    {
      id: 'rgb_naturalenhncd',
      name: 'RGB Natural Enhanced',
      url: 'https://view.eumetsat.int/geoserver/msg_iodc/rgb_naturalenhncd/ows',
      layer: 'rgb_naturalenhncd',
    },
  ],
};

// ============ Utility Functions ============

/**
 * Compute image width from bbox and height to maintain aspect ratio
 */
function computeWidth(bbox: [number, number, number, number], height: number): number {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return Math.round(height * (maxLon - minLon) / (maxLat - minLat));
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get date components for directory structure
 */
function getDateComponents(date: Date): { dateStr: string; timeStr: string } {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hours}-${minutes}-${seconds}`,
  };
}

/**
 * Get relative path from __dirname
 */
function getRelativePath(absolutePath: string): string {
  return path.relative(__dirname, absolutePath);
}

/**
 * Load existing metadata or create with default config
 */
function loadMetadata(): SatelliteMetadata {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const content = fs.readFileSync(METADATA_FILE, 'utf-8');
      return JSON.parse(content) as SatelliteMetadata;
    } catch {
      console.warn('Warning: Could not parse existing satellite_metadata.json, starting fresh');
    }
  }

  // Create new metadata with default config
  return {
    last_updated: 0,
    last_updated_date: '',
    total_images: 0,
    config: DEFAULT_CONFIG,
    images: [],
  };
}

/**
 * Save metadata to file
 */
function saveMetadata(metadata: SatelliteMetadata): void {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

/**
 * Download a satellite image from WMS
 */
async function downloadSatelliteImage(
  wmsUrl: string,
  layer: string,
  bbox: [number, number, number, number],
  width: number,
  height: number,
  outputPath: string
): Promise<boolean> {
  try {
    const downloader = new WMSDownloader(wmsUrl);

    await downloader.downloadToFile({
      layers: layer,
      bbox,
      width,
      height,
      format: 'image/png',
      transparent: 'true',
    }, outputPath);

    return true;
  } catch (error) {
    console.error(`   Error downloading ${layer}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// ============ Main Function ============

async function main(): Promise<void> {
  try {
    const now = new Date();
    const timestamp = Math.floor(now.getTime() / 1000);
    const dateStr = formatDate(now);
    const { dateStr: datePart, timeStr: timePart } = getDateComponents(now);

    // Load metadata (contains config)
    const metadata = loadMetadata();
    const config = metadata.config;

    // Compute width from bbox and height
    const width = computeWidth(config.bbox, config.height);

    // Resolve output directory
    const outputBaseDir = path.join(__dirname, config.output_dir);

    console.log('='.repeat(60));
    console.log('Satellite Image Fetcher');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${dateStr}`);
    console.log(`Output directory: ${outputBaseDir}`);
    console.log(`Image dimensions: ${width}x${config.height}`);
    console.log(`Bounding box: [${config.bbox.join(', ')}]`);
    console.log(`Layers: ${config.layers.map(l => l.id).join(', ')}`);
    console.log('');

    // Create output directory for this run
    const outputDir = path.join(outputBaseDir, datePart, timePart);
    fs.mkdirSync(outputDir, { recursive: true });

    const newImages: SatelliteImageEntry[] = [];

    // Download each layer
    for (let i = 0; i < config.layers.length; i++) {
      const layerConfig = config.layers[i];
      console.log(`${i + 1}. Downloading ${layerConfig.name}...`);

      const filename = `satellite_${layerConfig.id}.png`;
      const outputPath = path.join(outputDir, filename);

      const success = await downloadSatelliteImage(
        layerConfig.url,
        layerConfig.layer,
        config.bbox,
        width,
        config.height,
        outputPath
      );

      if (success) {
        const imageEntry: SatelliteImageEntry = {
          id: `${timestamp}_${layerConfig.id}`,
          file: getRelativePath(outputPath),
          layer: layerConfig.id,
          layer_name: layerConfig.name,
          timestamp,
          date: dateStr,
          config: {
            bbox: config.bbox,
            width,
            height: config.height,
          },
        };

        newImages.push(imageEntry);
        console.log(`   Saved to ${imageEntry.file}`);
      }
    }

    // Update metadata
    if (newImages.length > 0) {
      metadata.images.push(...newImages);
      metadata.images.sort((a, b) => a.timestamp - b.timestamp);
      metadata.last_updated = timestamp;
      metadata.last_updated_date = dateStr;
      metadata.total_images = metadata.images.length;

      saveMetadata(metadata);

      console.log('');
      console.log(`Metadata saved to ${getRelativePath(METADATA_FILE)}`);
      console.log(`Total images in index: ${metadata.total_images}`);
    } else {
      console.log('');
      console.warn('Warning: No images were downloaded');
    }

    console.log('');
    console.log('Fetch completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main function
main();
