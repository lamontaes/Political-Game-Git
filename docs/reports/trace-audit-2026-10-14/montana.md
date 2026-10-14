# Montana: Craig, seed 2c946db881c6

## The year

Craig, Montana, ran one game year from 2025-01-20 to 2026-01-20. The town had 1,856 people at build and 1,901 at year end, with 1,898 alive.

The county board met and voted several times. It passed 10 of its 20 bills. All 11 recorded county measures show a yes. The board adopted a budget 3-0 on 2025-07-01. County laws took effect on 2025-03-06 and 2025-03-21. A county property-tax law took effect on 2026-01-01 and replaced an earlier law.

No election appears in the file. Seven candidate filings and two campaign messages point to a coroner race on 2026-11-03, but no contest record exists for it.

Fifty-two House bills were introduced on 2025-05-02, all on one day. The House enacted 22 of its 53 bills. The state budget passed 58-42 in the House and 32-18 in the Senate and was adopted on 2025-07-01. Two House seats were vacated. Seat 075 opened on 2025-08-18 after a death. Seat 098 opened on 2025-12-01 after a move. The file shows no appointment for either seat.

Congress adopted a federal budget on 2025-10-01, by 264-169 in the House and 70-30 in the Senate. On 2025-12-15 a veterans budget line changed by a law vote, with no budget adoption on that date. Twenty-three federal bills are dated 2025-12-15 in the Montana House body.

Two businesses closed, on 2025-06-01 and 2025-10-01. Two organizations closed in total. One death was recorded on 2025-10-27. Twenty-two people moved away.

The player, Hailey Shaffer, was 17 at the start and 18 at the end, and is alive. The file shows no job, $0 cash and household_56356aaefef3df60. It shows nothing else the player did during the year.

## Local / State / Federal at a glance

- Local: works with gap: the board met, passed 10 of 20 bills and adopted a budget, but no county election or contest is recorded, and every county measure shows position "1".
- State: works with gap: the House introduced and passed bills and adopted a budget, but both vacated seats show no appointment and the state contest table is empty.
- Federal: works with gap: Congress adopted a budget and law votes ran, but the Montana federal House body holds bills sponsored from other states and lists a House seat as county council president.

## Needs a why

1. Population does not add up. Build shows `people 1856 orgs 124`; year end shows `people 1901 alive 1898 orgs 156`. The file has 1 person-birth, 1 life.death and 22 person.moved-away, which leaves about 67 people unaccounted for. Also 3 people are not alive, but only 1 death is recorded. Why does the count rise? Is 1,856 right for place 3018025 (check against its census count)? Why did organizations rise by 32 net with 2 closures and no opening records?

2. A death with no death record. `seat-vacated {"seatId":"seat:US-MT:lower:075:0","cause":"death"}` on 2025-08-18. The only `life.death` is `life.death:person_203c32bb69e03aad:2025-10-27`. Why does the seat's death have no matching record on that date? Also `seat-vacated=3` in the records line, but the list shows 2. Which vacancy is the third?

3. Seats left empty. `seat:US-MT:lower:075:0` (2025-08-18, death) and `seat:US-MT:lower:098:0` (2025-12-01, moved away) both have rule "appointment". The office rule names the board of county commissioners choosing from 3 nominees. No appointment or took-office record appears for either. Why are both still empty at year end?

4. One-day session. `office:US-MT:legislature-lower 2025-05-02: 52` bills, all committee hearings and the floor votes share the date 2025-05-02. Why does the whole House session fall on one day, and why in May?

5. Repeated tallies. In the file, 17 committee hearings on 2025-05-02 show the same `"yes":"6","no":"5"` with the same chair `official:term:seat:US-MT:lower:076:0:2025-01-20`. Upper-chamber floor votes show `32-18` on 9 bills (2025-009, 011, 013 to 019). Lower-chamber floor votes show `58-42` on 6 bills (016 to 019, 022, 023). Why do the same totals repeat across unrelated bills?

6. Every held bill is 0-0. All held-in-committee lines, such as `bill-held-in-committee ... "yes":"0","no":"0"` on 2025-05-02, show no committee vote and no reason. Why was each bill held without a vote?

7. Upper-chamber chairs on lower bills. Lower-chamber bills show `"committee":"general","chair":"official:term:seat:US-MT:upper:029:0:2025-01-20"`. Held lower bills have upper-chamber sponsors (`...legislature-lower:...:upper:040...`). Why does an upper-chamber seat chair the lower chamber's committee?

8. Position signs. All 11 county measures show `"position":"1"`. Of 22 state measures, 17 show `"position":"-1"` and 5 show `"1"`. For example, 2025-004 (consumer data privacy) shows `-1` and passes 61-39. Why do the signs differ by body, and what does -1 mean?

9. Same measure number, three bodies. `2025-001` is the county immigration-enforcement measure (2025-02-04), the state House multifamily bill (2025-05-02), and the federal budget vote ("Congress vote 264-169, 70-30 ... 2025-001"). Measure 2025-013 also appears for both the county and the state. Why do different bodies share numbers?

10. Budget cut on adoption day. On 2025-07-01 ten of thirteen state budget lines move down, including `welfareAndMedicaid` at `deltaMinor -13785660122` and `localAid` at `-4616817165`. Why does a budget adopted 58-42 cut those lines the same day?

11. Federal budget line changed after adoption. The federal budget was adopted 2025-10-01. On 2025-12-15 `budget-line-changed ... line veterans deltaMinor=-11082308198731` came from `law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`. Why does a law change a budget line with no budget adoption that day, and by this amount?

12. Other states' members in a Montana body. Federal bills in `office:US-MT:us-house` are sponsored by `official:seat:US-FL:us-house:23` and similar seats. The trace for `bill-vote:bill:office:US-MT:us-house:2025-12-15:official:seat:US-IN:us-house:02:95` resolves its first person to `official:seat:US-AK:us-house:00`. Why does a Montana body hold bills from Florida, and why does a Montana vote list an Alaska member?

13. Federal seat as county council president. `chamber-organized 2025-12-15 {"council-president":"official:term:seat:US-MT:us-house:02:2025-01-20"}`. Why does a U.S. House seat hold a county council-president role?

14. Retirement claim drop. `law.effect-landed:2025-12-15:retirement-claim:person_3f59a2432211c73e` goes from `fromMinor=170832` to `toMinor=120636`, a 29.4 percent drop. The event names no law. Which law caused this, and which record shows it?

15. Property-tax law from nowhere. `law-took-effect:law:county:30049:county:property-tax:general:2026-01-01` (0.791 percent-of-home-value) replaces `...:property-tax:general:2026-01-01:from-start`. No property-tax measure appears in the county votes (2025-001 to 2025-013). Which vote created the from-start law, and which vote set the replacement?

16. Business closures and openings. `organization.closed` on 2025-06-01 gives `closure-source: owner-closed`, yet `business.closed` for the same organization gives `closing-reason: losses-kept`. The 2025-10-01 closure of `organization_879bec1cb97b2136` traces its source to `opening` as an estimate. Why does an owner closure carry a losses reason, and why does a closed business trace to an estimated opening?

17. Empty owner change. `2025-04-01 organization.owner-changed {}`. The payload is empty. Who changed owner, and to whom?

18. Player with no job or money. `player: alive=true job=none cash=$0`, age 18 at year end. The file shows no income or spending for the player. Why does the player end the year with no job and $0 cash?

19. Public comment against. `public-comment {"billId":"bill:office:gus2025:169417:board:2025-02-19:person_494f50811e3feac7:7","for":"0","against":"3"}`. Which bill is number 7, and did it pass? Why does a 0-for, 3-against comment appear on a day when county measure 2025-008 passes with position "1"?

20. Recall petitions with no outcome. `recall-petition=5` in the records line, 3 in the federal and state log. No recall election, result or bill record appears in the file. Why do the petitions stop there?

21. Coroner filings with no contest, and no 2025 election. `candidate-filed=7` and `campaign-message=2` point to `filing:contest:seat:gus2025:169417:coroner:0:2026-11-03`, but `core2-elections-v1.contests: 0 of 20`. `election-ish kinds:` is empty. Why does no contest exist for the filings, and why is no 2025 election recorded?

22. Unregistered viewer tables. `Unregistered module table:` appears for `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments` and `core2-legislature-v1.budgets`. Which table names are real, and where do these records live?

23. Federal minimum wage. `FED 2025-01-21 minimum-wage value=1500 minor/hour`. If minor units are cents, that is $15.00 an hour. The federal floor has been $7.25 since 2009. Why does the game set it at 1500 minor units?

24. Trace reasons that are field names. The `vote-recorded:vote:2025-023` trace learns through key `"measureId"`, and the `campaign-message` trace learns through key `"campaignId"`. Neither is an event. Why does each trace name a field rather than the event that caused the record?
