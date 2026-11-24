# Bounded congressional candidacy route audit

- Exact source: `6ce27cdf00616406c1d2adf5f626ef783982889c` (`HEAD`, detached).
- Scope: ordinary character considering U.S. House or Senate candidacy through filing, campaign, election, certification, and taking a seat.
- Mode: source inspection only. No runtime/browser test or human/native acceptance was run; no save/profile was created. Runtime result: NOT RUN.

## Reachable route and first blocker

1. Ordinary campaign-office discovery projects alternatives from the character's home jurisdiction's `candidacyAuthority(...).pack`; an empty pack produces no office rows ([campaign-office-discovery.ts:11-16](/Users/lamontae/Documents/PG-LAND/src/presentation/campaign-office-discovery.ts:11)).
2. The authority resolver uses the place's own candidacy pack or its declared parent-state pack, never a federal office registry ([candidacy.ts:98-120](/Users/lamontae/Documents/PG-LAND/src/simulation/candidacy.ts:98)).
3. The registered candidacy-pack collection is derived exclusively from accepted legislative rule packs ([candidacy-packs.ts:352-356](/Users/lamontae/Documents/PG-LAND/src/simulation/candidacy-packs.ts:352)); the pack lookup adds state-executive offices, not Congressional ones ([candidacy-packs.ts:360-372](/Users/lamontae/Documents/PG-LAND/src/simulation/candidacy-packs.ts:360)).
4. Therefore, for an otherwise eligible adult considering a federal seat, the first blocker is before filing: House/Senate candidacy is absent from ordinary office discovery. The player cannot file through the ordinary candidacy route. Downstream campaign, election result, certification, and player taking a federal seat are unreachable from that route.

Player-facing consequence: they can play supported state legislative candidacies where jurisdiction packs exist, but cannot choose a U.S. House or Senate seat from the ordinary campaign office list. Elections documentation explicitly names “Presidential campaign admission, complete result production, canonical congressional membership and normal player mounts” as integration gaps ([elections.md:248-259](/Users/lamontae/Documents/PG-LAND/docs/systems/elections.md:248)).

## Seat identity continuity

House and Senate seat keys are stable in source: House keys are `us-house:<state>-<district>` and Senate keys are `us-senate:<state>:class-<class>` ([congress-seats.ts:111-144](/Users/lamontae/Documents/PG-LAND/src/simulation/living-world/congress-seats.ts:111)). The Congressional projection reconstructs seat rows from that catalog and selects the latest tagged tenure/vacancy event by the same `seatKey` ([congress.ts:223-252](/Users/lamontae/Documents/PG-LAND/src/simulation/living-world/congress.ts:223)). So seat IDs persist across member turnover in the existing Congressional world projection. That is institutional continuity, not a reachable player candidacy path. Save/reopen persistence was not executed here (NOT RUN).

## Demonstrated finding

- **Severity:** Blocker for the requested federal candidacy journey.
- **Files/symbols:** `projectCampaignOffices`; `candidacyAuthority`; `CANDIDACY_PACKS` / `candidacyPacks`; `congressSeats` / `projectCongress`.
- **Minimal reproduction:** Open ordinary campaign office discovery as an otherwise eligible adult in a U.S. state; inspect available offices for U.S. House or U.S. Senate. The projected choices come only from the jurisdiction's accepted state/local candidacy pack; neither federal chamber is registered there.
- **Expected:** A federal seat can be selected and the ordinary candidacy route can proceed through its applicable filing/election/certification/seat-entry stages.
- **Actual:** No federal office option exists in the ordinary discovery list, so filing is unreachable and all later stages are absent from this player journey.
- **Owner:** Congressional/national election integration owner; the current elections contract names canonical congressional membership and normal player mounts as integration gaps. No individual owner is established by this source snapshot.

## Evidence status

- Source inspection: completed at exact head above.
- Executed tests: none; NOT RUN.
- Ordinary browser/native interaction and save/reopen: NOT RUN.
- Human/native acceptance: NOT RUN.
