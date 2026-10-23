# PW: make the built game run in the played world (shared rules)

Forty module files exist under the new core. The world the owner plays installs 23 of them by name. The rest were built, tested alone, merged green and reported working, and nobody ran the played world for a year. These packages end that. Each one is finished only when a one-year run of the played world, on a seed the builder did not choose, shows the feature in the records.

## Read first

Every PW package is built by its own Opus builder session. This file holds what they share. Read it before your package, then the rulings in `docs/coordination/OWNER-DECISIONS.md` and the pool item you claimed. The Oct 12 handoff and the BOARD's "Owner rulings, Oct 12, 7:30 p.m." are archived at `docs/archive/2026-10-23/coordination/HANDOFF-2026-10-12.md` and `docs/archive/2026-10-23/coordination/BOARD.md`; the rulings they hold are in OWNER-DECISIONS. The sim-stories report is on branch `cto/sim-stories-1905` (`docs/reports/sim-stories-2026-10-12.md`).

## Why these packages exist

The world the owner plays is built by `buildBenchWorld` in `src/bench/world.ts`. The golden-path suite has 66 rows and none of them does either; the five that build the bench world check only the opening.

**One rule for every package here: a feature is finished when a one-year run of the played world, on a seed you did not choose, shows it in the records.** A unit test that builds its own small world proves nothing about play. Write those too, but they do not count toward "finished."

## Order

| Package | Builds                                                                           | Branch                   | Lands      |
| ------- | -------------------------------------------------------------------------------- | ------------------------ | ---------- |
| PW-1    | The played-world test: the gate everything else is measured by                   | `pw/played-world-test`   | First      |
| PW-2    | Install every module in the played world, with a guard                           | `pw/wire-all-modules`    | Second     |
| PW-3    | People decide to run, counted voters vote, ballots follow views                  | `pw/candidacy-and-votes` | After PW-2 |
| PW-4    | Laws reach people as money and services; taxes don't stop; budgets move spending | `pw/laws-reach-people`   | After PW-2 |
| PW-5    | Elections and terms dated by the state's rules; the player votes                 | `pw/elections-and-terms` | After PW-2 |
| PW-6    | The player turns 18 in play and an idle young adult has a life                   | `pw/player-start`        | After PW-1 |
| PW-7    | Money reaches accounts: pay, loans, owner draws, home values, layoffs            | `pw/money-paths`         | After PW-1 |
| PW-8    | Births happen and the counted population drifts                                  | `pw/births-and-counts`   | After PW-1 |

PW-3, PW-4 and PW-5 all touch `src/core2/modules/voting.ts` or `elections.ts`. PW-5 owns the dating code in those files; PW-3 owns the ballot and candidacy code; PW-4 stays out of both and works in `laws.ts`, `budgets.ts`, `law-effects.ts` and `src/core2/law-reach/`. If you must touch a line another package owns, stop and write the need in your PR body instead.

## Model and effort

Opus at **high** for every PW package: each one is a correctness problem in the engine the whole game runs on, and the cost of a wrong fix is another night of modules that look done and aren't. No helpers by default. Up to two read-only Sonnet helpers for reading many files, if the work splits cleanly.

## How every PW session works

1. **Start.** `git fetch origin main` and branch from it. Read the files above. Run `node --import tsx tests/golden-path/runner.mjs` once so you know what green looks like before you change anything. Do not run the full suite, typecheck or lint over the repository; check what you change.
2. **Contract.** Before building, put in the PR body: what you will build, which played-world checks (below) will go from failing to passing, and the paths you will touch. Then start. Do not wait for approval.
3. **Build one check at a time.** Commit after each one passes, with its test.
4. **Measure in the played world, on a seed you did not choose.** Draw it like this and paste the output into the PR body:

   ```
   node -e 'console.log(require("crypto").randomBytes(8).toString("hex"))'
   ```

   Then run the played-world check from PW-1 (once it exists; see PW-1 for the command) with that seed and the whole module list on. Name the place it drew, the seed, and the record ids your claim rests on. Run it a second time on a second fresh seed before you call anything done. Never tune anything to Greenfields, Pennsylvania or Juliaetta, Idaho, the two towns in the report; the owner said so.

5. **Speed.** A town's game year must stay under two minutes, and your change may not make it more than 20% slower. Measure before and after on the same machine, one process at a time, with the yearly command. Put both numbers in the PR body.
6. **Finish.** Put what works now, what failed and why in the PR body and the pool item's Notes (`docs/roadmap/PROGRESS.md` is archived at `docs/archive/2026-10-23/roadmap/PROGRESS.md` and is not written). Add `docs/release/changes/<branch-id>.md` (frontmatter `id`, `impact`, `section`, `title`). Leave the branch mergeable against `main`.

## What counts as finished

A PW package is finished when all of these are true, and the PR body says so in a checklist with one line of evidence each:

- Every acceptance check in the package passes in the played-world run on two fresh seeds, and the PR body names both places, both seeds and the record ids.
- The checks the package was assigned in PW-1's test are no longer marked as expected failures; they pass.
- The golden-path suite, the speed guard and the money-balancing check are green on the branch.
- Every shortcut is a registered stopgap: a marker in the code, a row in `src/core2/data/stopgaps.json` (id, kind, file, line, whatItFakes, why, addedBy, date, replacedBy). An unregistered placeholder is a defect and the tripwire tests fail on it.
- Every new number is in the parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it's checked against). No number is a bare literal in logic.
- No dice: no seeded roll or fixed percentage decides what a person, business or official does. Their traits, views, relationships, money, health, the law in force and the place's conditions decide, and the decision records say why. `npm run zero-dice` is green.
- No state, city or GEOID is named in logic. Place facts come from data rows.
- No hand-written player text. Screens show record data and control names; words come from the English engine.
- American English everywhere (`npm run spelling` is clean on your files).
- Nothing was pushed to another session's branch, and the package touched only its owned paths. Changes the core needs are written up as a request in the PR body for OPUS-CORE, not made.

Not finished means: the PR body says which checks pass, which fail, and why, with the same evidence. A partial package with an honest PR body is fine. A PR body that says "done" over a unit test is the defect these packages exist to end.

## The PR body

Short, in this order, in plain American English (the `civic-reports` skill; run `npm run report:check -- <file>` on a copy):

1. **Before:** what the owner saw in play. **After:** what he sees now. Two or three sentences each.
2. The checklist above, one line of evidence per item.
3. Place, seed and year-time before and after, for each of the two runs.
4. What failed and why, and what you need from another session.
5. Stopgaps added or cleared, by id.
