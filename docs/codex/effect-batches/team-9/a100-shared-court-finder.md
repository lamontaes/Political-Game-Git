# Court cases use their saved venue

Criminal sentencing, eviction hearings, and law review now share one saved-court lookup. A criminal defendant's residence or a loose state key cannot replace the case's actual venue. Eviction judgments retain the previously published actual court, seat, tenure, and judge join. Federal trial cases remain unsupported without an actual forum binding; national court lookup alone does not establish authority to rule on a federal law.

MERGED: Nothing from this candidate.

WHAT EMERGED: DECIDED — the saved judges selected jail in the controlled cases, recording “They had been found at fault for the same thing before. The offense was violent.” HARDWIRED — ordinary sentence months still come from the labeled UNRESEARCHED rule in `prosecution.ts:219`; these cases do not supply A103 statutory applicability. Missing links are listed below.

VITAL STATISTICS: Five seeded criminal venues, five seeded civil places, all 56 court-family lookups, and 16 passing bounded cases. No nationwide outcome rate is measured.

## 1. Why-chain

A judge can decide a case because an actual dated seat tenure supplies that judge. That tenure belongs to a saved court. The case's saved venue determines which court family is relevant. The old callers separately reconstructed that court family from a state key, a jurisdiction alias, or a generated court ID. The replacement reads one indexed set of saved courts and refuses a missing or ambiguous binding. The chain bottoms out at saved venue, court, seat, tenure, and person records. It does not bottom out at a defendant's home or the first federal district in ID order.

## 2. Research

The court identities and selection profiles already exist in the admitted judiciary data. This change introduces no sentence range, eligibility threshold, court boundary, or judge. The existing state court-family abstraction remains: it is not an exact local trial district. The saved Supreme Court has its existing game-profile identity; this patch does not relabel it as newly researched geography.

All nine existing researched review questions have state or state/local authority in the current powers data. None provides an admitted federal review question. An actual federal-law ruling therefore remains a separate Audit/CTO dependency even after the old national skip is removed. Missing authority is not inferred from the existence of a federal court.

## 3. Revisions

The shared lookup keeps the existing legal-jurisdiction to court-jurisdiction alias, including D.C. It preserves the noncriminal highest-court selection for law review. A unique saved Supreme Court can answer the national court query. Federal trial lookup requires an exact saved jurisdiction binding and otherwise returns null.

Criminal cases read their saved venue; judge recusal, dated seat holders, and the existing docket rotation remain. Civil court selection delegates to the same lookup while retaining the actual dated judicial join. The published A102 guard and provenance are carried through narrow patches; landlord selection, lease, payment, and counsel producers are not extended.

## 4. What gets built

1. Add one indexed `courtFor` lookup over saved courts.
2. Replace the separate court-selection logic in review and criminal judge callers.
3. Remove the national-law skip while preserving question-authority and seated-justice checks.
4. Delegate the released civil court-selection hunk on the reconciled A102 guard.
5. Prove the existing court family in all 56 places and actual saved criminal cases in five seeded venues.
6. Renew the unchanged five-place civil actor fixtures on this composition.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing judges retain their existing decision inputs and choices. RECORDS: the saved referral venue, court, dated seat tenure, judicial actor, sentence, filing, and judgment remain the evidence. WORLD PIECES: admitted court and person records supply actors; a missing bench leaves judicial action pending. CHECKS: state-family parity, actual sentence writer output, vacated-bench pending cases, civil judgment provenance, and canonical save/reload and repeat behavior.

The ordinary sentence length remains the labeled UNRESEARCHED rule. This is not A103 completion. Audit confirmed that a generic offense does not supply the researched weapon, injury, dwelling, damage, prior-conviction, or grid predicates. CTO must supply the actual applicability record and numeric judge-choice contract before that path can be replaced.

## 6. Proof run

The focused finder fixture uses `team9-a100-saved-court-finder-20261001` to select North Dakota, Massachusetts, Hawaii, Iowa, and California from all 56 places. It uses the actual saved state-court jurisdiction in the observer world. This is a controlled case fixture, not a claim that the sampled town was independently populated.

The first run retained six passes and five failures because its authored referrals referenced unsaved towns. The repaired run passed eleven cases across finder and existing review tests. A subsequent seven-case finder run added actual sentence-actor and motivation assertions and passed. These source-bound receipts are retained separately. The final composition passed all 16 cases in 190.03 seconds: seven finder/canonical criminal cases, four existing review cases, and five civil actor cases. Its exact saved records and test durations are in `a100-shared-court-finder-proof.json`.

No test time limit is raised. A nationwide play run, year run, federal-law ruling, and federal trial forum assignment are not established here.

## 7. Worked example

Anika Terry's controlled North Dakota referral names the actual saved state-court jurisdiction. The case reaches charging on March 6, 2026, and its saved plea reaches the trial boundary on July 4, 2026. The actual judge must appear on the sentence record and hold a seat of the selected court on that date. In the branch with that bench vacated through the canonical writer, no sentence may be recorded. Repeat and reopening preserve the original sentence event.

The civil fixtures separately require a saved filing and an actual seated judge before any judgment. Court, seat, tenure, and filing identifiers remain provenance tags; the judge remains a person participant. No lawyer is inferred from an answer or a statute.

## Source and remaining work

Base: main `59ce2b5571eb598d62856b56e22402040e624fea`. Owned finder/review/criminal checkpoint: `df1cc3cb174e96defa0d086bd990374afbb1f906`. Civil composition: `6a464573f5bb8b8767b0254fd72e4f8d46411aa8`.

The civil guard is the already-published A102 source at `5fd1c48a5e8074cd5a7fc9d946fee256364a8271` from #1546, applied as narrow patches. Against that exact rent file, A100 changes only the released court selection and imports. Its civil test blob remains `db7f5604d615d2b8e30692bd6c560a52d8290138`. Team4's unpublished landlord work is not copied. The A102 and A10 branches and both intake files remain preserved.

Remaining A100 gaps are the admitted federal review question/precedent binding and actual federal trial forum. A103 remains blocked on the explicit schema and decision contract; A10 load recovery remains separately routed to Audit. No merge, full-row closure, or new runtime rate is claimed.

Scoped TypeScript checked 1,152 files with 0 diagnostics. Six-file lint and formatting, zero-dice, diff check, and the report checker passed. Release-check disposition is recorded separately after the committed declaration comparison.
