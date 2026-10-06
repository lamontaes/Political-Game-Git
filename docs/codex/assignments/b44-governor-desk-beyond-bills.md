# The governor's desk beyond bills: clemency, the State of the State, special sessions, emergency declarations as played scenes (bank id b44, phase P4 gap G134, unlocks a governor with real work in all 56 jurisdictions)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are the governor of a state, and the desk is not only bills. In late autumn a letter comes from a woman serving a sentence: she is asking you to commute it. Her file shows the offense, how much time she has served, who spoke for her and who objects. Before you decide, the board your state requires (where it requires one) has already voted, and a prosecutor from her county asks for ten minutes. You decide from your own principles, and the people who care read it in the paper.

In January you walk into the chamber to give the State of the State. You choose what to press on from what is actually open in your state: a budget gap, a bill that died last session, a storm that took out a bridge. Members of both parties sit in rows and react from their own records. The press quotes whoever matters to them.

When a hurricane or flood is bearing down, your emergency manager says what the law lets you do and for how long. You declare, or you wait. Later the clock runs out and you renew, ask the legislature, or let it lapse. If the legislature is gone for the year and you need it back, you call a special session: the call names a date and, where the state limits it, a list of subjects. Members are sent for and the same floor scenes play.

## Owner decisions it rests on

- Register, politics scope: "In office the player does all of it: bills, negotiation, administration, budgets, press, constituents and campaigns."
- Register, budgets: "As governor or president the player sets priorities and lives with the results, with advice from staff; going line by line, or anything in between, is optional depth."
- Register, six-question revision: "Q4 governor/clemency is a good question."
- Register, "To flesh out and bring back for approval (not approved to build)": "Pardons and clemency." and "D-6 Pardons and redistricting." The pardon DESIGN has no approval quote on file; the clemency code already on main is built. Part 1 therefore only plays what main already decides, behind one switch.
- Register: "Special sessions number as that jurisdiction does."
- Register, weather: "Experienced severity and any emergency or disaster declaration are separate records; a declaration's area does not prove the town reached the highest tier."
- Register, "Important people everywhere": "they act when their institution acts: a session day, a hearing, a vote, a campaign event."
- No quote exists in the register or either owner-words file for a State of the State address; it follows from the opening order "your state's governor, legislature and current fights" and the emergent rule (never a scripted speech).
- Fixed rules: zero dice; nothing blank (estimate and mark it); one rule for all places; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- Clemency exists and is rich: `src/simulation/justice/clemency.ts` (`:379 fileClemencyPetition`, `:594 considerClemencyAfterSentence`, `:641 considerClemencyAfterExecutiveDesk`, `:883 advanceClemencyPetition`, `:1177 advanceClemency`), rules `justice/clemency-rules.ts:229 clemencyTable` (data `data/research/clemency/clemency-gates-2026.json`, 57 rows), reasoning `justice/clemency-reasoning.ts:310 evaluateClemency`, `:254 clemencyConsiderations`, records `justice/clemency-records.ts`. The desk matter: `governing/state-governing.ts:1666 openClemencyMatter`, family "clemency" (`GoverningMatterFamily` :164-171 per INTERFACES.md), decided at `:2343` and `:2671`. The only player surface is `src/player/LegalRecord.tsx` (a request on your own sentence) and the matter list. Nothing plays the request as a scene for the governor.
- `state-governing.ts:967` carries `// PLACEHOLDER: ... clemency: 60` days on the desk; `justice/clemency-reasoning.ts:49 CLEMENCY_CALENDAR_PLACEHOLDER` (120/365 days) is also marked placeholder.
- Rule data for the other three: `src/simulation/executive-authority-rules.ts:176 SpecialSessionAuthorityRule` (`executiveMayConvene`, `agendaLimitedToCall`), `:228 EmergencyDeclarationAuthorityRule` (`executiveMayDeclare`, `initialDurationDays`, `extension`, `legislativeTermination`). Packs: only the federal pack and 5 state packs exist in `executive-authority-rule-packs.ts` (KY :638, NE :785, AK :951, MN :1125, IL :1325); `executiveRulePackForJurisdiction :1493` reads `executive-authority-game-profile.ts`. b17 part 1 owns filling all 56.
- Kernel rows already name the gaps: `executive-governing-kernel-bank.ts` 92H-K-042 "Special session call and agenda restriction" (NEEDS_MECHANIC, blocked by "session/call record") and 92H-K-090 and following "Emergency declaration lifecycle" (NEEDS_MECHANIC).
- Federal disaster request only: `src/simulation/crisis/disaster.ts:686 decideStateDisasterRequest` (governor chooses request or decline, with a deadline). No state emergency declaration record exists (grep "emergency declar" finds rule data and kernels only). Incidents: `incidents.ts:485 incidentTransitionHandler`.
- Desk seams: `state-governing.ts:3370 governorDesk`, `:3401 executiveDesk`; `governing/legislative-clock.ts:415 ExecutiveDeskHandler`. The agenda matter exists (`state-governing.ts:735`, :1716 "first-year") but only picks a priority.
- Not on main: any address, State of the State or speech record (grep finds none, only a stray hit in `outcome-web` data and docs); `sessionCall` (grep finds only the b35 doc); any special-session or interim record (`legislative-procedure-world.ts:111` still says "nothing calls this legislature into a special session").
- Speech and press path to reuse: `presentation/english-composition.ts:215 composeGroundedLine`; `presentation/press-request.ts:184 composePressAnswer` and `speech-reception.ts` (named in b08 part 4).
- `tests/support/random-place.ts:16 drawRandomPlace` exists.

## Build steps (one PR each, in this order)

1. **Clemency as a played scene.** When a request reaches a player governor (or a board that the player sits on), open a scene instead of a bare matter: the petitioner's file (offense, time served, from `clemencyConsiderations`), the board's recorded vote where `clemencyTable` requires one, and the people who ask to be heard (victims, the prosecutor, a minister, a cellmate's family) chosen from records of people tied to the case. The decision still goes through `decideGoverningMatter` and `advanceClemencyPetition`; the scene only shows and records who spoke. Files: `state-governing.ts` (matter view), a new scene reader in `src/presentation/`. `Replaces:` the PLACEHOLDER 60 at `:967` and `CLEMENCY_CALENDAR_PLACEHOLDER` with a per-place deadline row in the clemency data, estimated and marked where no state sets one. Switch: `CLEMENCY_SCENE_ENABLED` (one constant, default on until the owner rules on D-6). Must not: change `evaluateClemency` or the gates.
2. **Special session call.** Add the one `sessionCall` record b35 part 7 defines (do not define a second); this part writes it from the governor's desk: a matter "call the legislature back" opens when a recorded condition exists (a died bill the governor cares about, a budget gap from b38 part 6, a ruling, an emergency), allowed only where `executiveMayConvene` is true; the call names dates and, where `agendaLimitedToCall` is true, a subject list taken from the open matters. The legislature's own leaders-call path stays b35's. `Replaces:` the refusal text at `legislative-procedure-world.ts:111` once b35 part 7 reads the record. Stub: if b35 part 7 has not landed, write the record through a local function with the same field names and delete it after.
3. **State of the State as a played address.** On the legislature's opening day (from b35 part 1 calendars) the governor's matter "address" opens. Options are built from what is actually open: unfinished desk matters, the budget request (b38 owns the number), vetoed or dead bills, a recorded crisis. The player picks up to a few; computer-run governors choose by the same ranking from their principles. Reactions: members, the press and named interest groups answer from their own records through b08 part 4's public-pressure path (reuse; add only the governor's statewide reach, as b17 part 8 does). Lines come from `composeGroundedLine` over facts; nothing authored. One writer: a new `addressRecord` (topics, date, audience) written once here.
4. **Emergency declaration as a scene.** b17 part 5 owns the emergency record, duration, extension and termination rules and the computer-run decision. This part adds the player scene on top of that record: staff brief what the rule data allows (days, who must approve an extension), the player declares or waits, and at the clock's end the renew, ask-legislature or lapse choice plays. `decideStateDisasterRequest` stays as is and reads the state declaration (b17). Stub the record read if b17 part 5 is unmerged.
5. **Desk inbox and calendar.** All four kinds show in Session 23's one inbox (its part 6) with deadlines; computer-run governors act on the same matters through `evaluateDecision` on their principles and a recorded condition. Nothing runs daily; matters open only when their condition or date arrives.

## Must NOT build

The bill desk, signing, veto, override or item veto (Session 23 `docs/codex/brief-session23-executive-track-2026-10-05.md` parts 2 and 5); appointments, confirmations and staff (b37); budget amounts and the fiscal year (b38); executive orders, the emergency record and rule data for all 56 places, enforcement directives (b17); the `sessionCall` record's definition and the legislature's leader calls (b35 part 7); the clemency rules or the reasoning function; vote-bargaining and public-pressure mechanics (b08); courts and sentencing (b13, b39); a scripted speech; a dice roll or percent for whether a petitioner is heard or a session is allowed; a second inbox.

## Research tables

Repo first: `data/research/clemency/clemency-gates-2026.json` (57 rows), `data/source/book-of-the-states/` (special-session calls, emergency powers if tabled), `data/source/fema-disasters/`, `data/source/constitutional-process/`, `data/research/legislative-procedure/`. Missing, one search each, 10 minutes max, never invent: per-place days a governor has to answer a clemency request (likely none set; then "ESTIMATED FROM AVERAGE: governor-decides states in this region"), per-place address custom and day (State of the State timing), state emergency duration and extension rules for the 50 places without a pack (b17 part 1 fills these; read its table, do not repeat the search).

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`, player seated as that state's governor: a clemency request opens as a scene with named speakers traced to records, and the decision leaves a record the petitioner and the paper both read; the opening-day address plays with topics drawn from open matters; a recorded storm lets the player declare, and the expiry plays; a special session is called with dates (and subjects where limited) and a bill moves in it.
- Same flow in a random territory place and D.C. (rules differ, or the power is absent and refused with the reason): one code path.
- Tests: `clemency-scene.test.ts` (3 random states, speakers are real records, no invented speaker), `state-of-the-state-address.test.ts`, `emergency-declaration-scene.test.ts`, `governor-special-session-call.test.ts` (refused where `executiveMayConvene` is false), plus a grep test that the two clemency PLACEHOLDER constants and the old refusal wording are gone.

## Proof to post

PR comment per step: random place and seed, the printed scene with record ids behind each speaker or topic, the sessionCall or address record, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) whether to play pardons at all before D-6 is approved; (2) how many topics the address covers. Switches kept: clemency scene = `CLEMENCY_SCENE_ENABLED`; address topics = one constant `ADDRESS_TOPICS_PLAYED` in the address reader (default: those that matter most to the player or the state's open matters); clemency deadline = one data row per place. If b35 part 7, b17 part 5 or Session 23 part 6 has not landed, stub through INTERFACES.md section 4 and the local functions named above, and delete the stubs when they land.
