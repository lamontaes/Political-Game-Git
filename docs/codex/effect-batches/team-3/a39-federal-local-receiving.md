# A39 final-law readers and receiving repair

Production/test source checkpoint: 4410f1172e1d3fd71a6bb83ad397c406ef03d4cd on codex/team-3-a39-final-terms-current-pay, #1887. Parent receiving branch is #1879/2765bd94be0c2e8ad3c2e673f4d01a4ead7abcc2. Original #1801 and its broad historical dependency are preserved.

## Owned delta and reuse

Released minimum-wage.ts federal/local final-term functions and initial federal arm use canonical lawInForce/readFinalEnactedLawTerm. Replaces FEDERAL_RAISE_PLACEHOLDER and CITY_PREMIUM_RATIO. Released, zero-production-caller stateRaiseAfterDays/STATE_RAISE_TERM and its unused JSON import are removed; no replacement average/formula is introduced. stateMinimumSettingAt, computeStateMinimumSetting and cutoff/data remain byte-identical to the receiving parent. The expressly released initial federal arm is preserved. Root-only scope donor238c67be0bfdfbe41d098b33e868c5bb1266e74c is now received: only startingLawScope import and minimumWageSettingAt fallback provenance changed. Exact donor-parent/current file equality was verified before receipt; received blob61328746e5902677252dcf0aefea138d875ab12b.

Receiving repair d5bce458 removes ONLY paydayHandler's pre-payment raiseTownPayToMinimum call in living-world/town-pay.ts. The surviving payTownPaydays → settleTownCompensations → applyLawConsequences path applies prospective floors before payment. Legacy pre-raise wrote minimum-wage-compensation terms before the common writer's stronger-contract check, leaving canonical pay joins empty. Teacher boundary, payment calculation, withholding, registry and shared schema are untouched. The old exported helper remains preserved pending independent caller-retirement proof; this checkpoint does not claim every A38 duplicate is gone.

New production exports: none. canonicalMinimumTerm is the reused private query helper; federalMinimumHourlyMinorAt retains the published number|null contract.

## Tests and fixtures

The three original receiving test bodies/stock limits remain intact. minimum-wage-final-terms.test.ts changes only its callback to canonical LifePlaceStateIdentity; city/federal nationwide files and authoredWageTerm retain their published #1801 blobs.

The affected state-bill test retains all four cases and stock 600000ms limit. It replaces the removed average-raise expectations with an explicit authored $17 control through the existing Omaha bill fixture's cents input. That fixture now reuses recordFiledProvision to file numeric target text before the same referral/vote/enroll/sign/enact chain; no synthetic enactment replaces the chain. Only the numeric branch/import is added. The state-pay assertion joins canonical pay stamps to the actual enacted measure and retains its named designation; baseline comparisons use the same date's canonical law, rather than the undated legacy wage table. Poverty/effect assertions remain; this is not a claim they passed. Compatibility repair be66f853 uses the actual saved FutureDueItem at the existing payday key, without any partial-object cast, and replaces findLast with existing recordsWithFieldValue(...).at(-1). All assertions and stock limits are preserved. Test blob76ce112b5a12d957d7bd177a46a0b6c3bb8c7d55.

## Executed evidence and limits

Five currently changed TS sources checked from exact staged bytes: syntax parser diagnostics0, scoped ESLint0errors/0warnings, Prettier format applied. Protected state function byte equality PASS before the released root scope receipt; the root fallback delta is explicit above. These are source checks, not semantic types.

Canonical npm run -s audit:scan -- --only A39: exact maince219003 source snapshot2/6; final scope candidate snapshot6/6, exit0, scanner15ms. Snapshots contain every production file named by all six A39 rules and unchanged main scanner/rules/metadata. Only A39 is claimed; full receiving Git-branch audit remains NOT RUN here. Final receipt /tmp/team3-a39-scoped-scan/candidate-A39-scope.json.

AUDIT: A39 2/6 → 6/6, checks flipped: minimum-wage.ts calls readFinalEnactedLawTerm; FEDERAL_RAISE_PLACEHOLDER absent; CITY_PREMIUM_RATIO absent; STATE_RAISE_TERM absent. Static rules do not prove actual payroll effects.

Root's prior exact41b955 receiving: complete three files69PASS/4FAIL/6TODO54.14s; scoped5roots994files one TS7006. Failures preserved: canonical federal725 was mislabeled state/effective:null; city/federal/ended-job canonical pay joins were empty. Root scopefix + owned74aeb receiving treed7b01ad1bc469a89b4ca063c7edd91a8095566e5 then completed the SAME three original files73PASS/6TODO55.66s terminal0, resolving all four prior failures. Scoped8roots995files then reported five diagnostics solely in the new state test (partial FutureDueItem cast, two findLast and two callback errors). Those exact diagnostics prompted be66f853; no renewed semantic-types pass is inferred.

Latest complete state-minimum-wage-bill-terms.test.ts, renewed scoped semantic types and official Claude gate: NOT RUN here. Root's 73PASS receipt covers its named tree/three original files only; it does not cover b48/be66 state changes or final-main. Six player-script TODOs remain explicit; no full slice, all56 actual payroll, natural-vote or final-main completion claim.

Local parked checkout0452b1d3bbf5aef0aa0ef53c896a12297ad954a8 and inherited untracked proof config are unchanged. No team merge.
