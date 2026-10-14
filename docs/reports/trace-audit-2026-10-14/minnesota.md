# Minnesota: Ellendale, seed a9b64e500aad

The council and the state legislature both met and passed bills in this run. No election was held, most vacated seats were never filled, and many votes, dates and tallies repeat in ways that need an explanation. The 25 items under "Needs a why" are the questions to answer before this year is trusted.

## The year

Ellendale's council did some work this year. Its elections did not happen, at least not in the file.

The council met on February 4, 2025 and voted on five bills. It passed one, 3 to 2: a measure to partner with federal immigration enforcement. It took effect March 6. The rest failed. Across the year the council enacted three of its thirteen bills.

The board lost a seat on February 1 and the clerk lost a seat on March 1. Both seats were marked for appointment. The file shows no appointment for either. On December 16 the board voted 2 to 3 on a bill.

The city adopted its 2026 budget by a 3 to 2 council vote, according to a trace. A schools line changed in that budget.

The county replaced its property tax law on January 1, 2026. The new rate is 1.208 percent of home value. The file shows no county body, vote or office.

The state legislature met on May 19, 2025. Fifty-four bills were introduced and heard that day. Of 55 lower-chamber bills, four were enacted and 51 failed. Three state laws took effect August 1: right to counsel in eviction, a ban on lobbying after office, and farmland protection. The state budget passed July 1, 97 to 37 in the lower chamber and 38 to 28 in the upper. Ten budget lines were dropped in amendment.

Congress adopted a federal budget on October 1, 2025. The U.S. House received 25 bills. Five were enacted and 20 failed. A Minnesota House seat was vacated on January 1, 2026, with no special election in the file.

No election was held in the file. There are no contest records for the year. Eleven state and federal seats were vacated under a special-election rule, and none was filled in the file.

Seven people moved away. Thirteen seats were vacated, all for "moved away." One person died, of cancer, on October 4, 2025. The year count shows 12 business closures. The file lists eight. Seven of those eight cite unfunded obligation cash and credit exhausted.

The player, Landon Hayes, was born January 22, 2007. He turned 18 two days into the year. At year end he was alive, with no job and $0 cash, in household_3a3fb3d2d37a5327. The file records no filing, campaign or vote by the player.

## Local / State / Federal at a glance

- Local: works with gap: the council voted and the budget was adopted, but no election ran and two appointed seats (board, clerk) were never filled in the file.
- State: works with gap: the legislature met, passed bills and adopted a budget, but none of the 11 vacated seats had a special election in the file, and the county shows no body records.
- Federal: works with gap: Congress adopted a budget and enacted five House bills, but the Minnesota House seat vacated January 1, 2026 has no special election in the file.

## Needs a why

1. Council votes repeat one split. Measures 2025-001, 2025-003, 2025-004 and 2025-005 each failed 1 to 4 on February 4, for example `2025-02-04 legislative-vote {... "number":"2025-001", ... "yes":"1","no":"4"}` (line 24). Measures 2025-007 through 2025-010 show the same "no" majority pattern (lines 53-56, 199-212). Why does nearly every council vote land on the same split?

2. Every public comment tally is zero in favor. Seven shown, all `"for":"0"`, e.g. `public-comment {"billId":"bill:office:gus2025:167657:council:2025-02-04:person_f979b5f91bfb41c4:0","for":"0","against":"6"}` (line 18). Why is no bill drawing any support in public comment?

3. Measure numbers are reused for different questions. Council measure 2025-001 is protect-farmland (line 19). The board vote record `vote-recorded:vote:2025-001:person_f8c4b7f59bdc5f29` cites `partner-with-federal-immigration-enforcement` (trace, line 300). Why does measure 2025-001 mean two different questions?

4. Two appointments were never made. `seat-vacated {"officeId":"office:gus2025:184136:board","seatId":"seat:gus2025:184136:board:1","cause":"moved away","rule":"appointment"}` (line 16) and the clerk seat `seat:gus2025:184136:clerk:0` (line 59). The board still cast five votes on December 16 (line 291). Why was no one appointed?

5. A federal seat chairs the city council. `2025-12-15 {"council-president":"official:term:seat:US-MN:us-house:01:2025-01-20"}` (line 454). The council organized in February with a different president (line 52). Why does a U.S. House member hold the council president's chair, and why was it reset in December?

6. No contests exist for the year. `election-ish kinds: ` is empty (line 216) and `core2-elections-v1.contests: 0 of 28` (line 385). Why were no contests written when the table holds 28?

7. Special elections never happen. Eleven state and federal seats are vacated under `"rule":"special-election"`, for example `seat:US-MN:upper:053:0` on June 1, 2025 (line 178), plus the House seat `seat:US-MN:us-house:03` on January 1, 2026 (line 443). The file shows no contest, vacancy record or winner for any of them. Why?

8. Every vacancy is "moved away." All 13 seat-vacated records give that cause (lines 16, 59, 178, 187, 193, 213-214, 432-443). Why does every seat turn over by movement: seven in the lower chamber, three in the upper, one in the U.S. House and two local?

9. All lower-chamber work happens on one day. All 54 bills are introduced, heard and voted on May 19, 2025 (lines 67-175). The only other lower-chamber record is July 1, 2025 (budget). Why does the lower chamber do nothing on any other date?

10. One chair per chamber, for every committee. Every lower hearing names `official:term:seat:US-MN:lower:37B:0:2025-01-20` as chair (line 67), and every upper hold names `...upper:041:0...` (line 76). Why does one person chair every committee in each chamber?

11. Committee tallies repeat. 6-5 appears on lines 73, 77, 81 and 116. 9-2 on lines 86, 94 and 101. 5-6 on lines 85 and 115. 3-8 on lines 159 and 173. Why do the same pairs recur across different bills?

12. Bills that passed one chamber are held without a vote. Bill `...lower:14A:0:2025-01-20:15` passed the lower chamber 118-16 (line 96). The upper committee then holds it at 0-0 (line 97). 53 bills end this way. Why does the upper chamber record no vote for them?

13. Budget lines dropped but few lines moved. The state budget lists ten dropped lines (line 183). Only three lines changed: corrections -158492564, highways -147874375, parks 90472432 (lines 184-186). The file gives no unit for `deltaMinor`. Why do dropped lines not show as changes, and what unit is the value in?

14. The city budget vote is missing from the vote record. The trace says the council adopted the 2026 budget 3-2 (line 269, `budget-adopted:budget:place:2718746:2026`). The year log has no matching legislative-vote record (line 5 counts four budget-adopted records). Why is there no vote record for the council's budget?

15. The county tax change has no county body. `law:county:27147:county:property-tax:general:2026-01-01` sets 1.208 percent of home value and replaces `...:from-start` (line 280). No county office, vote or hearing appears in the file. Who enacted it, and what did the replaced law set?

16. Closures cite the town's finance. Seven of eight listed closures give `"closing-reason":"finance.unfunded-obligation-cash-and-credit-exhausted"`, e.g. line 63 for `organization_ede4c1baf333a38a`. Their closure sources name `jurisdiction_f22406408340fb34`. Why would private businesses close on the town's unfunded obligations? The count says 12 and the file lists eight.

17. Owner changes have no details. `organization.owner-changed {}` appears on lines 57, 58, 61 and 66. The year count is six. Why does no record show the new owner, price or reason?

18. Federal items cluster on one date with one value. Four federal policy positions dated December 15, 2025 all show `value=1` (lines 9-12). Twenty-four House bills are introduced the same day (line 407). Why are all federal items on this date with the same value?

19. A Minnesota House committee has a Washington sponsor and a North Carolina chair. `bill:office:US-MN:us-house:2025-12-15:official:seat:US-WA:us-house:06:91` has chair `official:seat:US-NC:us-house:13` (lines 306-309). Why does a Minnesota bill have a Washington sponsor and an out-of-state chair?

20. A presidential budget bill is "enacted" with no vote. The sample federal bill (line 426) is sponsored by `official:term:seat:US:president:2025-01-20`, introduced in the House on October 1, 2025, with `otherPrograms` at -145011863310 and status "enacted." The House and Senate budget vote is recorded separately (line 447). Why does this bill show no vote of its own?

21. The minimum wage rate needs a source. `law-took-effect` on January 21, 2025 gives `"value":"1500","unit":"minor/hour` (line 15), which is $15.00 an hour. The file cites no source for the rate. Check it against Minnesota's published 2025 rate. Why is this the value?

22. The population grew in one year. The town has 1919 people at build (line 1) and 1982 at year end, with 1981 alive (line 4). Who was added, and from where? Check the town's count against the 2020 census for place 2718746.

23. One fact is learned many times. Line 226 lists the same `learned:core.observe.perceived` entry four times. Line 235 lists five identical copies. Why does a single learned fact appear repeatedly in the trace children?

24. Executive tables are unregistered. `core2-executive-v1.offices` and `core2-executive-v1.terms` are both "Unregistered module table" (lines 395-397), with `core2-legislature-v1.governments` and `budgets` (lines 399-401). Why can the executive role not be viewed, when the governor's term shows as serving (line 365)?

25. The player has no job and $0 at year end. `player: alive=true job=none cash=$0 home=household_3a3fb3d2d37a5327` (line 217). The player is 18 (line 2, born January 22, 2007). Why is there no job, no income and no filing after a year?
