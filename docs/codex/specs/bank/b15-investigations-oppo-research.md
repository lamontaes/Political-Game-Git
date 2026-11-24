# Investigations and opposition research (bank id b15, phase P5)

## What the player experiences

Real people dig. A prosecutor, a state ethics board, a city auditor, a legislative committee, an inspector general, a reporter, or the researcher a rival campaign hires can each open an inquiry into someone, you included. They can only reach what their authority reaches. A committee with subpoena power can demand bank records; a reporter has public filings and whoever will talk; a rival's researcher reads your votes, court records and old statements, and calls people who knew you. Each person they ask decides for themselves whether to talk, stall or lie. What the digger finds depends on what really exists. What happens next depends on whether they care: a friendly reporter may sit on it, a rival's manager may save it for October, and a chair from the other party may hold public hearings. You can be the one digging too: as a committee chair, a campaign hiring a researcher, or an official asking your auditor to look. Most of the legwork happens off screen. Hearings and confrontations play as scenes.

## Owner decisions this rests on

- Sept 28 #6: "Investigations: federal, state, congressional and local investigations should take place."
- Sept 28: "Opposition research: it depends on who finds something and whether they care."
- D-5 approved: "Poison pills, riders, attack ads and investigations." Register line 586: "investigations are mostly delegated."
- Oct 5: corruption is "caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll." Lies are "found out by anyone with contradicting facts; damage by who and their personality."
- Register OCD-PRESS-003 and party knowledge: the public learns only what becomes public; leaks keep attribution and uncertainty.

## Existing code it must use

- Proceedings: `src/simulation/press/procedures.ts:725` `openProceeding`, `:757` `advanceProceeding`, `:993` `pressProceedingStepHandler`, `:686` `institutionHoldsSupport`. Bodies: `press/records.ts:144` `PROCEDURE_KEYS`, `state-ethics-bodies.ts` (23 researched), `generated-state-oversight.ts:151`.
- Matters: `press/matters.ts:267` `openMatter`, `:295` `recordAllegation`, `:441` `fileComplaint`, `:864` `produceRivalComplaints`, `:1529` `fileRivalComplaint` (rivals read public filings only).
- Evidence and knowledge: `src/simulation/evidence.ts:53` `recordEvidenceArtifact`, `:89` `recordEvidenceDiscovery`, `:226` `evidenceArtifactsRelatedToEntity`, `:244` `hasPersonDiscoveredEvidence`. `records.ts:154` `recordEventKnowledge`, `:180` `recordClaim`. `types.ts:781` `EventKnowledgeRecord` (direct, told-by, public-record, media, rumor).
- Lies: `claim-stances.ts:44` `ClaimStance`, `:212` `contradictionFound`. `claim-contradictions.ts:96` `scheduleContradictionCheck`. `claim-contradiction-routes.ts:53` `CONTRADICTION_ROUTES` has one route (`press/claim-route.ts:84`).
- Reporters: `press/story-work.ts:68` `reporterWorkBudget`, `:121` `storyEffortEstimate` (hours, from a 2-hour brief to a 10-day investigation, ruling A154). `press/desk.ts:226` `recordStoryLead` (the `source-tip` route exists but nothing seeds tips). `press/sources.ts:227` `discloseToReporter`.
- Prosecution: `justice/prosecution.ts:335` `referForProsecution`, `:772` `advanceProsecutions`.
- Campaign: `campaign-opponents.ts:322` `decideEmphasis`, `:1543` `KnownOpponentActivity`. Session 24 adds `member-record.ts` `recordOf` and record-based rival messages.
- Committees: `governing/committee-assignment.ts:31` `committeeRosters` (no chairs recorded). The inspector general exists only as kernel text: `executive-governing-kernel-bank.ts:591` ("NEEDS_MECHANIC").
- Records to dig in: `justice/prosecution.ts:1377` `courtCasesOf`, `press/spending-reports.ts:233`, `public-information.ts:90` `publishPublicEvent`.

## What to change

1. **One inquiry record and its steps** (new `src/simulation/press/inquiries.ts`, beside the proceedings it feeds).
   - An inquiry has: investigator person, subject, cause (allegation, lead, public record, tip, or the investigator's own goal), authority scope, an hours budget from that person's work time (the A154 rule), and dated steps.
   - The scope is a data row per kind:
     - Records: public only; plus subpoenaed bank and government records where the body's rule gives subpoena power (research row per body, ≤10 minutes; unread is estimated from similar bodies and marked).
     - People: willing only, or compelled.
   - Each step reads the artifacts that exist inside its scope (`evidenceArtifactsRelatedToEntity`) and records discoveries (`recordEvidenceDiscovery`). An artifact is found when it exists, is in scope and the hours reach it. No roll.
   - Test: an artifact outside scope is never found; one inside is found on its scheduled step.
2. **Questioning knowers.**
   - Each knower the inquiry reaches decides through `evaluateDecision`: tell, refuse, or lie. Considerations come from their traits, relationship and favors with the subject, their own exposure, and whether they are compelled (b14 part 3 owns the knower decision; reuse it).
   - A lie is a recorded claim (`recordClaim`, intent deceive) that later evidence can contradict.
   - Register a contradiction route for inquiries in `CONTRADICTION_ROUTES`: a statement to an investigator meets an artifact the inquiry found.
3. **Who opens one, from the record.** Each opener decides through `evaluateDecision`, only on days that matter (a complaint filed, a story published, a tip received, a referral):
   - prosecutors (cause plus their principles and politics);
   - ethics bodies (`fileComplaint`, existing);
   - a legislative or council committee: the chair decides from party versus the subject's party, the public attention on the allegation and their own goals. Add a recorded chair per committee, chosen by seniority and majority party, from the committee rosters;
   - an executive's inspector general or auditor, where the place's law creates one (data row);
   - reporters (desk effort);
   - campaign researchers (part 5).
4. **What they do with it: "whether they care."** At the end, the investigator, or the person they answer to, decides through `evaluateDecision`:
   - publish, refer or file (`referForProsecution`, `openProceeding`, `recordStoryLead` with `source-tip`);
   - hold for later;
   - trade it;
   - drop it.
     Considerations: the size of what was found, their goals and party, their relationship with the subject, and the cost to themselves. A held find stays on their record and can be used later.
5. **Opposition research.** A campaign's researcher, a staffer, a volunteer or a hired person (Session 22 campaign staff) runs an inquiry with public-record scope plus willing people. It reads Session 24's `recordOf`, `courtCasesOf`, filings and past claims. Use goes to Session 24's rival message, chosen by the manager's decision in part 4, or to a reporter tip. The same tool serves the player's own campaign.
6. **Hearings as scenes.** A committee or ethics hearing is a Session 4 situation row: the chair, the members and the witness from the records; questions built from discovered artifacts; every line through `composeGroundedLine`. The witness, the player included, chooses truth, refusal or a lie (Lie is always present).

## Must NOT build

- A detection roll or "chance to find."
- A second evidence or knowledge store.
- Authored scandal or finding lists.
- An investigation minigame.
- Automatic subpoena power for every body.
- A daily scan: steps run on their own due dates.
- One state's body treated as everyone's (only the generated estimate stands in, and is marked).

## Done when (proof in a played game)

- In a random state, an opposition chair opens a committee inquiry after a published story on the governor. It subpoenas a payment record, questions two named aides (one lies, recorded), finds the artifact, and the lie is contradicted. The chair holds a hearing scene and refers to the prosecutor.
- In a council race, the rival's researcher finds a contradicted pledge, and the manager holds it until the last month, printing reasons.
- The same world run twice gives identical results.
- Tests: `inquiries.test.ts` (scope, hours, find), the inquiry contradiction route test, and an opener decision test.

## Depends on

- b14 (knower decision, misconduct acts).
- Session 24 (`recordOf`, rival messages).
- Session 22 (campaign staff).
- Session 4 (hearing scenes).
- Session 21 (committee chamber records).

## Open questions for the owner

None.
