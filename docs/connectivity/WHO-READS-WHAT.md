# Who writes what, and who reads it

Every system in the game that writes something, what it writes, what reads it, and what should read it and does not. A missing link is a defect, and names the thread that owns each end.

13 producers, 27 missing links: 9 open, nobody has taken it, 3 being built in an open pull request, 7 handed to its owner, 7 waiting on research, 1 closed.

## Open defects, by the thread that owns the reading end

### Consequences for corruption

1. **A complaint about anyone who is not the player.** From a complaint opened against an officeholder (producer owned by Consequences for corruption). handed to its owner.
2. **A player facing a finding choosing how to answer, or resigning.** From answering for your office, and resigning it (producer owned by Consequences for corruption). handed to its owner.

### Every town in America

1. **A city election using its own counting rule.** From sourced local election and ballot rules (producer owned by Every town in America). open, nobody has taken it.

### How the world changes

1. **Someone, including the player, attempting or ordering violence.** From an act of political violence (producer owned by How the world changes). handed to its owner.
2. **A measured effect on the world: prices, jobs, coverage, crime, anything a law is about.** From an enacted law (producer owned by Legislation). waiting on research.
3. **A world development escalating into a crisis the acting office must decide.** From an international crisis (producer owned by How the world changes). handed to its owner.

### Legislation

1. **A legislator's views deciding their floor vote.** From a person forming a political view (producer owned by People and life). being built in an open pull request.
2. **A law changing a rule of government, such as a term limit or a filing requirement.** From an enacted law (producer owned by Legislation). open, nobody has taken it.
3. **A player drafting a bill with several subjects, or delegating routine steps.** From bills with several subjects, and delegated bill steps (producer owned by Legislation). open, nobody has taken it.

### Local crime

1. **Local crime of any kind.** From an act of political violence (producer owned by How the world changes). open, nobody has taken it.

### Migration and big social movements

1. **People leaving a town after their homes are destroyed.** From a disaster (producer owned by How the world changes). waiting on research.
2. **Moving for work, family or cost.** From someone moving in or out of town (producer owned by Migration and big social movements). waiting on research.

### Nationwide government

1. **An income tax in the other 51 places.** From an enacted law (producer owned by Legislation). open, nobody has taken it.

### People and life

1. **A disaster shaping what people believe.** From a disaster (producer owned by How the world changes). waiting on research.
2. **The reflection pass on the ordinary clock.** From a person forming a political view (producer owned by People and life). handed to its owner.
3. **Where a person's principles come from.** From a person forming a political view (producer owned by People and life). waiting on research.
4. **A party's stances coming from its members' views.** From a person forming a political view (producer owned by People and life). open, nobody has taken it.
5. **Everyone else learning what a bill is about: members who vote on it, and the public who read about it.** From an enacted law (producer owned by Legislation). handed to its owner.
6. **The party's standing with the member: endorsements withdrawn, a primary challenge, leadership calling for resignation.** From an ethics finding (producer owned by Consequences for corruption). waiting on research.
7. **Newcomers bringing their politics, and places changing because of who lives there.** From someone moving in or out of town (producer owned by Migration and big social movements). open, nobody has taken it.
8. **A wave feeding party evolution.** From someone moving in or out of town (producer owned by Migration and big social movements). open, nobody has taken it.
9. **Real census households for a new character's family.** From two people becoming partners (producer owned by Relationships). handed to its owner.

### Relationships

1. **Two people who grow close becoming a couple, including a one-night stand.** From two people becoming partners (producer owned by Relationships). being built in an open pull request.

### Running for office

1. **Voters in the stricken place judging the damage itself, not only the handling.** From a disaster (producer owned by How the world changes). waiting on research.
2. **A new party getting onto a ballot.** From a party founding itself (producer owned by People and life). open, nobody has taken it.
3. **A voter's views deciding a vote.** From a person forming a political view (producer owned by People and life). being built in an open pull request.

## Every producer

### A complaint opened against an officeholder

`a-scandal-about-somebody` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Consequences for corruption

**Writes.** A rival's decision to file, an ethics matter and a proceeding before the state's commission. (`src/simulation/press/matters.ts#produceRivalComplaints`)

**Runs in an ordinary save.** Yes. Weekly press sweep, but only against the player, only when the player's campaign paid a vendor, and at most one per campaign.

**Read by.**

1. `src/simulation/press/procedures.ts#advanceProceeding` (Consequences for corruption): Runs the proceeding on statutory deadlines.

**Should be read by, and is not.**

1. **A complaint about anyone who is not the player** (Consequences for corruption; handed to its owner). openMatter accepts any subject, but no producer ever names an NPC. ChatGPT answered: broaden the actors and incidents on the existing weekly route; no quota. (question: `what-opens-a-scandal-about-somebody-else`; handed off: September 23, 2026, brief sent to Consequences for corruption)

### A disaster

`a-disaster` · counted at main at 130dd113, measured September 23, 2026 · producer owned by How the world changes

**Writes.** A hazard episode, damage to homes, households and organizations, direct deaths (recordPersonDeath, cause crisis-injury), injuries as health episodes, an assessment, and state and federal response stages. (`src/simulation/crisis/hazard-producer.ts#hazardSampleHandler`)

**Runs in an ordinary save.** Yes. Sampled monthly from the opening (opening-life.ts:101).

**Read by.**

1. `src/simulation/crisis/health.ts:342 and mortality.ts:115` (People and life): Injuries raise the injured person's mortality hazard.
2. `src/simulation/macro-economy/sources.ts:148 (CRISIS_ORIGIN_READER)` (How the world changes): A disaster-reconstruction shock in the monthly economy step.
3. `src/simulation/governing/repair-funding.ts via world.ts:1082` (Nationwide government): Public repair funding; a federal declaration makes repair four times faster.
4. `src/simulation/crisis/handling-reactions.ts:233` (Running for office): The governor's or president's handling decision moves campaign support.
5. `src/simulation/press/desk.ts:1260` (How the world changes): Breaking-crisis stories on the public-safety beat.

**Should be read by, and is not.**

1. **People leaving a town after their homes are destroyed** (Migration and big social movements; waiting on research). Nothing writes a displaced household, and the migration review does not import crisis. The wave-causes seam lists disasters as not built (migration/contract.ts); a cause kind would read recorded damage at migration/waves.ts:288. The departure rate is unresearched. (hook: `src/simulation/migration/waves.ts#evaluateCause`; question: `migration-rates-and-reasons`)
2. **Voters in the stricken place judging the damage itself, not only the handling** (Running for office; waiting on research). Support moves only on a handling decision. No reader of damage or deaths by area touches a vote. (hook: `src/simulation/crisis/handling-reactions.ts`; question: `disaster-handling-reactions`)
3. **A disaster shaping what people believe** (People and life; waiting on research). Answered in principle (event, known exposure, memory, relevance to a proposition, the existing evaluator). Blocked on the belief pass being scheduled at all; see what-a-person-believes. (question: `what-should-the-world-do-to-a-person`)

### A party founding itself

`a-new-party` · counted at main at 130dd113, measured September 23, 2026 · producer owned by People and life

**Writes.** Party evolution records: founded, split off, merged, renamed, platform changed, dissolved. (`src/simulation/living-world/party-evolution.ts#partyBodyReviewTransitionHandler`)

**Runs in an ordinary save.** Yes. Runs on its own; a party founds itself by the second year in ordinary saves.

**Read by.** Nothing outside tests.

**Should be read by, and is not.**

1. **A new party getting onto a ballot** (Running for office; open, nobody has taken it). partyBallotStatusAt (party-evolution.ts:419) takes no arguments, returns the literal not-represented, and has no caller. (hook: `src/simulation/living-world/party-evolution.ts#partyBallotStatusAt`)

### A person forming a political view

`what-a-person-believes` · counted at main at 130dd113, measured September 23, 2026 · producer owned by People and life

**Writes.** Private beliefs with a decision trace; with its sibling recorders in politics.ts, public positions, campaign commitments, principles, subject knowledge and proposition exposures. (`src/simulation/political-belief-formation.ts#applyNpcPoliticalBeliefFormation`)

**Runs in an ordinary save.** No. The only non-test caller of the formation engine and of five recorders in politics.ts is src/simulation/demo.ts. The scheduled pass living-world/political-reflection.ts is finished and imported by nothing, so it is in no handler registry and nothing schedules a first reflection.

**Read by.**

1. `src/ui/PoliticalProfile.tsx:236` (People and life): Displays beliefs, positions and commitments.
2. `src/presentation/world39-journal.ts:295` (People and life): Journals them.

**Should be read by, and is not.**

1. **The reflection pass on the ordinary clock** (People and life; handed to its owner). Register politicalReflectionTransitionHandler and schedule each NPC's first reflection. 66 propositions now exist (US_POLICY_POSITIONS_PACK, authored fiction), each naming the principles it engages, which was the first unblock the pass's own comment names. It still has no exposures to reflect on and no person holds a principle. (handed off: September 23, 2026, brief sent to People and life)
2. **Where a person's principles come from** (People and life; waiting on research). recordPrinciple has no caller outside demo.ts. D-093 says a person's own character and history decide; the weighting from temperament to principle is the research. (question: `what-should-the-world-do-to-a-person`)
3. **A voter's views deciding a vote** (Running for office; being built in an open pull request). An election result reads a support score plus a seeded swing (campaigns.ts:1494) or seeded random votes (election-contests.ts:142). No view of any voter is read. (in flight: #489 weighs an officeholder's record question by question; it does not read voters' own beliefs)
4. **A legislator's views deciding their floor vote** (Legislation; being built in an open pull request). Floor and committee votes come from authored vote plans (legislation-session.ts:69, legislative-clock.ts:288). (in flight: #440 lets every seated legislator cast their own vote)
5. **A party's stances coming from its members' views** (People and life; open, nobody has taken it). partyActorStance (living-world/party-evolution.ts:161) is a seeded random pick.

### An act of political violence

`an-act-of-violence` · counted at main at 130dd113, measured September 23, 2026 · producer owned by How the world changes

**Writes.** A public crisis.violence-attempt event, a violence-attempt record, and a death or an injury as a health episode. (`src/simulation/crisis/international.ts#recordViolenceAttempt`)

**Runs in an ordinary save.** No. No caller outside tests. Nothing in play, NPC or player, can attempt violence against anyone.

**Read by.**

1. `src/simulation/press/desk.ts:1260` (How the world changes): Would be covered as a crisis story.
2. `src/simulation/crisis/health.ts` (People and life): Would raise the victim's mortality.

**Should be read by, and is not.**

1. **Someone, including the player, attempting or ordering violence** (How the world changes; handed to its owner). The owner decided the player may initiate or order political violence, shown through existing scenes and text with the violence offscreen. No actor decides to. (question: `political-violence-what-to-ask-the-owner`; handed off: September 23, 2026, brief sent to How the world changes)
2. **Local crime of any kind** (Local crime; open, nobody has taken it). There is no crime system. incident-response.ts is reached only by its fixture, and the incident catalog has no crime kind.

### An enacted law

`an-enacted-law` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Legislation

**Writes.** An enactment action, a legislation.measure-enacted event and a record in history.legislativeEnactments. Nothing about the world itself. (`src/simulation/legislation.ts#recordEnactment`)

**Runs in an ordinary save.** Yes. Every bill that passes in play goes through it.

**Read by.**

1. `src/presentation/tax-policy-transition.ts#recordNewlyEnactedTaxPolicies` (Legislation): Adopts an enacted tax and schedules collection. Collection works in Alaska only: src/fiscal-authority/tax-powers.generated.json holds one jurisdiction.
2. `src/simulation/governing/legislative-clock.ts:511 (appropriationFromEnactedMeasure)` (Nationwide government): Records an appropriation as a public program, read by openAppropriationsFor at state-governing.ts:973.
3. `src/simulation/transit-funding.ts#resolveTransitFunding` (Legislation): Transit service hours, the one causal mechanism the production boundary allows.
4. `src/simulation/enacted-rule-changes.ts#enactedRuleChangeAt` (Nationwide government): Candidacy, term-limit and capability rules read an enacted rule change, but see the missing producer below.

**Should be read by, and is not.**

1. **A measured effect on the world: prices, jobs, coverage, crime, anything a law is about** (How the world changes; waiting on research). assertProductionCatalogBoundary (production-catalog.ts:165) refuses every world metric except campaign support and transit hours, and every causal mechanism except transit's. ChatGPT answered the model (passage, effective rule, covered base, actual payment or service, scoped aggregate response); nothing is built from it. (hook: `src/simulation/production-catalog.ts#assertProductionCatalogBoundary`; question: `policy-effect-model-state-and-local`)
2. **A bill's sponsor meeting the questions it is about** (Legislation; closed). introduceMeasure now records a proposition exposure for the sponsor on each of the bill's propositions, with the filing event as its provenance. It records that they met the question and nothing about which way they lean. (hook: `src/simulation/legislation.ts#exposeSponsorToQuestions`; proved by `src/simulation/legislation-measure-subject.test.ts`)
3. **Everyone else learning what a bill is about: members who vote on it, and the public who read about it** (People and life; handed to its owner). Members who cast a floor vote are not on the vote event's involved people, so their exposure needs the per-member vote record (which #440 changes). Public exposure needs who-learned-what from the press, which the answer to what-should-the-world-do-to-a-person routes through known exposure. (hook: `src/simulation/politics.ts#recordPropositionExposure`; handed off: September 23, 2026, brief sent to People and life)
4. **A law changing a rule of government, such as a term limit or a filing requirement** (Legislation; open, nobody has taken it). The readers are finished (candidacy.ts:363, executive-term-limits.ts:175). The producers are not reached: fileRuleChangeProvision has no caller, and the constitutional workspace only creates proposal-threshold changes (ConstitutionalWorkspace.tsx:91-95). (hook: `src/simulation/enacted-rule-changes.ts#fileRuleChangeProvision`)
5. **An income tax in the other 51 places** (Nationwide government; open, nobody has taken it). Collection needs a tax power for the jurisdiction, and the generated file carries only US-AK with no script that writes it. (hook: `src/fiscal-authority/tax-powers.generated.json`)

### An ethics finding

`an-ethics-finding` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Consequences for corruption

**Writes.** For an adverse public outcome: lost campaign support, restitution, knowledge of the finding for party contacts, colleagues and close contacts, their private responses, and a recheck of earlier denials. (`src/simulation/press/finding-consequences.ts#applyFindingConsequences`)

**Runs in an ordinary save.** Yes. Weekly press sweep through pressProceedingStepHandler (procedures.ts:1007). A complaint can only be about the player; see a-scandal-about-somebody.

**Read by.**

1. `src/simulation/record-in-office.ts:109` (Running for office): Remembered findings lower starting support in the next race.
2. `src/simulation/campaign-life-activities.ts:1166 and campaign-opponents.ts:1086` (Running for office): Party chapters and organizers lean toward declining to help.
3. `src/simulation/press/responses.ts` (Relationships): Contacts privately support or distance themselves.
4. `src/simulation/press/desk.ts:1207` (How the world changes): Allegation stories and proceeding coverage.

**Should be read by, and is not.**

1. **The party's standing with the member: endorsements withdrawn, a primary challenge, leadership calling for resignation** (People and life; waiting on research). Party evolution's body review (living-world/party-evolution.ts:1890) reads no finding. Which public responses follow, and how likely each is, is asked in the scandal-reach question. (hook: `src/simulation/living-world/party-evolution.ts#partyBodyReviewTransitionHandler`; question: `how-far-a-scandal-travels`)

### An international crisis

`an-international-crisis` · counted at main at 130dd113, measured September 23, 2026 · producer owned by How the world changes

**Writes.** A crisis record, a pending decision for the acting office, response stages, war-powers clocks and a conflict-spillover envelope the economy reads. (`src/simulation/crisis/international.ts#declareInternationalCrisis`)

**Runs in an ordinary save.** No. No caller outside tests. The decision handlers are registered (crisis/index.ts:61-63) and the screen is mounted (CrisisNoticesPanel.tsx at PlayerGame.tsx:4582), so everything after the start works and nothing starts it.

**Read by.**

1. `src/presentation/crisis-shell.ts:304` (How the world changes): Shows the pending decision to the player.
2. `src/simulation/macro-economy/sources.ts:172` (How the world changes): Spillover envelope as an economic shock.

**Should be read by, and is not.**

1. **A world development escalating into a crisis the acting office must decide** (How the world changes; handed to its owner). living-world/developments.ts already writes international.development-reported and only trade disruption moves anything. ChatGPT answered: a supported development with actors, interests, commitments and escalation state feeds the existing declaration route. (hook: `src/simulation/living-world/developments.ts`; question: `when-should-an-international-crisis-begin`; handed off: September 23, 2026, brief sent to How the world changes)

### Answering for your office, and resigning it

`resigning-an-office` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Consequences for corruption

**Writes.** A governing.office-consequence event that closes a term when the officeholder resigns. (`src/simulation/governing/office-consequence.ts#recordOfficeConsequence`)

**Runs in an ordinary save.** No. No caller. presentation/office-response.ts builds the five answers (explain, stand by your account, cooperate, decline, resign) and is reached by no screen.

**Read by.**

1. `src/simulation/nationwide-world/state-executives.ts:398 (stateExecutiveVacatedOn)` (Nationwide government): Honors a resignation when naming who holds a state office. It filters on an event type nothing in play writes, so it never matches.

**Should be read by, and is not.**

1. **A player facing a finding choosing how to answer, or resigning** (Consequences for corruption; handed to its owner). The screen and the writer are both built; the answer surface needs a place in the office panel. (handed off: September 23, 2026, brief sent to Consequences for corruption)

### Bills with several subjects, and delegated bill steps

`multi-subject-bills` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Legislation

**Writes.** Bundled clauses composed into one measure; delegated routine steps and a sitting member's floor action (legislative-routine-plan.ts, legislative-current-member-action.ts). (`src/simulation/legislation-bundle.ts`)

**Runs in an ordinary save.** No. legislation-bundle-composition.ts, legislative-routine-plan.ts and legislative-current-member-action.ts have no caller; no screen reaches them.

**Read by.** Nothing outside tests.

**Should be read by, and is not.**

1. **A player drafting a bill with several subjects, or delegating routine steps** (Legislation; open, nobody has taken it). About 2,560 lines built with no route. Wire into DocketWorkspace or trim; the Legislation thread decides.

### Someone moving in or out of town

`a-move` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Migration and big social movements

**Writes.** A migration.moved or migration.arrived event, closed and opened residence facts, and wave beginnings and endings. (`src/simulation/migration/review.ts#reviewTown`)

**Runs in an ordinary save.** Yes. Quarterly review, registered at campaigns.ts:1958, for lives opened at the current world version.

**Read by.**

1. `src/simulation/press/desk.ts` (How the world changes): Wave beginnings and endings are public and can be covered.

**Should be read by, and is not.**

1. **Newcomers bringing their politics, and places changing because of who lives there** (People and life; open, nobody has taken it). An arrival has a name, an identity and a home state, and no party or belief. This keeps growing the unaffiliated population measured on September 22, 2026 (307 of 851 by year six). (hook: `MIGRATION_SEAMS beliefs-carried`)
2. **A wave feeding party evolution** (People and life; open, nobody has taken it). Party evolution reads nothing from waves. (hook: `MIGRATION_SEAMS wave-parties`)
3. **Moving for work, family or cost** (Migration and big social movements; waiting on research). A flat yearly chance with the reason life-course:unrecorded; only unemployment is read, and only through a wave. (hook: `src/simulation/migration/review.ts:174`; question: `migration-rates-and-reasons`)

### Sourced local election and ballot rules

`local-election-rules` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Every town in America

**Writes.** Municipal election law for 51 jurisdictions, and runoff and ranked-choice counting (municipal-ballot-rules.ts#tabulateBallot). (`src/simulation/municipal-election-rule-packs.ts#municipalRulePackFor`)

**Runs in an ordinary save.** No. The three files reach only each other. Play uses a different municipalRulePackFor in municipal-government.ts:574. MUNICIPAL_RULES_AUDIT_GATE keeps the sourced values off candidacy screens until a source audit promotes them.

**Read by.** Nothing outside tests.

**Should be read by, and is not.**

1. **A city election using its own counting rule** (Every town in America; open, nobody has taken it). Gated, not forgotten: the source audit is what closes it, then the election handler reads the tabulator. (hook: `src/simulation/municipal-election-rules.ts#MUNICIPAL_RULES_AUDIT_GATE`)

### Two people becoming partners

`a-couple-forming` · counted at main at 130dd113, measured September 23, 2026 · producer owned by Relationships

**Writes.** A partnership record that twelve other systems ask about. (`src/simulation/life.ts#createPartnership`)

**Runs in an ordinary save.** No. Its only caller is the partnership case of applyCharacterHistoryPlan (character-history.ts:661), whose only producer of that case is the census household bridge, acs-pums-character-history.ts, which nothing imports. No ordinary week forms a couple.

**Read by.**

1. `src/simulation/people-continuation.ts:300` (People and life): Reads existing partnerships for heirs and households.

**Should be read by, and is not.**

1. **Two people who grow close becoming a couple, including a one-night stand** (Relationships; being built in an open pull request). The owner answered on September 23, 2026: both, all the way, and one-night stands exist. (in flight: the Relationships thread is building it)
2. **Real census households for a new character's family** (People and life; handed to its owner). selectAcsPumsHouseholdDonor and applyAcsPumsCharacterHistoryBridge (1,628 lines) have no caller; the family odds at the opening are made up instead. (handed off: September 23, 2026, brief sent to People and life)

## How this document is made

Rendered September 23, 2026 from commit fe63f6e6 by `npm run connectivity:links -- render --write`, one entry per file in `docs/connectivity/links/`. Do not edit it by hand.
