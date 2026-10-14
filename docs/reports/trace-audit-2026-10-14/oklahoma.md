# Langley, Oklahoma — one year (seed 8c47744a9b21)

This is the engine's record of one simulated year in Langley, Oklahoma. Most of it reads as ordinary play, but the board's voting pattern, several dated records and a few counts need an explanation before the trace can be trusted.

## The year

The player is Elizabeth Quinn, born January 22, 2007, a cook with $11,247 in cash at year end. No election record exists this year.

The board met February 4, February 19 and March 6, 2025, and recorded 11 votes, each 6-1 or 1-6. Measure 2025-001, on partnering with federal immigration enforcement, passed February 4 and took effect as a county law on March 6. The other ten failed. The council president was recorded as person_73fe1ddf28baa620 from February 4, 2025.

On May 30, 2025, the state House passed 16 bills by 70 to 94 yes votes, and the Senate passed 15 of them by 35 to 44. Bill 2025-016 was held in Senate committee. The Legislature adopted the state budget on July 1, 2025 (House 81-19, Senate 40-8). Four House seats were vacated in 2025, each marked for a special election, and none is recorded as filled. The file records no governor's action. Twenty-two laws took effect, including a county property-tax law at 0.649 percent of home value on January 1, 2026.

Congress adopted the 2025 budget on October 1, 2025 (House 265-168, Senate 68-32). Federal House bill 2025-018 was recorded at 190 yes and 243 no on December 15, 2025. President Charles Price died December 18, 2025, and Teresa Singh succeeded him that day. News dated October 1, 2025 gives the SNAP maximum as $298 a month; news dated January 1, 2026 gives a top federal income-tax rate of 37 percent.

The file records no local deaths or births. Nine people moved away, and two businesses closed, one on November 1, 2025.

## Needs a why

1. **Every board vote is 6-1 or 1-6.** Ten of the 11 board votes split 1-6, and 2025-001 split 6-1. The vote-recorded lines carry no voter id, so the lone member on the other side cannot be named. In each 1-6 vote that member's line is the fifth one listed. Records: `bill:office:gus2025:132925:board:2025-02-04:person_73fe1ddf28baa620:0` (2025-001, 6-1); `bill:office:gus2025:132925:board:2025-02-04:person_1ca9333e8b2ffb35:1` through `...:4` (2025-002 to 2025-005, 1-6); `bill:office:gus2025:132925:board:2025-02-19:person_1ca9333e8b2ffb35:11` through `...:15` (2025-012 to 2025-016, 1-6); `bill:office:gus2025:132925:board:2025-03-06:person_1ca9333e8b2ffb35:17` (2025-018, 1-6). Dates: February 4, February 19, March 6, 2025.

2. **No public comment in favor.** All eight printed `public-comment` records show `"for":"0"` and `"against"` of 2 or 6. The year logs 20 public-comment records in total. Records: `bill:office:gus2025:132925:board:2025-02-04:person_1ca9333e8b2ffb35:1` and `:2`; `bill:office:gus2025:132925:board:2025-02-19:person_1ca9333e8b2ffb35:11` through `:15`; `bill:office:gus2025:132925:board:2025-03-06:person_1ca9333e8b2ffb35:17`. Dates: February 4, February 19, March 6, 2025.

3. **Bills passed both chambers, but final statuses do not match.** The printed floor votes show 15 state bills (2025-001 to 2025-015) passing both chambers. Example: `bill:office:US-OK:legislature-lower:2025-05-30:official:term:seat:US-OK:lower:032:0:2025-01-20:18` (2025-001) was 94-7 in the House and 43-5 in the Senate, with status "enacted". The status table for the House gives 6 enacted, 11 vetoed and 37 failed. No veto or executive record is printed, and `core2-executive-v1.offices` and `core2-executive-v1.terms` are unregistered module tables. Date: May 30, 2025.

4. **Bill 2025-016 held in committee at 0-0 after House passage.** `bill:office:US-OK:legislature-lower:2025-05-30:official:term:seat:US-OK:lower:032:0:2025-01-20:33` passed the House 70-31 (`legislative-vote`). Its `bill-held-in-committee` record shows `"yes":"0","no":"0"` with chair `official:term:seat:US-OK:upper:043:0:2025-01-20`. The only committee hearing printed for this bill is the House one (7-4). Date: May 30, 2025.

5. **Board bill numbers and vote lines do not line up.** Measure numbers jump from 2025-005 to 2025-012 and from 2025-016 to 2025-018. The bill table counts 11 board bills introduced February 4, 2025, but only five vote lines exist for that date. The 11 board bills introduced between July 1 and September 17, 2025 (`office:gus2025:132925:board`) have no printed vote, yet the status table gives the board 2 enacted and 27 failed. The council (`office:gus2025:173501:council`) has one bill, marked enacted, with no vote line. Dates: February 4, 2025; July 1 to September 17, 2025.

6. **Federal bill held in committee on the day it was introduced.** `bill:office:US-OK:us-house:2025-12-15:official:seat:US-CA:us-house:16:109` was held on December 15, 2025 with `yes=0 no=0`. Its chair is `official:seat:US-LA:us-house:03` and its sponsor is a California seat, under the Oklahoma House body. The same date has 25 federal House bills introduced under `office:US-OK:us-house` and a recorded vote of 190 yes and 243 no (`bill:office:US-OK:us-house:2025-12-15:official:term:seat:US-OK:us-house:04:2025-01-20:101:federal:us-house`). The trace for that vote resolves its person to `official:seat:US-AK:us-house:00`. Date: December 15, 2025.

7. **Many records share one date: December 15, 2025.** Five federal `us-policy-positions` lines dated that day each carry `value=1` with no unit or source (ban-lobbying-after-office, fund-pensions-to-schedule, minimum-reserve-balance, restrict-abortion, balanced-operating-budget). The same day has 25 House bills introduced, a bill held and a vote (item 6), a budget-line change (item 12) and a council-president record (item 14). May 30, 2025 is similar: 16 House votes and 15 Senate votes on one date.

8. **Six seats vacated, no special election recorded.** `seat-vacated` records name `seat:US-OK:lower:021:0` (June 1, 2025), `seat:US-OK:lower:032:0` and `seat:US-OK:lower:066:0` (August 1, 2025), `seat:US-OK:lower:063:0` (November 1, 2025) and `seat:US-OK:us-house:03` (December 1, 2025), each with rule "special-election". `core2-elections-v1.contests` shows 0 of 33 and `core2-elections-v1.vacancies` is an unregistered table.

9. **Vice-president seat still held by Richard Griffin.** `term:seat:US:vice-president:2025-01-20` is "serving" through January 20, 2029. `term:seat:US:president:2025-12-18` says Teresa Singh "succeeded as vice-president" on December 18, 2025. No `seat-vacated` record exists for `seat:US:vice-president`.

10. **Zero deaths, but two people not alive; people up 70 with no births.** The file says `deaths: 0`. Year end shows "people 1890 alive 1888", up from 1820 at build. `person.moved-away` is 9 and no birth record appears in the kinds list. Dates: the whole year, January 20, 2025 to January 20, 2026.

11. **Organizations up 48 with one founding.** Orgs went from 116 at build to 164 at year end. The year records `organization.founded=1`, `cause-group.founded=3`, `organization.closed=2` and `business.closed=2`. Dates: the year.

12. **Veterans line cut by about $110.8 billion in one step.** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` has `deltaMinor=-11083063476748`, about -$110.8 billion if minor units are cents. Also, the counts show `budget-adopted=4`, but only two are listed (July 1, 2025 and October 1, 2025). Date: December 15, 2025.

13. **Two identical cause-group ad records and an empty owner change.** On April 1, 2025, `organization:cause-group:person_766eefbe98023f99:cause:us-policy-positions:labor-workforce.paid-family-leave` and `organization:cause-group:person_ee72fa211df43eae:cause:us-policy-positions:labor-workforce.paid-family-leave` both record `spentMinor 2495`, `balanceBeforeMinor 3327` and `reached 24`. Also on April 1, 2025, `organization.owner-changed` has an empty payload `{}` with no organization or owner id.

14. **Council president is a U.S. House seat.** A chamber-organized record dated December 15, 2025 names council-president `official:term:seat:US-OK:us-house:01:2025-01-20`. The February 4, 2025 record names `person_73fe1ddf28baa620` for the same role.

15. **Every election share is one of two numbers.** Every printed statewide term carries `"share":0.56` (for example `term:seat:US-OK:governor:2025-01-20`), and every printed House term carries `"share":0.635` (for example `term:seat:US-OK:lower:001:0:2025-01-20:past:1`). Election dates in those records run from 2018 to 2022.

16. **Corporation Commission: three members, one seat.** `office:US-OK:corporation-commission` is titled "Corporation Commission (3 members, statewide, staggered 6-year terms)" but has `"seats":1`. The seat list has one seat, `seat:US-OK:corporation-commission`.

17. **Repeated identical lines.** On February 4, 2025, measure 2025-001 repeats the same `vote-recorded` line seven times, differing only in position. The trace for `speech:party-meeting:party:US-OK:republican:2026-01-15:retold:person_73fe1ddf28baa620` (January 15, 2026) repeats the same `learned:core.observe.perceived` entry five times, and the speech trace repeats its learned entries many more times.

18. **Player was 17 at the start.** Elizabeth Quinn (`person_aadac0290e18fa93`) was born January 22, 2007. The year opens January 20, 2025, and she turns 18 two days later. No election record exists for the year.

## Counts

Header: `# Langley, Oklahoma seed 8c47744a9b21 start 2025-01-20 built in 52s people 1820 orgs 116`

Year end: people 1890, alive 1888, orgs 164.

Records this year: 23177.

Top 10 record kinds:

| Kind               | Count |
| ------------------ | ----- |
| person.acted       | 19978 |
| cause.shared       | 834   |
| case.made          | 469   |
| news.read          | 402   |
| speech.retold      | 384   |
| vote-recorded      | 211   |
| cause.volunteered  | 193   |
| cause-group.ad-ran | 100   |
| speech.heard       | 80    |
| legislative-vote   | 76    |
