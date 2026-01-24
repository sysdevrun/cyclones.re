import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import type { SnapshotMetadata, CycloneTrajectoryFile, CycloneReport, LoadedSnapshot } from '../types';

export const API_BASE_URL = 'https://cmrs.sys-dev-run.fr';
const REUNION_TIMEZONE = 'Indian/Reunion';

// Cache for loaded snapshot data
const snapshotCache: Map<number, LoadedSnapshot> = new Map();

// Load metadata from api_data.json
export async function loadMetadata(): Promise<SnapshotMetadata[]> {
  const response = await fetch(`${API_BASE_URL}/data/api_data.json`);
  if (!response.ok) {
    throw new Error('Failed to load api_data.json');
  }

  const data: SnapshotMetadata[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No snapshot data found');
  }

  // Sort by timestamp
  return data.sort((a, b) => a.timestamp - b.timestamp);
}

// Fetch snapshot data from files
export async function fetchSnapshotData(metadata: SnapshotMetadata): Promise<LoadedSnapshot> {
  // Return cached data if available
  const cached = snapshotCache.get(metadata.timestamp);
  if (cached) {
    return cached;
  }

  // Fetch trajectories in parallel
  const trajectoryPromises = metadata.trajectory_files.map(async (trajectoryFile) => {
    const response = await fetch(`${API_BASE_URL}/${trajectoryFile}`);
    if (response.ok) {
      return response.json() as Promise<CycloneTrajectoryFile>;
    }
    return null;
  });

  const trajectoryResults = await Promise.all(trajectoryPromises);
  const trajectories = trajectoryResults.filter((t): t is CycloneTrajectoryFile => t !== null);

  // Fetch report if available
  let report: CycloneReport | null = null;
  if (metadata.report_file) {
    const response = await fetch(`${API_BASE_URL}/${metadata.report_file}`);
    if (response.ok) {
      report = await response.json();
    }
  }

  // Create snapshot object
  const snapshot: LoadedSnapshot = {
    timestamp: metadata.timestamp,
    date: metadata.date,
    trajectories,
    report,
  };

  // Cache the loaded data
  snapshotCache.set(metadata.timestamp, snapshot);

  return snapshot;
}

// Get satellite image URL
export function getSatelliteImageUrl(filePath: string): string {
  return `${API_BASE_URL}/${filePath}`;
}

// Convert bbox [minLon, minLat, maxLon, maxLat] to Leaflet bounds [[minLat, minLon], [maxLat, maxLon]]
export function bboxToLeafletBounds(bbox: [number, number, number, number]): [[number, number], [number, number]] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [[minLat, minLon], [maxLat, maxLon]];
}

// Format timestamp to Réunion timezone
export function formatDateReunion(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const zonedDate = toZonedTime(date, REUNION_TIMEZONE);
  return format(zonedDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}

/**
 * Get all satellite image URLs from metadata list
 */
export function getSatelliteImageUrls(metadataList: SnapshotMetadata[]): string[] {
  const urls: string[] = [];

  for (const meta of metadataList) {
    if (meta.satellite_ir108?.file) {
      urls.push(getSatelliteImageUrl(meta.satellite_ir108.file));
    }
    if (meta.satellite_rgb_naturalenhncd?.file) {
      urls.push(getSatelliteImageUrl(meta.satellite_rgb_naturalenhncd.file));
    }
  }

  return urls;
}
