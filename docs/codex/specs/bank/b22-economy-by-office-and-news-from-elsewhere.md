# Economy screens scale with office; other places' politics reaches you through the news (bank id b22, phase Equip & inform / Living world)

## What the player experiences

As an ordinary resident you see the economy the way a resident does: your paycheck, your rent, prices at the store, whether the plant is hiring, and what the local paper says about the town budget. Win a council seat and the town's budget becomes your screen: what comes in, what goes out, what your ordinance would cost. As mayor you see department lines and the account's history; as a legislator, the state budget and the cost of every state bill; as governor, the state's economy; in Congress or the White House, the federal budget, national output, prices and jobs. Meanwhile the rest of the country does not go dark: you hear about other places through the news. National outlets carry the big stories from anywhere (a governor resigns, a state passes a sweeping law, a disaster). Your own state's paper covers your state in more detail. Your town paper covers your town. Other towns' small doings you mostly never hear about, unless they get big or touch you.

## Owner decisions this rests on

- "Economy visibility scales with office. Other places' politics reaches you through the news (national big stories, your state in more detail)."
- "Opinion: word of mouth and local paper at council; real polls higher up." "Mayor: budget numbers are a screen."
- Register, world outside (Sept 26): other cities meet on their real schedule and are resolved on the meeting date; "news from other towns arrives with natural lags."
- Register, Sept 26: "Ordinary readers. Each person has a news habit shaped by age, interests and temperament, and news also spreads by word of mouth."
- Things happen only when they matter; no daily tick over everyone. One rule for all places.

## Existing code it must use

- Economy screens: `src/player/BudgetEconomyWorkspace.tsx:13` (Macro panel :58, budget records :60-78, graphs :80-106, account history :108); `src/presentation/budget-economy.ts:43 projectBudgetEconomy` (docstring :34-42: "neither checks officeholding"); `src/presentation/macro-conditions.ts:275 projectMacroConditions`; `src/player/EconomicContextPanel.tsx:64`; `src/presentation/economic-graphs.ts:59/:197`; `src/player/ShellWorkspaces.tsx:1626 PersonalFinancesWorkspace` (home-town section :1638-1730); `src/player/PlaceConditions.tsx:13`.
- Mount and gates: `src/player/PlayerGame.tsx:4027-4078` (politics surface), `:3311-3326` (Budget sub-tab shown on data availability only), `:1876-1884 holdsOffice`; `src/presentation/politics-issues.ts:20 politicsIssueAccess` (transit/tax gated by office; "the public budget is for everyone"); `src/presentation/politics-government.ts:1190 issuesPlaceForSelection` (federal: "not part of this game yet" :1223-1225).
- Office readers (none returns jurisdiction + level together): `src/simulation/governing/office-consequence.ts:386 officesHeldBy`; `src/simulation/crisis/offices.ts:132 publicOfficesHeldBy`; `src/simulation/governing/state-governing.ts:281 governingOfficeForPerson` (has jurisdictionId); `src/presentation/legislative-filing-entry.ts:30 resolveLegislativeFilingEntry` (seat jurisdiction); `src/simulation/judicial-office-work.ts:77`.
- Federal money exists: `src/simulation/public-budgets/federal-treasury.ts:248 openFederalTreasury`, `:315 settleFederalTreasuryMonth`, `federal-budget-categories.ts`.
- Press: `src/simulation/press/desk.ts:1481 pressDeskSweepHandler` (weekly), `:1576 sweepOutlet`, `:1700 outletCovers` (national = null jurisdiction / federal tag / `recordedScale ≥ 3`), `:1821 newsworthiness`, `:110-123` excluded prefixes incl. `world.` (:121), `:1260 recordProfessionalReaders` (knowledge only for subjects, colleagues, party contacts, law-effect residents).
- Outlets: `press/outlets.ts:452 ensurePressMediaOpening`, `:472` home state, `:564` home town only; `:497 ensurePressHomeCoverage` and `press/views.ts:447 ensurePressExposureCoverage` exist but have NO production caller.
- Reach: `src/simulation/living-world/official-views.ts:279 followsNewsClosely` (only used for vote knowledge), `law-exposure.ts:168 recordHeardExposure`, `src/simulation/neighbor-news.ts:58/:96`.
- Screens: `src/presentation/news-front-page.ts:118 projectNewsFrontPage` (every publication worldwide, no place filter); `src/presentation/world39-news.ts:97 projectWorld39News` ("Around here": home, home state, national); `src/simulation/press/read-publication.ts:13` (player read writes knowledge).
- Events that should be national news but are not: `nationwide-world/governor-succession.ts:108` writes `world.office-tenure` (excluded); state legislative actions from `state-governing.ts:3110 fileMemberAgendaBill` carry no scale tag; `office-consequence.ts:368-369` tags resignations `importance:*` (the model to follow).

## What to change

1. **One office-scope reader.** `playerOfficeScope(world, personId)` in `governing/office-consequence.ts` beside `officesHeldBy`: every held office with `{ officeKey, title, jurisdictionId, level: "town"|"county"|"state-legislature"|"state-executive"|"congress"|"federal-executive"|"judicial" }`, composed from the readers above. No second office store.
2. **What each level sees (the visibility table, data not code).** `data/game/economy-visibility.json`: rows by level → which projections mount and for which jurisdiction. Resident: personal money, home-town conditions (`EconomicContextPanel`, `PlaceConditions`), the local paper's budget stories. Town/county seat: that government's `projectBudgetEconomy` plus fiscal notes on its bills. Mayor/county executive: plus program lines and `ModeledAccountHistory`. State legislator: state budget and state bill fiscal notes. Governor: plus state series from `projectMacroConditions`. Congress/President: federal budget from `federal-treasury` by `federal-budget-categories`, national macro series. Several offices = the union. `BudgetEconomyWorkspace` and the Budget tab read this table through `playerOfficeScope`; replace the data-availability-only gate at `PlayerGame.tsx:3311-3326`. Implement the federal scope in `projectBudgetEconomy` (remove the "not part of this game yet" note).
3. **Coverage follows the player.** Call `ensurePressHomeCoverage` when an office is taken (`office-transition.ts`) and `ensurePressExposureCoverage` when the player attends a public event out of state, so a state paper exists wherever the player has standing. No outlets for every state up front.
4. **Big stories from elsewhere become national.** Producers write a scale tag from their own records (people affected, office level, money moved), following `office-consequence.ts:368`: state enactments (`recordEnactment`), governor changes (publish a public `office.governor-changed` event alongside the excluded `world.office-tenure`), state supreme court rulings, disasters (already `magnitude:`). `outletCovers` keeps its `recordedScale ≥ NATIONAL_REACH_SCALE` rule; no new threshold.
5. **The News screen shows what reaches you.** `projectNewsFrontPage` takes the player and filters to outlets the player reads (national + home state + home town + states from part 3), using a new `newsHabitOf(world, personId)` reader (age, interests, temperament, job; replaces `followsNewsClosely` and serves it). Front page: national lead by default (Session 3's "interesting national news" item), state and local sections below. Other places' stories appear only through those outlets.
6. **Reach for people, only where it matters.** When a story publishes, write knowledge (via `recordEventKnowledge`) for readers whose `newsHabitOf` includes that outlet AND who are simulated person-by-person (the player's town and county) or are officials whose institution the story concerns. Everyone else is reached as modeled groups when their next scheduled update reads the week's stories. Word of mouth uses Q2 part 4 `recordEventNews`.

## Must NOT build

- A second budget or economy model, or fake numbers for levels the game does not model.
- Outlets for all 56 places at opening, a daily news tick, or per-person knowledge writes for the whole country.
- Random story selection or a fixed share of readers.
- Hard-coded office checks scattered in components (one table, one reader).
- Other towns' council meetings (dependency below), the newspaper's visual design (Session 3), or the daily edition (Q3 part 1).

## Done when (proof in a played game)

- Random place: as a resident, the Money screen shows personal money and town conditions only; no state or federal budget tab. Win the council seat (or Custom Start into it): the town budget screen appears with fiscal notes. Custom Start as governor in another random state: state budget and state economy series. As President: federal budget categories and national series.
- Run 12 months: the national front page carries at least one story from another state chosen by recorded scale (e.g. a governor change or a major enactment); the home-state paper carries home-state legislature stories; no small-town story from another state appears unless its scale reached national.
- Tests: `player-office-scope.test.ts` (each level returns jurisdiction + level); `economy-visibility.test.ts` (table drives mounts; union for two offices); `news-front-page.reach.test.ts` (filtered by the player's outlets); `outlet-covers.scale.test.ts` (governor change from another state reaches national; a routine one does not); loops all 50 states + DC + territories for office scope.

## Depends on

- Session 3 (Money, Office, News screens' look); Session 23 part 4 (budget desk inside `BudgetEconomyWorkspace`), coordinate on the file.
- Q3 part 1 (daily edition), Q2 part 4 (big events travel by word of mouth).
- Other towns meeting on their real schedule: `local-council-meetings.ts:346 seatedCouncil` and `:385 ensureLocalCouncilMeetings` are player-town only; making them jurisdiction-keyed belongs with Q7 part 2 (every town seated). Until then other-town council news cannot exist.

## Open questions for the owner

- Can an ordinary resident still dig into the full public budget of their town or state if they go looking (it is a public record), or is it hidden until they hold office? (a) The screen shows only what the office makes your business, but a "look it up" route opens the full public budget; (b) hidden until you hold an office over it; (c) residents see a one-page summary, office holders the full screen.
