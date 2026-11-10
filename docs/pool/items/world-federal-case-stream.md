---
id: world-federal-case-stream
title: "A federal case stream so federal sentencing (mandatory minimums) has something to shorten"
area: world
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
blocked-on: world-federal-case-stream-part-1-federal-offense-case-data, world-federal-case-stream-part-2-cases-through-the-justice-engine, world-federal-case-stream-part-3-mandatory-minimum-question-reaches-people
after:
lead: laws-effects
model: opus
effort: high
root: rc1-world-outside-town
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** us-federal-positions:justice-rights.reduce-mandatory-minimums reaches nobody (law-wiring reach 0, Butte AK, seed 3d8e41c7a09b25f6). justice.ts models the state's sentence range for ordinary cases (counted cases, sentences and custody) and the corruption route; federal mandatory minimums bind federal drug and firearm offenses, and there are no federal courts or federal prison population in the engine. Add federal cases (arrests and charges by offense from federal data) to the same justice engine, with federal sentencing ranges and a mandatory minimum floor the question can lower, sized from the U.S. Sentencing Commission. Courts come after early access, so this is deferred.

**Cause.** Design: the one-engine-per-mechanic rule in AGENTS.md (owner, Oct 27, 2026) and docs/design/country-tier.md; AGENTS.md puts courts after early access; src/core2/modules/justice.ts holds no federal data.

**Fix.** Build it in three parts, in order: world-federal-case-stream-part-1-federal-offense-case-data (data), world-federal-case-stream-part-2-cases-through-the-justice-engine (cases through the justice engine) and world-federal-case-stream-part-3-mandatory-minimum-question-reaches-people (the question reaches people).

**Time box.** 24 hours in all, across the three parts; each part carries its own time box.

**Rules.** No dice. One engine: justice.ts, with the level as data, not a federal copy. Sized from the Sentencing Commission with citation and spread.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`, drawn place and seed named) and sees federal cases with sentences and custody; with the question enacted through a real bill, sentences for the affected offenses shorten and the federal prison population falls over the lag; the checker grades reach and money; the stopgap loses this question. This item is done when its three parts are.

**Waits on.** The three parts: world-federal-case-stream-part-1-federal-offense-case-data, world-federal-case-stream-part-2-cases-through-the-justice-engine, world-federal-case-stream-part-3-mandatory-minimum-question-reaches-people. Deferred past early access.

**Files.** src/core2/modules/justice.ts, src/core2/modules/laws.ts, data/research/justice/ussc-federal-sentencing.json (new)

**Notes.** Found by the Dev Tester, Nov 8 night.

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as replaced. The federal courts were built on Nov 8 as results and counts in src/core2/modules/federal-courts.ts, from the Sentencing Commission file data/research/justice/ussc-federal-sentencing-fy2025.json and the Bureau of Prisons table, and that engine already reads the reduce-mandatory-minimums law in force. What is left (a federal case, defendant and sentence built when someone opens one, the door that opens it, and the proof against the Bureau's table) is justice-federal-case-stream with its two parts, justice-federal-case-stream-part-1-case-on-open and justice-federal-case-stream-part-2-door-and-proof. This item's plan (a new data file, then cases kept for everyone through justice.ts) is the design the country tier replaced.
