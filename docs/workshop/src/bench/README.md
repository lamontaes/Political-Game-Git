# The bench

Run `npm run bench` and open forwarded port 3000.

- **`/play`** is the game screen on the new core. Press **New life**.
- **Dev mode** is a setting in the game's Options (Esc), off by default and remembered. With it on, the
  game's own menus show extra controls beside what they act on; there is no separate page.

## Dev mode

Every control goes through the game's own code, sped up, and leaves a `dev-mode-change` record on the
core; `devModeMarks(core)` lists them so a release save can refuse a world that carries them. A control
never writes a result: a forced pass is a real bill the members vote on, a forced bribe runs
`considerBribe`, a forced illness is the health module's own onset. Reading spends no game time.

| Where           | Control                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Options         | The Dev mode setting                                                                                                                                                                                                                                                                                                                                                  |
| Calendar        | **Run until** a number of days or an event (a bill passes or fails, an election, a death, a job lost, a scene, a law takes effect), with a cap and why it stopped; **Scenes** (every situation type, forcing the ones the game can bring about); **Watch** (public and private pay, the town's measures, the nation's, budgets, prices, news) and the **golden path** |
| Government      | **Bills** (introduce at any body through `draftBill`, pass or defeat at a margin through `castMemberVote` and `holdVote`, sign, veto and override through `executiveDecision`) and **Bribe** (`considerBribe`)                                                                                                                                                        |
| A person's card | **Remembers**, **Records** (the person view and the trace behind any record id), **Health** (fall seriously ill, run until they die, follow them, what the game offers them today and a pick as their next decision)                                                                                                                                                  |

Code: `dev-mode.ts` (the controls), `dev-api.ts` (routes, mounted from `server.ts`), and
`ui/dev-*.mjs` (the panels, mounted from `play.mjs`).

Checks: `npx vitest run src/bench/dev-mode.test.ts` (a random place and seed;
`DEV_MODE_SEED` repeats one), `npx vitest run src/bench/player.test.ts`, and
`npx tsc -p src/bench/tsconfig.json`.
