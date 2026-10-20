// Builds docs/pool/INDEX.md from docs/pool/items/*.md. `--check` fails when the index is stale or an item is invalid.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const AREAS = [
  "laws",
  "gov",
  "elections",
  "office",
  "world",
  "core",
  "people",
  "director",
  "words",
  "play",
  "art",
  "release",
  "docs",
];
export const KINDS = [
  "bug",
  "feature",
  "wiring",
  "stopgap",
  "research",
  "cleanup",
  "owner-decision",
];
export const STATUSES = [
  "open",
  "claimed",
  "in-pr",
  "blocked",
  "done",
  "dropped",
];
export const PRIORITIES = ["1", "2", "3"];
export const SIZES = ["S", "M", "L"];
const SIZE_RANK: Record<string, number> = { S: 0, M: 1, L: 2 };
const sizeOf = (i: { size?: string }): string => i.size || "M";

export interface Item {
  id: string;
  title: string;
  area: string;
  kind: string;
  priority: string;
  status: string;
  "claimed-by": string;
  pr: string;
  "blocked-on": string;
  size: string;
  [key: string]: string;
}

/** Reads the front matter: `key: value`, optional double quotes (JSON), trailing ` # comment` ignored. */
export function parseFrontMatter(text: string): Record<string, string> | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const c = line.indexOf(":");
    if (c < 1 || /^\s/.test(line)) continue;
    let v = line.slice(c + 1).trim();
    if (v.startsWith('"')) {
      try {
        v = String(JSON.parse(/^"(?:[^"\\]|\\.)*"/.exec(v)?.[0] ?? v));
      } catch {
        /* keep raw */
      }
    } else if (v.startsWith("'"))
      v = v.replace(/^'(.*)'.*$/, "$1").replace(/''/g, "'");
    else v = v.replace(/\s+#.*$/, "").trim();
    out[line.slice(0, c).trim()] = v;
  }
  return out;
}

export function validate(
  file: string,
  fm: Record<string, string> | null,
): string[] {
  if (!fm) return [`${file}: no front matter`];
  const errs: string[] = [];
  const stem = file.replace(/\.md$/, "");
  if (fm.id !== stem)
    errs.push(`${file}: id "${fm.id ?? ""}" must equal the file name`);
  if (!fm.title) errs.push(`${file}: title is required`);
  const enums: [string, string[]][] = [
    ["area", AREAS],
    ["kind", KINDS],
    ["priority", PRIORITIES],
    ["status", STATUSES],
  ];
  for (const [k, ok] of enums)
    if (!ok.includes(fm[k] ?? ""))
      errs.push(
        `${file}: ${k} "${fm[k] ?? ""}" is not one of ${ok.join(" | ")}`,
      );
  if (fm.size && !SIZES.includes(fm.size))
    errs.push(`${file}: size "${fm.size}" is not one of ${SIZES.join(" | ")}`);
  if (fm.status === "claimed" && !fm["claimed-by"])
    errs.push(`${file}: claimed-by is required when status is claimed`);
  if (fm.status === "in-pr" && !fm.pr)
    errs.push(`${file}: pr is required when status is in-pr`);
  return errs;
}

export const STANDING_RULES = [
  "No dice",
  "Sliding scales and causes",
  "One rule, all 56 places",
  "Estimate, never UNKNOWN",
  "Wire to the world",
  "This is a game, not a spreadsheet",
  "An effect is a read, not a record",
  "Replace, never layer",
  "One model, two tiers",
  "The chain is the acceptance",
  "Look before you ask",
  "Ask why",
  "No hand-written player text",
  "Research before building",
  "Speed",
  "American English",
];
const DONE_WORDS = [
  "drawn place",
  "played world",
  "record id",
  "buildBenchWorld",
  "test",
  "screenshot",
];

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Pulls one bolded section ("**What.**") out of an item body. */
export function section(text: string, name: string): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
  const re = new RegExp(
    `\\*\\*${name}\\.?\\*\\*\\.?([\\s\\S]*?)(?=\\n\\*\\*[A-Z][a-z ]+\\.?\\*\\*|$)`,
  );
  return (re.exec(body)?.[1] ?? "").trim();
}

/** Quality gate for open or claimed priority 1 and 2 items. Returns "<id>: <field> ..." problems. */
export function quality(
  file: string,
  fm: Record<string, string>,
  text: string,
): string[] {
  if (
    !["open", "claimed"].includes(fm.status) ||
    !["1", "2"].includes(fm.priority)
  )
    return [];
  const id = file.replace(/\.md$/, "");
  const errs: string[] = [];
  const what = section(text, "What");
  const sentences = what.split(/[.!?](?:\s|$)/).filter((x) => x.trim()).length;
  if (sentences < 3 || words(what) < 40)
    errs.push(
      `${id}: What needs at least 3 sentences and 40 words (has ${sentences} and ${words(what)})`,
    );
  const rules = section(text, "Rules");
  const ok = STANDING_RULES.some((r) => {
    const at = rules.toLowerCase().indexOf(r.toLowerCase());
    return at >= 0 && words(rules.slice(at + r.length)) >= 6;
  });
  if (!ok)
    errs.push(
      `${id}: Rules must name a standing rule with at least 6 words after it saying how it applies`,
    );
  const done = section(text, "Done when");
  if (words(done) < 25 || !DONE_WORDS.some((w) => done.includes(w)))
    errs.push(
      `${id}: Done when needs 25 words and one of ${DONE_WORDS.join(", ")}`,
    );
  if (/#\d+/.test(done) && !fm.after && !fm["blocked-on"])
    errs.push(
      `${id}: Done when names a PR number; use after: or blocked-on: instead`,
    );
  if (!/[\w.-]+\/[\w./-]+/.test(section(text, "Files")))
    errs.push(`${id}: Files must name at least one path`);
  return errs;
}

const ids = (v?: string): string[] =>
  (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const cell = (s: string): string => (s || "").replace(/\|/g, "\\|");

export function buildIndex(items: Item[]): string {
  const doneIds = new Set(
    items.filter((i) => i.status === "done").map((i) => i.id),
  );
  const waiting = (i: Item): string[] =>
    ids(i.after).filter((a) => !doneIds.has(a));
  const gated = (i: Item): boolean =>
    i.status === "open" && waiting(i).length > 0;
  const by = (s: string): Item[] =>
    items.filter((i) => i.status === s && !gated(i));
  const sorted = (xs: Item[]): Item[] =>
    [...xs].sort(
      (a, b) =>
        a.priority.localeCompare(b.priority) ||
        SIZE_RANK[sizeOf(a)] - SIZE_RANK[sizeOf(b)] ||
        a.area.localeCompare(b.area) ||
        a.id.localeCompare(b.id),
    );
  const gatedItems = items.filter(gated);
  const counts = STATUSES.map(
    (s) => `${items.filter((i) => i.status === s).length} ${s}`,
  ).join(", ");
  const table = (xs: Item[]): string[] => [
    "| id | title | area | kind | priority | size | claimed-by | pr | blocked-on |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sorted(xs).map(
      (i) =>
        `| [${i.id}](items/${i.id}.md) | ${cell(i.title)} | ${i.area} | ${i.kind} | ${i.priority} | ${sizeOf(i)} | ${cell(i["claimed-by"])} | ${cell(i.pr)} | ${cell(i["blocked-on"])} |`,
    ),
  ];
  const out = [
    "# The pool",
    "",
    "Generated by `npm run pool`. Never edit by hand; see [README](README.md).",
    "",
    `**${items.length} items:** ${counts}.`,
    "",
    "## In PR (from pool items)",
    "",
    ...(by("in-pr").length
      ? sorted(by("in-pr")).map(
          (i) =>
            `- ${i.pr ? i.pr.replace(/^#(\d+)$/, "[#$1](https://github.com/lamontaes/Political-Game-Git/pull/$1)") : "no PR"}: ${cell(i.title)} ([${i.id}](items/${i.id}.md))`,
        )
      : ["None."]),
    "",
    "## Next up",
    "",
    ...sorted(by("open"))
      .slice(0, 15)
      .map(
        (i, n) =>
          `${n + 1}. [${i.id}](items/${i.id}.md) (${i.area}, ${i.kind}, p${i.priority}, ${sizeOf(i)}) — ${cell(i.title)}`,
      ),
    "",
  ];
  for (const s of ["open", "claimed", "in-pr", "blocked"]) {
    out.push(`## ${s} (${by(s).length})`, "");
    out.push(...(by(s).length ? table(by(s)) : ["None."]), "");
  }
  out.push("## Gated (waiting on another item)", "");
  out.push(
    ...(gatedItems.length
      ? sorted(gatedItems).map(
          (i) =>
            `- [${i.id}](items/${i.id}.md) (${i.area}, p${i.priority}, ${sizeOf(i)}) — waits on ${waiting(i).join(", ")}`,
        )
      : ["None."]),
    "",
  );
  for (const s of ["done", "dropped"]) {
    out.push(`## ${s} (${by(s).length})`, "");
    out.push(
      ...(by(s).length
        ? sorted(by(s)).map((i) => `- [${i.id}](items/${i.id}.md)`)
        : ["None."]),
      "",
    );
  }
  return out.join("\n");
}

/** Reads a pool directory (the folder holding items/ and INDEX.md). Returns the index text and every problem. */
export function run(
  poolDir: string,
  check: boolean,
): { index: string; errors: string[]; warnings: string[] } {
  const dir = join(poolDir, "items");
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: Item[] = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf8");
    const fm = parseFrontMatter(text);
    const errs = validate(f, fm);
    errors.push(...errs);
    if (!errs.length && fm) warnings.push(...quality(f, fm, text));
    if (!errs.length && fm)
      items.push({ "claimed-by": "", pr: "", "blocked-on": "", ...fm } as Item);
  }
  const known = new Set(files.map((f) => f.replace(/\.md$/, "")));
  for (const i of items)
    for (const a of ids(i.after))
      if (!known.has(a)) errors.push(`${i.id}.md: after "${a}" is not an item`);
  const index = buildIndex(items);
  const path = join(poolDir, "INDEX.md");
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== index)
      errors.push("docs/pool/INDEX.md is stale: run `npm run pool`");
  } else if (!errors.length) writeFileSync(path, index);
  return { index, errors: check ? [...errors, ...warnings] : errors, warnings };
}

const POOL = (): string => join(process.cwd(), "docs", "pool");
const itemPath = (id: string): string => join(POOL(), "items", `${id}.md`);

/** Sets or inserts front-matter keys in an item's text. */
export function setFields(
  text: string,
  fields: Record<string, string>,
): string {
  let out = text;
  for (const [k, v] of Object.entries(fields)) {
    const re = new RegExp(`^${k}:.*$`, "m");
    const head = /^---\r?\n[\s\S]*?\r?\n---/.exec(out);
    if (!head) throw new Error("no front matter");
    if (re.test(head[0])) {
      const h2 = head[0].replace(re, `${k}: ${v}`.trimEnd());
      out = h2 + out.slice(head[0].length);
    } else {
      const h2 = head[0].replace(/\r?\n---$/, `\n${k}: ${v}\n---`);
      out = h2 + out.slice(head[0].length);
    }
  }
  return out;
}

const git = (...a: string[]): string =>
  execFileSync("git", a, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

function readItem(id: string): Record<string, string> {
  if (!existsSync(itemPath(id))) throw new Error(`no such item: ${id}`);
  return parseFrontMatter(readFileSync(itemPath(id), "utf8")) ?? {};
}

/** Applies an edit, regenerates the index and commits the two files. Throws on a refusal. */
function applyAndCommit(id: string, edit: () => void, message: string): void {
  edit();
  const { errors } = run(POOL(), false);
  if (errors.length) throw new Error(errors.join("\n"));
  git("add", "docs/pool/INDEX.md", `docs/pool/items/${id}.md`);
  git(
    "commit",
    "-m",
    message,
    "--",
    "docs/pool/INDEX.md",
    `docs/pool/items/${id}.md`,
  );
}

function mutate(
  id: string,
  edit: () => void,
  message: string,
  noPush: boolean,
): void {
  if (noPush) return applyAndCommit(id, edit, message);
  const prev = git("rev-parse", "--abbrev-ref", "HEAD");
  const tmp = `pool-claim-${id}`;
  let last: unknown;
  try {
    for (let n = 0; n < 3; n++) {
      git("fetch", "origin", "main");
      git("checkout", "-B", tmp, "origin/main");
      applyAndCommit(id, edit, message);
      try {
        git("push", "origin", "HEAD:main");
        return;
      } catch (e) {
        last = e;
      }
    }
    throw new Error(`push to main failed 3 times: ${String(last)}`);
  } finally {
    try {
      git("checkout", prev === "HEAD" ? "-" : prev);
      git("branch", "-D", tmp);
    } catch {
      /* best effort */
    }
  }
}

/**
 * Flags come as `--key value` or `--key=value`. `--by` may also come from
 * POOL_BY: npm swallows a `--by` written without `--` before the arguments
 * (`npm run pool status x done --by cto` reaches the tool as `done cto`), and
 * an env var survives that.
 */
export function flags(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): { pos: string[]; f: Record<string, string> } {
  const pos: string[] = [];
  const f: Record<string, string> = {};
  if (env.POOL_BY) f.by = env.POOL_BY;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--no-push") f["no-push"] = "1";
    else if (argv[i].startsWith("--")) {
      const eq = argv[i].indexOf("=");
      if (eq > 2) f[argv[i].slice(2, eq)] = argv[i].slice(eq + 1);
      else f[argv[i].slice(2)] = argv[++i] ?? "";
    } else pos.push(argv[i]);
  }
  return { pos, f };
}

/** The body sections `add` takes; a priority 1 or 2 item must give every one. */
const BODY_FLAGS = ["what", "rules", "done", "files"] as const;

const TEMPLATE = (f: Record<string, string>, id: string): string =>
  `---\nid: ${id}\ntitle: ${JSON.stringify(f.title)}\narea: ${f.area}\nkind: ${f.kind}\npriority: ${f.priority}\nsize: ${f.size}\nstatus: open\nclaimed-by:\npr:\nblocked-on:\n${f.after ? `after: ${f.after}\n` : ""}source: ${f.source || "added with npm run pool -- add"}\n---\n\n**What.** ${f.what || "TODO"}\n\n**Rules.** ${f.rules || "TODO"}\n\n**Done when.** ${f.done || "TODO"}\n\n**Files.** ${f.files || "TODO"}\n\n**Notes.** ${f.notes || "TODO"}\n`;

/** Runs a subcommand; returns an error message or null. */
export function command(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const { pos, f } = flags(argv, env);
  const [cmd, id] = pos;
  const noPush = !!f["no-push"];
  try {
    if (cmd === "claim") {
      if (!id || !f.branch) return "usage: pool claim <id> --branch <branch>";
      const edit = (): void => {
        const fm = readItem(id);
        if (fm.status === "claimed" && fm["claimed-by"] === f.branch) return;
        if (fm.status === "claimed" || fm.status === "in-pr")
          throw new Error(
            `already claimed by ${fm["claimed-by"] || fm.pr}; take the next item`,
          );
        if (fm.status !== "open")
          throw new Error(`${id} is ${fm.status}, not open`);
        const waiting = ids(fm.after).filter(
          (a) => readItem(a).status !== "done",
        );
        if (waiting.length)
          throw new Error(
            `${id} waits on ${waiting.join(", ")}; take the top of Next up`,
          );
        writeFileSync(
          itemPath(id),
          setFields(readFileSync(itemPath(id), "utf8"), {
            status: "claimed",
            "claimed-by": f.branch,
            "claimed-at": new Date().toISOString(),
          }),
        );
      };
      mutate(id, edit, `pool: claim ${id} (${f.branch})`, noPush);
    } else if (cmd === "status") {
      const st = pos[2];
      if (!id || !["in-pr", "done", "blocked", "open", "dropped"].includes(st))
        return "usage: pool status <id> <in-pr|done|blocked|open|dropped> [--pr N] [--blocked-on <id>] [--by=cto]";
      if ((st === "done" || st === "dropped") && f.by !== "cto")
        return `${st} is allowed only with --by=cto (or POOL_BY=cto in the environment)`;
      const edit = (): void => {
        readItem(id);
        const fields: Record<string, string> = { status: st };
        if (f.pr) fields.pr = `#${f.pr.replace(/^#/, "")}`;
        if (f["blocked-on"]) fields["blocked-on"] = f["blocked-on"];
        if (st === "open") {
          fields["claimed-by"] = "";
          fields["claimed-at"] = "";
        }
        writeFileSync(
          itemPath(id),
          setFields(readFileSync(itemPath(id), "utf8"), fields),
        );
      };
      mutate(
        id,
        edit,
        `pool: ${id} ${st}${f.pr ? ` (#${f.pr.replace(/^#/, "")})` : ""}`,
        noPush,
      );
    } else if (cmd === "add") {
      if (!id)
        return "usage: pool add <id> --title ... --area ... --kind ... --priority N --size S|M|L [--after a,b] --what ... --rules ... --done ... --files ... [--notes ...] (the four body flags are required for priority 1 and 2)";
      f.size = f.size || "M";
      const edit = (): void => {
        if (existsSync(itemPath(id))) throw new Error(`${id} already exists`);
        if (!f.title) throw new Error("--title is required");
        // A priority 1 or 2 item left as the template fails the pool check on
        // main, which every session's gate runs; refuse it before the push.
        const missing = BODY_FLAGS.filter((name) => !f[name]);
        if (f.priority !== "3" && missing.length)
          throw new Error(
            `a priority ${f.priority} item needs its body: missing ${missing.map((n) => `--${n}`).join(", ")}`,
          );
        writeFileSync(itemPath(id), TEMPLATE(f, id));
      };
      mutate(id, edit, `pool: add ${id}`, noPush);
    } else return `unknown subcommand: ${cmd}`;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return null;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const sub = process.argv[2];
  if (sub && !sub.startsWith("-")) {
    const err = command(process.argv.slice(2));
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`pool ${sub} done`);
    process.exit(0);
  }
  const check = process.argv.includes("--check");
  const { errors, warnings } = run(join(process.cwd(), "docs", "pool"), check);
  if (!check && warnings.length) console.warn(warnings.join("\n"));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(check ? "pool index is current" : "pool index written");
}
