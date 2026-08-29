/**
 * Zero-dependency OpenXML Spreadsheet (.xlsx) Parser
 *
 * Extracts shared strings and row/column records from standard Excel worksheets
 * using the built-in ZipReader and robust XML tag/attribute parsing.
 */

import { ZipReader } from "./zip-reader";

export function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseSharedStrings(xmlStr: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si>(.*?)<\/si>/gs;
  let match: RegExpExecArray | null;

  while ((match = siRegex.exec(xmlStr)) !== null) {
    const siContent = match[1];
    const tRegex = /<t(?:\s+[^>]*)?>(.*?)<\/t>/gs;
    let tMatch: RegExpExecArray | null;
    let text = "";

    while ((tMatch = tRegex.exec(siContent)) !== null) {
      text += tMatch[1];
    }
    strings.push(unescapeXml(text));
  }

  return strings;
}

export type XlsxRow = Record<string, string>;

export function parseSheetRows(
  sheetXml: string,
  sharedStrings: readonly string[],
): XlsxRow[] {
  const rows: XlsxRow[] = [];
  const rowRegex = /<row\b[^>]*>(.*?)<\/row>/gs;
  // Match each <c ...> tag and its optional <v> content
  const cTagRegex = /<c\b([^>]*)>(?:.*?<v>(.*?)<\/v>)?(?:.*?<\/c>)?/gs;

  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const cells: Record<string, string> = {};
    let cMatch: RegExpExecArray | null;

    while ((cMatch = cTagRegex.exec(rowContent)) !== null) {
      const tagAttrs = cMatch[1];
      const rawVal = cMatch[2] !== undefined ? cMatch[2] : "";

      // Extract column name from r="A123"
      const rMatch = /\br="([A-Z]+)[0-9]+"/.exec(tagAttrs);
      if (!rMatch) continue;
      const col = rMatch[1];

      // Extract type from t="s"
      const tMatch = /\bt="([a-zA-Z]+)"/.exec(tagAttrs);
      const type = tMatch ? tMatch[1] : undefined;

      if (type === "s" && rawVal !== "") {
        const idx = parseInt(rawVal, 10);
        cells[col] = sharedStrings[idx] ?? "";
      } else {
        cells[col] = unescapeXml(rawVal);
      }
    }

    rows.push(cells);
  }

  return rows;
}

export function parseXlsxWorkbook(
  buffer: Buffer,
  sheetPath = "xl/worksheets/sheet1.xml",
): XlsxRow[] {
  const zip = ZipReader.fromBuffer(buffer);

  let sharedStrings: string[] = [];
  if (zip.has("xl/sharedStrings.xml")) {
    const ssXml = zip.readText("xl/sharedStrings.xml");
    sharedStrings = parseSharedStrings(ssXml);
  }

  if (!zip.has(sheetPath)) {
    throw new Error(`Worksheet "${sheetPath}" not found in XLSX workbook.`);
  }

  const sheetXml = zip.readText(sheetPath);
  return parseSheetRows(sheetXml, sharedStrings);
}
