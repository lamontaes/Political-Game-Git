/**
 * Census Bureau API Adapter for State/Local Government Finances and Employment
 *
 * Implements safe key handling:
 * - Uses process.env.CENSUS_API_KEY if legitimate key is present in environment
 * - Operates in keyless public developer mode or offline mock mode when key is absent
 * - NEVER fabricates credentials
 */

export interface CensusApiConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly isOffline?: boolean;
}

export interface CensusFinanceApiParams {
  readonly year: number;
  readonly stateFips?: string;
  readonly governmentType?: string;
  readonly itemCodes?: readonly string[];
}

export interface CensusEmploymentApiParams {
  readonly year: number;
  readonly stateFips?: string;
  readonly governmentType?: string;
  readonly functionCodes?: readonly string[];
}

export interface CensusApiResponseRow {
  readonly [key: string]: string;
}

declare const process: { env?: Record<string, string | undefined> } | undefined;

export class CensusApiAdapter {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly isOffline: boolean;

  constructor(config?: CensusApiConfig) {
    // Check environment safely without fabricating credentials
    const envKey =
      typeof process !== "undefined" && process?.env
        ? process.env.CENSUS_API_KEY
        : undefined;
    this.apiKey = config?.apiKey ?? envKey ?? undefined;
    this.baseUrl = config?.baseUrl ?? "https://api.census.gov/data";
    this.timeoutMs = config?.timeoutMs ?? 10000;
    this.isOffline = config?.isOffline ?? false;
  }

  public hasLegitimateApiKey(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  public getEffectiveAuthMode():
    "authenticated" | "keyless_public" | "offline" {
    if (this.isOffline) return "offline";
    if (this.hasLegitimateApiKey()) return "authenticated";
    return "keyless_public";
  }

  /**
   * Constructs the URL for State and Local Government Finances API
   */
  public buildFinanceApiUrl(params: CensusFinanceApiParams): string {
    const year = params.year;
    // Census CoG / SLF endpoint structure: e.g. /data/{year}/govs
    const endpoint = `${this.baseUrl}/${year}/govs`;
    const searchParams = new URLSearchParams();

    // Default variables to request
    const getVars =
      params.itemCodes && params.itemCodes.length > 0
        ? ["NAME", "GOVTYPE", "STATE", ...params.itemCodes].join(",")
        : "NAME,GOVTYPE,STATE,REV_TOTAL,REV_GEN,EXP_TOTAL,EXP_DIR_GEN,DEBT_OUT_TOTAL";

    searchParams.set("get", getVars);

    if (params.stateFips) {
      searchParams.set("for", `state:${params.stateFips}`);
    } else {
      searchParams.set("for", "state:*");
    }

    if (params.governmentType) {
      searchParams.set("GOVTYPE", params.governmentType);
    }

    if (this.hasLegitimateApiKey()) {
      searchParams.set("key", this.apiKey!);
    }

    return `${endpoint}?${searchParams.toString()}`;
  }

  /**
   * Constructs the URL for Public Employment and Payroll (APEP / CoG Employment) API
   */
  public buildEmploymentApiUrl(params: CensusEmploymentApiParams): string {
    const year = params.year;
    // Census APEP endpoint structure: e.g. /data/{year}/apes
    const endpoint = `${this.baseUrl}/${year}/apes`;
    const searchParams = new URLSearchParams();

    const getVars =
      params.functionCodes && params.functionCodes.length > 0
        ? [
            "NAME",
            "GOVTYPE",
            "STATE",
            "FUNC_CODE",
            "EMP_FULL",
            "PAY_FULL",
            "EMP_PART",
            "PAY_PART",
            ...params.functionCodes,
          ].join(",")
        : "NAME,GOVTYPE,STATE,FUNC_CODE,EMP_FULL,PAY_FULL,EMP_PART,PAY_PART,EMP_FTE,PAY_TOTAL";

    searchParams.set("get", getVars);

    if (params.stateFips) {
      searchParams.set("for", `state:${params.stateFips}`);
    } else {
      searchParams.set("for", "state:*");
    }

    if (params.governmentType) {
      searchParams.set("GOVTYPE", params.governmentType);
    }

    if (this.hasLegitimateApiKey()) {
      searchParams.set("key", this.apiKey!);
    }

    return `${endpoint}?${searchParams.toString()}`;
  }

  /**
   * Parses standard Census API JSON matrix response [[header1, header2], [val1, val2]] into object array
   */
  public parseMatrixResponse(
    matrix: readonly (readonly string[])[],
  ): CensusApiResponseRow[] {
    if (!matrix || matrix.length < 2) return [];
    const headers = matrix[0];
    if (!headers) return [];
    const rows: CensusApiResponseRow[] = [];

    for (let i = 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row) continue;
      const rowObj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        if (header !== undefined) {
          rowObj[header] = row[j] ?? "";
        }
      }
      rows.push(rowObj);
    }

    return rows;
  }
}
