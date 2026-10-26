# Kokomo, Indiana: repeated votes, unfilled seats and lopsided results

The one-year run shows board votes that repeat and do not reconcile with their own tallies, three vacated seats with no recorded appointment, and election totals that are almost all one-sided. Those results need explaining before the town can be trusted as a playable world.

## The year

Charlotte Copeland turned 18 on January 21, 2025, one day after the run began. She ended the year with no job and $0 in cash.

The board recorded five votes on February 4, 2025, each with 4 yes and 3 no. Five county laws and four city laws took effect on March 6, 2025. The board voted again on February 19, March 6 and March 21, 2025.

A clerk seat was vacated on February 1, 2025, when its holder moved away. The mayor appointed a planning official on March 21, 2025.

The November 4, 2025 election recorded results for three council seats and for mayor. The winning mayoral candidate received 10,626 votes, and the other candidate received 6.

A state senate seat was vacated by death on September 14, 2025. A state House seat was vacated on December 1, 2025, when its holder moved away.

The state legislature voted on a consumer data privacy bill on April 29, 2025. It showed 71 yes in the House and 41 yes in the Senate.

Congress adopted the federal budget on October 1, 2025, by 265 to 168 in the House and 72 to 28 in the Senate. Six federal policy positions appeared in the news on December 15, 2025. Federal law recorded a 37 percent top income tax rate from January 1, 2026.

An employer closed on November 23, 2025, after its cash and credit ran out.

The council adopted the city budget 3 to 2 on January 1, 2026. A county property-tax law was replaced the same day.

The news feed held 589 items, 44 of them federal. On January 15, 2026, a Democratic party meeting took place, and people retold it.

## What needs a why

1. **Board tallies disagree with the votes under them.** Eight of the 16 board votes show a total that does not match the seven `vote-recorded` lines for the same bill. In all eight, the bill record reverses the vote lines: the lines show 4 yes and 3 no, and the bill says yes=3, no=4, or the lines show 5 yes and 2 no, and the bill says yes=2, no=5. Ids: `bill:office:gus2025:163435:board:2025-02-19:person_f42d70e85ff612b7:22`, `bill:office:gus2025:163435:board:2025-02-19:person_f42d70e85ff612b7:23`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:27`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:28`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:29`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:30`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:31`, `bill:office:gus2025:163435:board:2025-03-21:person_f42d70e85ff612b7:33`.

2. **One vote pattern repeats across all 16 board votes.** Every board bill's seven `vote-recorded` lines follow one of two patterns: positions 1, -1, 1, -1, -1, 1, 1 (4 yes, 10 bills) or 1, -1, 1, 1, -1, 1, 1 (5 yes, 6 bills). Positions 1, 3, 6 and 7 vote yes and positions 2 and 5 vote no on all 16. Only position 4 changes. Ids: `bill:office:gus2025:163435:board:2025-02-04:person_156a5df845caa389:0` through `:4`, `bill:office:gus2025:163435:board:2025-02-19:person_156a5df845caa389:19` through `:21`, `bill:office:gus2025:163435:board:2025-02-19:person_f42d70e85ff612b7:22` and `:23`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:27` through `:31`, `bill:office:gus2025:163435:board:2025-03-21:person_f42d70e85ff612b7:33`.

3. **Public-comment tallies repeat 3 for and 3 against.** Nine of the 11 board public-comment records show exactly 3 for and 3 against. The other two are 2 and 2 and 1 and 0. Ids with 3 and 3: `bill:office:gus2025:163435:board:2025-02-19:person_156a5df845caa389:19`, `...:20`, `bill:office:gus2025:163435:board:2025-02-19:person_f42d70e85ff612b7:22`, `...:23`, `bill:office:gus2025:163435:board:2025-03-06:person_f42d70e85ff612b7:27`, `...:28`, `...:29`, `...:30`, `...:31`. The 2 and 2 record is `...:2025-02-19:person_156a5df845caa389:21`. The 1 and 0 record is `bill:office:gus2025:163435:board:2025-03-21:person_f42d70e85ff612b7:33`.

4. **Three seats were vacated, and the file records no appointment to any of them.** All three `seat-vacated` records use the rule `appointment`: `seat:gus2025:163435:clerk:0` (February 1, 2025, moved away), `seat:US-IN:upper:023:0` (September 14, 2025, death) and `seat:US-IN:lower:016:0` (December 1, 2025, moved away). The only `official-appointed` record is for a planning post (March 21, 2025), appointed by `person_83e88cb1dd912528`, not for a seat.

5. **Deaths show zero, but a death vacated a seat.** The header reads "deaths: 0", yet `seat:US-IN:upper:023:0` was vacated by death on September 14, 2025. The people count is 1941 with 1931 alive, which leaves 10 people not alive.

6. **Election totals are lopsided, and the contest table is empty.** `contest:seat:gus2025:163557:mayor:0:2025-11-04` ran 10626 to 6. `contest:seat:gus2025:163557:council:0:2025-11-04` ran 10446 to 26, with 0 for a third candidate. `contest:seat:gus2025:163557:council:2:2025-11-04` ran 9747 to 185, with 92 for a third. `contest:seat:gus2025:163557:council:4:2025-11-04` ran 9177 to 684. Still, `core2-elections-v1.contests` prints "0 of 35".

7. **Several module tables are unregistered, so campaigns and filings have no table.** These print "Unregistered module table": `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments` and `core2-legislature-v1.budgets`. The year still records 85 `campaign-message` and 28 `candidate-filed` events. Also, `core2-offices-v1.terms` is headed "454 of 554" but only 12 rows print.

8. **Vote shares are identical in every election shown.** Every elected statewide term shows `share` 0.56: `term:seat:US-IN:governor:2025-01-20`, `term:seat:US-IN:lieutenant-governor:2025-01-20`, `term:seat:US-IN:attorney-general:2025-01-20`, `term:seat:US-IN:secretary-of-state:2025-01-20`, `term:seat:US-IN:treasurer:2025-01-20` and `term:seat:US-IN:auditor:2025-01-20`, plus their past terms. Every state senate term shown has 0.635, such as `term:seat:US-IN:upper:001:0:2025-01-20:past:3` and `term:seat:US-IN:upper:002:0:2025-01-20:past:4`.

9. **One closure has two records and no visible cause trail.** Organization `organization_e13141ad0de838de` closed on November 23, 2025 with two records: `event:business.closed:organization_e13141ad0de838de` and `employer-closed:2025-11-23:organization_e13141ad0de838de` (`organization.closed`). The stated cause is `finance.unfunded-obligation-cash-and-credit-exhausted`. The file shows no earlier record of cash or credit falling.

10. **Council overrides outnumber vetoes four to one.** `office:gus2025:163557:council` shows vetoed 1 and overridden 4, with enacted 1 and failed 4. A bill is normally vetoed before it is overridden, so these counts do not fit together.

11. **One county minimum-wage law took effect twice.** `law:county:18067:county:us-policy-positions:labor-workforce.raise-minimum-wage:general:2025-03-06:2025-004` took effect on March 6, 2025. The same measure took effect again on March 7, 2025 as `law:county:18067:county:minimum-wage:general:2025-03-07:law:county:18067:county:us-policy-positions:labor-workforce.raise-minimum-wage:general:2025-03-06:2025-004`, under the series `minimum-wage`.

12. **City laws took effect with no city vote on record.** Four city laws took effect on March 6, 2025: `law:place:1840392:city:us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal:general:2025-03-06:2025-001`, `law:place:1840392:city:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-002`, `law:place:1840392:city:us-policy-positions:education.universal-preschool:general:2025-03-06:2025-003` and `law:place:1840392:city:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones:general:2025-03-06:2025-005`. The only votes shown on measures 2025-001 to 2025-005 are the board's five February 4 votes. Measure numbers 2025-001, 2025-003 and 2025-004 also appear on the April 29, 2025 state votes, so `measureId` is reused across bodies.

13. **Upper-chamber bills sit under lower-chamber ids.** No bill row appears under `office:US-IN:legislature-upper`. The Senate vote is keyed to `bill:office:US-IN:legislature-lower:2025-04-29:official:term:seat:US-IN:lower:021:0:2025-01-20:34`, which shows 41 yes and 9 no. The held bill `bill:office:US-IN:legislature-lower:2025-04-29:official:term:seat:US-IN:upper:021:0:2025-01-20:35` shows yes 0 and no 0, with a House chair `official:term:seat:US-IN:lower:019:0:2025-01-20`. The sample bill `...:34` shows status enacted, and its one provision is at value -1.

14. **The planning appointer later wins the mayor's race.** `person_83e88cb1dd912528` appointed the planning official on March 21, 2025 and is the winner of `contest:seat:gus2025:163557:mayor:0:2025-11-04`. The file prints no mayor office or term for place 1840392, so the appointing power before November 4, 2025 is not shown.

15. **Chamber records use the wrong body and key.** The December 15, 2025 `chamber-organized` record for the U.S. House uses the key `council-president` with `official:term:seat:US-IN:us-house:03:2025-01-20`. The year total is 3 `chamber-organized` records, but the federal and state log lists 5. The February 4, 2025 records (`council-president` `person_ac7705e5f4997aa0` and `mayor-pro-tem` `person_7f7f4865b7fd5837`) do not name a body. The sample bill `bill:office:US-IN:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:93` names the president as sponsor of a House bill.

16. **Traces repeat the same learned entry, and learned keys are field names.** `speech:party-meeting:party:US-IN:democratic:2026-01-15:retold:person_f6e3f6b930136eac` lists one learned entry four times. `speech:party-meeting:party:US-IN:democratic:2026-01-15` lists it five times. `campaign-message:filing:contest:seat:gus2025:163435:assessor:0:2026-11-03:person_156a5df845caa389:2026-01-09` lists it six times, and its key is the field name `campaignId`. The vote traces learn the field names `billId` and `measureId`. The retold speech is recorded under an "experienced" key with access "perceived" for the teller.

17. **Vote counts do not reconcile, and no board vote follows March 21, 2025.** The year total is 66 `legislative-vote` records. The federal and state log shows 31, and the 17 board and council votes printed in the file bring the total to 48, leaving 18 unshown. The last board vote shown is `bill:office:gus2025:163435:board:2025-03-21:person_f42d70e85ff612b7:33`. Thirteen board bills were introduced from September 2, 2025 to January 1, 2026, with no vote shown for any of them.

18. **People and organizations grew with no birth or founding record.** People rose from 1865 at build to 1941 at year end, and organizations rose from 122 to 224. The year lists no birth kind and no organization-founding kind; the nearest are `cause-group.founded` (8) and `housing.completed` (5). The one `organization.owner-changed` line, dated April 1, 2025, has an empty payload `{}` and no record id.

19. **The run took 192 seconds.** Year 1 ran in 192 s with a 1436 MB heap, and the build alone took 51 s. The target is under two minutes.

20. **The player shows no visible action.** Player `person_8898a4f0dfa869df` ends the year with job=none, cash=$0 and home `household_a3b9a1a2a676f154`. No trace, record or event in the file names this person after the header line, so no filing, campaign or job record is visible for the player.

## Counts

Records this year: 28714. News items: 589 (44 federal).

Method: a read of `audit/indiana.txt` only. The run is seed e1fd7c7878e8, from January 20, 2025 to January 20, 2026, in Kokomo, Indiana (place 1840392). No commands were run and no source was read.

Top 10 record kinds:

1. person.acted: 22218
2. cause.shared: 1995
3. speech.retold: 1516
4. news.read: 843
5. vote-recorded: 270
6. cause.volunteered: 231
7. drive.strengthened: 219
8. case.made: 189
9. speech.heard: 164
10. drive.formed: 143

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.
