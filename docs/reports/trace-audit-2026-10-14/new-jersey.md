# New Jersey: Asbury, seed 4f6dec4a3e47

This is one game year, January 20, 2025 to January 20, 2026, in Asbury, New Jersey. The town's elections ran and its boards voted. Several records do not explain themselves, and they are listed under "Needs a why." Line numbers refer to the viewer report file audit/new-jersey.txt.

## The year

Asbury had 1,761 people at the start of the year and 1,827 at the end. The file records no deaths and one person who moved away.

On February 4, 2025, the city board passed a rent stabilization bill 2-1. The county board passed a universal preschool bill 5-2 the same day. Both took effect March 6, 2025. On March 6, ten recall petitions were filed, one for each city board seat (3) and each county board seat (7). The file shows no recall vote or result.

The city board voted on rent stabilization again on February 19 and lost 1-2. The city board enacted two of its five bills. The county board enacted two of its eight bills. Three businesses closed, on June 1, June 5 and November 1, 2025. The June 5 closure cites a government's unfunded obligation.

On November 4, 2025, the county and city elections ran. Every county race had one candidate, and each drew about 2,000 votes. The city committee race for one seat was won by a person who did not file for it. The June 3 primaries recorded no votes.

At the state level, the lower chamber voted on 54 bills on June 30, 2025, all introduced that day. Across the year it enacted 8 bills and failed 47. The upper chamber voted too. The state budget passed July 1, 2025, by 57-23 and 25-15. Governor Bo Pitts and Lieutenant Governor Rebecca Ware won on November 4 and took office January 1, 2026. A lower-chamber seat (district 038) was vacated on April 1, 2025, after the holder moved away. The file shows no appointment or special election for it.

At the federal level, Congress adopted a budget on October 1, 2025, by 254-179 and 69-31. The file says national defense, Medicare, health, education and four other functions were dropped from it. Twenty-five bills were introduced in the U.S. House body for New Jersey on December 15, 2025. Five federal bills were enacted in the year.

The player, Riley Osborne, is 18, works as a server, has $9,075 in cash and is alive. The file records no filing, petition, vote or other action by the player.

## Local / State / Federal at a glance

- Local: works with gap: elections ran, and the county and city boards met and passed bills. Gap: ten recall petitions have no recall result, and a city committee winner never filed for the seat.
- State: works with gap: both chambers voted, a budget passed, and the governor and lieutenant governor were elected. Gap: a lower-chamber seat has been empty since April 1, 2025 with no fill record, and the primaries show no votes.
- Federal: works with gap: Congress adopted a budget and five House bills were enacted. Gap: the budget dropped named functions, and New Jersey's House body holds bills sponsored by members from Delaware and Alaska.

## Needs a why

1. Ten recall petitions on one day. All ten seats (city 3, county 7) got a recall petition on March 6, 2025, the day two laws took effect. Example: the county board seat 4 recall record (`recall:term:seat:gus2025:208755:board:4:...`). Why did every seat on both boards get a recall petition the same day a law took effect, and what became of them?

2. Rent stabilization voted twice. The February 4 bill passed 2-1 (line 27). The February 19 bill on the same question failed 1-2 (line 68, `bill:office:gus2025:109173:board:2025-02-19:person_ff0c19cf5c2d84dd:5`). Why did the board vote on the same question again and lose after it had passed?

3. City board winner never filed. Line 232 names `person_ff0c19cf5c2d84dd` as winner of `contest:seat:gus2025:109173:board:0:2025-11-04` with 1,794 votes. The three June 27 filings (lines 107 to 109) do not include that id. The same id sponsored the February 19 bill (line 64). Why did a non-filer win, and who put that name on the ballot?

4. Seat vacant but votes total 80. Line 88 records `seat:US-NJ:lower:038:0` vacated April 1, 2025, "moved away". No fill record appears, and the vacancies table is unregistered (line 413). Yet the June 30 lower-chamber votes total 80 (79-1 on line 114, 57-23 on line 127). Why did an 80-member vote happen with a seat empty since April?

5. Floor vote and committee hold on one bill. The bill `bill:office:US-NJ:legislature-lower:2025-06-30:...:lower:030:1:2025-01-20:7` shows a 79-1 floor vote (line 114) and a "bill-held-in-committee" on the same day (line 115). Its sample status is "failed" (line 455). Why does a bill get a floor vote and a committee hold on the same day, and why does it fail after 79-1?

6. Tally and member positions disagree. On the same bill, line 113 records two members at -1 (against), while line 114 tallies 79 yes. Why does a 79-yes tally conflict with the sampled positions?

7. Near-unanimous votes. The lower chamber voted 79-1 on two bills on June 30 (lines 114, 119). The upper chamber voted 40-0 on cash bail (line 122). The county budget was adopted 7-0 (line 265). Why are these votes almost unanimous when the same boards split 2-5 and 1-6 on other bills (lines 37 and 46 of the source list)?

8. Identical totals across different bills. The upper chamber voted 25-15 on five different bills (lines 130, 143, 169, 188, 200). The lower chamber voted 57-23 on both 2025-004 and 2025-007 (lines 127, 140). Committee hearings show 8-3 at least seven times (lines 137, 147, 163, 170, 177, 182, 194). Why do different bills produce the same split?

9. Bill-held-in-committee always reads 0-0. The file shows 45 such records, and each one shown reads yes 0, no 0 (for example lines 115, 135, 145, 151). Why does a committee hold record no votes at all?

10. Primaries with no votes. Eleven primary-result records show `"votes":"{}"` and `"namedVotes":"0"` (lines 96 to 104 and 217 to 227). Why did no primary record a vote or a named candidate, including the governor and county races?

11. County races at about 2,000 votes each. Each county race had one filer (lines 15 to 21 and 235 to 241). Totals run from 1,963 to 1,999 (lines 235 to 241). Why does each uncontested race get about 2,000 votes, and why are the two uncontested state representative races (lines 230 and 231) so close, at 24,791 and 24,789?

12. State senators below the age minimum. Angela Edwards, born May 17, 1981, was elected November 4, 2003, at age 22 (line 386). Taylor Valencia, born August 9, 1996, was elected November 5, 2019, at age 23 (line 385). Why were both seated, and does the office record check the age rule for state senators? Check the age minimum in the N.J. Constitution.

13. Two spellings of one party. Seats for the U.S. Senate read "Democrat" (lines 371 and 372). The governor, lieutenant governor and their terms read "Democratic" (lines 373, 374 and 379). Why are there two party names, and does any engine compare them?

14. Other states' members in New Jersey's House body. Line 288 places a bill sponsored by a Delaware seat (`bill:office:US-NJ:us-house:...:official:seat:US-DE:us-house:00:92`) in the New Jersey body. Line 295 shows a bill from an Alaska seat (`...seat:US-AK:us-house:00:83`) voted on. The committee chair is from North Carolina (line 287). Why do bills sponsored by Delaware and Alaska members sit in the New Jersey House body, and why does a North Carolina member chair its committee?

15. Federal chamber given a "council-president." Line 490 reads `chamber-organized {"council-president":"official:term:seat:US-NJ:us-house:09:2025-01-20"}` on December 15, 2025. Why does a federal chamber record a council president, and why was the House reorganized in December?

16. Budget functions dropped on the Congress vote. Line 482 reads "amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped". Why did the adopted budget drop these functions, and does any law or program read that drop?

17. Veterans line moved by a very large amount. Line 316 shows `deltaMinor=-11084215963625` on a veterans budget line dated December 15, 2025 (`budget:US:2025:veterans:law:US:federal:...`). Why is the move this size, what unit is it in, and who is paid less because of it?

18. A 29 percent cut with no law named. Line 325 shows `retirement-claim:person_9a0116d78a360772` going from `fromMinor=171199` to `toMinor=120886`, a 29.4 percent cut on December 15, 2025. The record names no law id. Why does the record not name the law, and who learned of the cut (line 327)?

19. One measure number, two bodies. Number `2025-017` is the state lower-chamber property tax bill (lines 178 to 180) and also a federal Senate vote (lines 296 and 307). Why does one number appear in two bodies, and is the number unique in the registry?

20. A government's finances close a private business. Lines 105 and 106 record `closing-reason` `finance.unfunded-obligation-cash-and-credit-exhausted` on June 5, 2025, with a source that cites `jurisdiction_f7be53ea56975116`. Why does a town's unfunded obligation close a private business, and through which payroll record?

21. Organizations grew without founding records. Organizations went from 125 at the start (line 1) to 194 at the end (line 4). The file shows 2 `organization.founded` and 3 `organization.closed` (line 5). Why are there 69 more organizations than the founding records explain?

22. Population grew with no births. People went from 1,761 to 1,827 (lines 1 and 4). The file shows 0 deaths and 1 move-out, and no birth kind appears in the record list (line 5). Why did the population grow by 66, and does place 3401900 match the Census count for Asbury?

23. Bills clustered on one day. 54 of the 55 state bills were introduced on June 30, 2025 (line 430). 25 of the 26 federal House bills were introduced on December 15, 2025 (line 433). Why are bills in each body introduced on one day?

24. Unregistered viewer tables. Lines 413 to 427 name eight tables the game does not have: vacancies, contests, filings, campaigns, offices, terms, governments and budgets. Why does the viewer ask for tables that do not exist, and which module should hold the vacancy and budget data?
