/**
 * Census File Adapter for Official Downloadable Datasets
 *
 * Parses CSV, tab-delimited, and JSON public-use data files from the U.S. Census Bureau.
 */

export interface ParsedCsvTable {
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
}

export class CensusFileAdapter {
  /**
   * Parses standard delimited text (CSV or TSV) into header-keyed records
   */
  public parseDelimited(text: string, delimiter: string = ","): ParsedCsvTable {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const headerLine = lines[0];
    if (!headerLine) {
      return { headers: [], rows: [] };
    }

    const headers = headerLine
      .split(delimiter)
      .map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = line
        .split(delimiter)
        .map((p) => p.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        if (header !== undefined) {
          row[header] = parts[j] ?? "";
        }
      }
      rows.push(row);
    }

    return { headers, rows };
  }

  /**
   * Safely parses numeric value from string, returning null if empty or non-numeric (no missing-as-zero)
   */
  public parseNullableNumber(val: string | undefined | null): number | null {
    if (val === undefined || val === null) return null;
    const trimmed = val.trim();
    if (
      trimmed === "" ||
      trimmed === "-" ||
      trimmed === "N/A" ||
      trimmed === "." ||
      trimmed === "X" ||
      trimmed === "(X)"
    ) {
      return null;
    }
    const num = Number(trimmed);
    return isNaN(num) ? null : num;
  }
}
