/**
 * The patch notes as the title shows them: `PATCH_NOTES.md`, the file the
 * release machinery keeps (scripts/release), read one released section at a
 * time. A section is a `## ` heading carrying a version number, a released
 * line, and `### ` groups of bullet points. Sections without a version (the
 * unreleased ones the next release consumes) are not a release yet and stay
 * off the screen. Nothing here writes the file.
 */

/** One change: the bullet's bold lead as its headline, the rest as its text. */
export interface PatchNote {
  readonly title?: string;
  readonly text: string;
}

export interface PatchNoteGroup {
  readonly heading: string;
  readonly notes: readonly PatchNote[];
}

export interface PatchNoteRelease {
  readonly version: string;
  /** The heading as written, in sentence case ("Pre-alpha 0.61.2"). */
  readonly title: string;
  /** The italic released line, without its markers. */
  readonly released?: string;
  readonly groups: readonly PatchNoteGroup[];
}

const HEADING = /^## (.+)$/;
const VERSION = /\d+\.\d+\.\d+/;

/** Markdown emphasis markers off a line: the words stay. */
function plain(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)_([^_]+)_(?=[\s.,;:!?)]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/** A bullet as a change: its bold lead, without a closing period, heads it. */
function note(text: string): PatchNote {
  const lead = /^\*\*([^*]+)\*\*\s*/.exec(text);
  if (!lead) return { text: plain(text) };
  return {
    title: plain(lead[1] ?? "").replace(/[.:]$/, ""),
    text: plain(text.slice(lead[0].length)),
  };
}

function sentenceCase(heading: string): string {
  const words = heading.trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** The released sections of the notes file, newest first as the file keeps them. */
export function patchNoteReleases(text: string): PatchNoteRelease[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const releases: PatchNoteRelease[] = [];
  let current:
    | {
        version: string;
        title: string;
        released?: string;
        groups: PatchNoteGroup[];
      }
    | undefined;
  let group: { heading: string; notes: PatchNote[] } | undefined;
  let bullet: string[] | undefined;
  const closeBullet = () => {
    if (bullet && group) group.notes.push(note(bullet.join(" ")));
    bullet = undefined;
  };
  const closeGroup = () => {
    closeBullet();
    if (group && current) current.groups.push(group);
    group = undefined;
  };
  const closeRelease = () => {
    closeGroup();
    if (current) releases.push(current);
    current = undefined;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = HEADING.exec(line);
    if (heading) {
      closeRelease();
      const version = VERSION.exec(heading[1] ?? "")?.[0];
      if (version)
        current = {
          version,
          title: sentenceCase(heading[1] ?? ""),
          groups: [],
        };
      continue;
    }
    if (!current) continue;
    const sub = /^### (.+)$/.exec(line);
    if (sub) {
      closeGroup();
      group = { heading: (sub[1] ?? "").trim(), notes: [] };
      continue;
    }
    const released = /^_(.+)_$/.exec(line.trim());
    if (released && !group) {
      current.released = plain(released[1] ?? "");
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      closeBullet();
      bullet = [line.replace(/^\s*[-*] /, "").trim()];
      continue;
    }
    if (line.trim() === "") {
      closeBullet();
      continue;
    }
    if (bullet) bullet.push(line.trim());
    else if (group) group.notes.push({ text: plain(line) });
  }
  closeRelease();
  return releases;
}
