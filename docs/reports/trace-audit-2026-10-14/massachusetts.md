# Massachusetts: Southbridge Town, seed 9ff7c242b94b

The council lost all five of its members to moves during the first three months, and the file shows no one filling the seats, yet the council kept recording votes and a budget. The mayor's race recorded more votes than the town has living residents. Most of the year's numbers need a why before anyone trusts them.

## The year

Southbridge Town ran one game year, from January 20, 2025 to January 20, 2026.

The town council began with five members. Between February 1 and April 1, 2025, all five seats were vacated, each recorded as "moved away." The file shows no council seat refilled by appointment. The council kept voting anyway: four bills on February 4, one on March 6, a budget on July 1, three bills on August 18, and one on September 17. Several of those votes count five members, which is more than the seats still filled in the file.

The mayor's office was decided in November. On November 4, the only candidate with a recorded total was person_b302056703fe9be4, with 3,894 votes. That same person had already appointed a city attorney and a police chief in February, and a fire chief and a planning head in March. Council contests for seats 0, 2 and 4 on November 4 show no winner and no votes. Seats 1 and 3 have no contest at all. On December 15, the council president is recorded as a U.S. House member for Massachusetts district 8.

The town's population record shows 2,002 people at year end, 1,998 of them alive. The file records zero deaths. The organization count rose from 128 to 146, with three closures and no founding records to explain the rise.

The state legislature organized in January and again on June 30. On June 30, the lower chamber introduced 54 bills, held 58 votes, and held every hearing in a committee named "general." The lower chamber passed same-day voter registration 134 to 25 and a restriction on abortion 123 to 36. The upper chamber voted on ten measures and introduced none. Five state seats were vacated under a "special-election" rule, and the file shows no special election. The state budget passed July 1, with a 134-25 lower vote and a 35-5 upper vote.

At the federal level, the president sponsored a House bill that was enacted. The federal budget was adopted October 1 with seven lines dropped. A House bill failed 216 to 217 on December 15. Federal House bills are filed under the Massachusetts body, and one was sponsored by a California member.

The player, Ashley Love, was 17 on the first day. At year end the player had no job and $0 cash. The file shows no records of the player's own actions.

## Local / State / Federal at a glance

- Local: works with gap: the council and mayor's race ran and the council passed bills and a budget, but all five council seats were vacated and never refilled in the file, and the votes do not match the seated members.
- State: works with gap: both chambers met, passed bills and the budget was adopted, but five vacated seats never got a special election in the file, and the upper chamber introduced no bills.
- Federal: works with gap: the House voted, the budget was adopted and the president's bill was enacted, but federal House bills are filed under the Massachusetts body and the budget dropped seven lines.

## Needs a why

1. All five council seats were vacated by "moved away" with rule "appointment," and no appointment refills any of them. Record ids: `seat:gus2025:224814:council:3` (February 1, 2025); `:0`, `:4`, `:1` (March 1, 2025); `:2` (April 1, 2025). Why are the seats never refilled?

2. Council votes count five voters after seats were vacated. On February 4, 2025, seat 3 was already vacated, yet each measure has five positions, e.g. `2025-02-04 legislative-vote ... "yes":"1","no":"4"`. On March 6, 2025, after four seats were vacated, `"yes":"3","no":"2"`. Why do five people vote?

3. `2025-07-01 budget-adopted {"governmentId":"place:2563345", ... "adoptedBy":"the council vote 3-2, 2025-006"}`. No council seat is filled in the file after April. Who cast the three yes votes and two no votes?

4. `2025-08-18 legislative-vote ... "yes":"5","no":"0"` for bills `...council:2025-08-18:person_703a2ffd849851b0:61`, `:62` and `:63`. All three are 5-0 with the same five-position pattern. Why unanimous three times, and where do the five members come from?

5. `office:gus2025:224814:council overridden: 4` against `vetoed: 1`. Why are four council bills overridden when only one veto is recorded?

6. `2025-12-15 {"council-president":"official:term:seat:US-MA:us-house:08:2025-01-20"}`. A federal House member is recorded as the Southbridge council president. Why is a federal officeholder in a town council seat?

7. `contest:seat:gus2025:224814:mayor:0:2025-11-04` totals `{"person_b302056703fe9be4":3894}`, but the town's year line shows 1,998 people alive. Why are there 3,894 votes in a town of fewer than 2,000 living people?

8. `contest:seat:gus2025:224814:council:0:2025-11-04`, `:2:` and `:4:` each show `winnerId:""` and `totals:"{}"`. Seats 1 and 3 have no contest record. The elections table reads "0 of 22." Why no winners, no votes, and no contests for two seats?

9. `2025-02-19 official-appointed {"post":"city-attorney","appointedBy":"person_b302056703fe9be4"}`, and the same appointer for police chief, fire chief and planning in February and March. That person is recorded as mayor only after the November 4 election. Who held the mayor's office before November?

10. `filing:contest:seat:gus2025:224814:mayor:0:2025-11-04:person_b302056703fe9be4:2025-11-04` is dated the election day, and `candidate-filed=1` is the only filing record in the year. Why was the filing dated election day, and why is there only one candidate?

11. The year line shows `people 2002 alive 1998` for Southbridge Town. Recent census counts put the real town well above 2,000 (roughly 17,000). Why is the population this small? Check the census source before answering.

12. `deaths: 0`, yet 2,002 people became 1,998 alive, so four people are no longer alive with no death record. Separately, `seat-vacated ... "cause":"death"` appears for `seat:US-MA:upper:D04:0` (September 26, 2025) and `seat:US-MA:lower:057:0` (November 20, 2025). Why do those deaths not count in the town?

13. The organization count rose `orgs 128` to `orgs 146` with `organization.closed=3`, and the records list no business founding kind. Where did the 21 net new organizations come from?

14. `event:business.closed:organization_7da919b18fadafc1 ... closing-reason=losses-kept`, with its source shown as `opening [core2-officials-v1.loaded loaded]`. Why does a business closure cite the officials loader as its source?

15. Five state seats were vacated under rule `special-election`: `seat:US-MA:lower:131:0` (June 1, 2025), `seat:US-MA:upper:D04:0`, `seat:US-MA:lower:072:0` (November 1, 2025), `seat:US-MA:lower:057:0`, and `seat:US-MA:lower:063:0` (January 1, 2026). No special-election contest or result appears. Why were no special elections held?

16. `office:US-MA:legislature-lower 2025-06-30: 54` of 90 bills were introduced on one day, and all 58 hearings are `"committee":"general"`. Why does one lower chamber introduce more than half its bills on one day, with one committee?

17. Twenty-six lower-chamber bills held in committee on June 30, 2025 show `"yes":"0","no":"0"`, all with the same chair `official:term:seat:US-MA:lower:049:0:2025-01-20`. Why does no member vote on any of them?

18. The upper chamber shows ten `legislative-vote` records (measures 2025-001, 004, 005, 006, 007, 011, 012, 018, 021, 031) but no upper-chamber bills in "bills by body." Why does the upper chamber never introduce a bill?

19. `bill:office:US-MA:us-house:2025-12-15:official:seat:US-CA:us-house:09:87` sits in the Massachusetts House body, with a Kentucky chair `official:seat:US-KY:us-house:06` and an Alaska voter. `office:US-MA:us-house 2025-12-15: 24`. Why are federal House bills from other states filed under a Massachusetts body?

20. `budget-adopted ... "adoptedBy":"Congress vote 254-179, 65-35 (amended: nationalDefense, ... medicare, education, health dropped)"`. The veterans line on a "balanced-operating-budget" measure reads `deltaMinor=-11084867501755`. Why are seven major lines dropped, and what unit is `deltaMinor` in for this line?

21. The same share repeats everywhere: `"elected":{"date":"2022-11-08","share":0.56}` on the governor, lieutenant governor, attorney general, secretary of state, treasurer and auditor, and `"share":0.635` on every upper-chamber term. Why are all statewide and upper-chamber elections identical?

22. Trace reasons are field names, not events: `learned:core.observe.perceived={"key":"measureId",...}` on the vote trace and `"key":"campaignId"` on the mayor trace. The bill-vote trace also loops between `household:official:seat:US-AK:us-house:00` and `official:seat:US-AK:us-house:00`. Why is the reason a field name, and why does the trace cycle?

23. Viewer tables not registered: `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments`, `core2-legislature-v1.budgets` each print "Unregistered module table." Which of these should exist, and why does the elections table print 0 of 22 contests?

24. `event:housing.eviction:eviction:lease:household_d801987b77500ef5:2025-10-06` has an event date of October 6, but its trace header reads `(housing.eviction 2025-11-06)`. Why does the record land 31 days after its event?

25. `player: alive=true job=none cash=$0 home=household_9604ea6beb6f7f01` for `person_937b3a9be889080e Ashley Love born 2007-01-21`. The player was 17 on the first day and ended the year with no job and $0, and no player action appears in the file. Why does the player have no income, and why are the player's own actions missing?
