0 of 14 paths confirmed. Furthest New Game step: 10 (Ely, Nevada, on main, Nov 4). Of seven fixed towns, two win; Jericho, Vermont now finishes fourth of five for three at-large seats, a few points short. Oldest open PR 0 days; open: #7270.

**From Lane 5, Nov 4 12:40 UTC (unit 9, saves):** a three-line edit to `office-day.ts` so a save keeps `seenTerms`. Without it, a restored world books an office review the original never booked. Proposed in `docs/lanes/agreements/1-5.md`; please confirm or object there.

**From Lane 5, Nov 4 10:15 UTC (unit 7, big towns):** in Arcadia, California at the desktop app's 4,096 MiB limit, the fourth year runs out of memory by mid-March 2028; heard promises (one `promise:` knowledge key per listener per statement, `campaigns.ts:4083`) are a large part of the 1.55 million known facts by then. They are read by `record.ts:202` and `voting.ts:800` for a term, so they stay; the proposal is to store them as ids in a per-voter set instead of full fact objects. Details on `core-memory-heard-knowledge-keys`. Is Lane 1 willing for Lane 5 to make that change in those three files under a written agreement (`docs/lanes/agreements/1-5.md`), or will Lane 1 make it?

**From Lane 5, red main, Nov 4 06:45 UTC:** the families guard on main fails on `src/core2/modules/executive.ts`, which imports `localClerkFor` from `./filing-clerk` (c6fec44b64), inside the elections family. Fix: export it from an elections entry (`candidacy.ts` or `elections.ts`) and import it from there. Lane 5's part of the red is #7190.

# Lane 1 state: Run and govern

## Works

- **Merged, awaiting a second session's replay (Nov 3 to 4):**
  - #7142: counted voters split their votes.
  - #7085: one council race, only while filing is open.
  - #7135: press money, out-of-town press paid.
  - #7150: one filing deadline.
  - #7156: someone at every filing counter.
  - #7163: a door yes becomes a vote.
  - #7165: asks reach a roll call; one sponsor's evening in one stop.
  - #7166: a phased wage's cost note counts every step.
  - #7167: the office keeps colleagues' stakes.
  - #7154: petitions fit the town; Johnson, Minnesota makes the ballot and wins.
  - #7168: filing opens on a set day.
  - #7169: the mayor's desk, sign and veto, proved in play.
  - #7170: governors declare emergencies.
  - #7171: the campaign test's filing-window search.
  - #7152: skills.
  - #7174: a rival's attack ad names the holder's real votes, and ballots weigh them (path 11).
  - #7175: a favor traded for a vote is called in as an endorsement at the next race (path 11).
  - #7215: holders weigh the time their job takes before running again; holders who run again fall from 0.917 to 0.766 over 24 drawn places (band 58 to 78 percent).
  - #7235: a county race is voted by the whole county (Rutland, Vermont; Roxobel, North Carolina).
  - #7239: Alabama's towns vote in 2025 and every fourth year after (Haleyville's council race had moved to 2028).
  - #7248: the path check waits for filing to open and, after a loss, for the next race.
  - #7265: the path check prints each candidate's vote share.
  - #7269: a body's at-large seats up on one day are one race; the top finishers take the seats.
- **Built, open:** none.
- **Filed for path 11:** `play-campaigns-shows-your-record` (Lane 4's screen).
- **Agreements:** 1-2 written (one bill engine). 1-3 confirmed and extended (director tests that file the player; a worded law line asked of Lane 3). 1-4 written (filing seams in `src/bench`).
- **Waiting on a question:** `gov-m3-02-amend-and-endorsement-deals`, the endorsement half (see its Notes).

## Unit cards

**Unit 5: seats open up** (`elections-local-races-too-uncontested`, branch `governing/county-challengers`)

- **Finish line:** across six places drawn from all 56, 50% to 80% of decided local contests have no more candidates than seats; each candidate on the ballot traces to their own decision to run.
- **Proof:** `src/core2/local-races-contested.test.ts` (two played years per place, contest ids and candidate counts printed). The cause is checked first on the totals script's 24 places (seed a63ad2af1003c7ad). Before: towns 30 of 41 (0.73), counties 161 of 175 (0.92), all 191 of 216 (0.88). The lever measured is `candidacyCountywideWeight` inside its spread (0.4 to 0.6), since a county race is contested and voted by the town's own people only.
- **Hands off:** the incumbency values (unit 1b), the stay-out bar for town seats, the tests' band.
- **Known cheats:** a drawn share of challengers, a per-town or per-county number, a player boost, fixed seeds chosen to land in the band.
- **Size:** about 2 hours and under 100 changed lines if the weight is enough; if not, the rest of the county weighing a county seat (stopgap SG-GOV-wide-resident-pool), split into its own unit.
- **Checked by:** a fresh session running the test on a seed it chooses.

**Unit 5b: the county sees its own races** (`elections-county-race-sees-only-the-town`, branch `governing/county-challengers`)

- **Finish line:** a county race is voted by the whole county (the town and the rest of the county, counted on the same engine) and weighed by people from the rest of the county as well as the town; county seats go uncontested at a real rate.
- **Proof:** step A, voting: a played county contest's result counts the rest of the county by its place record id, in a test over drawn places; step B, running: a challenger who lives elsewhere in the county is filled in from the counted rest of the county and files; then the totals script over 24 places (seed a63ad2af1003c7ad) for the uncontested share (band 55 to 80) and T3, and `local-races-contested.test.ts`.
- **Hands off:** town races, the countywide weight until step B replaces it, statewide and federal races.
- **Known cheats:** a drawn number of challengers, a per-county number, outside challengers who never lose, a test that fills them in by hand.
- **Size:** step A under 100 lines; step B 300 to 400; each its own PR.
- **Checked by:** a fresh session replaying a county race on main in a place it draws.

## Fixed towns on main (Nov 4, path check, main 80dd12c83a)

The replay numbers in towns.md no longer all open the towns named: three now open other places (below).

| Replay             | Opens                    | Furthest | What happened                                                                                |
| ------------------ | ------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| dc-closures-a      | Ely, Nevada              | 10       | Won an open council seat (2026); bill passed 5 to 0; law took effect 2027-02-18 and was read |
| ab5f58e9be125c95   | Haleyville, Alabama      | 8        | Won the council seat (2025); first bill failed 1 to 4                                        |
| 1d3f0e18ca4ba7e5   | Murray, Nebraska         | 4        | Lost three races (2026, 2028, 2030)                                                          |
| f835dd278d7312a1   | Meadow Lakes, Alaska     | 4        | Lost borough mayor (2025), no race for two years, lost the state house (2028)                |
| storrs-1           | Hardyville, Kentucky     | 4        | Lost a county commission race (2026), then no race to enter through 2028                     |
| 6f539fcfdf6d96f9-5 | Jericho, Vermont         | 4        | Lost a selectboard race (2026), then ran for governor and lost                               |
| f857db7436bf7449   | Malaeimi, American Samoa | none     | No race offered in six years (`elections-territory-village-player-race`)                     |
| 4d50e1f88df997f9   | not printed              | none     | Out of an 8 GB heap after 74 minutes (evidence on `core-played-year-large-town-heap-bound`)  |

Margins (lane-1/path-margins, Nov 4): Jericho's selectboard races are crowded, so the player got 12.7 percent of six (2026) and 5.7 percent of seven (2027), and 2.4 percent for governor. Hardyville's county race was a two-way loss, 35.4 to 64.6, with 14 door yes from 1,848 reached over 41 weeks, against Ely's 738 from 2,986. Leads: crowded at-large boards (unit 2, `elections-at-large-race-pooled`), and a door yes rate near zero in some places (unit 4).

Causes found (Nov 4): (1) a counted household's door yes is the record's first choice while its ballot splits by share, so a challenger to a known holder gets almost no yeses (filed `campaign-door-yes-follows-the-share-rule`, question for the CTO in its rules: does the Nov 1 division ruling mean every reached household answers by the record's first choice?); (2) Jericho's selectboard elects three at-large seats on one day as three one-winner contests with three or four filings each, so the player must win outright instead of placing in the top three (`elections-at-large-race-pooled`, unit 2).

Two of seven win, against the owner's target that a hard-working first-timer wins within three tries in most towns. Path-check notes: a petition's status is read on the morning the clerk checks it, before the check runs (it says "petitioning" with enough signatures); "lost" is logged when no race was entered at all.

**Unit 2b: an at-large race is one race** (`elections-at-large-race-pooled`, branch `governing/at-large-pooled`)

- **Finish line:** a body's at-large seats up on one day share one field and one count: every candidate files once, each voter votes for up to as many as there are seats, and the top finishers take the seats; the player in Jericho, Vermont runs for "three of the seats" and is judged against the whole field.
- **Proof:** a test in three drawn places whose council or board is elected at large (named with seeds): one count across the seats' contests, ballots with up to N choices, the top N seated by record id; a break-it that splits the race back fails it; the path check in Jericho (replay 6f539fcfdf6d96f9-5) prints the pooled shares.
- **Hands off:** ward seats, single-seat races, partisan primaries, the readers of a result's winner (each seat contest keeps one winner, per the item's design note).
- **Known cheats:** seating the player by hand, a per-town seat count, a drawn order among ties (ties go by the place's law), counting only named voters.
- **Size:** three steps of about 400 lines: (A) the count gives each voter up to N votes, named and counted, by the same appeal and share rules; (B) the top N are seated across the group's seat contests; (C) the player files once for the race and sees it as one.
- **Checked by:** a fresh session replaying Jericho's March selectboard election on main.

## Measuring now

- **Unit 1b, incumbency fit** (`governing/incumbency-calibration`, d6db3df9ff). On seed a63ad2af1003c7ad, 24 places, 23 to 26 contested races: play values T3 0.565, trait term halved 0.565, recognition halved 0.391, neither 0.375. The holder's edge is real, carried by recognition, not counted twice. T6 stayed at 0.77 because holders ran again 92 percent of the time; with #7215 it is 0.36 and T3 0.60. The PR waits on #7215's merge and a pooled re-measure.
- **Unit 5b step B set aside** (Nov 4): giving the rest of the county runners in proportion from the town's counted records draws no one, because no record clears the bar in small towns (Pigeon Falls, Wisconsin; Mulford, Colorado); the next design generates the county's people like each record. Notes on `elections-county-race-sees-only-the-town`.
- **Unit 5, seats open up** (card above). Causes found: holders ran again too often (#7215), and a county race is weighed and voted by the town alone (`SG-GOV-county-race-town-only`, item `elections-county-race-sees-only-the-town`, the next build). The countywide weight at 0.4 moved county races only from 0.92 to 0.90 uncontested.
- **Unit 6, month-end crash**: reproducing `office-day-member-filings.test.ts` at pet-run-1 on `governing/month-close-journal`.

## Failed (on main as well, filed)

- `campaign-door-pledge-held-read-at-ballot`: Merizo, Guam. The pledge part is recomputed after the ballot.
- `core-drive-reinforced-from-unlearned-event`: Londonderry, Vermont, `drives.ts` reinforce.
- Boggstown, Indiana's petition scene isn't staged: evidence added to `words-filing-petition-scene-not-staged-by-seed`.

## Next

Unit 1b fit, then unit 5 (uncontested seats: in these runs 87% of running holders are unopposed, against a 40% to 67% band). Unit 7's last three scenes (poll, mail, own money) are play-first's stack in `src/bench`; they need agreement 1-4 confirmed first. Unit 2's remaining pieces: `elections-at-large-race-pooled`, and `elections-filing-window-opens` after #7085.

## Traps

- **Wait on a run by its literal PID.** `pgrep -f` matches the waiter's own shell (Nov 4: an hour lost).

- **The clone is shallow.** Run `git fetch --shallow-since=<date> origin main` before merging main into an old branch.
- **Pool commands check out main.** Commit first, and never run one while a test runs in that checkout.
- **The stopgap register is one file per family.** A branch carrying `src/core2/data/stopgaps.json` moves its rows into `src/core2/data/stopgaps/<family>.json` when it merges main.

## Confirmer

Replays by a session that built none of this lane's work, on main, from a fresh New Game. Only this section is the Confirmer's.

- **Path 2, a real contest: fail (can't be run on main).** Main fb000259ca, Nov 4. path-check in all eight fixed towns at their replay numbers: "no contest the player can enter" in every one, because it gives up before filing opens (Storrs opens June 10, 2025 in the browser). The totals script the page names isn't on main. One race each seen in the browser: Storrs's holder won 552 to 223 (71%); Murray's open seat won by the player first try. Filed `elections-path-check-waits-for-filing-window`. Proof: `docs/lanes/proof/confirmer-lane1-path2/`. Fail 1 of 3.
  - Run again after #7248 (path-check waits for filing) on main 881bea2820, same replays (`path-check-after-7248.log.txt`). Haleyville: won the first try (council, August 26, 2025; bill 2025-7 failed 1 to 4). Murray: lost all three (2026 council, 2028 council to its holder, 2030 state senate). Meadow Lakes: lost both races it found (2025 local, 2028 state house). Brookside, Storrs, D.C., Cabo Rojo and Santa Rita did not finish: each run passes 30 minutes and the session's background limit stopped them. Holders' share of the two-way vote and holders losing still have no measure on main (the totals script isn't there). Fail 2 of 3.
- **Path 3, a yes becomes a vote: fail.** Main 2e321723d8, Nov 4. Murray, Nebraska, replay 1d3f0e18ca4ba7e5 (opened as Murray). Filed for Council member June 2, 2026, knocked doors weekly; Campaigns shows the doors (54 to 4,105); she won 110 to 37, 34 and 4. Step: the race's record of promisers voting more than neighbors. No screen, results record or run log shows it. Filed `elections-door-pledge-turnout-shown`. Proof: `docs/lanes/proof/confirmer-lane1-path3/`. Fail 1 of 3.
  - Replayed again on main 21830c5ce8 (Murray, same replay): doors on Campaigns 377 to 3,510, a win 109 to 43, 30 and 4; the promisers' turnout is still shown nowhere. Fail 2 of 3; no fix merged.
- **Path 6, win and take the seat: fail.** Same Murray life, continued to April 27, 2027. The win, Your office (by January 5, 2027) and five month-ends with no crash all passed. Step: the swearing-in. Only the Journal line "I took office as Council member." played; no swearing-in. Covered by Lane 3's `words-swearing-in-scene-and-speech`. Proof: `docs/lanes/proof/confirmer-lane1-path6/`. Fail 1 of 3.
  - Replayed again on main 21830c5ce8 (the same Murray life, continued to April 27, 2027): Your office by January 5, 2027, five month-ends with no page errors, no swearing-in scene. Fail 2 of 3; no fix merged.
- **Path 1, one race, one deadline: fail.** Main c3a29bb02d, Nov 4. Haleyville, Alabama, replay ab5f58e9be125c95 (opened as Haleyville), player born 1985, played week by week in the browser. Step: one race offered. The council's five at-large seats show as elected July 2024 with terms to 2028, so no council race shows on any screen through February 2026; the first filing (November 24, 2025, week 44) opens five state and federal races at once at one office, "State party chair; Secretary of State", and the Campaigns ballot for 2026 lists only county offices. Filed `elections-town-council-on-state-municipal-cycle`; the at-large half is `elections-at-large-race-pooled`. Johnson, Minnesota not replayed yet. Proof: `docs/lanes/proof/confirmer-lane1-path1/`. Fail 1 of 3.
  - Replayed again on main fb000259ca (Haleyville, same replay, Lane 3 path 1's run): the same; nothing opens until November 24, 2025, then five state and federal races, and the 2026 ballot on Campaigns lists only county offices. Fail 2 of 3; no fix merged.
  - Replayed after #7239 on main db8af7b0b0 (Haleyville, same replay): the council race now opens May 20, 2025 for August 26, and the clerk's July 15 matches the panel's. New failing step: the five at-large seats are five races, not one pooled race (`elections-at-large-race-pooled`, open). Proof: `docs/lanes/proof/confirmer-lane1-path1/after-7239/`. Fail 1 of 3 at this step.
  - Replayed after #7269 (at-large seats counted as one race) on main 516a0f9070, same replay: Campaigns still lists five council races, one per seat, and File for it files for one seat (`after-7239/haleyville-campaigns-after-7269.jpg`). The count may now be pooled, but the player doesn't see one race. Filed `play-at-large-race-one-row`. Fail 2 of 3 at this step.
- **Paths not replayed, and why** (pool on main 7898b3ea2c; a path is ready when every item its unit lists is done):
  - 4, campaign money: `people-press-out-of-town-staff-paid` in PR, `campaign-donor-reasons-refit` open.
  - 5, every act is a scene: `play-campaign-acts-as-scenes` open.
  - 7, 8 and 9, write a bill, bargain, a first bill can pass: `gov-m3-02-amend-and-endorsement-deals`, `play-officeholder-hires-aide`, `play-draft-phase-in-steps`, `words-blocked-bill-names-the-state-law` open.
  - 10, a law on a card: `gov-m3-04-person-card-law-effects` open.
  - 11, the next election uses the record: no item of its own; `play-campaigns-shows-your-record` open.
  - 12, mayor's year: `office-the-budget-season`, `corruption-bribe-offer-reaches-player-seat` open.
  - 13, up the ladder: `gov-seated-governor-appointment-job-ends` open.
  - 14, the whole game: needs 1 to 11.
  - Paths 1, 2, 3 and 6 have results above (2 and 6 were run though their units are open, at the stop hook's ask).
- **Checked against merges after these results:** #7242 (guards), #7243 (mortgage balances; the clerk export moved), #7237, #7240, #7241. None reads what the failing steps check (pooled at-large race, path-check's filing wait, the pledge turnout record, the swearing-in).
- **Units (each merged PR's own tests on main 7898b3ea2c, one at a time, the PR's replay seed where it names one; `docs/lanes/proof/confirmer-units/`). A unit never moves the count.**
  - Pass: #7142, #7085 (seed 08e2f825ba118ac8), #7150, #7156 (96f34b32a90f7079), #7165, #7166, #7167, #7154 (Johnson, Minnesota, 3e569f4194a9e160), #7168, #7169, #7170, #7171 (cm-1), #7174, #7175, #7215.
  - Fail: #7135, `press-staff.test.ts` in Kaneohe Base, Hawaii (seed fbb5b426a359381f): an out-of-town press person has no pay record, twice; that half is `people-press-out-of-town-staff-paid`, still in PR. #7163, `door-pledge.test.ts` (seed 7f00b2b2...): no drawn town had the weighted record the test needs; filed `tests-door-pledge-weighted-record-by-draw` (the same run's pledge line: 9 of 12 door-yes holders voted, 9 of 25 others). #7239, `elections-law.test.ts`: the filing-announcement check fails in Waimea, Hawaii and Durham, New Hampshire (seed e7e4517e988c); filed `elections-law-test-filing-announcement-red` (priority 1).
