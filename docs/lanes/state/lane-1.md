0 of 14 paths confirmed. Furthest New Game step: 8 (Johnson, Minnesota path-check: filed, on the ballot, won the council seat, first bill failed 2 to 3). Oldest open PR 0 days; open: #7215.

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
- **Built, open:**
  - #7215: holders weigh the time their job takes before running again; holders who run again fall from 0.917 to 0.766 over 24 drawn places (band 58 to 78 percent).
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

## Measuring now

- **Unit 1b, incumbency fit** (`governing/incumbency-calibration`, d6db3df9ff). On seed a63ad2af1003c7ad, 24 places, 23 to 26 contested races: play values T3 0.565, trait term halved 0.565, recognition halved 0.391, neither 0.375. The holder's edge is real, carried by recognition, not counted twice. T6 stayed at 0.77 because holders ran again 92 percent of the time; with #7215 it is 0.36 and T3 0.60. The PR waits on #7215's merge and a pooled re-measure.
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
- **Path 3, a yes becomes a vote: fail.** Main 2e321723d8, Nov 4. Murray, Nebraska, replay 1d3f0e18ca4ba7e5 (opened as Murray). Filed for Council member June 2, 2026, knocked doors weekly; Campaigns shows the doors (54 to 4,105); she won 110 to 37, 34 and 4. Step: the race's record of promisers voting more than neighbors. No screen, results record or run log shows it. Filed `elections-door-pledge-turnout-shown`. Proof: `docs/lanes/proof/confirmer-lane1-path3/`. Fail 1 of 3.
- **Path 6, win and take the seat: fail.** Same Murray life, continued to April 27, 2027. The win, Your office (by January 5, 2027) and five month-ends with no crash all passed. Step: the swearing-in. Only the Journal line "I took office as Council member." played; no swearing-in. Covered by Lane 3's `words-swearing-in-scene-and-speech`. Proof: `docs/lanes/proof/confirmer-lane1-path6/`. Fail 1 of 3.
- **Path 1, one race, one deadline: fail.** Main c3a29bb02d, Nov 4. Haleyville, Alabama, replay ab5f58e9be125c95 (opened as Haleyville), player born 1985, played week by week in the browser. Step: one race offered. The council's five at-large seats show as elected July 2024 with terms to 2028, so no council race shows on any screen through February 2026; the first filing (November 24, 2025, week 44) opens five state and federal races at once at one office, "State party chair; Secretary of State", and the Campaigns ballot for 2026 lists only county offices. Filed `elections-town-council-on-state-municipal-cycle`; the at-large half is `elections-at-large-race-pooled`. Johnson, Minnesota not replayed yet. Proof: `docs/lanes/proof/confirmer-lane1-path1/`. Fail 1 of 3.
