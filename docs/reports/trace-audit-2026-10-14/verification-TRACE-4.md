# Verification of TRACE-4 claims

Every numbered item in the ten place reports now has a cause or a "not found". The lead's North Carolina crash is confirmed. Most oddities fall into 28 repeating patterns. About a third are the viewer misreading the log. The rest are real engine defects. A newspaper reporter files for office and is then interviewed by their own paper, which causes the crash. Vacancies are filled with no record. Special elections never run. Whole sessions are decided on one day. The federal House is labeled with a council post.

Verdicts: DEFECT (the engine does something wrong for play), VIEWER (the viewer or report misreads or misprints), EXPECTED (correct behavior), NOT FOUND (no line explains it).

## Recurring patterns

### R0. Lead's North Carolina crash (seed d48dca5fc9c0, Scotland Neck, September 29, 2025) - CONFIRMED, lines refined

Verdict: DEFECT.

Cause chain, all confirmed in code and in `audit/north-carolina-crash-d48dca5fc9c0.txt` (stack: state.ts:1222, press.ts:1429, press.ts:2286, press.ts:256):

1. `src/core2/state.ts:1218-1222` `meet()` throws "Invalid meeting endpoints." when `actorId === otherId`.
2. `press.ts:1312-1326` `reporterFor()` lists the outlet's living reporters and sorts by `closeness(reporter, candidate)` then by id. It never drops the candidate. Self-closeness is 0 like every other pair, so the id tie-break picks `...reporter:0`, which is the candidate.
3. `press.ts:1254` `arrange()` stores that reporter in `base.reporterId`.
4. `press.ts:2244-2286` `pressWeek()` loops every on-ballot filing and calls `arrange` (2267) then `publish` (2286). It never skips a candidate who works for the outlet.
5. `press.ts:1422-1423` `publish()` takes `row.reporterId ?? reporterFor(...)`. `press.ts:1427-1431` calls `api.meet(reporterId, row.candidateId, ...)` with no `reporterId !== row.candidateId` check. The call site is line 1429.

Lead's lines (reporterFor ~1312, publish ~1423-1429) are right. Added detail: the reporter is chosen earlier at press.ts:1254, so fixing only `publish` is not enough.

How a press reporter got to file for council:

1. `press.ts:418-441` hires the owner, head and reporters of each outlet through `hireStaffMember` (`src/core2/press-staff.ts:123`). `press-staff.ts:171-186` sets the home to the town (`input.livesAt ?? input.townPlaceId`) for a local paper. These are ordinary full people in the town (`person:press:...`).
2. `candidacy.ts:699-712` `weighContest()` builds the pool of runners from every living person in the town who meets the minimum age. It excludes only player-controlled people, people committed to another seat that day, and the incumbent who already filed. It has no rule for media staff.
3. `candidacy.ts:826-860` `fileRunners()` files whoever decided to run.
4. The same gap seats reporters at the opening: `offices.ts:256-289` `suitedResidents()` fills opening council and board seats from all town people aged 25 to 80, ranked by trait fit. No media exclusion. PA 2 shows a council bill sponsored by `person:press:outlet:newspaper:3:...:reporter:0`, so a reporter already sat on that council in February 2025.

Effect on the player: a whole year of play dies with an exception when a newspaper's own reporter is a candidate. Reporters also sit on councils and run against the town they cover.

### R1. "deaths: 0" disagrees with the not-alive count

Places and items: NM 1; NY 4; NC 8; ND 2; OH 8, 19; OK 10; OR 3; RI 11; SC 4.

Cause:
- The viewer line `deaths: N` counts log records whose kind matches /death|died/ in `core.durableLog` for the year (viewer.ts:98-100). The people count `alive` is read from `core.people` (viewer.ts:67).
- A death happens at `health.ts:419-446`: `api.updatePerson(id, { alive: false })`, then `api.emit` of kind `life.death` (kind from `src/core2/data/health.json:6`). That event sets no `publicRecord` and no `news` (health.ts:350-390, `caseEvent`).
- `state.ts:690-715` `retainLog()` keeps an event in `durableLog` only if it touches the player's circle, the focus people, or is a public record at a visible place, or is news. Most deaths are none of these, so they are not kept.
- The death still reaches every module. `offices.ts:132-137` listens to `life.death` and calls `vacateSeat(..., "death")`. That is why the seat-vacated record says "death" while the viewer says 0.
- Counted residents who die use `removeCountedPerson` (`src/core2/modules/residents.ts:1314-1370`). That drops the household record and logs nothing. It does not set `alive: false`, so it is not in the not-alive count either.

Verdict: VIEWER for the "deaths: 0" number (it reads the retained log, not the world). EXPECTED for the retention rule. The people engine has no durable death record outside the circle, which is a gap for "ask why" but not a break in play.

Effect on the player: none directly. The audit cannot count deaths from the log.

### R2. People and organizations grow with no birth, arrival or founding record

Places and items: NM 6; NY 11; NC 8, 9; OH 19; OK 10, 11; OR 3, 6; RI 11; SC 5.

Cause:
- Counted births and arrivals: `src/core2/births-counted.ts:340-367` births (written to the births table only) and `births-counted.ts:430-460` arrivals (`admitCountedHousehold`, no `api.emit`). Named births do emit `person-birth` (`renewal.ts:224`), and SC shows two of them.
- Counted deaths and departures: `births-counted.ts:285-304` and `departCountedHousehold` at 398-426. No event.
- Organization growth: many engines call `api.addOrganization` and none emits `organization.founded`. Examples: campaign committees (`campaigns.ts:362`), stand-in ad sellers (`campaigns.ts:870, 1500`), government treasuries and tax collectors (`budgets.ts:244, 606`), outlets (`press.ts:418`), employers' groups and resident groups (`interest-groups.ts:203, 469`), parties (`parties.ts:191`). Only a business founding emits (`business.ts:1366`). Cause groups emit `cause-group.founded`, counted separately.

Verdict: EXPECTED (counted flows are monthly counts, per "two-level population"). VIEWER for reading the log as the whole story.

Effect on the player: none. People and places change by counts, and a filled-in person matches the records.

### R3. A U.S. House seat is recorded under the key "council-president" on December 15 (the federal session day)

Places and items: NM 13 (first half); NY 16; ND 1; OH 6; OK 14; OR 2; PA 12; RI 3 (first sentence); SC 12 (first sentence).

Cause:
- `world-legislating.ts:638-648`, `endOfSession()`: for the U.S. session the "lower" body is `houseOffice(api)` (`world-legislating.ts:258-270`), which returns `{ id: <the town state's first us-house office id> }`. Line 648 then calls `leaderOf(api, lower.id, "majority-leader")` with that office id, not with the federal chamber id `federal:us-house` (`legislature.ts:930`).
- `leadership.ts:288-300` `organize()` takes `members(api, "office:US-XX:us-house")`, which is only that state's House delegation (`legislature.ts:907-923`).
- `leadership.ts:113-138` `templateOf()` knows only the ids `federal:us-house` and `federal:us-senate`. For any other office whose kind is `us-house...` it falls through to "council-manager" (line 136-137). Council-manager posts include "council-president".
- `leadership.ts:395-418` (`organizeNow`) then emits `chamber-organized` with those posts as facts. First read is on the first session day, December 15.
- `leaderOf(... "majority-leader")` returns nothing for that template, so the floor leader falls back to the most senior member (`world-legislating.ts:649-657`).

Verdict: DEFECT. The real House is organized correctly under `federal:us-house` (January 20 record with speaker, majority-leader); this second call organizes the wrong body with the wrong template.

Effect on the player: a stray council-president post for a congress member appears in news and the record; the floor leader for the U.S. session is picked by seniority, not by the elected leader.

### R4. Federal bills belong to the town state's House office, with sponsors and chairs from other states

Places and items: NM 12; OH 7; OK 6; OR 14; PA 11; RI 3 (second and third sentences); SC 11, 12 (second half).

Cause:
- Bill home: `legislature.ts:545-551` `budgetChambers()` sets `introducedIn: house.id` where `house` is the first `us-house` office found. `world-legislating.ts:258-270` does the same for session bills. So every federal bill is filed under `office:US-<town state>:us-house`, which has the town state's seats (17 in PA).
- Votes and committee: `chambersOf` (`legislature.ts:1640-1650`) turns that office into `[federal:us-house, federal:us-senate]`, so the floor vote is the whole House (433 votes) and the committee chair comes from the whole House (`committeeStage`, `legislature.ts:1791-1860`, `leadership.ts` organize of `federal:us-house`). A chair from US-KS or US-LA is the real House committee chair.
- Sponsor: `world-legislating.ts:657-662` sets `filers` to every House and Senate member; `world-legislating.ts:480-491` picks the highest filing reason. A senator from Virginia can sponsor a bill whose home office is the New Mexico House office.
- State bills with Senate sponsors (SC 11): same cause. The lower body is the home for all bills (`world-legislating.ts:638-646`) and `filers` includes upper-chamber members (`world-legislating.ts:658-664`).

Verdict: DEFECT for the label and the cross-chamber sponsor (a senator "sponsors" a House bill, a state senator sponsors a lower-chamber bill). EXPECTED for the large tally (433 is the whole House) and the out-of-state chair. PA 11 is VIEWER (the 17-seat office is only the home label).

Effect on the player: bill ids and "sponsor" names look wrong and a senator's bill starts in the House; the vote itself is the correct whole-body vote.

### R5. Bare `official:seat:...` ids for members of other states

Places and items: NM 13 (second half); OK 6 (trace resolves a person to `official:seat:US-AK:us-house:00`); RI 3 (third sentence).

Cause: `legislature.ts:1058-1060` `memberKey()` returns `term.personId`. For seats outside the town's state, `congressMembers()` (`legislature.ts:953-1056`) seats a named official as a person whose id is `official:seat:<seat>` (the officials engine, `seatOfficial`). Town-state members have a term row, so their key reads `official:term:seat:...`.

Verdict: EXPECTED (named officials are filled-in people; ids differ by whether a term row exists).

### R6. The upper chamber and the U.S. Senate never introduce a bill

Places and items: NM 18; NY 10; OR 13 (last clause); RI 4; SC 11.

Cause: `world-legislating.ts:638-646` sets the session body to the lower chamber (or the unicameral one) and `world-legislating.ts:547-559` drafts every bill with that body. The upper chamber only votes (`chambersOf`, `legislature.ts:1640-1670`, second in order). For the U.S., the House office is the home (R4) and the Senate votes after. Budget bills go through `budgetChambers` (`legislature.ts:553-575`), which also introduces in the first chamber.

Verdict: DEFECT (design gap: no bill ever starts in a senate). NY's 63-37 and RI's 65-35 Senate budget votes are real roll calls from `legislature.ts:316-345`.

Effect on the player: a state senator has no bills to carry or study, and Senate-first bills cannot occur.

### R7. A session's whole agenda is introduced, heard, voted and decided on one day

Places and items: NM 8, 9 (date); NY 9; NC 18, 14 (Oct 1 and Dec 15); ND 6, 7; OH 5; OK 6, 7; OR 13, 16; PA 10; RI 5, 8; SC 9, 10.

Cause:
- `world-legislating.ts:74-109` `openWorldLegislating()` schedules one `session-end` for the U.S. on `congressAgendaDate` (`world-legislating.ts:167-173`, day 349 of the year = December 15, parameter `congressAgendaDayOfYear` in `src/core2/data/campaigns/parameters.json`) and one per state session on its recorded adjournment date (`agendaDatesOf`, `world-legislating.ts:111-130`; legislatures that sit all year use month 6, `fullYearSessionAgendaMonth`, so June 30).
- `world-legislating.ts:613-692` `endOfSession()` and `world-legislating.ts:433-587` `holdSession()`: on that day every member files, `draftBill` stamps `introduced = today` (`legislature.ts:810-826`), `holdVote` runs committee, floor and executive at once (`world-legislating.ts:546-573`). Bills past the day's floor time die (`dieOnCalendar`, `world-legislating.ts:590-598`).

Verdict: DEFECT for play (a legislature has no calendar of introductions, hearings and votes). EXPECTED as the model's one-sitting simplification.

Effect on the player: a bill cannot be seen moving; everything is introduced and decided on the adjournment date, so nothing can be lobbied or amended between.

### R8. Committees: one chair per committee, "held" bills at 0-0, tallies always sum to 11

Places and items: NM 8; NY 9; NC 18; ND 6, 7; OH 5, 7; OK 4; OR 12, 13; PA 10; RI 5; SC 9, 10.

Cause:
- `legislature.ts:1768-1778` `committeeFor()` sends almost every bill to the "general" committee (only budget lines and income or sales tax go to "finance", minimum wage to "labor"). One committee means one chair for most bills.
- `legislature.ts:1791-1860` `committeeStage()`: the roster size is `committeeSize` = 11 (`src/core2/data/campaigns/parameters.json:843`), so each hearing's yes plus no is 11 (OR 12, NY 9, ND 6).
- `legislature.ts:1861-1869`: the chair holds a hearing only when the chair's own position plus a trait lean is not negative. Otherwise `heard` is false and the roster is not polled (`legislature.ts:1898-1903` counts yes and no only `if (heard)`), so the record is `bill-held-in-committee` with yes 0, no 0 (emitted at `legislature.ts:1932-1948`).
- Bodies with nine members or fewer skip committee (`committeeOfTheWholeMaximum` = 9, `legislature.ts:1796-1798`).
- In the second chamber a bill passed by the first can be held by that chamber's chair (OK 4): `holdVote` runs `committeeStage` per chamber (`legislature.ts:1983-1989`).
- The same chair across bills is the party-ordered pick of `leadership.ts:515-538` (`assignCommittees`) and holds until the membership changes (`leadership.ts:288-300`).

Verdict: EXPECTED mechanically (a chair who dislikes the bill buries it; a registered stopgap `SG-GOV-committee-structure` marks the simplification). DEFECT for play in one respect: a held bill leaves no vote and no reason on the log beyond the chair's id.

Effect on the player: most bills die in the chair's drawer with no recorded reason.

### R9. State and federal tallies repeat exactly across unrelated bills; every vote has full attendance

Places and items: NM 2 (state part), 9; NY 18 (see R12); ND 5; OH 4; OR 12; RI 7; SC 2; PA 9 (close split).

Cause:
- `legislature.ts:1676-1722` `chamberVote()` polls every member and counts `position.total > 0` as yes, `< 0` as no, `== 0` as abstain. There is no absence model, so yes + no equals the membership (99 in the OH House, 203 in the PA House).
- `legislature.ts:1242-1330` `positionOn()`: for an official, `officials.ts:1021-1098` `officialParts()` gives a party term `pull * loyalty * lead * |care|` (`officials.ts:1054-1064`) where `lead` is the party leader's side on that bill. When the party term dominates, every member of a party votes with the leader and unrelated bills produce the same split (83-11, 26-16).
- Budget votes use the same positions plus a duty to adopt, `budgetAdoptionDuty` = 0.3 (`legislature.ts:326-329`), so the adopted budget repeats a bill's tally (OH 4, ND 5, RI 7, NM 9).
- PA 9 (102-101, 103-100): the PA House is a real near-even chamber (203 members); `chamberVote` reproduces that.

Verdict: DEFECT-suspect for play (identical splits on different questions). The structure is found. How much the party term dominates was not measured. NOT FOUND for a numeric proof. PA 9 is EXPECTED.

Effect on the player: state and federal votes read as party-line stamps, so an unusual coalition never forms.

### R10. Local boards and councils: same split on every measure; most bills fail; one sponsor

Places and items: NM 2 (board part), 4; NY 3, 6, 8; NC 3; ND 4; OH 1, 2; OK 1, 2; PA 2, 13; SC 2, 3, 14, 15.

Cause:
- The sponsor of each bill is the member with the highest filing reason (`world-legislating.ts:480-491`). `filingReason` (`world-legislating.ts:395-409`) includes the member's trait lean (`filerOf`, `world-legislating.ts:345-372`, a fixed per-person number from `world-legislating.bring-agenda`). The member who scores highest on that constant tends to sponsor every bill at a meeting.
- The sponsor votes yes by definition (`legislature.ts:1268-1272`, sponsor term = 1 for oneself). Every other member votes on views plus the same per-member `trait` term (`legislature.ts:1296-1300`, `traitLean` at 1091-1102, `traitDecisionWeight` = 0.5 in `src/core2/data/parameters.json:4580`) and the sponsor-closeness term.
- Result: 1 yes and the rest no on bill after bill (NY 3, OH 1, OK 1, SC 2), or the same 4-2 split (NM 2).
- Public comment (OH 2, OK 2, SC 15, PA 13): `meetings.ts:253-318` picks the residents who feel most strongly (`publicComment`, chosen by `|view| * (1 + civic)`), counts "for" as those who support the bill's direction. The comment tally of 0 for is the town's view against the sponsor's bills.
- Fail count: a bill needs more yes than no (`legislature.ts:2019`); with one sponsor it rarely passes.

Verdict: DEFECT-suspect (cause chain found; the weight of the constant per-person terms against the question terms was not measured). NOT FOUND for a number.

Effect on the player: town votes look the same bill after bill, so winning a vote does not depend much on the question.

### R11. `vote-recorded` positions are the stance on the policy, not yes or no on the bill

Places and items: NC 1, 2 (mirrored count); OR 10; ND 10; RI 6; OK 17 (lines differ only in position).

Cause: `legislature.ts:1712-1720`: `position: vote === "yes" ? stance.position : -stance.position`. `stance.position` is +1 if the bill's provision enacts the policy and -1 if it repeals it (`provisionStance`, `legislature.ts:629-660`, `value > 0 ? 1 : -1`). On a repeal bill, a "no" vote records position +1 (still for the policy). So five no votes on a repeal read as five +1 positions against a "yes 2, no 5" tally. The repeat votes are repeal attempts of a policy just enacted: `world-legislating.ts:721-770` `localMeeting()` lets a member who wants the policy gone file a repeal (`needsChange` for direction below zero at 759-763), and `lawStanding` (`world-legislating.ts:~380-393`) adds only a reluctance, not a bar.
- ND 10: the graduated tax was ended by a bill that voted yes; the members' -1 positions are "against the tax", consistent with yes votes on a repeal. `laws.ts:523-526` marks `change: "ended"` when a policy question is set to 0.
- OR 10: position -1 beside a 58-2 pass is the same thing for the two no votes of a bill, or yes votes on a repeal.

Verdict: EXPECTED for the engine, VIEWER for the readers (the field is named "position" and carries the stance, not the ballot).

Effect on the player: none; the vote count is the ballot.

### R12. `vote-recorded` lines show no voter, no body; measure numbers repeat across bodies

Places and items: NY 18; NC 3; ND 4; OH 3; OK 5, 17; OR 11; PA 8; RI 9 (measure reuse); SC 2.

Cause:
- Numbering: `legislature.ts:750-758` `nextNumber()` counts per `officeId:year`. Every body (council, board, state house, U.S. House) starts at 2025-001, so one measure number names a different bill in each body.
- `record.ts:68-80` `recordVote()` keys a row `vote:<measureId>:<personId>`, so the id does not name the body. If one person voted on the same number in two bodies, the second row would overwrite the first, and `state.ts:704` (`durableLog.has(event.id)`) would drop the second `vote-recorded` event.
- `record.ts:102-106`: the event keeps `measureId`, `question` and `position` in `facts`. The voter is in `personIds` (`record.ts:94`) and the body is only in the source citation (`record.ts:96-100`). The viewer prints `facts` only (viewer.ts:97-98), so the voter looks missing and lines look identical.
- Only people are recorded (`record.ts:85-89`). Named officials who are not full people never get a line, so a six-member body shows fewer lines than it has members (OK 5: 11 bills, 5 vote lines; floor time limits it to 5 bills a meeting, `world-legislating.ts:544`, 150 agenda minutes / 30 per ordinance).
- Number jumps (OK 5: 2025-005 then 2025-012): numbers are issued at drafting, but bills past the floor time die without a vote (`world-legislating.ts:560-563`).

Verdict: DEFECT for the shared measure number (no body in the id); VIEWER for the missing voter id.

Effect on the player: "measure 2025-001" cannot be told apart across bodies in the record.

### R13. Vacancies with rule "appointment": the seat is filled the same day, silently

Places and items: NM 5; NY 3, 5 (town seats), 6; NC 4, 5; ND 3, 11; OH 10, 11; OR 4, 5 (local seats), 5 (clerk note); PA 3; SC 3, 6 (the seats vacated Feb 1).

Cause: `offices.ts:793-847` `vacateSeat()` ends the term, emits `seat-vacated`, then calls `fillVacancy` (`offices.ts:849-917`). For rule "appointment" and "successor", the local `appoint()` (`offices.ts:861-911`) seats a replacement at once: a suited resident for a city, county or township (`suitedResidents`, `offices.ts:256-289`; that resident must lean toward accepting) or a named official otherwise (`seatNamedOfficial`, `offices.ts:304-370`). It writes a new `serving` term in the same seat and marks the vacancy "filled". It emits no event: no `official-appointed`, no `took-office` (the only `took-office` emit is `voting.ts:2532`). The viewer does not print vacancies or terms for local seats.

So the seat is not empty. That explains why a body keeps six or seven voters after vacancies, and why a budget still passes 5-0 (ND 3, PA 2, OR 4). A refilled seat can later be vacated again by the appointee's own move (NC 4).

Verdict: DEFECT (a person enters office with no record, no news and no scene; "ask why" has nothing to cite). The seat count itself is EXPECTED. Voter-count differences between votes (NM 4, RI 18, NY 6) are VIEWER: `legislative-vote` lists only members who are people (`legislature.ts:1727-1730`); a named official replaced by a resident adds one person-backed voter.

Effect on the player: the player cannot see who took a vacated seat, or how, or when.

### R14. Vacancies with rule "special-election" on state or federal seats outside the town: stand-in, empty until the election date, no race

Places and items: NY 5 (state seats); OK 8; PA 5; RI 1; SC 7.

Cause:
- `offices.ts:920-947` `fillVacancy()` sets status "awaiting-election" and a date, then asks the elections engine to open a real race (`specialElections`, registered at `voting.ts:296-301`).
- `elections.ts:399-400` `specialContestFor()` looks the seat up in `townSeats()` (seats that cover the town) and returns null when it is not found. A state-house seat for another district is not found, so no contest, no filing, no result.
- `offices.ts:949-957`: with no race, a `special-election` calendar item is scheduled. `offices.ts:1000-1051` `officesCalendarWork()` on that date ends the interim term and fills the seat by `fillVacancy` with a forced "appointment" ("the special election (stand-in)"), seating a named official. Registered stopgap `SG-GOV-special-election-appointee` (offices.ts:1007-1009).
- Until that date the seat has no holder, so the chamber runs a member short (`members()` reads only `serving` terms, `legislature.ts:907-923`).

Verdict: DEFECT (no race, empty seat until the date; the winner is a generated name). Registered stopgap. For vacancies after about Oct to Dec 2025 the date can fall after the year ends, so the seat stays empty for the whole file.

Effect on the player: state and federal vacancies never become elections the player can enter or watch.

### R15. A contest nobody enters has no winner, and the seat is not refilled

Places and items: OH 9 (mayor); SC 6 (assessor, board seat 5 specials).

Cause:
- Who runs: the pool is town people plus counted adults who clear the stay-out bar (`candidacy.ts:699-745`, `countedScreen` at `candidacy.ts:777-823`). If no one clears it, `runIds` is empty.
- `voting.ts:1963-1969`: `totals` is built from the filings, so it is `{}`. `voting.ts:1976-1989`: with no one above zero, `winnerId` is null.
- `voting.ts:2060-2062`: no winner means `openNextCycle(api, contest.seatId)` and nothing else. For a special election, `vacancyFilled` (voting.ts:2528) is only called on a win, so the vacancy stays "awaiting-election" forever (SC 6).
- OH 9: the appointments by `person_0c1baf...` in the file come from the opening mayor's term (still the sitting official), not from a new mayor. The seat stays with the old term or empty.

Verdict: DEFECT (an uncontested-by-nobody election ends in nothing, with no write-in and no fallback).

Effect on the player: an open mayor's office or council seat can simply stay vacant.

### R16. "0 of N" contest counts and "Unregistered module table" errors come from the viewer

Places and items: NM 10, 11; NY 5 (tables part), 16 (terms count); NC 16; ND 12, 13; OK 3, 8; OR 17; PA 5, 6, 15; RI 1, 15; SC 8, 17.

Cause:
- `viewer.ts:235-242` dumps tables that do not exist under those module names. `module-state.ts:182` throws "Unregistered module table: <name>" and `viewer.ts:195-207` prints the message. Real homes: vacancies in `core2-offices-v1` (`offices.ts:128`); contests and filings in `core2-elections-v1`; campaigns in `core2-campaigns-v1`; the executive module has `appointments`, `orders`, `desk`, `review` (`executive.ts:95-99`) but no `offices` or `terms`; budgets and governments live in `core2-budgets-v1` (`budgets.ts:55`), not `core2-legislature-v1`; the voting module has `chosen`, `ballots`, `countedBallots`, `turnout`, `pollingPlaces`, `results`, `places` (`voting.ts:259-276`).
- "0 of N": the `high` filter (`viewer.ts:210-212`) keeps only rows without `gus2025`, `place:<digit>` or `county:<digit>` in the id. Local contests are removed, so N counts everything and the shown count is state and federal only.
- "terms 709 of 897 lists 12": the second terms dump passes `limit` 12 (`viewer.ts:224-229`).
- NM 10: the Dec 5 filing for `contest:seat:US-NM:lower:069:0:2026-11-03` means that contest exists in the contests table (the candidacy queue reads it, `candidacy.ts:496-500`) and it passes the `high` filter, yet the dump shows 0 of 25. NOT FOUND why the row is missing from the dump.
- The executive-office claims (governor "no act") are read from tables that the viewer never dumps (see R23).

Verdict: VIEWER (except the NM 10 contradiction, NOT FOUND).

### R17. Election totals exceed the "people" in the header

Places and items: NY 1, 2; NC 6; PA 1; SC 1; OH 12 (lopsided totals).

Cause:
- `voting.ts:1883-1962`: the count adds named voters, counted residents scaled up by `countedScale` (citizen share, `voting.ts:2136-2145`), and the rest of the race's electorate place by place.
- `voting.ts:2152-2176` `restOfTown()` adds the town's `referencePopulation` past its named and counted people, at their adult and citizen shares. `voting.ts:2256-2290` `racePlaces()` turns that into the "rest of the town" electorate.
- The header's `people` is `core.people.size` (viewer.ts:67), which holds named people only. The counted residents and the rest of the town are not in it.
- Every contest on one date shares one electorate, so unopposed seats get the full electorate (NY 2) and SC 1 shows the same 2,143 four times. Mayor total 86 percent of header people (NC 6) is the same effect.

Verdict: EXPECTED (the two-level population by design) and VIEWER (header people is not the town).

### R18. Every statewide term has share 0.56 and every legislative term 0.635

Places and items: NM 14; NY 19; NC 7; OK 15; RI 16; SC 16.

Cause: `offices.ts:671-694` `electionBehind()` sets the history share from `tenureYears(key)`, a per-office-kind constant (`src/core2/data/offices/tenure.json:59`, 0.56 for statewide executives, 0.635 for legislators). Past elections are generated history for the opening, not played elections.

Verdict: EXPECTED (an ESTIMATED average per kind). Weak as history.

### R19. A federal line moved by about $110.8 billion in one step (and a Social Security award cut about 29 percent)

Places and items: NM 16, 19; NY 14 (first half); NC 15; OK 12; OR 15; RI 2; SC 13.

Cause:
- Unit: budget values are minor units, which are cents (viewer divides by 100, viewer.ts:115). `-11083760726950` cents is $110.8 billion. NY 14's "if dollars, $11 trillion" is the wrong reading.
- The law "fiscal.balanced-operating-budget" passes Congress on December 15 (R7). `law-reach/group-b.ts:285-295` applies it through `moveBudget` (`law-reach/group-b-money.ts:~362-418`) with `balancePlan` (`law-reach/group-b-money.ts:427-444`): it cuts every non-interest line in proportion, `-ceil(minor * ratio)`, until spending fits revenue. `budgets.ts:1310-1357` `amendBudget()` writes it and emits `budget-line-changed` (the measure id `...#balance#2025-12-15` is the stamp, `group-b-money.ts:~372`).
- The same cut lowers the Social Security line, which lowers each retiree's award. `budgets-treasury.ts:556-600` `landOn()` emits `law.effect-landed` with from and to amounts (NM 16: 170832 to 120629) and by design names no law id ("Nothing here says why"). The law is stored in the `landed` row (`budgets-treasury.ts:599-613`) and the person ties it to the law only if they learned of it (`attribute`, `budgets-treasury.ts:632-676`).

Verdict: EXPECTED for the mechanism (the cuts follow from the law in force). DEFECT for play: a federal balanced-budget bill passed in the coarse background Congress cuts a federal line about 30 percent mid-year, and no hearing, no vote on the cut and no notice sits on the record. NM 16 is EXPECTED (by design the effect event names no law) and VIEWER (the viewer does not print the `landed` table).

Effect on the player: real people see their award fall by about a third because of a law nobody debated in play.

### R20. The player starts at 17

Places and items: NY 20 (first half); ND 14; OK 18; OR 1 (age part); PA 19; RI 17 (age part).

Cause: `src/bench/world.ts:89-116` `entrantOf()` picks the 17-year-old whose 18th birthday comes soonest after the opening, by design ("the golden path's first step is turning 18 in play", lines 91-95). The player turns 18 within days (NY 20, OK 18, OR 1, RI 17).

Verdict: EXPECTED.

### R21. Law values 0 and 1 with no unit

Places and items: NM 7; NY 14 (second half); NC 13; OK 7.

Cause: `legislature.ts:2399-2409` `enact()` enacts a policy-question provision as `value: provision.value > 0 ? 1 : 0` with no `unit`. Value 1 means the policy is law; value 0 ends it (`laws.ts:523-526`, change "ended"). `laws.ts:545` prints `unit: row.unit ?? ""`. NM 7's "zero-value laws took effect" are repeals.
NC 13: the second minimum-wage law on March 7 is the amount law set by the policy law the day after it took effect (`law-reach/group-a-wages.ts:35-70`, `effectiveDate: tomorrow(...)`, `measureId` = the policy law's id). The March 6 re-vote that failed was a repeal attempt, so the law stands.

Verdict: EXPECTED.

### R22. A replacement law points to a ":from-start" id

Places and items: NM 15; PA 18; RI 14.

Cause: `laws.ts:222-253` `rowsCarriedToStart()` makes an estimate row `<id>:from-start` for a law series recorded only from a later date. `laws.ts:515-526` reads it as "the law in force the day before" and names it in `replacesLawId`. The row exists in the laws table but was never a logged event, so it is absent from the file.

Verdict: EXPECTED (a marked ESTIMATE, `laws.ts:244-251`).

### R23. Vetoes, failed bills and governor acts leave no record in the log

Places and items: NM 3, 11 (governor); NC 10; ND 13, 17; OK 3; OR 8; PA 15; RI 6, 15; SC 17 (executive part); OH 17 (no tally on the record).

Cause:
- `legislature.ts:2133-2166` `executiveAction()`: the veto sets `status` "vetoed" or "overridden", writes `votes` rows and calls the desk hook. `executive.ts:505-518` `recordDesk()` writes a `desk` table row. Nothing calls `api.emit`; there is no `bill-vetoed` kind. The viewer asks for kinds `bill-signed`, `bill-vetoed`, `veto` (viewer.ts:292-306) that the engine never emits.
- A failed bill (tie or no majority) sets `status: "failed"` with no event (`legislature.ts:2019-2023`, and the committee fail at 1983-1989). Ties fail: no tie-breaker exists for boards or a 30-seat Senate without a lieutenant governor (`legislature.ts:1129-1175` `tieBreaker`, `legislature.ts:1990-2012`). That explains OR 7 (three 15-15 ties) and RI 6 (2-2). Both are EXPECTED outcomes with no outcome record.
- Budget votes are table rows only (`legislature.ts:316-345`, `rows.push` ... `table(api,"votes")`), no `legislative-vote` and no `vote-recorded`, so OH 17's budget bill has no tally on its record and NM 9's measure 2025-054 has no vote record.
- The governor acts through the desk table (a bill) and `issueOrder` (`executive.ts:619-636`, only for orders the engine can carry). The viewer dumps neither (R16). So "no act" is VIEWER in part, DEFECT in part.

Verdict: DEFECT (outcome events missing from the log) with a VIEWER share.

Effect on the player: a veto or a failed vote never becomes news or a scene.

### R24. The viewer shows only part of the log

Places and items:
- NM 3 (which bills enacted), 4 (voters).
- NY 7, 15.
- NC 11, 12 (took-office and debate counts), 16, 17.
- ND 9, 16.
- OH 2 (council vote lines), 12 (cut off), 13.
- OK 12 (budget-adopted 4 vs 2).
- OR 5 (7 of 8), 17 (candidate-filed=5).
- PA 13, 16.
- SC 4 (vacancy line), 8 (34 contests with no result line), 14.

Cause:
- Local news is the first 200 items after a reverse sort, so the newest are cut (`viewer.ts:97-98`). ND printed 12 `law-took-effect` lines while the year had 31; the missing local items come after the cut.
- `elect` records are cut at 40 (`viewer.ts:109-112`); each fact string at 240 or 260 characters (`viewer.ts:98, 111`) - NC 6's line "stops mid-field" and OH 12's seat 0 totals "cut off" are this; dumped rows at 700 characters (`viewer.ts:205`); long values at 200 (`viewer.ts:185-190`, which also prints a long `vacancyRule` object as JSON text, RI 16).
- The state and federal kind sections keep 60 rows per kind and only rows whose facts or id match a US-state regex (`viewer.ts:292-320`). That drops local `took-office`, local `seat-vacated` and the budget-adopted lines for non-US ids, so counts in the kinds line (32 vs 35, 14 vs 12, 5 vs 7) disagree with the lines shown.
- Duplicates (NC 17): the same `official-appointed` lines print once from the local news section and once from the state-federal kind section (`viewer.ts:97-98` and `viewer.ts:312-320`).
- Enacted ordinances take effect 30 days after the vote (`ordinanceEffectiveDays` = 30, `legislature.ts:2380-2386`), so a bill passed January 1, 2026 has no `law-took-effect` before the January 20 end (NY 7).

Verdict: VIEWER.

### R25. Repeated "learned" entries in traces

Places and items: OK 17 (second half); PA 17; SC 18.

Cause: `bench/dev-trace.ts:202-218` `learnedOf()` returns one child per person who learned of a record, and `viewer.ts:155-162` prints `kind:via=value` without the child's person id. Many people learned the same event with the same key, so identical text repeats.

Verdict: VIEWER.

### R26. Empty `{}` payload on `organization.owner-changed` and `organization.founded`

Places and items: NM 17 (first half); NY 17; OK 13 (second half); RI 12.

Cause: the organization id rides in `topic`, not in `facts`: `business.ts:429-447` (`owner-changed`, `topic: row.id`) and `business.ts:1366-1376` (`founded`, `topic: id`). The viewer prints `facts` only (`viewer.ts:98`).

Verdict: VIEWER.

### R27. Budget behavior that looks odd but follows the code

Places and items: ND 3 (4-1), 15, 16; NC 14 (fiscal year label); NY 12; OH 16, 17; OR 4, 18; PA 2 (5-0); RI 10; NM 9 (budget part).

Cause:
- A budget vote adds a duty to adopt (`budgetAdoptionDuty` = 0.3, `legislature.ts:326-329`), so a council that rejects every bill passes the budget 4-1, 5-0 or 3-0.
- A rejected budget drops the most objected-to change and re-votes (`legislature.ts:350-378`), so the adopted budget lists dropped lines (OH 16, OH 17).
- Fiscal years are named by the year they start (`budgets.ts:331-335`). The federal year starting October 1, 2025 is "2025" (real convention: FY2026), the same label as a state year starting July 1, 2025 (NC 14).
- A town with no municipality unit gets no town government and no budget: `budgets.ts:412-428` builds a city government only if `governmentUnitsForPlace(geoid)` has a unit of type "municipality". NY towns are townships (`offices-local.ts:134-135`, kind `township-board`). `legislature.ts:565-575` `budgetChambers()` also looks only for `county-board` or `council`. NY 12 is therefore DEFECT.
- Tiny town lines (ND 15, OR 18) are the town's amounts scaled to the modeled town (`budgets.ts:1341-1357`).
- Federal budget bills are sponsored by the executive that set the priorities, the president (`legislature.ts:303-311`, `priorities?.setBy`), introduced in the House office on October 1 (NY 13, NC 14, OH 17).
- RI 10: budget changes that cite `...:general:starting#2025-07-20` are law-reach mechanics applied to the starting law answer (`law-reach/group-b-money.ts:~372`), not to a law enacted in play, so no `law-took-effect` exists.

Verdict: EXPECTED except NY 12 (DEFECT) and the FY label (DEFECT, minor).

### R28. Hash ids that look alike

Places and items: ND 18; SC 19.

Cause: `src/core2/kernel/ids.ts:12-45` `stableHash` is 64-bit FNV-1a; `createStableId` (`ids.ts:97-104`) hashes `kind:v1:<key>`. FNV-1a mixes late characters only into the low bits, so keys that differ near the end give ids with long common prefixes. They are different ids, not a collision.

Verdict: EXPECTED.

## Place-specific items

Format: item number, short cause, file:line, verdict. "R" numbers point to the patterns above.

### New Mexico

1. Deaths 0 vs seat death. R1. VIEWER (viewer.ts:98-100; health.ts:419-446; offices.ts:136).
2. Same six-vote patterns. R10 (local, `legislature.ts:1296-1300`, `world-legislating.ts:395-409`) and R9 (state). DEFECT-suspect.
3. Two local measures with no outcome record. They tallied 1-5, so they failed (`legislature.ts:2019`); a failed bill leaves no event (R23). "Enacted 7 / failed 9": status counts only (`viewer.ts:259-266`). EXPECTED, VIEWER.
4. Seven voters on a board bill. `legislature.ts:1727-1730` lists only members who are people; a named official replaced by a resident (R13) adds one. VIEWER, EXPECTED.
5. Six seats vacated, none filled. R13 (rule "appointment", filled silently, `offices.ts:861-911`). DEFECT (no record).
6. Growth with no birth or founding record. R2. EXPECTED.
7. Zero-value laws. R21 (value 0 = repeal, `legislature.ts:2399-2409`, `laws.ts:523-526`). EXPECTED.
8. Committee outcomes on one date. R7, R8 (`legislature.ts:1768-1778, 1861-1869`). EXPECTED mechanics, DEFECT for play.
9. Tallies repeat across bills; budget cites a vote with no record. R9 and R27/R23 (`legislature.ts:316-345`). DEFECT-suspect, EXPECTED.
10. Contest table "0 of 25". Viewer filter (`viewer.ts:210-212, 234`). The missing state row for the Dec 5 filing: NOT FOUND.
11. Unregistered module tables, governor with no act. R16, R23. VIEWER, DEFECT (no executive record).
12. Federal bill sponsor and chair from other states. R4. DEFECT (label and sponsor), EXPECTED (chair).
13. "council-president" on a U.S. House record; bare `official:seat:` ids. R3 (DEFECT), R5 (EXPECTED).
14. Identical elected shares. R18. EXPECTED.
15. ":from-start" replacement. R22. EXPECTED.
16. Obligation fell 29 percent, no law named. R19 (`budgets-treasury.ts:556-613`). EXPECTED by design; the 29 percent cut is the balance law (DEFECT for play).
17. Empty owner-changed; business.closed source "opening". Empty payload: R26 (VIEWER). The source text: `finance-state.ts:1485` emits `source: closure.source`, which comes from the business's opening books. EXPECTED.
18. Upper chamber originates no bills. R6. DEFECT.
19. Federal line moved $110.8 billion. R19. EXPECTED mechanism, DEFECT for play.

### New York

1. Totals exceed 1,972 people. R17. EXPECTED, VIEWER.
2. Uncontested seats show large totals. R17 (`voting.ts:1963-1969`, an unopposed candidate takes the whole electorate). EXPECTED.
3. Board votes with three voters after two vacancies. R13 (seats refilled at once; three are people). EXPECTED, DEFECT (no record).
4. Deaths 0; two death vacancies. R1. VIEWER.
5. Seven state seats vacated, no special election. R14 (`elections.ts:399-400`; `offices.ts:949-957, 1000-1051`). DEFECT. The "0 of 28" table and the town seats' missing fill: R16, R13.
6. 170423 board seven voters after three vacated. R13, R10 (`legislature.ts:1727-1730`). EXPECTED, DEFECT (no record). Seat count not shown: `offices-local.ts:130-147` (`board.seats`), VIEWER.
7. Enacted town bill unnamed, no law record. R24: the bill dated January 1, 2026 takes effect after 30 days (`legislature.ts:2380-2386`), past the January 20 end. EXPECTED, VIEWER.
8. Constant tallies on town boards. R10. DEFECT-suspect.
9. June 30 pile-up, one chair, no committee vote. R7, R8. EXPECTED mechanics, DEFECT for play.
10. Upper chamber and U.S. Senate have no bills. R6. DEFECT.
11. Growth with no birth or founding. R2. EXPECTED.
12. Town never recorded a budget. R27 (`budgets.ts:412-428`; `legislature.ts:565-575`; township boards in `offices-local.ts:134-135`). DEFECT.
13. First House bill October 1, sponsored by the president. R27 (`legislature.ts:303-311, 527-551`). EXPECTED.
14. Values with no unit. R19 (cents) and R21. VIEWER (unit), EXPECTED.
15. Kind counts disagree with lines shown. R24 (`viewer.ts:292-320`). VIEWER.
16. Federal chamber carries a town key; terms "709 of 897" lists 12. R3 (DEFECT); `viewer.ts:224-229` (VIEWER).
17. Owner changes with empty payloads. R26. VIEWER.
18. Identical vote lines with no voter id. R12 (`record.ts:94, 102-106`). VIEWER.
19. Identical shares; round birth date; two party labels. Shares R18 (EXPECTED). Party labels: `appointments.ts:52-55` `partyName()` normalizes "Democrat" to "Democratic" for terms, while the senate seat row keeps the roster label raw (`offices-state.ts:353-365`). DEFECT, minor (all readers go through `partyName` and `partySide`, `appointments.ts:57-61`). Birth date January 1, 1960: NOT FOUND. The drawn date uses a random month and day (`gov-rules/invented-person-age.ts:318-321`) and no rule forces January 1.
20. Player under 18 at start; job none and $0. Age: R20, EXPECTED. Job none: an 18-year-old with no appointment (`executive.ts:229-296` would give a post). $0 cash: NOT FOUND.

### North Carolina

1. Five board tallies reverse their positions. R11 (`legislature.ts:1712-1720`). EXPECTED, VIEWER.
2. Same question voted twice, repeat fails mirrored. R11; repeat is a repeal attempt (`world-legislating.ts:721-770`, `lawStanding` at ~380-393). EXPECTED.
3. Council votes with no bill record; one number, two questions. R12, R24. DEFECT (number reuse), VIEWER.
4. One seat vacated twice; four on one day. R13 (the refilled seat's holder moved away later). EXPECTED, DEFECT (no record).
5. Board votes keep seven positions after vacancies. R13. EXPECTED.
6. Ballot totals exceed population; seat 0 stops mid-field. R17 (EXPECTED); cut-off at `viewer.ts:111` (VIEWER).
7. Constant election shares. R18. EXPECTED.
8. Population up with no births or deaths. R1, R2. VIEWER, EXPECTED.
9. Organizations up 79. R2. EXPECTED. The 10-1 closure with source "opening": R-note under NM 17. EXPECTED.
10. Vetoed after passing both chambers, no veto record. R23 (`legislature.ts:2133-2166`). DEFECT. The twelve vetoes not printed: R24, VIEWER.
11. Council and board bills after spring have no votes. Bills past floor time die unvoted (`world-legislating.ts:560-563, 590-598`); the rest are cut by the viewer (`viewer.ts:97-98`). EXPECTED, VIEWER.
12. Appointing official changes. `executive.ts:140-147` `townAppointer()` returns the first matching seat's holder, and seat holders change (R13), so the appointer changes with no record. DEFECT (an individual stands in for the council). Counts of took-office, debate, seat-vacated: R24, VIEWER.
13. Law values of 1 with blank unit; second wage law. R21. EXPECTED.
14. Federal bill introduced and adopted same day; fiscal year labels. R27 (`budgets.ts:331-335`), R7. EXPECTED, DEFECT (label, minor).
15. Large budget delta with no unit. R19. VIEWER (cents), EXPECTED.
16. Error lines; elections "0 of 38"; no board contest listed. R16. VIEWER. Council seats 1 and 3 absent: the seats not up in 2025 have no 2025 contest (`elections.ts:289-306`). EXPECTED.
17. Printed lines repeat. R24 (duplicate sections). VIEWER.
18. Committee totals repeat. R8. EXPECTED.
19. Crash of seed d48dca5fc9c0 (lead's finding). R0. DEFECT.

### North Dakota

1. U.S. House seat recorded as council president. R3. DEFECT.
2. 14 not alive, only seven exits. R1 (moves do not set `alive`, `health.ts:438` is the only writer). VIEWER.
3. Council seat vacated, never refilled; budget 4-1. R13, R27. DEFECT (no record), EXPECTED.
4. Council votes have no tally; lines repeat. R12, R24. VIEWER, DEFECT (shared measure number).
5. Same tallies across different bills and the budget. R9. DEFECT-suspect.
6. Nearly every hearing is 10-1. R8 (11 members, `campaigns/parameters.json:843`). EXPECTED.
7. Bills held at 0-0. R8, R7. EXPECTED mechanics.
8. District id "04A". The id comes from the district catalog (`offices-state.ts:167-176`, `districtIdentityCatalog`). Not malformed. EXPECTED (no code defect found).
9. Four passed bills with no law record. R24: 31 `law-took-effect` records in the year against 12 printed (`viewer.ts:97-98`). VIEWER.
10. Graduated tax repealed by a bill that voted yes. R11, R21. EXPECTED.
11. Three lower-house seats vacated, none filled. R13 (rule "appointment"). DEFECT (no record). The chair of the hearings stays until the roster changes (`leadership.ts:288-300`), EXPECTED.
12. No election held; tables empty. R16 (VIEWER). Why no 2025 local contest: NOT FOUND (depends on the place's calendar, `src/core2/elections-calendar.ts`).
13. State executive offices record no act. R23, R16. VIEWER, DEFECT.
14. Player 17 with no recorded choices. R20 (EXPECTED). The bench player acts only when driven (`src/bench/player.ts`); NOT FOUND for any autonomous play.
15. Town budget line changed by $8.73. `budgets.ts:1341-1357`, `deltaMinor` -873 cents of a scaled town line. EXPECTED.
16. Many records on January 1, 2026. January 1 is the town's fiscal year start (`budgets.ts:347-380, 430-444`) and the start date of recorded starting-law rows (`laws.ts:222-253`). EXPECTED.
17. Two federal vetoes with no veto record. R23. DEFECT.
18. Near-identical organization ids. R28. EXPECTED.

### Ohio

1. Every board vote 1-2. R10. DEFECT-suspect.
2. Council public comment nearly identical. R10 (`meetings.ts:253-318`). EXPECTED, DEFECT-suspect. No council tally printed: R24.
3. Measure 2025-001 used for two questions; laws on numbers whose votes read 1-2. R12: council and board number independently (`legislature.ts:750-758`); the laws are the council's bills, the 1-2 votes are the board's. DEFECT (number reuse), VIEWER.
4. State vote totals repeat. R9. DEFECT-suspect.
5. All hearings and 53 bills on June 30; two chairs. R7, R8. EXPECTED mechanics, DEFECT for play.
6. U.S. House member as council president. R3. DEFECT.
7. U.S. House bills held with no tally; New Mexico sponsor. R4, R8. DEFECT, EXPECTED.
8. Deaths 0 with a treasurer who died. R1. VIEWER.
9. Mayor's race no winner. R15 (`voting.ts:1963-1989, 2060-2062`). DEFECT. Appointments by a non-mayor: the sitting official, `executive.ts:140-147`; mayor not printed (R24). VIEWER.
10. Two council seats vacated same day; seat 3 no fill. R13. DEFECT (no record).
11. Five state seats vacated, no fill record. Rule "appointment" at state level: R13 (`offices.ts:861-911`, named official seated, no event). DEFECT.
12. Council totals lopsided; seat 0 cut off. EXPECTED (election outcome); cut-off R24 (`viewer.ts:111`). VIEWER.
13. Seat-vacated count mismatch. R24. VIEWER.
14. Five cause-group ads, reach 38. `drives.ts:1060-1110` `spendGroupFunds`; `reached` is the outlet audience bought, same for the same outlet. EXPECTED.
15. State minimum wage with no bill. R21 / `law-reach/group-a-wages.ts:35-70` turns the starting policy answer into a wage law. EXPECTED.
16. Adopted town budget drops ten lines. R27 (`legislature.ts:350-378`). EXPECTED.
17. Federal budget bill sponsored by the president, negative line. R27 (`legislature.ts:303-311`), R23 (no tally on a budget bill). EXPECTED, DEFECT (no vote record).
18. Treasurer special election date is an estimate. `elections.ts:415-419` registered stopgap `SG-GOV-special-election-timing`. EXPECTED.
19. Growth with no births; year ran 132 seconds. R2 (EXPECTED). Speed: NOT FOUND (measured by `dev.advance`, `viewer.ts:59-62`; no cause line).

### Oklahoma

1. Every board vote 6-1 or 1-6; lone member unnamed. R10; the voter is in `personIds` but not printed (R12, VIEWER). DEFECT-suspect.
2. No public comment in favor. R10 (`meetings.ts:253-318`). EXPECTED.
3. Bills passed both chambers, final statuses differ; no veto record. R23 (11 vetoed in `legislature.ts:2133-2166`). DEFECT (no event).
4. Bill 2025-016 held at 0-0 after House passage. R8 (second chamber's chair, `legislature.ts:1983-1989`). EXPECTED.
5. Board bill numbers and vote lines do not line up. R12 (numbers issued at draft; floor time 5 per meeting, `world-legislating.ts:544, 560-563`). EXPECTED, DEFECT (shared measure numbers).
6. Federal bill held on the day introduced; California sponsor. R4, R7. DEFECT (label), EXPECTED (hold).
7. Many records on December 15; value=1 laws. R7, R21. DEFECT for play, EXPECTED.
8. Six seats vacated for special election, none held. R14. DEFECT.
9. Vice-president seat still held by Griffin. `offices.ts:912-917`: rule "successor" runs `appoint("succeeded as <successor>")`, which seats a new generated person in the president seat and never moves or ends the vice-president's term. DEFECT.
10. Zero deaths; people up 70. R1, R2. VIEWER, EXPECTED.
11. Organizations up 48. R2. EXPECTED.
12. Veterans line cut $110.8 billion; budget-adopted 4 vs 2 listed. R19. Listing: `viewer.ts:292-320` (state and federal ids only, 60 rows). VIEWER.
13. Two identical ad records; empty owner change. Ads: same balance 3327 and same spend share, `drives.ts:1060-1110` (EXPECTED). Owner change: R26 (VIEWER).
14. Council president is a U.S. House seat. R3. DEFECT.
15. Every election share one of two numbers. R18. EXPECTED.
16. Corporation Commission: three members, one seat. `offices-state.ts:494` hard-codes `seats: 1`; the seat list at `offices-state.ts:521-535` has one seat. The data says `seats: 3` (`data/research/offices/state-offices.json:9342-9350`). DEFECT.
17. Repeated identical lines. Vote lines R12 (seven lines per measure, one per person, differing in position, `record.ts:94-106`, VIEWER). Learned entries: R25 (VIEWER).
18. Player 17 at start. R20. EXPECTED.

### Oregon

1. Player is 17 and holds a job. Age R20 (EXPECTED). The job: `executive.ts:211-296` `fillTownPost()` fills town posts at the opening and on each review from every living resident aged 18 or older (pool at 229-238, age test at `executive.ts:107-108` and 235). Nothing excludes the player, so the NPC mayor appoints them (the `official-appointed` record on February 19, `executive.ts:268-281`) and `startPublicJob` gives the job (`executive.ts:293-303`). The viewer does not print hires. DEFECT: the player gets a job they did not choose. Side defect: `executive.ts:107-108` `ageOn` is a year difference with no birthday adjustment, so someone who is 17 until late in the year counts as 18.
2. U.S. House member recorded as council president. R3. DEFECT.
3. Population arithmetic. R1, R2. VIEWER, EXPECTED.
4. County board budget 3-0 after a seat vacated. R13, R27. EXPECTED, DEFECT (no record).
5. Seats vacated, no fill record; count mismatch. Local seats R13 (DEFECT); state upper seats R14 (DEFECT); `seat-vacated=8` vs 7 printed R24 (VIEWER). The city-clerk appointment is a town post (`executive.ts:211-296`), unrelated to the elected county clerk seat, EXPECTED.
6. Orgs up with no org-opened record. R2. EXPECTED.
7. Three 15-15 ties in a 30-seat Senate. `legislature.ts:1990-2019`: no tie-breaker where the state gives none, a tie fails the bill. EXPECTED. No record of the failure: R23 (DEFECT).
8. Vetoed bill passed both chambers, no veto record. R23. DEFECT.
9. Recall petitions on all three seats on the day the law took effect. `recalls.ts:68-69` listens for `law-took-effect` and weighs each member who voted against the aggrieved resident. EXPECTED.
10. Vote positions look inverted. R11. EXPECTED, VIEWER.
11. One measure number, three bodies. R12. DEFECT.
12. Every vote is full attendance; committees sum to 11. R9, R8. EXPECTED mechanics.
13. Bills die in committee at 0-0; upper introduced none. R8, R6. EXPECTED, DEFECT.
14. Federal bills with out-of-body sponsors. R4. DEFECT.
15. Single federal cut $110.8 billion. R19. EXPECTED mechanism.
16. Same-date cluster. R7. DEFECT for play.
17. Candidates filed but no rows; one contest row. R16, R24. VIEWER.
18. Tiny balance $0.42; player cash $0. Town line: scaled amount, `budgets.ts:1341-1357`, EXPECTED. Player cash: NOT FOUND.

### Pennsylvania

1. Election totals far larger than the town. R17. EXPECTED, VIEWER.
2. Council 1-4 with two seats vacant, budget 5-0. R13, R27, R10; sponsor `person:press:...:reporter:0` sits on the council: R0 (`offices.ts:256-289`). DEFECT (reporter on the council).
3. Vacated seats with no filling record. R13; contests exist only for seats up in 2025. DEFECT (no record).
4. County law took effect on a question the council voted down. The county law comes from the county board (`legislature.ts:2357-2365`, `countyOfBody`), a separate body from the council that numbered its own bills 2025-001 (R12). VIEWER, DEFECT (number reuse).
5. State seats vacated for special elections, none held. R14. DEFECT.
6. Election tables empty or unregistered. R16. VIEWER.
7. Mayor appointed before the mayor's election; police chief appointed twice. The mayor is the opening incumbent (`executive.ts:140-147`, `townAppointer`). The review replaces a head who died or moved away (`executive.ts:588-598`, `deskReview` with `fillTownPost`), no removal record. EXPECTED, DEFECT (no record).
8. Same measure ID for different questions. R12. DEFECT.
9. Lower-chamber votes tie within three. R9 (a real 102-101 chamber, 203 members). EXPECTED.
10. All state floor action on one day. R7, R8. DEFECT for play.
11. Federal House tally against a 17-seat delegation. R4. VIEWER.
12. Council president recorded as a federal House seat. R3. DEFECT.
13. Board bills: 27 of 29 failed; no board vote line. R10, R24. DEFECT-suspect, VIEWER.
14. Ad with a $4.34 balance. `drives.ts:1060-1110` spends a share of a small balance. EXPECTED.
15. Statewide executives show no action. R23, R16. VIEWER, DEFECT.
16. Filing lines missing for winners. R24 (`viewer.ts:97-98`). VIEWER.
17. Repeated identical trace lines. R25. VIEWER.
18. Property-tax law replaces a ":from-start" law. R22. EXPECTED.
19. Player is 17 at start. R20. EXPECTED.

### Rhode Island

1. No contests; three empty seats. R16 (VIEWER), R14 (DEFECT).
2. Outsized federal veterans cut. R19. EXPECTED mechanism, DEFECT for play. The +7.78 billion state line change is a normal budget line (`budgets.ts:1310-1357`).
3. Federal officials on local and cross-state records. R3 (DEFECT), R4 (DEFECT label), R5 (EXPECTED).
4. Bodies with no bills of their own. R6. DEFECT.
5. Bills held in committee with zero counts. R8, R7. EXPECTED mechanics.
6. Tied board vote with no outcome. A 2-2 tie fails (`legislature.ts:2019`), no event (R23). EXPECTED, DEFECT (no record).
7. Identical tallies. R9. DEFECT-suspect. The board's four voters are the person-backed members (`legislature.ts:1727-1730`).
8. One date holds the state session. R7. DEFECT for play.
9. Measure IDs reused with new questions. R12. DEFECT. The board re-asking an immigration question already law: NOT FOUND (`needsChange` for local bodies, `world-legislating.ts:759-763`, should skip a question already in force; which body filed 2025-014 was not traced).
10. Budget changes with no law record. R27. EXPECTED.
11. Population and organization counts. R1, R2. VIEWER, EXPECTED.
12. Empty payloads. R26. VIEWER.
13. Closure traced to opening data. `finance-state.ts:1485`, source from the opening books. EXPECTED.
14. Odd county tax value 0.999. Property-tax rate in percent of home value; R22. EXPECTED.
15. Eight unregistered tables; executive left no records. R16, R23. VIEWER, DEFECT (no executive record).
16. Constant shares; vacancy rules as JSON text. Shares R18 (EXPECTED). JSON text: `viewer.ts:185-190` prints any value longer than 220 characters as a cut string (VIEWER).
17. Player not 18; no filing; job none, $0. Age R20 (EXPECTED). No filing: the bench player acts only when driven. Job and cash: NOT FOUND.
18. Voter count changes without a record. R13 (VIEWER share, `legislature.ts:1727-1730`). EXPECTED.

### South Carolina

1. Election totals exceed town people. R17. EXPECTED, VIEWER.
2. Council votes split the same way. R10, R12. DEFECT-suspect.
3. Board tallies after a vacancy. R13. EXPECTED, DEFECT (no record).
4. Five not alive, one death; a vacancy missing. R1 (`life.death` kept for one death inside the circle). Vacancy line missing: R24. VIEWER.
5. People and organizations jump. R2. EXPECTED. (Two `person-birth` records: `renewal.ts:224`.)
6. Special elections with no winner. R15 (`voting.ts:2060-2062`; `vacancyFilled` only on a win, `voting.ts:2528`). DEFECT.
7. State seats left empty; no state special elections. R14. DEFECT.
8. Contests without results. R16, R24. VIEWER.
9. Held bills with zero tallies; one sponsor on 12. R8; sponsor R10 (`world-legislating.ts:480-491`). EXPECTED, DEFECT-suspect.
10. Identical committee tallies, one chair, one day. R8, R7. EXPECTED mechanics.
11. Senate seats sponsor House-body bills. R4, R6. DEFECT.
12. Federal House record oddities. R3 (DEFECT), R4 (DEFECT label).
13. Federal budget dropped seven lines; veterans delta. R27 (lines dropped by negotiation, EXPECTED), R19 (cents, VIEWER).
14. Enacted counts and a silent council. R24, R10. VIEWER.
15. Council public comments lopsided and tied to one id. `meetings.ts:253-318` (EXPECTED); the shared id in every bill id is the one sponsor, R10. DEFECT-suspect.
16. Identical shares. R18. EXPECTED.
17. Unregistered module tables. R16. VIEWER.
18. Repeated lines in the trace. R25. VIEWER.
19. Look-alike person ids. R28. EXPECTED.
20. Year took 195 seconds. NOT FOUND (the time is measured by `dev.advance`, `viewer.ts:59-62`; no code line explains it).

## Checks on the lead's other statements

- "reporterFor (press.ts ~1312) does not exclude the candidate": confirmed, `press.ts:1312-1326`.
- "publish (~1423-1429) calls api.meet(reporterId, candidateId) without checking they differ": confirmed. The reporter is read at `press.ts:1422-1423` and the `meet` call is at `press.ts:1429`.
- Added: the reporter is first chosen at `press.ts:1254` (`arrange`), so `pressWeek` (`press.ts:2244-2286`) is a second place that must skip an outlet's own staff.
- `state.ts:1218-1222` is the throw site; the lead's "state.ts meet()" is right.

## How this was checked

Read-only. Nothing was run. Every cause is a function and file:line read in the code, checked against the raw output in `audit/`.

Place names are short for the reports: NM New Mexico, NY New York, NC North Carolina, ND North Dakota, OH Ohio, OK Oklahoma, OR Oregon, PA Pennsylvania, RI Rhode Island, SC South Carolina. "NM 5" means item 5 of the New Mexico report.

Paths: `scripts/trace/viewer.ts` is "viewer.ts". Files under `src/core2/modules/` are named by file only (legislature.ts, offices.ts, voting.ts, press.ts, candidacy.ts, executive.ts, leadership.ts, world-legislating.ts, budgets.ts, meetings.ts, record.ts, drives.ts, business.ts, laws.ts, health.ts, renewal.ts, officials.ts, elections.ts, recalls.ts). Other paths are written in full.
