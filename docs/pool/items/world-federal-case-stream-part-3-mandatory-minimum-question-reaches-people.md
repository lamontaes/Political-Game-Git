---
id: world-federal-case-stream-part-3-mandatory-minimum-question-reaches-people
title: "Enacting reduce-mandatory-minimums shortens sentences and lowers the federal population"
area: world
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-federal-case-stream-part-2-cases-through-the-justice-engine
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: split from world-federal-case-stream in the pool redo, Nov 10, 2026
---

**What.** The question us-federal-positions:justice-rights.reduce-mandatory-minimums reaches nobody today (law-wiring reach 0, Butte, Alaska, seed 3d8e41c7a09b25f6). With federal cases in the justice engine, a mandatory-minimum floor must be a rule the question can lower: once enacted through a real bill, sentences for the affected offenses shorten and the federal prison population falls over the lag.

**Cause.** Measured: the law-wiring reach of us-federal-positions:justice-rights.reduce-mandatory-minimums is 0 in Butte, Alaska, seed 3d8e41c7a09b25f6 (item, Nov 8 night, Dev Tester); there are no federal cases for it to shorten (src/core2/modules/justice.ts).

**Fix.** Make the mandatory-minimum floor a law-in-force read by the justice engine when it sets a federal sentence, so enacting the question lowers the floor, shortens sentences and releases people over the lag; the stopgap row for this question is closed.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the justice engine reads the law in force when it sets a sentence. The chain is the acceptance: the bill, the law in force, the sentence, the person it reached, by record id. No dice. Ask why: a shortened sentence cites the question and the bill.

**Done when.** A second session (not the builder) plays twin worlds in a drawn place (names and seeds in the PR body), one with the question enacted through a real bill, and sees sentences for the affected offenses shorten and the federal prison population fall over the lag against the twin, by record id; the checker grades reach and money.

**Waits on.** world-federal-case-stream-part-2-cases-through-the-justice-engine.

**Files.** src/core2/modules/justice.ts, src/core2/modules/laws.ts
