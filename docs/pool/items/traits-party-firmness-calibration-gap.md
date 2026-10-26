---
id: traits-party-firmness-calibration-gap
title: "Reassess the party-firmness proxy and measure its current calibration limit"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Existing calibration limitation documented in PR #5882 and traitWeightCampaignsPartyFirmness
---

**What.** The party-firmness weight cites working for a party or candidate as a proxy, not a direct measurement of holding a party line. Its existing citation reports an odds ratio about 1.35 at weight 0.44 in Newfane and a ceiling about 1.5, below the revised proxy target 2.63. PR #5882 corrects standard deviations and rescales the weight to 0.484 but explicitly does not refit this row. Check whether the study outcome is compatible with the modeled measure before changing the engine or claiming a fit.

**Rules.** Research before building: distinguish the published outcome from the proxy and read its scale. No dice: weights affect reasons, never a roll. Estimate, never UNKNOWN: retain the current estimate until source-compatible evidence supports a replacement.

**Done when.** In a one-year buildBenchWorld run in a freshly drawn place, name the place, seed and nonempty party-tie records, report the current and attainable effects under the same study-compatible measure, and document either a justified source-compatible fit or the measured unresolved gap with a bounded builder item if engine work is needed. Cite the source and limits, and retain the campaign trait checks.

**Files.** src/core2/campaign-stances.ts, src/core2/data/parameters.json, data/research/trait-effect-sizes.json, scripts/traits/trait-calibrate.ts, src/core2/modules/campaigns.traits.test.ts

**Notes.** TODO
