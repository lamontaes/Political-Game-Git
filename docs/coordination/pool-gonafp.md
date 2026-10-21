# Session pool-gonafp (Sonnet, Oct 19, 2026)

One status file, written only by this session. Everything here is also in the pool items and PR bodies.

## Merge order for the CTO

Several PRs are stacked; merge each stack from the bottom.

1. **Work patterns, workplaces, schedules, mix (opening port):** #5084 (work-pattern tables) and #5093 (town workplace tables) first, then #5097 (work-schedule roster rule, needs both) and #5100 (employment mix, needs #5093).
2. **Trait leaves:** #5104 (mind-catalog, trait-packs), then #5108 (personality catalog and 42 trait readers), then #5110 (people-trait-definitions).
3. **Independent:** #5073 (opening employment drops the old jail-terms import), #5082 (name share measured per decade and sex), #5077 (leisure-hours line in the time-use report).
4. **Pool notes only:** #5071, #5074, #5085, #5087, #5089, #5101.

**Integration check (Oct 19):** merging all nine code branches (#5073, #5082, #5084, #5093, #5097, #5100, #5104, #5108, #5110) onto main gives no conflict outside docs/pool (the generated index and item files, resolved by regenerating) and `tsc` passes for both tsconfig.app.json and tsconfig.node.json. The four opening-port branches each list the new core files in the same four lines of tsconfig.node.json, so they merge without a conflict.

Also open: #5062 (stance causes, one per source), #4903 (births, merge-checked), #4861 (governor-share bound 0.16, measured in #5118), #5120 (gov-world-standins must be redone by engine), #5122 (play-history-d1 is already built).

Every PR has a release declaration and passes `release:check --mode pr`. Tests named in each PR body pass.

## Pool items touched

| Item                                                | State                          | Left                                                                                                          |
| --------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| core-old-imports-opening-employment                 | split (#5071)                  | blocked on its three parts                                                                                    |
| core-old-imports-opening-employment-jail-term       | in PR #5073                    | nothing                                                                                                       |
| people-cohort-name-share-measured                   | in PR #5082                    | nothing                                                                                                       |
| core-recovery-hours-per-offer                       | in PR #5077 (measurement step) | lower workWakingRecoveryHours to one sitting, needs an ATUS per-episode length                                |
| world-port-work-schedules                           | in PR #5084 (tables)           | roster rule is the next item                                                                                  |
| world-port-work-schedules-roster                    | in PR #5097                    | opening-work.ts still gets its facts through the old workSchedulesFor until core-port-world-scaffold          |
| world-port-town-employment                          | in PR #5093 and #5100          | laborStatus, townResidents, activeWorkers, ensureTownEmployment, fillTownJobs (they write into the old world) |
| people-port-traits-upbringing                       | in PR #5104, #5108, #5110      | people-traits, people-upbringing, trait-registry (import many old modules; see #5101)                         |
| elections-poll-sampling, elections-ballot-referrals | notes #5074 and #5087          | superseded by the new core; the CTO can drop them                                                             |
| people-journal-taking-office                        | untouched                      | duplicate of work already merged; the CTO can drop it                                                         |
| jobs-occupation-entry-experience                    | new item (#5089)               | needs a BLS occupation experience table; bls.gov returns 403 here                                             |
| world-player-jobless-no-offers                      | untouched                      | waits on jobs-occupation-entry-experience                                                                     |

## Needs from other sessions

- A session that can reach bls.gov and ssa.gov: the BLS experience and training table (jobs-occupation-entry-experience) and the SSA per-episode leisure length (core-recovery-hours-per-offer).
- The CTO: drop the three items named above, and merge the stacks in order.

## What the owner can play now

Nothing new: these are moves of code and data that keep every town the same, plus one data fix (given names now follow measured birth-decade shares; #5082).
