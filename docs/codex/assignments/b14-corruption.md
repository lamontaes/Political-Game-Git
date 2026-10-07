# B14 Corruption: any real kind, found out only through people and records

Bank id b14 (spec file `b14-corruption.md`) · Phase P5 (dark events and parties; Session 25 owns it, takes b14 after its five parts and extends its records) · Unlocks the "no plot armor" half of governing: real abuse has real knowers.
Code checked at origin/main ec9a9601a.

## What the player experiences

Once you hold power, real ways to abuse it show up, only where your office gives you the means: a developer offers money for your vote, a friend's paving company could get the road contract you sign, a loyal volunteer could take a protected city job, you could vote on a rezoning next to land you own. Each choice says plainly what it is. Nothing tells you whether you will be caught, because the game never rolls for it. It records who knows (the clerk who cut the check, the contractor, your bookkeeper, the donor) and which papers the act left behind. You are found out only if one of those people talks, a reporter or rival reads the records, an investigator digs, or a partner turns on you. Officials around you do the same from their own lives, so some towns stay clean and some rot.

## Owner decisions it rests on

- "Corruption: anything real (bribes, kickbacks, steering contracts, cronies); caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll."
- Register Oct 5: "Votes and officials' decisions can also be moved by money and corruption (bribes, donors, patronage)." Register line 759: town public jobs are not favors (Rutan) except as a hidden illegal favor under investigations.
- Register 575/586: misconduct "with causal consequences, not automatic success, immunity"; campaign-personal misuse is the first scandal direction.
- Session 25 (`docs/codex/brief-session25-dark-events-parties-2026-10-05.md`) takes b14 and b26 after its five parts: build on its records, do not fork them.
- Zero dice. Nothing blank (estimate from similar places, mark it). One rule for all places. One writer per record kind. Delete what you replace.

## Existing code to extend (verified)

- `src/simulation/press/records.ts:125 MISCONDUCT_FAMILIES` = M1, M2, M4, M7; labels at :128. Only M1 (`press/matters.ts:237,1008,1543`) and M4 (moguls) are ever written; M2 and M7 appear only in `press/integrity.ts:526-535` checks. `:316 FinancialOccurrenceRecord` (has `dutyReference`, `recordEvidenceArtifactIds`), `:332 MatterRecord`; `:154 recordEventKnowledge` is really in `src/simulation/records.ts:154` (the spec said press/records.ts).
- `press/matters.ts:137 spendCampaignFundsPersonally` (label `DELIBERATE_MISUSE_LABEL :81`); only caller `src/player/PressDeskPanel.tsx:550`. `:524 pressLedgerReviewHandler` (registered `press/transitions.ts:65`), the model for being found out: the bookkeeper decides. `:864 produceRivalComplaints`, `:1073 produceCampaignFinanceScrutiny` (registered `transitions.ts:49`; header lists routes NOT BUILT), `:441 fileComplaint`.
- `src/simulation/moguls.ts:507 produceMogulOffers`, `:788 answerMogulOffer`; the go-public decision at `:1130-1180` gives the mogul two fixed "strong" considerations (`mogul:paid-for-nothing`, `mogul:own-exposure`) and passes `randomness: "close-choices"`: both must go.
- `press/procedures.ts:686 institutionHoldsSupport`, `:725 openProceeding`; `press/finding-consequences.ts:44`; `press/sources.ts:227 discloseToReporter`; `src/simulation/evidence.ts:53 recordEvidenceArtifact` (spec said press/evidence.ts: wrong).
- `src/simulation/justice/prosecution.ts:268 regulatorRefers` (fixed rule), `:335 referForProsecution`, `:152 UNRESEARCHED_JAIL_EFFECTS`; callers `justice/finding-referral.ts:37` and `crime/producer.ts:1025`. `justice/court-reasoning.ts:64 PUBLIC_TRUST_OFFENSES` (one offense; used :622). `justice/sentencing-ranges.ts:44`.
- `src/simulation/favors.ts:82 recordFavor`, `:339 favorStandingBetween`; `patronage/appointments.ts:410 chooseAppointee`, `:542 wasPersonalAppointment`, `:585 recordAppointmentFavor`; `public-budgets/staffing.ts:213 staffPublicJobs`; `public-budgets/month.ts:762 settleGovernmentMonth` (overloads at :753/:769). `executive-governing-kernel-bank.ts:3246` says no procurement or contract record exists.
- Research already filed: `docs/research/requests/corrupt-opportunity-approaches.json`, `what-opens-a-scandal-about-somebody-else.json`. Newer code covering part: none (grep for kickback, steering, recordMisconductAct finds nothing relevant).

## Build steps (each is one PR; extend Session 25's records, one writer)

1. **One act writer, more real kinds.** Add data rows beside M1/M2/M4/M7 (extend the const array and label table): contract steering, kickback, protected-job patronage hire, embezzlement, shakedown, unreported gift. Each row: plain label, duty reference, offense key, artifacts the act itself leaves. Add `recordMisconductAct(world, {family, actorPersonIds, flows, artifacts, participantPersonIds})` in `press/matters.ts` writing the occurrence, the private event and knowledge (`records.ts:154`) for every participant who handled or received something. M1 and the mogul deal become callers (delete their private copies). Must NOT: write a second occurrence store.
2. **Openings only where authority is real.** Contracts: `settleGovernmentMonth` buys from named town businesses for programs that buy goods or services, awarded by the official or body whose existing authority covers it, through the resource-flow writer (purchase share estimated from similar places, marked estimated; this needs Session 20's program spending). Patronage: misconduct only when civil service law protects the post in that place and `wasPersonalAppointment` is true. Conflict: a vote on a measure touching the official's recorded ownership or job, undisclosed. NPC officials decide through `evaluateDecision` from traits, money need, relationships and who would know. Must NOT: a share-of-officials rate.
3. **People who know decide to talk.** Generalize `pressLedgerReviewHandler` to every knower of an occurrence. A knower decides only on days that matter to them (fired, cut out, wronged, charged, questioned by b15). Considerations: traits, `favorStandingBetween` with the actor, their own exposure, grievance events. Talking routes through `discloseToReporter`, `fileComplaint` or a prosecutor. A charged participant decides whether to cooperate (sentence range against loyalty); cooperation writes testimony evidence. Replace the mogul's fixed considerations with the mogul's traits and relationship, and drop `close-choices`.
4. **Records anyone can read.** Contract awards, disclosure filings and payroll postings are public records when the act leaves one. Reporters, rivals (`produceRivalComplaints`) and regulators read them and decide for themselves; a record alone proves nothing until someone links it (`institutionHoldsSupport` stays the gate).
5. **Prosecutors decide.** Replace `regulatorRefers` with the prosecutor's own `evaluateDecision` (evidence strength, offense range, principles, politics, relationship to the subject); delete the function and update `finding-referral.ts`. Add the new offense keys to `PUBLIC_TRUST_OFFENSES` with range rows.
6. **Player acts as scene choices.** Offers and openings reach the player through Session 4 situation rows, labeled plainly like `DELIBERATE_MISUSE_LABEL`. The player's records list who knows each act. No risk meter.

## Must not build

A detection roll, audit chance or "percent caught"; a corruption score; scripted scandals or authored bribe offers; a lobbyist system; a second scandal flow (b26 owns the response); an investigation engine (b15); a fixed share of corrupt officials; a daily sweep over everyone; any single-state rule.

## Research tables

In repo: the two request files above. Missing and needed (one lookup each, 10 minutes max, cite): offense ranges for bribery (18 U.S.C. 201, max 15 years), federal program bribery (666, 10), extortion under color of right (Hobbs Act 1951, 20), theft of public money (641, 10), honest-services fraud (1343/1346, 20): confirm from uscode.house.gov. State rows: NCSL or state code, one search per question; a state without a pulled row takes the median of states with rows and is marked estimated. Civil-service protection by place: one lookup of state civil service coverage for county and municipal jobs; no row means estimated from similar states.

## Done when

Watched 20-year run in a random state prints an NPC contract steered to a donor's business with its knowers. It stays secret until a named clerk is fired, decides to talk, and a reporter's story opens a matter that reaches a proceeding and a charge; the contractor then decides whether to cooperate, reasons printed. A second occurrence whose knowers never have cause stays secret all 20 years. In a player game a kickback is known only to the vendor and nothing happens until the vendor has cause. Tests: `src/simulation/press/misconduct-acts.test.ts` (each family writes one occurrence, knowers match participants), knower-decision test (same world same answer; a grievance flips it), prosecutor-decision test, `moguls` exposure reads traits, and a grep test that `regulatorRefers` and `close-choices` in this path are gone.

## Proof to post

Under `docs/codex/evidence/b14-corruption/`: the printed cause chain (act, knowers, grievance, talk, story, matter, charge, cooperation) and the secret-for-20-years counter-case, with the seed.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none. Open items, each with its switch:

- Which kinds of act exist: the family rows are data; adding or dropping one edits a row.
- State statute rows not yet researched: row field `basis: "estimated"` with the similar-state median; research replaces the row only.
- If Session 4 offer scenes or b15 have not landed: build steps 1-5 now; step 6 calls a stubbed `offerToPlayer(act)` the scene system replaces, and the knower's "questioned" occasion stays a stubbed input.

## Standing rule (owner, Oct 5)

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
