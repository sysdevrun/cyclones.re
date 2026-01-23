// Snapshot metadata from api_data.json
export interface SnapshotMetadata {
  timestamp: number;
  date: string;
  trajectory_files: string[];
  report_file: string | null;
  satellite_ir108: SatelliteImageData | null;
  satellite_rgb_naturalenhncd: SatelliteImageData | null;
}

export interface SatelliteImageData {
  file: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat] in degrees
}

// Cyclone trajectory data
export interface CycloneTrajectoryFile {
  cyclone_trajectory: CycloneTrajectory;
}

export interface CycloneTrajectory {
  cyclone_name: string;
  reference_time: string;
  features: TrajectoryFeature[];
}

export interface TrajectoryFeature {
  type: 'Feature';
  geometry: PointGeometry | PolygonGeometry;
  properties: TrajectoryProperties;
}

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface TrajectoryProperties {
  data_type: 'analysis' | 'forecast' | 'uncertainty_cone';
  time: string;
  cyclone_data?: CycloneData;
}

export interface CycloneData {
  development: string;
  minimum_pressure?: number;
  maximum_wind: {
    wind_speed_kt: number;
    wind_speed_gust_kt: number;
  };
  Dvorak?: {
    final_T_number: number;
  };
}

// Report data
export interface CycloneReport {
  text_bloc_item: ReportItem[];
}

export interface ReportItem {
  bloc_title?: string;
  text?: string;
}

// Loaded snapshot with full data
export interface LoadedSnapshot {
  timestamp: number;
  date: string;
  trajectories: CycloneTrajectoryFile[];
  report: CycloneReport | null;
}

// Application state
export interface AnimationState {
  isPlaying: boolean;
  isLooping: boolean;
  speed: number;
  currentIndex: number;
}

export interface SatelliteState {
  ir108Enabled: boolean;
  rgbEnabled: boolean;
  ir108Data: SatelliteImageData | null;
  rgbData: SatelliteImageData | null;
}
