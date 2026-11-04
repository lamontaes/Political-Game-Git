0 of 14 paths confirmed. Furthest New Game step: 8 (Johnson, Minnesota path-check: filed, on the ballot, won the council seat, first bill failed 2 to 3). Oldest open PR 1 day (#7152).

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
- **Built, open:**
  - #7152: skills.
  - #7154: petitions fit the town; Johnson, Minnesota makes the ballot and wins.
  - #7168: filing opens on a set day (the second done-when line is Words' quiet-season item).
  - #7169: the mayor's desk, sign and veto, proved in play.
  - #7170: governors declare emergencies.
- **Filed for path 11:** `campaign-rival-ad-quotes-a-real-vote`, `campaign-favor-called-in`, `play-campaigns-shows-your-record`.
- **Agreements:** 1-2 written (one bill engine). 1-3 confirmed and extended (director tests that file the player; a worded law line asked of Lane 3). 1-4 written (filing seams in `src/bench`).
- **Waiting on a question:** `gov-m3-02-amend-and-endorsement-deals`, the endorsement half (see its Notes).

## Measuring now

- **Unit 1b, incumbency fit**, on `governing/incumbency-calibration` (main merged, d6db3df9ff). Ablation on seed f556fe5e8b2fe6fd, 12 places:

  | Version | Contested holder wins (T3) | Newcomers who beat a holder (T6) |
  | --- | --- | --- |
  | Both terms | 1.0 | 0 |
  | Standing only | 0.83 | 0.29 |
  | Trait only | 0.67 | 0.44 |
  | Neither | 0.54 | 0.55 |

  The bands are 66% to 78% and 18% to 30%. Each term alone is near the band, so together they count the advantage twice. A 24-place run on seed a63ad2af1003c7ad is going: play values, standing halved (0.075), trait halved (0.5), and neither.
- **Unit 6, month-end crash**: reproducing `office-day-member-filings.test.ts` at pet-run-1 on `governing/month-close-journal`.

## Failed (on main as well, filed)

- `campaign-door-pledge-held-read-at-ballot`: Merizo, Guam. The pledge part is recomputed after the ballot.
- `core-drive-reinforced-from-unlearned-event`: Londonderry, Vermont, `drives.ts` reinforce.
- Boggstown, Indiana's petition scene isn't staged: evidence added to `words-filing-petition-scene-not-staged-by-seed`.

## Next

Unit 1b fit, then unit 5 (uncontested seats: in these runs 87% of running holders are unopposed, against a 40% to 67% band). Unit 7's last three scenes (poll, mail, own money) are play-first's stack in `src/bench`; they need agreement 1-4 confirmed first. Unit 2's remaining pieces: `elections-at-large-race-pooled`, and `elections-filing-window-opens` after #7085.

## Traps

- **The clone is shallow.** Run `git fetch --shallow-since=<date> origin main` before merging main into an old branch.
- **Pool commands check out main.** Commit first, and never run one while a test runs in that checkout.
- **The stopgap register is one file per family.** A branch carrying `src/core2/data/stopgaps.json` moves its rows into `src/core2/data/stopgaps/<family>.json` when it merges main.
