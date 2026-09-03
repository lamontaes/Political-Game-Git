/**
 * A minimal, deterministic XLSX reader.
 *
 * HUD publishes Fair Market Rents and Income Limits as Excel workbooks and
 * nothing else machine-readable without an API token, so reading one is the
 * only way this substrate can hold authentic HUD publisher bytes rather than
 * the hand-authored seven-record file 30B found in #71.
 *
 * An .xlsx is a zip of XML. This reader resolves shared strings, walks a
 * sheet's rows in declared order, and returns cells as the strings the workbook
 * actually stores. It never coerces: what a cell means — a rent, a suppression,
 * a blank — is the normalizer's decision, made against HUD's documentation.
 */

import { SourceParseError } from "../errors";
import { listZipMembers, readZipMember } from "./zip";

export interface XlsxSheet {
  readonly name: string;
  readonly rows: readonly (readonly string[])[];
}

/** Decode the five XML entities a spreadsheet writer emits. */
function decodeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

/** Shared strings, in index order. A `<si>` may be split across `<t>` runs. */
function readSharedStrings(archive: Buffer): readonly string[] {
  const hasTable = listZipMembers(archive).some(
    (member) => member.path === "xl/sharedStrings.xml",
  );
  if (!hasTable) return [];

  const xml = readZipMember(archive, "xl/sharedStrings.xml").toString("utf-8");
  const strings: string[] = [];
  for (const item of xml.split("<si>").slice(1)) {
    const body = item.split("</si>")[0] ?? "";
    let text = "";
    for (const match of body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
      text += decodeXmlText(match[1] ?? "");
    }
    strings.push(text);
  }
  return strings;
}

/** Column letters ("AB") to a 0-indexed column number. */
function columnIndex(reference: string): number {
  const letters = reference.replace(/\d+/g, "");
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

interface SheetEntry {
  readonly name: string;
  readonly path: string;
}

/** Workbook sheet names paired with the part each one lives in. */
function readSheetIndex(archive: Buffer): readonly SheetEntry[] {
  const workbook = readZipMember(archive, "xl/workbook.xml").toString("utf-8");
  const rels = readZipMember(archive, "xl/_rels/workbook.xml.rels").toString(
    "utf-8",
  );

  const targetByRelId = new Map<string, string>();
  for (const match of rels.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attributes = match[1] ?? "";
    const id = /\bId="([^"]+)"/.exec(attributes)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(attributes)?.[1];
    if (id && target) {
      targetByRelId.set(
        id,
        target.startsWith("/") ? target.slice(1) : `xl/${target}`,
      );
    }
  }

  const sheets: SheetEntry[] = [];
  for (const match of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attributes = match[1] ?? "";
    const name = /\bname="([^"]*)"/.exec(attributes)?.[1];
    const relId = /\br:id="([^"]+)"/.exec(attributes)?.[1];
    if (!name || !relId) continue;
    const path = targetByRelId.get(relId);
    if (!path) continue;
    sheets.push({
      name: decodeXmlText(name),
      path: path.replace(/^xl\/xl\//, "xl/"),
    });
  }
  return sheets;
}

/** Every sheet name in the workbook, in workbook order. */
export function listXlsxSheets(archive: Buffer): readonly string[] {
  return readSheetIndex(archive).map((sheet) => sheet.name);
}

/**
 * Read one sheet as a dense grid of strings.
 *
 * Cells absent from the XML are empty strings, which is what a spreadsheet
 * means by a blank cell — distinguishing "blank" from "suppressed" is HUD's
 * documented flagging, read by the normalizer, not something a grid can know.
 */
export function readXlsxSheet(archive: Buffer, sheetName: string): XlsxSheet {
  const sheets = readSheetIndex(archive);
  const entry = sheets.find((sheet) => sheet.name === sheetName);
  if (!entry) {
    throw new SourceParseError(
      `Workbook has no sheet "${sheetName}"; it holds ${sheets
        .map((sheet) => sheet.name)
        .join(", ")}.`,
    );
  }

  const shared = readSharedStrings(archive);
  const xml = readZipMember(archive, entry.path).toString("utf-8");
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const body = rowMatch[1] ?? "";
    const cells: string[] = [];
    for (const cellMatch of body.matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attributes = cellMatch[1] ?? "";
      const content = cellMatch[2] ?? "";
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1];
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? "n";

      let text: string;
      if (type === "s") {
        const index = Number(/<v>([\s\S]*?)<\/v>/.exec(content)?.[1] ?? "-1");
        text = shared[index] ?? "";
      } else if (type === "inlineStr") {
        text = [...content.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
          .map((match) => decodeXmlText(match[1] ?? ""))
          .join("");
      } else {
        text = decodeXmlText(/<v>([\s\S]*?)<\/v>/.exec(content)?.[1] ?? "");
      }

      const at = reference ? columnIndex(reference) : cells.length;
      while (cells.length < at) cells.push("");
      cells[at] = text;
    }
    rows.push(cells);
  }

  return { name: entry.name, rows };
}
