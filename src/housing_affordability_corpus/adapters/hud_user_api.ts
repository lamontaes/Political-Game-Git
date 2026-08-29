/**
 * HUD USER API Client (Token-Ready Adapter)
 *
 * Provides a clean interface for querying HUD USER APIs for Fair Market Rents
 * and Income Limits when a valid access token is configured.
 *
 * Invariant: Never fabricate or commit an API token.
 * If HUD_API_TOKEN is unset in the environment, this adapter reports token
 * absence gracefully and allows the compiler to operate from official
 * offline downloadable files and fixtures.
 */

export interface HudApiConfig {
  apiToken?: string;
  baseUrl?: string;
}

export interface HudApiResponse<T> {
  ok: boolean;
  statusCode?: number;
  data?: T;
  error?: string;
  isTokenMissing?: boolean;
}

export class HudUserApiClient {
  private apiToken: string | null;
  private baseUrl: string;

  constructor(config?: HudApiConfig) {
    this.apiToken = config?.apiToken ?? process.env.HUD_API_TOKEN ?? null;
    this.baseUrl = config?.baseUrl ?? "https://www.huduser.gov/hudapi/public";
  }

  /**
   * Returns whether a valid token is available in the environment/config.
   */
  public hasToken(): boolean {
    return Boolean(this.apiToken && this.apiToken.trim().length > 0);
  }

  /**
   * Safely fetches Fair Market Rents for an entity (FIPS or CBSA) and year.
   */
  public async fetchFmrByEntity(
    entityId: string,
    year: number | string,
  ): Promise<HudApiResponse<Record<string, unknown>>> {
    if (!this.hasToken()) {
      return {
        ok: false,
        error:
          "HUD_API_TOKEN is not configured. Offline mode enabled; use downloadable datasets or fixtures.",
        isTokenMissing: true,
      };
    }

    const endpoint = `${this.baseUrl}/fmr/data/${encodeURIComponent(entityId)}?year=${encodeURIComponent(year)}`;
    return this.executeRequest(endpoint);
  }

  /**
   * Safely fetches Income Limits for an entity (FIPS or CBSA) and year.
   */
  public async fetchIncomeLimitsByEntity(
    entityId: string,
    year: number | string,
  ): Promise<HudApiResponse<Record<string, unknown>>> {
    if (!this.hasToken()) {
      return {
        ok: false,
        error:
          "HUD_API_TOKEN is not configured. Offline mode enabled; use downloadable datasets or fixtures.",
        isTokenMissing: true,
      };
    }

    const endpoint = `${this.baseUrl}/il/data/${encodeURIComponent(entityId)}?year=${encodeURIComponent(year)}`;
    return this.executeRequest(endpoint);
  }

  /**
   * Internal request executor using Node standard fetch.
   */
  private async executeRequest<T>(
    endpoint: string,
  ): Promise<HudApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
          "User-Agent": "Political-Game-Housing-Compiler/1.0",
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: `HUD API returned HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = (await response.json()) as T;
      return {
        ok: true,
        statusCode: response.status,
        data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Network error connecting to HUD API: ${message}`,
      };
    }
  }
}
