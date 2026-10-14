# Kaunakakai, Hawaii: a local board passed ten measures, and no election or death was recorded

The county board enacted eleven measures, but no election, filing or contest happened all year. No death or birth was recorded while the head count changed. On December 15, 2025, Hawaii's member of Congress was recorded as a council president.

## The year

The local board organized on February 4, 2025, with person_451b67ecc1a47640 as council president. That day it passed five measures. Three passed 6 to 1, and two passed 4 to 3. On February 19, 2025, it passed five more. Two of those passed 7 to 0. Public comment records show no votes against any of the five bills. The first five measures took effect as county law on March 6, 2025. The second five took effect on March 21, 2025. The listing shows no board vote after February 19, 2025. Two more board bills are dated July 1 and July 19, 2025, but their votes do not appear. On March 1, 2025, an organization changed owner.

The state legislature acted on May 2, 2025. Fifty-two state House bills were introduced that day. Fourteen state laws took effect that day, and each passed both chambers. The state budget was adopted on July 1, 2025, by 41 to 10 and 22 to 3, the two chamber totals. On September 1, 2025, one person moved away. On October 1, 2025, Congress adopted the federal budget by 261 to 172 and 73 to 27. On December 1, 2025, one business closed. On December 15, 2025, a federal House bill recorded 203 yes and 230 no votes. The same day, a chamber record named a U.S. House seat holder as council president. On January 1, 2026, a county property-tax law took effect at 0.162 percent of home value.

No election, filing or campaign appears anywhere in the year. No death was recorded. The player, Seth Stevens, was alive at the end, working as a dishwasher with $7203 in cash.

## What needs a why

1. **No election, filing, campaign or contest in the whole year.** The contests table shows "0 of 20". The election kinds line is blank. The vacancies, filings, campaigns and contests tables are all "Unregistered module table". Four offices list a 2026 election year: `office:US-HI:governor`, `office:US-HI:lieutenant-governor`, `office:US-HI:us-house` and `office:US-HI:office-of-hawaiian-affairs-trustees`. Twelve visible past terms end with "endedBy":"re-elected" and no contest record, for example `term:seat:US-HI:upper:009:0:2025-01-20:past:1` and `term:seat:US-HI:upper:013:0:2025-01-20:past:1`, both ending January 1, 2025.

2. **Council president changed to a U.S. House seat holder.** The chamber-organized record of February 4, 2025 names `person_451b67ecc1a47640` as council president. The chamber-organized record of December 15, 2025 names `official:term:seat:US-HI:us-house:02:2025-01-20`. No vacancy, vote or resignation record appears for either change. The board office `office:gus2025:189877:board` is not among the nine offices shown in the offices table.

3. **The same vote sequence repeats on six board measures.** Measures 2025-001, 2025-002, 2025-003, 2025-011, 2025-014 and 2025-015 each show seven positions in the same order, 1, 1, 1, 1, 1, -1, 1 (6 to 1). Their bill ids are `bill:office:gus2025:189877:board:2025-02-04:person_097c86879b5b8ee3:0`, `bill:office:gus2025:189877:board:2025-02-04:person_097c86879b5b8ee3:1`, `bill:office:gus2025:189877:board:2025-02-04:person_097c86879b5b8ee3:2`, `bill:office:gus2025:189877:board:2025-02-19:person_097c86879b5b8ee3:10`, `bill:office:gus2025:189877:board:2025-02-19:person_097c86879b5b8ee3:13` and `bill:office:gus2025:189877:board:2025-02-19:person_097c86879b5b8ee3:14`. Measures 2025-012 and 2025-013 are 7 to 0. The vote-recorded records carry no member id, so the same dissenter cannot be checked.

4. **Public comment never opposes, and its "for" counts do not follow the votes.** Five public-comment records (bill ids ending in `person_097c86879b5b8ee3:10` through `:14`, all on February 19, 2025) show 0 against. Their "for" counts are 6, 6, 6, 6 and 3. The yes totals on the same bills are 6, 7, 7, 6 and 6. Three of these bills (`:10`, `:13`, `:14`) had one or more no votes.

5. **Gap in board bill numbering, and bills with no votes.** The count table gives 10 board bills introduced on February 4, 2025, but only bill indices `:0` through `:4` appear. The next bills start at `:10`, so indices `:5` through `:9` are absent. Board bill status totals are 17 (enacted 11, failed 5, vetoed 1). The board bills dated July 1 and July 19, 2025 appear only in the counts.

6. **Vetoes with no record, and a silent governor.** Status counts show 2 state House vetoes, 1 federal House veto and 1 board veto. No veto kind appears in the year's kinds. `office:US-HI:governor` has no record in the year. The executive offices and terms tables are "Unregistered module table".

7. **Measure ids and policy questions reused across bodies.** measureId "2025-001" names the board's paid family leave measure (February 4, 2025) and the state's exempt-groceries measure (May 2, 2025). Ids 2025-012 through 2025-015 repeat the same way between the board and the state. Paid family leave passed at county level (`law:county:15009:county:us-policy-positions:labor-workforce.paid-family-leave:general:2025-03-06:2025-001`) and at state level (`law:US-HI:state:us-policy-positions:labor-workforce.paid-family-leave:general:2025-05-02:2025-012`). Cannabis sales passed at county level (`law:county:15009:county:us-policy-positions:business-commerce.legalize-cannabis-sales:general:2025-03-06:2025-003`) and at state level (`law:US-HI:state:us-policy-positions:business-commerce.legalize-cannabis-sales:general:2025-05-02:2025-006`). No replacement is recorded for either county law.

8. **Population rose with no births or arrivals.** The header shows 1868 people at build and 1919 people at year end, of whom 1917 are alive. It shows zero deaths and nine people who moved away. The alive count rose by 49, and no birth or arrival kind appears in the year. Two people are not alive, and no death record accounts for them.

9. **Organizations rose with no founding record, and one closure is logged twice with two reasons.** The header shows 122 organizations at build and 159 at year end, a rise of 37. No organization-founded kind appears. `business.closed` and `organization.closed` both name `organization_09fd6d79b0323597` on December 1, 2025. The first gives `closing-reason=losses-kept`. The second gives `closure-source=owner-closed:2025-12-01:organization_09fd6d79b0323597`. `organization.owner-changed` on March 1, 2025 has an empty payload, `{}`, and the year shows three of these.

10. **A federal veterans line changed by far more than any other line.** The budget-line-changed record for `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` has deltaMinor -11084154413156. The largest state change shown is deltaMinor 10123022000 on May 2, 2025, for `us-policy-positions:fiscal.fund-pensions-to-schedule`. The federal change is more than a thousand times larger. Its id carries a `#balance` suffix. The `budget-adopted:budget:US:2025` record says seven budget lines were dropped in amendment, including nationalDefense and medicare. The sample federal bill `bill:office:US-HI:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:70` has otherPrograms at -86583384045.

11. **Year totals do not reconcile with the sections.** `vote-recorded` is 135 for the year. The federal and state section shows 72, and the visible board votes total 70, which sums to 142. `law-took-effect` is 40 for the year. The federal and state section shows 39. The ten county laws add 10, which sums to 49. `legislative-vote` is 64 for the year. The federal and state section shows 53, and the board adds 10, which sums to 63. `budget-adopted` is 3 for the year, with 2 listed. `budget-line-changed` is 41 for the year, with 34 listed. `chamber-organized` is 2 for the year. The federal and state section lists 5, four of them dated January 20, 2025.

12. **A law effect with no law, and a replaced law that is not in the file.** `event:law.effect-landed:2026-01-01:retirement-claim:person_c30958124b8e77b1` moves `retirement-claim:person_c30958124b8e77b1` from 165688 to 116995 minor, about 29 percent, and names no law. The county property-tax law `law:county:15009:county:property-tax:general:2026-01-01` says it replaces `law:county:15009:county:property-tax:general:2026-01-01:from-start`, which appears nowhere else in the file.

13. **State bill gaps, and a held federal bill that cites a missing state law.** State measure 2025-011 is absent from the state list, which goes from 010 to 012. State 2025-016, `us-policy-positions:government-operations.all-mail-voting`, has a vote-recorded position of -1 with no legislative vote or law. The held federal bill `bill:office:US-HI:us-house:2025-12-15:official:seat:US-ME:us-house:02:87` traces to `law:US-HI:state:us-policy-positions:civil-family-community.restrict-abortion:general:2025-05-02:2025-018`. That state law is not in the listing. The held bill shows yes=0 and no=0.

14. **The event listing stops on May 2, 2025.** The last listed event is the state vote-recorded record for measure 2025-016 on May 2, 2025, although the year runs to January 20, 2026. Events dated September 1, October 1, December 1 and December 15, 2025 appear only inside trace sections.

15. **Federal bills sit in a Hawaii office, with out-of-state sponsors, and no Senate bills appear.** Federal bills use `office:US-HI:us-house` as their body. The December 15, 2025 bill `bill:office:US-HI:us-house:2025-12-15:official:seat:US-AL:us-senate:0:90` has a sponsor from `seat:US-AL:us-senate:0`, and its vote shows 203 yes and 230 no. The held bill in item 13 has a sponsor from `seat:US-ME`. No bill has `office:US-HI:us-senate` as its body, though the federal budget vote shows a Senate tally of 73 to 27.

16. **Trace defects.** `vote-recorded:vote:2025-021:official:term:seat:US-HI:us-house:02:2025-01-20` gives its learned key as the literal word `measureId`. The trace for `official:seat:US-AK:us-house:00` loops between that person and `job:office:seat:US-AK:us-house:00:official:seat:US-AK:us-house:00`. The heard-speech trace for `speech:party-meeting:party:US-HI:democratic:2026-01-15` repeats the same learned key at least six times. The retold-speech trace repeats its key three times.

17. **Identical shares, a one-seat office with nine trustees, and two party labels.** All 12 visible past upper-chamber terms show an election share of 0.635. The governor, lieutenant governor and Office of Hawaiian Affairs terms all show 0.56 on November 8, 2022. The OHA office title says nine trustees, but `office:US-HI:office-of-hawaiian-affairs-trustees` and its seat show seats 1. The lieutenant governor and OHA vacancy rules are marked estimates with a generic citation. The two U.S. Senate seats, `seat:US-HI:us-senate:0` and `seat:US-HI:us-senate:1`, use party "Democrat", while the governor and lieutenant governor terms use "Democratic". The governor and lieutenant governor offices show governmentName "US-HI".

18. **Speech and office replies are one-sided.** speech.retold is 264 and speech.heard is 30, for the same party-meeting topic on January 15, 2026. office.approached and office.replied are both 97, so every approach got a reply, and no refusal kind appears.

19. **Unfinished paths with no outcome.** The year shows initiative.organizing-started=10, association.requested=3, drive.formed=4 and case.made=65. No initiative moves past organizing, no association forms, and no case is decided. No outcome kind appears for any of them.

20. **The player leaves no trace after the header.** `person_dde71f4cb19cf0e3` (Seth Stevens) was born January 21, 2007, so the player was 17 at the start and turned 18 the next day. Beyond the header and the status line, the file names the player in no record. No filing, campaign or vote links to the player.

## Counts

Year 1 total: 30849 records (January 20, 2025 to January 20, 2026).

Top 10 record kinds:

- person.acted=27526
- cause.shared=1462
- cause.volunteered=270
- speech.retold=264
- news.read=237
- cause.donated=191
- vote-recorded=135
- cause-group.ad-ran=103
- office.approached=97
- office.replied=97

## Method

World seed `d26da2cdad16`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/hawaii.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.
