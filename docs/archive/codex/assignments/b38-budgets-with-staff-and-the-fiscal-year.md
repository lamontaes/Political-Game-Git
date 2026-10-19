# Budgets with staff and the fiscal year (bank id b38, phase P4 every office, unlocks the governor, mayor and President budget season)

Verified against origin/main 40d67708d (Oct 6). Extends Session 23 part 4 (budget desk with dollars per program family), b17 (priorities drive the desk), b22 (economy by office), b27, AU-09 (opening money).

## What the player experiences

You are the governor in the weeks before the budget is due. The budget director comes to your office as a person with a view of her own: she has read every agency's request, tells you which two ran over, and says she thinks the road fund is the one the legislature will not cut. Your transportation secretary wants the opposite. You set your priorities, trim a request or leave it, and send the proposal on the day your state's calendar says. Then the legislature does what it does: the finance chairs cut some of it, add their own items, and the appropriation that arrives differs from what you sent. Both sit on your desk side by side, in dollars.

If the new fiscal year starts with no budget, what happens is what your place's rules say: some states keep spending at last year's level, some close offices, a city may run on twelfths of last year. You see the real consequence at the real date: the clinic that stops seeing patients, the county that pays late. In a bad revenue year the staff bring you the shortfall in March and the choices (a hiring freeze, cuts across the board, the rainy-day fund). The mayor does the same with the finance director and the council; the President does it with the Budget Office director and Congress, where a stopgap can be passed or not. Going line by line is optional: most players set priorities and accept the staff's package.

## Owner decisions it rests on

- Register (Politics scope): "Budgets and foreign policy are in scope. As governor or president the player sets priorities and lives with the results, with advice from staff; going line by line, or anything in between, is optional depth."
- Register (executive emphasis): "The next executive emphasis is building a team/governing agenda, then budget negotiation, then crisis response. Project priorities can come from campaign contacts or advisers whose interests differ from constituents'."
- Register (OCD-LIFE-006 neighbor, charts): budgets are "inspectable graphically where actual data exists", distinguishing observations, drafts, forecasts and executed outcomes.
- Register (laws): "A passed bill first changes a concrete law, tax or budget record. Its effects... occur when that rule reaches them."
- Owner Oct 5 (via b17): a priority that only reorders budget options "is not acceptable. It must drive what the desk opens or be deleted."
- Fixed rules: zero dice; nothing blank or placeholder, estimate and mark it; one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind (23 executive, 20 outcome landing, 21 votes, 4 scenes/English); delete what you replace.

## Existing code to extend (VERIFIED on 40d67708d)

- Desk: `src/simulation/governing/state-governing.ts`: family "budget" in the matter union `:175`; options `:766-793` ("Put more into X" per program family, `BUDGET_FLAT` :704, no amounts); copy `:930-935`; staff default `:1337-1356` (takes the priority or flat, byline `chiefOfStaffFor :535`); summary `:1972-1980`; follow-up needs an enacted appropriation `:2931-2955`, else blocked "No enacted appropriation is linked" `:3185-3190`; season opens the matter `:3281-3295`; `currentPriority :1416` reads the agenda decision. The mayor's first budget matter opens at `:2548-2560`.
- Calendar: `governing/governing-calendar.ts:30 scheduleGoverningSeasons` (municipal submission date read from `primaryReading(...).budget.submissionDeadline` :40, but `national-packs.ts:395` says "NOT_READ" for most; state date from the session calendar's budget task). `presidentGoverningOffice :324` exists; no verified path schedules a budget season for the President (step 1 proves it).
- SECOND PATH (the main finding): the adopted budget is modeled automatically. `public-budgets/month.ts:1587 adoptNextYear` (basis "automatic", `store.ts:175 AdoptedBudget`, doc says "a budget passed as a bill comes later"; "PLACEHOLDER rule" in its docstring :1581) sets programs from last year's collections. Nothing reads the player's request or the legislature's appropriation into it. The request has no caller.
- Budget bill vote: `governing/budget-stakes.ts` (`budgetDeadlineConsideration`: offices close without a budget; `DEADLINE_DAYS = {30, 90}` :39 is a "GAME ASSUMPTION, hand-set"; fiscal year starts from `data/research/money/public-budget-bases.json`, 56 places, 36 annual and 20 biennial). `src/presentation/budget-bill-passes.test.ts` proves a budget bill passes.
- Mid-year: `month.ts:1434 decideShortfallOrder` (governor's principles pick cut-first or reserve-first), `:1499 decideLawMoneyReaction`, `store.ts:264 BudgetAdjustment` kinds (mid-year-cut, reserve-draw, deficit-borrowed). Cuts are across the board for every program except interest and pensions (`:1148`): the player is not asked. Kernel rows 92H-K-070..083 in `executive-governing-kernel-bank.ts` are all NEEDS_MECHANIC (instructions, late requests, revenue estimate, submission deadline, allotment reduction, transfer, supplemental).
- Shutdown: no code or data for continuing resolution, lapse or no-budget rules exists (grep: none). Federal: `public-budgets/federal-treasury.ts:315 settleFederalTreasuryMonth`, 13 lines in `federal-budget-categories.ts:13`; laws sized there (see AU-03).
- Reads: `fiscal.ts:131 budgetLawReading` (balanced, reserve, pension rules); `reserve-rule.ts` (state-reserve-rules.json); `opening-government-accounts.ts:399`; `player/BudgetEconomyWorkspace.tsx` is read-only; `presentation/budget-economy.ts:43 projectBudgetEconomy`.
- Test helper: `tests/support/random-place.ts` (exists). Session 23 part 4 is the owner of the dollar-per-family desk: if unmerged, build around it through INTERFACES.md section 4.

## Build steps (one PR each)

1. **Calendar for every office, from data.** Per jurisdiction row: fiscal year start, annual or biennial, who submits, submission date, legislature's deadline, what happens with no budget (step 5). State rows start from `public-budget-bases.json`; fill missing local and federal rows from similar governments marked "ESTIMATED FROM AVERAGE". Make `scheduleGoverningSeasons` schedule a President season. Replaces: the `NOT_READ` submission gap for cities (use the estimate row), `DEADLINE_DAYS` as the only clock. Must not: a branch on office name.
2. **Staff as people with views.** The budget director or OMB director, finance director (mayor) and agency heads are seated through Session 23 part 3; each reads its own agency's request, principles and past budgets. Advice is a record (what they recommend, why, what they will do if overruled) that feeds the desk. Files: `state-governing.ts` budget cases; new `governing/budget-advice.ts`. Replaces: the default at `:1337-1356` that just echoes the priority. Must not: a recommendation score or authored advice text; lines come from `composeGroundedLine`.
3. **Agency requests arrive.** Each agency (a program family from `PROGRAM_FAMILIES`) files a request from its last appropriation, its recorded needs, and laws in force that add duties; some run over the instruction. The player sees requests in dollars, can trim or raise any (line by line, optional) or accept the director's package. Priorities from b17 decide which requests the desk opens first and which the director defends. Replaces: the dollarless options `:766-793`.
4. **The proposal and the one budget record.** Sending the proposal files a budget bill (the existing budget-bill path) carrying the amounts; the legislature's version (its own amendments through the b32 engine, votes by Session 21) becomes the appropriation. Then `adoptNextYear` reads the enacted appropriation as the adopted budget; automatic adoption stays only for governments with no player and no filed bill, and marks its basis. Replaces: the "PLACEHOLDER rule" planning in `adoptNextYear`, and the hand request that had no reader. Must not: two adopted-budget writers.
5. **No budget in force.** One rule row per jurisdiction: `onNoBudget` = continue at last year's level | continue by twelfths | stopgap needed | offices close | partial closure of non-essential services, with the legal basis. The month settler reads it on the first day without an appropriation and writes real consequences (programs unpaid, offices closed, staff unpaid, back pay) through Session 20 landing. A stopgap is a bill the same engine votes. Replaces: the single "offices close" assumption in `budget-stakes.ts`.
6. **Mid-year shortfall asks the executive.** When collections fall short, staff report the gap and the options the place's rules allow (allotment cut across the board, targeted cut, reserve draw, special session). The player decides at the desk; computer-run executives decide through `decideShortfallOrder`. Cuts land per program, not only across the board. Replaces: the unconditional across-the-board cut at `month.ts:1148` for places where the executive has the power (rule row); keep it where law forces it.
7. **Desk and press.** `BudgetEconomyWorkspace` shows request, proposal, appropriation and spending side by side for the player's office (b22 gates by office); the paper reports what you proposed and what passed (Session 3). People who lost funding react through b06/b07 records.
8. **All places.** Governor, mayor and President flows run in a random state, a random city, D.C. and a territory (AS/MP use the estimate rule).

## Must NOT build

A second budget model or ledger; a budget "score" or support meter; dice or a percent chance a budget passes; authored advice or speech lines; line-by-line as required; a fixed shutdown default for every place; a place-specific scenario (no Kentucky, no named state); a new vote function; another adopted-budget writer; a daily tick.

## Research tables

In repo: `data/research/money/public-budget-bases.json` (fiscal year start, annual/biennial for 56 places), `government-budgets-2026.json` (federal fiscal year), `state-reserve-rules.json`, `state-local-finances-2022.json`, `data/source/municipal-governance` (budget procedure cells, many unread). Missing, one search each, 10 minutes max, never invent: (1) what happens with no budget by state (NCSL "State Government Shutdowns", NASBO Budget Processes in the States table on shutdown/continuing authority); (2) governor submission deadlines and legislature deadlines by state (NASBO); (3) mid-year cut powers: governor allotment authority by state (NASBO table on executive reduction power); (4) federal: Antideficiency Act and the OMB Circular A-11 calendar (omb.gov; one summary table); (5) a sample of city budget calendars by size class (GFOA; representative sample then drift). Estimate basis wording in data only: "ESTIMATED FROM AVERAGE: <size class> cities in <state>".

## Done when (played-game proof)

- New game in a random state (`tests/support/random-place.ts`), player governor: the director names two agencies over target; the player sets a priority, trims one request, sends the proposal on the place's date; the appropriation differs and both show in dollars on the desk; the next year's budget in the books equals the enacted appropriation, not the automatic one.
- Same year with no passed budget: the place's own rule plays (continue, twelfths, or closures) with dated records and visible consequences; a stopgap bill resolves it. A March shortfall brings the staff's options and the player's choice, recorded with the director's advice.
- Same flow for a mayor in a random town (finance director, council vote) and the President (OMB director, Congress, stopgap), and in a D.C./territory place on estimated rows. Same save, same answers.
- Tests: `budget-calendar-all-places.test.ts` (56 places, no null, estimates flagged), `budget-advice-staff.test.ts`, `budget-request-to-appropriation.test.ts` (adopted budget equals enacted), `no-budget-rule.test.ts` (each rule kind), `mid-year-shortfall-choice.test.ts`, `budget-no-second-writer.test.ts` (grep: one adopted-budget writer), updated `budget-bill-passes.test.ts`.

## Proof to post

Per step: the random place and seed, the printed calendar row, the director's advice record with ids, request/proposal/appropriation in dollars, the no-budget day log, the shortfall options list, the delete list for each "Replaces:", `npm run typecheck` and changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."

Resume marker: "Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body."

Open owner questions: how much of the line-by-line desk is on by default (Session 23 part 4 decides; none blocking). Switches kept: `onNoBudget` per-jurisdiction rule row (add or change a row); whether a place lets the executive cut targeted or only across the board = one `executiveReductionPower` field per row; the advice depth shown (package only | by agency | by line) = one setting, default by agency. If Session 23 parts 3-4 have not landed, build steps 1, 4, 5, 6 and stub the desk and seating through INTERFACES.md section 4.
