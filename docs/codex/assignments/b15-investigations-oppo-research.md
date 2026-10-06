# Investigations and opposition research: who finds what, and whether they care (bank id b15, phase P5 build; extends b14 corruption and b26 scandals; unlocks "next election runs on the record" for dug-up pasts)

Verified against origin/main 47c2ecb0e (Oct 6). Bank spec: docs/codex/specs/bank/b15-investigations-oppo-research.md. Same evidence chain as b14 (act, knowers, records, talk) and b26 (matter, response, views): read `b14-corruption.md` and `b26-scandals-and-press-record.md` first and extend their records. No second evidence, knowledge or scandal system.

## What the player experiences

Real people dig: a prosecutor, a state ethics board, a city auditor, a committee with subpoena power, an inspector general where the place has one, a reporter, or a rival's researcher. Each can only reach what their authority reaches (a reporter has public filings and whoever will talk; a committee can compel bank records only if its body's law gives it subpoena power). Each person asked decides for themselves to tell, refuse or lie. What the digger finds depends on what really exists. What happens next depends on whether they care: a friendly reporter may sit on it, a rival's manager may save it for October, a chair from the other party may hold public hearings. You can dig too: as a committee chair, by hiring a researcher, or by asking your auditor. Legwork happens off screen; hearings and confrontations play as scenes with Lie always on the menu.

## Owner decisions it rests on

- Sept 28 #6: "Investigations: federal, state, congressional and local investigations should take place." D-5 approved. "Investigations are mostly delegated."
- "Opposition research: it depends on who finds something and whether they care."
- Oct 5: corruption "caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll." Lies "found out by anyone with contradicting facts; damage by who and their personality."
- Fixed: zero dice; nothing blank or placeholder (estimate from similar places, mark it); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (verified on 47c2ecb0e)

- Proceedings: `press/procedures.ts` `institutionHoldsSupport` :686, `openProceeding` :725, `advanceProceeding` :757, `pressProceedingStepHandler` :993; `PROCEDURE_KEYS` `press/records.ts:144`; ethics bodies `press/state-ethics-bodies.ts`, `press/state-ethics.ts`, `press/generated-state-oversight.ts`.
- Matters: `press/matters.ts` `openMatter` :267, `recordAllegation` :295, `fileComplaint` :441, `produceRivalComplaints` :864 (rivals read public filings only), `fileRivalComplaint` :1529. Campaign filings: `press/spending-reports.ts:233 campaignSpendingReports` (public).
- Evidence: `evidence.ts` `recordEvidenceArtifact` :53, `recordEvidenceDiscovery` :89, `evidenceArtifactsRelatedToEntity` :226, `hasPersonDiscoveredEvidence` :244. Knowledge and claims: `records.ts` `recordEventKnowledge` :154, `recordClaim` :180.
- Lies: `claim-stances.ts:44 ClaimStance`, `:212 contradictionFound`; `claim-contradictions.ts:96 scheduleContradictionCheck`; `claim-contradiction-routes.ts:53 CONTRADICTION_ROUTES` holds exactly one route (`pressMatterContradictionRoute`).
- Reporters: `press/story-work.ts` `reporterWorkBudget` :68, `storyEffortEstimate` :121 (A154: 2-hour brief to 10-day investigation); `press/desk.ts:226 recordStoryLead`; `press/sources.ts:227 discloseToReporter`. CORRECTION to the bank spec: it says nothing seeds `source-tip` leads; `discloseToReporter` does at `sources.ts:426` (`route: "source-tip"`). What does not exist is an investigator or a rival seeding one.
- Prosecution: `justice/prosecution.ts` `referForProsecution` :335, `advanceProsecutions` :772, `courtCasesOf` :1377.
- Campaign: `campaign-opponents.ts:322 decideEmphasis` (private), `:1543 KnownOpponentActivity`. `member-record.ts` / `recordOf` (Session 24) is NOT on main yet: stub the call as one function `recordOfForResearch(world, personId)` that Session 24 replaces.
- Committees: `governing/committee-assignment.ts:31 committeeRosters`; no chair field anywhere (grep "chair" there: none). b10 builds chairs and leadership: read `b10-committees-chairs-leadership.md` and use its chair record; add a chair only if b10 has not landed, in the same record kind b10 specifies.
- Subpoena power is real data, never read by play code: `src/source/domains/municipal-governance/types.ts:104` has the `INQUIRY_SUBPOENA` capability per body and `src/simulation/municipal-governments.generated.ts` carries it per municipality (for example Lexington's enumerated powers). Use it for local bodies.
- Inspector general: only kernel text, `executive-governing-kernel-bank.ts:591-602` ("Oversight, audit, inspector general and ethics", `NEEDS_MECHANIC`).
- Newer code covering part: none (no `inquiries`, no subpoena reader, no oppo-research caller in src).

## Build steps (one PR each, in this order)

1. **One inquiry record and its steps.** New `src/simulation/press/inquiries.ts` beside `procedures.ts`. Record: investigator person, subject, cause (allegation, lead, public record, tip, or the investigator's own goal), authority scope, hours budget from that person's work time (A154), dated steps. Scope is a data row per body kind: records = public only, or plus compelled bank and government records where the body's law gives subpoena power; people = willing only, or compelled. Each step reads the artifacts inside scope (`evidenceArtifactsRelatedToEntity`) and writes `recordEvidenceDiscovery`. Found = exists, in scope, hours reach it. Must not: a roll or "chance to find"; a second artifact store.
2. **Subpoena rows.** Municipal: read `INQUIRY_SUBPOENA` from the compiled data. State ethics bodies, legislatures, Congress: one data row per body kind with a basis field; bodies not researched take the median of researched peers and are marked estimated. Must not: subpoena power for every body.
3. **Questioning knowers.** Each knower reached decides through `evaluateDecision`: tell, refuse or lie, from traits, relationship and favors with the subject, own exposure, and whether compelled. Reuse b14 step 3's knower decision (do not write a second). A lie is `recordClaim` with intent deceive. Add an inquiry route to `CONTRADICTION_ROUTES`: a statement to an investigator meets an artifact the inquiry later finds.
4. **Who opens one, from the record.** Each opener decides through `evaluateDecision` only on days that matter (complaint filed, story published, tip received, referral): prosecutors; ethics bodies via `fileComplaint`; a committee chair (party against the subject's party, public attention, own goals; chair from b10); an inspector general or auditor only where the place's law creates one (data row; the kernel entry is the research starting point); reporters (desk effort); campaign researchers (step 6).
5. **Whether they care.** At the end the investigator, or the person they answer to, decides: publish, refer or file (`referForProsecution`, `openProceeding`, `recordStoryLead` source-tip), hold, trade, or drop, from the size of the find, goals, party, relationship with the subject and their own cost. A held find stays on their record and can be used later. A "trade" is a recorded favor via `favors.ts`, nothing new.
6. **Opposition research.** A campaign's researcher (staff, volunteer or hired, Session 22) runs an inquiry with public-record scope plus willing people, reading `recordOfForResearch`, `courtCasesOf`, filings and past claims. Use goes to Session 24's rival message by the manager's step-5 decision, or to a reporter tip. The same tool serves the player's own campaign.
7. **Hearings as scenes.** A committee or ethics hearing is a Session 4 situation row: chair, members and witness from the records; questions built from discovered artifacts; every line through `composeGroundedLine`. The witness (the player included) chooses truth, refusal or lie.

## Must NOT build

A detection roll; a second evidence or knowledge store; authored scandal or finding lists; an investigation minigame; subpoena power for every body; a daily scan (steps run on their own due dates); one state's body treated as everyone's; a second scandal flow (b26 owns responses).

## Research tables

In repo: municipal subpoena capability (above); `docs/research/requests/what-opens-a-scandal-about-somebody-else.json`; `corrupt-opportunity-approaches.json`. Missing, one lookup each, 10 minutes max, sourced table, never invented: which state ethics commissions, legislatures and inspectors general have subpoena power (NCSL ethics commissions table, state code); whether a place has an inspector general or auditor with initiating authority. Unread rows are estimated from the median of similar bodies and marked.

## Done when (played-game proof)

Random state: an opposition chair opens a committee inquiry after a published story on the governor, subpoenas a payment record (only because that body's row allows it), questions two named aides (one lies, recorded), finds the artifact, the lie is contradicted, the chair holds a hearing scene and refers to the prosecutor. A body without subpoena power in another state fails to reach the same record. Council race: the rival's researcher finds a contradicted pledge and the manager holds it until the last month, reasons printed. Same world twice, same results. Tests: `inquiries.test.ts` (scope, hours, find on its step, nothing outside scope), the inquiry contradiction-route test, an opener-decision test, a hold-versus-publish test where one changed relationship flips it.

## Proof to post

Per PR: seed and place, the printed inquiry (cause, scope row and its basis, steps, discoveries), knower reasons with record ids, the care decision's reasons, `npm run typecheck` and changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
Switches kept: scope and subpoena rows are data (edit a row, not code); if b14's knower decision or b10's chairs have not landed, build steps 1, 2 and 5 now and stub the knower decision as one function `knowerDecision(world, knower, occasion)` and the chair as one input; if Session 24 or 22 or 4 has not landed, stub `recordOfForResearch`, the researcher hire and the hearing row the same way. No open owner questions.
