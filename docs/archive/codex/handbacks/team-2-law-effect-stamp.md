# Shared law-effect stamp

MERGED: Not merged. One shared helper for CTO review; consumer wiring remains with the existing owners.

## 1. Why-chain

An audit cannot assign a saved consequence to a law when the writer omits the governing ID. Why? Similar amounts or dates do not establish causation. Why does the writer know the ID? Its canonical LawInForce reader resolved the question for the actual place and date. Why does that reader select a law? Authority, operative dates, hierarchy, repeal and preemption determine the answer. Terminal: an operative legal rule. The stamp preserves that answer's ID; it does not select a decision or claim a consequence.

## 2. Research

The contract reads existing canonical LawInForce fields. It adds no empirical effect size, eligibility assumption or jurisdiction power. Teams' researched effect mechanisms remain required separately.

## 3. Revisions

Starting laws retain their exact starting-law key and origin. Unknown or future law returns null. Old saved records may omit stamps. Source chain IDs remain exact and a stamp alone is not evidence of a completed payment, service or person's decision.

## 4. What gets built

1. src/simulation/law-effect-stamp.ts exports LawEffectStamp, LawEffectContext, LawEffectStampedRecord, lawEffectStamp and isLawEffectStamp.
2. lawEffectStamp(law: LawInForce | null, context: LawEffectContext): LawEffectStamp | null copies measureId to governingLawKey, origin to source, and operativeAt unchanged. Context provides effectKind, questionKey, jurisdictionId, appliedAt and optional sourceRecordIds.
3. Writers attach lawEffectStamps to their existing saved consequence. Existing record IDs for people, enrollment, school, spending, appropriation, commitment, installment, completed transfer and service stay on their original records; sourceRecordIds may additionally preserve this chain. Owners extend only their record types and producers.
4. isLawEffectStamp checks the persisted version, real dates, operative timing, source/key agreement and record ID shape. It does not re-resolve authority or prove an effect occurred.

## 5. Simulated, records, world pieces, checks

SIMULATED: No decisions change in this helper PR. RECORDS: Attribution metadata only. WORLD PIECES: Existing canonical law readers and consumers supply actual inputs. CHECKS: Consumer audits must pair stamps with saved consequences and before/after values. A missing law creates no fabricated key; no consequence creates no effect proof.

## 6. Proof run

Focused fixtures exercise canonical enacted and starting-law identities, copied chain IDs, valid saved round trips, null/future refusal and malformed saved inputs. Nationwide stamped consumer runs are NOT RUN in this helper-only PR. The audit adapter is separate PR #1225.

## 7. Worked example

A curriculum consumer can stamp its actual enrollment charge with its existing LawInForce result and the actual enrollment, school and spending IDs. This is a contract example, not an observed pupil charge or dollar amount. No named-person outcome is claimed here.
