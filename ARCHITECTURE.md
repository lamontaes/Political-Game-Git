# Architecture

How the game is built, as it is today. Written for someone who will open files but does not write code. Rules for working on the game live in `AGENTS.md`; the docs map is `docs/README.md`.

## One engine

`src/core2` is the engine. It holds the world: the date, every person, every account, every office, and the record of what happened. Everything else in the repository is a client of it: the game screen, Dev mode, the story director, the English engine, the desktop shell, the tests.

The old core, `src/simulation`, is being removed. It is still used only to build the opening town (people, households, workplaces and schedules): a handful of `src/core2` opening files and three bench files import it. `npm run old-imports` lists exactly what still keeps it alive. The plan is `docs/design/old-core-retirement-map.md`; what moved and how is `docs/design/core2-porting-plan.md`. Nothing new goes into `src/simulation`, and `src/presentation` (the old appearance engine, still used by the character creator and the art pipeline) is on the same path.

## Building a world

A new game is built in stages by `benchWorldStages` in `src/bench/world.ts`:

1. **people:** the town's population, full and counted.
2. **past:** the history before day one.
3. **economy:** the national, regional and local economy.
4. **core:** the engine and its modules.
5. **government:** laws, offices, officials, elections, budgets and the rest.
6. **opening:** the opening scenes.

The play screen calls it through `/api/newlife` in `src/bench/handler.ts`, behind the loading screen. `buildBenchWorld` is the same build in one call, used by tests, `speed:year` and the golden path. Every game starts on January 20, 2025 (`gameStartDate` in `src/core2/game-start.ts`).

Modules are installed in this order:

1. `createLifeCore` in `src/core2/life.ts` installs the base modules.
2. `world.ts` adds the economy's `WORLD_MODULES` (`src/core2/modules/world.ts`), the outcome web, the people modules (`peopleModules` in `src/director/play-modules.ts`) and the director.
3. A run of `open*` calls (`openLaws`, `openOffices`, `openElections`, `openBudgets` and the rest) adds the government modules, each through `registerModule` in `src/core2/state.ts`.

`src/core2/saves.ts` (`newGame`, `saveGame`, `loadGame`) is a second, lighter build used by tests and scripts.

## The day

Play advances time through the player's clock, `advancePlayerV1` and `resumePlayerV1` in `src/core2/player-v1.ts`. It stops when the player has a choice to make or a scene starts. Dev mode and scripts use `advanceCore` in `src/core2/life.ts`. Both run a day in the same order:

1. The date moves forward, and the calendar notes who is due to act (`src/core2/calendar.ts`).
2. The module calendar runs dated work each module scheduled earlier, such as a payroll or an election (`src/core2/module-calendar.ts`).
3. Each module's `onDay` runs, in installation order.
4. Planned acts fall due: things a person decided earlier to do on this date.
5. Each due person acts. Daily acts go through the chooser in `src/core2/choice.ts`; other decisions use their engine's own formula with the shared trait terms in `src/core2/trait-decisions.ts`. Either way a choice is scored from the person's needs, drives, traits, views, money and situation. No random number decides it ("no dice").
6. Each module's `onAfterDay` runs.
7. Compaction folds routine statistics into monthly totals, so a long game doesn't grow without limit.

Who gets daily detail starts from `src/core2/focus.ts` (the player, family, the people they know, household and coworkers). How often everyone else acts is set by `duePeople` in `calendar.ts`.

## Modules

A module is one engine inside core2. Its shape is `CoreModule` in `src/core2/types.ts`: an `id`, its own `state`, and hooks the engine calls (`onDay`, `onAfterDay`, `onCalendarWork`, `onEvent`, `onFillIn`, the work and sales hooks, and others). It also declares what it contributes: event kinds, offers, effect handlers, eligibility rules and reason providers. A module talks to the world only through `CoreAPI`, in the same file: reading state and parameters, posting money, starting and ending jobs, updating people, emitting events, and registering stopgaps.

The modules live in `src/core2/modules/`; an engine's helpers are `src/core2/<name>-*.ts` and its data `src/core2/data/<name>/`. By area:

- **Core:** `life`, `record`, `residents`, `moves`, `counted-moves`, `counted-demotion`, `homeless-count`, `finance`, `work`, `staff`, `meetings`, `resting-stress`, `retirement-claims`, `filing-clerk`, `succession`, `outcome-web`, and `world` (which exports `WORLD_MODULES`; it isn't a module itself).
- **Government:** `laws`, `world-legislating`, `legislature`, `budgets`, `employer-taxes`, `purchase-tax`, `official-pay`, `offices`, `officials`, `office-day`, `leadership`, `executive`, `elections`, `world-races`, `campaigns`, `candidacy`, `voting`, `ballot-measures`, `recalls`, `parties`, `interest-groups`, `constituent-cases`, `justice`, `public-safety`, `corruption`, `contracts`, `projects`, `press`, `news`.
- **People:** `people`, `health`, `coverage`, `drives`, `views`, `renewal`, `speech`, `school`, `trait-change`.
- **World (the economy):** `macro`, `regional`, `jobs`, `housing`, `credit`, `business`, `place-prices`, `world-metrics`, `disasters`.
- **Play:** `world-panels` (read-only bench panels).

Laws reach people through `src/core2/law-reach/` (a law in force names whom it applies to and records each application) and the `laws` module. Which law controls where, and from when, is `src/rules/laws/`. The outcome web, where one area of the world moves another by researched links, is `modules/outcome-web.ts` with `src/core2/outcome-web-model.ts`.

## Money

Every dollar sits in a named account (`src/core2/accounts.ts`) and moves only by a balanced journal entry (`src/core2/journal.ts`): what leaves one account arrives in another, to the cent. Money is never created by a module writing a number; it is posted. Obligations (rent, a loan, a salary, a tax) carry due dates, and what isn't paid on time becomes arrears and is carried forward.

## People, two tiers

The game has one model of a person, kept at two levels of detail (`docs/design/one-model-two-tiers.md`).

- **Full people** (`src/core2/person-state.ts`): a name, a household, needs, drives, traits, views, relationships, a job, accounts and a history. This covers the player, everyone near the player, and everyone the story needs.
- **Counted groups** (`src/core2/counted-groups.ts`): everyone else, packed as columns of counts per place, household kind, income band and age band. Every engine reads a group with the same rule as a full person, times its count.

When the game needs a counted person to become a full one, `fillInPerson` in `src/core2/state.ts` draws a consistent person out of the group's columns and calls each module's `onFillIn` so every engine adds its part. The counts go down by one.

## Numbers and shortcuts

Every rate, price, share and threshold is a parameter row: the root table `src/core2/data/parameters.json` plus each engine's own `parameters.json` in its data folder, merged at load. Each row is tagged **SOURCED** (with a citation into `data/research/`), **ESTIMATED** (with its source and spread) or **TUNABLE** (with the spread it's checked against).

Every shortcut is a row in `src/core2/data/stopgaps.json` (the director has its own in `src/director/data/`), registered in code through `api.stopgap`: what it fakes and what replaces it. `npm run stopgaps:report` lists the open ones. `assertReleaseReady` in `src/core2/stopgaps.ts` and the tripwire tests (`src/core2/tooling/tripwires.test.ts`) catch unregistered shortcuts. The release check doesn't yet refuse a release over open rows.

## Around the engine

- **`src/director/`: the story director.** It reads the world and decides what the player should notice: scenes, conversations, the journal and the opening. It writes nothing to the world except a stop for the player.
- **`src/english/` and `data/english/`: the English engine and its word banks.** Every sentence the player reads is composed from bank pieces and the facts of the moment (`grounded-english.ts` returns nothing rather than invent a fact).
  - The handler's `/api/journal`, `/api/scene` and `/api/talk/*` routes call the director, which calls the engine.
  - Wording guards: `npm run wording:check`, `tests/player-wording.test.ts`, `tests/runtime-text-guard.test.ts`.
- **`src/bench/`: the game and Dev mode.**
  - `play.html` and `play.mjs` are the game screen. `dev.html`, `dev.mjs` and `dev-mode.ts` are Dev mode, including Trace.
  - `handler.ts` holds the `/api/*` routes, shared by `server.ts` (`npm run bench`, port 3000) and the desktop shell.
  - `world.ts` builds the world. `src/bench/*.browser.mjs` are the browser checks.
- **`desktop/`: the Electron shell and updater.** It bundles the bench handler; no game logic.
- **Political geography:** `src/districts/` and `src/maps/`.
- **Old or unused folders, to be removed with the old core:**
  - `src/presentation/` (appearance engine, garment fit, pose families);
  - `src/fiscal-authority/` and `src/education/` (used only by `src/simulation`);
  - `src/authoring/` (the art-bench event model, used by one dev script);
  - `src/source/` (three unused type files);
  - `src/release/` (an old build-identity copy; the live one is `scripts/release/`, and the bug report is `src/core2/bug-report.ts`).

## Data

`data/` at the root is evidence and words:

- `data/research/`: what the real world does, with sources;
- `data/source/`: raw and compiled public datasets;
- `data/english/`: banks, grades, batches and calibration;
- `data/content/`: trait tables and similar;
- `data/laws/`, `data/tables/` and the rest.

`src/core2/data/` is what the engine actually loads: parameters, stopgaps, and each engine's tables (starting law, schools, offices, elections and more). Research calibrates and never decides an outcome. A study sets a rate; the person's own needs, drives and situation decide what they do with it.

## Guards

- `tests/golden-path/`: a whole game played headless. `runner.mjs` runs it, reading `docs/roadmap/features.json`; `played-world.node-test.ts` checks it in a world from `buildBenchWorld`.
- Vitest tests sit beside the code they test (`*.test.ts`). Guard tests include `tests/guards/`, `tests/player-wording.test.ts`, `tests/runtime-text-guard.test.ts`, `tests/american-english*.test.ts` and `src/core2/tooling/tripwires.test.ts`.
- `npm run zero-dice` (`scripts/zero-dice-guard.mjs`): rolls, fixed shares and list-picks in decision code.
- `npm run speed:year`: a game year must run inside two minutes, and no change may slow it by more than 20%.
- `scripts/core2-guard/`: paired base-against-head runs that catch golden-path regressions and slowdowns.
- `npm run release:check` (`scripts/release/`): every change has a declaration in `docs/release/changes/`. With build and typecheck, it is the client release gate.
- `npm run pool` (`scripts/pool/`): the work pool. `.github/workflows/pool-done-on-merge.yml` flips an item to done when its PR merges into main.

## Where to start reading

1. `src/core2/types.ts`: `CoreModule` and `CoreAPI`, the whole contract.
2. `src/bench/world.ts`: how a world is built and which modules it installs.
3. `src/core2/player-v1.ts` and `src/core2/life.ts`: the day.
4. `src/core2/choice.ts`: how a person decides.
5. `src/core2/modules/people.ts`: one full module, end to end.
