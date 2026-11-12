---
id: traits-party-firmness-calibration-gap
title: "Reassess the party-firmness proxy and measure its current calibration limit"
area: people
kind: research
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: Existing calibration limitation documented in PR #5882 and traitWeightCampaignsPartyFirmness
checked: fable 2026-11-10
---

**What.** The party-firmness weight cites working for a party or candidate as a proxy, not a direct measurement of holding a party line. Its existing citation reports an odds ratio about 1.35 at weight 0.44 in Newfane and a ceiling about 1.5, below the revised proxy target 2.63. PR #5882 corrects standard deviations and rescales the weight to 0.484 but explicitly does not refit this row. Check whether the study outcome is compatible with the modeled measure before changing the engine or claiming a fit.

**Cause.** Found in code: src/core2/campaign-stances.ts weighs party firmness (decision campaigns.party-firmness, line 162) with a proxy citation (working for a party or candidate): odds ratio about 1.35 at weight 0.44 in Newfane, ceiling about 1.5 against the revised proxy target 2.63; PR #5882 rescaled the weight to 0.484 without refitting.

**Fix.** Read the study's outcome scale against the modeled measure and either record a source-compatible fit or the measured unresolved gap with a bounded builder item. Keep the current estimate until evidence replaces it.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research before building: distinguish the published outcome from the proxy and read its scale. No dice: weights affect reasons, never a roll. Estimate, never UNKNOWN: retain the current estimate until source-compatible evidence supports a replacement.

**Done when.** A second session sees, for a one-year buildBenchWorld run in a freshly drawn place (place, seed and nonempty party-tie records named), the current and attainable effects reported under the same study-compatible measure and either a justified source-compatible fit in data/research/trait-effect-sizes.json or the measured unresolved gap written with a bounded builder item; the source and its limits are cited and the campaign trait checks (src/core2/modules/campaigns.traits.test.ts) still pass.

**Waits on.** Nothing.

**Files.** src/core2/campaign-stances.ts, src/core2/data/parameters.json, data/research/trait-effect-sizes.json, scripts/traits/trait-calibrate.ts, src/core2/modules/campaigns.traits.test.ts

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have refit a party-firmness weight to a proxy study; no player can tell.
