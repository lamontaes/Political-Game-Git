# P9: Outcome web, news and bring-it-up (Lydia SC, seed 1791948706110-ab2db744ab80, head fd3574c9)

## Record at the end

- Web (end dump `out400b/tables/end-core2-outcome-web-v1.json`): 14 month rows, 5418 landings, 452 nonzero. Every nonzero landing comes from unemployment (7 links) or poverty-to-math. No law link produced a nonzero effect.
- County immigration partnership (24 flips): its 3 web links wait on unbuilt measures (`src/core2/data/outcome-web/coverage.json`, waiting). Its only effect is 24 group-A reach rows with mechanic "none" (`src/core2/data/laws/reach-group-a.json`, policy `partner-with-federal-immigration-enforcement`), read by nothing. Record: `reach:law:county:45031:...partner...:2025-03-06:2025-001:department:organization_e9d2311ac55c441e:2025-03-06`.
- County medicaid work requirement (25 flips; federal row 2025-12-15 value 0): `work-requirement-to-coverage` is wired to `health.uninsured-pct`. Its 35 landings are all 0. No group-A entry exists.
- County universal preschool (22 flips): `universal-childcare-to-mothers-work` (7 landings) and four `universal-prek-*` links (15, 15, 15, 10 landings) are all 0. Their lags are 117 and 168 months, longer than the 14-month run.
- Federal 2025-12-15 batch (12 law rows): balanced budget leaves `gov.borrowing-cost` at 6 because the law was already 1 at calibration (`outcome-web.ts:baselineOf`, realOnly). Restrict-abortion and the other federal rows moved nothing.
- Web readers: only `src/core2/electorate-inputs.ts:127-148` (unemployment and four crime measures), feeding `electorate-blocks.ts:554-566`. `outcomesOn` (`outcome-web.ts:629`) and `outcomeWebFactor` (`:618`) have no callers. No bench or director file reads the web.
- News: 111 law-took-effect stories of 2063. 1038 heard rows across 85 people. The player heard 64 of the 71 flip stories.
- Views: 304 stances, none law-caused.

## Decision points

1. `outcome-web.ts:recordMonth` and `outcome-web-model.ts:linkEffect`: cause value minus baseline times the researched size (`links.json`). Base levels from `baseOf` are SOURCED where the place reports, ESTIMATED from the ledger or median otherwise. No draw.
2. `outcome-web.ts:effectOf` (308-323): lag from `lagMonths`, law history, and the "outlast" rule that zeroes a law's effect the day it is back at baseline. Per-link lag tags: not reached.
3. `outcome-web.ts:lawValue` (166-194): 1 if any level's latest in-force row says yes. Read from `laws` module rows, falling back to the web's own copy.
4. `news.ts:onEvent` (340-371): reach = engagement times trust over average; delay = `newsOutletDelayDays` (TUNABLE 1) over reach; cut at `newsMaxAgeDays` (TUNABLE 30, spread 14 to 60). Trust constants are SOURCED (0.54, 0.27, 0.12; average 0.31).
5. `views.ts:viewOf` (194-240): CES 2024 cell (SOURCED) plus seeded draws; formed once. `views.ts:onEvent` (263) ignores events without a topic; law events have none.
6. `law-effects.ts:applyLaw` (221-236): 5-entry catalog plus group-A handlers (41 policies, 24 mechanic "none").
7. `electorate-blocks.ts:554-566`: `localUnemploymentShare` 0.003 ESTIMATED.

## Verdicts

1. Seeded roll or fixed percentage decided an actor's outcome? **No.** No uniform, normal or random call in `outcome-web.ts` or `news.ts`. Seeded lean and engagement draws at `views.ts:200-222` are trait generation. `place-outcome-bases-2024.json` `defaultDrift.waveMonthlyChance` (0.00125) is data that no code reads.
2. Anything flips at a threshold? **Yes.** `outcome-web.ts:316-323`: the effect drops to 0 the day the law is back at baseline. `outcome-web.ts:194`: laws are binary. `news.ts:371`: hard cut at max age.
3. Record written that no other engine reads? **Yes.** `outcome-web.ts:629` (`outcomesOn`) has no callers, so 5418 landings are read by nothing. Months for `health.uninsured-pct`, `school.*`, `labor.mothers-participation`, `crime.violent`, `gov.borrowing-cost` and `births.rate` are read by nothing. `group-a-records.ts:440` (`reachOn`) has no callers.
4. Shortcut without a registered stopgap? **Yes.** `outcome-web.ts:539-552` (`recordLaw`) writes a second copy of each law into the web's own `laws` table, read by the fallback at `outcome-web.ts:178-181`. No row in `stopgaps.json`. `SG-WEB-outcome-drift` is registered (`stopgaps.json:2628`).
5. Player-visible value zero or UNKNOWN? **Yes.** `src/bench/changes.ts` `lawsTook` reports `reached: 0` for partner, medicaid and preschool, because `end-core2-law-effects-v1.json` holds only 239 right-to-counsel rows. `play.mjs:1344-1348` shows raw "1" and "0" for yes/no laws. `government.ts` shows `value: 0` for `law:US:federal:...medicaid-work-requirement:general:2025-12-15:2025-004`.
6. State, city or GEOID named in logic? **No** in the 12 files checked (`US-SC`, `45031`, Darlington, SC). `laws.ts:166,260` use "US" as the federal level key only.
7. Mechanic neither needed by the golden path, the baseline nor the owner? **Yes, partly.** Per-person landings for 101 links that nothing reads (`outcome-web.ts` `land`). The group-A "mechanic none" reach rows. Baseline mapping (`docs/roadmap/political-process-baseline.md`): not reached.

## Defects

- Effect is a read (landings): `outcome-web.ts:land`, `outcomesOn` (629) | `landing:work-requirement-to-coverage:person_b380e76578a5c9ab` | 0-effect rows nothing reads.
- Effect is a read (group A): `group-a-records.ts:reachOn` (440); `reach-group-a.json` partner entry, mechanic "none" | `reach:law:county:45031:...partner...:2025-03-06:2025-001:department:organization_e9d2311ac55c441e:2025-03-06` | compliance duty written, read by nothing.
- Law with no effect path: `law-effects.ts:224` (catalog check); no medicaid or preschool entry in `reach-group-a.json` or `policy-effects.json` | `law:county:45031:...medicaid-work-requirement:general:2025-03-06:2025-002` | What-changed shows "reached 0".
- Repeal reported as enactment: `laws.ts:435-452` (no value check) | `law-took-effect:...medicaid-work-requirement:general:2025-03-21:...` (value "0") | 36 of 71 flip stories are repeals.
- Flip-flop source rows marked not estimated: `D-laws-all` county partner rows, 26 alternating 1/0 with `estimate: false` and "Ordinance 2025-0xx" sources | `law:county:45031:...partner...:2025-03-21:2025-018` | generator not traced.
- Story says only "took effect": `news.ts:340`; journal has one law line (`director/data/journal.json:399-405`, minimum wage); other law stories are dropped at `director/journal.ts:462` | `law-took-effect:...universal-preschool:general:2025-03-21:2025-019` | 110 of 111 stories have no words.
- People never bring up laws: `director/data/bring-it-up.json` `changes` has one row (`organization.closed`); `bring-it-up.ts:53-85` | none | no law or web change can be brought up.
- Views never respond to law: `views.ts:263`; `laws.ts:436-452` sets no topic | 304 stances, 0 law-caused | no view changes on enactment or repeal.
- Lags longer than the run: `links.json` `universal-prek-*` lagMonths 117 and 168 | `universal-prek-to-graduation` | preschool cannot move any outcome within 14 months; no stopgap.
- Duplicate law store: `outcome-web.ts:539-552` | `E-outcome-web.laws` (111 rows) | unregistered copy.
- Registry mismatch: `stopgaps.json:2628-2636` says `outcome-web.ts:451`; the call is at `:513`.

Not reached: baseline mapping, per-link tags in `links.json`, the flip-flop generator, the journal fallback beyond `journal.ts:462`.
