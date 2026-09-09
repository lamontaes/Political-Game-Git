import packageJson from "../../package.json";
import patchNotesMarkdown from "../../PATCH_NOTES.md?raw";

/**
 * The game's own release identity, read rather than restated.
 *
 * Both values come, at build time, from the two files that already hold them in
 * this checkout: `package.json` and `PATCH_NOTES.md`. There is deliberately no
 * version literal in this module. A copied string is the thing that goes stale,
 * and a test can only prove "the screen equals the source" when the screen has
 * no source of its own.
 *
 * Nothing here writes. This does not bump the package, does not edit the notes,
 * and does not mark any candidate section released. Release maintenance — the
 * scripts, the workflows, the bump on `main` — has its own owner, and this is a
 * reader of its output and nothing more.
 */

/** The canonical version of the checked-out tree. Never a literal. */
export const CANONICAL_VERSION: string = packageJson.version;

export interface PatchNoteSection {
  readonly id: string;
  /** The heading exactly as `PATCH_NOTES.md` writes it. Never reworded. */
  readonly heading: string;
  /**
   * True only for a section this repository has actually accepted.
   *
   * The release tooling in `scripts/release/notes.ts` already draws this line
   * twice: a heading beginning UNRELEASED is pending, and a heading containing
   * CANDIDATE is a reservation rather than a release. This module used to test
   * only for UNRELEASED, so `PRE-ALPHA 0.3.0 — "A Life, Not a Fixture" —
   * CANDIDATE, NOT YET ACCEPTED` was being reported to the screen as shipped —
   * a reserved version number presented to a player as a release they had.
   * The rule here is now the same rule the release writer applies.
   */
  readonly released: boolean;
  /** A reserved, not-yet-accepted section. Never shown as a release. */
  readonly candidate: boolean;
  /** The version this section names, when its heading names one. */
  readonly version: string | null;
  /**
   * The release date as the notes state it, or null when they do not.
   *
   * `renderReleaseSection` writes `_Released 8 September 2026._` as the first
   * line of every section it creates, so releases made through the tooling
   * carry one. The two hand-written historical sections do not, and the date is
   * left null for them rather than guessed at: 0.2.0 carries a REVISION date in
   * its prose, and reading that as a release date would be inventing history
   * out of a sentence that says something else.
   */
  readonly releasedOn: string | null;
  readonly paragraphs: readonly string[];
}

/**
 * Splits the notes into their `##` sections, preserving order and wording.
 *
 * A reader, not a markdown renderer: paragraphs stay paragraphs and every
 * character of the text is left alone. Anything it cannot classify stays in the
 * body rather than being dropped — silently losing a line of release history to
 * a parser is worse than showing it plainly.
 */
function parseSections(markdown: string): readonly PatchNoteSection[] {
  const sections: PatchNoteSection[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (heading === null) return;
    const paragraphs = buffer
      .join("\n")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    const pending = /^UNRELEASED\b/i.test(heading);
    const candidate = /\bCANDIDATE\b/i.test(heading);
    const released = !pending && !candidate;
    sections.push({
      id: `patch-note-${sections.length}`,
      heading,
      released,
      candidate,
      version: /\d+\.\d+\.\d+/.exec(heading)?.[0] ?? null,
      // Only the sentence the release writer itself emits counts as a date.
      releasedOn: released
        ? (/^_Released ([^._]+)\._$/m.exec(paragraphs[0] ?? "")?.[1]?.trim() ??
          null)
        : null,
      paragraphs,
    });
    buffer = [];
  };

  for (const line of markdown.split("\n")) {
    const match = /^##\s+(.*)$/.exec(line);
    if (match?.[1] !== undefined) {
      flush();
      heading = match[1].trim();
      continue;
    }
    if (heading !== null) buffer.push(line);
  }
  flush();

  return sections;
}

export const PATCH_NOTE_SECTIONS: readonly PatchNoteSection[] =
  parseSections(patchNotesMarkdown);

/** The raw source, so a proof can compare the screen against the file. */
export const PATCH_NOTES_SOURCE = patchNotesMarkdown;
