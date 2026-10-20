# Architecture

How the game is built, as it is today. Written for someone who will open files but does not write code. Every path here exists in the repository. Rules for working on the game live in `AGENTS.md`, not here.

## One engine

`src/core2` is the engine. It holds the world: the date, every person, every account, every office, and the record of what happened. Everything else in the repository is a client of it: the game screen, Dev mode, the story director, the English engine, the desktop shell, the tests.

The old core, `src/simulation`, is being removed. It has two jobs left: building the opening town, and the health condition pack. Both are being lifted into core2 and the folder deleted (owner, Oct 19). The steps are in `docs/design/old-core-retirement-map.md`; what moved and how is in `docs/design/core2-porting-plan.md`. Nothing new goes into `src/simulation`.

## The day

A day is one call to `advanceCore` in `src/core2/life.ts`. In order:

1. The date moves forward one day, and the engine notes which people are due to act today.
2. The module calendar runs (`src/core2/module-calendar.ts`): dated work each module scheduled earlier, such as a payroll or an election.
3. Each module's `onDay` runs, in registration order. The base order is the list `createLifeCore` builds in `life.ts`; the economy's order is `WORLD_MODULES` in `src/core2/modules/world.ts` (macro, regional, credit, jobs, housing, business, place prices, world metrics).
4. Planned acts fall due: things a person decided earlier to do on this date.
5. Each due person acts. Every choice, for every person and every module, goes through the one chooser in `src/core2/choice.ts`. That is where "no dice" lives: a choice is scored from the person's needs, drives, views and situation, and the best-scored offer wins. There is no random number anywhere in a decision.
6. Each module's `onAfterDay` runs.
7. Compaction: routine statistics fold into monthly totals, quiet work results are condensed, so a long game does not grow without limit.

`src/core2/focus.ts` decides who gets daily detail. The player and the people around them are followed every day; everyone else is run at the level the engine can afford.

## Modules

A module is one engine inside core2. The shape is `CoreModule` in `src/core2/types.ts`. A module has an `id`, its own `state`, and hooks the engine calls. The hooks, as declared there: `onDay`, `onAfterDay`, `onCalendarWork`, `onEvent`, `onEventAppraisal`, `onRelationshipChange`, `onFillIn`, `onWorkResult`, `onWorkAttendance`, `onWorkPayroll`, `onSalesReceipt`, `onCountedWages`. A module also declares what it contributes: `eventKinds`, `appraisalEventKinds`, `relationshipKinds`, `reasonProviders`, `journalSourceProviders`, `needEvaluators`, `offerProviders`, `effectHandlers`, `eligibilityRules`.

A module talks to the world only through `CoreAPI`, also in `types.ts`. The calls fall into groups:

- **Reading:** `moduleState`, `moduleCalendar`, `accounts`, `version`, `parameter`, `observe`, `knows`, `relationship`, `lookupPublicOrganization`.
- **Money:** `postJournal`, `completeJournalSource`, `releaseJournalSource`, `registerCashAccount`, `addFinanceContract`, `addFinanceCondition`, `addCreditFacility`, `drawCredit`, `repayCredit`, `repriceCreditFacility`, `reduceStandingArrears`, `carryStandingArrears`, `setStandingContractAmount`, `endStandingContract`, `settleFinanceContract`, `retireFinanceBudget`, `prepareFinanceProcurement`, `finishFinanceDay`, `setPurchaseTax`, `endPurchaseTax`, `fundPublicPay`, `publicPayShortfallMinor`.
- **Work and business:** `startJob`, `startSalariedPost`, `endJob`, `rerateJob`, `addWorkCommitment`, `addWorkPayrollCalendar`, `recordWorkAttendance`, `settleWorkPayroll`, `settleWorkResult`, `settleLegacyWorkResult`, `addBusinessBooks`, `attachBusinessCredit`, `reviewBusiness`, `closeEmployer`, `closeBusinessByChoice`, `enterMarket`, `addOrganization`.
- **People:** `updatePerson`, `updateNeeds`, `updateGoal`, `updateDrive`, `meet`, `join`, `leave`, `markOrganized`, `recordActivityTime`, `recordDiscretionaryTime`.
- **Events and acts:** `emit`, `subscribeEvents`, `publishEventAppraisal`, `subscribeEventAppraisals`, `subscribeRelationshipChanges`, `validateAct`, `recordAct`, `requestCallback`, `resolveCallback`.
- **Honesty:** `stopgap` (see "Numbers and shortcuts").

The modules live in `src/core2/modules/`. An engine's helpers are `src/core2/<name>-*.ts` and its data `src/core2/data/<name>/`. Grouped by the areas `AGENTS.md` ("The team") defines:

- **Core** (state, clock, choices, ledger, population, speed, money, and everything not listed below): `life`, `record`, `residents`, `moves`, `counted-moves`, `counted-demotion`, `homeless-count`, `finance`, `work`, `staff`, `meetings`, `resting-stress`, `retirement-claims`, `filing-clerk`, `succession`, `outcome-web`, `world`.
- **Government** (laws, budgets, programs, offices, elections and campaigns, legislatures, executive): `laws`, `world-legislating`, `budgets`, `employer-taxes`, `purchase-tax`, `official-pay`, `offices`, `officials`, `office-day`, `leadership`, `executive`, `legislature`, `elections`, `world-races`, `campaigns`, `candidacy`, `voting`, `ballot-measures`, `recalls`, `parties`, `interest-groups`, `constituent-cases`, `justice`, `corruption`, `press`, `news`.
- **People** (people, health, drives, views, renewal, the director and the English engine): `people`, `health`, `drives`, `views`, `renewal`, `speech`, `school`.
- **World** (the economy): `macro`, `regional`, `jobs`, `housing`, `credit`, `business`, `place-prices`, `world-metrics`, `disasters`.
- **Play** (what the bench shows): `world-panels`.

`people.test.ts` and `people-lookup.test.ts` in the same folder are tests, not modules.

## Money

Every dollar in the game sits in a named account (`src/core2/accounts.ts`) and moves only by a journal entry (`src/core2/journal.ts`). An entry is one movement, balanced: what leaves one account arrives in another, to the cent. Money is never created by a module writing a number; it is posted. Obligations (rent, a loan, a salary, a tax) carry due dates; what is not paid on time becomes arrears and is carried forward, not forgotten.

## People, two tiers

The game has one model of a person, kept at two levels of detail (`docs/design/one-model-two-tiers.md`).

- **Full people** (`src/core2/person-state.ts`): a name, a household, needs, drives, views, relationships, a job, accounts, a history. The player, everyone near the player, and everyone the story needs.
- **Counted groups** (`src/core2/counted-groups.ts`): everyone else, packed as columns of counts per place, household kind, income band and age band. They pay rent, work, vote and age as totals, cheaply.

When the game needs a counted person to become a full one (the player moves to a new town, a story needs a neighbor), `fillInPerson` in `src/core2/state.ts` draws a consistent person out of the group's columns and calls each module's `onFillIn` hook so every engine adds its part; `src/core2/residents.ts` holds the counted-resident helpers (cadences, outside flows, who stays full). Nothing is invented from nowhere; the counts go down by one.

## Numbers and shortcuts

No number is typed into code. Every rate, price, share and threshold is a row in `src/core2/data/parameters.json`, read by a module through `api.parameter`. Each row says whether it is **SOURCED** (with a citation into `data/research/`), **ESTIMATED** (a reasoned guess, with the reasoning), or **TUNABLE** (a design knob), and carries a spread where one is known.

Every shortcut is a row in `src/core2/data/stopgaps.json`, registered through `api.stopgap`: what it fakes, and what replaces it. Open stopgaps show as red banners in Dev mode, and `assertReleaseReady` in `src/core2/stopgaps.ts` (audited by `src/core2/tooling/tripwires.ts`) refuses a release while any is open. This is how the game stays honest about what is real and what is still a stand-in.

## Around the engine

- `src/director/`: the story director. It reads the world and decides what the player should notice. It never changes the world; the only thing it writes is a stop for the player.
- `src/english/` and `data/english/`: the English engine. Every sentence the player reads is composed from word banks and the facts of the moment. No one types player text into the game.
- `src/bench/`: the bench. `play.html` with `play.mjs` is the game screen. `dev.html` with `dev-mode.ts` is Dev mode, including Trace, which shows why a choice went the way it did. `server.ts` serves both. `world.ts` builds the world the bench and the tests play.
- `desktop/`: the Electron shell and the updater. It opens the bench in a window and keeps it up to date. No game logic.
- `src/rules/laws/`: the law texts and how a law's clauses become effects the modules read.
- `src/districts/` and `src/maps/`: political geography; which places make up which district, and how they are drawn.
- `src/fiscal-authority/`: which government may tax and spend what.
- `src/education/`: schooling.
- `src/release/`: build identity and the in-game bug report. The release gate itself is `scripts/release/`.
- `src/authoring/`: tools for writing content and data, not used while the game runs.
- `src/source/`: readers for real-world evidence files. Evidence reaches the world only through data rows; `src/source` never runs inside the engine.
- `src/presentation/`: screen state shared by the bench screens.

## Data

`data/` at the root is evidence and words: `data/research/` (what the real world does, with sources), `data/english/` (word banks), `data/content/`, `data/laws/`, and the rest. `src/core2/data/` is what the engine actually loads, one folder per engine plus `parameters.json` and `stopgaps.json`.

Research calibrates and never decides an outcome. A study sets a rate; the person's own needs, drives and situation decide what they do with it.

## Guards

- `tests/golden-path/`: a whole game played headless. `runner.mjs` runs it; `played-world.node-test.ts` checks it; the world comes from `buildBenchWorld` in `src/bench/world.ts`.
- Vitest tests sit beside the code they test (`*.test.ts`).
- `scripts/zero-dice-guard.mjs`: fails if any decision touches a random number.
- `npm run speed:year`: one game year must run inside the time budget.
- `scripts/core2-guard/`: paired base-versus-head runs that catch golden-path regressions and slower core changes (`paired.mjs`, `prove-golden.mjs`, `prove-performance.mjs`).
- `npm run release:check` (`scripts/release/`): every change has a declaration in `docs/release/changes/`; with the build and typecheck it is the gate that blocks a merge.
- `scripts/pool/index.ts`: the work pool that builders draw from.

## Where to start reading

1. `src/core2/README.md`: the one-page map.
2. `src/core2/types.ts`: `CoreModule` and `CoreAPI`, the whole contract.
3. `src/core2/life.ts`: `advanceCore`, the day.
4. `src/core2/choice.ts`: how a person decides.
5. `src/core2/modules/people.ts`: one full module, end to end.

## Rules this file does not repeat

Who edits what, how work is claimed, how a PR is gated and merged, what a stopgap must declare, and how the English engine is written: `AGENTS.md`.
