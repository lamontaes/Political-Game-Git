---
id: tests-state-sessions-draws-its-place-and-plays-a-year
title: "state-sessions.test.ts draws its place by a replay seed and plays a whole year (96 s of 83 s tests at one drawn place)"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: "F5 carry #9317 check, Nov 15"
claimed-at:
checked:
---

**What.** `src/core2/state-sessions.test.ts` takes its place from `drawPlace(replay, "state-sessions")` with a random replay seed unless `GOLDEN_PATH_SEED` is set, so the place and the time change from run to run. Pin it to one small named place and seed and keep what it asserts. Guards: the proof that other states' sessions change the law in force.

**Cause.** Measured: `npx vitest run src/core2/state-sessions.test.ts` on the train at 15b289d4 in this container ran 97 s wall (83 s of tests) at the place its draw gave, and 154 s (140 s of tests) at another draw on the same code; the test plays `advanceCore` 365 days at the drawn place. Found in code: `const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex")` and `drawPlace(replay, ...)` at the top of the file. A year at Edmore, North Dakota (place key 3822340, seed yrseed-3822340) ran in 28 s in the same container.

**Fix.** Design: name one small place and seed in the test (a place whose state passes laws in the played year, picked by looking, not by a draw loop), say in the test title why that one, and set the timeout to about twice the measured time.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and set the state honestly with a one-line note.

**Rules.** Pinned tests (named place, fixed seed, explicit timeout, no draw loops). Never loosen an assertion.

**Done when.** A second session, on main, runs the test and sees it pass at its named place and seed in under two minutes with the same assertions (other states' laws change with a count, and nothing lands in the town), and its title names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/state-sessions.test.ts

**Notes.** Filed by F5 on #9317; coordinator's call: file, do not pin inside that PR.
