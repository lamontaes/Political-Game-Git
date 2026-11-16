---
id: tests-recall-world-built-without-office-day-data
title: "The recall test builds its town by hand without the office day's data, so opening the office day throws"
area: tests
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
root: none
claimed-by: civic-roles-builder
pr:
after:
blocked-on:
lead: m0-m2
source: "Account lead, Nov 16 00:17Z: red on the clean Train ef708196; traced by the civic roles builder"
model: sonnet
effort: low
---

**What.** `src/core2/recalls.test.ts` case "an ordinance can start a recall where the law allows one" fails with "Untagged numeric parameter: officeHoursIntervalDays" on the Train (ef708196, and already at 29ef4685), before it reaches the recall it checks. Seen: the test run only; a played world is built with the office day's data and does not throw.

**Cause.** Found in code: `openingActs` in src/core2/modules/office-day.ts (added by commit f41ec579, folded with #9472) reads each act's interval parameter when the office day opens. Those parameters exist only in data built by `officeDayData` (src/core2/office-day-acts.ts), which `buildBenchWorld` in src/bench/world.ts uses. The recall test builds its world by hand from `createLifeCore` with the default data and opens engines one by one, so it lacks the rows; giving it the rows next exposes the speech engine and the President's day missing, as the earlier item core-recall-test-world-lacks-world-legislating did for the lawmaking calendar. Only this test opens the office day on a hand-built world.

**Fix.** The case builds its town with `buildBenchWorld`, the played world's own builder, so every engine and its data come from the one place; the hand list of engines is deleted. `openOfficeDay` in src/core2/modules/office-day.ts refuses to open on data built without `officeDayData` and names the missing rows, so a hand-built world fails at the cause.

**Time box.** 1 hour, one Sonnet session at low effort.

**Rules.** One rule, all 56 places: the test still draws its state and town by seed from every state.

**Done when.** The recalls test file passes on the Train head, the ordinance case naming its drawn place, seed and recall record id; the case fails before the fix with the missing-rows message.

**Files.** src/core2/recalls.test.ts, src/core2/modules/office-day.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16.
