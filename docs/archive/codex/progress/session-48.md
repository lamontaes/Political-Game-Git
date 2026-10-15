# Session 48 — b22-p6 publication reach

Claim receipt: board #2424 comment 6016809471. Fable assignment map routes Session 48 to economy-engine banks; POOL keeps b22-p1 through p6 assigned to S48. This part owns only `src/simulation/press/desk.ts` and `src/simulation/press/publication-reach.test.ts`.

## Done

- Added an individual-reader collection seam limited to the controlled player's home town.
- The outlet-audience predicate is an explicit local conservative stub that returns false because World has no canonical saved person-to-outlet readership record. County reach is not inferred, and this does not establish production reader knowledge.
- Preserved the exact current-main desk implementation and applied only the p6 reader hunk; current main at composition was `e597ec933608993a9ecfef6110b3f9b9f856a3c7`.
- Focused test: `npx vitest run --config /tmp/press-vitest.config.mjs src/simulation/press/publication-reach.test.ts --reporter=verbose` — 1/1 passed.
- Scoped ESLint, Prettier, and `git diff --check` pass.
- Typecheck on the existing shared worktree reported missing `personalLifeDepiction` at `src/simulation/press/press-premise.test.ts:35,125`, but that checkout is stale: local fixture blob `2d0b38d2b4e7e11cae4c872b60bd1ac10f1f9f69` differs from the PR-base (`e597ec933608993a9ecfef6110b3f9b9f856a3c7`) fixture blob `a5fea6fd86a6c525a5b25886a9daba7bdaa63d33`. The exact PR-base fixture includes `personalLifeDepiction: "full"` at both locations. Those local diagnostics are not current-main failures or p6 diagnostics; exact composed-head typecheck is pending hosted validation.
- No random-new-game readership proof is claimed because the predicate is deliberately false; that producer remains a separate needed interface.

## Next

Finish publishing this one-part draft and check its exact hosted head. Then continue the already-owned b22-p5 PR #2515 ranking correction/rebase. Do not edit p5 presentation paths or the separate desk ownership additions from the press-history owner.
