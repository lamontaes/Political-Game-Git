# Session 31 progress

## b04-p1 — leftover funds follow state rules

- The separate draft PR adds a complete state, D.C. and territory option table with interim estimates labeled, keeps balances in the losing committee, and supports explicit same-candidate transfer where allowed.
- Focused tests passed: campaign money sources (4) and campaigns (37).
- `npm run typecheck` passed, including 798 test-import checks; Prettier and `git diff --check` passed.
- Pending: actual new-game campaign proof in a randomly drawn place. Keep the PR draft.

Exact next command: `npx vitest run src/simulation/campaigns.test.ts` after adding the random-place carry-forward trace.
