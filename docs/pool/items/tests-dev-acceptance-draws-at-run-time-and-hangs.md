---
id: tests-dev-acceptance-draws-at-run-time-and-hangs
title: "dev-acceptance.test.ts draws its place and seed at run time and hung past 1,300 seconds"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread, gating #9638 on Nov 16, 2026; filed on the Account lead's word
model: sonnet
effort: medium
root: none
---

**What.** src/bench/dev-acceptance.test.ts builds its one world from a random seed each run, so whether it passes, and how long it takes, depends on the draw. On the laws thread's gate for #9638 (head 59aee364) it ran for 1,307 seconds without finishing and was stopped. The seed was not kept, so the draw it hung on is unknown. A tester running dev mode's acceptance cannot tell a real fault from a slow or broken draw. Guards: dev mode's laws, bills and scenes routes, which a player in dev mode uses.

**Cause.** Found in code: src/bench/dev-acceptance.test.ts line 34, `const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex")`, followed by `buildBenchWorld(seed, gameStartDate(), { twoLevel: true })` with no place key. Its tests have limits of 120 to 900 seconds each (lines 125 to 378), adding up to more than an hour for the file, so a slow draw runs on instead of failing. The pinned-tests rule requires named places with fixed seeds.

**Fix.** Pin the file to named places and seeds found by a script outside the test (pinned-tests and drawn-place-tests skills): one place per case it needs, each named in the file's header, with its limit near twice its slower time alone or beside another test. Print the place and seed in every failure message. Then find the slow case. Run the old random draw about five times, recording each seed and time, so whatever made one draw run past 1,300 s is named, and file its own item if it is an engine fault.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the pinned places are drawn from all 56 by the script, never chosen by hand, and named with their seeds. Every effect can be triggered and traced in dev mode: this file is the check that dev mode's own routes work.

**Done when.** A second session runs dev-acceptance.test.ts twice on the Train head, and both runs pass within the file's limits. It also builds one place it draws itself from all 56 in dev mode and plays the routes the test checks there. The item's Notes give the times, the drawn place and the seeds tried.

**Waits on.** Nothing.

**Files.** src/bench/dev-acceptance.test.ts
