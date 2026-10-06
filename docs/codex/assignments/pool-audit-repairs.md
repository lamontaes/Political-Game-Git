# Pool: Sept 30 audit repairs, by area

Source: the three Sept 30 audits (Claude, Cursor, Codex; `cto-notes/audit-2026-09-30/`) as checked item by item on Oct 1 (`docs/codex/audit-verified-2026-10-01.md`, 149 items), then re-checked by grep against main `2e7ac6cef` on Oct 6. Main has moved a lot: most dice, one-ledger, one-payroll and one-law-path items are already done and are left out. What is below is only what is still present. Cites are file:line on main today.

## Pool rules

1. Post "Session N takes AU-nn" on #2052, then build. One item, one PR. Nothing waits on main green.
2. Zero dice. Never add a roll, a hash pick or an alphabetical tie-break to decide an outcome.
3. Nothing blank, pending or zero by default. Where the record is missing, estimate from similar places and mark the estimate as an estimate.
4. Each PR: changed tests + `npm run typecheck`, the old path deleted in the same PR (see "Replaces:"), audit IDs in the title.
5. A second merger rebases on whatever landed first. Do not hold a PR for another one.
6. An item marked "(unverified: check first)" gets one grep at current main before any code; if already fixed, say so on #2052 and take another.

## Laws and engines

- AU-01: One amendment process and Congress as a rule pack. (a) Fold the three amendment pipelines into one proposer and one state-action handler: `living-world/federal-reform.ts:693`, `living-world/constitutional-reform.ts:671`, `governing/article-v.ts` (propose + state action). (b) Replace the 42 `US_CONGRESS_PACK_ID` special-case lines in `src/simulation` with pack fields (grep it). (c) Rider and item-veto authors for councils: `offerPlannedAmendment` is only called from the legislative clock (A85, unverified: check first). One PR, changed tests + typecheck. Replaces: the two extra proposeAndVote paths; each Congress branch removed. (A86, A89)
- AU-02: One effects map and one stamp registry. (a) `src/simulation/causal-effects.ts` is still imported by `policy-semantics.ts`, `incidents.ts`, `incident-response.ts`, `transit-service.ts`, `macro-economy/cycle.ts`, `world.ts`; feed those from the effects map and delete the file. (b) `law-effect-stamp.ts:25` `effectKind: string` becomes a union read from the one registry. (c) Spending after enactment must not depend on a hand-kept handler list: `governing/state-governing.ts` `withProgramMatters` (A90, unverified: check first). Replaces: `causal-effects.ts`; free-text effect kinds. (A129, A19)
- AU-03: Federal laws sized once. `public-budgets/federal-treasury.ts:93` `FEDERAL_LAW_EFFECTS` sizes federal laws as treasury shares while `federal-top-income-tax-law.ts` and `federal-outlay-laws.ts` size them per paycheck and per outlay. Keep one sizing per law (the bill's own terms), have the treasury read it, delete the table rows that duplicate it. Replaces: the duplicated rows. (A29)
- AU-04: Duties need evidence. `enacted-duties.ts:445` marks a body "complied" whenever any worker is on record. Read a filing, report or service record; with none, say "compliance-unknown" and keep it open. Add a test with a body that has workers and no record. Replaces: the `hasWorkers` shortcut. (A97)
- AU-05: Player's legislative session matches the clock. (a) `presentation/legislation-session.ts:260` falls back to `chamber.committees[0]`; use `congressReferralCommittee` / the clock's referral first. (b) NPC amendments and bills dying at session end, same as `governing/legislative-clock.ts`. (c) A governor's Senate appointment window is not a flat 10 days: `nationwide-world/senate-vacancy-law.ts:58` `SENATE_APPOINTMENT_PLACEHOLDER_DAYS`; read each state's rule, estimate from similar states where none is recorded and mark it. Replaces: the committees[0] fallback; the placeholder constant. (A78, A120)
- AU-06: Courts. (a) One "which court" function with a federal branch replacing `judiciary/judicial-review.ts` `reviewingCourt` (:130, :189), `justice/court-reasoning.ts:439` `sentencingJudge`, `living-world/town-rent.ts:2103` `trialJudge`. (b) `justice/prosecution.ts:264` the PLACEHOLDER stand-in for unseated prosecutors: charge through a seated prosecutor's decision or leave the case unfiled. (c) A jury smaller than the law requires cannot return a verdict (`justice/prosecution.ts`, `court-reasoning.ts` panel fill; unverified: check first). Replaces: three court finders. (A100, A104, A105)
- AU-07: One clock path. (a) `time-work.ts:2005` `setCurrentMomentWithDue` still calls `setCurrentMoment` on a same-date move, so daily steps can run again inside one day: run them once per date change (A2). (b) `world.ts` `advanceWorld` keeps its own due-item resolution beside `time-work.ts`; make it a thin call (A3). (c) Start the death schedule and goal review on every time path: `ensureCrisisMortality` is seeded only in `presentation/opening-life.ts:574` (A6, unverified: check first). Replaces: the second whole-day path.

## Money and budgets

- AU-08: Pay and hiring from records. (a) `job-market.ts:170` `PUBLIC_BODY_ROLE_PLACEHOLDER` (public clerk hourly wage): read each body's recorded pay, estimate from similar bodies and mark it. (b) `living-world/town-labor-market.ts:402` last hired first let go and `:508` shortest unemployed called back first (HARDWIRED): decide from the employer's need and the person's record. (c) Employers pay only from cash they have, with a recorded partial or blocked payment (`living-world/town-pay.ts`; A60, unverified: check first). Replaces: the placeholder and the two ranking rules. (A41, A70, A60)
- AU-09: Opening money from records. (a) `world-setup/conditions.ts:36` and `:253` `drawPublicCashOpeningProfile` fixes $1 billion federal, $100 million per state, $5 million per local; use each government's recorded opening balance, estimate from similar governments and mark it. (b) Public employees (police, teachers) paid out of their government's account: `living-world/town-employment.ts` public sectors have no account link (A50, unverified: check first). Replaces: the fixed profile. (A49, A50)
- AU-10: Businesses and banks from books. (a) `local-economy.ts:77` `LOCAL_BUSINESS_KINDS` fixed monthly revenue and every flow "completed": revenue from real sales, payment only when it happened. (b) `living-world/town-businesses.ts:614` `closingPerYear: 0.013` and the founding chance: close and open from the books and the owner's decision. (c) `macro-economy/central-bank.ts:240` and `:388` `drawInflationLean`: a member's lean from their record. Replaces: the fixed-revenue kinds; the draw. (A58, A59, A65)

## Elections

- AU-11: Opening politics and town elections without swings. (a) `world-setup/political-start.ts:135-141` `drawPoliticalLatents` adds standardNormal national/region/state swings: use the certified baselines, an exact tie stays unresolved. (b) `living-world/local-elections.ts:1696` `drawTownResident` chooses who runs; follow with the town's residents' views and filing records (the schedule and filing draws near `:758` and `:1012` are unverified: check first). (c) `election-contests.ts:480` and `:1042` still build a `SeededRng` for contests with no electorate: return "unresolved" instead (unverified: check first). Replaces: the swing draws and the resident draw. (A115, A112, A110)

## People and records

- AU-12: Where people live and what is on record. (a) `living-world/town-wards.ts:212` FNV hash decides the ward for any household the roster did not write, including the player's: use the recorded home. (b) `education-study-progression.ts:748` `completeStudyPeriod` (called :1059) completes study from paid elapsed time alone: require the credential record. (c) `source/adapters/acs-pums-character-history.ts:222` `selectAcsPumsHouseholdDonor` seeded donor draw: a deterministic allocation by household weight. Replaces: the hash, the elapsed-time completion, the donor draw. (A149, A141, A151)
- AU-13: Hazards and crime from causes. (a) `crisis/hazard-producer.ts:321` Poisson count and `:339` alphabetical `sort().slice(0, width)` footprint: counts from hazard records and housing stock, footprint by exposure. (b) `crime/producer.ts:486` `sampleMonthlyCrime` victims and reporting from recorded causes (unverified: check first). (c) `pressure/ladder.ts:436` unrest settles as calmed without a reading: missing anger data is unknown, not calm (unverified: check first). Replaces: the Poisson stream and alphabetical slice. (A132, A131, A133)

## Scenes and English

- AU-14: Scenes point at real things. (a) `life-opportunities.ts:327` writes the `civic.meeting-notice` with authored text and no organizer decision: write it only from a real meeting record. (b) `living-world/civic-actions.ts:304` "A resident attended a public meeting" must reference an actual meeting. (c) Reporter requests must not create a newsroom: already fixed in `press-reach.ts:141`; only `press/records.ts:49` tier labels 1/3/8 remain (A154, unverified: check first). Replaces: the authored notice; the unreferenced attendance line. (A156, A157, A154)
- AU-15: English engine as the voice (unverified: check first). Convert the remaining authored line banks into parts for the modular sentence engine: `presentation/legislative-dialogue-motifs.ts`, episode and conversation-subject banks, press headlines; bill wording families and the question-to-bill table into data (`legislation-program-families.ts`, A20). One bank per PR. Replaces: each converted bank. (A160, A20)

## UI

- No UI items from the three Sept 30 audits remain open on main (the Law Effects "without this law" label and the interruption preferences are already fixed). UI work lives in the P0/P1 pools.

## Data

- AU-16: Research data gaps. (a) `outcome-web/links.json` now has `unsupportedReason` on 221 rows; add the check that load fails when a null-size link lacks one (A163, verify the throw exists first). (b) Review the 334 declared-assumption markers in production code and tag each with its step ID (A166, unverified: check first; start with `docs/codex/audit-gaps-2026-10-01.md`). No research numbers change without the PR that uses them in play. Replaces: untagged markers. (A163, A166)

## Done on main (checked Oct 6, left out)

One calendar per body, the two-driver bill path, charter and electors as data, one-law path for starting laws, one payroll (minimum wage, teacher floor, fairness pay), mortgage and home price, tuition freeze, cannabis, effect-size jitter, mortality threshold, incident probability mode, migration 4%, campaign and nomination rolls, press-only reads, juvenile court age.
