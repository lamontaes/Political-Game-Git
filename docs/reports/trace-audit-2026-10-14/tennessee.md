# Tennessee: White House's council and board each enacted one measure, the state House enacted 11 of 55 bills, and the year ran 127 seconds

White House, Tennessee · seed 57efda3fe008 · start January 20, 2025 · people 1,784 at build, 1,864 at year end (1,858 alive) · year run time 127 s (line 4)

## The year in White House

On February 4, 2025, the White House council named a mayor pro tem and a council president, then voted on five measures. Measure 2025-001, which limits groundwater withdrawal, passed 5 to 0 and took effect March 6, 2025. The other four council measures failed 2 to 3. The board voted on five measures the same day, and all five failed, 1 to 6 or 2 to 5. On February 19, the council took up three bills and the board took up two. Across the year the council enacted 1 of 19 bills, failed 17 and recorded 1 as overridden. The board enacted 1 of 17 and failed 16.

The state House introduced 54 bills on April 30, 2025 and one on July 1, 2025. It enacted 11 and failed 44. Recorded votes on the 2025-001 consumer data privacy bill were 78 to 21 in the House and 27 to 6 in the Senate. The legislature adopted the state budget on July 1, 2025, by 76 to 23 in the House and 27 to 6 in the Senate.

Congress adopted the federal budget on October 1, 2025, by 260 to 173 in the House and 63 to 37 in the Senate, with seven functions dropped. The U.S. House introduced one bill on October 1 and 21 on December 15, 2025. Across the House, 6 bills were enacted and 16 failed.

The only election recorded was the July 26, 2025 special for State House District 044, held after a death vacancy on April 27, 2025. The appointed incumbent won with 9,444 of 10,761 votes. No town election appears.

Six seats were vacated: three by death and three by people moving away. The year summary records zero deaths. Nine businesses closed. Two traced closures, on April 29 and November 28, 2025, cite unfunded obligations and exhausted cash and credit. Four people moved away. The player character, Levi Waters, had no job and $702 in cash at the end of the year, and no record of the player's own acts appears.

## Things that need a why

1. **What:** The year line reports 127 s, over the 120-second limit. The run closes with "done 2.9 min."
   **Record ids:** `## year 1: 2025-01-20 -> 2026-01-20  127s`, `done 2.9 min`
   **Line:** 4, 459
   **Cause:** not found — `scripts/trace/viewer.ts:57-67` (the year loop) times `dev.advance(target)` for the whole year with logging on; the slow part is inside the engine and could not be profiled in a read-only pass. no code line identified for the 127 s year; a profile of `dev.advance` is needed.

2. **What:** The summary records `deaths: 0`, but three seat-vacated records carry cause "death": upper seat 011 (April 24, 2025), lower seat 044 (April 27, 2025) and lower seat 042 (October 7, 2025).
   **Record ids:** `seat:US-TN:upper:011:0`, `seat:US-TN:lower:044:0`, `seat:US-TN:lower:042:0`
   **Line:** 216, 130, 131, 429
   **Cause:** `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

3. **What:** person.acted is 15,302 of 20,136 records (76%). cause.shared is 1,747 and speech.retold is 788.
   **Record ids:** `person.acted`, `cause.shared`, `speech.retold`
   **Line:** 5
   **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The other large kinds come from the drives engine (`cause.shared`, `src/core2/data/drives.json:9`), the speech engine (`speech.retold`) and one `news.read` per person per story read (`src/core2/modules/news.ts:509-511`). (verified).

4. **What:** Committee tallies repeat. Eight committee hearings show exactly 9 yes and 2 no. All 44 hearings are logged under committee "general". The 9-to-2 hearings most often list chair `official:term:seat:US-TN:upper:022:0:2025-01-20`.
   **Record ids:** `bill:office:US-TN:legislature-lower:2025-04-30:official:term:seat:US-TN:lower:069:0:2025-01-20:20`, `bill:office:US-TN:legislature-lower:2025-04-30:official:term:seat:US-TN:upper:021:0:2025-01-20:26`
   **Line:** 142, 154, 160, 166, 170, 189, 195, 202
   **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage (verified).

5. **What:** 50 bills were held in committee. Every held bill shown carries a 0-0 tally, with no yes or no votes.
   **Record ids:** `bill:office:US-TN:legislature-lower:2025-04-30:official:term:seat:US-TN:upper:021:0:2025-01-20:25`, `bill:office:US-TN:legislature-lower:2025-04-30:official:term:seat:US-TN:upper:021:0:2025-01-20:35`, `bill:office:US-TN:us-house:2025-12-15:official:seat:US-TX:us-house:28:112`
   **Line:** 169, 210, 211, 212, 213, 214, 215, 244
   **Cause:** `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

6. **What:** 12 of the 13 public-comment records shown have `for: 0`. The one exception, line 87, shows for 1 and against 5.
   **Record ids:** `bill:office:gus2025:175831:council:2025-02-04:person_f62b2fd36fbbb7f6:0`, `bill:office:gus2025:202585:board:2025-02-04:person_8df4c53db63deace:12`, `bill:office:gus2025:202585:board:2025-02-19:person_8df4c53db63deace:18`
   **Line:** 23, 30, 43, 51, 60, 69, 78, 87, 96, 101, 106, 111, 120
   **Cause:** `src/core2/modules/meetings.ts:244-271` (`publicComment`) — the speakers are the town adults with the strongest views on the bill's question (`drive = |view| × civic`), sorted by intensity and cut to `publicCommentSpeakers`, so the room is not a sample of the town; the for and against counts are tallied among those speakers at `:326-327` (verified).

7. **What:** The board recorded the same 1-to-6 tally on six bills (2025-002, 2025-003, 2025-004, 2025-005, 2025-008 and 2025-009). The board's 2025-001 was 2 to 5. The board enacted one bill in the year.
   **Record ids:** `bill:office:gus2025:202585:board:2025-02-04:person_8df4c53db63deace:9`, `bill:office:gus2025:202585:board:2025-02-19:person_8df4c53db63deace:19`
   **Line:** 59, 68, 77, 86, 95, 119, 128
   **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members. The one yes on each 1-6 bill is probably the sponsor, whose position carries the sponsor term (`legislature.ts:1268-1272`); why the sponsor's filing reason (`world-legislating.ts:395-409`) leaves the other six against was not traced (probable; not confirmed by a run).

8. **What:** Measure numbers repeat across bodies with different questions. The measure id 2025-001 is the council groundwater measure, the board right-to-counsel measure, the state House privacy measure and the federal budget adoption label. The measure id 2025-009 is the council cannabis measure, the board minimum-wage measure and the state grocery-tax measure.
   **Record ids:** measureId `2025-001` (lines 17, 52, 139, 300); measureId `2025-009` (lines 97, 121, 181)
   **Line:** 17, 52, 97, 121, 139, 181, 300
   **Cause:** `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body (verified).

9. **What:** The dump shows council status "overridden: 1". No override vote or override record for this council appears in the file.
   **Record ids:** `office:gus2025:175831:council`
   **Line:** 409
   **Cause:** `src/core2/modules/legislature.ts:2188-2262` (`overrideVote`) writes each override vote to the `votes` table with `override: true` and `executiveAction` sets the bill status "overridden" (`:2143-2160`), but neither calls `api.emit`, so no log record exists for the override (verified).

10. **What:** The special election's contest names incumbentTermId `term:seat:US-TN:lower:044:0:2025-07-26:elected`, but the winner is `official:term:seat:US-TN:lower:044:0:2025-04-27`, a term that began on the vacancy date. The winner's took-office record is dated July 26, 2025. The file shows no appointment record for this seat.
    **Record ids:** `contest:seat:US-TN:lower:044:0:2025-07-26:special`, winnerId `official:term:seat:US-TN:lower:044:0:2025-04-27`
    **Line:** 318, 369, 423
    **Cause:** Not a defect: `src/core2/modules/elections.ts:430-441` (`specialContestFor`) sets `incumbentTermId` to the term serving when the contest opens, which is the interim appointee's term begun on the vacancy date (`offices.ts:861-907`); that appointee stands as the incumbent under id `official:<term id>` (`voting.ts:1015-1024`), and `takeOffice` writes a new term `term:<seat>:<date>:elected` on the day they take office (`voting.ts:2508`); the appointment has no record because `appoint` emits none (verified).

11. **What:** Three seats vacated by moving away have no vacancy, contest or appointment row in the file: lower seat 032 (October 1, 2025), lower seat 027 (December 1, 2025) and upper seat 015 (January 1, 2026). The upper seat 015 holder was the Senate majority leader at organization on January 20, 2025. The contest table shows 1 of 27 contests.
    **Record ids:** `seat:US-TN:lower:032:0`, `seat:US-TN:lower:027:0`, `seat:US-TN:upper:015:0`, `official:term:seat:US-TN:upper:015:0:2025-01-20`
    **Line:** 368, 428, 430, 431, 441
    **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module; and `src/core2/modules/offices.ts:922-998` (`fillVacancy`) — a `special-election` vacancy stays empty until the date from `specialElectionDate` (`src/core2/elections-calendar.ts:651-685`: the next November general, a set number of days, or an estimate); for a seat that does not cover the town `specialContestFor` returns null (`src/core2/modules/elections.ts:399-400`), so the seat is filled only by the calendar stand-in on that date (`offices.ts:1000-1048`), usually after the year ends. Here the vacancy rows exist in `core2-offices-v1.vacancies` (`offices.ts:128`) and the viewer reads `core2-elections-v1.vacancies` instead (verified).

12. **What:** Eight module tables print "Unregistered module table" with no rows: vacancies, contests (voting), filings, campaigns, executive offices, executive terms, legislature governments and legislature budgets. The executive office and budget rows cannot be checked from this file.
    **Record ids:** `core2-elections-v1.vacancies`, `core2-voting-v1.filings`, `core2-executive-v1.offices`, `core2-legislature-v1.budgets`
    **Line:** 371, 373, 375, 377, 379, 381, 383, 385
    **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module (verified).

13. **What:** The veterans balance change records `deltaMinor=-11082592818601`. Read as cents, that is about -$110.8 billion. Read as dollars, it is about -$11.08 trillion. The file does not state units. A sample federal bill's otherPrograms provision is -138632489204 in the same units.
    **Record ids:** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`
    **Line:** 270, 273, 413
    **Cause:** Not a defect: `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line; and `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget (verified).

14. **What:** Federal chamber records use different keys than state records. The January 20, 2025 federal speaker is a seat id (`official:seat:US-WI:us-house:06`), not a term id like the state records. The December 15, 2025 federal House record uses the key "council-president" for a U.S. House member.
    **Record ids:** `official:seat:US-WI:us-house:06`, `official:term:seat:US-TN:us-house:02:2025-01-20`
    **Line:** 437, 438, 444
    **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation. The seat-id form `official:seat:US-WI:us-house:06` is how `congressMembers` names members of other states, who have no term row in this town's world (`src/core2/modules/legislature.ts:953-1010`), while the town state's members have real term ids (verified).

15. **What:** Five federal news items record value=1 with no unit, while other federal items carry units.
    **Record ids:** `us-policy-positions:health-human-services.expand-medicaid-eligibility`, `us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties`, `us-policy-positions:fiscal.minimum-reserve-balance`, `us-policy-positions:civil-family-community.restrict-abortion`, `us-policy-positions:fiscal.balanced-operating-budget`
    **Line:** 9, 10, 11, 12, 13
    **Cause:** Not a defect: `src/core2/modules/laws.ts:538-545` — the `law-took-effect` event carries `unit: row.unit ?? ""`; a policy-position law (value 1 means in force) has no unit, so the viewer's FED line (`scripts/trace/viewer.ts:92-95`) prints value=1 with a blank unit (verified).

16. **What:** The player did nothing recorded in the year. The job is none, cash is $702, and no record of the player's own acts appears.
    **Record ids:** `person_0d5673c39b7a96ba`, `household_53cd82c912e79715`
    **Line:** 2, 219
    **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

17. **What:** Fields are truncated. Three federal and state office vacancy rules end in "…". Two trace child lists and two news or law lines are cut off mid-field.
    **Record ids:** `office:US-TN:us-senate`, `office:US-TN:governor`, `office:US-TN:legislature-upper`, `law:place:4780200:city:us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal:general:2025-03-06:2025-001`
    **Line:** 129, 259, 313, 336, 338, 339, 340
    **Cause:** `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters; and `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat (verified).

18. **What:** The business-closure trace for `organization_ae9d70e2db4a47e9` stops at "opening [core2-officials-v1.loaded]" and cites no closing event. The April 29, 2025 closure of `organization_34dfac98243cbfcd` carries the same closing reason, with a source that cites residents and a payroll calendar.
    **Record ids:** `organization_ae9d70e2db4a47e9`, `organization_34dfac98243cbfcd`
    **Line:** 135, 136, 279-284
    **Cause:** `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record; and `src/core2/modules/business.ts:603-608` — an owner who closes by choice records "losses-kept" when the business carried losses, else "owner-retiring" (`src/core2/data/business/business.json:48-52`), and `src/core2/finance-state.ts:1518-1530` names the closing receipt `owner-closed:<date>:<org>`; the reason and the closure source are two different fields, not two reasons (verified).

19. **What:** April 30, 2025 carries 79 record lines in one day. The state chamber-organized records on that day repeat the January 20, 2025 leaders exactly.
    **Record ids:** `official:term:seat:US-TN:lower:007:0:2025-01-20` (speaker, lines 137, 440 and 442); `official:term:seat:US-TN:upper:032:0:2025-01-20` (lines 141, 441 and 443)
    **Line:** 137-215, 440-443
    **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date. The chamber-organized rows repeat the January leaders because `organize` runs again whenever a chamber's member list changes (`leadership.ts:288-303`) and `elect` is deterministic (`leadership.ts:213`) (verified).

## Levels at a glance

- **Local:** The White House council and board acted on February 4 and February 19, 2025 across 36 bills (council 19, board 17), with 1 enacted in each body. The city groundwater law took effect March 6, 2025. Verdict: works with gap: no town election, no mayor or executive record, and an "overridden" council status with no override vote in the file.
- **State:** The state House acted on 55 bills (11 enacted, 44 failed), with recorded votes in both chambers, and the legislature adopted the budget on July 1, 2025. Verdict: works with gap: Senate bills are missing from the bill table, the executive office and term tables are unregistered, and four vacancies have no contest or appointment rows.
- **Federal:** The U.S. House acted on 22 bills (6 enacted, 16 failed), Congress adopted the budget on October 1, 2025, and the file holds 40 federal news items. Verdict: works with gap: the veterans balance change looks wrong in its units, the federal chamber records use non-standard keys, and the federal executive tables are unregistered.
