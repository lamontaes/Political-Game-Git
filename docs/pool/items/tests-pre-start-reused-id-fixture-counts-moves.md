---
id: tests-pre-start-reused-id-fixture-counts-moves
title: "The pre-start reused-id test counts a moves record the opening's people write, so it expects five ids and gets six"
area: release
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead T45, Nov 14 2026, red on the clean train 998ba95bf5 and on #9084 alike
---

**What.** `src/core2/pre-start.test.ts`, "keeps writing after the run's writer reuses an id written for someone filled in during it, as before", expects the history to hold exactly `later-b, run-a, twice, twice, later-a` and gets a sixth id, `person.moved-within:actor:3`. Seen: no player-visible effect; the test is red on the train on every run.

**Cause.** Measured: `npx vitest run src/core2/pre-start.test.ts` in the fixture world (`createLifeCore(piecesInput(), …)`), which builds no place, same result on the clean train 998ba95bf5 and on #9084. Found in code: the test reads the whole pre-start history (`preStartHistory(core)`), and the moves pass (src/core2/past-moves.ts) now writes a `person.moved-within` record for the fixture's people, so the list has a row the fixture did not write.

**Fix.** Read only the fixture's kind (`preStartHistory(core, { kind: "fixture.later" })`) in that assertion. The reuse check below it stays as it is.

**Time box.** 1 hour for one Sonnet session.

**Rules.** A test asserts what its fixture wrote, not what other passes write.

**Done when.** A second session runs pre-start.test.ts on main and sees the case pass; the fixture builds no place, so no drawn place applies, and the second session also runs the moves pass's own test in a drawn place, naming it, to see that the moved-within rows it no longer counts are still written.

**Waits on.** Nothing.

**Files.** src/core2/pre-start.test.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
