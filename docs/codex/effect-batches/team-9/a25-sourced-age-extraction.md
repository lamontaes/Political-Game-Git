# The existing notes contain ages the yes/no reader loses

The candidate table preserves the numeric juvenile ages already documented in the repository. It contains 54 cited numeric notes and two unadmitted numeric ages. Vermont's note says juvenile jurisdiction generally extends through age 18, so its general adult threshold is 19. The current yes/no reader returns 18 there. This extraction changes no runtime reader and grants no transfer permission. Audit must supply the dated reader and actual saved transfer contract before admission.

## Acceptance and observed behavior

MERGED: None of this candidate.

WHAT EMERGED: HARDWIRED — juvenile-court.ts:38 still converts a yes/no answer into 17 or 18. This table does not change that code. No new game outcome or watched case is claimed.

VITAL STATISTICS: All 56 places are represented. Fifty-four rows have a numeric age stated in a cited note. American Samoa and USVI retain the source's estimated yes/no status but have no admitted numeric age. Zero rows or transfer rules are admitted at runtime.

## 1. Why-chain

The future age reader must use the actual case jurisdiction and date because those determine which legal rule applies. The numeric rule must come from a source record rather than from a yes/no answer. An adult threshold derived from an inclusive juvenile upper age is that upper age plus one. This arithmetic preserves the note's meaning without inventing an age. Transfer exceptions require their own recorded offense predicates and actual authority decision. The chain ends at a cited legal rule and, where required, a saved court or prosecution decision.

## 2. Research

This is an extraction of existing evidence, not new source research. The source is starting-law-2026.json, question us-policy-positions:justice-public-safety.raise-juvenile-court-age, at blob efe4f1fabf3b4ca90831c278af5740e0b78d3554. Every numeric row preserves its original note, URL, citation where present, answer and source status. The OJJDP rows describe the end of the 2023 sessions; the source's stated primary checks and limitations remain visible. No new current-law verification is claimed.

Louisiana and Vermont have explicit operative dates in the source records. Other rows have no invented effective date. Vermont's note also states a later statutory change date but does not state the resulting age. That future age remains unadmitted. American Samoa and USVI have only estimated answers after unsuccessful source access; neither becomes a fabricated numeric age.

## 3. Revisions

The candidate stores the inclusive juvenile upper age separately from the derived general adult threshold. It preserves the source's estimation status. Known exception notes for D.C., Puerto Rico, CNMI and Vermont remain raw evidence. They are not translated into runnable offense lists, discretionary decisions or transfer permissions. Every place explicitly marks transfer coverage incomplete.

## 4. What gets built

1. Extract stated numeric ages from existing notes into the owned candidate table.
2. Preserve original source identity, status, notes and explicit effective dates.
3. Keep AS/VI numeric ages and Vermont's post-change age unadmitted.
4. Mark complete transfer coverage and actual transfer decisions as missing.
5. Ask Audit for the single dated numeric-age reader contract before changing juvenile-court or its existing offender consumer.

## 5. Simulated, records, world pieces, checks

SIMULATED: nothing new in this data-only checkpoint. RECORDS: the source notes and candidate rows are evidence. WORLD PIECES: the existing saved incident date, jurisdiction, person birth date and court/referral records must supply the eventual reader's context. CHECKS: every row reconciles to its existing note; no bool-to-age fallback or fabricated date is introduced.

No legal-outcome registration, new court finder, crime writer or shared map is changed. The existing adultCourtAgeAt consumer remains unchanged until its contract is admitted.

## 6. Proof run

A source-reconciliation check compared all 56 candidate rows with the existing source. It verified 54 exact numeric extractions, both unadmitted ages, all source notes and URLs, explicit dates, the Vermont threshold derivation, and zero runtime/transfer admissions. This is data verification, not an executed game case. Native, browser, year, nationwide and final-main runtime checks are NOT RUN.

## 7. Worked example

The Vermont source note says “Through age 18” for its general rule. The candidate therefore stores juvenile upper age 18 and derived general adult threshold 19. It retains the note's serious-offense exception and future amendment limit. It does not claim that a particular 18-year-old may be charged in adult court, or invent a transfer decision.

## Ownership and reader question

The second-pass Fable boxes map to the existing ordered A103 → A25 → A104 → A102 build. B-J15/B-J16 use actual conviction and detention records; prosecutor decisions belong to A104 and any actual work ending needs Team3's saved work writer. B-J17 must keep state and federal custody distinct. B-J11 needs actual repeated-case evidence, and B-J19 needs an admitted officer jurisdiction/denominator contract. Quick list (a) reader registrations belong to Claude Sonnet. Suggested proxy retargets, new draws, drift and invented weights are not admitted. This candidate changes no imports, so it does not introduce a campaign-clock module cycle.

The two A103 questions and this Audit reader request were appended to 00d and verified by connector readback: minimum-over-ceiling precedence and the exact-120 fixture's expected behavior. A103's existing assertions and production bounds remain unchanged pending those decisions.

Owned files are the Team9 candidate table and this handoff. The branch preserves A103 #1621 at 265bf5c6eeaa15ba31d8295a566c2a3bf75a9d6c and A105 #1627 at 4c15b487715d8318f575fe840aaa0838c0993443. Both unrelated intake files remain preserved. The source file is unchanged.

@AUDIT / @COORDINATOR: confirm the single adultCourtAgeAt reader input and output. Input must bind the actual saved incident or case jurisdiction and date, not the person's home, plus sourced numeric age/effective interval and any operative final enacted numeric age term. Specify whether the term is the inclusive juvenile upper age, its canonical key/unit, unsupported-result behavior, repeal to the dated sourced base, and the existing consumer's pending behavior. Transfer admission additionally needs the actual offense/grade predicates and saved authorized transfer or charging decision. Do not infer permission from a generic robbery, missing value or a bool answer. No runtime implementation begins from this candidate alone.
