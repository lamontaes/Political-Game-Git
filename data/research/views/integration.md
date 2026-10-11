# Political views form from recorded causes; calibration is pending

The new core can retain private beliefs, heard public statements and the reasons behind changes. Survey access and approval of three narrow corrections remain open. The feature has not passed its independent finishing test.

Before: Inferred from the [approved work order](../../../docs/packages/M1-views.md), the new core had no personal views and voter groups held one lean number.

After: Inferred from the local [implementation receipt](preflight.json), the views module adds fourteen values, sparse independent issue stances, political attention, heard party positions and public pressure. Registered coefficients remain uncalibrated.

## Integration calls

- Inferred from [views-world.ts](../../../src/core2/views-world.ts): `createViewsLifeCore(input, options)` uses the existing life core, people and drives modules. `installViews(core)` adds views to an existing core. Both make one opening pass and load the available answer keys.
- Inferred from [views-opening.ts](../../../src/core2/views-opening.ts): `openPersonViews(api, data, personId)` opens a new canonical person. The renewal owner should call this after inserting a newborn. Opening metadata accepts explicit personal faith, attainment and metro records; a school cohort does not establish graduation.
- Inferred from [views-inputs.ts](../../../src/core2/views-inputs.ts): `deliverViewsMessage`, `discussPublicViews` and `announcePartyPositions` expose actual political content to explicitly supplied recipients through the existing event writer. A general contact or a speech without content creates no political exposure.
- Inferred from [views-engine.ts](../../../src/core2/views-engine.ts): `recordPartyPositions` stores arbitrary party position rows. `hearPartyPositions` retains only positions that a person learns. Sympathy is a views record; organizational membership belongs to M2-08.
- Inferred from [views-engine.ts](../../../src/core2/views-engine.ts): `receiveViewEvidence` records explicit learned causes. Its optional reflection flag schedules the owned cause on the existing module calendar. There is no daily or monthly whole-world views pass.
- Inferred from [views-readers.ts](../../../src/core2/views-readers.ts): `readPersonalViews` provides private views and causal reasons to self or observer. `readKnownPublicViews` provides statements the viewer actually heard. `readViewsPlace` provides read-only comparison diagnostics for the bench owner.
- Inferred from [views-voter-groups.ts](../../../src/core2/views-voter-groups.ts): `publishVoterGroupViews` accepts causal moments for an existing unnamed group. The optional versioned group field preserves opinion counts, means, variances and strength; it does not replace legacy lean or turnout.

These entry points are in the package-owned module and helpers. The bench UI is still on its own branch and has not been played by this builder.

## Source and calibration requirements

Measured: the [source register](source-register.json) contains no acquired survey records or empirical answer keys. The [CTO ruling](https://github.com/lamontaes/Political-Game-Git/pull/3965#issuecomment-6105020215) permits the machinery while CES access is pending. ANES and GSS remain excluded. Pew public data is restricted to national faith patterns with notices, attribution and disclaimer.

Inferred from the local [checker](../../../src/core2/views-checks.ts) and [key validator](../../../src/core2/views-records.ts): a future key needs source identity, input SHA-256, survey year, wording/codes, population denominator, raw and effective sample counts, weighted denominator, subgroup and geography. Town heterogeneity must be measured separately from survey sampling uncertainty. A missing state key, metro key or demographic fact cannot produce a passing comparison.

The importer must inspect official metadata and variable wording first. It must retain source notices, record transformations and hash the acquired input. No mappings, geographic crosswalks or numerical spreads have been guessed here. Derived aggregates may ship; raw survey records should stay outside the shipped data.

Measured: the [generated observation](generated-observation.json) records a closure affecting one of 33,638 people in drawn Timberon, New Mexico, with no unexposed changes. Its opening input meets the existing budget. It uses uncommitted implementation whose hashes are retained; it is not independent acceptance or empirical calibration.

## Finishing still required

The independent Opus finisher draws two jurisdictions from all 56. It checks generated towns against state and metro answer keys by age, education, faith and region. It demonstrates differing conservative views and a recorded major event changing exposed people with causes while controls remain unchanged.

The paired guard must include the installed views module. Inferred from the [stock guard](../../../scripts/core2-guard/month.mjs), it constructs the life core without views, so a green stock result alone would not measure this module. The M1 annual allowance remains at most 5%, and the existing opening budget remains unchanged. No acceptance test or guard policy has been revised.

## Method

Measured commands and failures are retained in [preflight.json](preflight.json). The builder used GPT-6-based Codex; the exact serving variant and actual runtime effort are not exposed. Package effort is high. Usage is not visible. This document describes integration APIs, not a bench or empirical acceptance result.
