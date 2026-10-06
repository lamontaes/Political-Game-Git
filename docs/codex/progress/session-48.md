# Session 48 — b22-p6 publication reach

Claim receipt: board #2424 comment 6016809471. Fable assignment map routes Session 48 to economy-engine banks; POOL keeps b22-p1 through p6 assigned to S48. This part owns only `src/simulation/press/desk.ts` and `src/simulation/press/publication-reach.test.ts`.

## Done

- Added an individual-reader collection seam limited to the controlled player's home town.
- The outlet-audience predicate is an explicit local conservative stub that returns false because World has no canonical saved person-to-outlet readership record. County reach is not inferred, and this does not establish production reader knowledge.
- Preserved the exact current-main desk implementation and applied only the p6 reader hunk; current main at composition was `e597ec933608993a9ecfef6110b3f9b9f856a3c7`.
- Focused test: `npx vitest run --config /tmp/press-vitest.config.mjs src/simulation/press/publication-reach.test.ts --reporter=verbose` — 1/1 passed.
- Scoped ESLint, Prettier, and `git diff --check` pass.
- Typecheck on the existing shared worktree reports only two inherited missing `personalLifeDepiction` fields in `src/simulation/press/press-premise.test.ts:35,125`; no p6 diagnostics. The shared checkout has not yet composed #2470's fixture fix.
- No random-new-game readership proof is claimed because the predicate is deliberately false; that producer remains a separate needed interface.

## Next

Finish publishing this one-part draft and check its exact hosted head. Then continue the already-owned b22-p5 PR #2515 ranking correction/rebase. Do not edit p5 presentation paths or the separate desk ownership additions from the press-history owner.
