# Session 16

Read RULES.md (same branch) first. Items in order; the CTO marks DONE here and may add items — re-read after every PR.

TRAITS (owner: every personality trait must be wired). Wire each of these into real decisions people make in live play, one trait per PR:
facet-smug, facet-charming, facet-dramatic, facet-observant, facet-fair-minded, facet-vindictive, facet-light-hearted, facet-devoted.
Each trait: an effects file in src/simulation/traits/effects/ leaning real decisions (both poles if the catalog says two-sided), remove it from NOT_YET_CONNECTED_TRAITS in
src/simulation/personality-trait-registry.ts, `npm run generate:trait-effects` + `npm run check:trait-effects`, and a same-person proof: the same person with the trait high vs low
makes a different choice in a seeded random place. Prefer everyday decisions (work, friends, family, spending, conflict, voting), not only "run again". Gate, merge.

When everything here is DONE: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
