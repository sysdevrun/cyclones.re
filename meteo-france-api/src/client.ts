/**
 * Meteo France Cyclone API Client
 */

import type {
  Basin,
  Season,
  CycloneListResponse,
  CycloneTrajectoryResponse,
  CycloneReport,
} from './types.js';

const SESSION_URL = 'https://meteofrance.re/fr/cyclone';
const API_BASE_URL = 'https://rpcache-aa.meteofrance.com/internet2018client/2.0';

export interface MeteoFranceClientOptions {
  /** Custom fetch implementation (useful for Node.js or testing) */
  fetch?: typeof fetch;
  /** User agent string */
  userAgent?: string;
}

/**
 * Decodes the mfsession cookie value using ROT13.
 * The token is encoded with a simple letter rotation cipher.
 */
export function decodeToken(encodedToken: string): string {
  return encodedToken.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + (char.charCodeAt(0) - base + 13) % 26);
  });
}

/**
 * Extracts the mfsession cookie value from Set-Cookie header(s).
 */
function extractMfSessionCookie(setCookieHeader: string | string[] | null): string | null {
  if (!setCookieHeader) return null;

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  for (const cookie of cookies) {
    const match = cookie.match(/mfsession=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Client for the Meteo France Cyclone API.
 */
export class MeteoFranceClient {
  private fetchFn: typeof fetch;
  private userAgent: string;
  private token: string | null = null;

  constructor(options: MeteoFranceClientOptions = {}) {
    this.fetchFn = options.fetch ?? fetch;
    this.userAgent = options.userAgent ??
      'Mozilla/5.0 (compatible; MeteoFranceClient/1.0)';
  }

  /**
   * Gets a new authentication token from the Meteo France session endpoint.
   * The token is automatically decoded from the mfsession cookie.
   */
  async getToken(): Promise<string> {
    const response = await this.fetchFn(SESSION_URL, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
      },
      redirect: 'manual', // Don't follow redirects, we just need the cookie
    });

    // Get Set-Cookie header - handle both browser and Node.js environments
    let setCookie: string | string[] | null = null;

    if (response.headers.get('set-cookie')) {
      setCookie = response.headers.get('set-cookie');
    } else if (typeof response.headers.getSetCookie === 'function') {
      // Node.js 18+ fetch API
      setCookie = response.headers.getSetCookie();
    }

    const encodedToken = extractMfSessionCookie(setCookie);

    if (!encodedToken) {
      throw new Error('Failed to get mfsession cookie from Meteo France');
    }

    this.token = decodeToken(encodedToken);
    return this.token;
  }

  /**
   * Ensures we have a valid token, fetching one if necessary.
   */
  async ensureToken(): Promise<string> {
    if (!this.token) {
      await this.getToken();
    }
    return this.token!;
  }

  /**
   * Sets the authentication token manually.
   * Useful if you have a pre-decoded token.
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Gets the current token or null if not authenticated.
   */
  getCurrentToken(): string | null {
    return this.token;
  }

  /**
   * Makes an authenticated API request.
   */
  private async apiRequest<T>(endpoint: string): Promise<T> {
    const token = await this.ensureToken();

    const response = await this.fetchFn(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://meteofrance.re',
        'Referer': 'https://meteofrance.re/',
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, clear it so next request gets a new one
        this.token = null;
        throw new Error('Authentication failed - token may be expired');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Lists cyclones for a given basin and season.
   *
   * @param basin - Basin code (e.g., 'SWI' for South-West Indian Ocean)
   * @param season - Season in format YYYYYYYY (e.g., '20252026')
   * @param current - Filter to only current cyclones (default: 'current')
   */
  async listCyclones(
    basin: Basin,
    season: Season,
    current: 'current' | 'all' = 'current'
  ): Promise<CycloneListResponse> {
    const currentParam = current === 'current' ? '&current=current' : '';
    return this.apiRequest<CycloneListResponse>(
      `/cyclone/list?basin=${encodeURIComponent(basin)}&season=${encodeURIComponent(season)}${currentParam}`
    );
  }

  /**
   * Gets the trajectory data for a specific cyclone.
   *
   * @param cycloneId - Cyclone ID (e.g., 'SWI$06/20252026')
   */
  async getCycloneTrajectory(cycloneId: string): Promise<CycloneTrajectoryResponse> {
    return this.apiRequest<CycloneTrajectoryResponse>(
      `/cyclone/trajectory?cyclone_id=${encodeURIComponent(cycloneId)}`
    );
  }

  /**
   * Gets the cyclone activity report for a given domain.
   *
   * @param domain - Domain code (e.g., 'SWI' for South-West Indian Ocean)
   * @param reportType - Report type (default: 'cyclone')
   * @param reportSubtype - Report subtype (default: "Bulletin d'Activité Cyclonique")
   */
  async getReport(
    domain: Basin,
    reportType: string = 'cyclone',
    reportSubtype: string = "Bulletin d'Activité Cyclonique"
  ): Promise<CycloneReport> {
    return this.apiRequest<CycloneReport>(
      `/report?domain=${encodeURIComponent(domain)}&report_type=${encodeURIComponent(reportType)}&report_subtype=${encodeURIComponent(reportSubtype)}`
    );
  }
}

/**
 * Creates a new Meteo France client instance.
 */
export function createClient(options?: MeteoFranceClientOptions): MeteoFranceClient {
  return new MeteoFranceClient(options);
}
