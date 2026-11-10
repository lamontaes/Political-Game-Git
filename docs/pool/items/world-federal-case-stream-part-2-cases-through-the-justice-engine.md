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
---

**What.** With the federal data in place, a played world needs federal cases: arrests and charges by offense, sentences inside the federal ranges and custody in a federal prison population, all through the one justice engine with the level as data and no federal copy of the engine.

**Cause.** Design: the one-engine-per-mechanic rule in AGENTS.md (Oct 27) and docs/design/country-tier.md; src/core2/modules/justice.ts models the state's sentence range (counted cases, sentences and custody) and the corruption route only.

**Fix.** Extend src/core2/modules/justice.ts so its counted-case path reads the federal rows as a level, writing federal cases, sentences and custody records by id.

**Time box.** 10 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One engine: justice.ts, with the level as data, not a federal copy. One model, two tiers: counted cases read the same rules as named ones, times their count. Speed: no whole-world scan each day; act on the day a case moves.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) and sees federal cases with sentences and custody records by id through justice.ts, with the federal prison population reported; the speed bar holds within 20 percent of base.

**Waits on.** world-federal-case-stream-part-1-federal-offense-case-data.

**Files.** src/core2/modules/justice.ts, src/core2/modules/laws.ts, data/research/justice/ussc-federal-sentencing.json (new)
