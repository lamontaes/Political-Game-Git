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
