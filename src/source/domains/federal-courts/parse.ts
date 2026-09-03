/**
 * Reading United States Legislative Markup.
 *
 * USLM is XML, and what this domain needs from it is narrow and structural: a
 * section's heading, its ordered paragraphs with their layout classes, and the
 * rows of the one table in § 41. A section's paragraphs come back in document
 * order because order is meaning here — a division paragraph belongs to the
 * district heading above it.
 *
 * Everything after `<sourceCredit>` is editorial apparatus (revision notes,
 * amendment history, quoted repealed text) rather than operative law, so a
 * section's content stops there. Reading past it would pull repealed districts
 * back into the corpus as if they were current.
 */

import { SourceParseError } from "../../core/index";

export interface UslmParagraph {
  /** The paragraph's layout class: "centered" marks a district heading. */
  readonly className: string;
  readonly text: string;
}

export interface UslmSection {
  readonly identifier: string;
  readonly number: string;
  readonly heading: string;
  readonly paragraphs: readonly UslmParagraph[];
  /** The raw operative markup, for table reading. */
  readonly markup: string;
}

const ENTITIES: readonly (readonly [RegExp, string])[] = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&apos;/g, "'"],
];

/** Decode XML entities and collapse markup whitespace to single spaces. */
export function textOf(markup: string): string {
  let text = markup.replace(/<[^>]+>/g, "");
  for (const [pattern, replacement] of ENTITIES) text = text.replace(pattern, replacement);
  text = text.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
    String.fromCodePoint(parseInt(code, 16)),
  );
  text = text.replace(/&amp;/g, "&");
  return text.replace(/\s+/g, " ").trim();
}

/** Read one section's operative content by its USLM identifier. */
export function readSection(document: string, identifier: string): UslmSection {
  const marker = `identifier="${identifier}"`;
  const start = document.indexOf(marker);
  if (start === -1) {
    throw new SourceParseError(`The title does not contain section ${identifier}.`);
  }
  const creditAt = document.indexOf("<sourceCredit", start);
  const closeAt = document.indexOf("</section>", start);
  const end = creditAt === -1 ? closeAt : Math.min(creditAt, closeAt === -1 ? creditAt : closeAt);
  if (end === -1) {
    throw new SourceParseError(`Section ${identifier} is not terminated.`);
  }
  const markup = document.slice(start, end);

  const headingMatch = /<heading>([\s\S]*?)<\/heading>/.exec(markup);
  const numberMatch = /<num value="([^"]+)"/.exec(markup);

  const paragraphs: UslmParagraph[] = [];
  for (const match of markup.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const attributes = match[1] ?? "";
    const className = /\bclass="([^"]*)"/.exec(attributes)?.[1] ?? "";
    const text = textOf(match[2] ?? "");
    if (text !== "") paragraphs.push({ className, text });
  }

  return {
    identifier,
    number: numberMatch?.[1] ?? "",
    heading: headingMatch ? textOf(headingMatch[1] ?? "") : "",
    paragraphs,
    markup,
  };
}

/** Read a two-column table's body rows out of a section's markup. */
export function readTwoColumnTable(
  section: UslmSection,
): readonly (readonly [string, string])[] {
  const rows: (readonly [string, string])[] = [];
  for (const rowMatch of section.markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...(rowMatch[1] ?? "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(
      (cell) => textOf(cell[1] ?? ""),
    );
    if (cells.length === 2) {
      rows.push([cells[0] as string, cells[1] as string]);
    }
  }
  return rows;
}

/** Split a statutory list — "A, B, and C." — into its published members. */
export function splitStatutoryList(sentence: string): readonly string[] {
  return sentence
    .replace(/\.\s*$/, "")
    .split(/,\s*and\s+|,\s*|\s+and\s+/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}
