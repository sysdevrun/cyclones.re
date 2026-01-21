/**
 * WMS Downloader Library
 *
 * A TypeScript library for downloading data from WMS (Web Map Service) endpoints
 * such as EUMETSAT geoserver.
 *
 * @example
 * ```typescript
 * import { WMSDownloader } from './wms-downloader';
 *
 * const downloader = new WMSDownloader('https://view.eumetsat.int/geoserver/msg_iodc/ir108/ows');
 * const capabilities = await downloader.getCapabilities();
 * const image = await downloader.getMap({
 *   layers: 'ir108',
 *   bbox: [-180, -90, 180, 90],
 *   width: 1024,
 *   height: 512,
 *   format: 'image/png'
 * });
 * ```
 */

import { WmsEndpoint, WmsVersion } from '@camptocamp/ogc-client';

export interface WMSGetMapOptions {
  /** Layer names to request */
  layers: string | string[];
  /** Bounding box coordinates [minX, minY, maxX, maxY] */
  bbox: [number, number, number, number];
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Image format (e.g., 'image/png', 'image/jpeg') */
  format?: string;
  /** WMS version (defaults to '1.3.0') */
  version?: WmsVersion;
  /** Coordinate Reference System (defaults to 'EPSG:4326') */
  crs?: string;
  /** Additional parameters */
  [key: string]: any;
}

export interface WMSCapabilities {
  /** Service information */
  service: {
    title?: string;
    abstract?: string;
    keywords?: string[];
  };
  /** Available layers */
  layers: Array<{
    name: string;
    title?: string;
    abstract?: string;
    boundingBox?: number[];
    crs?: string[];
  }>;
  /** Supported formats */
  formats?: string[];
  /** WMS version */
  version: string;
}

export class WMSDownloader {
  private endpoint: WmsEndpoint | null = null;
  private baseUrl: string;

  /**
   * Creates a new WMS Downloader instance
   * @param url - The WMS service URL
   */
  constructor(url: string) {
    this.baseUrl = url;
    // Lazy-load WmsEndpoint only when needed (getCapabilities)
    // to avoid Node.js compatibility issues with @camptocamp/ogc-client
  }

  /**
   * Gets or creates the WmsEndpoint instance (lazy initialization)
   */
  private getEndpoint(): WmsEndpoint {
    if (!this.endpoint) {
      this.endpoint = new WmsEndpoint(this.baseUrl);
    }
    return this.endpoint;
  }

  /**
   * Fetches and parses WMS GetCapabilities
   * @returns Parsed capabilities information
   */
  async getCapabilities(): Promise<WMSCapabilities> {
    try {
      const endpoint = this.getEndpoint();
      await endpoint.isReady();

      const serviceInfo = endpoint.getServiceInfo();
      const layers = endpoint.getFlattenedLayers();
      const version = endpoint.getVersion();

      return {
        service: {
          title: serviceInfo.title || undefined,
          abstract: serviceInfo.abstract || undefined,
          keywords: serviceInfo.keywords || []
        },
        layers: layers.map(layer => ({
          name: layer.name,
          title: layer.title || undefined,
          abstract: layer.abstract || undefined,
          boundingBox: layer.boundingBox || undefined,
          crs: layer.availableCrs || []
        })),
        formats: serviceInfo.outputFormats || [],
        version: version || '1.3.0'
      };
    } catch (error) {
      throw new Error(`Failed to get WMS capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Downloads a map image from the WMS service
   * @param options - GetMap request options
   * @returns Buffer containing the image data
   */
  async getMap(options: WMSGetMapOptions): Promise<Buffer> {
    const {
      layers,
      bbox,
      width,
      height,
      format = 'image/png',
      version = '1.1.1', // Use 1.1.1 for standard lon/lat bbox order (1.3.0 uses lat/lon)
      crs = 'EPSG:4326',
      ...extraParams
    } = options;

    const layerNames = Array.isArray(layers) ? layers.join(',') : layers;

    try {
      // Build GetMap URL
      const params = new URLSearchParams({
        service: 'WMS',
        request: 'GetMap',
        version: version,
        layers: layerNames,
        bbox: bbox.join(','),
        width: width.toString(),
        height: height.toString(),
        format: format,
        [version === '1.3.0' ? 'crs' : 'srs']: crs,
        ...extraParams
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      console.log(`   WMS URL: ${url}`);

      // Fetch the image
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WMS GetMap request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to download map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Downloads a map and saves it to a file
   * @param options - GetMap request options
   * @param outputPath - Path to save the image file
   */
  async downloadToFile(options: WMSGetMapOptions, outputPath: string): Promise<void> {
    const { writeFile } = await import('fs/promises');
    const imageBuffer = await this.getMap(options);
    await writeFile(outputPath, imageBuffer);
  }

  /**
   * Gets available layers from the WMS service
   * @returns Array of layer names
   */
  async getLayers(): Promise<string[]> {
    const capabilities = await this.getCapabilities();
    return capabilities.layers.map(layer => layer.name);
  }

  /**
   * Gets information about a specific layer
   * @param layerName - Name of the layer
   * @returns Layer information or null if not found
   */
  async getLayerInfo(layerName: string) {
    const capabilities = await this.getCapabilities();
    return capabilities.layers.find(layer => layer.name === layerName) || null;
  }

  /**
   * Gets the base URL of the WMS service
   * @returns The base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export default WMSDownloader;
