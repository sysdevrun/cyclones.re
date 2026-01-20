import { useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Popup, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CycloneTrajectory, TrajectoryFeature, SatelliteImageData } from '../types';
import { getColor } from '../utils/colors';
import { formatPopupDate, formatWind, formatForecastDate } from '../utils/formatting';
import { getSatelliteImageUrl, bboxToLeafletBounds } from '../utils/api';
import { Legend } from './Legend';

interface CycloneMapProps {
  trajectories: CycloneTrajectory[];
  ir108Data: SatelliteImageData | null;
  rgbData: SatelliteImageData | null;
  ir108Enabled: boolean;
  rgbEnabled: boolean;
  initialFit: boolean;
  onInitialFitDone: () => void;
}

// Component to fit map bounds
function MapBoundsController({ trajectories, shouldFit, onFitDone }: {
  trajectories: CycloneTrajectory[];
  shouldFit: boolean;
  onFitDone: () => void;
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!shouldFit || hasFitted.current || trajectories.length === 0) return;

    const bounds: L.LatLngBoundsLiteral = [];

    for (const trajectory of trajectories) {
      for (const feature of trajectory.features) {
        if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          bounds.push([lat, lon]);
        } else if (feature.geometry.type === 'Polygon') {
          for (const ring of feature.geometry.coordinates) {
            for (const [lon, lat] of ring) {
              bounds.push([lat, lon]);
            }
          }
        }
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFitted.current = true;
      onFitDone();
    }
  }, [map, trajectories, shouldFit, onFitDone]);

  return null;
}

// Forecast label component
function ForecastLabel({ lat, lon, time }: { lat: number; lon: number; time: string }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const labelIcon = L.divIcon({
      className: 'forecast-label',
      html: `<span style="font-size: 9px; color: #333; white-space: nowrap;">${formatForecastDate(time)}</span>`,
      iconSize: [0, 0],
      iconAnchor: [-8, 6],
    });

    markerRef.current = L.marker([lat, lon], { icon: labelIcon, interactive: false }).addTo(map);

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, lat, lon, time]);

  return null;
}

// Cyclone name label component
function CycloneNameLabel({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const labelIcon = L.divIcon({
      className: 'cyclone-name-label',
      html: `<span style="font-size: 12px; font-weight: bold; color: #0066CC; white-space: nowrap; text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;">${name}</span>`,
      iconSize: [0, 0],
      iconAnchor: [-10, 4],
    });

    markerRef.current = L.marker([lat, lon], { icon: labelIcon, interactive: false }).addTo(map);

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, lat, lon, name]);

  return null;
}

// Popup content for trajectory points
function TrajectoryPopup({ feature, isAnalysis }: { feature: TrajectoryFeature; isAnalysis: boolean }) {
  const data = feature.properties.cyclone_data;
  if (!data) return null;

  const type = isAnalysis ? 'Analysis' : 'Forecast';

  return (
    <div className="min-w-[180px]">
      <h3 className="font-bold text-gray-800 mb-2">{type}</h3>
      <p className="text-gray-600 text-sm my-1">
        <strong>Time:</strong> {formatPopupDate(feature.properties.time)}
      </p>
      <p className="text-gray-600 text-sm my-1">
        <strong>Development:</strong> {data.development || 'N/A'}
      </p>
      {data.minimum_pressure !== undefined && (
        <p className="text-gray-600 text-sm my-1">
          <strong>Pressure:</strong> {data.minimum_pressure} hPa
        </p>
      )}
      <p className="text-gray-600 text-sm my-1">
        <strong>Max wind:</strong> {formatWind(data.maximum_wind.wind_speed_kt)}
      </p>
      <p className="text-gray-600 text-sm my-1">
        <strong>Gusts:</strong> {formatWind(data.maximum_wind.wind_speed_gust_kt)}
      </p>
      {data.Dvorak && (
        <p className="text-gray-600 text-sm my-1">
          <strong>Dvorak T:</strong> {data.Dvorak.final_T_number}
        </p>
      )}
    </div>
  );
}

export function CycloneMap({
  trajectories,
  ir108Data,
  rgbData,
  ir108Enabled,
  rgbEnabled,
  initialFit,
  onInitialFitDone,
}: CycloneMapProps) {
  // Process all trajectories
  const processedData = useMemo(() => {
    const result: {
      trajectory: CycloneTrajectory;
      analysisPoints: TrajectoryFeature[];
      forecastPoints: TrajectoryFeature[];
      uncertaintyCone: TrajectoryFeature | null;
    }[] = [];

    for (const trajectory of trajectories) {
      const analysisPoints: TrajectoryFeature[] = [];
      const forecastPoints: TrajectoryFeature[] = [];
      let uncertaintyCone: TrajectoryFeature | null = null;

      for (const feature of trajectory.features) {
        const dataType = feature.properties.data_type;
        if (dataType === 'analysis') {
          analysisPoints.push(feature);
        } else if (dataType === 'forecast') {
          forecastPoints.push(feature);
        } else if (dataType === 'uncertainty_cone') {
          uncertaintyCone = feature;
        }
      }

      result.push({ trajectory, analysisPoints, forecastPoints, uncertaintyCone });
    }

    return result;
  }, [trajectories]);

  const handleFitDone = useCallback(() => {
    onInitialFitDone();
  }, [onInitialFitDone]);

  return (
    <div className="relative h-[500px] rounded-xl overflow-hidden shadow-inner">
      <MapContainer
        center={[-17, 77]}
        zoom={5}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController
          trajectories={trajectories}
          shouldFit={initialFit}
          onFitDone={handleFitDone}
        />

        {/* Satellite overlays (rendered first so they're behind everything) */}
        {ir108Enabled && ir108Data && (
          <ImageOverlay
            url={getSatelliteImageUrl(ir108Data.file)}
            bounds={bboxToLeafletBounds(ir108Data.bbox)}
            opacity={0.7}
            zIndex={1}
          />
        )}
        {rgbEnabled && rgbData && (
          <ImageOverlay
            url={getSatelliteImageUrl(rgbData.file)}
            bounds={bboxToLeafletBounds(rgbData.bbox)}
            opacity={0.7}
            zIndex={2}
          />
        )}

        {/* Render each trajectory */}
        {processedData.map(({ trajectory, analysisPoints, forecastPoints, uncertaintyCone }, trajIndex) => (
          <div key={`traj-${trajIndex}`}>
            {/* Uncertainty cone (background) */}
            {uncertaintyCone && uncertaintyCone.geometry.type === 'Polygon' && (
              <Polygon
                positions={uncertaintyCone.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])}
                pathOptions={{
                  color: 'orange',
                  weight: 2,
                  fillColor: 'orange',
                  fillOpacity: 0.2,
                }}
              />
            )}

            {/* Analysis path line */}
            {analysisPoints.length > 0 && (
              <Polyline
                positions={analysisPoints.map((f) => {
                  const [lon, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [0, 0];
                  return [lat, lon] as [number, number];
                })}
                pathOptions={{
                  color: '#0066CC',
                  weight: 3,
                  opacity: 0.8,
                }}
              />
            )}

            {/* Forecast path line */}
            {forecastPoints.length > 0 && (
              <>
                {/* Dashed connection line from last analysis to first forecast */}
                {analysisPoints.length > 0 && (
                  <Polyline
                    positions={[
                      (() => {
                        const lastAnalysis = analysisPoints[analysisPoints.length - 1];
                        const [lon, lat] = lastAnalysis.geometry.type === 'Point' ? lastAnalysis.geometry.coordinates : [0, 0];
                        return [lat, lon] as [number, number];
                      })(),
                      (() => {
                        const firstForecast = forecastPoints[0];
                        const [lon, lat] = firstForecast.geometry.type === 'Point' ? firstForecast.geometry.coordinates : [0, 0];
                        return [lat, lon] as [number, number];
                      })(),
                    ]}
                    pathOptions={{
                      color: '#CC0000',
                      weight: 3,
                      opacity: 0.8,
                      dashArray: '5, 5',
                    }}
                  />
                )}
                <Polyline
                  positions={forecastPoints.map((f) => {
                    const [lon, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [0, 0];
                    return [lat, lon] as [number, number];
                  })}
                  pathOptions={{
                    color: '#CC0000',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '5, 5',
                  }}
                />
              </>
            )}

            {/* Analysis points */}
            {analysisPoints.map((feature, i) => {
              if (feature.geometry.type !== 'Point') return null;
              const [lon, lat] = feature.geometry.coordinates;
              const development = feature.properties.cyclone_data?.development;
              const isFirst = i === 0;

              return (
                <div key={`analysis-${trajIndex}-${i}`}>
                  <CircleMarker
                    center={[lat, lon]}
                    radius={3}
                    pathOptions={{
                      fillColor: getColor(development),
                      color: '#0066CC',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.8,
                    }}
                  >
                    <Popup>
                      <TrajectoryPopup feature={feature} isAnalysis={true} />
                    </Popup>
                  </CircleMarker>
                  {/* Cyclone name label at first analysis point */}
                  {isFirst && (
                    <CycloneNameLabel lat={lat} lon={lon} name={trajectory.cyclone_name} />
                  )}
                </div>
              );
            })}

            {/* Forecast points with labels */}
            {forecastPoints.map((feature, i) => {
              if (feature.geometry.type !== 'Point') return null;
              const [lon, lat] = feature.geometry.coordinates;
              const development = feature.properties.cyclone_data?.development;

              return (
                <div key={`forecast-${trajIndex}-${i}`}>
                  <CircleMarker
                    center={[lat, lon]}
                    radius={4}
                    pathOptions={{
                      fillColor: getColor(development),
                      color: '#CC0000',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.6,
                    }}
                  >
                    <Popup>
                      <TrajectoryPopup feature={feature} isAnalysis={false} />
                    </Popup>
                  </CircleMarker>
                  <ForecastLabel lat={lat} lon={lon} time={feature.properties.time} />
                </div>
              );
            })}
          </div>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Legend />
      </div>
    </div>
  );
}
