# Economy screens scale with office; other places' politics reaches you through the news (bank id b22, phases: equip and inform / living world)

Verified against origin/main e403b9bfd (Oct 6). Bank spec: docs/codex/specs/bank/b22-economy-by-office-and-news-from-elsewhere.md.

## What the player experiences

As an ordinary resident you see the economy as a resident does: your paycheck, rent, prices, whether the plant is hiring, and what the local paper says about the town budget. Win a council seat and the town's numbers become your screen, with what your ordinance would cost. As mayor you add department lines and the account history; as a legislator, the state budget and the cost of every state bill; as governor, the state's economy; in Congress or the White House, the federal budget, national output, prices and jobs. The rest of the country does not go dark: you hear about other places the way people do in real life. National outlets carry the big stories from anywhere (a governor resigns, a state passes a sweeping law, a disaster). Your own state's paper covers your state in more detail. Your town paper covers your town. Other towns' small doings you never hear about unless they get big or touch you.

## Owner decisions it rests on

- "Economy visibility scales with office. Other places' politics reaches you through the news (national big stories, your state in more detail)." (this round: local numbers early, full graphs and briefings higher up; news works like real life; Session 3 owns the news screens)
- "Opinion: word of mouth and local paper at council; real polls higher up." "Mayor: budget numbers are a screen."
- Register, world outside (Sept 26): "news from other towns arrives with natural lags"; "Ordinary readers. Each person has a news habit shaped by age, interests and temperament."
- Fixed: zero dice; nothing blank or placeholder; one rule for all places; things happen only when they matter, no daily tick over everyone; one writer per record kind; delete what you replace.

## Existing code to extend (verified on e403b9bfd)

- Economy screens: `src/player/BudgetEconomyWorkspace.tsx:13`; `src/presentation/budget-economy.ts:43 projectBudgetEconomy` (docstring :38 "neither checks officeholding"); `presentation/macro-conditions.ts:275 projectMacroConditions`; `player/EconomicContextPanel.tsx`, `presentation/economic-graphs.ts`, `player/ShellWorkspaces.tsx PersonalFinancesWorkspace`, `player/PlaceConditions.tsx`.
- Mount and gates: `src/player/PlayerGame.tsx:1876 holdsOffice` and the Budget sub-tab gate at `:3305-3322` (`hasBudget` is data availability only; verified, bank cite :3311 is close). `presentation/politics-issues.ts:20 politicsIssueAccess`. Federal refusal: `presentation/politics-government.ts:1226` ("Federal public finances are not part of this game yet").
- Office readers (none returns jurisdiction plus level): `governing/office-consequence.ts:386 officesHeldBy`, `crisis/offices.ts:132 publicOfficesHeldBy`, `governing/state-governing.ts:364 governingOfficeForPerson` (bank cite :281 is stale; it is :364 and has jurisdictionId).
- Federal money exists: `public-budgets/federal-treasury.ts:248 openFederalTreasury`, `:315 settleFederalTreasuryMonth`, `federal-budget-categories.ts`.
- Press: `press/desk.ts:1481 pressDeskSweepHandler`, `:1700 outletCovers` (national when `recordedScale(event) >= NATIONAL_REACH_SCALE` at :1713; the constant is 3, pinned in `newsworthiness.test.ts:134`), `:1821 newsworthiness`. `press/outlets.ts:452 ensurePressMediaOpening`, `:497 ensurePressHomeCoverage`, `press/views.ts:447 ensurePressExposureCoverage`: both coverage functions have NO production caller (only `outlets-coverage.test.ts`; verified).
- Reach: `living-world/official-views.ts:279 followsNewsClosely`, `law-exposure.ts recordHeardExposure`, `neighbor-news.ts` (`peopleTiedTo`, `tellPeopleOf`).
- Screens: `presentation/news-front-page.ts:118 projectNewsFrontPage` (no place filter), `presentation/world39-news.ts:97 projectWorld39News`, `press/read-publication.ts`.
- Office taken: `src/simulation/office-transition.ts` and `src/presentation/office-transition.ts` (the two places to hook step 3).
- Correction: `data/game/` does not exist. Visibility table goes to `data/content/economy-visibility.json` (`data/content/` exists).
- Newer code covering part: none; `playerOfficeScope` and `newsHabitOf` do not exist.

## Build steps (one PR each)

1. **One office-scope reader.** `playerOfficeScope(world, personId)` in `governing/office-consequence.ts` beside `officesHeldBy`: every held office as `{officeKey, title, jurisdictionId, level}` (levels: town, county, state-legislature, state-executive, congress, federal-executive, judicial), composed from the readers above. Replaces: ad-hoc `holdsOffice` booleans that become redundant (list them). Must not: a second office store.
2. **Visibility table, data not code.** `data/content/economy-visibility.json`: level to which projections mount and for which jurisdiction. Resident: personal money, home-town conditions, the local paper's budget stories. Town/county seat: that government's `projectBudgetEconomy` plus fiscal notes on its bills. Mayor/executive: plus program lines and account history. State legislator: state budget and state-bill fiscal notes. Governor: plus state series from `projectMacroConditions`. Congress/President: federal budget by category and national series. Several offices = the union. `BudgetEconomyWorkspace` and the Budget tab read it through `playerOfficeScope`; replace the data-availability gate at `PlayerGame.tsx:3305-3322`. Implement federal scope in `projectBudgetEconomy`, delete the :1226 refusal. Must not: fake numbers for levels the game does not model.
3. **Coverage follows the player.** Call `ensurePressHomeCoverage` when an office is taken (`office-transition.ts`) and `ensurePressExposureCoverage` when the player attends a public event out of state. Must not: outlets for all 56 places at opening.
4. **Big stories become national from their own records.** Producers write a scale tag from people affected, office level and money moved, following `office-consequence.ts:368` (`importance:*` on resignations): state enactments (`recordEnactment`), governor changes (a public `office.governor-changed` event next to the excluded `world.office-tenure` written by `nationwide-world/governor-succession.ts`), state supreme court rulings; disasters already carry `magnitude:`. `outletCovers` keeps its rule; no new threshold.
5. **News screens show what reaches you** (Session 3 owns the look; this PR owns the data). `projectNewsFrontPage` takes the player and keeps outlets the player reads (national, home state, home town, states from step 3), through new `newsHabitOf(world, personId)` (age, interests, temperament, job); `followsNewsClosely` becomes a caller of it. National lead by default, state and local below.
6. **Reach for people only where it matters.** On publish, write knowledge (`recordEventKnowledge`) for readers whose habit includes that outlet AND who are simulated person-by-person (the player's town and county) or are officials the story concerns. Everyone else is reached as modeled groups at their next scheduled update. Word of mouth uses the existing neighbor-news path.

## Must NOT build

A second budget or economy model; outlets for every state up front; a daily news tick; per-person knowledge for the whole country; random story selection or fixed reader shares; office checks scattered in components; other towns' council meetings (needs every town seated; until then other-town council news cannot exist); the newspaper's visual design.

## Research tables

None new. Scale for "national" is the existing `NATIONAL_REACH_SCALE`. Federal categories come from `federal-budget-categories.ts`.

## Done when (played-game proof)

- Random place: as a resident, Money shows personal money and town conditions only. Win the seat (or Custom Start into it): town budget with fiscal notes. Custom Start as governor elsewhere: state budget and series. As President: federal categories and national series.
- Run 12 months: the national page carries at least one other-state story chosen by recorded scale; the home-state paper carries home-state legislature stories; no small other-town story appears unless its scale reached national.
- Tests: `player-office-scope.test.ts` (loops all 50 states, D.C., territories), `economy-visibility.test.ts` (table drives mounts; union for two offices), `news-front-page.reach.test.ts`, `outlet-covers.scale.test.ts` (governor change reaches national; routine one does not).

## Proof to post

Per step: random place and seed, printed office scope, screenshots of each level's screens, printed front page with outlet and scale tag per story, delete list for each "Replaces:", `npm run typecheck` plus changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.
Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

- Open question: can a resident dig into the full public budget? Switch: one data row per level in the visibility table, `lookItUp` = `full | summary | none`, default `full` via a "look it up" route (option a); b is `none`, c is `summary`. Build the route either way.
- Coordinate with Session 3 on news screens and Session 23 on `BudgetEconomyWorkspace`; message them, keep building.
