---
id: tests-concession-reported-refuse-draws-unprinted
title: "concession-reported runs out of draws: the paper does not print half the races that reach a concession call, and the runner-up is often not a filer the test made"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (Fable A's red at GOLDEN_PATH_SEED=5bd22e2ff10867a4, taken on #8928)
---

**What.** `src/director/concession-reported.test.ts` fails on main at GOLDEN_PATH_SEED=5bd22e2ff10867a4 with "no drawn place told a refuse". The Red desk's test-side fix (draws read the race calendar on the first day and pass over a place with no race decided inside the year, unplayed, bounded at 16 places with a race and 64 draws) made the empty draws free, but on that seed all 16 refuse places that held a race still failed: 7 because the runner-up was not one of the town residents the test filed (Kootenai ID, Boston MA, Twin Bridges MT, Indian Beach NC, Granada CO, North Haverhill NH, County Center VA among them), and the rest because the race's story was never printed within ten days of the call (Trumbull Center CT, Convoy OH, Kahaluu HI, Passapatanzy VA, Portland CT, Kimball SD, Ideal GA). The agree half shows the same two reasons before it finds one place. Seen: a player who loses and takes the call sees no story in the paper about the race in about half the drawn places.

**Cause.** Measured: on the 37 refuse draws at that seed (run on main 48296b91 plus the calendar change), 16 held a race decided inside the year; 0 of them told a refusal; 9 were passed over for "the race was not printed" or "the runner-up is not a filer here". Not yet traced: why the press prints no `press.printed` story whose sourceRecordId is the race's `election-result:<contest>` in those places (src/core2/modules/press.ts, the story choice for a count), and whether the runner-up in the others is an incumbent or a candidate filed by the world.

**Fix.** Trace the press's story choice for an election result in two of the named places and either print every town race's result (if the paper's choice drops them without a cause) or have the test file the town's residents in a race where its filers are the field. Keep the calendar change from branch claude/red-main-concession-race-in-year (no assertion changes).

**Time box.** 3 hours

**Rules.** Ask why: each passed-over place names its reason by record, and no assertion is loosened, skipped or given a raised timeout.

**Done when.** A second session runs concession-reported.test.ts on main at GOLDEN_PATH_SEED=5bd22e2ff10867a4 and at a fresh seed, each naming its drawn places, and both the agree and the refuse halves print the concession line in the race's printed story.

**Waits on.** Nothing.

**Files.** src/director/concession-reported.test.ts, src/core2/modules/press.ts
