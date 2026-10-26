## Record at the end

Lydia, SC world (targets/README.txt; meta.json). Law rows in D-laws-all.json: 198 total: US/federal 24, US-SC/state 70, US-SC/federal 6 (SNAP max, Medicaid match, per-state rows), county:45031 98. Federal bills in B-federal.json: 55, all with bodyOfficeId "office:US-SC:us-house"; sponsors include official:seat:US-OH:us-senate:0, official:seat:US-MO:us-house:07, official:seat:US-IL:us-house:11. I did not check the 400-day run beyond these files.

## Decision points

- laws.ts:311 lawChain: reads the state from the place record (laws-starting.ts:84-89 `place.stateJurisdictionKey`). Data-keyed, works for any place.
- laws.ts:166-168 minimumWageHistoryRows: `WAGE_HISTORY.places[stateKey]`. Data (minimum-wage-history file, SOURCED/ESTIMATED per row).
- laws-starting.ts:124 `data.jurisdictions[jurisdiction]`. Data (starting-law.json).
- world-legislating.ts:90 and :147/:558 `sessionRows[stateKey]`. Data (state-session-calendars, SOURCED; carried-forward dates ESTIMATED, :95-104).
- world-legislating.ts:155 `Math.max(2026, ...)` floor on full-year session dates. Hard-coded.
- world-legislating.ts:219-227 houseOffice: first office with kind starting "us-house". Structural lookup.
- legislature.ts:834-841 NON_VOTING: six place keys. Hard-coded place list in logic.
- legislature.ts:865-885 congressMembers: iterates every state in `partyCounts.congress` (roster data, SOURCED). Membership is national.
- legislature.ts:1966-1973 state act effective date: `stateActEffectiveDate` or `campaignParameter("ordinanceEffectiveDays")` (TUNABLE) fallback.
- state-effective-date.ts:49 `SUPPORTED` set; unsupported kind returns null. Data: local-starting-law/state-effective-dates.json (US-AL kind "first-of-month-after").
- executive.ts:325-328 and :542-545: state cabinet and executive orders return if no `governor` seat. Hard-coded role name.
- business.ts:1376-1378 BDS exit rate: `BDS.states[FIPS]?.exitPct ?? BDS.nationExitPct`. Data (bds-rates.json), national fallback unlabeled.
- budgets.ts:57 `LOCAL_SPLIT.states[...] ?? national`. Data with fallback; coverage not checked.
- purchase-tax.ts:59-62 setPurchaseTax: rate comes from the caller's input (law rows); no state branch.
- outcome-web.ts:115-122 stateKeyOf: GEOID prefix into regions data (data-driven).

## Verdicts

1. Seeded roll or fixed percentage decided an actor's outcome? NO. No random/chance/seeded draw in the listed files (grep). Seeded cabinet generation is allowed (executive.ts:555-565).
2. Anything flips at a threshold? NO defect found. Majority/committee rules are structural counts (legislature.ts:1487-1503). Not fully audited.
3. Record written that no other engine reads? NOT ESTABLISHED. Executive "review seed" (executive.ts:134) is read back at executive.ts:555-558; other records not traced.
4. Shortcut without a registered stopgap? YES. Silent fallbacks with no `stopgap(` call: business.ts:1376-1378 (5 territories, see defect 5); legislature.ts:1966-1973 (AL rule kind); executive.ts:325-328 (DC has no governor). All 33 SG ids referenced in the listed files are registered in src/core2/data/stopgaps.json (checked).
5. Player-visible value zero or UNKNOWN? NOT REACHED. Screens not checked.
6. State, city or GEOID named in logic? YES. legislature.ts:834-841 (US-DC, US-PR, US-GU, US-VI, US-AS, US-MP). Outside the listed files, same pattern on the offices path: offices-state.ts:121, :356, :397, :406, :412, :418. No city names, no 5/7-digit literals in the listed files (grep). Other hits are comments or the word "stateKey".
7. Mechanic nobody asked for? NO evidence found.

## Data coverage (56 keys)

- state-session-calendars-2026.json regularSessions: 56/56 present. sessionEnds: 21 keys only; missing US-SC, US-PR, US-GU, US-VI, US-AS, US-MP, US-CA and others. Read by state-effective-date.ts:52 with `?? []`, a silent empty fallback.
- minimum-wage-history-2000-2026.json places: 56/56. US-SC is `noStateMinimum`. US-AS is `industrySpecific`.
- starting-law.json jurisdictions: 56/56 state keys (317 keys in total, 261 county).
- policy-answers (data/research/laws/starting-law-2026/*.json, 59 questions): 57 answers for each of the 56 keys. None missing.
- state-offices.json places: 56/56. US-DC has no governor (executives: mayor, attorney-general, council-chair, state board president). Territories have governors and chambers.
- local-starting-law/state-effective-dates.json: 56/56. US-AL uses unsupported kind "first-of-month-after".
- bds-rates.json states: 51. Missing: FIPS 60, 66, 69, 72, 78 (AS, GU, MP, PR, VI).
- public-budget-bases.json places: 56/56.
- legislature-party-counts-2026.json congress: 56/56. Places lack the four territories (not used for them).

## Part (c): federal bill office

The id is built in offices-state.ts:396 as `office:${stateKey}:us-house`, where stateKey is the town's state. Only one us-house office exists per world. world-legislating.ts:219-227 and legislature.ts:505 find it. Membership is not state-keyed: legislature.ts:865-885 seats all 56 places from the roster. So the office id is a filing label naming the player's state. Sponsors from OH, MO and IL are correct. Verdict: membership is national, the filing label is keyed to the player's state.

## Part (d): territories and D.C.

- Sessions: all six have regularSessions rows (state-session-calendars-2026.json). The sessions run through world-legislating.ts:90.
- Governors: the five territories and the states have governors in state-offices.json. D.C. has none (defect 8).
- Laws: starting-law and minimum-wage rows exist for all six. Read by the same paths.
- Voting: NON_VOTING (legislature.ts:834-841) excludes the six from final passage. The data already marks delegates with kind "us-house-delegate" (offices-state.ts:404).

## Defects

1. Places named in logic, not data | legislature.ts:congressMembers via NON_VOTING (834-841, used at 879) | six keys | Delegates excluded by a name list. Use the office kind `us-house-delegate`.
2. Places named in logic | offices-state.ts:stateOffices/federalOffices (121, 356, 397, 406, 412, 418) | US-PR, US-DC, territories | Territory rules hard-coded (PR 4-year term, delegate status).
3. Federal House label keyed to the player's state | offices-state.ts:396; world-legislating.ts:houseOffice (219-227); legislature.ts:505 | office:US-SC:us-house, B-federal bills 55 | Membership is national; the bill's body label carries the player's state.
4. Unsupported effective-date rule, silent fallback | state-effective-date.ts:stateActEffectiveDate (49); legislature.ts:1966-1973 | US-AL, "first-of-month-after" | Alabama acts use the generic ordinance default, no stopgap.
5. Unlabeled national fallback | business.ts:1376-1378 | FIPS 60, 66, 69, 72, 78 (territories) | Territory exit rate is the national average, not tagged, no stopgap.
6. Silent dead branch | executive.ts:328, 545 | US-DC | No state cabinet or executive orders in D.C.; no stopgap or record.
7. Hard-coded year floor | world-legislating.ts:155 | all places | `Math.max(2026, ...)`; minor.
8. Missing session ends | state-effective-date.ts:52 | 35 keys with no sessionEnds, including US-SC | Returns [] silently; ESTIMATED-from-average rule not applied.
