# P1: why the county bills were proposed and by whom

## Record at the end

- 2025-001 (enact immigration partnership), sponsor person_df7360cd247fc890, introduced 2025-02-04, 4 cosponsors, floor index 0 of floorTime 5. Vote 5 yes, 2 no. Status enacted. Law row effective 2025-03-06 (lawTookEffect confirms).
- 2025-018 (repeal), sponsor person_0692d7c8305dc27d, introduced 2025-02-19, 2 cosponsors. Vote 4 yes, 3 no. Status enacted. Repeal row effective 2025-03-21. The county's immigration law was in force 15 days.
- Session list in the target holds 4 sittings (02-04, 02-19, 03-06, 03-21), each floorTime 5. lawRows for county: 55 rows through 2026-03-16, one enact or repeal per policy every 15 days, sponsors alternating between the two members above.

## Decision points

1. `world-legislating.ts:localMeeting` (578-626): `needsChange` enacts only where `!inForceForTown`, repeals only where `ownRow(county)===1` (614-617). `ownRow` (257-268) takes the latest row by effectiveDate and ignores whether it has taken effect. Numbers: `floorDays: 1` (609) hard-coded; `billsPerFloorDay = floor(localMeetingAgendaMinutes 150 / policyOrdinanceMinutes 30) = 5` (610-612, both TUNABLE); meeting gap `365/localRegularMeetingsPerYear 24` = 15 days (`scheduleMeeting` 667-, TUNABLE).
2. `holdSession` (362-470): sign gate `if (reason <= 0) continue` (401); sponsor = max reason, ties by key (404-411); sort by cosponsors then leader reason (418-424); `reached = index < floorTime` (442). Dies at adjournment via `dieOnCalendar` (472).
3. `filingReason` (331-337): `(stance + constituentWeight(0.5, TUNABLE) * personStance(home)) * direction + f.trait`. `stance` = `officialStance ?? personStance(lean)` (`campaign-views.ts:231`, lean times axis). `lean` is rank-based from traits (`campaign-views.ts:171-230`), with a seeded household draw (`campaign-views.ts:110-120`, a generation draw). `home` = town lean for town members (`world-legislating.ts:314`). `trait` = traitDecisionWeight x decisionLean("bring-agenda") (315-318); its tag was not checked.
4. `recentlyDefeated` (629-665): `defeatedMeasureWaitDays` 180 (TUNABLE). Bars a repeat only when `fate === "voted"` and status is not enacted, overridden or awaiting-signature (658-662).
5. `draftBill` (`legislature.ts:768-815`): level is `local` (regex 781), so `authorityFor` runs. Policy branch (`legislature.ts:625-707`): allowed unless the state's answer has `preempts` (SC has none). Warning `disputed` for any recorded answer (697). Status `blocked` only if not allowed (809). SC answers: immigration `answer:"no"`, Medicaid work requirement `answer:"no"` (`data/research/laws/starting-law-2026/*.json`).
6. `holdVote` (`legislature.ts:1616-`): `committeeStage` returns null when members are at or under `committeeOfTheWholeMaximum` 9 (`legislature.ts:1465`, ESTIMATED). A 7-member board has no committee. Each member's vote is `positionOn` (1082-1160): views = personStance x position; constituents = 0.5 x personStance(townLean) x position; sponsor term hard-coded 1 for the sponsor (1128-1131); trait = traitDecisionWeight x decisionLean("member-position", "yes", "no") (1133), not multiplied by the position. Pass when yes > no.

## Verdicts

1. Seeded roll decided an outcome? **No.** The only seeded draw is the opening lean (`campaign-views.ts:110-120`), which is generation of who exists.
2. Flip at a threshold? **Yes, by sign only.** Filing gate `reason<=0` (world-legislating.ts:401), `needsChange` sign (542, 614), majority `yes > no`, floor cut `index < floorTime` (442). No monthly chance. The repeat cycle comes from these gates on a fixed lean against a changing law.
3. Record no other engine reads? **Yes.** The `sessions` rows (floorTime, floorDays, leader, cosponsors, bill fields) are written at `world-legislating.ts:~450-470`. Only `recentlyDefeated` (629-665) reads them. No other src/core2 reader found. Bench/UI not checked.
4. Shortcut without registered stopgap? **Not confirmed.** `SG-GOV-township-law-level` and `SG-GOV-committee-structure` are registered in `src/core2/data/stopgaps.json`. The committee row's `line` is 1395 but the code is at 1467 (stale). The town-lean-as-constituents shortcut (`world-legislating.ts:314`) was not matched to a registration. Committee path not reached for a county board.
5. Player-visible zero/UNKNOWN? **Not reached.** Policy bills carry `costEstimate` `{workersRaised:0, annualPayMinor:0, note:"no pay effect"}` (`legislature.ts:723-730`). Screens not checked.
6. State, city or GEOID in logic? **Not on this path.** `NON_VOTING` (`legislature.ts:834-840`, US-DC, US-PR, etc.) is used only at 879, in the Congress path.
7. Mechanic outside golden path, baseline or owner request? **Yes, as a play loop.** `docs/roadmap/political-process-baseline.md` has no bill, floor or filing entry (grep for floor, filed, bill: no match). The owner's golden path has the player propose an ordinance, not the bodies re-filing repeals every 15 days. Not verified against the owner's wording.

## Defects

- Vote trait ignores direction | `legislature.ts:1133` (in `positionOn`, total at ~1150) | 2025-018 vote, person_0692d7c8305dc27d sittings: person_df7360cd247fc890 (247fc890) views -0.121 against repeal, trait +0.248, total +0.110, voted YES on the repeal of its own enactment. 0d2fb481 voted yes on both 2025-001 and 2025-018 (trait +0.080 both times).
- Filing trait ignores direction | `world-legislating.ts:336` (`f.trait` added outside `* direction`) | Any member with a positive bring-agenda trait files or cosponsors either direction. Cosponsor counts (4 and 2) are not verified against the engine.
- No stability rule after enactment | `world-legislating.ts:629-665` (`recentlyDefeated`) | 2025-001 enacted 02-04, in force 03-06, repealed by 2025-018 (enacted 02-19, effective 03-21). Enacted measures bar nothing, so the cycle repeats every 15 days. Design gap, not a bug.
- "City attorney" for a county, and wrong reason | `legislature.ts:697-699` | `disputed` fires on any recorded answer, and the reason says "the state has its own law" even for SC's immigration answer, whose note says no state law exists.
- No level test for policy questions | `legislature.ts:625-707` (policy branch), `beyondPower` 752 (law-amount only) | County passes a Medicaid work requirement (2025-002 enacted, authority disputed). Medicaid eligibility is a state and federal program. Immigration partnership is set by the sheriff, not the board. Authority is not sound for a county.
- Stale stopgap line | `stopgaps.json` SG-GOV-committee-structure line 1395 vs code 1467.
