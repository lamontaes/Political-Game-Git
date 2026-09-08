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
   * True only when the source heading does not say UNRELEASED.
   *
   * The notes file already distinguishes shipped sections from candidates. The
   * screen repeats that distinction rather than deciding it.
   */
  readonly released: boolean;
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
