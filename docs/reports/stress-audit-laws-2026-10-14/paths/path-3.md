# P3: executive sign or veto, and enactment to law in force (Lydia, SC, head fd3574c9, seed 1791948706110-ab2db744ab80)

## Record at the end

- County 2025-001 (`bill:office:gus2025:134411:board:2025-02-04:person_df7360cd247fc890:0`): held and enacted 2025-02-04 at `local-meeting:office:gus2025:134411:board:2025-02-04` (fate voted, 4 cosponsors). Law row `law:county:45031:county:...:general:2025-03-06:2025-001`, effectiveDate 2025-03-06, `estimate:false`, source "Ordinance 2025-001". Law-took-effect event 2025-03-06, tag SOURCED. No executive, desk or veto row.
- Federal 2025-002, 2025-010, 2025-012 (`bill:office:US-SC:us-house:2025-12-15:...`): all held in `session-end:US:2025-12-15` (floorTime 660, 54 bills, all reached). Desk rows (`executive.desk`): president `official:term:seat:US:president:2025-01-20`, status signed. Positions 0.628, -0.0148, 0.072. Temperament 0.10997 on all 12. Law rows effectiveDate 2025-12-15, "Public Law (bill N)", SOURCED.
- Federal 2025-001 is a budget bill (`kind:"budget"`, sponsor the president, introduced 2025-10-01, enacted, no desk row).
- Totals: 13 federal enacted, 12 with a desk row. 111 laws took effect (`D-laws-all.allLawTookEffect`). `raises: []`, `enactments: []`, `lawEffectsAppliedCount: 0`.

## Decision points

1. `legislature.ts:1616-1673 holdVote`: committee (1625), chamber majority (1665 `tally.yes <= tally.no`, Senate cloture at `senateClotureShare` 0.6, SOURCED), then `executiveAction` (1673). Majority is counted, not rolled.
2. `legislature.ts:1693-1708`: executive = elected president, governor, mayor, county-executive found by jurisdiction. The county board (`gus2025:134411`) has no such office: the county's 7 offices are board, sheriff, prosecutor, clerk, treasurer, assessor, coroner. So no executive, no veto, direct enactment (1726, 1785).
3. `legislature.ts:1730-1766`: veto branch. Sign-or-veto: `signLean` (1745) = `traitDecisionWeight` 0.5 TUNABLE x `decisionLean` (`trait-decisions.ts:66`), which takes no bill argument. So the lean is constant per president. Veto iff `position.total + signLean < 0` (1749). Position parts (views, constituents, sponsor, deal, party, trait, press) are in `votes` rows. Override needs `vetoOverrideShare` 0.6667 SOURCED (1753).
4. `legislature.ts:1946-2018 enact`: federal date = bill date (1950, 1968). Other levels: `ordinanceEffectiveDays` 30 ESTIMATED (1973). Citations (1976-1980). Each provision goes to `enactLaw`.
5. `laws.ts:352-412 enactLaw`: row `estimate:false` (377), source `SOURCED` (385-389) for every date. Future date scheduled (391), same-day date applied at once (401).
6. `laws.ts:430 lawTookEffect`: emits the event; for minimum-wage it calls `raiseToFloor` (456).
7. `world-legislating.ts:362-470 holdSession`: each filed item goes through `holdVote` synchronously (444). Filing reasons use `stance`, `constituentWeight` 0.5 TUNABLE, and `traitDecisionWeight`. Sign test `reason <= 0` (401).
8. `world-legislating.ts:495-510 endOfSession`: Congress uses `congressFloorDaysPerYear` 110 TUNABLE and `floorBillsPerLegislativeDay` 6 TUNABLE.

Why all federal bills went filed to signed on one day: `holdSession` calls `holdVote` (world-legislating.ts:444) for each bill, and `holdVote` runs committee, both chambers, `executiveAction` and `enact` in one synchronous call. Nothing schedules a stage. `scheduleVote` (legislature.ts:2031) has one caller, `src/bench/legislature.ts:176`.

## Verdicts

1. No. `roll` (legislature.ts:274, 320, 343) is the budget tally, not a random draw. No RNG on this path.
2. Yes, sign tests on continuous sums: legislature.ts:1665, 1749; world-legislating.ts:401; legislature.ts:1749 flips at zero.
3. Yes. `executive.desk` is written (executive.ts:476) and `deskOf` (executive.ts:488) has no caller. `raises` is written (laws.ts:509) and read only in tests.
4. Yes. Unregistered: the same-day federal rule (legislature.ts:1950, 1968; cited to a case in a comment only); the constant `signLean` across bills (1745); `NON_VOTING` (legislature.ts:834); budgets skipping the executive (see Defects). Registered: 30-day rule (SG-GOV-veto-override-rule; registry says line 1472, stale). The `enactments` writer is reached only through `law-reach/group-a-wages.ts:166-185`, which runs only when an authority law takes effect (none here).
5. Yes. `costEstimate` is 0 with "no pay effect" on every bill (B-federal bills). `lawEffectsAppliedCount: 0` across 111 laws.
6. Yes, territories as a class: legislature.ts:834-840 (`US-DC`, `US-PR`, `US-GU`, `US-VI`, `US-AS`, `US-MP`). No state or GEOID literal in these four modules.
7. No. Veto and override are in ROADMAP.md:88-91 (early access). The budget path needs its own check, see Defects.

## Defects

- Ordinance date: "30 days" is ESTIMATED (parameters.json) but enacted as SOURCED with `estimate:false` | laws.ts:385-389, legislature.ts:1973 | `law:county:45031...2025-001` | event tagged SOURCED, row not estimated.
- Budget bills bypass sign or veto: no `executiveAction` on the budget path | legislature.ts:248 `councilBudget`, 340-378 | federal 2025-001 (kind budget) | enacted with no desk row, no executive decision.
- Desk record is write-only: `recordDesk` writes, `deskOf` unused | executive.ts:474-488 | `desk:bill:...2025-002` etc. | nothing reads the president's decisions.
- Player-as-executive path has no caller: `executiveDecision` (legislature.ts:1909) is called nowhere outside the bench | legislature.ts:1736-1742 | not reached (player is not executive in this world) | a bill on the player's desk would stay awaiting-signature.
- `raises` write-only: laws.ts:509 | none (raises 0) | nothing reads it outside tests.
- `enactments` is read (laws.ts:339, legislature.ts:633) but its only writer is law-reach/group-a-wages.ts:166-185 | no minimum-wage or authority bill passed in this run | not reached; not a dead writer.
- Federal same-day effect: hard-coded, no source row | legislature.ts:1950, 1968-1970 | all 12 federal laws | tagged SOURCED with "Public Law (bill N)" rather than a registered rule.
- Territory list in logic | legislature.ts:834-840 | none | `NON_VOTING` names six territories.
- Constant sign lean | legislature.ts:1745 | the president, all 12 desk rows (temperament 0.10997) | the decision is the same offset on every bill, so only the bill's position varies.
