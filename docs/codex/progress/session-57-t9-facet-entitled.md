# Session 57 resume marker: T9-facet-entitled

Item: T9-facet-entitled, claimed in #2424 comment 6016434058.

Current branch: `codex/session57-t9-facet-entitled`, based on main `e591ffc`.

Completed:
- Added one authored row in `data/traits/effects/facet-entitled.json` for `career.consider-another-term`.
- Added `src/simulation/facet-entitled-trait.test.ts`. Its test-only STUB composes the row into the current trait pack because Session 8 owns the per-trait loader/registry seam.
- Focused test passes 1/1 with `npx vitest run src/simulation/facet-entitled-trait.test.ts --config /tmp/session57-vitest.config.mjs`.
- Changed-file ESLint, Prettier check, and `git diff --check` pass.

Proof: generated new game at a random locality using seed `session57-facet-entitled-random-place-2026-10-06`; one person with the high facet-entitled record changes from step-down to seek, with the reason “They expect another term as their due.” A second person with no such record keeps their choice. This is a focused simulation test with a test-only registry stub, not production-loader integration or browser proof.

Next: commit and push this single-item draft, open one draft PR, then post exact head/check status and this marker on #2424. Continue to a new exact unclaimed item after refreshing POOL and board claims. T9-facet-smug is under active owner question #2424 comment 6016421670; do not claim or author a directional row pending the answer.

Exact next command after restart: `git status --short --branch`.
