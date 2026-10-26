## Record at the end

Run: Lydia SC, 2025-01-20 to 2026-02-24 (targets/meta.json). County 45031 flips every 15 days.

- `applied` table (law-effects): 0 rows. A-county-bill `lawEffectsAppliedCount: 0`. The three series are not in `policy-effects.json` (only 5 keys), so `applyLaw` returns at law-effects.ts:224 after the handlers run.
- Partner-with (group-a `reach`): 24 rows, all `endedOn` set. 12 `department` org rows (count null) and 12 `estimated noncitizens` rows whose count drifts 3640 to 3708 (D-law-reach.json a.reach). None open at end.
- Medicaid work requirement (group-b `people`): 17 rows, 6 cycles (2025-03-06 to 2025-08-18), 3 named people. Person person_ed8f77123a57b31b is in the player's household (household_9a045a25aa153048). Every row ended (D-law-reach.json b.people).
- Universal preschool (group-b `people`): 20 rows, 3 named people, 11 cycles, all ended. `groups` row ended 2026-02-14, reached 0 of 10080 counted (D-law-reach.json b.groups).
- Outcome web: `months` has 14 rows, one per place-month (E-outcome-web.json months). All landings for these links (work-requirement-to-coverage n=35, universal-childcare n=7, universal-prek-* n=40) have effect 0 (end-core2-outcome-web-v1.json landings).

## Decision points

- law-effects.ts:145 `inForceHere`: any level's latest row says 1. Reads law rows (laws module). Dates and values are SOURCED (county ordinance rows).
- law-effects.ts:193 `runHandlers`: calls handlers for the series. Reads the law row only.
- group-a.ts:27-28: `none` mechanic registers `applyRecords` (group-a-records.ts:451). Repeal branch 464-476 sets `endedOn`. Spec counts: `noncitizenShare` 0.066, ESTIMATED (reach-group-a-parameters.json).
- group-b.ts:386 `records` case → `finish` (group-b.ts:411): `reconcile` (group-b-store.ts:130, repeal at 153-155) and `setActive`.
- group-b-people.ts:213 `selectResidents`: reads ages, weekly work minutes from commitments, household income, child ages. Hard cutoffs at 239, 245-247, 250-252. Parameters are SOURCED (medicaidExpansionIncomeShare 1.38, medicaidWorkHoursPerMonth 80, medicaidWorkExemptChildBelow 14, preschoolAgeFrom 3/Below 5).
- group-b-store.ts:232 `learn`: writes public `law-reach:<key>` knowledge. Hard-coded keys.
- outcome-web.ts:336 `recordMonth` and 351 `lawValue`: law value at the monthly date. Lag months and sizes are SOURCED research rows (links.json).
- outcome-web.ts:311-327 `effectOf`: the lag switch at 319-325 returns 0 on the repeal day. Moderator (`only-when`, expansion law) scales the effect to 0 in SC.

## Verdicts

1. Seeded roll decided an actor's outcome? **No.** No random, rng or seed in law-reach, law-effects or outcome-web (grep empty). The fixed 0.066 share sets a counted group's size (group-a-records.ts:400-402), not any person's outcome.
2. Flip at a threshold? **Yes, statutory.** group-b-people.ts:239 (weekly minutes at or above 80 hours a month), 245-247 (income at or above 1.38 times poverty), 250-252 (child under 14). outcome-web.ts:319-325 drops the effect to 0 the day the law returns to baseline. The on/off cycle itself comes from ordinance data, not a roll.
3. Record no other engine reads? **Yes.**
   - group-b `people` and `groups` (group-b-store.ts:142-173): read only by `reconcile`.
   - group-a `reach` (group-a-records.ts:431-447): `openReach` and `reachOn` have no callers outside the file.
   - `law-reach:*` knowledge (group-b-store.ts:232; group-a-records.ts:529, 553): no reader. bring-it-up reads only `organization:` keys (src/director/data/bring-it-up.json).
   - outcome `landings`: `outcomesOn` (outcome-web.ts:629) has no callers. Only `electorate-inputs.ts:130-139` reads outcomes, and only for unemployment and crime.
4. Shortcut without a registered stopgap? **No.** SG-GOV-REACH-A-citizenship (reach-group-a.json:517), SG-GOV-REACH-B-medicaid-coverage (reach-group-b.json:73) and SG-GOV-REACH-B-preschool-enrollment (reach-group-b.json:121) are open rows in stopgaps.json and appear in stopgap-hits.json. Registration is not the problem; the missing readers are (verdict 3).
5. Player-visible zero or UNKNOWN? **No, not on any screen.** The zeros above are stored, not shown. card.ts:109-121 shows only `applied` rows, which are empty for these laws. The only visible trace is news: 25 non-vote Medicaid `law-took-effect` stories (end-news.json).
6. State, city or GEOID in logic? **No.** grep for US-SC, 45031, Lydia, South Carolina and 4543135 in law-reach, law-effects and outcome-web: nothing.
7. Mechanic outside the golden path, the baseline and owner requests? **Not established.** The baseline's "City, state and federal legislation" row (political-process-baseline.md) covers this. The 287(g) duty that police "must hold people for immigration agents" (reach-group-a.json, partner-with `department` spec) is a compliance mechanic not named in the baseline; flagged for the owner. Golden-path coverage not checked (not reached).

## Defects

- Medicaid rule ignores the state's expansion status | group-b.ts:75 / reach-group-b.json:75-80, group-b-people.ts:213 | `us-policy-positions:health-human-services.medicaid-work-requirement`, 17 `b.people` rows | Named adults in SC (US-SC `expand-medicaid-eligibility` = 0, from 2024-07-01) are reached. The outcome web's moderator (links.json, `work-requirement-to-coverage`) gives 0 in the same place. The two engines disagree.
- Reach records and landings have no reader | group-b-store.ts:142; group-a-records.ts:431; outcome-web.ts:462-500, 629 | `b.people`, `a.reach`, `landings` | Nothing a person or screen sees changes; the work-requirement and preschool effects are stored and never read.
- Monthly web row overwritten by each law flip | outcome-web.ts:371, 379-381 | `web:jurisdiction_f92f7c24c5ae7a8c:<month>` | One row per month is replaced on every flip. E-outcome-web months are dated 03-21, 04-20, and so on, so the monthly reading depends on which day of the 15-day cycle last ran.
- Named reach can lag records up to a month | group-b.ts:529-547, group-b-store.ts:249-257 | `b.people` for person_e21f852c93ddac80 | Commitments start 2025-07-08 (commitments.json); the record stays until the 2025-07-19 repeal. Monthly review by design; minor.
- Not checked | — | — | Why person_da356e79ce29a6bf (no commitments) drops out after 2025-08-18; the 10080 counted-resident figure; preschool ages of the named three (not in people.json).
