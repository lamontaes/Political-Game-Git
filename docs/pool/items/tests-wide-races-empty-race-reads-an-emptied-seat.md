---
id: tests-wide-races-empty-race-reads-an-emptied-seat
title: "wide-races: the empty-race case reads the House seat an earlier case emptied, and calls it a vacancy"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/long-game-mark-wide-races
pr:
after:
blocked-on:
root: none
lead: governing
model: fable
effort: medium
source: Long game lane, Nov 17 (one of the three cases in tests-wide-races-three-cases-red-on-train)
---

**What.** The wide-races test's empty-race case expects a House seat's holder to hold over, but in the whole file it reads "vacancy". Run alone, the same case passes. An earlier case in the file ends that seat's serving term and another moves the date, and the cases share one world.
Seen: Henlopen Acres, Delaware (1033900), seed pin-wr-0, by `npx vitest run src/core2/wide-races.test.ts`, "expected 'vacancy' to be 'holdover'".

**Cause.** Found in code: src/core2/wide-races.test.ts, the case "a vacant new congressional term uses its new end date" puts the House seat's serving term as ended, and "no winner does not remove a senator before the term boundary" sets `world.core.date` to the race's due date; neither puts the shared world back, so the empty-race case copies a House race whose seat has no holder, and `resolveEmptyRace` correctly reads a vacancy.

**Fix.** The two cases that change the world run inside `fromOpening`, which takes `snapshotWorld` before and `restoreWorld` after, so each later case reads the world as it opened. The player sees nothing: the engine was right.

**Time box.** 1 hour.

**Rules.** No dice: nothing here draws an outcome; the case reads the holdover rule the place's data names. One rule, all 56 places: the case reads `holdoverRule` for the drawn place's state, never a named state.

**Done when.** A second session runs `npx vitest run src/core2/wide-races.test.ts` in a drawn place, for example in a drawn place, Henlopen Acres, Delaware (seed pin-wr-0), and sees the empty-race case pass with the two cases before it in the same run.

**Waits on.** Nothing.

**Files.** src/core2/wide-races.test.ts
