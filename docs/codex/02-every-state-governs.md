# Job 02: every state governs, and Congress votes from principles

## Why

Lamontae wants all 56 places working together. Measured on September 29 (Build 12, watched runs in Belfast, Maine and Catawba County, North Carolina): only the played state's legislature passed state laws; the other 55 passed nothing in five years. Build 8's nationwide legislation work (merged 1:18 p.m. September 29) makes every legislature's members file bills, so part of this may already work. Measure it first.

Separately, Congress passes and repeals nearly everything by about 356 to 76, because officeholders' principles are a seeded draw instead of coming from their lives and party.

## Part A: find where state bills stop, and fix it

1. Run a 5-year watched world in a random place, with the place and seed named. For every state, count the bills in each of these states:
   - filed;
   - heard in committee;
   - passed by each chamber;
   - on the governor's desk;
   - signed, vetoed or lapsed;
   - in force.

   Put the table in the hand-back.

2. The path to read:
   - `governingSeasonHandler` in `src/simulation/governing/state-governing.ts` (the bill season for each governorship);
   - `fileLegislatureMeasure` and `fileMemberAgendaBill` in `src/simulation/governing/member-agenda.ts`;
   - the legislative clock (`COMMITTEE_HEARING_TRANSITION_KEY` in `src/simulation/legislation.ts`, `scheduleInstitutionStep`);
   - the governor's desk (`evaluateGovernorBill` in `governor-bill-decision.ts`).

   Also check whether seated members of non-played legislatures have principles (`ensureOfficeholderPrinciples`) and whether institution steps run outside the played jurisdiction.

3. Fix the step where bills stop, with one rule for every state. Check the result against real session output: laws enacted per state per year, from the National Conference of State Legislatures or a similar source, researched once for all 56 places. Every state should land in a realistic range.

## Part B: Congress and every legislature vote from principles

Build 24 left this work as a patch that Codex can't reach; this describes it so you can redo it:

- In `src/simulation/governing/officeholder-principles.ts`, `ensureOfficeholderPrinciples` calls `formPrinciplesFromLife(world, ids, { officeholders: true })` and drops the seeded draw (2 dice lines).
- In `src/simulation/principles-from-life.ts`, the `seatedOfficeholder` skip honors that option.
- Result Build 24 measured: the top-rate tax bill passed the House 221 to 211 on party lines (real 1993: 218 to 216), against 356 to 76 without it.
- Update the seven tests that fail with it:
  - congress-lawmaking (2);
  - article-v (2);
  - officeholder-principles ("draws principles");
  - generated-member-reflection-route;
  - npc-amendments.

The same pull request must also carry:

1. **The majority's agenda.**
   - `fileCongressBill` in `congress-lawmaking.ts` picks its sponsor by a seeded draw, and `fileMemberAgendaBill` shuffles members. Replace both. Each majority member brings their best bill. Bring up the bill backed by more than half the majority and by a chamber majority, sponsored by the member who presses hardest. File nothing when no bill qualifies.
   - In `gatherCosponsors`, replace the one-in-ten cross-party draw with principles.
   - In `chamber-votes.ts`, `partyCue` reads only the sponsor's party.
2. **Senate reconciliation and unanimous consent.** A budget reconciliation bill passes the Senate on a simple majority, with the Byrd rule limiting it to budget matters. Ordinary bills face cloture at 60. Routine measures pass by unanimous consent unless a senator objects from their principles.
3. **Midterms that can unseat incumbents.** `src/simulation/national-mood.ts` applies the mean midterm shift, 3.6 points, to every midterm. Make the shift read the President's approval and the economy, on a sliding scale. The real range runs from 9.0 points against the President's party (2010) to 2.3 points for it (2002).
4. **Seat leans that match real legislatures.** Vermont came out 163 D and 17 R, against a real 87 D and 56 R. Seat shares track the state's presidential vote too closely. Calibrate the spread of seat leans per chamber against real 2024 compositions for all 50 states.

## Checks

- Measure in a trifecta state and a split state, 5 years each, in random places. Report:
  - laws by Congress, the state and the council, each against a real count;
  - one partisan House vote near party lines;
  - one reconciliation bill passing the Senate on a simple majority.
- `npm run zero-dice` must show fewer allowed lines.
- The speed budget in `README.md` applies.
- Run the tests for the changed files.
