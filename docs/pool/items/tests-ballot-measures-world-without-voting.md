---
id: tests-ballot-measures-world-without-voting
title: "The ballot-measures test is red: its world has no voting engine, and a measure's count now reads the voting engine's registration rows"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 15 (seen while gating the counted-carry change)
---

**What.** The test "a real measure is decided by named voters and the rest of the state, and passing makes it law" in src/core2/ballot-measures.test.ts throws "Module has no registered state." when the measure is counted on Nov 3, 2026. Its world opens laws, offices, elections, campaigns and ballot measures, but not the voting engine. Since voter registration became a record (34f6a355, Nov 14), a measure's turnout reads each voter's registration from the voting engine's tables, so the count stops. Seen: Guards: the measure count's test, which no longer reaches the result it checks.

**Cause.** Found in code: `countMeasure` (src/core2/modules/ballot-measures.ts, line 200) calls `turnoutOn`, which calls `decideTurnout`, then `registrationReading` and `registrations` (src/core2/modules/voting.ts, lines 3436 to 3519), then `ensureKeptOff` (src/core2/electorate-registration.ts, line 219), which reads the voting engine's table. The test's world never opens that engine. Red on the train at 892427ec at `GOLDEN_PATH_SEED=views-measure-1` and at every seed tried, with or without the counted-carry change.

**Fix.** Open the voting engine in the test's world, as a played world has it, so the measure's turnout reads registrations the way the game does. Do not add a guard that counts a voter with no registration record as registered.

**Time box.** 1 hour, Sonnet at medium effort.

**Rules.** One model, two tiers: the measure's voters turn out by the one turnout rule, which reads their registration from the voting engine as the game does. Never loosen a test to get green, and never count a voter with no registration record as registered.

**Done when.** The test passes at `GOLDEN_PATH_SEED=views-measure-1` and at two other seeds named in the PR. A second session, on the train or main in a drawn place it names with its seed, sees a state measure decided on election night in dev mode.

**Waits on.** Nothing.

**Files.** src/core2/ballot-measures.test.ts

**Notes.** Nov 15 (views thread): found while gating the counted-carry change; the stack runs from `countMeasure` to `ensureKeptOff`.
