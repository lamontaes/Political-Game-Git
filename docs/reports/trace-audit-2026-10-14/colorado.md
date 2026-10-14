# Colorado: one year traced

Moffat, Colorado's one-year run shows local, state and federal laws taking effect on fixed dates, and several records that disagree with each other. The places below are where the records need a cause before anyone can trust them.

## Run facts

Town: Moffat, Colorado (place 0851250). State: Colorado (US-CO). Seed 49072b6a4ffa. Start date January 20, 2025. Built in 57 seconds.
People at start 1,735; at year end 1,805 (1,802 alive). Organizations at start 117; at year end 135.
Year runtime 71 seconds, heap 1,182 MB. Player: `person_fa3c61e1dd54f501` (Michelle Haynes, born January 25, 2007).

## The year in this place

1. The town opened on January 20, 2025 with 1,735 people and 117 organizations, and the file shows 1,805 people (1,802 alive) and 135 organizations at year end.
2. The state minimum wage law took effect on January 21, 2025 at 1500 minor units per hour.
3. On February 1, 2025 seven seats were vacated for "moved away" under the appointment rule: council seats 2, 3 and 4, a coroner, a prosecutor, a sheriff and county board seat 5.
4. On February 4, 2025 the council voted on four bills (4-1, 3-2, 4-1, 4-1) and chose a council president. The four city laws from those bills took effect on March 6, 2025.
5. On February 19, 2025 the council voted 2-3 on bill 2025-005. On March 1, 2025 four more seats were vacated for "moved away" (council seat 3 again, and county board seats 2, 3 and 4).
6. On March 6, 2025 the council voted 3-2 for bill 2025-006 (the partner-immigration measure, which took effect April 5, 2025) and 1-4 against bill 2025-007. Recall petitions were recorded that day against council seats 0, 2 and 4.
7. On May 7, 2025 the state lower house received 50 bills. Ten state laws took effect that same day, the day of passage.
8. On July 1, 2025 the legislature adopted the state budget by 43-22 in the lower house and 23-12 in the upper house.
9. On October 1, 2025 Congress adopted a federal budget (259-174 and 74-26) and two federal laws took effect. On December 15, 2025 the U.S. House received 24 Colorado bills and four federal laws took effect. On January 1, 2026 two more federal laws took effect.
10. On November 1, 2025 one business closed (see Needs a why, item 31).
11. On November 4, 2025 three council seats (0, 2 and 4) had election results with totals of 2,643, 2,543 and 2,652. The mayor's contest recorded no winner and no totals.
12. On January 1, 2026 the council adopted the 2026 city budget 3-2 with four lines dropped. The county property tax law was replaced the same day.
13. On January 15, 2026 the council voted 2-3 on bill 2026-002. Fifteen people moved away during the year and no death records appear. The player is alive, has no job and has $0 cash at year end.

## Needs a why

1. **Population rose with no birth record and no death record.** The file prints "deaths: 0" (line 215). The records list has no birth or household-formed kind, and person.moved-away=15 is the only move-out kind. People went from 1,735 to 1,805 (1,802 alive), so 3 people are not alive at year end and the file gives no cause. The file does not give the alive count at start.

2. **Organizations rose by 18 with no founding record.** Organizations went from 117 to 135. The records show organization.closed=2 and business.closed=2, and the only founding kind is cause-group.founded=1. Not in the file: how the 18 added organizations came to exist.

3. **Election kinds disagree with the contest table.** The records show election-result=4 and candidate-filed=7, but the dump says "core2-elections-v1.contests: 0 of 34" and "core2-voting-v1.filings: Unregistered module table: filings". Record ids: `contest:seat:gus2025:161412:council:0:2025-11-04`, `contest:seat:gus2025:161412:council:2:2025-11-04`, `contest:seat:gus2025:161412:council:4:2025-11-04`, `contest:seat:gus2025:161412:mayor:0:2025-11-04`. The seven candidate-filed records are not in the file.

4. **The mayor's race has no winner and no votes.** The election-result for `contest:seat:gus2025:161412:mayor:0:2025-11-04` shows winnerId blank and totals {} (line 231). Its trace reaches a job-pay record for `person_069dd78a7e0d291f` (`work-relationship_24bc64da64e9d02b`), not a vote. The file names no mayor and no vote count.

5. **Election winners use two kinds of id.** Council contests :0 and :2 name person ids (`person_19947b0a4f4a4099`, `person_2b83bff918764962`). Contest :4 names an official term id (`official:term:seat:gus2025:161412:council:4:2025-02-01`). No election-result line exists for council seats 1 or 3. The file gives no share for any council race.

6. **Council seat 3 was vacated twice.** `seat:gus2025:161412:council:3` was vacated on February 1, 2025 and again on March 1, 2025, both "moved away" under the appointment rule. The file shows no fill record between the two dates.

7. **The vacancy count does not match the lines shown.** The records show seat-vacated=14. The file shows 11 lines (seven on February 1, four on March 1). The records show took-office=3. Not in the file: who filled the coroner (`seat:gus2025:212872:coroner:0`), prosecutor (`seat:gus2025:212872:prosecutor:0`) and sheriff (`seat:gus2025:212872:sheriff:0`) seats.

8. **The same posts are appointed a month apart.** official-appointed=11 records: five posts on February 19, 2025 (city-administrator, finance-director, fire-chief, planning, public-works) and six on March 21, 2025 (city-administrator, city-attorney, finance-director, fire-chief, planning, public-works). All name `appointedBy person_10b3bd852e534b4b`.

9. **Recall petitions on the day a law took effect.** Three recall-petition records dated March 6, 2025 cover council seats 0, 2 and 4: `recall:term:seat:gus2025:161412:council:0:2025-01-20:2025-03-06`, `recall:term:seat:gus2025:161412:council:2:2025-02-01:2025-03-06`, `recall:term:seat:gus2025:161412:council:4:2025-02-01:2025-03-06`. Each names the civilian-oversight law effective March 6, 2025 (`law:place:0851250:city:us-policy-positions:justice-public-safety.civilian-oversight-of-police:general:2025-03-06:2025-001`; the other lines are cut off). The seat 2 and seat 4 terms began February 1, 2025, 33 days before. The records show recall-petition=5, and the federal and state dump lists one more. The other recall records are not in the file.

10. **Three council measures show the same five votes.** On February 4, 2025, `bill:office:gus2025:161412:council:2025-02-04:person_605c72b3da2b74b9:0` (2025-001), `:2` (2025-003) and `:3` (2025-004) each show positions 1, -1, 1, 1, 1. Bill `:1` (2025-002) shows 1, -1, 1, 1, -1. The tallies (4-1, 4-1, 4-1 and 3-2) match those vectors.

11. **One measure number, two questions, six vote records.** measureId 2025-001 appears on February 4, 2025 for justice-public-safety.civilian-oversight-of-police (five vote records) and for justice-public-safety.partner-with-federal-immigration-enforcement (six vote records: 1, -1, -1, -1, -1, -1). The council has five seats. No legislative-vote line appears for the immigration measure.

12. **Bills that passed the floor also show a 0-0 committee record on the same day.** `bill:office:US-CO:legislature-lower:2025-05-07:official:term:seat:US-CO:lower:063:0:2025-01-20:9` had a committee hearing at 9-2 (line 96), a floor vote at 51-14 (line 98) and bill-held-in-committee at 0-0 (line 99). The same pattern holds for `...lower:063:0:2025-01-20:14` (floor 34-31, held 0-0) and `bill:office:US-CO:legislature-lower:2025-05-07:official:term:seat:US-CO:lower:053:0:2025-01-20:21` (floor 44-21, held 0-0).

13. **22 held-in-committee lines show 0-0.** Of the bill-held-in-committee lines in the file, 22 show yes=0 and no=0, all on May 7, 2025 in the state lower house. The bill ids are `...lower:063:0:2025-01-20:17`, `:23`, `:24`, `:26`, `:28` (see item 14), `:29` through `:40` (the `:40` record uses lower:061:0), `:43` and `:45`, plus `:9`, `:14` and `:21` (item 12).

14. **A state senator sponsors a lower-house bill.** `bill:office:US-CO:legislature-lower:2025-05-07:official:term:seat:US-CO:upper:035:0:2025-01-20:28` has a sponsor from upper seat upper:035 but sits in the lower body. It was held at 0-0 under lower-chair `official:term:seat:US-CO:lower:024:0:2025-01-20`.

15. **The President sponsors a U.S. House bill.** `bill:office:US-CO:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:62` has sponsorId `official:term:seat:US:president:2025-01-20` and bodyOfficeId `office:US-CO:us-house`. Its status is enacted, with budget lines agriculture 4019766937, transportation 11879349984 and otherPrograms -49729324339.

16. **A Colorado U.S. House bill has a sponsor and chair from other states.** `bill:office:US-CO:us-house:2025-12-15:official:seat:US-NC:us-house:01:84` sits in the Colorado U.S. House body. Its sponsor seat is in US-NC, its committee chair is `official:seat:US-SC:us-house:01`, and it was held at 0-0. The file has 24 such bills dated December 15, 2025.

17. **A U.S. House member is listed as council president.** The chamber-organized record on December 15, 2025 gives `{"council-president":"official:term:seat:US-CO:us-house:08:2025-01-20"}`, a Colorado U.S. House member in the council-president slot. The federal chamber-organized lines on January 20, 2025 name leaders with seats in other states (for example US-TX, US-IN, US-MA).

18. **Party labels use two spellings.** The two U.S. Senate seats (`seat:US-CO:us-senate:0` and `:1`) say "Democrat". The state seats and terms say "Democratic". The president and vice president say "Republican".

19. **Every statewide seat has one party.** `seat:US-CO:governor`, lieutenant-governor, attorney-general, secretary-of-state and treasurer are all Democratic, as are both U.S. Senate seats. Four of these offices (lieutenant-governor, attorney-general, secretary-of-state, treasurer) are marked estimate:true under a generic rule.

20. **Past election shares do not vary.** Every statewide term shows elected share 0.56 (for example `term:seat:US-CO:governor:2025-01-20:past:1` and `term:seat:US-CO:treasurer:2025-01-20:past:1`). Every state lower-house term shows 0.635 (for example `term:seat:US-CO:lower:003:0:2025-01-20:past:1` and `term:seat:US-CO:lower:010:0:2025-01-20:past:1`).

21. **Vote tallies repeat across bills and the state budget.** State lower house: 51-14 on 2025-002 and 2025-003; 44-21 on 2025-011, 2025-013 and 2025-014; 43-22 on 2025-015, 2025-034 and the July 1, 2025 state budget; 42-23 on 2025-006 and 2025-039. State upper house: 31-4 on 2025-004 and 2025-009; 23-12 on 2025-011, 2025-034, 2025-039 and the state budget; 24-11 on 2025-006 and 2025-013.

22. **Almost every state lower bill is introduced on one date.** 50 of the 51 state lower-house bills are dated May 7, 2025. The one other is dated July 1, 2025. Ten state laws take effect on May 7, 2025, the passage date.

23. **Effective-date lags differ by level.** Four city laws passed on February 4, 2025 took effect on March 6, 2025 (30 days later). The city law passed on March 6, 2025 took effect on April 5, 2025 (30 days later). State laws took effect on their passage date. The state minimum wage took effect on January 21, 2025. The file gives no reason for these lags.

24. **Two laws show ended or replaced on the day they took effect.** `law:US-CO:state:us-policy-positions:fiscal.minimum-reserve-balance:general:2025-05-07:2025-013` took effect May 7, 2025 with value 0 and change=ende (cut off in the file). `law:county:08109:county:property-tax:general:2026-01-01` took effect January 1, 2026 with change=replaced and replacesLawId `law:county:08109:county:property-tax:general:2026-01-01:from-start`.

25. **Policy-question values are 1.** Four federal laws dated December 15, 2025 show value 1: us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties, government-operations.ban-lobbying-after-office, civil-family-community.restrict-abortion and fiscal.balanced-operating-budget. State laws on May 7, 2025 also show value 1 for many policy questions (2025-004, 2025-006, 2025-009, 2025-011, 2025-034, 2025-035, 2025-039). The state sample bill for restrict-abortion (`bill:office:US-CO:legislature-lower:2025-05-07:official:term:seat:US-CO:lower:063:0:2025-01-20:8`) has value 1 and status failed.

26. **Federal laws and the federal budget share dates with the town.** Federal laws fall on three dates: October 1, 2025 (two), December 15, 2025 (four) and January 1, 2026 (two). The federal budget was adopted October 1, 2025. The city budget (`budget:place:0851250:2026`) was adopted January 1, 2026, the same day as the federal income-tax and Social Security laws.

27. **Large money values.** budget-line-changed retirementContributions deltaMinor 41702451000 (measureId `law:US-CO:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:2025-05-07:2025-009#2025-05-07`). The highway shift moves -18295171469 from highways and +18295171469 to transit, which nets to zero. The federal sample bill has otherPrograms -49729324339, a negative spending line, beside transportation 11879349984. The city schools line changed by -171115.

28. **Offices with no acts shown.** `seat:gus2025:212872:coroner:0`, prosecutor:0 and sheriff:0 were vacated on February 1, 2025 with no later record in the file. The county board (`office:gus2025:212872:board`) has two bills and no chamber-organized record. The U.S. Senate (`office:US-CO:us-senate`) has no bills and no votes. The governor, lieutenant governor, attorney general, secretary of state and treasurer have no acts in the file, and the executive module tables are unregistered. One state lower-house bill is vetoed, but the file shows no veto or governor act.

29. **Module tables are unregistered and named differently.** The dump lists these as unregistered: core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments and core2-legislature-v1.budgets. The budget traces cite core2-budgets-v1.governments (trace lines 274 and 285), a name the dump does not list.

30. **Traces that stop at one step or give no reason.** The bill-vote trace (`bill-vote:bill:office:gus2025:161412:council:2026-01-15:...:91:office:gus2025:161412:council`) shows only a learned perceived key, with no reason for the 2-3 result. The vote-recorded trace (`vote-recorded:vote:2026-002:official:term:seat:gus2025:161412:council:4:2025-02-01`) has one child. The two speech traces (`speech:party-meeting:party:US-CO:democratic:2026-01-15:retold:person_fa3c60e1dd54f34e` and `speech:party-meeting:party:US-CO:democratic:2026-01-15`) repeat the same learned key four or five times. The budget-line trace (`budget-line-changed:budget:place:0851250:2026:schools:adopted`) stops at region:08:rest. The budget-adopted trace (`budget-adopted:budget:place:0851250:2026`) lists "amended: welfareAndMedicaid, naturalResources, police, localAid dropped" with no reason child. The county law trace (`law-took-effect:law:county:08109:county:property-tax:general:2026-01-01`) shows change=replaced with no reason child. The federal committee trace (`committee:bill:office:US-CO:us-house:2025-12-15:official:seat:US-NC:us-house:01:84:federal:us-house`) stops at the office.

31. **One closure, two reasons.** For `organization_a0d3fa2bd70ba536` (closed November 1, 2025), `event:business.closed:organization_a0d3fa2bd70ba536` gives closing-reason=losses-kept with source "opening". `employer-closed:2025-11-01:organization_a0d3fa2bd70ba536` gives closure-source=owner-closed and stops at region:08:rest.

32. **The campaign trace has 18 witnesses and no reason.** `campaign-message:filing:contest:seat:gus2025:161412:council:4:2025-11-04:official:term:seat:gus2025:161412:council:4:2025-02-01:2025-11-04` lists 18 witness ids, and its learned keys all say campaignId. It has no reason child.

33. **The player has no job or income record.** The player ends alive, with job=none, cash=$0 and home `household_f6a0672e14ea06d3`. The file shows no pay or job record for the player. The only job-pay record in the file belongs to `person_069dd78a7e0d291f`.

34. **Record counts disagree with the dumps.** The records show budget-adopted=4 (the dump lists 2), chamber-organized=8 (the dump lists 5), seat-vacated=14 (11 lines shown), recall-petition=5 (3 lines shown locally, one federal or state) and law-took-effect=33. The file does not show the rest.

## Raw facts for the report

- Bills by body and status (92 total): office:US-CO:legislature-lower enacted 12, failed 38, vetoed 1. office:US-CO:us-house enacted 5, failed 20. office:gus2025:161412:council enacted 6, failed 8. office:gus2025:212872:board enacted 1, failed 1.
- Bills by body and introduction date: office:US-CO:legislature-lower on `2025-05-07`: 50; on July 1, 2025: 1. office:US-CO:us-house on `2025-10-01`: 1; on `2025-12-15`: 24. Council: `2025-02-04`: 4; `2025-02-19`: 1; `2025-03-06`: 2; `2025-07-04`, `2025-09-02`, `2025-09-17`, `2025-11-16`, `2025-12-31`, `2026-01-01` and `2026-01-15`: 1 each. Board: `2025-02-04`: 1; `2026-01-01`: 1.
- Failed versus enacted: state lower 38 of 51 failed (75 percent); U.S. House 20 of 25 (80 percent); council 8 of 14 (57 percent); board 1 of 2.
- budget-adopted (dump): July 1, 2025 `{"governmentId":"US-CO","fiscalYear":"2025","adoptedBy":"the legislature vote 43-22, 23-12, 2025-051"}`; October 1, 2025 `{"governmentId":"US","fiscalYear":"2025","adoptedBy":"Congress vote 259-174, 74-26 (amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped), 2025-001"}`. The city budget (trace): `budget:place:0851250:2026`, adopted January 1, 2026 by the council 3-2, 2026-001.
- seat-vacated lines shown (11): February 1, 2025 council:2, coroner:0, council:3, prosecutor:0, board:5, council:4, sheriff:0 (all "moved away", "appointment"); March 1, 2025 council:3, board:4, board:2, board:3 (all "moved away", "appointment").
- Federal law lines (FED, 8):
  - January 1, 2026: income-tax value=37 percent-top-rate; social-security-tax value=6.2 percent-of-wages.
  - December 15, 2025: us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties value=1; us-policy-positions:government-operations.ban-lobbying-after-office value=1; us-policy-positions:civil-family-community.restrict-abortion value=1; us-policy-positions:fiscal.balanced-operating-budget value=1.
  - October 1, 2025: medicaid-match value=50 percent; snap-maximum value=298 USD/month.
- chamber-organized (dump, 5): January 20, 2025 federal House, federal Senate, Colorado lower and upper, as listed in the file; December 15, 2025 `{"council-president":"official:term:seat:US-CO:us-house:08:2025-01-20"}`.

## Method

Read the whole of `audit/colorado.txt` (470 lines) in two pages of 200 lines and the final 70 lines. Counts and tallies come from the file's own lines; nothing was checked against the code. Ids are copied as written, and the file's line numbers are cited where a line is needed to find the record.
