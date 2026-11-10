# Stand-in triage: legislature (Nov 10, 2026)

Rows: 4. Still faked 4, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 2, research 1, data 0, design 1, owner call 0. New items: 0.

| Stand-in                                              | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                                                             | In plain words                                                                                                                                            |
| ----------------------------------------------------- | ----------- | -------------- | -------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SG-LEGISLATURE-phase-in-percent-a-year                | still faked | design         | none                                         | M    | yes: dated steps (item play-draft-phase-in-steps, open) can write any yearly path; the percent form is a convenience. | A bill you draft can raise an amount in dated steps you name, but cannot say 'raise it by a percent every year'.                                          |
| SG-LEGISLATURE-dated-budget-line-amended-on-enactment | still faked | code           | none                                         | M    | yes: seatAct refuses a dated phase-in on a budget line with a clear message, so nothing lands wrong.                  | A budget line in a bill takes effect the day the bill passes, whatever date the bill gives it, so a budget phase-in over several years cannot be drafted. |
| SG-LEGISLATURE-cosponsors-player-bills                | still faked | code           | none                                         | M    | yes: a player reads only their own bill; speed bar forbids reading every member's position daily.                     | Only the bills you sponsor get a list of cosponsors; other members' bills show none.                                                                      |
| SG-LEGISLATURE-study-committee-terms                  | still faked | research       | research-study-committee-size-and-term (new) | S    | yes: marked TUNABLE; real committees vary by body, so a sourced spread is a refinement.                               | When a bill narrowly fails, a study committee of five sits for 180 days; both numbers are guesses and no outsiders join.                                  |

## Evidence

- `SG-LEGISLATURE-phase-in-percent-a-year`: src/bench/legislature.ts:287-320 (seatAct accepts input.steps only; no rate or span; marker at 297). Related open item play-draft-phase-in-steps covers the step UI, not the percent. Cheap: steps are drafted once, read on the calendar.
- `SG-LEGISLATURE-dated-budget-line-amended-on-enactment`: src/core2/modules/legislature.ts:6162-6170 (amendBudget called with no date, marker at 6162); src/bench/legislature.ts:304-310 refuses steps on a budget line. Close: schedule the section on the module calendar, apply when it lands.
- `SG-LEGISLATURE-cosponsors-player-bills`: src/core2/modules/legislature.ts:2157-2179 (cosponsorsFor returns [] unless bill.sponsorId is the player; marker at 2202). Cheap: sign on the day of introduction by counts.
- `SG-LEGISLATURE-study-committee-terms`: src/core2/modules/legislature.ts:4941-5011 (referToStudy; studyMembers and studyTermDays from campaignParameter, marker at 4941); src/core2/data/campaigns/parameters.json:405-412. Research only; no speed cost.

## Questions for the owner

None.
