# Session 31 progress

## b04-p1 — leftover funds follow state rules

- Draft PR #2603 implements the jurisdiction option table, explicit estimates, retained committee balance, and an opt-in same-candidate transfer where allowed.
- Fresh new-game trace: seed `b04-p1-newgame-0`, randomly drawn Moncks Corner, South Carolina; player files a state-house campaign and loses on ordinary time advance. The committee ends with USD 0. The game currently provides no recorded contribution event, so a positive carry-over cannot be demonstrated without inventing a source.
- Campaign money source tests: 4 passed; campaign tests: 38 passed, including the random-place new-game trace and a focused nonzero balance fixture.
- `npm run typecheck` passed after the changed tests, including 798 test-import checks. Prettier and `git diff --check` passed.
- Keep the PR draft until the game has a canonical recorded contribution path and a positive balance can be carried forward in a new game.

Exact next command: `npx vitest run src/simulation/campaigns.test.ts` after a canonical contribution source is available for the random-place game.
