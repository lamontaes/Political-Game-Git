# Tappen, North Dakota — one year (seed 76207b0b9fcd)

The one-year trace for Tappen shows a player with no recorded choices, a council seat that was never refilled, and state and federal vote counts that repeat across many bills. Most of the items below need an explanation from the engine before the run can be trusted.

## The year

Lucas Ramirez (person_19565c43329f0de2) is the player. On January 20, 2025 he was 17, a server with $4,271 in cash. The file shows no filing, campaign or vote by him.

Locally, one town council seat was vacated on February 1, 2025, when its holder moved away. No appointment to it is recorded. The council organized on February 4, 2025, with person_6e0409cab77daa8b as president. Its February 4 votes on measures 2025-001 and 2025-002 have per-person positions but no tally. A fire chief was appointed on February 19, 2025. The 2026 town budget was adopted by a council vote of 4-1 (2026-001), recorded January 1, 2026. Two businesses closed, on July 1 and December 1, 2025. One death (March 3, 2025) and six moves are recorded. No births are recorded. No election was held.

At the state level, lower-house votes were recorded on May 2, 2025. Bill 2025-001 (public funds for private schooling) drew 87-7 in the lower house and 43-4 in the upper house; most other bills drew 83-11 and 42-5. The legislature adopted the fiscal 2025 budget on July 1, 2025, by 83-11 and 42-5. Six state laws took effect on August 1, 2025: private-school funding, same-day voter registration, the graduated income tax (recorded as "ended"), groundwater withdrawal limits, a teacher minimum-salary raise and photo ID to vote. Governor Timothy Vaughan and Lieutenant Governor Jennifer Miller began terms on January 1, 2025. No executive act is recorded. Three lower-house seats were vacated (November 1 and 19, 2025, and January 1, 2026); none is recorded as filled.

At the federal level, Sandra Hogan (Republican) became president on January 20, 2025, with Heidi Villanueva as vice president. Congress adopted the federal budget on October 1, 2025 (House 256-177, Senate 70-30, amended). The House voted 271-162 on bill 2025-016 on December 15, 2025. House bills in the file ended with 3 enacted, 20 failed and 2 vetoed. A 37 percent top income tax rate and a 6.2 percent Social Security tax took effect on January 1, 2026.

## Needs a why

1. **A U.S. House seat is recorded as a town council president.** A chamber-organized record dated December 15, 2025 sets `"council-president":"official:term:seat:US-ND:us-house:00:2025-01-20"`. The town council's president on February 4, 2025 was person_6e0409cab77daa8b. Why does a federal seat hold a local role?

2. **The living count does not match the recorded exits.** The year summary shows 1,872 people, 1,858 alive, so 14 people are not alive. The records show one death (`life.death`, person_b0cadea84ce443e2, March 3, 2025) and six `person.moved-away`. Why are 14 people not alive when only seven exits are recorded?

3. **A council seat was vacated and never refilled, and the 2026 budget passed 4-1.** `seat-vacated` on February 1, 2025 for `seat:gus2025:171407:council:1` (office `office:gus2025:171407:council`), rule "appointment." The only appointment in the file is the fire chief (February 19, 2025, person_b0cadfa84ce44595). `budget-adopted` for `budget:place:3877980:2026`, dated January 1, 2026, records "the council vote 4-1, 2026-001." Who filled the seat, and how did a 4-1 vote happen?

4. **Council votes have no tally, and the vote lines repeat.** On February 4, 2025, `vote-recorded` for measureId 2025-001 (partner with federal immigration enforcement, position 1) appears six times, all identical. measureId 2025-002 (universal preschool) shows position -1 five times and position 1 once. No council tally is recorded for either measure. The only tally is the public-comment record `bill:office:gus2025:131857:board:2025-02-04:person_6e0409cab77daa8b:1` (for 0, against 1).

5. **The same tallies recur across different bills.** `legislative-vote` on May 2, 2025 shows 83-11 (lower) and 42-5 (upper) for bills whose billIds end `:026:0:2025-01-20:3`, `:4`, `:6`, `:7`, `:8` and `:9`. Example: `bill:office:US-ND:legislature-lower:2025-05-02:official:term:seat:US-ND:lower:026:0:2025-01-20:3`. The July 1, 2025 state budget (`budget-adopted`, governmentId US-ND) reports the same 83-11 and 42-5. Why do unrelated bills and the budget share identical counts?

6. **Nearly every committee hearing is 10-1.** 28 `committee-hearing` records on May 2, 2025 show yes 10, no 1. Examples: the lower-chamber general committee (chair `official:term:seat:US-ND:lower:045:0:2025-01-20`) on billId `...lower:026:0:2025-01-20:2`, and the upper-chamber committee (chair `official:term:seat:US-ND:upper:022:0:2025-01-20`) on the 2025-001 bill. Why are nearly all hearings the same count?

7. **Bills held in committee show 0-0 tallies.** 33 `bill-held-in-committee` lines on May 2, 2025 show yes 0, no 0, all with chair `official:term:seat:US-ND:lower:045:0:2025-01-20`. Examples: `bill:office:US-ND:legislature-lower:2025-05-02:official:term:seat:US-ND:lower:011:1:2025-01-20:20` and the same prefix ending `lower:04A:0:2025-01-20:23`. The year total is 46. Why were these held with no hearing count, all on one day?

8. **District id "04A" is not numeric.** 24 of the held bills are sponsored by `seat:US-ND:lower:04A:0`, for example the bill ending `lower:04A:0:2025-01-20:23` in item 7. Is 04A a real district, or a malformed id?

9. **Bills that passed both chambers have no law record.** Bills 2025-007 (public broadband), 2025-008 (restore voting after sentence), 2025-012 (age verification for social media) and 2025-013 (Medicaid work requirement) show lower-house tallies of 83-11 or 82-12. Their upper-house tallies are 42-5 or 41-6. All were recorded on May 2, 2025. The file has law-took-effect records only for 2025-001 through 2025-006. The lower house's status count shows 18 enacted. Were these four enacted? If so, when did they take effect?

10. **The graduated income tax was repealed by a bill that voted yes.** Bill 2025-003 (fiscal.graduated-income-tax) recorded 83-11 (lower) and 42-5 (upper), but the members' recorded positions are -1. `law:US-ND:state:us-policy-positions:fiscal.graduated-income-tax:general:2025-08-01:2025-003` took effect on August 1, 2025 with change "ended" and value 0. Which way did the vote go, and what was the tax before?

11. **Three lower-house seats were vacated and none is recorded as filled.** `seat-vacated` for `office:US-ND:legislature-lower`: `seat:US-ND:lower:045:0` on November 1, 2025 (moved away); `seat:US-ND:lower:002:1` on November 19, 2025 (death); `seat:US-ND:lower:035:0` on January 1, 2026 (moved away). All three use the "appointment" rule. Seat lower:045:0 was also the chair of the general committee for the May 2025 hearings. Who filled these seats?

12. **No election was held, and the election tables are empty.** `core2-elections-v1.contests` shows 0 of 36. `core2-elections-v1.vacancies` is an unregistered module table. The only election-type record is the fire-chief appointment (February 19, 2025). Why are there no contests this year?

13. **The state executive offices record no action.** Governor Timothy Vaughan (`term:seat:US-ND:governor:2025-01-20`) and the other seven state executive terms serving on January 20, 2025 record no act. `core2-executive-v1.offices` and `core2-executive-v1.terms` are unregistered module tables. Why does no executive office act in a year?

14. **The player is 17 and has no recorded choices.** person_19565c43329f0de2 (Lucas Ramirez) was born January 25, 2007, so he is 17 on January 20, 2025. No filing, campaign, vote or `office.approached` record names him. The year reports `office.approached`=11 and `office.replied`=11 with no person attached. Is the age intended, and where are the player's choices?

15. **A town budget line changed by $8.73.** `budget-line-changed` for `budget:place:3877980:2026`, line welfareAndMedicaid, deltaMinor=-873, dated January 1, 2026. It is the only local budget line in the file. The state's lines for the same year run into the billions of minor units. Why is the town's change so small?

16. **Many records share one date, January 1, 2026.** The town budget, the town welfare-line change, the county property-tax law (`law:county:38043:county:property-tax:general:2026-01-01`), the council bill (`office:gus2025:171407:council`), the board bill (`office:gus2025:131857:board`), the federal income-tax and Social Security laws, and the lower-house vacancy at `seat:US-ND:lower:035:0` all carry that date. Is the shared date by design, or defaulted?

17. **Two federal vetoes with no veto record.** `office:US-ND:us-house` shows 24 bills dated December 15, 2025 and "vetoed: 2." No veto record or veto kind appears in the file's record list. Why are vetoes counted without a veto event?

18. **Two closures with near-identical organization ids.** `organization.closed` on July 1, 2025 for `organization_cc6f234937dbf722`, and on December 1, 2025 for `organization_cc6f244937dbf8d5`. Both closing reasons read "losses-kept." Are these two businesses, or one id mistyped?

No error lines (lines starting "!!" or "Error") appear in the file.

## Counts

Header line:

```
Tappen, North Dakota seed 76207b0b9fcd start 2025-01-20 built in 47s people 1783 orgs 113
```

Year line:

```
year 1: 2025-01-20 -> 2026-01-20  79s  heap 1720MB  people 1872 alive 1858 orgs 137
```

Records this year: 26083

Top 10 record kinds:

| Kind                   | Count |
| ---------------------- | ----- |
| person.acted           | 24752 |
| case.made              | 392   |
| cause.volunteered      | 185   |
| news.read              | 176   |
| vote-recorded          | 93    |
| speech.retold          | 84    |
| cause.shared           | 78    |
| committee-hearing      | 56    |
| legislative-vote       | 51    |
| bill-held-in-committee | 46    |
