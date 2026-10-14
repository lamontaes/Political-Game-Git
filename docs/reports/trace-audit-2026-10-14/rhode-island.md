# Charlestown, Rhode Island — one year (seed 3ac088ae75a4)

The engine recorded a quiet local year with a sharp state and federal budget story. The trace shows several records that need a why before anyone relies on them: no election contests, three empty seats, a federal budget cut far larger than any other line, and many repeated or zero-value votes.

## The year

Ivan Richard (person_db1aea2a95f16021), born January 24, 2007, is the player. On January 20, 2026 he is alive, has no job and has $0 in cash.

Locally, the town board (office:gus2025:194034:board) organized on February 4, 2025 under council president person_3a6a1060d27759bb. It voted on measures 2025-001 to 2025-005 on February 4, 2025 and 2025-010 to 2025-013 on February 19, 2025. Five ordinances took effect March 6, 2025 and four on March 21, 2025. Organizations closed on June 1 and June 5, 2025, and one business closed on October 1, 2025. Measures 2025-014 (July 4, 2025) and 2025-015 (September 17, 2025) followed. On January 15, 2026 the board voted 2 to 3 on bill 2026-001. No local seat was vacated. A county property tax law at 0.999 percent of home value took effect January 1, 2026.

At the state level, the House of Representatives passed photo ID (2025-001) 53 to 22 and the Senate passed it 34 to 4 on June 30, 2025. The state budget was adopted July 1, 2025 (House 64 to 11, Senate 34 to 4). Nine laws took effect July 1, 2025. Pension and highway-to-transit budget changes were recorded July 20, 2025. Lower seat seat:US-RI:lower:052:0 was vacated September 1, 2025, and upper seats seat:US-RI:upper:024:0 and seat:US-RI:upper:033:0 on January 1, 2026, all for moving away under the special-election rule. No contest was recorded. Governor Nancy Hernandez (Democratic) was in office at the opening.

Federally, Gregory Payne (Republican) became president on January 20, 2025. Congress adopted the federal budget on October 1, 2025 (263 to 170 and 65 to 35), with seven functions dropped. The House introduced 25 bills on December 15, 2025: 22 failed, 3 were enacted and 1 was vetoed. News items dated January 1, 2026 report a 37 percent top income tax rate and a 6.2 percent Social Security tax.

## Needs a why

1. **No contests and three empty seats.** `core2-elections-v1.contests: 0 of 16`. Seat-vacated records: seat:US-RI:lower:052:0 on September 1, 2025; seat:US-RI:upper:024:0 and seat:US-RI:upper:033:0 on January 1, 2026, each with rule "special-election". No fill, special election or vacancy record appears in the file.
2. **Outsized federal veterans cut.** budget-line-changed, `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`, deltaMinor=-11084392068904 on December 15, 2025. The largest state line change in the file is welfareAndMedicaid +7779222359 (July 1, 2025).
3. **Federal officials on local and cross-state records.** chamber-organized on December 15, 2025 lists council-president `official:term:seat:US-RI:us-house:01:2025-01-20`, a U.S. House seat, while the board's council president on February 4, 2025 was person_3a6a1060d27759bb. The federal bill `bill:office:US-RI:us-house:2025-12-15:official:seat:US-NY:us-house:10:95` has chair `official:seat:US-MO:us-house:08`. The January 20, 2025 chamber records name seats in other states (US-WA, US-ME, US-NY, US-FL and more).
4. **Bodies with no bills of their own.** office:US-RI:us-senate and office:US-RI:legislature-upper have no bill introductions in "bills by body". The only U.S. Senate tally is the 65-35 budget vote on October 1, 2025.
5. **Bills held in committee with zero counts.** 47 bill-held-in-committee records, all yes=0 no=0, all on June 30, 2025, all chaired by `official:term:seat:US-RI:lower:023:0:2025-01-20`. Examples: `bill:office:US-RI:legislature-lower:2025-06-30:official:term:seat:US-RI:upper:021:0:2025-01-20:17` through `:60`. The lower chamber's 52 bills from that day ended 41 failed, 2 vetoed and 10 enacted.
6. **Tied board vote with no outcome.** vote-recorded measureId 2025-015 on September 17, 2025 has positions -1, 1, 1, -1 (2 for, 2 against) on civilian-oversight-of-police. No legislative-vote or enactment record for this measure appears in the file.
7. **Identical tallies.** Upper-chamber votes of 34 to 4 repeat for measures 2025-001 (line 75), 2025-002 (line 81), 2025-003 (line 87) and 2025-012 (line 116), all June 30, 2025. The budget-adopted record for US-RI (July 1, 2025) reads "64-11, 34-4, 2025-053", identical to bill 2025-002 (lower 64 to 11, upper 34 to 4). The board's February 2025 votes all have four voters, with positions of 4-0 or 3-1.
8. **One date holds the state session.** 107 log lines are dated June 30, 2025 (lines 70 to 176), including all 52 lower bills introduced that day, in `bills by body and introduction date`.
9. **Measure IDs reused with new questions.** Board measure 2025-014 on July 4, 2025 asks the immigration question already in force as 2025-011 since March 21, 2025. State measure 2025-014 is clean-air-plan (June 30, 2025). Board measure 2025-015 (September 17, 2025) re-asks civilian oversight, in force as 2025-003 since March 6, 2025, with no replacesLawId. The immigration question returns on January 15, 2026 (`vote:2026-001:person_3a6a1060d27759bb`).
10. **Budget changes with no law record.** Budget-line changes on July 20, 2025 cite `law:US-RI:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:starting#2025-07-20` (+7786156000) and `law:US-RI:state:us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit:general:starting#2025-07-20` (highways -6318437243, transit +6318437243). law-took-effect records are dated only March 6, March 21 and July 1, 2025.
11. **Population and organization counts do not match the events.** People rose from 1828 to 1861 with 0 births and 0 deaths recorded. Alive is 1859, so two people are not alive with no death record. Organizations rose from 121 to 151 with one organization.founded record (April 1, 2025) and three closures.
12. **Empty payloads.** organization.owner-changed `{}` on March 1, 2025 and April 1, 2025. organization.founded `{}` on April 1, 2025 with no organization id.
13. **Closure traced to opening data.** organization_c5295eccaeb47689 closed October 1, 2025 (losses-kept), with source "opening [core2-officials-v1.loaded]". That is the same date as the federal budget adoption and the us-house bill introduction.
14. **Odd county tax value.** `law:county:44009:county:property-tax:general:2026-01-01` value 0.999 percent-of-home-value, replacing `law:county:44009:county:property-tax:general:2026-01-01:from-start`. The replaced law's value is not in the file.
15. **Eight unregistered module tables and an executive that left no records.** Unregistered: elections vacancies; voting contests, filings, campaigns; executive offices and terms; legislature governments and budgets. `election-ish kinds:` is blank. The governor (seat:US-RI:governor) has terms but no executive act record.
16. **Constant shares and inconsistent vacancy rules.** Every elected upper-chamber term (e.g. `term:seat:US-RI:upper:003:0:2025-01-20:past:1` through `:past:8`) has share 0.635. Every statewide term has share 0.56. Vacancy rules are stored as JSON text for office:US-RI:us-senate, office:US-RI:attorney-general, office:US-RI:secretary-of-state and office:US-RI:treasurer, but as objects elsewhere.
17. **Player not 18 at the start and no filing.** person_db1aea2a95f16021 was born January 24, 2007, so is 17 on January 20, 2025 and turns 18 on January 24, 2025. The file has no candidacy or filing record. Job is none and cash is $0 at year end.
18. **Voter count changes without a record.** The January 15, 2026 board vote (bill-vote `bill:office:gus2025:194034:board:2026-01-15:person_db1ae72a95f15b08:97`) is 2 yes, 3 no across five person ids. Earlier board votes count four voters, and no membership change appears in the file.

## Counts

Header (line 1): Charlestown, Rhode Island seed 3ac088ae75a4 start January 20, 2025 built in 63s people 1828 orgs 121

Year (line 4): year 1: January 20, 2025 to January 20, 2026 81s heap 1819MB people 1861 alive 1859 orgs 151

Records this year: 15466

Top 10 record kinds:

| Kind               | Count |
| ------------------ | ----- |
| person.acted       | 12616 |
| cause.shared       | 694   |
| cause.volunteered  | 497   |
| cause.donated      | 312   |
| news.read          | 311   |
| speech.retold      | 178   |
| vote-recorded      | 115   |
| office.approached  | 99    |
| office.replied     | 97    |
| cause-group.joined | 68    |
