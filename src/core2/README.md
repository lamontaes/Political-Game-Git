# core2: the engine

The map of the engine (how a world is built, the day, the modules by area, money, the two tiers of people, numbers and shortcuts) is `ARCHITECTURE.md` at the repository root. This file covers only adding a module.

## How to add a module

1. One file, `modules/<name>.ts`, exporting a `CoreModule` (`types.ts`). Helpers go in `src/core2/<name>-*.ts`.
2. Install it where its area installs modules:
   - the base list in `createLifeCore` (`life.ts`);
   - `WORLD_MODULES` (`modules/world.ts`) for the economy;
   - `peopleModules()` (`src/director/play-modules.ts`) for people;
   - or an `open<Name>(core)` call in `src/bench/world.ts` for government.
3. Numbers go as rows in `data/parameters.json` or the engine's own `data/<name>/parameters.json`, tagged SOURCED, ESTIMATED or TUNABLE. The engine's tables go in `data/<name>/`.
4. Tests go beside it (`modules/<name>.test.ts`). Prove it in a played world (`.agents/skills/played-world-proof/SKILL.md`): another engine must read what it writes.
5. Any shortcut gets a marker in the code and a row in `data/stopgaps.json`.
6. Run `npm run zero-dice`, the golden path (`node --import tsx tests/golden-path/runner.mjs`) and `npm run speed:year`.
