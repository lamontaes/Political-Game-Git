---
id: claims-lie-rates-across-towns
title: "Check how often colleagues lie about their vote against real rates of lying, across three drawn towns"
area: people
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: Account lead review of the lying PR (people can lie to the player), Nov 15
---

**What.** Whether a colleague asked for their vote tells the player a false yes is weighed in `src/core2/told-claims.ts` (`tellsTruth`) through the chooser, in the record's own units, with the general trait weight on the `claims.tell` decision (`traitWeightClaimsTell`, 1, unfitted). Nobody has checked the share who lie against real rates. Seen: in dev mode, a player asking colleagues for votes in three drawn towns hears false yeses about as often as the research says people misstate a costly commitment.

**Cause.** Found in code: no calibration exists; `traitWeightClaimsTell` in src/core2/data/parameters.json says "Starts at the general traitWeight (1)" with its spread unmeasured, and the decision has no row in data/research/trait-effect-sizes.json.

**Fix.** Read Serota, Levine and Boster 2010 (Human Communication Research 36:2-25) and a source on honesty-humility and lying (as corruption did with Pletzer et al. 2019), add the `claims.tell` row to data/research/trait-effect-sizes.json, and fit `traitWeightClaimsTell` with scripts/traits/trait-calibrate.ts across three drawn towns (place and seed named), checked against totals only, never one person's answer.

**Time box.** 3 hours, one Sonnet session at medium effort.

**Rules.** No dice; real rates check totals and never pick a person's answer; no new weights beside the one trait weight.

**Done when.** The trait weight is fitted with its spread and source, the fit and check towns are named, and a second session sees, in dev mode on main, colleagues in a drawn town answering vote asks with false yeses at a rate inside the spread.

**Waits on.** The lying PR (people can lie to the player) on the Train.

**Files.** src/core2/data/parameters.json, data/research/trait-effect-sizes.json, src/core2/told-claims.ts
