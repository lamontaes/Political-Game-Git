// The draft pull request `npm run pool -- next` opens for the item it claims:
// its title and its body, made from .github/PULL_REQUEST_TEMPLATE.md, the item
// and the thread rules in docs/pool/START-A-BUILDER.md.
import { section } from "./standard";

/** The line a new branch's release note holds until its builder writes the note. */
export const NOTE_PLACEHOLDER =
  "Not written yet: the builder replaces this line before the pull request is ready.";

/** The release note a new item branch starts with. */
export const releaseNote = (id: string): string =>
  `---\nid: ${id}\nimpact: none\n---\n\n${NOTE_PLACEHOLDER}\n`;

/**
 * The id a new branch's release note takes: the item's own id when no released
 * change or change file on main uses it, else the item's id with -2, -3 and so
 * on until one is free (an item sent back or reopened already has a merged note).
 */
export function chooseNoteId(id: string, used: ReadonlySet<string>): string {
  let pick = id;
  for (let n = 2; used.has(pick); n++) pick = `${id}-${n}`;
  return pick;
}

/** The sections of the item the body carries under "The item as claimed". */
const CLAIMED = [
  "What",
  "Cause",
  "Fix",
  "Time box",
  "Rules",
  "Waits on",
  "Files",
];

export const prTitle = (id: string, title: string): string => `${id}: ${title}`;

/** Splits a Done when section into its sentences. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z`"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The bullets under "## The pull request is the item's thread" in docs/pool/START-A-BUILDER.md. */
export function threadRules(startPage: string): string[] {
  const at = startPage.indexOf("## The pull request is the item's thread");
  if (at < 0) return [];
  const rest = startPage.slice(at).split("\n").slice(1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end < 0 ? rest : rest.slice(0, end)).filter((l) =>
    l.startsWith("- "),
  );
}

const cell = (s: string): string => s.replace(/\|/g, "\\|");

/** The draft pull request's body for one item. */
export function prBody(
  id: string,
  itemText: string,
  template: string,
  startPage: string,
): string {
  const lines = template.replace(/\r\n/g, "\n").split("\n");
  lines[0] = `Pool item: ${id}`;
  const head = lines.findIndex((l) => /^\|\s*Done-when line\s*\|/.test(l));
  if (head >= 0) {
    let end = head + 2;
    while (end < lines.length && lines[end].startsWith("|")) end++;
    const rows = sentences(section(itemText, "Done when")).map(
      (s) => `| ${cell(s)} | |`,
    );
    lines.splice(
      head,
      end - head,
      "| Done-when line | Evidence |",
      "| --- | --- |",
      ...rows,
    );
  }
  const claimed = CLAIMED.map((name) => {
    const body = section(itemText, name);
    return body ? `**${name}.** ${body}` : `**${name}.** (not in the item)`;
  });
  const rules = threadRules(startPage);
  return [
    lines.join("\n").trimEnd(),
    "",
    "## The item as claimed",
    "",
    claimed.join("\n\n"),
    "",
    "## How this pull request is used",
    "",
    ...(rules.length
      ? rules
      : [
          "- See docs/pool/START-A-BUILDER.md, The pull request is the item's thread.",
        ]),
    "",
  ].join("\n");
}
