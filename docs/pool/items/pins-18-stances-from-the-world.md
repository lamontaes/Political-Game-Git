---
id: pins-18-stances-from-the-world
title: "Legislators' sense of consensus, neighbors' laws, public opinion and life-stake references come from the world, not 2026 tables"
area: core
kind: feature
priority: 2
size: L
status: claimed
standard: 2
claimed-by: claude/happy-bell-8rj52e-pins-18
pr:
after:
blocked-on:
root: none
lead: play-first
model: opus
effort: medium
source: Pins lane, Nov 17 (the CTO's LIFT THE PINS family 18 on issue 9747; plan approved 04:08Z)
---

**What.** Four pins held lawmakers and voters to 2026 figures in every world. A member's sense of the country read the share of real states with each law (`officials-roster.ts`); a state's pull toward its neighbors read their starting answers, though neighbors now legislate (`modules/world-legislating.ts`); public opinion was the published poll moved once per world and never again (`campaign-views.ts`); and a life stake was measured against the nation's real shares (`life-stake-rule.ts`). Each now reads the world's own laws, people and households, so two worlds can disagree. Seen: dev mode's Trace box opens `consensus:<question>` and the month's opinion row with their inputs.

**Cause.** Found in code: src/core2/officials-roster.ts memberSupportAt, src/core2/modules/world-legislating.ts neighborPull, src/core2/campaign-views.ts supportShare and src/core2/life-stake-rule.ts stakeShift each read a published table.

**Fix.** Consensus is the world's own share of states with the law (and Congress's last roll call), kept as a `consensus:<question>` row; neighbors read `answerIn`; opinion is the monthly mean of the world's people's own stances, the poll giving only a lean's strength (CTO 04:08Z); stake references are the world's own shares over the same people, kept for the month.

**Time box.** 8 hours.

**Rules.** Everything comes from the simulation (owner, Nov 17): real data sets only how strongly a lean or a stake moves a stance, never the share. One rule, all 56 places: consensus counts every state and territory in the world, never a named one.

**Done when.** A second session plays a year in a drawn place with dev mode on, enacts a split question in three more states through dev mode's law control, and sees in the Trace box that the `consensus:<question>` row and an out-of-state official's stance moved; `src/core2/stances-follow-law-map.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/core2/law-consensus.ts (new), src/core2/officials-roster.ts, src/core2/modules/officials.ts, src/core2/modules/world-legislating.ts, src/core2/campaign-views.ts, src/core2/life-stake-rule.ts, src/core2/life-stakes.ts, src/core2/modules/views.ts, src/core2/modules/ballot-measures.ts
