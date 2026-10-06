# County and city executives as played desks: county executive, commission chair, city manager, strong and weak mayor, school board (bank id b49, phase P4, G139, unlocks every local executive in all 50 states, D.C. and the territories through the one executive engine)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are the county executive of a county you have never visited. Monday morning your desk shows the commission's ordinance waiting for your signature, the budget request due before the fiscal year, and an open seat on the county library board. You pick from real people in your county's circle, the commission confirms, and you hear which members argued about it. In a neighbouring city where the player is the council-manager city manager instead, there is no veto and no signing: you propose the budget, hire the department heads, and the council tells you what it will and will not fund. A different player is a strong mayor in a big city and signs, returns or vetoes. A weak mayor chairs the meeting and votes with the council. Same desk, same words, powers read from that place's own form of government. If a player's county has a commission chair who is only first among equals, the desk says so and shows the votes needed.

## Owner decisions it rests on

- Register, "Politics scope": "Every office listed is in scope: town council, mayor, county, state legislature, governor, U.S. House, Senate, President, appointed posts, party roles and judge. In office the player does all of it: bills, negotiation, administration, budgets, press, constituents and campaigns."
- Register, "Schools and colleges" (Oct 5): "School boards exist in the world; whether a player can serve on one is undecided."
- Register, AUDIT-RETURN-2 (Sept 21), older wording: "School boards and special districts are deferred, including D.C. school boards."
- Register, AUDIT-RETURN-2: "Immediate breadth: all 50 states and applicable municipalities, counties/county-equivalents and town/township governments; D.C. separately with its actual distinct role structure... Shared modules plus material modifiers, not 50 independent engines".
- Register, AUDIT-RETURN-2 item 1: "defining state/local structures, terms, limits, veto arrangements and government forms should usually begin close to the contemporary baseline."
- Session 23 brief: "as governor or president you have real work: a desk with bills, budgets and appointments." One executive engine per level.
- Fixed rules: zero dice; nothing blank (estimate and mark it); one rule for every place; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- Form of government is already data: `src/source/domains/municipal-governance/types.ts:42-52` (`GovernmentForm`: MAYOR_COUNCIL, COUNCIL_MANAGER, COMMISSION_MANAGER, COMMISSION, consolidated forms, TOWN_MEETING). `src/simulation/executive-authority-game-profile.ts:548 municipalExecutivePowerProfile` turns the form into `model` "strong-mayor" / "weak-mayor" / "shared-executive" (:44, :585-595) with four powers (appoints and directs department heads, proposes budget, vetoes), each marked read or "estimated" (:41-60). Its own note says the model is estimated from the form.
- Chief official rules: `nationwide-world/local-chief-executive-rules.ts:141 localChiefExecutiveRules` (direct election, title, term; ICMA 2018 averages marked "typical"; owner interim rule for cities above 100,000 at :64).
- Counties: `nationwide-world/county-governing-body-rules.ts:145 countyGoverningBodyRules` (seats, body name, optional `chiefTitle` :38, :109) read from `data/research/local-government/county-governing-bodies.json`; `town-council-profile.ts:112` falls back to the title "County executive" or "Board chair" by unit type. Townships: `township-governing-bodies.json`. D.C.: `state-executive-governments.json` (Mayor acts through the state-level office; `municipal-ordinance-procedure.ts:764 municipalExecutiveHolder`).
- Executive holder and council act: `municipal-ordinance-procedure.ts:764 municipalExecutiveHolder` finds only a seat with role "mayor" (:781); no county executive, chair or manager holder exists. Mayor's act on council measures `:977 actOnCouncilMeasure`, override `:1106`.
- Manager appointment: `municipal-public-work.ts:1406 appointMunicipalManager` (council vote; Charlottesville charter reading) surfaced at `presentation/municipal-governing.ts:110-156, :272`.
- Shared engine to join (Session 23): `governing/state-governing.ts:306 currentGoverningOffices` and `:398 governingOfficeForPerson` (governors and President only; mayors are not offices); `governor-bill-decision.ts:386 evaluateGovernorBill`; `executive-work-entry.ts:348`.
- Does NOT exist on main: grep finds no county executive, commission chair or city manager as a governing office or desk; no council-manager "no veto" path in the desk; `GovernmentUnitType` is only "county" | "municipality" | "township" (`government-units.ts:33`), so there is no school district unit; "school-board" appears only as a doc example at `types.ts:3791`; `data/source/school-finances/` holds Census system finances (14,077 systems) but no board rows or seats.

## Build steps (one PR each, in this order)

1. **One local government-form table.** One reader (`src/simulation/local-executive-form.ts`) returns, for any city, town, township or county, its form, who is chief, powers, and each fact marked read or ESTIMATED FROM AVERAGE, built from the rows above plus Census of Governments style rows. Files: new reader; `executive-authority-game-profile.ts`, `local-chief-executive-rules.ts`, `town-council-profile.ts` call it. Replaces: the separate form-to-model branch at `executive-authority-game-profile.ts:555-595` and the "County executive"/"Board chair" fallback at `town-council-profile.ts:112`. Must not: add a second source of truth for form.
2. **Local executives join the shared governing offices.** Mayor, county executive and commission chair become `GoverningOffice` through `currentGoverningOffices` and `governingOfficeForPerson`; `municipalExecutiveHolder` widens to counties. This is Session 23 steps 1-2; check its PRs and take only the county and manager rows. Done when a player county executive sees budget and agenda matters in the same briefing a mayor does.
3. **Powers come from the form, so the desk differs.** Strong mayor and county executive: sign, return, veto, override window from the shared `executiveBillActionWindow`. Council-manager and commission-chair: no veto; the desk shows what the manager can do (propose budget, hire and direct department heads). Weak mayor: presides, votes, signs only what the form says. Replaces: the municipal-only `mayoralActionWindow` copies once Session 23 step 2 lands.
4. **Appointments through b37.** Manager hire, county boards and department heads use b37's one appointment flow; the commission or council confirmation is the existing vote. This doc only supplies which offices each form fills.
5. **Budget through b38.** The county or city budget request is the b38 desk with the local fiscal year and the form's rule on who proposes; the legislature (commission or council) appropriates through b05's meeting.
6. **City manager as a player career.** A player hired by the council holds office with no election, serves at the council's pleasure, can be fired by a council vote, and the vacancy re-enters step 4. Replaces: the NPC-only manager path in `municipal-governing.ts` for a player holder.
7. **School board as data, behind one switch.** Add `data/content/school-board-play.json` with one row `{ "playerMaySit": false }`. School boards stay in the simulation (taxes, Census system finances). If the owner says yes, a district becomes a government unit using the same council engine (b05, b32) and step 1 table, with seats ESTIMATED FROM AVERAGE until researched. Until then no school board seat is offered to the player.

## Must NOT build

A second executive engine or a county-only desk; a new bill-decision or vote function (b32, Session 23); mayor veto duplicates once shared ones serve; council meetings (b05); appointments flow (b37); budget mechanics (b38); executive orders (b17); courts and judges (b13, b39); filing and primaries (b34); per-place scripts or authored forms; dice for anything; a school board before the owner rules; special districts (deferred by the owner).

## Research tables

Repo data first (all verified to exist): `data/research/local-government/county-governing-bodies.json`, `township-governing-bodies.json`, `council-election-methods.json`, `state-executive-governments.json`; `src/source/domains/municipal-governance/research-structure.json`; `data/source/municipal-governance/corpus.json`; `data/source/government-units/` (Census of Governments 2025); `data/municipal-elections/92O-national-state-baseline.json`; `data/source/school-finances/`. Missing, one search each, 10 minutes max, never invent: form of government for counties (executive-led, administrator, commission-only) by state or county; share of manager-led cities by size (ICMA); school board seat counts by state. Wording where unread: "ESTIMATED FROM AVERAGE: <form> governments of this size in <region>".

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`: the player holds that place's top local executive (mayor, manager or county executive, whichever the data says); the desk shows the powers the form gives, one ordinance, one budget request and one appointment, all through the shared engine, and the veto window or its absence is stated in plain words.
- Same flow in a territory place and D.C. (executive acts through the state-level office): one code path, different powers.
- Council-manager place: no veto button, manager can be fired by a council vote. Weak-mayor place: mayor votes with the council.
- Tests: `local-executive-form-all-places.test.ts` (every place has a form, nothing unknown, estimates marked), `county-executive-desk.test.ts`, `city-manager-career.test.ts`, `school-board-switch.test.ts` (row false: no seat offered; row true: same engine), grep test that the replaced form branch and the "Board chair" fallback are gone.

## Proof to post

PR comment per step: random place and seed, printed form row with read or estimated marks, the desk screenshot, record lines for the act, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) can the player serve on a school board (ROADMAP-GAPS G114; the register says undecided, an older Sept 21 line says deferred; logged on the docket as a question). Switch: one data row `playerMaySit` in `data/content/school-board-play.json`, default false. (2) whether a county with no elected executive gives the player the commission chair's desk by default; switch is the form table row for that county. If Session 23 has not landed, stub steps 2-3 through INTERFACES.md section 4; if b37, b38 or b05 has not landed, stub through their documented interfaces and build steps 1, 3, 6 and 7.
