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
    id: "register-duplicate-keys",
    rule: "A register entry is never glued to another: no repeated key inside any object of a stopgap register file (JSON.parse hides it, the later key wins and an entry vanishes).",
    readMore:
      "docs/design/guards.md; tests/guards/register-duplicate-keys.test.ts",
    command: vitest("tests/guards/register-duplicate-keys.test.ts"),
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
    id: "scene-pictures",
    rule: "Every scene type is mapped to a picture in the one list, and a missing picture never holds work back: a scene with no fitting picture ships on its fallback with a line in the pictures-wanted list.",
    readMore:
      ".agents/rules/scene-pictures.md; skill scene-pictures; docs/art/SCENE-PICTURES.md",
    command: vitest("tests/guards/scene-pictures.test.ts"),
  },
  {
    id: "scene-pattern",
    rule: "Every scene is built from a real-lives pattern: a situation type names its pattern in docs/story/scene-patterns.json, and a scene kind with no pattern is researched first; the list of types without one only shrinks.",
    readMore:
      "tests/guards/scene-pattern.test.ts, its header; docs/story/scene-patterns.md; skill scene-standard",
    command: vitest("tests/guards/scene-pattern.test.ts"),
  },
  {
    id: "bring-it-up-lean",
    rule: "A race's result brought up in talk is read on one path, and a line that claims a ballot or a shared side plays only where that path sets the fact; no line says a figure, a place or a first name.",
    readMore:
      "tests/guards/bring-it-up-lean.test.ts, its header; src/director/bring-it-up.ts",
    command: vitest("tests/guards/bring-it-up-lean.test.ts"),
  },
  {
    id: "day-zero",
    rule: "Day one in motion: the day-zero file is well formed, its known-red list only shrinks, and every module has answered what its records hold on day zero.",
    readMore: "skill day-one-in-motion; src/core2/data/opening/day-zero.json",
    command: vitest("tests/guards/day-zero.test.ts"),
  },
  {
    id: "line-extra",
    rule: "One reading of how far a budget line stands above its base: a line's extra is read with lineExtra, never as a line minus baseBudget.",
    readMore:
      "tests/guards/line-extra.test.ts, its header; src/core2/modules/budgets.ts",
    command: vitest("tests/guards/line-extra.test.ts"),
  },
  {
    id: "no-private-place-lookup",
    rule: "A town's state and county parts are read through their one reader, never by looking a place record up on the side.",
    readMore:
      "tests/guards/no-private-place-lookup.test.ts, its header; src/core2/place-map.ts",
    command: vitest("tests/guards/no-private-place-lookup.test.ts"),
  },
  {
    id: "one-face-one-card",
    rule: "One face part and one person card: a face is drawn only by the face part from the one face record, and a person shown by face and name only by the person card.",
    readMore:
      "tests/guards/one-face-one-card.test.ts, its header; AGENTS.md, one screen renderer per menu type",
    command: vitest("tests/guards/one-face-one-card.test.ts"),
  },
  {
    id: "one-list-and-detail-part",
    rule: "One screen renderer per menu type: every list beside its detail is the roster screen and every bar of tabs is the tab bar.",
    readMore:
      "tests/guards/one-list-and-detail-part.test.ts, its header; src/bench/ui/roster-screen.mjs",
    command: vitest("tests/guards/one-list-and-detail-part.test.ts"),
  },
  {
    id: "person-card-headings",
    rule: "A person card's headings never show a slot: every heading label is worded with its slots filled.",
    readMore:
      "tests/guards/person-card-headings.test.ts, its header; skill player-screen-text",
    command: vitest("tests/guards/person-card-headings.test.ts"),
  },
  {
    id: "ui-tokens",
    rule: "One UI system: a size, a corner or a color is named once in the root of play.css and every rule reads the name; the hand-typed count only shrinks.",
    readMore: "tests/guards/ui-tokens-baseline.json; src/bench/ui/README.md",
    command: vitest("tests/guards/ui-tokens.test.ts"),
  },
  {
    id: "daily-register",
    rule: "Not everything is tracked every day: every daily engine step and every kept table is written in the daily register, and a daily step or a table that grows unfolded is approved by name; the unapproved list only shrinks.",
    readMore:
      ".agents/rules/cadence-and-summaries.md; docs/design/daily-register.md; skill cadence-and-summaries",
    command: vitest("tests/guards/daily-register.test.ts"),
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
    id: "no-steering",
    rule: "A measure moves because something in the world caused it: no step code pulls it toward a level, a researched figure or a higher place's value, or clamps an outcome to a range; every parameter row names its role; the known lists only shrink.",
    readMore:
      "tests/guards/no-steering.test.ts; the owner's rule that real ranges are not targets",
    command: vitest("tests/guards/no-steering.test.ts"),
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
    id: "check-changes",
    rule: "No session edits the checks that judge it: a change adds no expected-failure, skip, only or todo mark, no known-red row, no test pinned to a named town or seed and no larger baseline, and drops no test file, case or assertion, without the CTO's line on the crew issue.",
    readMore:
      "scripts/guards/check-changes.mjs, its header; tests/guards/check-changes.json; docs/design/guards.md, check-changes",
    // Its spelling list is TypeScript; CI runs Node 22.13, which loads it only
    // with the flag (the checks-guard workflow passes it too).
    command: [
      "node",
      "--experimental-strip-types",
      "scripts/guards/check-changes.mjs",
    ],
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
