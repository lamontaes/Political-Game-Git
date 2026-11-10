---
id: world-federal-case-stream-part-2-cases-through-the-justice-engine
title: "Federal cases, sentences and custody run through the one justice engine"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-federal-case-stream-part-1-federal-offense-case-data
blocked-on:
lead: laws-effects
model: opus
effort: high
root: rc1-world-outside-town
source: split from world-federal-case-stream in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With the federal data in place, a played world needs federal cases: arrests and charges by offense, sentences inside the federal ranges and custody in a federal prison population, all through the one justice engine with the level as data and no federal copy of the engine.

**Cause.** Design: the one-engine-per-mechanic rule in AGENTS.md (Oct 27) and docs/design/country-tier.md; src/core2/modules/justice.ts models the state's sentence range (counted cases, sentences and custody) and the corruption route only.

**Fix.** Extend src/core2/modules/justice.ts so its counted-case path reads the federal rows as a level, writing federal cases, sentences and custody records by id.

**Time box.** 10 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One engine: justice.ts, with the level as data, not a federal copy. One model, two tiers: counted cases read the same rules as named ones, times their count. Speed: no whole-world scan each day; act on the day a case moves.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) and sees federal cases with sentences and custody records by id through justice.ts, with the federal prison population reported; the speed bar holds within 20 percent of base.

**Waits on.** world-federal-case-stream-part-1-federal-offense-case-data.

**Files.** src/core2/modules/justice.ts, src/core2/modules/laws.ts, data/research/justice/ussc-federal-sentencing.json (new)

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as replaced. The federal courts were built on Nov 8 as results and counts in src/core2/modules/federal-courts.ts, from the Sentencing Commission file data/research/justice/ussc-federal-sentencing-fy2025.json and the Bureau of Prisons table, and that engine already reads the reduce-mandatory-minimums law in force. What is left (a federal case, defendant and sentence built when someone opens one, the door that opens it, and the proof against the Bureau's table) is justice-federal-case-stream with its two parts, justice-federal-case-stream-part-1-case-on-open and justice-federal-case-stream-part-2-door-and-proof. This item's plan (a new data file, then cases kept for everyone through justice.ts) is the design the country tier replaced.
