0 of 14 paths confirmed. Furthest New Game step: 8 (Johnson, Minnesota path-check: filed, on the ballot, won the council seat, first bill failed 2 to 3). Oldest open PR 3 days (#7085).

# Lane 1 state: Run and govern

## Works

- **Merged, awaiting a second session's replay:** #7142, counted voters split their votes by share.
- **Built, open:**
  - #7085: one council race, only while filing is open.
  - #7150: one filing deadline.
  - #7154: petitions fit the town (Johnson, Minnesota now makes the ballot and wins).
  - #7156: someone at every local filing counter.
  - #7135: money finish, now with out-of-town press staff paid.
  - #7152: skills.
- **Built, pushed, PR waits for a free slot (five open):** `governing/pledge-turnout`, a held door yes turns out at the rate stated intent predicts. The weight is 1.2, fitted on eight races; pooled pledgers' share is 0.56 to 0.65 on three seeds, against others' 0.2 to 0.3.
- **Agreements:** 1-4 written (filing seams in `src/bench`, for Lane 4 to confirm). 1-3 confirmed (Lane 3's household backing in `candidacy.ts`).

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
