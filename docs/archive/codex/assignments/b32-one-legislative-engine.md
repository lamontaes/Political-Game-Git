# One legislative engine: council, state legislature and Congress through the same machinery, and every rule changeable by law (bank id b32, Session 56)

Phase "Governing" · Unlocks the same play at every level, and the sentence "anything a government can change, a law can change". Sister banks: one executive engine (Session 23), one court engine (Session 42). Code checked at origin/main 2e7ac6cef (Oct 6).

## What the player experiences

Whether you sit on a city council, a statehouse or in Congress, a bill moves the same way: introduced, referred, committee, floor, other chamber, executive desk, override. Only the data differs (how many seats, what vote it takes, which committees, how long the session). And those data are not fixed: a law can make the council bigger, move the primary date, set the retirement age for judges, raise the office's pay, add term limits, raise the age to run, or change the number of justices, subject to the real rule for who may do it (a city cannot amend a state constitution) and to the real resistance people feel. The new rule takes effect on its date and everyone's records, votes and campaigns follow it.

## Owner decisions it rests on

- Register (Supreme Court, "Hard things are hard for real reasons"): "The size of the Supreme Court changes by ordinary law... The game should model why people resist, and someone may still pack the court or change it to four, eight or fourteen."
- Register: measures are introduced and resolved "under each level's actual authority; a city cannot amend a constitution"; one law system, laws as data rows, one engine per domain, level-generic (Sept 30).
- Owner: emergent, not authored; zero dice; one rule for all 50 states, D.C. and territories; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- Shared already: vote engine `governing/chamber-votes.ts:840 decideChamberVote` (council `governing/council-lawmaking.ts:77 decideCouncilVote` calls it at :92; `municipal-ordinance-procedure.ts:348`, `dc-council-sittings.ts:226`, governor and court appointment callers); one stepper `governing/legislative-clock.ts:643 applyInstitutionStep`, `:1230 scheduleInstitutionStep`, `:1284 createInstitutionStepHandler`, `:340 legislativeBlueprintForMeasure`.
- Still per level: Congress `governing/congress-lawmaking.ts:224 congressSittingHandler`, `governing/congress-chambers.ts:151 congressBlueprint`, `:273 scheduleCongressSitting`; council `living-world/local-council-meetings.ts:534 localCouncilMeetingHandler` and `municipal-ordinance-procedure.ts:329 decideOrdinaryCouncilReading`; state `governing/state-governing.ts:2321 decideGoverningMatter` plus `nationwide-world/state-legislature-queue.ts`; DC `dc-council-sittings.ts`.
- Per-level data: `legislature-rules.ts:365 ChamberRule` (seats, quorum, referral, committees, floor stages, amendments; also `ConferenceRule :424`, `ExecutiveRule :483`, `EnactmentRule :500`, `SessionRule :516`; `unknownRule :99` marks unresolved values), `legislature-rule-packs.ts` (2,710 lines, `rulePackById`), `legislature-game-profile.ts:443 legislatureProfileFor`.
- Changeable by law (the one path): `enacted-rule-changes.ts:72 AMENDABLE_RULE_FIELDS` (body.seats, term.years, qualification.minimumAge and residence years, executive.term.years, executive.term.limit, court.seats, pay.governor, pay.stateLegislator, pay.trialJudge, nomination.primary.dateRule, nomination.method, senate.selection, minimum wage, recall doctrine), `:269 NOT_YET_AMENDABLE_RULE_FIELDS` (term.start, term.expiry, election.date and cycle, institution.form, local ordinance passage and effective rules, appropriation votes: "charter changes are not routed here yet"), `:978 fileRuleChangeProvision`, `:1075 enactedRuleChanges`, `:1251 ruleValueInWorld`, `:506 institutionRuleAmountUnit`; consumers `governing/court-size-law.ts:72 applyEnactedCourtSizes`, `office-pay.ts`, `candidacy.ts` (age), `nominations/nomination-rules.ts`.
- Second path for the same kind of thing (to merge): `living-world/local-council-term-limits.ts` reads a policy question through `lawInForce` and hard-codes "two consecutive full terms" (comment: ESTIMATED FROM AVERAGE); `living-world/federal-reform.ts:323 termLimitCount` and `:693 proposeAndVote` (Article V flow).
- Newer code covering part: Session 23 executive engine and Session 42 court engine are in other briefs; read `docs/codex/assignments/INTERFACES.md` section 4 before touching executive or court seams.

## Build steps (one PR each)

1. **Audit first, post it.** Table: for council, county, state, D.C., Congress: which of the 10 steps (introduce, refer, committee, floor, other chamber, conference, desk, override, effective date, session calendar) go through `applyInstitutionStep` and which have their own code. List every duplicate.
2. **One sitting handler.** Merge `congressSittingHandler`, `localCouncilMeetingHandler`, `dc-council-sittings` and state sittings into one `legislativeSittingHandler(level, body)` whose only inputs are the body's `ChamberRule`/`SessionRule` rows. `Replaces:` the four handlers (delete after parity tests pass). Must not: a branch on level name inside the handler.
3. **Per-level rows complete, nothing unknown.** Every council, county, state, D.C. and Congress body has a full row set. Where `unknownRule` is present, fill from similar bodies (same state's other cities, same size class, same chamber type) and mark estimated in data (council size, quorum, vote needed, committees, session calendar).
4. **Every field amendable.** Extend `AMENDABLE_RULE_FIELDS` to chamber rules: quorum, vote thresholds, committee count, chair selection, override threshold, session calendar; to court retirement age and judge terms; to office pay for every office (not just three); to term limits for every elected office (legislative too) through one `term.limit` field; to age limits for every office through the existing `qualification.minimumAge`; to the primary calendar (delete the NOT_YET entries for `election.date`/`election.cycle` by building the state calendar rows the reason says are missing). Each field is a data row with min/max, who may change it (level and instrument: statute, charter, constitution) and the date it takes effect.
5. **Who may change it, as data.** One table `ruleChangeAuthority`: field x level -> allowed instruments (a council changes its own size only if its charter or state law allows; a state changes its legislature by constitution or statute as the real state does; Congress changes court size by statute). A law aimed at a forbidden field is refused with the reason, never recorded.
6. **Resistance and consequence from people.** Members and voters decide a rule change through the one vote engine with their own principles, memory of earlier attempts (the 1869 act, 1937 backlash as history rows for the court), and who gains (seats, pay, advantage): no reluctance stat. After it takes effect, the clock, candidacy, nominations and pay readers pick it up via `ruleValueInWorld`.
7. **Retire the second paths.** Move council term limits and the federal term-limit flow onto `term.limit` and delete the hard-coded two-term default (default becomes the body's own row, estimated). Keep Article V as the instrument for constitutional changes only.
8. **All places.** Test loops 50 states, D.C. and territories: each body has full rows; a rule change of each field kind works in a sample city, state and Congress.

## Must not build

A fourth engine; level-name branches; a hard-coded cap or constant for any changeable rule; a reluctance or "difficulty" number for court packing; a separate council vote function; authored reform events; charter or constitution text generation; per-state code.

## Research tables

In repo: rule packs, bill-samples, municipal governance (`data/source/municipal-governance`), `constitutional-process`, `book-of-the-states`, `office-pay-updates`, `judiciary-calibration`. One search each, 10 minutes, never invent: who may change legislature size/term limits in each state (Book of the States, NCSL: initiative vs legislature vs charter); state primary calendars by year (secretary of state / NCSL); typical council quorum and vote rules by size class (National League of Cities / state municipal codes: representative sample, then drift). Estimate basis: "ESTIMATED FROM AVERAGE: <size class> councils in <state>", data only.

## Done when (played-game proof)

Random place with a council, then the same player in the statehouse and in Congress (test harness may jump the office): one bill moves identically through the steps at each level, with only the data differing. In the council, pass an ordinance raising council seats within what the state allows and one imposing a term limit; both take effect on their dates (next election seats, next term eligibility). In a state, change the primary date and a pay level. In Congress, pass a court-size law: the new seats exist and are filled through the court engine. A forbidden attempt (city amends state constitution) is refused with the reason. Tests: `legislative-engine-parity.test.ts` (3 levels, 3 random places), `rule-change-all-fields.test.ts`, `rule-change-authority.test.ts`, `chamber-rows-no-unknown.test.ts` (all places), updated `enacted-rule-changes` and `court-size-law` tests; grep test that the four old sitting handlers are gone and no `termLimit` default constant remains.

## Proof to post

`docs/codex/evidence/b32-one-legislative-engine/`: the step 1 audit before and after, printed step logs of one bill at each level, rule values before/after each law with the record ids and effective dates, the refusal text, `npm run typecheck` and changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."
Open owner questions: none blocking. Switches kept: the list of amendable fields = `AMENDABLE_RULE_FIELDS` (add a row to make one changeable); who may change a field = the `ruleChangeAuthority` table; the default body row when a body is unrecorded = one function `bodyRowFor(body)` choosing the nearest similar body (change the similarity order there). If Session 23 or 42 has not landed, build steps 1-5 and 8 and call their seams through the INTERFACES.md stubs.
