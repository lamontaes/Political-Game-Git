/**
 * The guards: every check that holds one of the owner's standing rules,
 * run together on every pull request and push (the `guards` job in
 * .github/workflows/validate.yml) and locally with `npm run guards`.
 *
 * Each guard names the rule it holds in plain words and where the rule is
 * written, so a failure says what was broken and where to read why.
 * docs/design/guards.md describes each one and how to extend it.
 *
 * To add a guard: add one entry to GUARDS. A test file under tests/guards/
 * must have an entry here (scripts/guards/guards.test.ts checks it).
 *
 *   npm run guards              run every guard
 *   npm run guards -- <id> ...  run the named guards only
 *
 * CHANGED_FILES (one path per line) narrows the guards that answer only for
 * what a change touches (the pool's writing checks); the rest read the tree.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Guard = {
  /** Short name used on the command line and in the job log. */
  readonly id: string;
  /** The rule in plain words, as the owner gave it. */
  readonly rule: string;
  /** Where the rule and its self-check are written. */
  readonly readMore: string;
  /** The command, run from the repository root. */
  readonly command: readonly string[];
};

const vitest = (...args: string[]): string[] => [
  "npx",
  "vitest",
  "run",
  ...args,
];

export const GUARDS: readonly Guard[] = [
  {
    id: "no-dice",
    rule: "No seeded roll or fixed percentage decides what a person, business, official or body does.",
    readMore: ".agents/rules/standing-skills/no-dice/SKILL.md",
    command: ["node", "scripts/zero-dice-guard.mjs"],
  },
  {
    id: "old-imports",
    rule: "The new core is the engine: nothing new imports the old core.",
    readMore: "AGENTS.md, first bullet; docs/design/core2-porting-plan.md",
    command: ["node", "scripts/core2-guard/old-imports.mjs"],
  },
  {
    id: "no-second-source",
    rule: "One engine per mechanic and one source per fact: no second writer of an event kind, no new importer of the old core.",
    readMore: "AGENTS.md, first bullet",
    command: vitest("tests/guards/no-second-source.test.ts"),
  },
  {
    id: "families",
    rule: "One engine per mechanic: every file is in one engine family, and reaches another family only through its entry files; the deep imports only shrink.",
    readMore:
      "docs/design/guards.md, One engine per mechanic; tests/guards/families.json",
    command: vitest("tests/guards/families.test.ts"),
  },
  {
    id: "two-seeds-differ",
    rule: "Realistic, not real: no statistic but law opens on its published value, and two worlds never open on the same one; the known copies only shrink.",
    readMore:
      "src/core2/realistic-not-real.test.ts, its header; docs/coordination/OWNER-DECISIONS.md, Realistic not real",
    // Two played worlds: its npm script gives it the heap it needs.
    command: ["npm", "run", "-s", "zero-real-data"],
  },
  {
    id: "research-data-has-reader",
    rule: "An effect is a read, not a record: every research file has code that reads it, and the unread list only shrinks.",
    readMore: "AGENTS.md, Standing owner rules, An effect is a read",
    command: vitest("tests/guards/research-data-has-reader.test.ts"),
  },
  {
    id: "no-module-load-registries",
    rule: "Handler registries are built inside a function, never while a module loads.",
    readMore: "tests/guards/no-module-load-registries.test.ts, its header",
    command: vitest("tests/guards/no-module-load-registries.test.ts"),
  },
  {
    id: "one-history",
    rule: "One history: no new reader of the generated past, and no reader of a generated kind once its simulated kind exists; the proxy list only shrinks.",
    readMore:
      "tests/guards/one-history-proxies.json, its about line; docs/coordination/OWNER-DECISIONS.md, One history",
    command: vitest("tests/guards/one-history.test.ts"),
  },
  {
    id: "english",
    rule: "Player text is American English, never restates where the player is or who is there, and carries no developer text; the known lists only shrink.",
    readMore:
      "tests/guards/english/ (allowlist.ts holds the one allowlist); AGENTS.md, American English everywhere",
    command: vitest("tests/guards/english/"),
  },
  {
    id: "kit-only-ui",
    rule: "Every piece of UI comes from the UI kit in src/bench/ui/, nothing invented; the known markup outside it only shrinks.",
    readMore: ".claude/skills/screen-to-mock/SKILL.md",
    command: vitest("tests/guards/kit-only-ui.test.ts"),
  },
  {
    id: "canned-content",
    rule: "No hand-written player text in code; removed canned content stays removed.",
    readMore: ".claude/skills/player-screen-text/SKILL.md",
    command: vitest("tests/canned-content-guard.test.ts"),
  },
  {
    id: "director-numbers-in-data",
    rule: "Every number lives in a parameter table, and every stopgap the director marks is registered.",
    readMore: "AGENTS.md, Placeholders",
    command: vitest(
      "src/director/director.test.ts",
      "-t",
      "registers every stopgap it marks and keeps numbers in data",
    ),
  },
  {
    id: "pool",
    rule: "The pool is the backlog: the index is current, every item is well formed, and the items a change touches are SMART.",
    readMore: "docs/pool/README.md; .agents/rules/smart-and-look-first.md",
    command: [
      "node",
      "--import",
      "tsx",
      "scripts/pool/index.ts",
      "--check",
      "--changed",
    ],
  },
  {
    id: "reading-line",
    rule: "A question for the owner shows the look-first search: an OWNER DECISIONS NEEDED section that is not none carries the reading line.",
    readMore:
      ".agents/rules/smart-and-look-first.md; .claude/skills/look-first/SKILL.md",
    command: ["node", "scripts/guards/reading-line.mjs"],
  },
  {
    id: "secrets",
    rule: "No credential or signing material is ever committed.",
    readMore: "scripts/secrets/scan-tracked-secrets.mjs, its header",
    command: ["node", "scripts/secrets/scan-tracked-secrets.mjs"],
  },
  {
    id: "wording",
    rule: "Player wording carries no bookkeeping language; the counts only go down.",
    readMore:
      ".claude/skills/player-screen-text/SKILL.md; scripts/english-check/wording.ts",
    command: ["node", "--import", "tsx", "scripts/english-check/wording.ts"],
  },
];

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function runGuards(selected: readonly Guard[]): number {
  const failed: Guard[] = [];
  for (const guard of selected) {
    console.log(`\n::group::guard ${guard.id}`);
    const [cmd, ...args] = guard.command;
    const result = spawnSync(cmd!, args, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    console.log("::endgroup::");
    if (result.status === 0) {
      console.log(`guard ${guard.id}: passed`);
    } else {
      failed.push(guard);
      console.log(
        `::error title=guard ${guard.id}::${guard.rule} Read: ${guard.readMore}`,
      );
    }
  }
  console.log("");
  if (!failed.length) {
    console.log(`All ${selected.length} guards passed.`);
    return 0;
  }
  console.log(`${failed.length} of ${selected.length} guards failed:`);
  for (const guard of failed) {
    console.log(`- ${guard.id}: ${guard.rule}`);
    console.log(`  Read: ${guard.readMore}`);
  }
  return 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const names = process.argv.slice(2);
  const unknown = names.filter(
    (name) => !GUARDS.some((guard) => guard.id === name),
  );
  if (unknown.length) {
    console.error(
      `No such guard: ${unknown.join(", ")}. Known: ${GUARDS.map((g) => g.id).join(", ")}`,
    );
    process.exit(2);
  }
  const selected = names.length
    ? GUARDS.filter((guard) => names.includes(guard.id))
    : GUARDS;
  process.exit(runGuards(selected));
}
