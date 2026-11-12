// Tests for `npm run pool -- next`, `release`, the one order and Ready by model.
// Every push goes to a temporary bare repository and `gh` is a stand-in on PATH.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NOTE_PLACEHOLDER, prBody, sentences } from "./draft-pr";
import { branchPrefix, identify, readTiers, tierOf } from "./agent";
import { command, flags, run, staleClaims, validate, type Item } from "./index";
import {
  claimable,
  inKind,
  makeOrder,
  readOrder,
  timeBoxHours,
  type Row,
} from "./order";

const ROOT = process.cwd();

interface Unit {
  area?: string;
  lead?: string;
  model?: string;
  priority?: string;
  status?: string;
  claimedBy?: string;
  waits?: string;
  after?: string;
  checked?: string;
  effort?: string;
  size?: string;
  root?: string;
  cause?: string;
  box?: string;
  extra?: string;
}

/** An item at the standard, checked by Fable, waiting on nothing unless told otherwise. */
const unit = (id: string, o: Unit = {}): string =>
  [
    "---",
    `id: ${id}`,
    `title: "Title of ${id}"`,
    `area: ${o.area ?? "laws"}`,
    "kind: wiring",
    `priority: ${o.priority ?? "3"}`,
    `size: ${o.size ?? "M"}`,
    `status: ${o.status ?? "open"}`,
    "standard: 2",
    `claimed-by: ${o.claimedBy ?? ""}`.trimEnd(),
    "pr:",
    `after: ${o.after ?? ""}`.trimEnd(),
    "blocked-on:",
    `lead: ${o.lead ?? "laws"}`,
    `model: ${o.model ?? "sonnet"}`,
    `effort: ${o.effort ?? "medium"}`,
    `root: ${o.root ?? "none"}`,
    `checked: ${o.checked ?? "fable 2026-11-10"}`.trimEnd(),
    ...(o.extra ? [o.extra] : []),
    "---",
    "",
    `**What.** The law for ${id} never reaches the ledger.`,
    "",
    `**Cause.** ${o.cause ?? "Found in code: src/x.ts:1 never reads the law."}`,
    "",
    "**Fix.** Read the law where the price is set.",
    "",
    `**Time box.** ${o.box ?? "3 hours for one Sonnet session."}`,
    "",
    "**Rules.** Wire to the world: the law must move a price for every retailer.",
    "",
    "**Done when.** A second session runs it in a drawn place and sees the price move. The test in tests/x.test.ts passes.",
    "",
    `**Waits on.** ${o.waits ?? "Nothing."}`,
    "",
    "**Files.** src/x.ts",
    "",
  ].join("\n");

const git = (cwd: string, ...a: string[]): string =>
  execFileSync("git", a, { cwd, encoding: "utf8", stdio: "pipe" }).trim();

/**
 * A bare origin whose main holds the items, the real order.json, start page
 * and pull request template, and `n` clones of it (a, b, ...). `branches` are
 * pushed to origin as they are, with one commit each at the given time.
 */
function world(
  items: Record<string, string>,
  opts: { clones?: number; branches?: Record<string, string> } = {},
): {
  origin: string;
  clones: string[];
  onOrigin: (ref: string, path: string) => string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pool-next-"));
  const origin = join(dir, "origin.git");
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin]);
  const seed = join(dir, "seed");
  const pool = join(seed, "docs", "pool");
  mkdirSync(join(pool, "items"), { recursive: true });
  mkdirSync(join(seed, ".github"), { recursive: true });
  copyFileSync(join(ROOT, "docs/pool/order.json"), join(pool, "order.json"));
  copyFileSync(join(ROOT, "docs/pool/tiers.json"), join(pool, "tiers.json"));
  copyFileSync(
    join(ROOT, "docs/pool/START-A-BUILDER.md"),
    join(pool, "START-A-BUILDER.md"),
  );
  copyFileSync(
    join(ROOT, ".github/PULL_REQUEST_TEMPLATE.md"),
    join(seed, ".github/PULL_REQUEST_TEMPLATE.md"),
  );
  for (const [id, text] of Object.entries(items))
    writeFileSync(join(pool, "items", `${id}.md`), text);
  run(pool, false);
  git(dir, "init", "-q", "-b", "main", seed);
  git(seed, "config", "user.email", "t@t");
  git(seed, "config", "user.name", "t");
  git(seed, "add", ".");
  git(seed, "commit", "-qm", "init");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-q", "origin", "main");
  for (const [branch, at] of Object.entries(opts.branches ?? {})) {
    git(seed, "checkout", "-q", "-B", branch, "main");
    writeFileSync(join(seed, "work.txt"), branch);
    git(seed, "add", "work.txt");
    execFileSync("git", ["commit", "-qm", `work on ${branch}`], {
      cwd: seed,
      env: { ...process.env, GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at },
    });
    git(seed, "push", "-q", "origin", branch);
    git(seed, "checkout", "-q", "main");
  }
  const clones = Array.from({ length: opts.clones ?? 1 }, (_, n) => {
    const c = join(dir, String.fromCharCode(97 + n));
    git(dir, "clone", "-q", origin, c);
    git(c, "config", "user.email", "t@t");
    git(c, "config", "user.name", "t");
    return c;
  });
  return {
    origin,
    clones,
    onOrigin: (ref, path) => git(origin, "show", `${ref}:${path}`),
  };
}

const savedPath = process.env.PATH;
afterEach(() => {
  process.env.PATH = savedPath;
});

/** Puts a stand-in `gh` first on PATH: it records its arguments and prints `say` (or fails when `say` is null). */
function fakeGh(say: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), "pool-gh-"));
  const log = join(dir, "args");
  const script = join(dir, "gh");
  writeFileSync(
    script,
    say === null
      ? `#!/bin/sh\necho "$@" > "${log}"\necho "gh: not allowed here" >&2\nexit 1\n`
      : `#!/bin/sh\necho "$@" > "${log}"\necho "${say}"\n`,
  );
  chmodSync(script, 0o755);
  process.env.PATH = `${dir}:${savedPath}`;
  return log;
}

/** Runs the pool command inside `dir` and returns its error and printed lines. */
function pool(
  dir: string,
  argv: string[],
  beforePush?: () => void,
): { err: string | null; out: string[] } {
  const out: string[] = [];
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const err = command(
      argv,
      {},
      { out: (l) => out.push(l), beforePush, progress: () => {} },
    );
    return { err, out };
  } finally {
    process.chdir(cwd);
  }
}

const line = (out: string[], head: string): string =>
  out.find((l) => l.startsWith(head)) ?? "";
const ITEM = "docs/pool/items";

describe("the one order", () => {
  const order = readOrder(join(ROOT, "docs/pool"));
  const row = (id: string, o: Partial<Row> = {}): Row => ({
    id,
    status: "open",
    priority: "2",
    ...o,
  });
  it("sorts by priority, class, what an item unblocks, effort, size and id", () => {
    const rows = [
      row("laws-plain-l", { effort: "medium", size: "L" }),
      row("laws-plain-s", { effort: "medium", size: "S" }),
      row("laws-plain-high", { effort: "high", size: "S" }),
      row("laws-plain-low", { effort: "low", size: "L" }),
      row("laws-blocker", { effort: "high", size: "L" }),
      row("laws-waiter", { effort: "medium", after: "laws-blocker" }),
      row("laws-waiter-2", {
        effort: "medium",
        "waits-on": "laws-blocker, then the vote.",
      }),
      row("laws-lane", { milestone: "play-first" }),
      row("core-life-record-part-9"),
      row("laws-rooted", { root: "rc6-scenes-repeat" }),
      row("tests-a-check"),
      row("laws-urgent", { priority: "1", size: "L", effort: "high" }),
    ];
    const ids = [...rows].sort(makeOrder(rows, order)).map((r) => r.id);
    // A check comes before even a priority 1 item that is no rule, check or red.
    expect(ids).toEqual([
      "tests-a-check",
      "laws-urgent",
      "core-life-record-part-9",
      "laws-rooted",
      "laws-lane",
      "laws-blocker",
      "laws-plain-low",
      "laws-plain-s",
      "laws-waiter",
      "laws-waiter-2",
      "laws-plain-l",
      "laws-plain-high",
    ]);
  });
  it("puts what the player sees first: reds and checks, then Seen (play first), Feeds, Guards, the rest", () => {
    const rows = [
      row("laws-says-nothing", { priority: "1" }),
      row("laws-guards", { priority: "1", shown: "Guards:" }),
      row("laws-feeds", { priority: "1", shown: "Feeds:" }),
      row("laws-seen", { priority: "3", shown: "Seen:" }),
      row("play-seen-low", { priority: "3", shown: "Seen:", area: "play" }),
      row("gov-seen-by-screens", { shown: "Seen:", lead: "screens" }),
      row("play-says-nothing", { priority: "3", area: "play" }),
      row("gov-a-test-red-on-main", { priority: "3", shown: "Guards:" }),
      row("skills-a-skill", { priority: "3" }),
    ];
    expect([...rows].sort(makeOrder(rows, order)).map((r) => r.id)).toEqual([
      "skills-a-skill",
      "gov-a-test-red-on-main",
      "gov-seen-by-screens",
      "play-says-nothing",
      "play-seen-low",
      "laws-seen",
      "laws-feeds",
      "laws-guards",
      "laws-says-nothing",
    ]);
    // With no `visible` block the order is the old one: priority first.
    const plain = { ...order, visible: undefined };
    expect([...rows].sort(makeOrder(rows, plain)).map((r) => r.id)[0]).toBe(
      "laws-feeds",
    );
  });
  it("keeps the play-first lane's own order inside the stops-play class", () => {
    const lane = { milestone: "play-first" };
    const rows = [
      row("play-stop-22-x", { ...lane, effort: "low", size: "S" }),
      row("play-a-other", { ...lane, effort: "low", size: "S" }),
      row("play-stop-23-x", { ...lane, effort: "high", size: "L" }),
      row("play-stop-21-x", lane),
    ];
    expect([...rows].sort(makeOrder(rows, order)).map((r) => r.id)).toEqual([
      "play-stop-23-x",
      "play-stop-21-x",
      "play-stop-22-x",
      "play-a-other",
    ]);
  });
  it("reads the time box's first number of hours, 4 when none", () => {
    expect(timeBoxHours("3 hours for one Sonnet session.")).toBe(3);
    expect(timeBoxHours("1.5 hours; then 6 hours more")).toBe(1.5);
    expect(timeBoxHours("Until done.")).toBe(4);
    expect(timeBoxHours(undefined)).toBe(4);
  });
});

describe("claimable", () => {
  const known = new Set(["laws-a", "laws-b", "laws-x"]);
  const onMain = new Set(["laws-a"]);
  const ok = (o: Partial<Row>): boolean =>
    claimable(
      {
        id: "laws-x",
        status: "open",
        priority: "2",
        checked: "fable 2026-11-10",
        "waits-on": "Nothing.",
        ...o,
      },
      onMain,
      known,
    );
  it("takes an open, checked item that waits on nothing or only on items on main", () => {
    expect(ok({})).toBe(true);
    expect(ok({ "waits-on": "Nothing to start. Read the parent first." })).toBe(
      true,
    );
    expect(ok({ "waits-on": "laws-a." })).toBe(true);
    expect(ok({ "waits-on": "laws-a (done)." })).toBe(true);
    expect(ok({ after: "laws-a" })).toBe(true);
  });
  it("refuses a Waits on naming an unmerged item, anything that is not an item, an unchecked item, a needs-cause item and a closed gate", () => {
    expect(ok({ "waits-on": "laws-b." })).toBe(false);
    expect(ok({ "waits-on": "laws-a and laws-b." })).toBe(false);
    expect(ok({ "waits-on": "The owner's decision on busts." })).toBe(false);
    expect(ok({ "waits-on": "laws-a and early-access preparation." })).toBe(
      false,
    );
    expect(ok({ "waits-on": "" })).toBe(false);
    expect(ok({ checked: "" })).toBe(false);
    expect(ok({ checked: "opus 2026-11-10" })).toBe(false);
    expect(ok({ "needs-cause": "1" })).toBe(false);
    expect(ok({ after: "laws-b" })).toBe(false);
    expect(ok({ status: "claimed" })).toBe(false);
  });
});

describe("next --dry-run by level", () => {
  const items = {
    "laws-h": unit("laws-h", { model: "haiku" }),
    "laws-s": unit("laws-s", { model: "sonnet" }),
    "laws-o": unit("laws-o", { model: "opus" }),
    "laws-f": unit("laws-f", { model: "fable", priority: "1" }),
    "laws-s-waits": unit("laws-s-waits", {
      model: "sonnet",
      priority: "1",
      waits: "laws-o.",
    }),
    "laws-s-cause": unit("laws-s-cause", {
      model: "sonnet",
      priority: "1",
      cause: "Needs cause. Nothing was looked at yet.",
      extra: "",
    }),
    "laws-s-unchecked": unit("laws-s-unchecked", {
      model: "sonnet",
      priority: "1",
      checked: "",
    }),
  };
  it("names an item at the caller's level first, a lower one when none, and never one above", () => {
    const { clones } = world(items);
    const [a] = clones;
    const head = git(a, "rev-parse", "HEAD");
    const take = (model: string): string =>
      line(pool(a, ["next", "--model", model, "--dry-run"]).out, "Would take:");
    expect(take("sonnet")).toBe("Would take: laws-s (sonnet, p3)");
    expect(take("opus")).toBe("Would take: laws-o (opus, p3)");
    expect(take("haiku")).toBe("Would take: laws-h (haiku, p3)");
    expect(take("fable")).toBe("Would take: laws-f (fable, p1)");
    const dry = pool(a, ["next", "--model", "sonnet", "--dry-run"]);
    expect(dry.err).toBeNull();
    expect(dry.out).toContain("Branch: pool/laws-s");
    expect(dry.out).toContain("Dry run: nothing was changed.");
    expect(git(a, "rev-parse", "HEAD")).toBe(head);
    expect(git(a, "status", "--porcelain")).toBe("");
    // The older flag still takes a level, and a tier by its own name.
    expect(
      line(pool(a, ["next", "--tier", "top", "--dry-run"]).out, "Would take:"),
    ).toBe("Would take: laws-o (opus, p3)");
    const bad = pool(a, ["next", "--tier", "gpt", "--dry-run"]).err;
    expect(bad).toMatch(/^usage: pool next \[--as/);
    expect(bad).toContain("The tiers are light, mid, top, lead.");
  });
  it("says so and succeeds when nothing is ready at or below the level", () => {
    const { clones } = world({ "laws-o": unit("laws-o", { model: "opus" }) });
    const r = pool(clones[0], ["next", "--model", "sonnet", "--dry-run"]);
    expect(r.err).toBeNull();
    expect(r.out.slice(1)).toEqual([
      "No item is ready for tier mid or any tier below it.",
    ]);
  });
});

describe("next --for <kind>", () => {
  // laws-top is first in the order (priority 1) but is not play work.
  const items = {
    "laws-top": unit("laws-top", { priority: "1" }),
    "play-area": unit("play-area", { area: "play", lead: "laws" }),
    "play-lead": unit("play-lead", { area: "laws", lead: "screens" }),
  };
  const take = (dir: string, extra: string[]): string =>
    line(pool(dir, ["next", "--dry-run", ...extra]).out, "Would take:");
  it("plain next takes the first item, which is play work since what the player sees leads; --for play takes the first play item, by area or by lead", () => {
    const { clones } = world(items);
    // The play item is priority 3 and the laws item priority 1: visible work leads (owner, Nov 11).
    expect(take(clones[0], [])).toBe("Would take: play-area (sonnet, p3)");
    expect(take(world({ "laws-top": items["laws-top"] }).clones[0], [])).toBe(
      "Would take: laws-top (sonnet, p1)",
    );
    expect(take(clones[0], ["--for", "play"])).toBe(
      "Would take: play-area (sonnet, p3)",
    );
    const lead = world({
      "laws-top": items["laws-top"],
      "play-lead": items["play-lead"],
    });
    expect(take(lead.clones[0], ["--for", "play"])).toBe(
      "Would take: play-lead (sonnet, p3)",
    );
    expect(
      inKind(
        { id: "x", status: "open", priority: "3", lead: "screens" },
        readOrder(join(ROOT, "docs/pool")).kinds.play,
      ),
    ).toBe(true);
  });
  it("hands out no new item while the cap is on, except what still comes first", () => {
    const withCheck = {
      ...items,
      "tests-a-check": unit("tests-a-check", { area: "laws", priority: "3" }),
    };
    const run = (set: typeof withCheck | typeof items, open: number | null) => {
      const { clones } = world(set);
      const out: string[] = [];
      const said: string[] = [];
      const cwd = process.cwd();
      process.chdir(clones[0]);
      try {
        const err = command(
          ["next", "--dry-run"],
          {},
          {
            out: (l) => out.push(l),
            progress: (l) => said.push(l),
            openGame: () => open,
          },
        );
        return { err, out, said };
      } finally {
        process.chdir(cwd);
      }
    };
    const most = readOrder(join(ROOT, "docs/pool")).cap!.openGamePullRequests;
    // Over the cap with only game items: nothing is taken, and the line says why.
    const over = run(items, most + 1);
    expect(over.err).toBeNull();
    expect(line(over.out, "The cap is on:")).toContain(`${most + 1} game`);
    expect(line(over.out, "Would take:")).toBe("");
    expect(over.out).toContain(
      "Nothing that comes before the cap is ready for your tier.",
    );
    // Over the cap, a check is still handed out.
    expect(line(run(withCheck, most + 1).out, "Would take:")).toBe(
      "Would take: tests-a-check (sonnet, p3)",
    );
    // At the cap, and when the count cannot be read, items are handed out as before.
    expect(line(run(items, most).out, "Would take:")).toBe(
      "Would take: play-area (sonnet, p3)",
    );
    const blind = run(items, null);
    expect(line(blind.out, "Would take:")).toBe(
      "Would take: play-area (sonnet, p3)",
    );
    expect(blind.said).toContain(
      "Could not count the open pull requests, so the cap was not checked.",
    );
  });
  it("claims the play item for real, and leaves the higher one for plain next", () => {
    fakeGh(null);
    const { clones, onOrigin } = world(items);
    const r = pool(clones[0], ["next", "--for", "play"]);
    expect(r.err).toBeNull();
    expect(r.out[1]).toBe("Item: play-area");
    expect(onOrigin("main", `${ITEM}/play-area.md`)).toContain(
      "status: claimed",
    );
    expect(onOrigin("main", `${ITEM}/laws-top.md`)).toContain("status: open");
  });
  it("an unknown kind is an error that names the kinds order.json has", () => {
    const { clones } = world(items);
    const r = pool(clones[0], ["next", "--for", "nonsense", "--dry-run"]);
    expect(r.err).toContain('No kind of work is called "nonsense"');
    expect(r.err).toContain("The kinds are play");
  });
  it("takes nothing and says so when no item of the kind is left, never falling back", () => {
    const { clones } = world({ "laws-top": items["laws-top"] });
    const r = pool(clones[0], ["next", "--for", "play", "--dry-run"]);
    expect(r.err).toBeNull();
    expect(r.out.slice(1)).toEqual([
      "No play item is left for your tier (mid) or any tier below it.",
    ]);
    expect(line(r.out, "Would take:")).toBe("");
  });
});

describe("next for real", () => {
  it("claims on main, starts the branch with the placeholder note, writes the body, and release keeps the branch", () => {
    const gh = fakeGh(null);
    const { clones, onOrigin } = world({
      "laws-h": unit("laws-h", { model: "haiku" }),
      "laws-s": unit("laws-s", { model: "sonnet" }),
    });
    const [a] = clones;
    const r = pool(a, ["next", "--model", "haiku", "--agent", "check"]);
    expect(r.err).toBeNull();
    expect(r.out[0]).toBe("You are check, tier light.");
    expect(r.out[1]).toBe("Item: laws-h");
    expect(r.out).toContain("Title: Title of laws-h");
    expect(r.out).toContain("File: docs/pool/items/laws-h.md");
    expect(line(r.out, "Branch:")).toMatch(/^Branch: pool\/laws-h \(to start/);
    expect(line(r.out, "Pull request:")).toMatch(
      /^Pull request: not opened; gh could not open it/,
    );
    expect(r.out).toContain("Pull request title: laws-h: Title of laws-h");
    expect(r.out.some((l) => l.startsWith("continue"))).toBe(false);
    expect(readFileSync(gh, "utf8")).toMatch(
      /^pr create --draft --head pool\/laws-h --base main --title laws-h: Title of laws-h --body-file /,
    );
    // The claim is on main, with the branch and the agent's line.
    const claimed = onOrigin("main", `${ITEM}/laws-h.md`);
    expect(claimed).toContain("status: claimed");
    expect(claimed).toContain("claimed-by: pool/laws-h");
    expect(claimed).toContain("branch: pool/laws-h");
    expect(claimed).toMatch(
      /Claimed by next for check \(.+ UTC\) on branch pool\/laws-h\./,
    );
    expect(onOrigin("main", "docs/pool/INDEX.md")).toContain("1 claimed");
    // The branch holds one commit: the release note's placeholder.
    expect(onOrigin("pool/laws-h", "docs/release/changes/laws-h.md")).toBe(
      `---\nid: laws-h\nimpact: none\n---\n\n${NOTE_PLACEHOLDER}`,
    );
    // The body file: line 1, the gate line, one Done when row per sentence, the item, the thread rules.
    const body = readFileSync(
      line(r.out, "Pull request body file:").split(": ")[1],
      "utf8",
    );
    const lines = body.split("\n");
    expect(lines[0]).toBe("Pool item: laws-h");
    expect(lines[2]).toMatch(/^Checks \(changed files\): </);
    expect(body).toContain(
      "| A second session runs it in a drawn place and sees the price move. | |\n| The test in tests/x.test.ts passes. | |",
    );
    expect(body).toContain("## The item as claimed");
    expect(body).toContain("**Cause.** Found in code: src/x.ts:1");
    expect(body).toContain("**Waits on.** Nothing.");
    expect(body).toContain("## How this pull request is used");
    expect(body).toContain(
      "`Ready for the desk:` followed by the head commit's hash",
    );
    expect(body).toContain("never on issue 7365");
    for (const rule of [
      "Progress",
      "Questions",
      "Ready",
      "Send-backs",
      "Handoff",
      "Stale claims",
    ])
      expect(body).toContain(`- **${rule}.**`);
    // in-pr is refused while the note is the placeholder.
    expect(pool(a, ["status", "laws-h", "in-pr", "--pr", "5"]).err).toMatch(
      /still says "Not written yet/,
    );
    // release sets it open and keeps the branch, with the reason in Notes.
    expect(pool(a, ["release", "laws-h"]).err).toMatch(/^usage: pool release/);
    expect(
      pool(a, [
        "release",
        "laws-h",
        "--reason",
        "The cause did not match the code.",
      ]).err,
    ).toBeNull();
    const back = onOrigin("main", `${ITEM}/laws-h.md`);
    expect(back).toContain("status: open");
    expect(back).toMatch(/^claimed-by:$/m);
    expect(back).toContain("branch: pool/laws-h");
    expect(back).toMatch(
      /Released \(\d{4}-\d\d-\d\d\): The cause did not match the code\. Continue on branch pool\/laws-h\./,
    );
    expect(pool(a, ["release", "laws-h", "--reason", "Again."]).err).toBe(
      "laws-h is open, not claimed",
    );
  });

  it("records the draft's number when gh opens it, and lets in-pr through once the note is written", () => {
    fakeGh("https://github.com/o/r/pull/77");
    const { clones, onOrigin } = world({
      "laws-h": unit("laws-h", { model: "haiku" }),
    });
    const [a] = clones;
    const r = pool(a, [
      "next",
      "--model",
      "sonnet",
      "--branch-prefix",
      "claude/pool-",
    ]);
    expect(r.err).toBeNull();
    expect(r.out).toContain("Pull request: #77 (draft)");
    const text = onOrigin("main", `${ITEM}/laws-h.md`);
    expect(text).toContain("pr: #77");
    expect(text).toContain("claimed-by: claude/pool-laws-h");
    // The builder writes the note on the branch; in-pr then goes through.
    git(a, "fetch", "-q", "origin", "claude/pool-laws-h");
    git(
      a,
      "checkout",
      "-q",
      "-B",
      "claude/pool-laws-h",
      "origin/claude/pool-laws-h",
    );
    writeFileSync(
      join(a, "docs/release/changes/laws-h.md"),
      "---\nid: laws-h\nimpact: none\n---\n\nThe pool tool change.\n",
    );
    git(a, "commit", "-qam", "laws-h: the release note");
    git(a, "push", "-q", "origin", "claude/pool-laws-h");
    git(a, "checkout", "-q", "main");
    expect(pool(a, ["status", "laws-h", "in-pr", "--pr", "77"]).err).toBeNull();
    expect(onOrigin("main", `${ITEM}/laws-h.md`)).toContain("status: in-pr");
  });

  it("starts the note under a free id: the item's own when free, -2 when main already used it", () => {
    fakeGh(null);
    const { clones, onOrigin } = world({
      "laws-h": unit("laws-h", { model: "haiku" }),
      "laws-k": unit("laws-k", { model: "haiku", priority: "2" }),
    });
    const [a] = clones;
    // main has released laws-h before (a sent-back item): listed in consumed-changes.json.
    mkdirSync(join(a, "docs/release"), { recursive: true });
    writeFileSync(
      join(a, "docs/release/consumed-changes.json"),
      JSON.stringify({ entries: [{ changeIds: ["laws-h"] }] }),
    );
    git(a, "add", ".");
    git(a, "commit", "-qm", "consumed");
    git(a, "push", "-q", "origin", "main");
    // laws-k has priority 2 so it is offered first: its id is free.
    const first = pool(a, ["next", "--model", "haiku", "--agent", "x"]);
    expect(first.err).toBeNull();
    expect(first.out).toContain("Release note: docs/release/changes/laws-k.md");
    // laws-h's id is used: the note is laws-h-2, in both its path and its id line.
    const second = pool(a, ["next", "--model", "haiku", "--agent", "x"]);
    expect(second.err).toBeNull();
    expect(second.out).toContain(
      "Release note: docs/release/changes/laws-h-2.md",
    );
    expect(onOrigin("pool/laws-h", "docs/release/changes/laws-h-2.md")).toBe(
      `---\nid: laws-h-2\nimpact: none\n---\n\n${NOTE_PLACEHOLDER}`,
    );
    // The guard finds the note by scanning the branch, so it refuses while laws-h-2 holds the placeholder.
    expect(pool(a, ["status", "laws-h", "in-pr", "--pr", "5"]).err).toMatch(
      /changes\/laws-h-2\.md on pool\/laws-h still says "Not written yet/,
    );
  });

  it("asks whether a recorded pull request is open and opens a new draft when it is closed", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-gh-"));
    const script = join(dir, "gh");
    writeFileSync(
      script,
      `#!/bin/sh\nif [ "$2" = view ]; then echo '{"state":"CLOSED"}'; else echo https://github.com/o/r/pull/90; fi\n`,
    );
    chmodSync(script, 0o755);
    process.env.PATH = `${dir}:${savedPath}`;
    const { clones, onOrigin } = world({
      "laws-h": unit("laws-h", { model: "haiku" }),
    });
    const [a] = clones;
    const item = readFileSync(join(a, `${ITEM}/laws-h.md`), "utf8").replace(
      /^pr:$/m,
      "pr: #55",
    );
    writeFileSync(join(a, `${ITEM}/laws-h.md`), item);
    git(a, "add", ".");
    git(a, "commit", "-qm", "pr");
    git(a, "push", "-q", "origin", "main");
    const r = pool(a, ["next", "--model", "haiku", "--agent", "x"]);
    expect(r.err).toBeNull();
    expect(r.out).toContain("Pull request #55 is closed; opening a new draft.");
    expect(r.out).toContain("Pull request: #90 (draft)");
    expect(onOrigin("main", `${ITEM}/laws-h.md`)).toContain("pr: #90");
  });

  it("two callers racing for one item end with two different items", () => {
    fakeGh(null);
    const { clones, onOrigin } = world(
      {
        "laws-1": unit("laws-1", { priority: "1" }),
        "laws-2": unit("laws-2", { priority: "2" }),
      },
      { clones: 2 },
    );
    const [a, b] = clones;
    let raced = false;
    let first: { err: string | null; out: string[] } | null = null;
    // B picks laws-1 from main; before its push lands, A takes laws-1 first.
    const second = pool(
      b,
      ["next", "--model", "sonnet", "--agent", "b"],
      () => {
        if (raced) return;
        raced = true;
        first = pool(a, ["next", "--model", "sonnet", "--agent", "a"]);
      },
    );
    expect(raced).toBe(true);
    expect(first!.err).toBeNull();
    expect(first!.out[1]).toBe("Item: laws-1");
    expect(second.err).toBeNull();
    expect(second.out[1]).toBe("Item: laws-2");
    expect(onOrigin("main", `${ITEM}/laws-1.md`)).toContain(
      "Claimed by next for a ",
    );
    expect(onOrigin("main", `${ITEM}/laws-2.md`)).toContain(
      "Claimed by next for b ",
    );
  });

  it("releases a claim quiet for twice its time box and offers it as continue; a fresh or recently pushed claim stays", () => {
    fakeGh(null);
    const old = "2026-01-01T00:00:00.000Z";
    const recent = new Date(Date.now() - 3600 * 1000).toISOString();
    const { origin, clones, onOrigin } = world(
      {
        "laws-quiet": unit("laws-quiet", {
          priority: "1",
          status: "claimed",
          claimedBy: "lane/quiet",
          extra: `claimed-at: ${old}`,
        }),
        "laws-pushed": unit("laws-pushed", {
          status: "claimed",
          claimedBy: "lane/pushed",
          extra: `claimed-at: ${old}`,
        }),
        "laws-fresh": unit("laws-fresh", {
          status: "claimed",
          claimedBy: "lane/fresh",
          extra: `claimed-at: ${recent}`,
        }),
        "laws-nobranch": unit("laws-nobranch", {
          status: "claimed",
          claimedBy: "lane/none",
          box: "Until it is done.",
          extra: `claimed-at: ${old}`,
        }),
        "laws-other": unit("laws-other"),
      },
      { branches: { "lane/quiet": old, "lane/pushed": recent } },
    );
    const [a] = clones;
    const dry2 = pool(a, ["next", "--model", "sonnet", "--dry-run"]);
    expect(
      dry2.out
        .filter((l) => l.startsWith("Would release"))
        .map((l) => l.split(":")[0]),
    ).toEqual(["Would release laws-nobranch", "Would release laws-quiet"]);
    expect(dry2.out).toContain("Would take: laws-quiet (sonnet, p1)");
    expect(dry2.out).toContain("continue: another agent started this item.");
    const r = pool(a, ["next", "--model", "sonnet"]);
    expect(r.err).toBeNull();
    expect(r.out[1]).toMatch(
      /^Released laws-nobranch: no push to lane\/none since 2026-01-01 00:00 UTC, more than twice its 4-hour time box\.$/,
    );
    expect(r.out[2]).toMatch(
      /^Released laws-quiet: no push to lane\/quiet since 2026-01-01 00:00 UTC, more than twice its 3-hour time box\.$/,
    );
    expect(line(r.out, "Item:")).toBe("Item: laws-quiet");
    expect(line(r.out, "Branch:")).toMatch(/^Branch: lane\/quiet /);
    expect(r.out[r.out.length - 1]).toMatch(
      /^continue: another agent started this item/,
    );
    const quiet = onOrigin("main", `${ITEM}/laws-quiet.md`);
    expect(quiet).toContain("status: claimed");
    expect(quiet).toContain("branch: lane/quiet");
    expect(quiet).toMatch(
      /Released by next \(\d{4}-\d\d-\d\d\): no push to lane\/quiet since 2026-01-01 00:00 UTC, more than twice its 3-hour time box\. Continue on branch lane\/quiet\./,
    );
    // The quiet branch was kept as it was: no release note commit was added.
    expect(git(origin, "log", "--format=%s", "lane/quiet")).toBe(
      "work on lane/quiet\ninit",
    );
    for (const id of ["laws-pushed", "laws-fresh"])
      expect(onOrigin("main", `${ITEM}/${id}.md`)).toContain("status: claimed");
    const nobranch = onOrigin("main", `${ITEM}/laws-nobranch.md`);
    expect(nobranch).toContain("status: open");
    expect(nobranch).toContain("branch: lane/none");
  });
});

describe("claim --pr, branch and flags", () => {
  it("claim records --pr on a claim the same branch holds, and an old-style claim stays valid", () => {
    const { clones, onOrigin } = world({ "laws-a": unit("laws-a") });
    const [a] = clones;
    expect(
      pool(a, ["claim", "laws-a", "--branch", "any/branch"]).err,
    ).toBeNull();
    let text = onOrigin("main", `${ITEM}/laws-a.md`);
    expect(text).toContain("claimed-by: any/branch");
    expect(text).not.toMatch(/^branch:/m);
    expect(
      pool(a, ["claim", "laws-a", "--branch", "any/branch", "--pr", "41"]).err,
    ).toBeNull();
    text = onOrigin("main", `${ITEM}/laws-a.md`);
    expect(text).toContain("pr: #41");
    expect(
      pool(a, ["claim", "laws-a", "--branch", "other", "--pr", "42"]).err,
    ).toMatch(/already claimed by any\/branch/);
  });
  it("validate accepts branch and refuses one that is not a branch name", () => {
    const fm = {
      id: "laws-a",
      title: "t",
      area: "laws",
      kind: "bug",
      priority: "1",
      status: "open",
    };
    expect(
      validate("laws-a.md", { ...fm, branch: "claude/pool-laws-a" }),
    ).toEqual([]);
    expect(
      validate("laws-a.md", { ...fm, branch: "two words" }).join(),
    ).toMatch(/is not a branch name/);
    expect(validate("laws-a.md", { ...fm, branch: "-x" }).join()).toMatch(
      /is not a branch name/,
    );
  });
  it("--dry-run and --no-pr take no value", () => {
    const { f } = flags(
      ["next", "--dry-run", "--model", "opus", "--no-pr"],
      {},
    );
    expect(f).toEqual({ "dry-run": "1", model: "opus", "no-pr": "1" });
  });
});

describe("the index's Ready by model", () => {
  it("counts the claimable items at each level and lists them in the order", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-ready-"));
    mkdirSync(join(dir, "items"));
    copyFileSync(join(ROOT, "docs/pool/order.json"), join(dir, "order.json"));
    const put = (id: string, o: Unit): void =>
      writeFileSync(join(dir, "items", `${id}.md`), unit(id, o));
    put("laws-s1", { model: "sonnet", size: "L" });
    put("laws-s2", { model: "sonnet", size: "S" });
    put("tests-s3", { model: "sonnet", size: "L" });
    put("laws-o1", { model: "opus" });
    put("laws-o-waits", { model: "opus", waits: "laws-s1." });
    put("laws-h-unchecked", { model: "haiku", checked: "" });
    expect(run(dir, false).errors).toEqual([]);
    const index = readFileSync(join(dir, "INDEX.md"), "utf8");
    const ready = index.split("## Ready by model")[1].split("\n## ")[0];
    expect(ready).toContain(
      "**haiku:** 0, **sonnet:** 3, **opus:** 1, **fable:** 0.",
    );
    expect(ready).toContain("### haiku (0)\n\nNone.");
    const sonnet = ready.split("### sonnet (3)")[1].split("###")[0];
    expect(sonnet.indexOf("tests-s3")).toBeLessThan(sonnet.indexOf("laws-s1"));
    // laws-s1 comes before the smaller laws-s2: an item waits on it.
    expect(sonnet.indexOf("laws-s1")).toBeLessThan(sonnet.indexOf("laws-s2"));
    expect(ready.split("### opus (1)")[1]).toContain(
      "1. [laws-o1](items/laws-o1.md) (laws, p3, medium, M) — Title of laws-o1",
    );
    expect(ready).not.toContain("laws-o-waits");
    // The counts match a count taken from the item files.
    const { items } = run(dir, true, new Set(), { staleCheck: false });
    const onMain = new Set<string>();
    const known = new Set(items.map((i) => i.id));
    const count = (m: string): number =>
      items.filter((i) => i.model === m && claimable(i, onMain, known)).length;
    expect([count("haiku"), count("sonnet"), count("opus")]).toEqual([0, 3, 1]);
  });
});

describe("the draft body's pieces", () => {
  it("splits Done when into sentences and fills the template's table", () => {
    expect(
      sentences("One thing. Then `a test` passes! (And more.) Done"),
    ).toEqual(["One thing.", "Then `a test` passes!", "(And more.) Done"]);
    const template = readFileSync(
      join(ROOT, ".github/PULL_REQUEST_TEMPLATE.md"),
      "utf8",
    );
    const start = readFileSync(
      join(ROOT, "docs/pool/START-A-BUILDER.md"),
      "utf8",
    );
    const body = prBody("laws-a", unit("laws-a"), template, start);
    expect(body).not.toContain("| <line>");
    expect(body.split("\n")[0]).toBe("Pool item: laws-a");
    expect(existsSync(join(ROOT, "docs/pool/START-A-BUILDER.md"))).toBe(true);
  });
});

describe("staleClaims", () => {
  it("leaves a claim with no claim time and no branch alone", () => {
    const i = {
      id: "laws-a",
      status: "claimed",
      "claimed-by": "",
      "time-box": "3 hours",
    } as unknown as Item;
    expect(staleClaims([i], Date.now(), () => null)).toEqual([]);
  });
});

describe("an agent names itself and takes its own tier", () => {
  const tiers = readTiers(join(ROOT, "docs/pool"));
  it("finds the tier from what the agent says it is, by whole words, and mid when it is unknown", () => {
    const tier = (as: string): string => tierOf(as, tiers).tier;
    expect(tier("Claude Opus 5.5 in Claude Code")).toBe("top");
    expect(tier("claude-sonnet-5-5")).toBe("mid");
    expect(tier("Claude Haiku 5.5")).toBe("light");
    expect(tier("Claude Fable 5.2")).toBe("lead");
    expect(tier("gpt-5-mini in Codex")).toBe("light");
    expect(tier("GPT-5 Codex")).toBe("mid");
    // "gemini" holds the letters of "mini" and is not the small model.
    expect(tier("Gemini 3 Pro in Antigravity")).toBe("mid");
    expect(tier("Gemini 3 Flash")).toBe("light");
    expect(tier("Muse")).toBe("mid");
    expect(tier("something nobody has heard of")).toBe("mid");
    expect(tier("")).toBe("mid");
    expect(tierOf("Claude Opus 5.5", tiers).label).toBe("opus");
    expect(tierOf("", tiers).label).toBe("agent");
    // Every tier names a level of the order, weakest first.
    const order = readOrder(join(ROOT, "docs/pool"));
    expect(tiers.tiers.map((x) => x.level)).toEqual(order.levels);
    for (const row of tiers.models)
      expect(tiers.tiers.map((x) => x.name)).toContain(row.tier);
  });
  it("keeps one name for a checkout, gives two checkouts different names, and renames when the agent says it is something else", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-agent-"));
    const a = join(dir, "a.json");
    const b = join(dir, "b.json");
    const first = identify("Claude Sonnet 5.5", tiers, a, 0);
    expect(first.fresh).toBe(true);
    expect(first.name).toMatch(/^sonnet-[0-9a-f]{4}$/);
    expect(identify("", tiers, a, 0)).toMatchObject({
      name: first.name,
      tier: "mid",
      fresh: false,
    });
    expect(identify("Claude Sonnet 5.5", tiers, a, 0).name).toBe(first.name);
    expect(identify("Claude Sonnet 5.5", tiers, b, 0).name).not.toBe(
      first.name,
    );
    const again = identify("Claude Opus 5.5", tiers, a, 0);
    expect(again.tier).toBe("top");
    expect(again.name).toMatch(/^opus-/);
    // A dry run leaves the checkout as it was.
    const c = join(dir, "c.json");
    expect(identify("Muse", tiers, c, 0, false).name).toMatch(/^muse-/);
    expect(existsSync(c)).toBe(false);
  });
  it("finds a Claude cloud session's branch prefix without being told", () => {
    expect(branchPrefix(undefined, {})).toBe("pool/");
    expect(branchPrefix(undefined, { CLAUDE_CODE_REMOTE: "true" })).toBe(
      "claude/pool-",
    );
    expect(branchPrefix(undefined, { POOL_BRANCH_PREFIX: "codex/" })).toBe(
      "codex/",
    );
    expect(branchPrefix("mine/", { CLAUDE_CODE_REMOTE: "true" })).toBe("mine/");
  });
  it("next with nothing typed takes a mid item, and after a check-in as a top model takes a top item and files its card with the claim", () => {
    fakeGh(null);
    const { clones, onOrigin } = world({
      "laws-s": unit("laws-s", { model: "sonnet" }),
      "laws-o": unit("laws-o", { model: "opus" }),
      "laws-o2": unit("laws-o2", { model: "opus" }),
    });
    const [a, b] = [clones[0], clones[0]];
    const plain = pool(a, ["next"]);
    expect(plain.err).toBeNull();
    expect(plain.out[0]).toMatch(/^You are agent-[0-9a-f]{4}, tier mid\.$/);
    expect(plain.out[1]).toBe("Item: laws-s");
    const name = /^You are (\S+),/.exec(plain.out[0])![1];
    expect(onOrigin("main", `${ITEM}/laws-s.md`)).toContain(
      `Claimed by next for ${name} (tier mid)`,
    );
    expect(
      JSON.parse(onOrigin("main", `docs/pool/agents/${name}.json`)),
    ).toMatchObject({
      name,
      tier: "mid",
      as: "",
    });
    const said = pool(b, [
      "check-in",
      "--as",
      "Claude Opus 5.5 in Claude Code",
    ]);
    expect(said.out[0]).toMatch(
      /^You are opus-[0-9a-f]{4}, tier top \(Claude Opus 5\.5 in Claude Code\)\.$/,
    );
    const top = pool(b, ["next"]);
    expect(top.out[0]).toBe(said.out[0]);
    expect(top.out[1]).toBe("Item: laws-o");
    const opus = /^You are (\S+),/.exec(top.out[0])![1];
    expect(onOrigin("main", `${ITEM}/laws-o.md`)).toContain(
      `Claimed by next for ${opus} (Claude Opus 5.5 in Claude Code, tier top)`,
    );
    expect(onOrigin("main", `docs/pool/agents/${opus}.json`)).toContain(
      '"tier": "top"',
    );
    // The same agent's next claim files no second card.
    expect(pool(b, ["next"]).out[1]).toBe("Item: laws-o2");
    expect(
      git(
        clones[0],
        "ls-tree",
        "--name-only",
        "origin/main",
        "docs/pool/agents/",
      )
        .split("\n")
        .filter(Boolean).length,
    ).toBe(2);
  });
});
