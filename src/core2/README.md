# core2: the map

`src/core2` is the game's one engine. Everything else is a client of it. The longer story is `ARCHITECTURE.md` at the root; the working rules are `AGENTS.md`.

## The day

`advanceCore` in `life.ts`, one day per loop:

1. the date moves one day; the people due today are noted;
2. the module calendar runs (`module-calendar.ts`): dated work modules scheduled earlier;
3. each module's `onDay`, in registration order (base order in `createLifeCore`; economy order is `WORLD_MODULES` in `modules/world.ts`);
4. planned acts fall due;
5. due people act through the one chooser, `choice.ts` (no dice: the best-scored offer wins);
6. each module's `onAfterDay`;
7. compaction of routine statistics and quiet work results.

`focus.ts` decides who gets daily detail.

## Modules by area

Shape: `CoreModule` in `types.ts` (`id`, `state`, hooks `onDay`, `onAfterDay`, `onCalendarWork`, `onEvent`, `onEventAppraisal`, `onRelationshipChange`, `onFillIn`, `onWorkResult`, `onWorkAttendance`, `onWorkPayroll`, `onSalesReceipt`, `onCountedWages`; declarations `eventKinds`, `appraisalEventKinds`, `relationshipKinds`, `reasonProviders`, `journalSourceProviders`, `needEvaluators`, `offerProviders`, `effectHandlers`, `eligibilityRules`). All in `modules/`.

- **Core:** life, record, residents, moves, counted-moves, counted-demotion, homeless-count, finance, work, staff, meetings, resting-stress, retirement-claims, filing-clerk, succession, outcome-web, world.
- **Government:** laws, world-legislating, budgets, employer-taxes, purchase-tax, official-pay, offices, officials, office-day, leadership, executive, legislature, elections, world-races, campaigns, candidacy, voting, ballot-measures, recalls, parties, interest-groups, constituent-cases, justice, corruption, press, news.
- **People:** people, health, drives, views, renewal, speech, school.
- **World:** macro, regional, jobs, housing, credit, business, place-prices, world-metrics, disasters.
- **Play:** world-panels.

## The API

`CoreAPI` in `types.ts`. A module touches the world only through it.

- Reading: `moduleState`, `moduleCalendar`, `accounts`, `version`, `parameter`, `observe`, `knows`, `relationship`, `lookupPublicOrganization`.
- Money (`accounts.ts`, `journal.ts`; every movement one balanced entry): `postJournal`, `completeJournalSource`, `releaseJournalSource`, `registerCashAccount`, `addFinanceContract`, `addFinanceCondition`, `addCreditFacility`, `drawCredit`, `repayCredit`, `repriceCreditFacility`, `reduceStandingArrears`, `carryStandingArrears`, `setStandingContractAmount`, `endStandingContract`, `settleFinanceContract`, `retireFinanceBudget`, `prepareFinanceProcurement`, `finishFinanceDay`, `setPurchaseTax`, `endPurchaseTax`, `fundPublicPay`, `publicPayShortfallMinor`.
- Work and business: `startJob`, `startSalariedPost`, `endJob`, `rerateJob`, `addWorkCommitment`, `addWorkPayrollCalendar`, `recordWorkAttendance`, `settleWorkPayroll`, `settleWorkResult`, `settleLegacyWorkResult`, `addBusinessBooks`, `attachBusinessCredit`, `reviewBusiness`, `closeEmployer`, `closeBusinessByChoice`, `enterMarket`, `addOrganization`.
- People: `updatePerson`, `updateNeeds`, `updateGoal`, `updateDrive`, `meet`, `join`, `leave`, `markOrganized`, `recordActivityTime`, `recordDiscretionaryTime`.
- Events and acts: `emit`, `subscribeEvents`, `publishEventAppraisal`, `subscribeEventAppraisals`, `subscribeRelationshipChanges`, `validateAct`, `recordAct`, `requestCallback`, `resolveCallback`.
- Honesty: `stopgap`.

## People, two tiers

Full people in `person-state.ts`; everyone else as counted groups in `counted-groups.ts` (columns per place, household kind, income band, age band). `fillInPerson` in `state.ts` fills a counted person in when the game needs them and calls each module's `onFillIn`. See `docs/design/one-model-two-tiers.md`.

## Data and parameters

- `data/<name>/`: what each engine loads. Root `data/` is evidence and words; it never runs inside the engine.
- `data/parameters.json`: every number, read through `api.parameter`; each row SOURCED, ESTIMATED or TUNABLE, with citation and spread.
- `data/stopgaps.json`: every shortcut, registered through `api.stopgap`. `assertReleaseReady` (`stopgaps.ts`) refuses a release while any is open.

## How to add a module

1. One file, `modules/<name>.ts`, exporting a `CoreModule`. Helpers go in `src/core2/<name>-*.ts`.
2. Register it in the module order (`createLifeCore` in `life.ts`, or `WORLD_MODULES` in `modules/world.ts` for the economy).
3. Numbers as rows in `data/parameters.json`; the engine's own tables in `data/<name>/`.
4. Tests beside it (`modules/<name>.test.ts`); the golden path in `tests/golden-path/` must still pass.
5. Any shortcut gets a marker in the code and a row in `data/stopgaps.json`.
6. Run `npm run zero-dice`, the golden path (`tests/golden-path/runner.mjs`) and `npm run speed:year`.
