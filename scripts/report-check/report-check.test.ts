import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM so the session hook runs without an install
import { checkReport, isOwnerReportPath } from "./report-check.mjs";

type Result = { errors: string[]; warnings: string[]; story: boolean };
const check = checkReport as (
  text: string,
  options?: { path?: string; story?: boolean },
) => Result;
const ownerPath = isOwnerReportPath as (path: string) => boolean;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const STORY = [
  "# Ely keeps its mayor",
  "",
  "The mayor of Ely, Nevada, ran again and won. Nothing needs a decision.",
  "",
  "## The life as lived",
  "",
  'Ana Ortiz wakes up in Ely on March 3, 2026. The screen says "You are 41".',
  "",
  "## Why it went that way",
  "",
  "The race had 2 candidates, measured in `src/a.ts:10`.",
  "",
].join("\n");

describe("the report that prompted the standard", () => {
  it("fails the original on the things that made it read badly", () => {
    const { errors } = check(
      read("docs/writing/the-next-generation-original.md"),
      {
        path: "playtest/the-next-generation.md",
      },
    );
    const joined = errors.join("\n");
    expect(joined).toContain('"labeled" is British');
    expect(joined).toContain('"full stop" is British');
    expect(joined).toContain("lead contains code");
    expect(joined).toContain("lead contains a clock time");
    expect(joined).toContain("lead contains how the test was run");
    expect(joined).toContain("the story contains test machinery");
  });

  it("passes the rewrite, which carries the same facts", () => {
    const rewrite = read("docs/writing/the-next-generation-rewrite.md");
    expect(check(rewrite, { story: true })).toMatchObject({
      errors: [],
      story: true,
    });
    for (const fact of ["Russell Ryan", "40 people", "12 weeks", "Heather"])
      expect(rewrite).toContain(fact);
  });

  it("is the worked example the skill names", () => {
    const skill = read(".agents/skills/civic-reports/SKILL.md");
    expect(skill).toContain("docs/writing/the-next-generation-rewrite.md");
    expect(skill).toContain("npm run report:check");
    expect(skill).toContain("civic-report-reviewer");
    expect(
      existsSync(join(ROOT, ".claude/agents/civic-report-reviewer.md")),
    ).toBe(true);
  });
});

describe("the mechanical rules", () => {
  it("accepts a story-first report with the numbers in the second half", () => {
    expect(check(STORY, { path: "docs/playtest/ely.md" })).toMatchObject({
      errors: [],
      story: true,
    });
  });

  it.each([
    ["labelled", "labeled"],
    ["colour", "color"],
    ["organised", "organized"],
    ["analysed", "analyzed"],
    ["the town center", "the town center"],
    ["the policy catalog", "the policy catalog"],
    ["no full stop", "no period"],
    ["a council program", "a council program"],
  ])("rejects %s and accepts %s", (british, american) => {
    const body = (word: string) =>
      STORY.replace("Nothing needs a decision.", `It was ${word}.`);
    expect(check(body(british)).errors).toHaveLength(1);
    expect(check(body(american)).errors).toEqual([]);
  });

  it("leaves quoted screen text and code alone", () => {
    const quoted = STORY.replace(
      "The race had 2 candidates",
      'The screen said "the color of 2026-01-21". A `labeled` key. The race had 2 candidates',
    );
    expect(check(quoted).errors).toEqual([]);
    const blockQuoted = STORY.replace(
      "## Why",
      "> Asked to meet on 2026-01-21: catch up\n\n## Why",
    );
    expect(check(blockQuoted).errors).toEqual([]);
  });

  it("does not treat a research queue as British", () => {
    const text = STORY.replace("Nothing needs a decision.", "It is queued.");
    expect(check(text).errors).toEqual([]);
  });

  it("wants dates the way an American reader says them", () => {
    const iso = STORY.replace(
      "Nothing needs a decision.",
      "It was 2026-09-22.",
    );
    const dmy = STORY.replace(
      "Nothing needs a decision.",
      "It was September 22, 2026.",
    );
    expect(check(iso).errors.join()).toContain("raw date");
    expect(check(dmy).errors.join()).toContain("day-month-year");
  });

  it("keeps method, hashes and code out of the lead", () => {
    const lead = STORY.replace(
      "The mayor of Ely, Nevada, ran again and won.",
      "Walked at 17:26 UTC against build `836c299` in Chromium.",
    );
    const joined = check(lead).errors.join("\n");
    for (const what of ["code", "a clock time", "how the test was run"])
      expect(joined).toContain(`lead contains ${what}`);
  });

  it("keeps code and the tester out of the story", () => {
    const story = STORY.replace(
      "The screen says",
      "I ran successorCandidates and the screen says",
    );
    const joined = check(story).errors.join("\n");
    expect(joined).toContain("the story contains a code identifier");
    expect(joined).toContain("the story contains the tester narrating");
  });

  it("requires the story first and both halves", () => {
    const noStory = STORY.replace("## The life as lived", "## Setup");
    expect(check(noStory, { story: true }).errors.join()).toContain(
      "opens with the story",
    );
    const oneHalf = STORY.split("## Why")[0]!;
    expect(check(oneHalf).errors.join()).toContain("second half");
    const noNumbers = STORY.replace("2 candidates", "two candidates").replace(
      "`src/a.ts:10`",
      "the code",
    );
    expect(check(noNumbers).errors.join()).toContain("carries no numbers");
  });

  it("splits sentences a reader cannot hold, not quotations", () => {
    const long = `Word ${"word ".repeat(49).trim()}.`;
    expect(
      check(STORY.replace("Nothing needs a decision.", long)).errors.join(),
    ).toContain("50-word sentence");
    const quote = `She read "${"word ".repeat(50).trim()}" aloud.`;
    expect(
      check(STORY.replace("Nothing needs a decision.", quote)).errors,
    ).toEqual([]);
  });
});

describe("where the check runs", () => {
  it("measures owner-facing files and skips agent handoffs and raw research", () => {
    expect(ownerPath("/mnt/project-files/playtest/x.md")).toBe(true);
    expect(ownerPath("/mnt/project-files/a-decade.md")).toBe(true);
    expect(ownerPath("/work/tree/docs/playtest/x.md")).toBe(true);
    expect(ownerPath("docs/reports/x.md")).toBe(true);
    expect(ownerPath("/mnt/project-files/handoffs/x.md")).toBe(false);
    expect(ownerPath("/mnt/project-files/research/x.md")).toBe(false);
    expect(ownerPath("/mnt/project-files/playtest/x.json")).toBe(false);
    expect(ownerPath("src/simulation/x.md")).toBe(false);
  });

  const hook = (payload: object) =>
    spawnSync(process.execPath, [join(ROOT, "scripts/report-check/hook.mjs")], {
      input: JSON.stringify(payload),
      encoding: "utf8",
    });

  it("returns a failing report written for the owner to the session that wrote it", () => {
    const failing = join(ROOT, "docs/writing/the-next-generation-original.md");
    // The hook scopes by path; point it at the original through a playtest path
    // by checking the same text a Drive upload would carry.
    const drive = hook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__Google_Drive__create_file",
      tool_input: {
        title: "The next generation — playtest",
        contentMimeType: "text/markdown",
        textContent: readFileSync(failing, "utf8"),
      },
    });
    expect(drive.status).toBe(2);
    expect(drive.stderr).toContain('"labeled" is British');
  });

  it("lets a passing upload through with the reviewer reminder", () => {
    const result = hook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__Google_Drive__create_file",
      tool_input: {
        title: "Ely playtest",
        contentMimeType: "text/markdown",
        textContent: STORY,
      },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("civic-report-reviewer");
  });

  it("stays out of the way for code, JSON uploads and files outside report folders", () => {
    expect(
      hook({
        tool_name: "Write",
        tool_input: { file_path: join(ROOT, "src/main.tsx") },
      }).status,
    ).toBe(0);
    expect(
      hook({
        tool_name: "mcp__Google_Drive__create_file",
        tool_input: {
          title: "x",
          contentMimeType: "application/json",
          textContent: "{}",
        },
      }).status,
    ).toBe(0);
  });

  it("is wired for every session in the repository", () => {
    const settings = JSON.parse(read(".claude/settings.json"));
    const commands = (event: string, matcher: RegExp) =>
      (
        settings.hooks[event] as {
          matcher: string;
          hooks: { command: string }[];
        }[]
      )
        .filter((entry) => matcher.test(entry.matcher))
        .flatMap((entry) => entry.hooks.map((hook) => hook.command));
    expect(commands("PostToolUse", /Write/).join()).toContain(
      "scripts/report-check/hook.mjs",
    );
    expect(commands("PostToolUse", /Edit/).join()).toContain(
      "scripts/report-check/hook.mjs",
    );
    expect(
      commands("PreToolUse", /Google_Drive__create_file/).join(),
    ).toContain("scripts/report-check/hook.mjs");
  });
});

/**
 * Reports already in the tree when the standard arrived. Each fails it; they
 * stay as written history rather than being silently reworded. The list may
 * only shrink: a new report, or a repaired one removed from here, must pass.
 */
const WRITTEN_BEFORE_THE_STANDARD = new Set([
  "docs/playtest/INDEX-2026-09-22.md",
  "docs/playtest/a-full-year-campaigned-2026-09-22.md",
  "docs/playtest/a-legislative-seat-resolves-too-2026-09-22.md",
  "docs/playtest/a-year-of-campaigning-2026-09-22.md",
  "docs/playtest/across-america-past-the-election-2026-09-22.md",
  "docs/playtest/census-names-on-player-surfaces-2026-09-22.md",
  "docs/playtest/client-line-lost-schooling-2026-09-22.md",
  "docs/playtest/committing-a-campaign-week-stops-time-2026-09-22.md",
  "docs/playtest/context-v2-costs-the-working-past-2026-09-22.md",
  "docs/playtest/divergence-metrics-2026-09-22.md",
  "docs/playtest/drafting-table-2026-09-22.md",
  "docs/playtest/dual-systems-count-2026-09-22.md",
  "docs/playtest/dual-systems-walk-2026-09-22.md",
  "docs/playtest/generated-school-names-2026-09-22.md",
  "docs/playtest/giving-up-a-stuck-commitment-2026-09-22.md",
  "docs/playtest/making-the-journey-stranded-the-meeting-2026-09-22.md",
  "docs/playtest/nadia-luna-a-decade-2026-09-22.md",
  "docs/playtest/news-front-page-2026-09-22.md",
  "docs/playtest/no-campaign-session-can-be-carried-out-2026-09-22.md",
  "docs/playtest/party-chapters-reach-every-town-walked-2026-09-22.md",
  "docs/playtest/policy-catalogue-2026-09-22.md",
  "docs/playtest/policy-effects-2026-09-22.md",
  "docs/playtest/reachable-and-empty-2026-09-22.md",
  "docs/playtest/running-for-office-across-america-2026-09-22.md",
  "docs/playtest/ten-weeks-in-baltimore-2026-09-22.md",
  "docs/playtest/walk-2026-09-22-0711.md",
  "docs/playtest/what-campaign-sessions-are-missing-2026-09-22.md",
  "docs/playtest/what-you-can-run-for-2026-09-22.md",
  "docs/playtest/where-every-number-comes-from-2026-09-22.md",
  "docs/playtest/world-divergence-2026-09-22.md",
  "docs/reports/2026-09-22-transcripts-audit-and-personality-catalogue.md",
]);

describe("reports committed to the repository", () => {
  const committed = ["docs/playtest", "docs/reports"].flatMap((dir) =>
    existsSync(join(ROOT, dir))
      ? readdirSync(join(ROOT, dir))
          .filter((name) => name.endsWith(".md"))
          .map((name) => `${dir}/${name}`)
      : [],
  );

  it("finds the folders it guards", () => {
    expect(committed.length).toBeGreaterThan(0);
  });

  it("measures every report written after the standard", () => {
    const failing = committed
      .filter((path) => !WRITTEN_BEFORE_THE_STANDARD.has(path))
      .flatMap((path) => check(read(path), { path }).errors);
    expect(failing).toEqual([]);
  });

  it("only lets the list of older reports shrink", () => {
    for (const path of WRITTEN_BEFORE_THE_STANDARD) {
      if (!existsSync(join(ROOT, path))) continue;
      expect(
        check(read(path), { path }).errors.length,
        `${path} passes now; take it off the list`,
      ).toBeGreaterThan(0);
    }
  });
});
