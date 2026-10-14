# Mississippi: Fayette, seed 984f104b965b

The game year ran as a working government in Fayette, with the council, county board, state legislature and Congress all voting. The gaps are in who sits where and when. The council voted before its members were elected, a council seat went unfilled, several vacated seats were never appointed, and the house's special elections never appear. The list below names each gap by record.

## The year

Fayette, Mississippi ran from January 20, 2025 to January 20, 2026. It had 1,882 people, all alive at the end, and 149 organizations. The file records no deaths.

The council organized on February 4, 2025 and voted on five measures that day. Each vote totaled five. Measures 2025-001, 2025-002 and 2025-005 failed. Measures 2025-003 and 2025-004 passed 3 to 2. Five county laws with the same numbers took effect on March 6, 2025. The council's members were not elected until June 3, 2025. Four council seats and the mayor's seat got winners. Council seat 1 got no filing and no winner.

Six recall petitions were filed on March 6, 2025, one against each county board seat. The board recorded 15 enacted bills and 12 failed bills for the year.

On February 1, 2025, three seats were vacated by people who moved away: board seat 2, assessor and sheriff. The file shows no appointment for the assessor or the sheriff. The mayor appointed a police chief on February 19, 2025 and again on March 21, 2025. A planning official was appointed on August 18, 2025.

One business closed on October 1, 2025. One changed owner on March 1, 2025.

The state legislature met on April 6, 2025 and voted on 53 house bills that day. Of the 54 house bills, 10 were enacted and 44 failed. The state budget was adopted on July 1, 2025. Four house seats were vacated by people who moved away, each under a special-election rule. The file shows no special election.

Congress adopted a budget on October 1, 2025. Of 25 federal bills in the file, 3 were enacted and 22 failed. Twenty-four were introduced on December 15, 2025. Federal news shows a 37 percent top income tax rate from January 1, 2026.

Jonathan Le, a server, was alive at year end with $725 in cash. The file shows no player actions beyond that.

## Local / State / Federal at a glance

- Local: works with gap: elections ran and the council passed laws, but council seat 1 was never filled, council votes total five with four elected members, and the council organized four months before its members were elected.
- State: works with gap: the house voted on bills and a budget was adopted, but four vacated house seats have no special election in the file.
- Federal: works with gap: a budget was adopted and bills were voted, but several bills name sponsors, chairs and bodies from other states or offices.

## Needs a why

1. **Council votes total five with four elected members.** Seen: every council vote on February 4, 2025 totals five. Record: `legislative-vote` `bill:office:gus2025:168650:council:2025-02-04:person_e84275def76322d5:13` yes 1, no 4 (2025-001); `...:14` yes 2, no 3 (2025-002). Council seat 1 has `winnerId ""`. Why were five council votes cast when the election seated four council members?

2. **Council organized before its members were elected.** Seen: the chamber organized on February 4, 2025 with a mayor pro tem who won a council seat only on June 3, 2025. Record: `2025-02-04 chamber-organized {"mayor-pro-tem":"person_80a9922ad70bb162"}`; `election-result` `contest:seat:gus2025:168650:council:0:2025-06-03` winner `person_80a9922ad70bb162`. Why did the council organize and vote four months before its election?

3. **Council seat 1 has no filing, no winner and no vacancy record.** Record: `2025-06-03 election-result {"contestId":"contest:seat:gus2025:168650:council:1:2025-06-03",...,"winnerId":"","totals":"{}"}`. No `candidate-filed` line exists for council:1. Why did a seat go to the ballot with nobody filed and no vacancy?

4. **Totals are nearly identical across races.** Seen: winners' totals are 1458 or 1461 in every race. Record: council:0 `{"person_80a9922ad70bb162":1458}`, council:2 `1458`, council:3 `1461`, council:4 `1461`, mayor `1461` (one filer). Why does each race land on 1458 or 1461 votes, and why does an unopposed mayor show 1461 votes?

5. **Measures the council voted down became county law.** Seen: council votes failed, then five county laws took effect on March 6, 2025 with the same numbers. Record: `law:county:28063:county:us-policy-positions:labor-workforce.paid-family-leave:general:2025-03-06:2025-002` (council 2025-002 was 2 to 3); `...ban-discrimination-in-housing-and-work:general:2025-03-06:2025-001` (council 2025-001 was 1 to 4); `...protect-farmland-from-development:general:2025-03-06:2025-005` (council 2025-005 was 1 to 4). Why did measures that failed take effect as law?

6. **All six board seats drew a recall on the day a county law took effect.** Record: `2025-03-06 recall-petition {"recallId":"recall:term:seat:gus2025:168573:board:1:2025-01-20:2025-03-06",...}` through board:6, each citing the county housing law. Why did every board seat face a recall within six weeks of its term start?

7. **Board seat 2, assessor and sheriff were vacated and not appointed.** Record: `2025-02-01 seat-vacated {"officeId":"office:gus2025:168573:board","seatId":"seat:gus2025:168573:board:2","cause":"moved away","rule":"appointment"}`, and the same for `seat:gus2025:168573:assessor:0` and `seat:gus2025:168573:sheriff:0`. A board term starts the same day (`term:seat:gus2025:168573:board:2:2025-02-01`). No `official-appointed` record exists for those seats. Who filled board seat 2, and why were the assessor and sheriff left empty?

8. **The same post was filled twice by the same mayor within a month.** Record: `2025-02-19 official-appointed {"post":"police-chief","appointedBy":"person_6605a9ab773b0ab3"}` and `2025-03-21 official-appointed {"post":"police-chief","appointedBy":"person_6605a9ab773b0ab3"}`. Why was the police chief appointed twice?

9. **Zero deaths in a year.** Seen: `deaths: 0` with `people 1882 alive 1882`. Why does a year with 1,882 full people and a modeled wider population show no deaths at all?

10. **A North Carolina member sponsors a Mississippi body's bill, and a New York member chairs the committee.** Record: `committee:bill:office:US-MS:us-house:2025-12-15:official:seat:US-NC:us-house:02:113:federal:us-house` with `chair=official:seat:US-NY:us-house:01`. Why does a bill in the US-MS us-house body have a sponsor from another state?

11. **A state senator sponsors a House bill.** Record: `bill:office:US-MS:legislature-lower:2025-04-06:official:term:seat:US-MS:upper:012:0:2025-01-20:32`, with `bodyOfficeId` office:US-MS:legislature-lower and sponsor `upper:012`. Why does a senator sponsor a bill in the House?

12. **Identical vote totals repeat across different bills on one day.** Record: `legislative-vote` on April 6, 2025 for `2025-006` and `2025-007` in the upper chamber, both yes 36 no 16; for `2025-010` and `2025-011`, both yes 33 no 19. Why do the same totals appear on different bills in one sitting?

13. **Fifty-three house bills introduced on one day.** Record: `bills by body and introduction date`: `office:US-MS:legislature-lower 2025-04-06: 53`, and 54 house bills in all. Why were 53 of 54 house bills introduced on a single day?

14. **A bill held in committee with a 0 to 0 vote.** Record: `2025-04-06 bill-held-in-committee {"billId":"bill:office:US-MS:legislature-lower:2025-04-06:official:term:seat:US-MS:upper:012:0:2025-01-20:43",...,"chair":"official:term:seat:US-MS:lower:090:0:2025-01-20","yes":"0","no":"0"}`. The same chair ran several other hearings that day. Why was this bill held with no votes?

15. **Four house seats vacated under a special-election rule, with no special elections.** Record: `seat-vacated` `seat:US-MS:lower:061:0` (August 1, 2025), `lower:103:0` (October 1, 2025), `lower:031:0` (November 1, 2025), `lower:122:0` (January 1, 2026), each rule "special-election". The contest table shows 0 of 38. Why were no special-election contests created for these seats?

16. **Every state race shows the same vote share.** Record: `elected":{"date":"2023-11-07","share":0.56}` on all eight state executive terms (governor through insurance commissioner); upper chamber terms all show 0.635. Why does every state race report exactly the same share?

17. **The president sponsors a bill in a body named for a Mississippi district.** Record: `bill:office:US-MS:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:87`, `sponsorId` the president, status "enacted". Why is the president the sponsor of a bill in the US-MS us-house body, and why did it pass?

18. **A balanced-budget measure cuts veterans by about $110.8 billion.** Record: `budget-line-changed` `...fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`, `line=veterans deltaMinor=-11082962894112`. Why does a balanced-budget measure cut the veterans line this much, and are minor units cents?

19. **A retirement obligation falls about 29 percent on December 15, 2025 with no law named.** Record: `event:law.effect-landed:2025-12-15:retirement-claim:person_684930880a09393a:own` fromMinor=152830 toMinor=107921. The trace names no law id. Why did this obligation fall, and which law made it fall?

20. **A property-tax law replaces a from-start law on the day it takes effect, with no enacting bill.** Record: `law:county:28063:county:property-tax:general:2026-01-01` `change=replaced replacesLawId=...:2026-01-01:from-start`. The trace chain ends at the jurisdiction. Why does this law replace an earlier one, and what bill or vote enacted it?

21. **A person who moved out of town casts a vote after moving.** Record: `person.moved-away:person_743642ac80687d34:2026-01-01` (residence jurisdiction_fbdc085005b0f2cd) and `vote-recorded:vote:2026-001:person_743642ac80687d34` on January 15, 2026. Why did a person who moved away on January 1, 2026 record a vote on January 15, 2026?

22. **One business, two closing reasons, and 45 new organizations.** Record: `event:business.closed:organization_bbaa1da31dd98771` reason `losses-kept` (source "opening"), but `employer-closed:2025-10-01:organization_bbaa1da31dd98771` says `closure-source=owner-closed:2025-10-01`. Organizations rose from 104 at build to 149 at year end. Why does one closure have two reasons, and what created the 45 new organizations?

23. **Unrelated events cluster on December 15, 2025.** Record: federal news `2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1` and `...fiscal.balanced-operating-budget value=1`; 24 federal bills introduced; a `2025-12-15 chamber-organized` record; the retirement-claim law effect; and a `bill-held-in-committee` record, all on the same date. Why do so many unrelated events fall on one date, and what does value=1 mean?

24. **A U.S. House member holds a local council presidency.** Record: `2025-12-15 chamber-organized {"council-president":"official:term:seat:US-MS:us-house:04:2025-01-20"}`. The council-president key is also used for the board on February 4, 2025. Why does a federal official lead a town council, and which body does this record name?

25. **Eight viewer tables are unregistered and empty.** Record: `Unregistered module table:` for `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments`, `core2-legislature-v1.budgets`. Why are these tables missing from the viewer, and why do elections, voting, executive and budget data show only in other places?
