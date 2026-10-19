# Session 27 duplicate ticket DUPE-05: one future handler registry

**State:** open on current main `343136ee`.

`src/simulation/future-transitions.ts:353-363` resolves the primary registry, then falls back to `crisisAmbientHandler`, `PEOPLE_GOAL_HANDLERS`, and a linear scan of `SPEECH_RETELLING_HANDLERS()`. The crisis fallback reaches a second full list through `src/simulation/crisis/ambient.ts:8-25` and `src/simulation/crisis/index.ts`'s `createCrisisTransitionRegistry`. `src/simulation/future-transition-registry.ts:101-128` composes registries with first-match-wins semantics. The separate people-goal registry is at `src/simulation/people-goal-review.ts:160-167`; speech handler pairs are built in `src/simulation/speech-retelling.ts:414-417`.

**Work:** fold ambient crisis, people-goal, and speech-retelling handlers into the canonical list supplied to the clock, remove the resolver fallback, and make registry composition reject duplicate keys. Preserve lazy construction where imports currently require it. Add a regression test showing each duplicate key fails at registry construction and all 21 crisis handlers resolve through the same list.
