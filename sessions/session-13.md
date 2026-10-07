# Session 13 — Traits batch 1

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Wire these personality traits into real decisions people make in live play: playful-manner, facet-entitled, facet-tactful, facet-imaginative, facet-self-serving, facet-arbitrary, facet-hot-headed, facet-brooding, facet-nostalgic.

## Milestones
1. One trait per PR: effects file in src/simulation/traits/effects/, removed from NOT_YET_CONNECTED_TRAITS, generate:trait-effects + check:trait-effects pass.
2. Each PR has a same-person proof: same person, trait high vs low, different choice, in a seeded random place.
3. Prefer everyday decisions (work, friends, family, money, conflict, voting), not only 'run again'.
4. Pace: at least 2 traits ready per hour.

## Endpoint
All 9 traits wired (none left in NOT_YET_CONNECTED_TRAITS from this list), each with its proof, final #2424 line listing them.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
