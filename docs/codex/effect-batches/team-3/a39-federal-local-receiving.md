# A39 final-law readers and receiving repair

Production/test source checkpoint: b48be01a10e26bab14a60c4a1c806eef75b2de11 on codex/team-3-a39-final-terms-current-pay, #1887. Parent receiving branch is #1879/2765bd94be0c2e8ad3c2e673f4d01a4ead7abcc2. Original #1801 and its broad historical dependency are preserved.

## Owned delta and reuse

Released minimum-wage.ts federal/local final-term functions and initial federal arm use canonical lawInForce/readFinalEnactedLawTerm. Replaces FEDERAL_RAISE_PLACEHOLDER and CITY_PREMIUM_RATIO. Released, zero-production-caller stateRaiseAfterDays/STATE_RAISE_TERM and its unused JSON import are removed; no replacement average/formula is introduced. stateMinimumSettingAt, computeStateMinimumSetting, cutoff/data and minimumWageSettingAt fallback remain byte-identical to the receiving parent except the expressly released initial federal arm.

Receiving repair d5bce458 removes ONLY paydayHandler's pre-payment raiseTownPayToMinimum call in living-world/town-pay.ts. The surviving payTownPaydays → settleTownCompensations → applyLawConsequences path applies prospective floors before payment. Legacy pre-raise wrote minimum-wage-compensation terms before the common writer's stronger-contract check, leaving canonical pay joins empty. Teacher boundary, payment calculation, withholding, registry and shared schema are untouched. The old exported helper remains preserved pending independent caller-retirement proof; this checkpoint does not claim every A38 duplicate is gone.

New production exports: none. canonicalMinimumTerm is the reused private query helper; federalMinimumHourlyMinorAt retains the published number|null contract.

## Tests and fixtures

The three original receiving test bodies/stock limits remain intact. minimum-wage-final-terms.test.ts changes only its callback to canonical LifePlaceStateIdentity; city/federal nationwide files and authoredWageTerm retain their published #1801 blobs.

The affected state-bill test retains all four cases and stock 600000ms limit. It replaces the removed average-raise expectations with an explicit authored $17 control through the existing Omaha bill fixture's cents input. That fixture now reuses recordFiledProvision to file numeric target text before the same referral/vote/enroll/sign/enact chain; no synthetic enactment replaces the chain. Only the numeric branch/import is added. The state-pay assertion joins canonical pay stamps to the actual enacted measure and retains its named designation; baseline comparisons use the same date's canonical law, rather than the undated legacy wage table. Poverty/effect assertions remain; this is not a claim they passed.

## Executed evidence and limits

Five currently changed TS sources checked from exact staged bytes: syntax parser diagnostics0, scoped ESLint0errors/0warnings, Prettier format applied. Protected state/fallback function byte equality PASS. These are source checks, not semantic types.

Canonical npm run -s audit:scan -- --only A39: exact maince219003 source snapshot2/6; final candidate snapshot6/6, exit0, scanner14ms. Snapshots contain every production file named by all six A39 rules and unchanged main scanner/rules/metadata. Only A39 is claimed; full receiving Git-branch audit remains NOT RUN here. Final receipt /tmp/team3-a39-scoped-scan/candidate-A39-final.json.

AUDIT: A39 2/6 → 6/6, checks flipped: minimum-wage.ts calls readFinalEnactedLawTerm; FEDERAL_RAISE_PLACEHOLDER absent; CITY_PREMIUM_RATIO absent; STATE_RAISE_TERM absent. Static rules do not prove actual payroll effects.

Root's prior exact41b955 receiving: complete three files69PASS/4FAIL/6TODO54.14s; scoped5roots994files one TS7006. Failures preserved: canonical federal725 was mislabeled state/effective:null; city/federal/ended-job canonical pay joins were empty. This checkpoint addresses the callback and legacy pre-call; no renewed behavior/types pass is claimed.

Renewed complete changed tests (minimum-wage-final-terms, town-federal-minimum-wage-law, city-minimum-wage-bill-terms, state-minimum-wage-bill-terms), scoped semantic types and official Claude gate: NOT RUN here. Root-owned fallback provenance remains an exact integration blocker, not an assertion to weaken. Six player-script TODOs remain explicit; no full slice, all56 actual payroll, natural-vote or final-main completion claim.

Local parked checkout0452b1d3bbf5aef0aa0ef53c896a12297ad954a8 and inherited untracked proof config are unchanged. No team merge.
