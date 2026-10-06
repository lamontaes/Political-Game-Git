# Session 46 progress: b18-p5 Protests

## Done

- Confirmed current `main` is `e591ffc637d1f6db84d2ff920e8662ce123202ed` and POOL lists `b18-p5` as Protests under Session 46.
- Read the b18 assignment, standing rules, and interfaces. Checked the #2424 successor board; the #2052 comment fetch failed with `Transport closed` because that board reached its 2,500-comment limit.
- Added the isolated protest event writer and focused tests in `src/simulation/living-world/citizen-protests.ts` and `src/simulation/living-world/citizen-protests.test.ts`.
- The random-place new-game test passed in Aaronsburg, Pennsylvania with seed `citizen-protest-random-place-proof-2026-10-06`; one invited neighbor attended and one with an opposing saved view stayed home.
- `npx vitest run --config /tmp/vitest-session46-min.config.mjs src/simulation/living-world/citizen-protests.test.ts`: 2 tests passed. The repository Vite config cannot load in this isolated worktree because its build-identity helper hits sandbox `spawnSync git EPERM`; the minimal config was used to run the same focused test file.
- `npx prettier --check` and `npx eslint` on the two TypeScript files passed. `npm run zero-dice` passed.
- `npm run typecheck` reached only existing errors in `src/simulation/press/press-premise.test.ts` at lines 35 and 125; both omit required `PlaySettings.personalLifeDepiction`. No changed file had a type error.

## Next

- PR #2533 is published from `session46/b18-p5-protests` at `91124bf41633230b77ac1f281631009196e3dfb3`.

## Current limit

- This scoped PR saves organizer invitations, durable attendee decisions, named attendance, and a public protest event. It does not edit `pressure/ladder.ts`, dispatch desk coverage, or official-consideration readers, as those shared paths are outside this part's ownership. No downstream pressure, desk-coverage, or official-consideration consumer was established in this part; describe this as a saved causal event, not a wider effect.
