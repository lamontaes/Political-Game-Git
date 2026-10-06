# Session 57 resume marker: T9-facet-cocky

Item: T9-facet-cocky (Fable card 76), claimed in #2424 comment 6016137454.

Current branch: `codex/session57-t9-facet-cocky`, based on main `e591ffc`.

Completed:
- Added one authored row in `data/traits/effects/facet-cocky.json` for the existing `career.consider-another-term` decision.
- Added `src/simulation/facet-cocky-trait.test.ts`. Its test-only STUB composes the row into the current trait pack because the per-trait loader is still assigned to Session 8.
- Focused test passes 1/1 with `npx vitest run src/simulation/facet-cocky-trait.test.ts --config /tmp/session57-vitest.config.mjs`.
- Changed-file ESLint, Prettier check, and `git diff --check` pass.

Proof: generated new game at locality `1614950`; person `person_ef2b27ca4482aadc` changes from step-down to seek with a recorded personality-tendency source and reason “They figure they can win again.” A second generated person has no facet-cocky record and keeps the same choice in the controlled comparison. This is a focused simulation test with a test-only loader stub, not full production-loader integration or browser proof.

Next: commit and push this single-item draft, open one draft PR, then post exact head/check status and this resume marker on #2424. After publication, refresh POOL and board claims, preserve this branch, and take the next unclaimed exact item.

Exact next command after restart: `git status --short --branch`.
