/**
 * Moves the notes out of the director's data files (CTO's story audit, Nov 26, row C9; owner, Nov 26:
 * "It's all just going to be called story now"; the game folder holds what the game reads and nothing
 * else). A note is a long prose string under an `about`, `why` or `note` key in src/director/data/*.json; a
 * short value under the same key (`"about": "subject"`) is a field the code reads and stays, and
 * stopgaps.json, whose `why` is the register's own, is left whole.
 *
 * For each file the notes go word for word to docs/story/data-notes/<file>.md, and any note that carries an
 * owner's word (the owner named, or a quotation) is first added to docs/coordination/OWNER-DECISIONS.md,
 * word for word, before it leaves the data. Then the keys are removed. Re-runnable: a note already
 * moved is not added twice, and a file with no note left is not touched.
 *
 *   node scripts/story/move-data-notes.mjs
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DATA = "src/director/data";
const KEEP_WHOLE = new Set(["stopgaps.json"]);
const NOTES_DIR = "docs/story/data-notes";
const DECISIONS = "docs/coordination/OWNER-DECISIONS.md";
const HEADING =
  "## Nov 27, 2026: owner words from the notes moved out of src/director/data (recorded by Story, word for word)";

const isNote = (key, value) =>
  (key === "about" || key === "why" || key === "note") &&
  typeof value === "string" &&
  value.length >= 60 &&
  value.includes(" ");
const ownerWord = (text) => /\bowner\b/i.test(text) || /"[^"]{25,}"/.test(text);

/** Every note under a value: its path and text. */
function collect(value, at, out) {
  if (Array.isArray(value))
    value.forEach((item, i) => collect(item, `${at}[${i}]`, out));
  else if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value)) {
      if (isNote(key, item))
        out.push({ path: `${at}.${key}`.replace(/^\./, ""), key, text: item });
      else collect(item, `${at}.${key}`, out);
    }
  return out;
}

/**
 * The file's text without its notes: each note's own property is cut out of the text, so nothing
 * else in the file moves. A property alone on its line goes with its line; one that was last takes
 * the comma off the property before it.
 */
function strip(text, notes) {
  let out = text;
  for (const { key, text: note } of notes) {
    const value = JSON.stringify(note);
    const own = new RegExp(
      `(,?)\\n[ \\t]*"${key}": ${escape(value)}(,?)(?=\\n)`,
    );
    const line = own.exec(out);
    if (line) {
      // The property sits on its own line: cut the line; if it was last, the property before loses its comma.
      out = out.replace(own, line[2] ? "$1" : "");
      continue;
    }
    // Inline, among other properties on one line.
    const inline = new RegExp(`"${key}": ${escape(value)},? ?`);
    if (!inline.test(out))
      throw new Error(
        `could not find the ${key} note to cut: ${note.slice(0, 40)}`,
      );
    out = out.replace(inline, "");
  }
  return out;
}
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const files = readdirSync(path.join(ROOT, DATA)).filter(
  (file) => file.endsWith(".json") && !KEEP_WHOLE.has(file),
);
const decisionsText = readFileSync(path.join(ROOT, DECISIONS), "utf8");
const toDecisions = [];
let moved = 0;
for (const file of files) {
  const full = path.join(ROOT, DATA, file);
  const data = JSON.parse(readFileSync(full, "utf8"));
  const notes = collect(data, "", []);
  if (!notes.length) continue;
  mkdirSync(path.join(ROOT, NOTES_DIR), { recursive: true });
  // A file's notes file keeps every note ever moved: a re-run adds only the notes it has not got.
  const target = path.join(ROOT, NOTES_DIR, file.replace(/\.json$/, ".md"));
  const head = `# Notes that were in src/director/data/${file}\n\nMoved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.\n\n`;
  const have = existsSync(target) ? readFileSync(target, "utf8") : head;
  const added = notes
    .map((note) => `## \`${note.path}\`\n\n${note.text}\n`)
    .filter((section) => !have.includes(section));
  writeFileSync(
    target,
    `${have.replace(/\n*$/, "\n")}${added.length ? `\n${added.join("\n")}` : ""}`,
  );
  for (const note of notes)
    if (ownerWord(note.text) && !decisionsText.includes(note.text))
      toDecisions.push(`- **${file}, \`${note.path}\`:** ${note.text}`);
  const cut = strip(readFileSync(full, "utf8"), notes);
  JSON.parse(cut);
  writeFileSync(full, cut);
  moved += notes.length;
}
if (toDecisions.length) {
  const at = decisionsText.indexOf("\n## ");
  const section = `${HEADING}\n\n${toDecisions.join("\n")}\n`;
  const next = decisionsText.includes(HEADING)
    ? decisionsText.replace(HEADING, `${section}\n${HEADING}`)
    : `${decisionsText.slice(0, at + 1)}${section}\n${decisionsText.slice(at + 1)}`;
  writeFileSync(path.join(ROOT, DECISIONS), next);
}
process.stdout.write(
  `${moved} notes moved from ${files.length} files; ${toDecisions.length} carry an owner's word and went to OWNER-DECISIONS first\n`,
);
