---
id: research-flat-tax-share-sponsor-conviction
title: "Check the flat-tax share a sponsor writes against more real conversions and how conviction maps to it"
area: laws
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on #9246: the 0.667, 1.0 and 0.786 ends and the linear slide are estimates, Nov 14"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** A repeal of a graduated income tax writes the old top rate times a share between 0.667 and 1.0, sliding linearly with how strongly the bill's sponsor holds the question (#9246). The two ends and the median 0.786 are measured from five real conversions (Mississippi, Georgia, Iowa, Louisiana and Ohio); that is a thin sample, and the linear map from conviction to share is an estimate with no source. Add the conversions of earlier years and local flat-tax conversions, and check whether deeper cuts really come from stronger sponsors. Seen: the parameter row `graduatedRepealFlatShareOfTopRate` carries a longer source list and a spread that holds the larger sample.

**Cause.** Found in code: `src/core2/data/laws/reach-group-b-parameters.json` row `graduatedRepealFlatShareOfTopRate` (ESTIMATED, spread 0.667 to 1.0, five states) and `flatRateOf` in `src/core2/law-reach/group-b-money.ts`, which slides the share linearly with the sponsor's stance; the research file `data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json` holds only the 2022 to 2026 tables.

**Fix.** Design: read the Tax Foundation tables for earlier years (and sources for local conversions), add each conversion's ratio to the research file, and set the row's value and spread from them with `scripts/research/check-law-reach-sources.ts` checking the numbers; where the sample shows the conviction link is weaker than linear, change the map to the sourced shape.

**Time box.** 2 hours for one Sonnet session at low effort. When it runs out, write what was read in the item and stop.

**Rules.** Research before building: real conversions calibrate the share and never decide one sponsor's rate. Estimate, never unknown: a figure that cannot be sourced stays marked ESTIMATED with its spread. No dice: the share follows the sponsor's own stance, never a roll.

**Done when.** A second session, not the builder, runs `npx tsx scripts/research/check-law-reach-sources.ts` on main and sees the parameter row's source name each conversion with its before and after rates, in a played world (buildBenchWorld) at a drawn place and seed, a graduated repeal writes a rate inside the row's spread, named by record id.

**Waits on.** #9246 folding.

**Files.** src/core2/data/laws/reach-group-b-parameters.json; data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json; scripts/research/check-law-reach-sources.ts

**Notes.** The values are not guesses: the five ratios and their median are in the research file with quotes. What is estimated is the sample size and the linear conviction map.
