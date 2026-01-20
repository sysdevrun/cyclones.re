/**
 * Meteo France Cyclone API Types
 */

// ============ Common Types ============

export type Basin = 'SWI' | 'ATL' | 'PAC' | string;

export type Season = `${number}${number}${number}${number}${number}${number}${number}${number}`; // e.g., "20252026"

export type DataType = 'analysis' | 'forecast' | 'uncertainty_cone';

export type CycloneDevelopment =
  | 'disturbance'
  | 'tropical disturbance'
  | 'tropical depression'
  | 'moderate tropical storm'
  | 'severe tropical storm'
  | 'tropical cyclone'
  | 'intense tropical cyclone'
  | 'post-tropical depression'
  | null;

export type WindSector = 'NEQ' | 'SEQ' | 'SWQ' | 'NWQ';

// ============ Cyclone List API ============

export interface CycloneListItem {
  cyclone_name: string;
  cyclone_id: string;
  current: boolean;
  reference_time: string;
}

export interface CycloneListResponse {
  basin: Basin;
  season: Season;
  cyclone_list: Record<string, CycloneListItem>;
}

// ============ Trajectory API Types ============

export interface StormMotion {
  speed_kt: number;
  direction_toward: number;
}

export interface LastClosedIsobar {
  pressure: number;
  radius: number | null;
}

export interface MaximumWind {
  radius?: number;
  wind_speed_kt: number;
  wind_speed_gust_kt: number;
}

export interface Dvorak {
  final_T_number: number;
  current_intensity: number;
}

export interface WindContourRadius {
  sector: WindSector;
  value: number;
}

export interface WindContour {
  wind_speed_kt: number;
  radius: WindContourRadius[];
}

export interface CycloneData {
  development: CycloneDevelopment;
  minimum_pressure?: number;
  storm_motion?: StormMotion;
  last_closed_isobar?: LastClosedIsobar;
  maximum_wind: MaximumWind;
  Dvorak?: Dvorak;
  wind_contours?: WindContour[];
}

// ============ GeoJSON Types ============

export interface PointGeometry {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: [longitude: number, latitude: number][][];
}

export interface AnalysisFeatureProperties {
  data_type: 'analysis';
  time: string;
  position_accuracy: number;
  cyclone_data: CycloneData;
}

export interface ForecastFeatureProperties {
  data_type: 'forecast';
  time: string;
  position_accuracy: number;
  cyclone_data: CycloneData;
}

export interface UncertaintyConeFeatureProperties {
  data_type: 'uncertainty_cone';
}

export interface AnalysisFeature {
  type: 'Feature';
  properties: AnalysisFeatureProperties;
  geometry: PointGeometry;
}

export interface ForecastFeature {
  type: 'Feature';
  properties: ForecastFeatureProperties;
  geometry: PointGeometry;
}

export interface UncertaintyConeFeature {
  type: 'Feature';
  properties: UncertaintyConeFeatureProperties;
  geometry: PolygonGeometry;
}

export type TrajectoryFeature = AnalysisFeature | ForecastFeature | UncertaintyConeFeature;

export interface CycloneTrajectory {
  product: string;
  update_time: string;
  production_center: string;
  cyclone_name: string;
  cyclone_number: number;
  cyclone_id: string;
  basin: Basin;
  season: number;
  reference_time: string;
  type: 'FeatureCollection';
  features: TrajectoryFeature[];
}

export interface CycloneTrajectoryResponse {
  cyclone_trajectory: CycloneTrajectory;
}

// ============ Report API Types ============

export interface TextBlocItem {
  bloc_title?: string;
  text?: string;
}

export interface CycloneReport {
  report_type: string;
  report_subtype: string;
  domain_id: string;
  report_title: string;
  update_time: number;
  end_validity_time: number | null;
  text_bloc_item: TextBlocItem[];
}

// ============ Fetch Snapshot Types ============

export interface SatelliteImage {
  file: string;
  layer: string;
  bbox: [number, number, number, number];
  width: number;
  height: number;
}

export interface FetchSnapshot {
  timestamp: number;
  date: string;
  cyclone_list: CycloneListResponse;
  cyclone_list_file: string;
  trajectory_files: string[];
  report_file: string | null;
  satellite_image: SatelliteImage | null;
}

export type ApiData = FetchSnapshot[];

// ============ Type Guards ============

export function isAnalysisFeature(feature: TrajectoryFeature): feature is AnalysisFeature {
  return feature.properties.data_type === 'analysis';
}

export function isForecastFeature(feature: TrajectoryFeature): feature is ForecastFeature {
  return feature.properties.data_type === 'forecast';
}

export function isUncertaintyConeFeature(feature: TrajectoryFeature): feature is UncertaintyConeFeature {
  return feature.properties.data_type === 'uncertainty_cone';
}
