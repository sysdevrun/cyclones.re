#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const trajectoryFile = path.join(__dirname, 'trajectory.json');

try {
  const data = JSON.parse(fs.readFileSync(trajectoryFile, 'utf-8'));
  const traj = data.cyclone_trajectory;

  console.log('='.repeat(70));
  console.log('METEO FRANCE - CYCLONE TRAJECTORY METADATA');
  console.log('='.repeat(70));
  console.log();
  console.log('📋 CYCLONE INFORMATION:');
  console.log('  Cyclone Name:      ', traj.cyclone_name);
  console.log('  Cyclone Number:    ', traj.cyclone_number);
  console.log('  Cyclone ID:        ', traj.cyclone_id);
  console.log('  Basin:             ', traj.basin);
  console.log('  Season:            ', traj.season);
  console.log();
  console.log('🏢 DATA SOURCE:');
  console.log('  Production Center: ', traj.production_center);
  console.log('  Product:           ', traj.product);
  console.log('  Last Updated:      ', traj.update_time);
  console.log('  Reference Time:    ', traj.reference_time);
  console.log();
  console.log('📊 TRAJECTORY STATISTICS:');
  console.log('  Total Features:    ', traj.features.length);

  const analysisFeatures = traj.features.filter((f: any) => f.properties.data_type === 'analysis');
  const forecastFeatures = traj.features.filter((f: any) => f.properties.data_type === 'forecast');

  console.log('  Analysis Points:   ', analysisFeatures.length);
  console.log('  Forecast Points:   ', forecastFeatures.length);
  console.log();

  if (analysisFeatures.length > 0) {
    const first = analysisFeatures[0];
    const last = analysisFeatures[analysisFeatures.length - 1];

    console.log('⏰ TIME RANGE (Analysis):');
    console.log('  First Observation: ', first.properties.time);
    console.log('  Last Observation:  ', last.properties.time);
    console.log();
  }

  if (analysisFeatures.length > 0) {
    const latest = analysisFeatures[analysisFeatures.length - 1];
    const cycloneData = latest.properties.cyclone_data;

    console.log('🌪️  LATEST CYCLONE STATUS:');
    console.log('  Time:              ', latest.properties.time);
    console.log('  Position:          ', latest.geometry.coordinates.join(', '), '(lon, lat)');
    console.log('  Development:       ', cycloneData.development);
    console.log('  Min Pressure:      ', cycloneData.minimum_pressure, 'hPa');
    console.log('  Max Wind Speed:    ', cycloneData.maximum_wind?.wind_speed_kt || 'N/A', 'kt');
    console.log('  Max Gust:          ', cycloneData.maximum_wind?.wind_speed_gust_kt || 'N/A', 'kt');
    console.log('  Storm Motion:      ', cycloneData.storm_motion?.speed_kt || 'N/A', 'kt at', cycloneData.storm_motion?.direction_toward || 'N/A', '°');
    console.log();
  }

  // Show some forecast data
  if (forecastFeatures.length > 0) {
    console.log('🔮 FORECAST INFORMATION:');
    console.log('  Number of Forecasts:', forecastFeatures.length);

    const firstForecast = forecastFeatures[0];
    const lastForecast = forecastFeatures[forecastFeatures.length - 1];

    console.log('  First Forecast:    ', firstForecast.properties.time);
    console.log('  Last Forecast:     ', lastForecast.properties.time);
    console.log();
  }

  // Development stages
  const developments = new Set(traj.features.map((f: any) => f.properties.cyclone_data?.development).filter(Boolean));
  console.log('📈 DEVELOPMENT STAGES:');
  developments.forEach((stage: any) => console.log('  -', stage));
  console.log();

  console.log('🗂️  FILE INFORMATION:');
  const stats = fs.statSync(trajectoryFile);
  console.log('  File Path:         ', trajectoryFile);
  console.log('  File Size:         ', (stats.size / 1024).toFixed(2), 'KB');
  console.log('  Modified:          ', stats.mtime.toISOString());
  console.log();
  console.log('='.repeat(70));

} catch (error) {
  console.error('Error reading trajectory file:', error);
  process.exit(1);
}
