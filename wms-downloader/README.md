# WMS Downloader Library

A TypeScript library for downloading data from WMS (Web Map Service) endpoints, specifically designed for services like EUMETSAT geoserver.

## Features

- **TypeScript Support**: Full type definitions for type-safe development
- **GetCapabilities**: Fetch and parse WMS service capabilities
- **GetMap**: Download map images with customizable parameters
- **Modern API**: Built on top of @camptocamp/ogc-client
- **Easy to Use**: Simple, intuitive interface

## Installation

The library uses `@camptocamp/ogc-client` which is already installed in this project:

```bash
npm install @camptocamp/ogc-client
```

## Usage

### Basic Example

```typescript
import { WMSDownloader } from './wms-downloader';

// Create a downloader instance
const downloader = new WMSDownloader(
  'https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows'
);

// Get service capabilities
const capabilities = await downloader.getCapabilities();
console.log('Available layers:', capabilities.layers);

// Download a map image
const imageBuffer = await downloader.getMap({
  layers: 'ir108',
  bbox: [-180, -90, 180, 90],
  width: 1024,
  height: 512,
  format: 'image/png'
});

// Save to file
await downloader.downloadToFile(
  {
    layers: 'ir108',
    bbox: [-180, -90, 180, 90],
    width: 1024,
    height: 512
  },
  'output.png'
);
```

### Get Available Layers

```typescript
const layers = await downloader.getLayers();
console.log('Available layers:', layers);
```

### Get Layer Information

```typescript
const layerInfo = await downloader.getLayerInfo('ir108');
console.log('Layer info:', layerInfo);
```

### Advanced GetMap Options

```typescript
const imageBuffer = await downloader.getMap({
  layers: ['ir108', 'ir039'],  // Multiple layers
  bbox: [40, -30, 90, 20],     // Custom bounding box
  width: 2048,
  height: 1024,
  format: 'image/jpeg',
  crs: 'EPSG:4326',
  version: '1.3.0',
  transparent: true,
  styles: ''
});
```

## API Reference

### WMSDownloader

#### Constructor

```typescript
new WMSDownloader(url: string)
```

Creates a new WMS downloader instance.

- **url**: The base URL of the WMS service

#### Methods

##### getCapabilities()

```typescript
async getCapabilities(): Promise<WMSCapabilities>
```

Fetches and parses the WMS GetCapabilities response.

Returns:
- Service information (title, abstract, keywords)
- Available layers with their metadata
- Supported formats
- WMS version

##### getMap(options)

```typescript
async getMap(options: WMSGetMapOptions): Promise<Buffer>
```

Downloads a map image from the WMS service.

Options:
- **layers**: Layer name(s) to request (string or string[])
- **bbox**: Bounding box coordinates [minX, minY, maxX, maxY]
- **width**: Image width in pixels
- **height**: Image height in pixels
- **format**: Image format (default: 'image/png')
- **version**: WMS version (default: '1.3.0')
- **crs**: Coordinate Reference System (default: 'EPSG:4326')
- Additional WMS parameters can be passed as needed

Returns: Buffer containing the image data

##### downloadToFile(options, outputPath)

```typescript
async downloadToFile(options: WMSGetMapOptions, outputPath: string): Promise<void>
```

Downloads a map image and saves it to a file.

##### getLayers()

```typescript
async getLayers(): Promise<string[]>
```

Gets an array of available layer names.

##### getLayerInfo(layerName)

```typescript
async getLayerInfo(layerName: string): Promise<LayerInfo | null>
```

Gets detailed information about a specific layer.

##### getBaseUrl()

```typescript
getBaseUrl(): string
```

Returns the base URL of the WMS service.

## Type Definitions

### WMSGetMapOptions

```typescript
interface WMSGetMapOptions {
  layers: string | string[];
  bbox: [number, number, number, number];
  width: number;
  height: number;
  format?: string;
  version?: WmsVersion;
  crs?: string;
  [key: string]: any;
}
```

### WMSCapabilities

```typescript
interface WMSCapabilities {
  service: {
    title?: string;
    abstract?: string;
    keywords?: string[];
  };
  layers: Array<{
    name: string;
    title?: string;
    abstract?: string;
    boundingBox?: number[];
    crs?: string[];
  }>;
  formats?: string[];
  version: string;
}
```

## Examples

See `wms-downloader/example.ts` for more examples.

## Error Handling

The library throws errors with descriptive messages when operations fail:

```typescript
try {
  const image = await downloader.getMap(options);
} catch (error) {
  console.error('Failed to download map:', error.message);
}
```

## Dependencies

- **@camptocamp/ogc-client**: Modern TypeScript library for OGC services (WMS, WFS, WMTS, etc.)

## License

MIT
