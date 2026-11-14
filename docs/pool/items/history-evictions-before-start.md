---
id: history-evictions-before-start
title: "Evictions have a simulated past: notices served before day one, so Metrics shows last year's eviction notices on the first day"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: history-housing-before-start
blocked-on:
lead: m0-m2
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: owner in chat Nov 13 2026 23:51Z (the past is simulated so the present makes sense); Account lead, Nov 14, after the Train's red at Washington KS
---

**What.** On day one the town's eviction notices row on Metrics shows no last year. No eviction is simulated before the start, so a past year row holds no count, and the row reads it as unknown (null), never as zero. That is the honest reading, but it leaves the row empty until the first played year closes. Seen: Metrics on day one, the Evictions section's notices row with last year beside it.

**Cause.** Design: OWNER-DECISIONS Oct 27 ("History is simulated before the start date, no hotfix") and the owner's Nov 13 23:51Z ruling in chat (Metrics figures, including last year, come out of the simulation). Found in code: housing's pre-start pass (src/core2/housing-past.ts) runs tenancies, rents and home values, not arrears or notices. A notice is served only in play by housing's notice step (src/core2/modules/housing.ts, the `eviction:<lease>:<date>` case and `putOutputNumber(api, "housing.eviction-notices", …)`). `putPastYear` (src/core2/output-numbers.ts) marks a closed past year's `pastFields`, so a figure no pass wrote reads null.

**Fix.** An evictions step inside housing's pre-start pass, by the housing engine's own notice rule at the coarse step: from each renter's simulated rent (the pass's renewals) against the household's pay history (the economy pass's months and the work pass's spells), find the months a household fell behind past the place's notice law, and keep each notice as a history row. Count the town's notices for each past year and write them with `putPastYear` under `housing.eviction-notices`, so the field joins the year's `pastFields`. Real filing rates (Eviction Lab) only check the totals; they never pick a household.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** History is simulated before the start (owner, Oct 27, Oct 28, Nov 13). No dice: a notice comes from a household's arrears and the law in force, never a rate. One model, two tiers: a counted renter is served by the same rule, times its weight. Speed: the pass runs once at the opening, nothing is added to the played year.

**Done when.** A second session starts a new life in a drawn place, naming place and seed, opens Metrics on day one and sees last year's eviction notices beside this year's, traceable in dev mode to the pass's notice records; a place whose past had no renter fall behind reads zero, not empty.

**Waits on.** history-housing-before-start (its pass and `putPastYear`).

**Files.** src/core2/housing-past.ts, src/core2/modules/housing.ts, src/core2/output-numbers.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request. Sibling of history-jobs-before-start.
