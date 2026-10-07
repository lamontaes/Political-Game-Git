00n FABLE AUDIT BRIEF — Our Civic Duty code audit (written by the Opus CTO, Oct 7 2026, 6:10 p.m.)

WHO YOU ARE AND WHAT THE OWNER WANTS
You are Fable, running on the owner's other Claude account. The owner (Lamontae) designs Our Civic Duty, a political-life RPG (repo lamontaes/Political-Game-Git, public; TypeScript, React, Vite, Vitest). He asked for this, in his words: "review fable's audits (the interconnected one, the dupers, etc.) ... then compare it to the current assignments and code and then see how much fluff can be deleted, fixes for hardcoded or any other disallowed stuff, and the simulation system — is it linked? are things called? etc." Then: "everything you find out from this audit can be made its own Luna [agent task]." The work is done by Codex sessions on the Luna model; they work best with very specific instructions: exact files, exact steps, exact endpoints.

So your job has two outputs:
1. A plain-English results doc for the owner (OUT-1 below).
2. Detailed pool rows ("AU2-*") that Luna sessions can each finish in one PR (OUT-2 below).

You do NOT fix code yourself, do not merge anything, and do not open PRs other than the single rows PR in OUT-2.

TIME AND PROGRESS
- Budget: aim to finish in about 2–3 hours. A previous attempt by local helpers ran 2 hours and produced almost nothing because it tried to be exhaustive. Sample where a full pass is too slow, and SAY you sampled.
- Every 30 minutes write one line at the top of the LOG section of the Drive doc "00j CODEX DAY" (id 1ggMaxfWABEaO3MA3RSyELPwKGepkwLdCCrGMBaZK1ps), starting "FABLE AUDIT:" (what's done, what's next). Newest lines go at the top, right under the heading "LOG (newest first)".
- If you get stuck over 15 minutes on one part, write what you have for it and move to the next part.

SETUP
- One fresh clone of main: `git clone https://github.com/lamontaes/Political-Game-Git.git && cd Political-Game-Git && npm ci`. One clone only; never copy the repo again. Read-only analysis except the final rows branch in OUT-2.
- Also read: `git fetch origin assignments` then `git show origin/assignments:RULES.md`, `git show origin/assignments:TRAIT-SYSTEM.md` (the new general trait system spec), and `docs/codex/assignments/POOL.md` on main (the work pool; rows are table lines `| Row | Do exactly this | Source | Status | Owner |`).
- Also read the Drive doc "00m WORKER INSTRUCTIONS" (id 1lBz66mTa0tbR-KUCLkNo2SYCQCnfaDlz4rN7ZM2PR9I): it is how every Luna session works; your rows must fit it.

THE OWNER'S RULES (every finding is judged against these; every row must obey them)
R1. Every fix covers all 56 places (50 states, D.C., the territories) through ONE shared code path, with a test over all 56.
R2. NO hand-written player text: no sentence a player can read that a developer wrote (headings, explanations, reasons, summaries, fallbacks, sentence aria-labels, "how the game works" text, source citations, developer words). Allowed: record data values, approved control names (docs/ui/kit13/APPROVED-2026-10-04.md), English-engine output composed from records and mined phrase banks (data/english/parts/*.json). Removing hand-written text is always allowed and wanted.
R3. Nothing hardcoded: names, numbers, places, events, default people in code. Real data only as a starting point; estimates labeled with their source.
R4. No dice deciding outcomes: choices come from people's reasons (decision considerations), amounts from mechanisms. Seeded randomness that picks an outcome or sizes an effect counts as dice. ID generation and purely visual variety do not.
R5. American English only.
R6. Replacing UI: delete the old component, CSS and text in the same PR; never paste over it.
R7. Never weaken a test.
R8. Data, not code: one engine per domain plus data rows (one law system, one election engine for all levels, one trait system).

THE FOUR EARLIER AUDITS (your baselines)

(1) INTERCONNECTION / "EFFECTS" AUDIT — Fable, Oct 1. Google Doc "Effects audit — Fable — Oct 1", id 12UJkfMvHRCDQXxONcEU0aBBsDhuBcGtyV_fuvxK0g3g (read it). Findings then: 222 links between laws, outcomes, people and politics; 96 ran, 36 zero on purpose, 90 not running; only 7 computed outcomes reached a game system; opinions and votes never read a place outcome; effect sizes drawn per world (A127/A128) and outcomes drift by dice (A63); the pay and right-permission effect kinds were not registered; the tax kind never fired in play; a second cause-and-effect engine existed (src/simulation/causal-effects.ts, A129). Part 5 was a wiring plan by engine.
Merged since (verify): #3102 "Unify law effect kinds and retire causal-effects entrypoint", #3231 generated law consequence registry, Medicaid eligibility from opening and on effective date (#3074, #3091), state income/sales/property/payroll tax on the shared tax seam (#3022, #3032, #3277), rent stabilization terms (#3118), minimum sentences through shared consequences (#3090), monthly service receipts (#3193, #3282), state bill filing bar rescaled (#3073), per-state session calendars (#3098), county budget hearings and levy (#3033, #3053), mortality from opening (#3075), labor review at opening (#3072), events remembered (#3107), NPC contact routed through contact answers (#3089).

(2) REACHABILITY / "TENTACLES" — Fable, Oct 6. A static import trace from src/main.tsx over src/**/*.{ts,tsx,json}. Results then: 3,462 files; MAIN 1,571 (reachable from the game), OTHER-ENTRY 1,817 (reachable only from tests, scripts, or the developer html entries src/review.tsx and src/art-desk-entry.tsx), NOBODY 74. The script: `git show origin/assignments:audit/trace.mjs > trace.mjs` (change ROOT to your clone and OUT to a scratch folder). "Imported" is not "called": the deeper question is runtime wiring (below).

(3) DUPLICATES — CTO, Oct 7 morning. Full text: `git show origin/assignments:audit/dupes-audit-2026-10-07.md`. Session 27 worked on it today.

(4) HAND-WRITTEN TEXT INVENTORY — Oct 6: 605 player-facing strings found, 596 hand-written (heuristic regex over string literals and JSX text; e.g. src/player/SetupScreen.tsx alone had 107). A guard test from STUDS-3 (#3015, "a local check that fails when fixed text a player reads grows") should exist on main: find and run it. Authored phrase banks also count as hand-written: src/presentation/*-english.ts (subject-reply-english.ts ~139 fixed parts, legislative-motif-english.ts ~82, small-talk-english.ts ~59, refusal-english.ts ~24, election-speech-english.ts ~22, press-english.ts ~11) versus mined banks in data/english/parts/*.json. Trait reason sentences (`explanation:` in src/simulation/traits/effects/*.ts and inline `traitConsiderations` leans in ~25 files) are hand-written too; the trait spec retires them (pool rows TR-2, TR-3-*, TR-4*).

WHAT TO DO (four parts; write each part's findings as you go)

PART A — FLUFF AND WIRING (reachability)
A1. Re-run the trace (audit/trace.mjs on the assignments branch) on main. Headline counts vs Oct 6.
A2. List src/ files reachable only from tests (not from main, not from review.tsx/art-desk-entry.tsx, not from scripts/), grouped by folder with line counts.
A3. Runtime wiring: find the day clock's handler registry (where scheduled/transition handlers are registered and dispatched; start from src/simulation/future-transitions.ts and search for the registry and any backup lookup). List: handlers registered but never scheduled by code reachable from opening a world or advancing a day; scheduler functions never called from MAIN code; handlers defined but never registered. Use the transition keys/ids to grep. file:line each.
A4. Exported functions in src/simulation with zero callers outside their own file and tests (grep each export name across non-test src/). Count, then the top 60 by size.
A5. Label every unreached or uncalled piece: DELETE (dead copy, old path, unused UI or fixture — a live copy of the same concept exists), WIRE (a real game system that should run in live play but nothing calls it; name the exact call site it should get), KEEP (developer tool, test helper). Total lines for DELETE.

PART B — IS THE SIMULATION LINKED? (interconnection)
B1. Today's law→people path: the law consequence registry, enacted-law-effects.ts, lawEffectStamps, the outcome web. How many policy questions have per-person consequence rows now (Oct 1: about 50 of 121)?
B2. Re-score at least 60 of the 222 links spread across families: RUNNING (a path from the day clock writes a record on named people or the place) / ZERO-ON-PURPOSE / NOT RUNNING (missing step at file:line). Extrapolate and say so.
B3. Each Oct 1 headline finding: still true / fixed (where) / partly.
B4. The politics loop: list every place opinions, approval, votes, election choices, or legislator/council decisions READ a place outcome or a law's effect on people. If none, say none.
B5. Dice: every place randomness decides an outcome or sizes an effect in src/simulation (Math.random, seeded rng/draw/roll/odds). Top 30: file:line, what it decides, what mechanism should replace it.
B6. The 20 most important missing connections, each with the exact call site to add.

PART C — DUPLICATES AND HARD-CODING
C1. Every item in the duplicates audit (audit/dupes-audit-2026-10-07.md on the assignments branch): FIXED (file:line) / PARTLY (what remains) / OPEN, with lines deletable when finished.
C2. New duplicates (two implementations of one concept, where the clock calls one and other code reads another, or both run). Check at least: member vote rules; bill stage movement; effective dates; law→outcome tables; clock handler registries; body-rules lookups; campaign contribution rules; winner seating; the two trait paths (registeredTraitConsiderations in trait-readings.ts vs traitConsiderations in people-traits.ts — the trait spec already plans to retire the second); pay writers; living-cost/sales-tax runners; election engines per level; council seating; rent/benefit formulas; press producers; English phrase banks vs mined banks; room/backdrop pickers; pose choosers; title-screen pickers.
C3. Hard-coded special cases in shared engine code: state names/abbreviations or place ids in string literals in src/simulation (not data, not tests), fixed ISO dates in code, ids like "us-congress-v1" in shared logic, Kentucky-only checks, Lexington defaults, every state repeating its 2024 vote, fixed fake names.

PART D — BANNED CONTENT IN PLAYER-FACING CODE
D1. Hand-written player text: count now vs 605; run the STUDS-3 guard; list the top 30 files by count.
D2. Placeholders shown to players ("No value yet", "UNKNOWN"/"Unknown", "TODO", "stand-in", "PLACEHOLDER").
D3. British English: run tests/american-english.test.ts; list its exceptions; grep councillor, organise, colour, favour, centre, programme, "local authority", whilst.
For each, group into one-PR fix rows, each marked PURE DELETION (no owner review needed) or NEEDS ENGLISH ENGINE (the owner grades engine wording).

PART E — COMPARE WITH THE CURRENT ASSIGNMENTS
For every finding, check POOL.md (rows ART-*, TR-*, LW-*, CO-*, b-rows, BG-*, MR-*, OW-*, STUDS-*, AU-*; PH-* rows are FROZEN, ignore them) and say COVERED BY <row> or NEW. Only NEW findings become AU2 rows; for covered ones, note if the existing row is wrong or too vague.

DELIVERABLES

OUT-1 — RESULTS DOC FOR THE OWNER. Create a Google Doc titled "00o AUDIT RESULTS — Oct 7". Top section in plain English, no jargon (the owner reads it on his phone): (a) how much can be deleted (lines and files); (b) is the simulation linked — yes/partly/no with the 5 biggest gaps in one sentence each; (c) are things called — how many systems exist but never run; (d) hardcoded and banned content counts then vs now; (e) dice count. Then the detail tables from Parts A–E.

OUT-2 — AU2 POOL ROWS. Each NEW finding that is real work becomes ONE row sized for one Luna session in about 1–2 hours. Row ids AU2-DEL-nn (delete), AU2-WIRE-nn (wire a system into live play), AU2-DUP-nn (merge duplicates), AU2-HC-nn (hard-coding → data), AU2-TXT-nn (remove hand-written text), AU2-DICE-nn (replace dice with a mechanism). Every row's "Do exactly this" cell must contain: the exact files (and functions, file:line); the exact steps in order; what NOT to touch; the test to add (over all 56 places when it touches place logic); and an ENDPOINT someone can check (a test name passing, a grep count reaching 0, a 30-day watched world showing N records). Example of the standard:
| AU2-WIRE-03 | Pay public benefits monthly: src/simulation/public-benefit-formulas.ts has 6 formula functions with no live caller. Add a monthly handler in the day clock registry (<file:line>) that, for each household enrolled in SNAP/TANF/housing aid on the first of the month, computes the amount with the matching formula from that household's recorded income and size and writes a payment record with a law effect stamp citing the program's law in force. Delete nothing. Test: one seeded enrolled household in each of the 56 places receives exactly one stamped payment per month. ENDPOINT: a 30-day watched world (scripts/world-report/run.ts) shows ≥1 stamped benefit payment per enrolled household. | Fable audit Oct 7 | open | OPEN TO ANYONE |
Order the rows by game impact (things that make laws reach people and the world feel alive first; pure deletions next; cosmetic last). Then: branch `fable/audit-rows` from main, append a section "## AU2: code audit rows (Fable, Oct 7)" with a one-paragraph intro and the table to the END of docs/codex/assignments/POOL.md, run `npx prettier --write docs/codex/assignments/POOL.md`, add docs/release/changes/fable-audit-rows-oct7.md with the header lines `id: fable-audit-rows-oct7` and `impact: none` between `---` lines and one plain sentence, commit, push, open ONE PR titled "POOL: AU2 code audit rows (Fable, Oct 7)". If you cannot push, paste the rows at the end of the OUT-1 doc instead; the CTO commits them.

OUT-3 — When done, one line at the top of the 00j LOG: "FABLE AUDIT DONE: results doc <link>; rows PR #N (or in the doc); deletable lines X; WIRE rows Y; dice Z."

DON'TS
- No code fixes, no merges, no other PRs, no status-only edits to other pool rows.
- Don't invent sources or numbers; say "estimated" and how.
- Don't try to be exhaustive where sampling answers the question; the owner wants results today.

APPENDICES: the duplicates audit and the trace script are on the repo's assignments branch: `git show origin/assignments:audit/dupes-audit-2026-10-07.md` and `git show origin/assignments:audit/trace.mjs`. This whole brief is also at `git show origin/assignments:audit/FABLE-AUDIT-BRIEF.md`.


APPENDIX A — DUPLICATES AUDIT

# Dupes / wrong-path / never-called audit — 2026-10-07

Checkout: /tmp/wt-merge3 at 7a9b5b9fa (main). Read-only; nothing in it was edited.

## The live clock (what "live" means below)

scripts/dev-lab/world-aging.ts:101 createObserverDayButton
-> src/presentation/observer-world.ts:113 advanceObservedWorld
-> src/presentation/ordinary-life.ts:387 passOrdinaryDays (save catch-ups at :536; a tail at :423-445 that runs ONLY when control.kind === "person")
-> src/simulation/time-work.ts:1110 advanceWorldMinutes
   - at every date change: time-work.ts:2063 applyDateBoundary (job pay for the CONTROLLED person only, then Congress, federal reform, Article V, office lifecycle, courts, crisis repair)
   - due items: future-transitions.ts:452 resolveFutureDueItemsThrough using the registry from campaigns.ts:2354 composeWorldTimeHandlers, plus a hidden fallback chain at future-transitions.ts:353 handlerFor (crisisAmbientHandler, PEOPLE_GOAL_HANDLERS, SPEECH_RETELLING_HANDLERS).

Method: a registry probe script (run from the scratchpad, importing src) checked every one of the 2,461 namespaced key strings in src against every sub-registry and the composed registry. 115 keys have handlers and 114 are in the composed registry; speech:monthly-retelling is reachable only through the fallback. I also counted references for every exported function and ran four read-only sub-investigations (legislative, law effects, everyday life, registries/suffix files). Claims marked (unverified) were not re-run in TypeScript.

## Top 15 duplications, ranked by how much they block laws passing / laws reaching people / everyday life

1. **Two pay engines; the job-market one pays only the played person.** (everyday life)
   - Town pay: living-world/town-pay.ts:615 paydayHandler -> :907 startTownJobPay. It only pays `town-employment-v1:` jobs (:924) and `schedule:town-*` schedules (:748, :1748). Live, and covers everyone.
   - Job market: job-market.ts:2155 settleJobPay / :2162 settleRecordedJobPay. Its only callers are time-work.ts:2070 (controlled person), ordinary-life.ts:435 (played child's household) and job-market.ts:2319 advanceJobMarket (returns unless controlled).
   - Effect: in an observer world nobody hired through the job market is paid: the anchor's job (production-world.ts:510), people-goal-review.ts:559 hires and migration/job-offers.ts:512 hires. That also means no withholding and no paid leave, while rent still comes due (town-rent.ts:1848). NPC job-market hires go unpaid in played worlds too.
   - Never settled: local-economy.ts:537 `compensation:wages` flows (settleLocalBusinesses :709 and refreshLocalEconomy :725 have no callers), and character-history.ts:1465 `local-pay` flows.
   - Fix: one payday writer (town-pay) that settles every active paid work relationship, whatever its schedule. Delete settleJobPay's controlled-person gate.

2. **Seven rules for how a member votes.** (laws passing)
   - Live:
     - governing/chamber-votes.ts:889 decideChamberVote -> governing/member-vote-decision.ts:15. A member with no reason answers "present". Used for states, Congress and nominations.
     - governing/council-lawmaking.ts:93 decideCouncilVote: the same rule, but no reason means yea (:140-146). Used for town councils and DC.
     - municipal-ordinance-procedure.ts:332 decideOrdinaryCouncilReading: the core rule with no deference, no party cue and no constituency. Used for compiled councils and county levies.
     - governing/article-v.ts:269/283/297 mostLeanYes / mostLeanNo / leanShare, which bypass the core rule.
     - living-world/constitutional-reform.ts:1012 recordedBallotTally.
   - Not live: legislative-member-decisions.ts:154 (UI only); legislation-scenarios.ts:262 dispositionsFromCounts (authored fallback at legislative-clock.ts:438).
   - Effect: the same bill passes on a council and stalls in a legislature. With everyone "present", a members-voting threshold drops to 0 and a 0–0 vote passes (legislature-rules.ts:226, legislation.ts:1294).
   - Fix: one decideMemberVote that takes a per-body "no-reason default" from the rule pack.

3. **Three constitutional amendment pipelines.** (laws passing)
   - living-world/federal-reform.ts, living-world/constitutional-reform.ts and governing/article-v.ts are all registered (campaigns.ts:2366-2368).
   - Two yearly review schedulers both run from applyDateBoundary: time-work.ts:2084 applyFederalReform and :2086 applyArticleV.
   - Four ratification writers: constitutional-process.ts:1134-1156.
   - Four quorum checks: legislation.ts:2586, municipal-ordinance-procedure.ts:599, constitutional-reform.ts:860, federal-reform.ts:540.
   - Federal ratification admits at most about 12 states (unverified).
   - Fix: one Article V pipeline, reached through one review scheduler.

4. **Five bill-procedure drivers and four enactment-date rules.** (laws passing)
   - Drivers: legislative-clock.ts:647/1306 applyInstitutionStep (states); congress-lawmaking.ts:225; living-world/local-council-meetings.ts:384 moveOrdinances; dc-council-sittings.ts:157 moveActs (skips committee); municipal-ordinance-procedure.ts:1203.
   - Effective dates are worked out separately at legislative-clock.ts:1183, municipal-ordinance-procedure.ts:791 and :895, and legislation.ts:3477.
   - Fix: every body runs applyInstitutionStep with its pack, and one effective-date function.

5. **Two municipal rule-pack resolvers with the same name.** (laws passing locally)
   - municipal-rule-registry.ts:12 recognises the `gus2025:` prefix and adds minority-party rows. Used by legislature-rule-packs.ts:2704 and enacted-law-effects.ts:786.
   - municipal-government.ts:1331 recognises the `:local-ordinance-game/v1` suffix and adds no minority rows. Used by legislative-institutions.ts:87.
   - A second name clash: `municipalRulePackFor` is defined at municipal-government.ts:729 and municipal-election-rule-packs.ts:1218.
   - Fix: keep the registry version and re-export it from municipal-government.

6. **Four law-to-outcome tables.** (laws reaching people)
   - Live: outcome-web/index.ts:138/801 OUTCOME_LINKS, run monthly by place-outcomes.ts:278. People feel it only through crime, births and floods.
   - Dead: governing/law-effect-paths.ts:80/236/257.
   - Test-only: causal-effects.ts:86/164/235.
   - Unwired: policy-semantics.ts:446/577/609 realization.
   - 46 of 118 law links do nothing, and 25 of 79 law questions have no link.
   - Fix: delete law-effect-paths and causal-effects. Fold realization into the outcome web.

7. **Federal law to money, four ways.** (laws reaching people)
   - Dead: public-budgets/federal-treasury.ts:87 FEDERAL_LAW_EFFECTS and :244 settleFederalTreasuryMonth (tests only).
   - Live: federal-top-income-tax-law.ts:44 (per paycheck, one hand-coded question).
   - Live: statutory-wage-tax-rows.ts:4 plus paycheck-law-attribution.ts:10, which attribute the same result a second time.
   - Live: public-budgets/rules.ts:130/183 (aggregate only).
   - Fix: one consequence-registry row per tax or spending question.

8. **Law consequences evaluated outside the shared dispatcher.** (laws reaching people)
   - The shared dispatcher is enacted-law-effects.ts:797 applyLawConsequences.
   - Bypasses: town-pay.ts:1626 raiseTeacherPayToFloor; federal-farm-payments.ts:130; education-study-progression.ts:819 tuition freeze; custodyFloorAt and readJuvenileJurisdictionTerm in the justice code.
   - The minimum-wage question keys are defined twice, at minimum-wage.ts:46-61 and law-consequences/pay-rows.ts:3-7.
   - Fix: register each one as a consequence row.

9. **Hiring engines; job listings exist only for the player.** (everyday life)
   - Hiring: town-employment.ts:1364 fillTownJobs; job-market.ts:1809/1630/1640/1190; career-path7.ts:159 (UI only); local-economy.ts:336 seatLocalBusinesses (at opening).
   - job-market.ts:865 openWeeklyListings runs only through advanceJobMarket, which only presentation code calls.
   - Effect: in an observer world, residents' job search (people-goal-review.ts:576) always stops at "no-listed-opening".
   - Fix: one hiring engine on the clock, with listings for every place.

10. **Annual-pay readers disagree.** (everyday life)
    - town-labor-market.ts:266 recordedAnnualJobPay and job-market.ts:250 annualFromTerms only read weekly and monthly schedules.
    - household-pay.ts:104 reads every schedule.
    - Effect: layoffs (town-labor-market.ts:497) can never pick a worker paid through town pay.
    - Fix: everything reads household-pay.

11. **Due items are resolved through two lookups.** (clock integrity)
    - The composed registry is checked first, then future-transitions.ts:353 handlerFor's fallback.
    - crisisAmbientHandler handles the same 21 `crisis:*` keys as crisis/index.ts:85.
    - PEOPLE_GOAL_HANDLERS is registered twice (campaigns.ts:2452 and future-transitions.ts:362).
    - Composition lets the earlier registry win a shared key with no error (future-transition-registry.ts:101), so a duplicate across registries is never caught.
    - The same registry goes by five names: composeWorldTimeHandlers, createCampaignElectionTransitionRegistry, interruptionHandlers, lifeActivityHandlers, executivePlayHandlers (dead).
    - Fix: one registry, and make a shared key an error.

12. **Rent cap and health coverage each have two paths.** (laws reaching people)
    - Rent: town-rent.ts:1632 renewedMarketRent has cap=Infinity and is dead; the live path is the registry row at :1795.
    - Health: crisis health-coverage pass (crisis/index.ts:99) vs coverage-eligibility.ts:70, which runs only on lease renewal.
    - Fix: delete the dead cap and run coverage eligibility monthly.

13. **About 14 rule-pack resolvers and Congress special cases.**
    - legislature-rule-packs.ts:2646/2693 plus the import-time registerRulePackResolver (:2680).
    - congress-rule-pack.ts:538; legislature-game-profile.ts:906; and others.
    - US_CONGRESS_PACK_ID: 15 references in 6 files, plus the literal "us-congress-v1" at enacted-law-effects.ts:785.
    - isCongressMeasure: 13 uses. isCongressRulePack: 13 uses.
    - Fix: one rulePackById, and remove the import-time registration.

14. **Two campaign contribution models.**
    - campaign-compliance-rules.ts:240 covers Minnesota only.
    - campaign-compliance.ts:507 covers Kentucky only; campaigns.ts:875 sets a pack only for US-KY.
    - Election seating also has two writers: campaigns.ts:1783/1921 and living-world/local-elections.ts:1467.
    - Fix: one data-driven compliance pack for every state.

15. **Three trait-effect paths.**
    - traits/effects/index.ts:64 (generated, 54 files): live.
    - traits/effect-loader.ts:16 (glob): dead.
    - trait-registry.ts:47 EFFECT_PACKS (hand-written): live.
    - facet-thrill-seeking never loads, yet personality-trait-registry.ts:118 lists it as wired.
    - Four catalogue files: personality-catalogue(.generated).ts, personality-trait-registry.ts, trait-registry.ts.
    - Fix: keep only the generated index.

## Category 2 — reached through a wrong path: 19 found

Top 10:
1. time-work.ts:2070 job pay only for the controlled person, so an observer world pays nobody on the job market.
2. job-market.ts:865 listings are opened only for the played person, and only through presentation code (life-opportunities.ts:459).
3. enacted-law-effects.ts:285/895: "effective" consequences are dispatched once, on the enactment date, with empty subjectIds. A law whose operative date is later never lands.
4. state-governing.ts:2465: executive orders record no question answers and never call applyEnactedLawEffects.
5. federal-reform.ts:754-775: a state whose ratification rule is not admitted resolves without rescheduling, so it never acts.
6. constitutional-reform.ts:1020: recordedBallotTally returns null for rule-field changes, so the measure is stuck. :378 hasOpenReform then blocks later reforms, and a ballot is still scheduled after an early quorum return (:860/:992).
7. legislature-rules.ts:226 + legislation.ts:1294: a 0–0 vote passes on compiled councils.
8. local-economy.ts:537 and character-history.ts:1465 write wage flows that nothing ever settles.
9. Fixtures in live code:
   - run-c-working-document.ts:577 builds policy operations with hard-coded 2026-07-01 dates and definitionOrder[0].
   - run-a, run-b and legislative-bargaining fixtures are imported by presentation code.
   - simulation/index.ts:255 has `export *` from portability-fixture.
10. Hard-coded places and placeholder values:
    - campaigns.ts:875 (US-KY only); civil-personnel MN/AK branches.
    - demo.ts:109 and demo-jurisdiction-context.ts:15: Lexington placeholder default.
    - presidential-turnover.ts:787/892: each state repeats its 2024 vote share.
    - income-tax-withholding.ts:73: FEDERAL_INCOME_TAX_2026 used for every year.

Others:
- place-outcomes.ts:239: the monthly pass runs only for CRUNCH46-opening worlds.
- place-outcome-store.ts:213: D.C. has no outcome key.
- relocate.ts:335 + migration/review.ts:288: the observer anchor's household can move away, which stops all town reviews.
- member-agenda.ts:968: one failed placement drops the whole filing batch.
- legislative-clock.ts:1381: blocked steps are terminal (examples at :832, :910, :381).
- enacted-duties.ts:391-397/444: findings are never "complied", and "conditional" coverage reaches nobody.
- coverage eligibility runs only on lease renewal.
- federal-reform.ts:373: the two-thirds count is computed and then dropped.
- vitality-integrity.ts:29: legacy key "vitality:mortality-check" has no handler, so an old save would throw (unverified).

## Category 3 — declared but never invoked

Counts:
- **Handlers defined but not registered: 3**
  - policy-semantics.ts:609 policyRealizationTransitionHandler. Its scheduler, :577 schedulePolicyEstimateRealization, also has no caller.
  - incidents.ts:485 incidentTransitionHandler. Its scheduler, incidents.ts:444 scheduleIncidentTransition, has no caller.
  - presentation/executive-entry.ts:60 executivePlayHandlers.
- **Registered but never scheduled: 2**
  - campaigns.ts:2423 `living-world:development-step` (background developments never step).
  - state-governing.ts:3989 STATE_LEGISLATURE_OPENING. Its only scheduler, state-legislature-opening.ts:178 scheduleNationwideStateLegislatureOpenings, has no caller.
- **Law consequence modules:**
  - 4 of 13 consequence kinds never get their apply function called: right-permission, institution-rule, government-operations (3 rows at government-operations-rows.ts:57 attached to no question), and development-incentive.
  - 6 module manifests register nothing.
- **Exported functions in src/simulation and src/presentation that no other non-test src file references: 526 of 5,477.**
  - 366 are used only by tests, 39 only by scripts, and 121 nowhere.
  - The full lists are in the scratchpad: dead.txt and dead.txt.nowhere.
- **Unreachable files:** 74 per tentacles.md; 58 within simulation and presentation.

Top 10 never-invoked items that matter:
1. policyRealizationTransitionHandler + schedulePolicyEstimateRealization (policy-semantics.ts:609/577)
2. settleFederalTreasuryMonth + FEDERAL_LAW_EFFECTS (federal-treasury.ts:244/87)
3. settleLocalBusinesses / refreshLocalEconomy / settleBusinessMoney (local-economy.ts:709/725/701)
4. Benefit formulas: retiredWorkerBenefitMinor, foodAidBenefitMinor, primaryInsuranceAmountMinor and 3 more (public-benefit-formulas.ts:23-164). No money is ever paid to individuals; SNAP writes participation only.
5. development-step handler (developments.ts:46) and submitPublicComment (:39)
6. scheduleNationwideStateLegislatureOpenings (state-legislature-opening.ts:178)
7. recordDevelopmentIncentiveAward (law-consequences/modules/lw08-development-incentive-cap/index.ts:148)
8. incidentTransitionHandler / scheduleIncidentTransition (incidents.ts:485/444)
9. applyDisasterHandlingReactions (crisis/handling-reactions.ts:162) and actForSharedCauseGroup (living-world/law-interest-groups.ts:444)
10. withHousingSupplyLawStamps (housing-market.ts:257), enforcementPriorityForLaw (state-governing.ts:1756), officeConsequences (office-consequence.ts:569), applyForPermit (permits.ts:41)

Correction to the earlier audit:
- enacted-duties no longer has hasWorkers; coverage is by organization classification.
- US_CONGRESS_PACK_ID is down from 42 lines to 15.


APPENDIX B — trace.mjs

```js
import fs from 'fs'; import path from 'path'; import cp from 'child_process';
const ROOT='/Users/lamontae/political-game-play/scratchpad/wt-work';
const OUT='/Users/lamontae/political-game-play/cto-notes/tentacles';
const EXTS=['.ts','.tsx','.mts','.js','.mjs','.json','.cts','.cjs'];
const SKIP=new Set(['node_modules','.git','test-results','dist','art','public','data','docs','deployment','desktop','fixtures','examples','prose-review','zz-preview']);
const all=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(e.isDirectory()){ if(SKIP.has(e.name)&&d===ROOT)continue; if(e.name==='node_modules'||e.name==='.git')continue; walk(path.join(d,e.name));}
  else if(/\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/.test(e.name)) all.push(path.relative(ROOT,path.join(d,e.name)));}})(ROOT);
// also data/docs-free: include data dir json? imports resolve by existence check instead
const exists=p=>{try{return fs.statSync(path.join(ROOT,p)).isFile()}catch{return false}};
const aliases=[];
for(const f of ['tsconfig.json','tsconfig.app.json','tsconfig.node.json']){try{
  const j=JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8').replace(/^\s*\/\/.*$/mg,''));
  const co=j.compilerOptions||{};for(const [k,v] of Object.entries(co.paths||{}))aliases.push([k.replace('*',''),v[0].replace('*',''),co.baseUrl||'.']);}catch{}}
const rx=[/\bimport\s+(?:[^'"()]*?\sfrom\s*)?['"]([^'"]+)['"]/g,/\bexport\s+(?:\*|\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*['"]([^'"]+)['"]/g,/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,/new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url/g];
let unresolved=[];const edges=new Map();const importers=new Map();
function resolve(from,spec){
  let base;
  if(spec.startsWith('.'))base=path.normalize(path.join(path.dirname(from),spec));
  else{const a=aliases.find(([k])=>k&&spec.startsWith(k));if(!a)return null;base=path.normalize(path.join(a[2],a[1],spec.slice(a[0].length)));}
  spec=spec.split('?')[0];base=base.split('?')[0];
  const cands=[base,...EXTS.map(e=>base+e),...EXTS.map(e=>path.join(base,'index'+e))];
  // .js -> .ts mapping
  if(/\.(m?js)$/.test(base)){const b=base.replace(/\.(m?js)$/,'');cands.push(b+'.ts',b+'.tsx',b+'.mts');}
  for(const c of cands)if(exists(c))return c;
  return undefined;}
for(const f of all){const t=fs.readFileSync(path.join(ROOT,f),'utf8');const set=new Set();
  if(f.endsWith('.json'))continue;
  for(const r of rx){r.lastIndex=0;let m;while((m=r.exec(t))){const s=m[1];const res=resolve(f,s);
    if(res===null)continue; if(res===undefined){ if(!/\.(css|svg|png|jpg|webp|woff2?|md|txt|csv|html|glsl|wav|mp3|ogg|ttf|gif)(\?|$)/.test(s)&&!s.includes('${'))unresolved.push([f,s]); continue;}
    set.add(res);}}
  edges.set(f,[...set]);for(const x of set){importers.set(x,(importers.get(x)||0)+1);}}
// entries
const roots={main:['src/main.tsx'],other:new Map()};
const add=(f,k)=>{if(!exists(f)||!all.includes(f))return;(roots.other.get(f)||roots.other.set(f,new Set()).get(f)).add(k)};
for(const f of all){
  if(/\.(test|spec)\.[cm]?[tj]sx?$/.test(f))add(f,'test');
  else if(f.startsWith('scripts/'))add(f,'scripts');
  else if(f.startsWith('tests/'))add(f,'tests-dir');
  else if(f.startsWith('tooling/'))add(f,'tooling');
  else if(!f.includes('/')&&/config|guard/.test(f))add(f,'config');
  else if(/^src\/(.*\/)?[^/]*main[^/]*\.tsx?$/.test(f)&&f!=='src/main.tsx')add(f,'other-main');
}
for(const f of fs.readdirSync(ROOT))if(f.endsWith('.html')){const t=fs.readFileSync(path.join(ROOT,f),'utf8');for(const m of t.matchAll(/<script[^>]*src="\/?([^"]+)"/g))if(m[1]!=='src/main.tsx')add(m[1],'html-entry:'+f);}
const pk=fs.readFileSync(path.join(ROOT,'package.json'),'utf8');
for(const m of pk.matchAll(/(?:["\s])((?:src|scripts|tooling|tests)\/[\w./-]+\.(?:tsx?|mjs|mts|js))/g))add(m[1],'package.json-script');
for(const f of all)if(f.endsWith('.json')&&!f.includes('/'))continue;
// json imports reached via edges only (json has no edges)
function bfs(starts){const d=new Map();let q=[];for(const s of starts)if(exists(s)){d.set(s,0);q.push(s);}
  while(q.length){const n=[];for(const x of q)for(const y of edges.get(x)||[])if(!d.has(y)){d.set(y,d.get(x)+1);n.push(y);}q=n;}return d;}
const mainD=bfs(roots.main);
const reached=new Map();// file -> Set kinds
const kinds={};for(const [f,ks] of roots.other)for(const k of ks)(kinds[k]??=[]).push(f);
for(const [k,fs_] of Object.entries(kinds)){for(const f of bfs(fs_).keys())(reached.get(f)||reached.set(f,new Set()).get(f)).add(k.split(':')[0]);}
const srcFiles=all.filter(f=>f.startsWith('src/')&&/\.(ts|tsx|mts|json)$/.test(f));
const lines=f=>fs.readFileSync(path.join(ROOT,f),'utf8').split('\n').length;
const files=srcFiles.map(f=>{const st=mainD.has(f)?'MAIN':reached.has(f)?'OTHER-ENTRY':'NOBODY';
  return {path:f,status:st,depth:mainD.has(f)?mainD.get(f):null,importers:importers.get(f)||0,reachedBy:[...(reached.get(f)||[])],lines:lines(f)};});
const c=s=>files.filter(x=>x.status===s).length;
const head=cp.execSync('git rev-parse HEAD',{cwd:ROOT}).toString().trim();
const counts={total:files.length,main:c('MAIN'),otherEntry:c('OTHER-ENTRY'),nobody:c('NOBODY')};
fs.writeFileSync(OUT+'/tentacles.json',JSON.stringify({generatedAt:new Date().toISOString(),head,entry:'src/main.tsx (index.html); review.html -> src/review.tsx; art-desk.html -> src/art-desk-entry.tsx treated as other-entry',counts,files},null,1));
// md
const g=(arr,fn)=>{const m={};for(const x of arr)(m[fn(x)]??=[]).push(x);return m};
let md=`# Tentacles (static reachability)\n\nHead ${head}\n\n- total ${counts.total}\n- MAIN ${counts.main}\n- OTHER-ENTRY ${counts.otherEntry}\n- NOBODY ${counts.nobody}\n\nCaveat: src/review.tsx and src/art-desk-entry.tsx (html entries) count as OTHER-ENTRY. Test files count as roots of kind "test".\n\n## NOBODY by folder\n`;
const nob=files.filter(x=>x.status==='NOBODY');
for(const [k,v] of Object.entries(g(nob,x=>x.path.split('/').slice(0,2).join('/'))).sort())md+=`\n### ${k} (${v.length})\n\n| file | lines |\n|---|---|\n`+v.map(x=>`| ${x.path} | ${x.lines} |`).join('\n')+'\n';
md+=`\n## OTHER-ENTRY by entry kind\n`;
const oth=files.filter(x=>x.status==='OTHER-ENTRY');
for(const [k,v] of Object.entries(g(oth,x=>x.reachedBy.slice().sort().join('+'))).sort())md+=`\n### ${k} (${v.length})\n\n`+v.map(x=>`- ${x.path}`).join('\n')+'\n';
md+=`\n## 40 largest MAIN files\n\n| file | lines | depth | importers |\n|---|---|---|---|\n`+files.filter(x=>x.status==='MAIN').sort((a,b)=>b.lines-a.lines).slice(0,40).map(x=>`| ${x.path} | ${x.lines} | ${x.depth} | ${x.importers} |`).join('\n')+'\n';
md+=`\n## src/simulation name watch list\n\n| file | status | reachedBy |\n|---|---|---|\n`+files.filter(x=>x.path.startsWith('src/simulation/')&&/content|copy|legacy|playtest|text|fallback|placeholder/.test(path.basename(x.path))).map(x=>`| ${x.path} | ${x.status} | ${x.reachedBy.join(',')} |`).join('\n')+'\n';
md+=`\n## Unresolved specifiers\n\nCount: ${unresolved.length} (relative/aliased specifiers that matched no file; asset imports and template strings excluded)\n\n`+unresolved.slice(0,200).map(([f,s])=>`- ${f}: ${s}`).join('\n')+'\n';
fs.writeFileSync(OUT+'/tentacles.md',md);
console.log(counts,unresolved.length,aliases.length);
console.log(nob.sort((a,b)=>b.lines-a.lines).slice(0,10).map(x=>x.lines+' '+x.path).join('\n'));

```
