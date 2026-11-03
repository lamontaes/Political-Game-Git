0 of 14 paths confirmed. Furthest New Game step: 8. Oldest open PR 0 days.

# Lane 1 state: Run and govern

## Works

- **Cloud trial, Nov 3.** `npm install` worked and `npm run bench` serves the game. New Game opened a life in Bethany Beach, Delaware, on January 20, 2025, with no page errors. The screenshot is on branch `trial/lane-1`. `gh auth status` fails (the token in GH_TOKEN is invalid), but git push and the GitHub tools work, so nothing is blocked.
- **The clone is shallow.** To merge main into an old branch, first run `git fetch --shallow-since=<date before the branch> origin main`. Without it, git finds no real merge base and reports false conflicts in files the branch never touched.

## Failed

- Nothing yet.

## Next

Unit 1 (beatable incumbents): `elections-counted-vote-splits-by-share` on `governing/counted-vote-share` (main merged in), then `campaign-incumbency-calibrated` on `governing/incumbency-calibration`.

## Unit 1a card: counted voters split their votes (`elections-counted-vote-splits-by-share`)

- **Finish line:** in a contested two-way council race, a small lead moves a few points, not every group.
- **Proof:** the totals script over 12 places drawn from all 56, both and neither versions, quartiles printed. Run on `measure/lane-1-m1` (the branch plus the calibration branch's script and knobs, without its trait-centering commit), seed f556fe5e8b2fe6fd. Tests: `src/core2/counted-vote-share.test.ts`, `door-pledge.test.ts`, `two-level-elections.test.ts`.
- **Hands off:** the pledge rule, any bonus for the player, the tests.
- **Known cheats:** tuning so the player wins, a per-town number, a roll, a sample of four.
- **Size:** about 800 changed lines, already built by the governing lead. The 12-point move goes to unit 1b if the split alone does not reach it (CTO, Nov 1, 23:35).
- **Checked by:** a fresh session replaying election night in Haleyville, Alabama (ab5f58e9be125c95).
