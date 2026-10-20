# CTO handoff, Oct 19, 2026 (acting CTO to the next session)

Written from the Actions history, the open PRs and the pool. Read with `.agents/skills/cto/SKILL.md` and the Oct 16 handoff.

## Where we are

- **Main is green** on every finished Release run since Oct 17. 100 merges Oct 17 to 18.
- **The fleet is idle** since Oct 18 20:39Z. Nothing is building; nothing is merging.
- **146 open PRs, 140 of them drafts, about 55 never rechecked** since they opened. 32 priority-1 items are not done, most of them sitting in unmerged PRs. The work exists; it is not on main.
- **Release runs waste themselves:** 373 of 714 runs since Oct 17 were cancelled as superseded by `pool:` commits. Pool item `release-skip-pool-only-commits`.

## The merger's order

1. #4459 first.
2. The ~12 `release-suite-red-list-core2` test-repair drafts, so the suite stops hiding real reds.
3. The p1 crash fixes: #4910, #4957, #4967, #4928, #5048, #4988, #4894, #4935, #5047.
4. Then small-first through the rest; recheck the ~55 never-rechecked drafts before anything new.

Builders start on Next up in `docs/pool/INDEX.md`; nothing is assigned by hand.

## The trials

GLM 5.3 produced a real, gradeable PR (#4990, about 4.1 of 5, two fixes sent back; now pool item `world-macro-federal-dollar-finish`); GLM 5.3 Flash lost its working directory and opened no PR (#4992 closed).

## Rulings of Oct 19 (in OWNER-DECISIONS.md)

- A filled-in household's arrears: it depends on the people, read from the household's own record; no fixed share.
- The committee's day runs whatever the records already fire for a sitting day, at the stage the body's rules put them (acting CTO ruling).
- County and state counts at the opening come straight from the census, varying by seed; not from relatives (`core-opening-counts-from-census`).
- The federal-dollar trial work is back in the pool; `world-macro-outside-outlays-indexed` follows it.

## Close these

Already ruled Oct 16, still open in the pool: `owner-crime-engine`, `owner-disasters-in-play`, `owner-stress-mood-scale`, `core-player-autoplay-acts`. Set done by the next session with `npm run pool`.

## Pool flips to run today (merger, with npm run pool)

```
npm run pool -- status people-views-opening-stance-per-question done --pr 4856 --by cto
npm run pool -- status world-jobs-full-leave-strain-red done --pr 4858 --by cto
npm run pool -- status world-housing-pipeline-no-moves-seed done --pr 4864 --by cto
npm run pool -- status core-wiring-gaps-trace-pass done --pr 4869 --by cto
npm run pool -- status table-unread-regional-regions done --pr 4870 --by cto
npm run pool -- status tests-path-check-polling-place done --pr 4876 --by cto
npm run pool -- status play-step-10-people-bring-it-up done --pr 4887 --by cto
npm run pool -- status play-step-11-next-election-uses-record done --pr 4901 --by cto
npm run pool -- status core-fill-in-returning-unrecorded-member done --pr 4910 --by cto
npm run pool -- status core-office-job-ends-before-days-work done --pr 4917 --by cto
npm run pool -- status people-press-law-took-effect-unprinted done --pr 4936 --by cto
npm run pool -- status play-unicameral-speaker-sets-agenda done --pr 4956 --by cto
npm run pool -- status tests-path-check-legislature-session-days done --pr 4962 --by cto
npm run pool -- status jobs-raise-unfilled-pay-read-only done --pr 4967 --by cto
npm run pool -- status people-press-small-town-outlets-close done --pr 4999 --by cto
npm run pool -- status director-appointment-scene-governor-none done --pr 5001 --by cto
npm run pool -- status world-press-outlet-revenue-wage-gap done --pr 5013 --by cto
```

Then regenerate (`npm run pool`) and confirm `--check` passes. The permanent fix is pool item release-pool-done-on-merge (priority 1).
