import packageJson from "../../package.json";
import patchNotesMarkdown from "../../PATCH_NOTES.md?raw";

/**
 * The prototype's read-only window onto the checked-out release identity.
 *
 * DEVELOPMENT-ONLY PROTOTYPE MODULE. U03-08 asks for the version and the patch
 * notes to be VISIBLE here so their layout can be judged now, and asks just as
 * plainly that this branch not become a second owner of release truth. So both
 * values are read, at build time, from the two files that already hold them:
 * `package.json` and `PATCH_NOTES.md`, in this checkout, as imports.
 *
 * There is deliberately no version literal in this file. A copied string is the
 * thing that goes stale, and a test can only prove "the screen equals the
 * source" when the screen has no source of its own. Nothing here writes: the
 * prototype does not bump the package, does not edit the notes, and does not
 * mark any candidate section released.
 *
 * VERSION-AUTO1 owns release automation, the scripts and the workflows. This
 * module reads their output and stops there.
 */

/** The canonical version of the checked-out tree. Never a literal. */
export const CANONICAL_VERSION: string = packageJson.version;

export interface PatchNoteSection {
  readonly id: string;
  /** The heading exactly as `PATCH_NOTES.md` writes it. Never reworded. */
  readonly heading: string;
  /**
   * True only when the source heading does not say UNRELEASED.
   *
   * The notes file already distinguishes shipped sections from candidates, and
   * several accepted-looking entries are explicitly "CANDIDATE, NOT YET
   * ACCEPTED". The screen repeats that distinction rather than deciding it.
   */
  readonly released: boolean;
  readonly paragraphs: readonly string[];
}

/**
 * Splits the notes into their `##` sections, preserving order and wording.
 *
 * This is a reader, not a markdown renderer: it keeps paragraphs as paragraphs
 * and leaves every character of the text alone. Anything it cannot classify
 * stays in the body rather than being dropped, because silently losing a line
 * of release history to a parser is worse than showing it plainly.
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
    sections.push({
      id: `patch-note-${sections.length}`,
      heading,
      released: !/UNRELEASED/i.test(heading),
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
