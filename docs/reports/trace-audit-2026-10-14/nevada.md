# Nevada: Mina, seed 48aa60405673

This is the trace audit of one simulated year in Mina, Nevada. The town's records show a state legislature that voted and held hearings, and a town board that failed most of its bills. Several totals, dates and sponsors repeat in ways that need an explanation before anyone trusts them.

## The year

Mina ran from January 20, 2025 to January 20, 2026. The town had 1,841 people at the start and 1,876 at the end, with 1,871 alive. The file shows two deaths and 23 people who moved away. It shows no birth or move-in records. Organizations rose from 107 to 130. A business closed on September 1, 2025 with the reason "losses-kept."

A state minimum-wage law took effect on January 21, 2025 at a value of 1500 per hour (unit minor per hour). Six pay raises to the minimum wage were recorded.

The town board took its first vote on February 4, 2025. It recorded eight votes in February, and every one was 1 yes and 2 no. The board held 20 bills in all. The file shows 2 enacted and 18 failed. The treasurer seat was vacated on February 1, 2025 when its holder moved away. The file shows no appointment to fill it.

The county board adopted its budget on July 1, 2025 by a 3-0 vote. A county property-tax law replaced an earlier one on January 1, 2026.

The state legislature organized on January 20, 2025. The lower chamber introduced 52 bills on June 2, 2025. Committees held hearings, and votes were recorded. The state budget was adopted on July 1, 2025 by votes of 28-14 and 16-5, with ten budget lines dropped in amendment. A retirement-contributions line changed on July 20, 2025. Bill 2025-001 passed the lower chamber 39-3 and the upper chamber 18-3, yet its status reads vetoed. The file shows no veto record. Thirty-six bills were held in committee with 0-0 votes.

Congress adopted the federal budget on October 1, 2025 by 254-179 in the House and 73-27 in the Senate. On December 15, 2025 six federal policy positions were adopted, and 25 House bills were recorded that day. Federal news items dated January 1, 2026 show a 37 percent top income-tax rate and a 6.2 percent Social Security tax.

No election records appear in the year. The only contest on file is for president in 2028. Six candidates filed and three recall petitions were recorded, but the file shows no contest for either.

The player, Seth Pennington, turned 18 in July 2025. At year end he had no job, $0 in cash and a home in household_f89841ee1a1a4111. He was alive.

## Local / State / Federal at a glance

- works with gap: the town board met and voted from February 4, 2025, and the county adopted its budget. But every February vote was 1-2, 18 of 20 bills failed, the treasurer seat has no appointment on record, and no election records appear.
- works with gap: the legislature organized, committees heard bills, votes and a budget were recorded. But a bill that passed both chambers shows vetoed with no veto record, and 36 bills were held at 0-0.
- works with gap: Congress adopted a budget, House and Senate votes were recorded, and laws took effect. But the House office carries 4 seats while 433 votes are counted, and the budget magnitudes have no stated unit.

## Needs a why

1. Town board, every vote 1 yes 2 no. Eight February votes all show yes 1, no 2, with the same position order (1, -1, -1) on each bill. Example: `bill:office:gus2025:169984:board:2025-02-04:person_9294a12c9a822ce8:0` yes "1" no "2". Why does the same split repeat on every bill?
2. Town board outcomes: 2 enacted and 18 failed out of 20 bills (`gus2025 board enacted: 2`, `failed: 18`). The two that passed are not named, and the July to September votes are not in the file. Why did 18 fail, and which two passed?
3. Chamber-organized records. The records count says 2 (`chamber-organized=2`). The federal and state dump lists 5. The town board adds one on February 4, 2025 (`{"council-president":"person_064640ae04424b5a"}`). Why do the counts disagree? Also, the December 15, 2025 entry sets `"council-president":"official:term:seat:US-NV:us-house:03:2025-01-20"` on the federal House. Why does a House record use the council key?
4. Treasurer seat. `seat-vacated`, `seat:gus2025:169984:treasurer:0`, cause "moved away", rule "appointment", on February 1, 2025. No appointment record follows. The records count says 2 seat-vacated, but the file prints one. Why was the seat never refilled, and what is the second vacancy?
5. Population. Records show 1,841 at build, 1,876 at year end, and 1,871 alive. Deaths are 2 and moved-away is 23, and no birth or move-in kind is listed. Why is the net +35, and why are five people not alive when only two deaths were recorded? Check 1,841 against the census record for this place. The file gives no source.
6. Organizations. The count rises from 107 at build to 130 at year end, and no business-founding record kind appears in the year's records. Why do 23 organizations appear with no founding record?
7. Business closure. `event:business.closed:organization_473eda2a3d489692` (September 1, 2025) gives the reason `closing-reason=losses-kept`, but its source is `estimatedFrom` the `opening` load. Why does a September 1, 2025 closure trace back to the opening load, and what losses are recorded?
8. Empty payload. `organization.owner-changed {}` on July 1, 2025 has no organization id, owner or reason. Why is this record empty?
9. Player at year end. `player: alive=true job=none cash=$0`, and the player turned 18 in July 2025. Why does the player have no job and $0 after a full year, with no record of any action that changed either?
10. Minimum wage. `law-took-effect` on January 21, 2025 sets value "1500", unit "minor/hour", which reads as $15.00 an hour. Check that value against Nevada's published 2025 state minimum wage (I recall $12.00; verify). Why does the state law read $15?
11. Vetoed bill. `bill:office:US-NV:legislature-lower:2025-06-02:...:11` passed the lower chamber 39-3 (line 54) and the upper chamber 18-3 (line 57), but the sample shows `"status":"vetoed"` (line 426). No veto record or override vote is in the file. Who vetoed it, when, and why?
12. Identical upper-chamber tallies. Nine upper-chamber votes on different measures and different positions all show yes 13, no 8: lines 69, 75, 87, 93, 108, 114, 120, 130 and 148. Why does one tally repeat across unrelated bills?
13. Repeated committee tallies. Committee hearings show 7-4 (lines 64, 103, 109, 131, 149) and 6-4 (line 106) over and over. Why do the same totals repeat across dozens of hearings?
14. Bills held at 0-0. All 36 `bill-held-in-committee` records (lines 97, 161, 185-209) show yes 0, no 0, and the same chair (`official:term:seat:US-NV:lower:030:0:2025-01-20`). The file never shows a committee vote on them. Why did no committee vote happen on any of them?
15. Bill origin and sponsors. The lower chamber introduced 52 bills on June 2, 2025 (line 406). No bills are listed under the upper chamber at all (lines 405-422). The sample bill in the lower chamber (line 426) is sponsored by `official:term:seat:US-NV:upper:008:0:2025-01-20`, a senator. Why does a lower-chamber bill come from an upper-chamber seat, and why does the upper chamber never introduce a bill?
16. Duplicate vote records. The same member's vote on the same measure is recorded twice, for example `vote-recorded` for measure 2025-001 at position 1 (lines 53 and 56), and 2025-002 at position -1 (lines 59 and 62). Why are these recorded twice?
17. Federal House sponsors and seats. Federal House bills are recorded under `office:US-NV:us-house` (25 on December 15, 2025, line 409). Sponsors come from Oregon and New York (lines 250 and 259). The office lists 4 seats (line 337), yet the House vote is `yes=209 no=224` (line 262), 433 members. Why does a Nevada office hold a national House, and why do the sponsors come from other states?
18. Federal budget magnitudes. `budget-line-changed` for the federal "veterans" line has `deltaMinor=-11083624450899` on December 15, 2025 (line 282). The sample federal bill (line 424) has `otherPrograms` at -104248103497, and its sponsor is the President. The unit is not stated. Why is the veterans line this size, and why does a House bill carry a presidential sponsor?
19. State budget. The July 1, 2025 adoption drops ten lines in amendment (line 210), leaving three state budget-line changes (lines 211-213). The retirement-contributions line changes by `22872269000` on July 20, 2025, a date that is not the budget date (line 216). Why does the adopted budget drop nearly every line, and why does a retirement change come from a law dated July 20, 2025?
20. Federal December 15, 2025 cluster. Six federal policy positions are adopted that day (lines 9-14), and 25 House bills are recorded (line 409). Why does this much federal activity land on one date?
21. Elections. The offices with `nextElectionYear: 2026` (lines 337-343) have no 2026 contest on file. The only contest is the 2028 president (line 387). The election-ish list is empty (line 218), yet the records show `candidate-filed=6` and `recall-petition=3` (line 5). Why do six filings and three recall petitions produce no contest?
22. Viewer tables that do not exist. The viewer asked for `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `filings`, `campaigns`, `core2-executive-v1.offices`, `terms`, `core2-legislature-v1.governments` and `budgets` (lines 389-403). None are registered, so elections, filings, vacancies and budgets cannot be shown. Why are these tables not registered?
23. Term dates and shares. Nine Assembly seats show a past term ending `"endDate":"2025-01-01"` while current terms start January 20, 2025 (lines 374-384), a 19-day gap. Every Assembly term shows share 0.635 (lines 373-384), and every statewide term shows 0.56 (lines 360-370). Why do the past terms end before the simulation opens, and why are the shares identical?
24. Trace blocks that do not reach a reason. The `bill-vote` trace for `...US-NY:us-house:24:96` loops between a person and their job and lists more than 48 `personIds` (lines 263-268) without reaching the vote's reason. The `vote-recorded` trace keys its learned value as `"key":"measureId"` (line 275), which is a field name, not an event. Why does the first trace loop, and why is the second keyed by a field name?
25. County property tax. `law:county:32021:county:property-tax:general:2026-01-01` (value 0.741 percent of home value) replaces `...:from-start` on January 1, 2026 (line 242). The trace shows no reason for the replacement and no prior rate. What triggered the change, and what was the rate before it?
