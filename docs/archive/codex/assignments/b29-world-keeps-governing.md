# The world keeps governing: bills pass without the player, in every term, with real bill numbers (bank id b29, Session 53)

Phase "Living world" · Unlocks a country that still makes law in year 9, 20 and 40, not only the 4 years around the first President. Code checked at origin/main 2e7ac6cef (Oct 6).

## What the player experiences

Open the paper or the legislature page in any year: the statehouse and Congress have bills in motion that nobody in your office wrote, some pass, some die, some get vetoed. Numbers read like the real thing: "HB 1 (2027 Regular Session)" in most states, "AB 1" in California, "HF 1" and "SF 1" in Minnesota, "LB 1" in Nebraska, "H.R. 1" in the 120th Congress; each new session starts again at 1 (or at the state's real starting number, Washington's Senate at 5000). The same keeps happening after the first President's term ends and the player may be out of office or retired.

## Owner decisions it rests on

- OCD-LEG-NUM-001 (Sept 27): "HB1 2026, right? Or whatever it's called in that jurisdiction": numbers restart every session, the session is part of the name, each place's own prefixes and chamber names, deterministic and saved.
- OCD-LEG-NUM-002 (Sept 27, 10:33 p.m.): where a state's recorded numbers begin above 1, each session starts there; same single path, starting number is data.
- Owner Oct 5 "no gating": governing after the first term is not held behind anything. Register: the entire world changes; emergent, not authored; zero dice; one rule for all places; one writer per record kind.

## Existing code to extend (verified)

- Numbering ALREADY EXISTS: `src/simulation/measure-numbering.ts:331 nextMeasureNumbering` (restart per session, per-state style, opening session starts partway), styles `bill-numbering-styles.ts:25,55,62,75` over `bill-numbering-styles.generated.ts` (from `data/research/bill-samples/state/*.json`, `data/research/bill-numbering-starts.json`), derivation `bill-numbering-derivation.ts:358 deriveStateBillNumberingStyle`. Callers: `governing/member-agenda.ts:646,823`, `living-world/local-council-meetings.ts:193`, `presentation/legislation-docket.ts:842`, `legislation-bundle-docket.ts:269`. The register entry still says "not built yet": it is built; this bank only closes gaps.
- Members file their own bills: `governing/member-agenda.ts:361 fileMemberAgendaBills`, `:1122 scheduleLocalMemberAgendaIntakes` (councils on their sitting calendar), `:1151` handler. Callers of `fileMemberAgendaBills` outside tests: `dc-council-sittings.ts:141`, `living-world/local-council-meetings.ts:235`, `governing/congress-lawmaking.ts:198 congressIntakeHandler` (Congress intake, reschedules itself via `:169 scheduleNextIntake`, sitting :224).
- States: `nationwide-world/state-legislature-queue.ts` (dated wakes with a `throughYear` horizon, `:40`, validated :239-275) and `state-legislature-turnover.ts:1429-1459` (planner loops `year <= throughYear`). Doc `docs/codex/state-legislature-queue-api.md`. No caller of `prepareStateLegislatureQueue` outside tests was found in `src` (grep): the horizon is whatever the caller passes. This is the likely reason governing stops.
- Votes: one engine `governing/chamber-votes.ts:840 decideChamberVote`; `governing/state-governing.ts:2321 decideGoverningMatter`; `governing/governor-bill-decision.ts:386 evaluateGovernorBill`.
- Newer code covering part: none found for state or Congress self-filing beyond the Congress intake above.
- Evidence of real volumes: `data/research/lawmaking-throughput/throughput-evidence.json` (README: introduced vs enacted, carryover, odd-year sessions such as Texas), `data/research/legislature/member-bill-limits-2026.json` (read by `governing/member-filing-caps.ts`).

## Build steps (one PR each)

1. **Audit first, post it.** Script (no game change) that runs 6 random new games to 2045 with no player action and prints per year: bills introduced, passed one chamber, enacted, vetoed, per level (council, 5 states, Congress). Find where each level stops (horizon, a scheduler that only reschedules while the player holds an office, a guard on `livingWorldEstablished`). Post the table.
2. **No horizon on governing.** Replace every fixed `throughYear`/end date with a rolling horizon: each wake schedules the next session's wake when it fires (as `congress-lawmaking.ts:169` already does). Delete the fixed-year caller arguments. Must not: a global "run until year N".
3. **Every level self-files.** State legislatures and Congress file member agenda bills each session through the same `fileMemberAgendaBills` (no second filer), volume from `member-bill-limits-2026.json` caps and `throughput-evidence.json` shares (introduced vs enacted ratios by jurisdiction group; estimate for states without a row from same-size same-region states, marked in data). Carryover bills in biennia stay alive (Kansas-style).
4. **Some pass on their own.** NPC bills move through the existing steps (`decideChamberVote`, governor decision, President desk) with members deciding from their own records; no pass percentage. Results land through the one law-effect path so the world changes.
5. **Numbering gaps.** Prove, per state, D.C. and territory: first bill of each new regular session is the state's first number (HB 1 / state start), special sessions number as that jurisdiction does (data row `specialSessionNumbering`, default: continues the same series in the same year, as most states do; estimated where unrecorded), the session label is in the name, chambers use real names (House of Delegates, Assembly, unicameral Nebraska LB). Fix any state the audit shows wrong from the bill-sample data, never by hand-typing a table.
6. **Surfaces.** The journal, news and legislature page read these records only; add nothing player-facing beyond showing the real number and session.

## Must not build

A second bill filer or numbering function; a pass-rate dice or percent; authored "background bills" lists; a stop year; per-state numbering code (all rows); player-only governing; a world-wide scheduled event that fires "after the first term".

## Research tables

In repo: bill samples (50 states), numbering starts, throughput evidence, member-bill limits. Missing numbers get one search, 10 minutes: special-session numbering convention per state (state legislature rules/NCSL); introduced-to-enacted ratios for states without a throughput row (state legislature session statistics pages); Congress enacted laws per Congress for the last 10 Congresses (congress.gov). Local = representative sample then drift. Estimate basis: "ESTIMATED FROM AVERAGE: <group> introduced/enacted ratio", data only.

## Done when (played-game proof)

Random place, player retires at the end of the first term. Run to year 12 with the player doing nothing: the statehouse and Congress each show new bills every session, a plausible share enacted, one veto, each with the real number and session ("HB 1" resets each session; a Washington Senate bill starts at 5000). Two states with different cycles (annual, biennial) and a territory show correct numbers. Tests: `world-keeps-governing-horizon.test.ts` (no level stops before 2060 across 6 seeds), `state-congress-self-filing.test.ts`, `bill-numbering-all-places.test.ts` (loops 50 states, D.C., territories: first number, prefix, session label, reset), grep test that no fixed-year governing horizon constant remains.

## Proof to post

`docs/codex/evidence/b29-world-keeps-governing/`: the step 1 audit table before and after, three printed bill lists across years with numbers and sessions, one NPC bill traced from filing to law with members' reasons, `npm run typecheck` and changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."
Open owner questions: none. Switches kept: the share of bills that members file per session = one data row per jurisdiction group read from the throughput evidence (changing it edits data only); special-session numbering = the `specialSessionNumbering` row; how far ahead the rolling wake schedules = one constant (default: next session only).
