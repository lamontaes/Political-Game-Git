# Shared hunks needed for continuous principle strength

The recorded-life repair still produces too few individual views. The next
change gives each held principle a continuous strength, but it needs narrow
shared-file reservations before implementation. No shared source has been
edited. These proposed claims preserve the other teams' governance work.

## 1. Why-chain (five whys, to bedrock)

The three readers currently turn conviction labels into integer weights.
Those labels come from summed authored life pulls. Many people share the same
few inputs, so their recorded views collapse into a few profiles. A party cue
is now below the formation threshold, but sparse lives and stand-in mappings
still drive that result. The terminal finding is authored pull size and sparse
individual evidence. Continuous arithmetic alone does not supply missing lives
or establish realistic variation.

## 2. Research

CTO September 30, 3:05 a.m. authorized strength in [0,1] and direction from
net opposing pulls. Agreeing pulls combine as one minus the product of one
minus each weight. Reinforcement comes only from new recorded experiences.
The three readers use strength times four. Authored stand-ins are flagged in
developer data, and old saves need no conversion. Team 9 retains socialization
sizes and ranges. No empirical coefficient is claimed here.

## 3. Revisions

The new PR starts from the held principle branch, not the held law branch.
Repeated reads of the same experience must not strengthen a view. Identical
inputs must not append new rows; later consistent or contradicting recorded
experiences must change the result and retain their evidence references.
A party cue alone remains below formation threshold. There is no calendar
fade, no population-target fill and no conversion of saved categorical rows.
Categorical fields can remain for existing displays; the three named readers
consume strength. Required new fields also require explicit fixture updates.

## 4. What gets built, in numbered parts

All locations below are relative to #1184 source head
`33e6fe5850c28957556814d66db1929309018cc8`.

1. `src/simulation/types.ts`, PrincipleRecord at line 1031 only: add a numeric
   strength field; existing stance supplies direction. Do not modify
   BeliefConviction, PoliticalBeliefRecord or unrelated records.
2. `src/simulation/history.ts`, PrincipleRecordInput at line 179 only: carry
   strength. The append functions spread this input already, so no ID,
   sequence, indexing or batching rewrite is proposed.
3. `src/simulation/politics.ts`, checkPrincipleInput at line 242 only: validate
   finite strength within [0,1]. No belief or position validation edits.
4. `src/simulation/world.ts`, principle-record loop at line 3454 only: apply
   the same strength invariant. No other integrity traversal or cache edits.
5. `src/simulation/governing/officeholder-principles.ts`: remove its ordinal
   CONVICTION_WEIGHT use at line 22 and replace weighting in principledLeaning
   at line 104, principleAgreement at line 236 and
   spendingPrincipleConsideration at line 312 with strength times four.
   Preserve VOTE_IMPORTANCE, agenda thresholds and unrelated Team 2 behavior.
6. Already-owned `src/simulation/principles-from-life.ts` and its test:
   PrinciplePull, principlesFromPulls, evidence deduplication and canonical
   row append/change comparison. Read strength from recorded support and
   preserve controlled choices. Add meaningful reinforcement, opposition,
   repeated-read and no-causeless-decay cases.
7. New exclusive paths proposed: `src/simulation/principle-strength.ts` and
   `.test.ts` for the pure agreeing/opposing combination;
   `data/research/politics/life-principle-pulls.developer.json` for authored
   stand-in definitions and flags. This file must distinguish researched
   evidence from authored values; no research range is invented.
8. `src/simulation/demo.ts`, the synthetic recordPrinciple fixture only:
   explicitly supply its fixture strength. No normal-world producer edits.
9. Tests: owned officeholder-principles.test.ts for all three readers;
   political-beliefs.test.ts for invalid/valid strength and append preservation.
   The remaining required-field fixture hunks are listed below for routing.

### Shared fixture paths discovered at the same source head

- src/presentation/constitutional-subjects.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/presentation/ordinary-local-fiscal-proposal.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/presentation/ordinary-local-service-outturn.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/agenda-producers.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/article-v.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/local-county-member-agenda-integration.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/local-law-clock-parity.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/local-law-money-reaches-executive.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/local-member-agenda-integration.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/governing/supreme-court-appointments.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/living-world/political-reflection-roll-call.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/living-world/political-reflection.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/political-beliefs.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/principle-packing.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.
- src/simulation/subjective-belief-formation.test.ts — principle input/record fixtures only; add an explicitly authored test strength, keeping the scenario and expected behavior.

These are proposed reservations, not permission to overwrite another writer.
The existing assertions stay intact. If compiler discovery reveals another
shared fixture, report that exact path before changing it.

## 5. Simulated, records, world pieces, checks

SIMULATED: life facts and recorded experiences influence views; existing
agenda and vote decisions read the resulting rows. RECORDS: history keeps
strength, direction, supersession and formation evidence. WORLD PIECES:
existing family, work, faith, residence and event ledgers are reused; richer
individual-life coverage belongs to Team 3. CHECKS: formation boundedness,
evidence idempotence, reinforcement/opposition and the same month metrics.
With no supported pull, no view is invented.

## 6. Proof run

NOT RUN for continuous strength; it is not implemented. The published
categorical comparison is in team-1-principle-month.md and its JSON. After
ownership clears and the new source is built, rerun the same seed, random
observer and random-state sample against its exact parent, with both source
identities recorded. Full-year, browser and law-money proof are separate.

## 7. Worked example

The actual prior run includes 2,390 principle rows whose formation notes cite
only a party cue and public-service work. That explains a repeated profile;
it is not evidence of a personal decision or a calibrated continuous strength.
No new named-person outcome or dollar amount is invented for this proposal.

## Next bounded step and method

Coordinator reserves the listed hunks and routes shared fixture edits. Then
Team 1 builds the separately authorized PR atop the held principle head,
runs focused tests with at most two workers and the same-seed month comparison,
and keeps it held if variation or filings fail. This packet changes only a
Team 1 document; no source, shared claims table or external document is written.
Independent helper review remains NOT RUN under the handoff's no-helper limit.
