# Law-effect fixtures now use the actual governor desk

Before: Downstream law tests waited for an executive fallback that production no longer supplies. Bills stayed pending, or tests supplied a signature without the governor's recorded desk action.

After: The fixtures install an actual governor, open the actual bill matter, and record the controlled governor's signing choice. All original assertions remain. Both complete test files now pass 89 of 92 cases. The three remaining failures concern fiscal producers assigned to Team 6; the original end-date and ceiling assertions remain unchanged.

## Delivery status

MERGED: None for this fixture repair. This is a draft because both files are not yet green.

WHAT EMERGED: DECIDED in controlled fixtures: Governor Cameron Wilkerson signs actual Nebraska bill matters. The signing choice is supplied by the fixture. It is not evidence of an ordinary NPC choice or unattended-desk behavior. HARDWIRED: downstream fixtures choose signing through their existing real-office route (`enacted-law-effects.test.ts:118`).

## Why-chain

Measured source: the downstream fixtures used a legislative executive step after the fallback signature was removed. That step now opens a matter for the actual officeholder rather than supplying a decision (`legislation-session.ts:474`).

The fixture must therefore create the real incumbent, open that governor's matter, and act as that governor. Changing controlled people also requires releasing the previous person's player-required work through the existing recorded handoff. The fixture preserves those responsibility records (`enacted-law-effects.test.ts:76`).

Bedrock: a controlled person's explicit signing choice is recorded on the real bill matter. The existing enactment and effect boundaries then run. This proves downstream bookkeeping after a supplied choice; it does not establish natural executive behavior.

## Research

The CTO's October 1, 2026, 12:45 p.m. main-green instruction requires the actual desk fixture route already used by the automatic legislation terms tests. No new vote rule, statutory date, outcome rate or fiscal number is introduced.

Audit's 17:07 UTC source disposition distinguishes two production bugs from a negative-fixture error. Absolute availability clauses must retain their written dates. A later appropriation must resolve its saved target measure. A null `effectiveAt` alone does not mean the canonical operative date is absent. These are source-contract findings, not empirical estimates (`a80-governor-fixture-proof/saved-law-records.json`).

## Revisions

Measured: both test helpers use the existing incumbent producer, actual governor office lookup, actual matter and `decideGoverningMatter`. They assert the recorded governor participant and awaiting-enactment phase (`enacted-duties.test.ts:159`).

The delayed-transit fixture now supplies the existing complete transition registry, because the real governor route schedules an institution step. Its original payment and cash assertions remain (`enacted-law-effects.test.ts:602`).

The genuinely missing-date fixture uses Alaska's existing source-resolved enactment. It verifies the source-default basis before removing the saved date. The canonical reader then returns null and no appropriation is written. Nebraska's earlier null-only fixture instead returned July 18, 2026, with basis `state-rule`; that earlier failure is preserved (`a80-governor-fixture-proof/registry-repaired-tests.log`).

## What gets built

1. Use an actual governor's recorded controlled signing action in both downstream helpers and the bundled-bill fixture.
2. Preserve the previous controlled person's work through the existing handoff and responsibility-release writers.
3. Supply the existing institution handlers when the delayed fixture advances the world.
4. Check the canonical operative-date result in a genuine missing-date case.
5. Preserve all 92 cases and the fiscal expectations while Team 6 repairs its assigned producer hunks.

## Simulated, records, world pieces, checks

SIMULATED: the controlled signing choice is authored fixture input. RECORDS: actual incumbent, governor matter, participant, executive action and enactment are created through existing production writers. WORLD PIECES: existing office, person and player-required-work identity are required. Missing office or matter fails the fixture instead of inventing a signature.

The saved fiscal evidence includes compiled, enacted and operative dates; final availability clauses; and present or absent appropriation records. These are read-only logs of the actual fixture world (`a80-governor-fixture-proof/saved-law-records.json`). No shared fiscal producer is modified.

The existing 56-jurisdiction duty-reach cases remain. They check jurisdiction reach; they are not 56 populated governor or fiscal lifecycles. No additional researched calibration is claimed.

## Proof run

Measured: both complete changed test files passed 89 cases and failed three in 34.18 seconds, with no filter, skipped cases or timeout increase (`a80-governor-fixture-proof/negative-date-repaired-tests.log`). Two strict roots have zero diagnostics; scoped lint and formatting pass. This is not a passing readiness result.

Measured unresolved assertions: the written availability end is January 5, 2028, but the producer returns January 13, 2028. The supplemental lapse is January 5, 2027, but the producer returns January 13, 2027. The later enacted appropriation has no saved appropriation record to count against the original ceiling (`a80-governor-fixture-proof/negative-date-repaired-tests.log`). Team 6 owns the narrow producer repairs; no expectation is relaxed.

## Worked example

Measured Nebraska seed `legislative-core-nebraska-2026`: Cameron Wilkerson signs the actual Hardening Grants matter. Its saved authorization is $15 million and provides no money. The later bill appropriates $12 million for that actual saved target. It also records Cameron's signature and enactment, but the observed appropriation list is empty (`a80-governor-fixture-proof/saved-law-records.json`). The saved target link and second law's amount have been sent to Team 6.

Measured Alaska seed `legislative-core-alaska-2026`: Frances Zamora signs the transit appropriation. The negative fixture preserves its real source-default basis while removing its saved effective date. The canonical operative query returns null, and the original zero-appropriation assertion passes (`a80-governor-fixture-proof/negative-date-repaired-tests.log`).

## Vital statistics and method

Executed source 2691d22cc follows additive main composition 2c8afb18e86f5ec6129ce058799dcea4be32dc91 and actual main 6cc29fb8a6e4efd149e8c916343d88922e2cad7c. Exact commands, full source IDs and raw hashes are in the companion receipt. One test process ran both complete changed files, under the existing 300-second cap. Initial failures and raw saved-law records are retained.

The composed source includes the separately merged A79 change. The initial desk repair passed 61 and failed 31 because raw control changes violated player-work responsibility. Canonical handoff repaired that. The next run passed 87 and failed five. Registry repair passed 88 and failed four. The updated missing-date fixture leaves only the three producer failures.

NOT RUN: full suite, browser, speed years, natural NPC signing, unattended-desk behavior, nationwide populated fiscal worlds or the combined Team 6 repair. Next: consume Team 6's exact approved fiscal source and rerun these same two files. Until both pass, this candidate remains draft. No team merge or full A80 completion is claimed.
