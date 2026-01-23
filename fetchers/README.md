# Meteo France Cyclone API Library

A TypeScript library for accessing the Meteo France cyclone tracking API, providing real-time data about tropical cyclones in various ocean basins.

## Installation

```bash
npm install
npm run build
```

## Quick Start

```typescript
import { createClient } from 'meteo-france-cyclone-api';

const client = createClient();

// List current cyclones in South-West Indian Ocean
const cyclones = await client.listCyclones('SWI', '20252026');
console.log(cyclones.cyclone_list);

// Get trajectory for a specific cyclone
const trajectory = await client.getCycloneTrajectory('SWI$06/20252026');
console.log(trajectory.cyclone_trajectory.cyclone_name);
```

## Architecture

### Files Structure

```
meteo-france-api/
├── src/
│   ├── index.ts      # Main entry point, re-exports all modules
│   ├── client.ts     # API client implementation
│   └── types.ts      # TypeScript type definitions
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

### Authentication Flow

1. The client fetches `https://meteofrance.re/fr/cyclone`
2. The server returns a `Set-Cookie` header with an encoded `mfsession` token
3. The token is decoded using ROT13 (a simple letter rotation cipher)
4. The decoded token is used as a Bearer token for API requests

### Token Decoding

The `mfsession` cookie is encoded with ROT13:
```typescript
function decodeToken(encodedToken: string): string {
  return encodedToken.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + (char.charCodeAt(0) - base + 13) % 26);
  });
}
```

## API Reference

### `createClient(options?)`

Creates a new API client instance.

**Options:**
- `fetch?: typeof fetch` - Custom fetch implementation
- `userAgent?: string` - Custom User-Agent string

### `client.listCyclones(basin, season, current?)`

Lists cyclones for a given basin and season.

**Parameters:**
- `basin: string` - Basin code (e.g., `'SWI'` for South-West Indian Ocean)
- `season: string` - Season in format `YYYYYYYY` (e.g., `'20252026'`)
- `current?: 'current' | 'all'` - Filter for current cyclones only (default: `'current'`)

**Returns:** `CycloneListResponse`

### `client.getCycloneTrajectory(cycloneId)`

Gets detailed trajectory data for a specific cyclone.

**Parameters:**
- `cycloneId: string` - Cyclone ID (e.g., `'SWI$06/20252026'`)

**Returns:** `CycloneTrajectoryResponse`

### `client.getToken()`

Manually fetches and returns a new authentication token.

### `client.setToken(token)`

Sets a pre-existing token (useful for testing or caching).

## Types

### Basin Codes

- `SWI` - South-West Indian Ocean
- `ATL` - Atlantic
- `PAC` - Pacific

### Feature Types in Trajectory

The trajectory response contains a GeoJSON FeatureCollection with three types of features:

1. **`analysis`** - Historical observed positions with full cyclone data
2. **`forecast`** - Predicted future positions with expected intensity
3. **`uncertainty_cone`** - Polygon representing forecast uncertainty area

### Cyclone Development Stages

```typescript
type CycloneDevelopment =
  | 'disturbance'
  | 'tropical disturbance'
  | 'tropical depression'
  | 'moderate tropical storm'
  | 'severe tropical storm'
  | 'tropical cyclone'
  | 'intense tropical cyclone'
  | 'post-tropical depression';
```

### Type Guards

The library provides type guards for working with trajectory features:

```typescript
import {
  isAnalysisFeature,
  isForecastFeature,
  isUncertaintyConeFeature,
} from 'meteo-france-cyclone-api';

for (const feature of trajectory.features) {
  if (isAnalysisFeature(feature)) {
    // feature.properties.cyclone_data is available
    console.log(feature.properties.cyclone_data.development);
  }
}
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /cyclone/list` | List cyclones by basin and season |
| `GET /cyclone/trajectory` | Get trajectory data for a cyclone |

### Base URLs

- Session: `https://meteofrance.re/fr/cyclone`
- API: `https://rpcache-aa.meteofrance.com/internet2018client/2.0`

## Example: Filtering Trajectory Data

```typescript
import {
  createClient,
  isAnalysisFeature,
  isForecastFeature,
} from 'meteo-france-cyclone-api';

const client = createClient();
const { cyclone_trajectory } = await client.getCycloneTrajectory('SWI$06/20252026');

// Get only analysis (historical) points
const analysisPoints = cyclone_trajectory.features.filter(isAnalysisFeature);

// Get maximum recorded wind speed
const maxWind = Math.max(
  ...analysisPoints.map(f => f.properties.cyclone_data.maximum_wind.wind_speed_kt)
);

// Get only forecast points
const forecastPoints = cyclone_trajectory.features.filter(isForecastFeature);
```

## Error Handling

The client throws errors for:
- Failed token retrieval
- API authentication failures (401)
- General HTTP errors

```typescript
try {
  const data = await client.listCyclones('SWI', '20252026');
} catch (error) {
  if (error.message.includes('token may be expired')) {
    // Token expired, client will auto-refresh on next request
  }
}
```

## Requirements

- Node.js >= 18.0.0 (for native fetch support)
- Or provide a custom fetch implementation for older environments
