/**
 * Folds Story's fifteen skills into three (CTO's story audit, Nov 26, "The skills"; owner, Nov 26:
 * "It's all just going to be called story now"): `story` (how the engine works), `story-writer`
 * (the one writing loop) and `story-check` (how its lines are read and graded).
 *
 * Each folded skill's SKILL.md moves, whole and unedited apart from its frontmatter, to
 * `<skill>/references/<old-name>.md`, and its own folders go beside it under
 * `<skill>/references/<old-name>/`, so every owner quote and rule is kept. A relative
 * `references/` link inside a moved file is pointed at the new folder. The .claude mirror is
 * rewritten from .agents byte for byte. Then every pointer to an old skill (a path or its name in
 * backticks) in the current files is pointed at the new skill and its part.
 *
 * Re-runnable: a skill already folded is skipped, and the pointer pass only touches what still
 * names an old skill.   node scripts/story/merge-skills.mjs
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const AGENTS = ".agents/skills";
const CLAUDE = ".claude/skills";

/** Old skill, the skill that holds it now, and what to call its part. */
export const FOLDED = {
  "words-engine": ["story", "engine part"],
  "scene-producers": ["story", "scene-producers part"],
  "scene-pictures": ["story", "pictures part"],
  "press-desk-reach": ["story", "press-desk part"],
  "civic-prose": ["story-writer", "civic-prose part"],
  "scenes-from-life": ["story-writer", "elements part"],
  "speech-writer": ["story-writer", "speeches part"],
  "journal-writer": ["story-writer", "journal part"],
  "news-writer": ["story-writer", "news part"],
  "pre-grade": ["story-check", "pre-grade part"],
  "words-stamp-read": ["story-check", "stamp-read part"],
  "scene-standard": ["story-check", "scene-standard part"],
};

const git = (...args) =>
  execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
const abs = (p) => path.join(ROOT, p);

/** The frontmatter's description, folded or one line. */
function descriptionOf(text) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!block) return "";
  const lines = block[1].split("\n");
  const at = lines.findIndex((line) => line.startsWith("description:"));
  const inline = lines[at].slice("description:".length).trim();
  if (inline !== ">" && inline !== "|") return inline;
  const out = [];
  for (const line of lines.slice(at + 1)) {
    if (!/^\s+/.test(line)) break;
    out.push(line.trim());
  }
  return out.join(" ");
}

export function foldSkills() {
  for (const [old, [into]] of Object.entries(FOLDED)) {
    const from = `${AGENTS}/${old}`;
    if (!existsSync(abs(`${from}/SKILL.md`))) continue;
    const references = `${AGENTS}/${into}/references`;
    mkdirSync(abs(references), { recursive: true });
    const text = readFileSync(abs(`${from}/SKILL.md`), "utf8");
    const body = text.replace(/^---\n[\s\S]*?\n---\n+/, "");
    // Inside the moved file a path is written from the file's own folder (references/), so a link still resolves.
    const links = body
      .replace(/(^|[\s`(])references\//g, `$1${old}/`)
      .replace(/(^|[\s`(])examples\//g, `$1${old}/examples/`);
    const head = `# ${old}\n\n*This was the \`${old}\` skill until Nov 27, 2026; the \`${into}\` skill holds it as a part (owner, Nov 26: "It's all just going to be called story now"). What it covered: ${descriptionOf(text)}*\n\n`;
    writeFileSync(abs(`${references}/${old}.md`), head + links);
    const folders = readdirSync(abs(from), { withFileTypes: true });
    git("rm", "-q", "-f", `${from}/SKILL.md`);
    for (const entry of folders) {
      if (!entry.isDirectory()) continue;
      mkdirSync(abs(`${references}/${old}`), { recursive: true });
      for (const sub of readdirSync(abs(`${from}/${entry.name}`))) {
        const target = `${references}/${old}/${entry.name === "references" ? "" : `${entry.name}/`}${sub}`;
        mkdirSync(path.dirname(abs(target)), { recursive: true });
        git("mv", `${from}/${entry.name}/${sub}`, target);
        // A file that stood in references/ now sits beside examples/, so its link to them is one step shorter.
        if (target.endsWith(".md") && entry.name === "references") {
          const text = readFileSync(abs(target), "utf8");
          if (text.includes("../examples/"))
            writeFileSync(
              abs(target),
              text.replaceAll("../examples/", "examples/"),
            );
        }
      }
    }
    git("add", "-A", references);
  }
}

const RECORDS = [
  "docs/pool/",
  "docs/coordination/",
  "docs/archive/",
  "docs/codex/",
  "docs/reports/",
  "docs/seen/",
  "docs/grading/",
  "docs/lanes/",
];

/** Every file that may still point at an old skill. A record gets its paths fixed and no more: its words stay as written. */
function pointerFiles() {
  return git("ls-files", ".")
    .split("\n")
    .filter(
      (file) =>
        /\.(md|mdc|ts|mjs|json|toml|yml|yaml)$/.test(file) &&
        !file.startsWith(".claude/skills/") &&
        !file.startsWith("docs/current") &&
        file !== "docs/CURRENT.md" &&
        file !== "scripts/story/merge-skills.mjs" &&
        existsSync(abs(file)),
    );
}

export function repoint() {
  let changed = 0;
  for (const file of pointerFiles()) {
    const text = readFileSync(abs(file), "utf8");
    let next = text;
    for (const [old, [into, part]] of Object.entries(FOLDED)) {
      // A path: .agents/skills/<old>/SKILL.md or .claude/skills/<old>/SKILL.md or a folder under it.
      next = next.replace(
        new RegExp(`(\\.agents|\\.claude)/skills/${old}/SKILL\\.md`, "g"),
        `$1/skills/${into}/references/${old}.md`,
      );
      next = next.replace(
        new RegExp(`(\\.agents|\\.claude)/skills/${old}/references/`, "g"),
        `$1/skills/${into}/references/${old}/`,
      );
      next = next.replace(
        new RegExp(`(\\.agents|\\.claude)/skills/${old}/examples/`, "g"),
        `$1/skills/${into}/references/${old}/examples/`,
      );
      next = next.replace(
        new RegExp(`(\\.agents|\\.claude)/skills/${old}\\b`, "g"),
        `$1/skills/${into}/references/${old}`,
      );
      // A name in backticks is re-pointed in the current files; a folded skill's own text keeps the names it was written with.
      if (
        !file.includes("/references/") &&
        !RECORDS.some((dir) => file.startsWith(dir))
      )
        next = next.replace(
          new RegExp(`\`${old}\``, "g"),
          `\`${into}\` (${part})`,
        );
    }
    if (next !== text) {
      writeFileSync(abs(file), next);
      changed += 1;
    }
  }
  return changed;
}

/** The folders a fold leaves empty are removed. */
export function sweepEmpty() {
  for (const old of Object.keys(FOLDED))
    if (existsSync(abs(`${AGENTS}/${old}`)))
      execFileSync("find", [
        abs(`${AGENTS}/${old}`),
        "-type",
        "d",
        "-empty",
        "-delete",
      ]);
}

/** The Claude mirror is the agents root, byte for byte (the pointer pass edits skills in both). */
export function mirror() {
  execFileSync("rm", ["-rf", abs(CLAUDE)]);
  execFileSync("cp", ["-R", abs(AGENTS), abs(CLAUDE)]);
  git("add", "-A", CLAUDE);
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  foldSkills();
  process.stdout.write(`${repoint()} files re-pointed\n`);
  sweepEmpty();
  mirror();
}
