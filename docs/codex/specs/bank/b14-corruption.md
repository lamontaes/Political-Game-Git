# Corruption, any real kind, caught only through people and records (bank id b14, phase P5)

## What the player experiences

Once you hold power, real ways to abuse it show up, but only where your office actually gives you the means. A developer offers money for your vote. A friend's paving company could get the road contract you sign off on. You could put a loyal volunteer into a protected city job, vote on a rezoning next to land you own, or move campaign money into your own pocket. Each choice says plainly what it is. Nothing tells you whether you will be caught, because the game never rolls for it. What it does record is who knows: the clerk who cut the check, the contractor, your bookkeeper, the donor. It also records which papers the act left behind. You are found out only if one of those people talks, a reporter or rival reads the records, an investigator digs, or a partner turns on you to save themselves. The officials around you do the same things from their own lives, so some towns stay clean and others rot.

## Owner decisions this rests on

- "Corruption: anything real (bribes, kickbacks, steering contracts, cronies); caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll."
- Register Oct 5 ledger: "Votes and officials' decisions can also be moved by money and corruption (bribes, donors, patronage)."
- Claude CTO ruling (Register line 759): town public jobs are not favors (Rutan), except as a hidden illegal favor under investigations.
- Register (line 575): misconduct and corruption are valid directions "with causal consequences, not automatic success, immunity". Line 586: "Financial/campaign-personal misuse is the first scandal direction."
- D-2: favors come from personality, never a percentage. Zero dice.

## Existing code it must use

- `src/simulation/press/records.ts:125` `MISCONDUCT_FAMILIES` (M1, M2, M4, M7; only M1 and M4 are ever written); `:316` `FinancialOccurrenceRecord` (private event, flows, record evidence, `dutyReference`); `:332` `MatterRecord`.
- `src/simulation/press/matters.ts:137` `spendCampaignFundsPersonally` (the only player act, labeled by `DELIBERATE_MISUSE_LABEL` at `:81`). `:524` `pressLedgerReviewHandler` is the model for being found out: the bookkeeper decides for themselves, and with no staff nobody finds it. `:864` `produceRivalComplaints`, `:1073` `produceCampaignFinanceScrutiny` (its header lists the routes NOT BUILT).
- `src/simulation/moguls.ts:507` `produceMogulOffers`, `:788` `answerMogulOffer` (M4 deal). The exposure decision at about `:1140-1180` uses two fixed "strong" considerations, not the mogul's traits.
- `src/simulation/press/procedures.ts:686` `institutionHoldsSupport` (upheld only when an occurrence is on record); `:725` `openProceeding`.
- `src/simulation/press/finding-consequences.ts:44` `applyFindingConsequences`; `findings.ts:45` `UNRESEARCHED_FINDING_EFFECTS`.
- `src/simulation/justice/prosecution.ts:268` `regulatorRefers` is a fixed rule ("two findings or denied it"); `:335` `referForProsecution`. `court-reasoning.ts:63` `PUBLIC_TRUST_OFFENSES` holds one offense. `sentencing-ranges.ts:44` `sentencingRangeForCase`.
- `src/simulation/favors.ts:82` `recordFavor` (motive "corruption", `types.ts:1874`), `:339` `favorStandingBetween`. `patronage/appointments.ts:410` `chooseAppointee`, `:542` `wasPersonalAppointment`, `:585` `recordAppointmentFavor`. `public-budgets/staffing.ts:213` `staffPublicJobs`.
- `src/simulation/public-budgets/month.ts:762` `settleGovernmentMonth`. There are no purchase or contract records (`executive-governing-kernel-bank.ts:3246`: "No procurement or contract record exists").
- `src/simulation/press/sources.ts:227` `discloseToReporter` (leaks). `records.ts:154` `recordEventKnowledge`. `evidence.ts` `recordEvidenceArtifact`.

## What to change

1. **One act writer, more real kinds.**
   - Add families as data rows beside M1/M2/M4/M7: contract steering, kickback, protected-job patronage hire, embezzlement, shakedown, unreported gift. Each row carries its plain label, its duty reference (the federal and state statute family: research row, ≤10 minutes per the timebox rule), its offense key, and which record artifacts the act itself leaves.
   - Generalize `spendCampaignFundsPersonally` into `recordMisconductAct(world, {family, actorPersonIds, flows, artifacts, participantPersonIds})`. It writes the occurrence and the private event, plus knowledge for every participant who processed or received something. M1 and the mogul deal become callers.
   - Test: each family writes one occurrence, and its knowers match its participants.
2. **Openings only where authority is real.**
   - Contracts: `settleGovernmentMonth` grows purchases from named town businesses for programs that buy goods or services. Each is awarded by the official or body whose existing authority covers it, through the same resource-flow writer. The purchase share is estimated from similar places and marked estimated.
   - Patronage: a `staffPublicJobs` / `chooseAppointee` hire is misconduct only when the post is protected by civil-service law in that place and `wasPersonalAppointment` is true.
   - Conflict: a vote or decision on a measure touching the official's recorded ownership or employment, without disclosure.
   - NPC officials decide through `evaluateDecision` from their own traits, money need, relationships and who would know. Never from a share of officials.
3. **People who know decide to talk.**
   - Generalize `pressLedgerReviewHandler` to every knower of an occurrence. Each knower decides only on days that matter to them: they are fired, cut out, wronged, charged, or questioned (b15).
   - Considerations are their traits, `favorStandingBetween` with the actor, their own exposure and their grievance events. Talking routes through `discloseToReporter`, `fileComplaint` or a prosecutor.
   - Turning on a partner: when a participant is charged, they decide whether to cooperate, weighing their sentence range against loyalty. Cooperation writes testimony evidence on the matter.
   - Replace the mogul exposure's fixed considerations with the mogul's own traits and relationship.
4. **Records anyone can read.** Contract awards, disclosure filings and payroll postings are public records whenever the act leaves one. Reporters (the desk's public-record route), rivals (`produceRivalComplaints`) and regulators read them and decide for themselves. A record alone proves nothing until someone links it (`institutionHoldsSupport` stays the gate).
5. **Prosecutors decide.**
   - Replace `regulatorRefers` with the prosecutor's own decision through `evaluateDecision`: evidence strength, the offense range, the prosecutor's principles and politics, and their relationship to the subject.
   - Add the new offense keys to `PUBLIC_TRUST_OFFENSES`, with researched range rows.
6. **Player acts as scene choices.**
   - Offers and openings come to the player through Session 4 situation rows (an offer from a real person, a contract on your desk). The choice is labeled plainly, like `DELIBERATE_MISUSE_LABEL`.
   - The player's own records list who knows each act. There is no risk meter.

## Must NOT build

- A detection roll, audit chance or "percent caught."
- A corruption score or meter.
- Scripted scandals or authored bribe offers.
- A lobbyist system (separate bank item) or a second scandal flow (b26 owns the response).
- An investigation engine (b15).
- A fixed share of corrupt officials.
- A daily check over everyone.
- Rules for one state only (every state reads its own statute row; unresearched means estimated from similar states and marked).

## Done when (proof in a played game)

- A watched 20-year run in a random state prints at least one NPC contract steered to a donor's business, with its knowers. It stays secret until a named clerk is fired, decides to talk, and a reporter's story opens a matter that reaches a proceeding and a charge. The contractor then decides whether to cooperate, with reasons printed.
- A second occurrence whose knowers never have cause stays secret for all 20 years.
- In a player game, a kickback the player takes is known only to the vendor, and nothing happens until the vendor has cause to talk.
- Tests: `misconduct-acts.test.ts` (each family), knower-decision test (same world gives the same answer; a grievance flips it), prosecutor-decision test, and `moguls` exposure reading traits.

## Depends on

- b15 (investigations question knowers).
- b26 (how the player answers once it is public).
- Session 4 (offer scenes).
- Session 23 (executive desk and appointments, for openings).
- Session 20 (program spending for purchases).

## Open questions for the owner

None.
