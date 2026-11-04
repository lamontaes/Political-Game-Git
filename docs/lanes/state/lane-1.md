0 of 14 paths confirmed. Furthest New Game step: 8. Oldest open PR 2 days (#7085).

# Lane 1 state: Run and govern

## Works

- **Cloud trial, Nov 3.** `npm install` worked and `npm run bench` serves the game. New Game opened a life in Bethany Beach, Delaware, on January 20, 2025, with no page errors. The screenshot is on branch `trial/lane-1`. `gh auth status` fails (the token in GH_TOKEN is invalid), but git push and the GitHub tools work, so nothing is blocked.
- **Built, merged, awaiting a second session's replay:** #7142, counted voters split their votes by share (`elections-counted-vote-splits-by-share`), merged 23:01 UTC.
- **Built, open:** #7085, one council race offered and only while filing is open (Checker 4's two tests fixed; main merged). #7150, one filing deadline for the clerk and the panel. `governing/petition-town-size`, a local petition fits the town (PR after the Johnson, Minnesota path-check).

## Failed

- `door-pledge.test.ts` "near-binding" fails in Merizo, Guam, on main as well. Filed as `campaign-door-pledge-held-read-at-ballot`.
- Advancing the Londonderry, Vermont world with validation on throws in `drives.ts` reinforce, on main as well. Filed as `core-drive-reinforced-from-unlearned-event`.
- The petition scene isn't staged in Boggstown, Indiana, on main as well. Evidence added to `words-filing-petition-scene-not-staged-by-seed`.

## Next

1. Post the totals (seed f556fe5e8b2fe6fd, 12 places, both and neither) on #7142. With the split, holders still won 13 of 13 contested races (median two-way share 0.738), so the rest of the move goes to unit 1b, `campaign-incumbency-calibrated`.
2. Run path-check in Johnson, Minnesota (seed 3e569f4194a9e160), then open the petition PR.
3. Unit 1b: fit incumbency on `governing/incumbency-calibration`.
4. Unit 2 remaining: `elections-at-large-race-pooled` (filed), `elections-filing-window-opens` (check against #7085's window), `gov-filing-counter-clerk-at-county-board`.

## Traps

- **The clone is shallow.** To merge main into an old branch, first run `git fetch --shallow-since=<date before the branch> origin main`. Without it, git finds no real merge base and reports false conflicts in files the branch never touched.
- **`npm run pool -- add` checks out main in the working tree.** Commit first, and never run it while tests run in that checkout.
- **The stopgap register is one file per family since f3e836aa48.** A branch carrying `src/core2/data/stopgaps.json` moves its rows into `src/core2/data/stopgaps/<family>.json` when it merges main.
