/**
 * `PATCH_NOTES.md` as a parseable document.
 *
 * The canonical notes stay a hand-readable markdown file that a person can edit
 * — this module reads its structure rather than owning it. Accepted sections
 * are never rewritten: a release inserts one new section and leaves every
 * existing byte where it was, which is what makes "do not rewrite old notes to
 * pretend a later fix existed earlier" an executable property rather than a
 * good intention.
 */

import type { ChangeDeclaration, NotesSection, ParsedNotes } from "./model";
import { NOTE_SECTIONS } from "./model";

const HEADING = /^## (.+)$/;
const VERSION_IN_HEADING = /(\d+)\.(\d+)\.(\d+)/;

/** Split the document at its `## ` headings, keeping every byte. */
export function parseNotes(text: string): ParsedNotes {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const starts: number[] = [];
  for (let index = 0; index < lines.length; index++) {
    if (HEADING.test(lines[index] ?? "")) starts.push(index);
  }
  const sections: NotesSection[] = [];
  const boundaries = [...starts, lines.length];
  if (starts.length === 0 || (starts[0] ?? 0) > 0) {
    sections.push({
      kind: "intro",
      text: lines.slice(0, starts[0] ?? lines.length).join("\n"),
    });
  }
  for (let index = 0; index < starts.length; index++) {
    const from = starts[index] as number;
    const to = boundaries[index + 1] as number;
    const heading = (HEADING.exec(lines[from] ?? "")?.[1] ?? "").trim();
    const body = lines.slice(from, to).join("\n");
    if (/^UNRELEASED\b/.test(heading)) {
      sections.push({ kind: "unreleased", text: body });
      continue;
    }
    const version = VERSION_IN_HEADING.exec(heading)?.[0];
    if (version === undefined) {
      sections.push({ kind: "unreleased", text: body });
      continue;
    }
    sections.push({
      kind: /\bCANDIDATE\b/.test(heading) ? "candidate" : "accepted",
      version,
      text: body,
    });
  }
  return { sections };
}

/**
 * Versions a candidate section already claims.
 *
 * A candidate heading is a reservation. Allocating its number automatically
 * would promote a whole candidate release because one of its constituent
 * changes happened to merge, so the planner refuses the number instead.
 */
export function reservedVersions(notes: ParsedNotes): Set<string> {
  const reserved = new Set<string>();
  for (const section of notes.sections) {
    if (section.kind === "candidate" && section.version) {
      reserved.add(section.version);
    }
  }
  return reserved;
}

/** Versions an accepted section already records, so a release cannot double-write one. */
export function acceptedVersions(notes: ParsedNotes): Set<string> {
  const accepted = new Set<string>();
  for (const section of notes.sections) {
    if (section.kind === "accepted" && section.version) {
      accepted.add(section.version);
    }
  }
  return accepted;
}

function compareVersions(left: string, right: string): number {
  const l = left.split(".").map(Number);
  const r = right.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    const diff = (l[index] ?? 0) - (r[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Wrap prose at 80 columns, so generated notes read like the hand-written ones. */
export function wrapProse(
  text: string,
  indent: string,
  firstIndent: string,
): string {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const lines: string[] = [];
  let current = firstIndent;
  let currentIsEmpty = true;
  for (const word of words) {
    const candidate = currentIsEmpty ? current + word : `${current} ${word}`;
    if (!currentIsEmpty && candidate.length > 80) {
      lines.push(current);
      current = indent + word;
    } else {
      current = candidate;
    }
    currentIsEmpty = false;
  }
  if (!currentIsEmpty) lines.push(current);
  return lines.join("\n");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `2026-09-08` → `8 September 2026`, matching the prose already in the file. */
export function formatReleaseDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) {
    throw new Error(`Release date '${isoDate}' is not an ISO calendar date.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const name = MONTHS[month - 1];
  if (!name) throw new Error(`Release date '${isoDate}' has no such month.`);
  return `${day} ${name} ${year}`;
}

/**
 * Render one accepted release section.
 *
 * Grouping is by the fixed section order and then by declaration id, so the
 * same set of declarations always renders the same bytes regardless of the
 * order the branches merged in.
 */
export function renderReleaseSection(
  version: string,
  isoDate: string,
  declarations: readonly ChangeDeclaration[],
): string {
  const player = declarations.filter((entry) => entry.impact !== "none");
  const lines: string[] = [`## PRE-ALPHA ${version}`, ""];
  lines.push(`_Released ${formatReleaseDate(isoDate)}._`, "");
  for (const section of NOTE_SECTIONS) {
    const inSection = player
      .filter((entry) => entry.section === section)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (inSection.length === 0) continue;
    lines.push(`### ${section}`, "");
    for (const entry of inSection) {
      const title = (entry.title ?? "").trim();
      const body = entry.body.replace(/\s+/g, " ").trim();
      lines.push(wrapProse(`**${title}** ${body}`, "  ", "- "), "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Insert a new accepted section without disturbing anything above or below it.
 *
 * It lands above the first section that describes an older release, which keeps
 * accepted releases in descending order while leaving `UNRELEASED` work and any
 * candidate heading where their authors put them.
 */
export function insertReleaseSection(
  text: string,
  version: string,
  rendered: string,
): string {
  const notes = parseNotes(text);
  const parts: string[] = [];
  let inserted = false;
  for (const section of notes.sections) {
    const isOlder =
      (section.kind === "accepted" || section.kind === "candidate") &&
      section.version !== undefined &&
      compareVersions(section.version, version) < 0;
    if (!inserted && isOlder) {
      parts.push(rendered.trimEnd());
      inserted = true;
    }
    parts.push(section.text.trimEnd());
  }
  if (!inserted) parts.push(rendered.trimEnd());
  return `${parts.filter((part) => part !== "").join("\n\n")}\n`;
}
