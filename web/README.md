# Cyclones.re Web App

React/Vite frontend for visualizing cyclone trajectories in the South-West Indian Ocean basin.

## Project Structure

```
src/
├── main.tsx                 # App entry point
├── App.tsx                  # Root component with layout
├── index.css                # Global styles (Tailwind)
├── components/
│   ├── CycloneMap.tsx       # Leaflet map with trajectory & satellite overlays
│   ├── CycloneInfo.tsx      # Cyclone details panel (name, intensity, position)
│   ├── ConfigurationPanel.tsx # Settings toggle (satellite layers, etc.)
│   ├── Legend.tsx           # Cyclone intensity color legend
│   ├── LoadingOverlay.tsx   # Loading spinner
│   ├── PlaybackButtons.tsx  # Timeline navigation controls
│   └── ReportSection.tsx    # CMRS bulletin display
├── hooks/
│   ├── useCycloneData.ts    # Data fetching and snapshot state management
│   └── useAnimation.ts      # Playback animation logic
├── types/
│   └── index.ts             # TypeScript interfaces
└── utils/
    ├── api.ts               # API calls and URL helpers
    ├── colors.ts            # Cyclone intensity color mapping
    └── formatting.ts        # Date and value formatting helpers
```

## Data Flow

1. `useCycloneData` loads `/data/api_data.json` containing snapshot metadata
2. For each snapshot, trajectory GeoJSON and reports are fetched from `/data/`
3. Satellite images (IR108, RGB) are loaded as Leaflet overlays
4. `useAnimation` handles playback through historical snapshots

## Satellite Image Positioning

Satellite images are geo-referenced using a bounding box and displayed as Leaflet `ImageOverlay` layers.

### Data Structure

Each satellite image in `api_data.json` has:
```typescript
interface SatelliteImageData {
  file: string;                              // Path to image file
  bbox: [number, number, number, number];    // [minLon, minLat, maxLon, maxLat] in degrees
}
```

### Coordinate Reference Systems (CRS)

Leaflet uses **EPSG:3857 (Web Mercator)** for its tile layers (OpenStreetMap, etc.), but its API accepts coordinates in **EPSG:4326 (degrees)**.

For satellite images to align correctly with the basemap:
1. **Metadata** stores bbox in EPSG:4326 degrees (human-readable, Leaflet API compatible)
2. **Images** are fetched from WMS in EPSG:3857 projection (matches Web Mercator tiles)
3. **Leaflet** uses the degree-based bounds to position the pre-projected image

If images were fetched in EPSG:4326 (equirectangular), Leaflet would linearly stretch them to fit the bounds, causing north/south distortion on a Web Mercator map.

### Rendering Pipeline

1. **URL Construction** (`utils/api.ts`): `getSatelliteImageUrl(filePath)` builds the full image URL
2. **Bounds Conversion** (`utils/api.ts`): `bboxToLeafletBounds(bbox)` converts the bbox array to Leaflet format `[[minLat, minLon], [maxLat, maxLon]]`
3. **Map Overlay** (`CycloneMap.tsx`): The image is rendered using react-leaflet's `ImageOverlay`:
   ```tsx
   <ImageOverlay
     url={getSatelliteImageUrl(ir108Data.file)}
     bounds={bboxToLeafletBounds(ir108Data.bbox)}
     opacity={0.7}
     zIndex={1}
   />
   ```

### Layer Order

- IR108 (infrared): zIndex 1 (bottom satellite layer)
- RGB Natural Enhanced: zIndex 2 (top satellite layer)
- Both render below trajectory lines and markers

## Development

```bash
npm install
npm run dev     # Start dev server on http://localhost:5173
npm run build   # Build to dist/
```

## Dependencies

- React 18 + TypeScript
- Vite (build tool)
- Leaflet + react-leaflet (mapping)
- Tailwind CSS (styling)
- date-fns (date formatting with Reunion timezone)
