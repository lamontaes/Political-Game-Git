# Session 16 — Traits batch 4

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Wire these personality traits into real decisions people make in live play: facet-smug, facet-charming, facet-dramatic, facet-observant, facet-fair-minded, facet-vindictive, facet-light-hearted, facet-devoted.

## Milestones
1. One trait per PR: effects file in src/simulation/traits/effects/, removed from NOT_YET_CONNECTED_TRAITS, generate:trait-effects + check:trait-effects pass.
2. Each PR has a same-person proof: same person, trait high vs low, different choice, in a seeded random place.
3. Prefer everyday decisions (work, friends, family, money, conflict, voting), not only 'run again'.
4. Pace: at least 2 traits ready per hour.

## Endpoint
All 8 traits wired (none left in NOT_YET_CONNECTED_TRAITS from this list), each with its proof, final #2424 line listing them.

## CTO instructions and findings (do these)
- CTO FINDING (verified by a 93-day run): only 1 of 15 trait-declared decisions ever runs in live play (incumbents running again). Never run: contact.answer (30 leans), labor.worker-quit, court.plea, court.jury-vote, clemency.petition, press.reporter-request-response, campaign.support-request, legislation.member-vote, people.couple-stage. A trait wired only to one of those changes nothing a player sees. For each trait, wire it to a decision that runs in live play (check the saved world's decision traces), and if the decision it belongs to never runs, make that decision run in live play in the same PR (or post SESSION NN BLOCKED naming it). The live press desk records press.subject-response (press/desk.ts ~789) with no traits — feeding press traits into it counts.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
