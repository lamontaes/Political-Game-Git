# Session 100 resume marker

- Current item: BG-14.
- Done: generated grandparents now receive stable calendar birthdays within their sourced birth years, so a couple no longer inherits one birthday and reaches one mortality-strain crossing day.
- Proof: `src/simulation/character-history-context-people.test.ts` draws one of all 56 places and checks that the generated deceased relatives have distinct birthdays and death dates.
- Next: run the BG-14 focused test and local gates, commit, open the BG-14 PR, and post READY on issue #2424. Then claim BG-15 if its resume marker remains inactive.
- Exact next command: `npx vitest run src/simulation/character-history-context-people.test.ts`
- Board limitation: this checkout has no Git remote and `gh auth status` reports no authenticated GitHub host, so the required #2424 claim and READY posts cannot be sent from this environment.
