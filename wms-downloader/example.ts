#!/usr/bin/env tsx

/**
 * Example usage of the WMS Downloader Library
 *
 * This example demonstrates how to:
 * 1. Connect to EUMETSAT WMS service
 * 2. Get service capabilities
 * 3. Download map images
 * 4. Save images to files
 *
 * Run with: tsx wms-downloader/example.ts
 */

import { WMSDownloader } from './index';
import { mkdir } from 'fs/promises';
import { join } from 'path';

async function main() {
  console.log('WMS Downloader Library - Example Usage\n');

  // Create a downloader for EUMETSAT IR108 channel
  const eumetsat = new WMSDownloader(
    'https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows'
  );

  try {
    // 1. Get and display service capabilities
    console.log('📡 Fetching WMS capabilities...');
    const capabilities = await eumetsat.getCapabilities();

    console.log('\n📋 Service Information:');
    console.log(`   Title: ${capabilities.service.title || 'N/A'}`);
    console.log(`   Version: ${capabilities.version}`);

    console.log('\n🗺️  Available Layers:');
    capabilities.layers.forEach((layer, index) => {
      console.log(`   ${index + 1}. ${layer.name}`);
      if (layer.title) console.log(`      Title: ${layer.title}`);
      if (layer.abstract) console.log(`      Description: ${layer.abstract}`);
    });

    console.log('\n📦 Supported Formats:');
    capabilities.formats?.forEach(format => {
      console.log(`   - ${format}`);
    });

    // 2. Get list of available layers
    console.log('\n🔍 Getting available layers...');
    const layers = await eumetsat.getLayers();
    console.log(`   Found ${layers.length} layer(s): ${layers.join(', ')}`);

    // 3. Download a map image
    console.log('\n⬇️  Downloading map image...');

    // Create output directory if it doesn't exist
    const outputDir = join(process.cwd(), 'wms-downloads');
    await mkdir(outputDir, { recursive: true });

    // Example 1: Download full globe view
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath1 = join(outputDir, `eumetsat-ir108-global-${timestamp}.png`);

    await eumetsat.downloadToFile(
      {
        layers: layers[0] || 'ir108', // Use first available layer
        bbox: [-180, -90, 180, 90],   // Full globe
        width: 2048,
        height: 1024,
        format: 'image/png',
        crs: 'EPSG:4326'
      },
      outputPath1
    );
    console.log(`   ✅ Saved global view to: ${outputPath1}`);

    // Example 2: Download Indian Ocean region (where IODC satellite is positioned)
    const outputPath2 = join(outputDir, `eumetsat-ir108-indian-ocean-${timestamp}.png`);

    await eumetsat.downloadToFile(
      {
        layers: layers[0] || 'ir108',
        bbox: [30, -60, 120, 30],     // Indian Ocean region
        width: 1800,
        height: 1800,
        format: 'image/png',
        crs: 'EPSG:4326'
      },
      outputPath2
    );
    console.log(`   ✅ Saved Indian Ocean view to: ${outputPath2}`);

    // Example 3: Download as Buffer (for further processing)
    console.log('\n💾 Downloading image as buffer...');
    const imageBuffer = await eumetsat.getMap({
      layers: layers[0] || 'ir108',
      bbox: [40, -30, 90, 20],        // Focused region
      width: 800,
      height: 800,
      format: 'image/png'
    });
    console.log(`   ✅ Downloaded ${imageBuffer.length} bytes`);

    // Example 4: Download with additional WMS parameters
    const outputPath3 = join(outputDir, `eumetsat-ir108-styled-${timestamp}.png`);

    await eumetsat.downloadToFile(
      {
        layers: layers[0] || 'ir108',
        bbox: [40, -30, 90, 20],
        width: 1024,
        height: 1024,
        format: 'image/png',
        transparent: true,
        bgcolor: '0x000000',
        styles: ''
      },
      outputPath3
    );
    console.log(`   ✅ Saved styled image to: ${outputPath3}`);

    console.log('\n✨ Example completed successfully!');
    console.log(`\n📁 Check the '${outputDir}' directory for downloaded images.`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
