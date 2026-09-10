# NEWS-PRODUCERS6 — Normal press producers

Status: completed on `codex/news-help2` / PR #143

## Separated baseline

- Accepted N-1 behavior remains at `4ae3db233ab2e36efc06dfc22ca8fd5f0dcdef95`.
- LAND-ready corpus checkpoint is the separate descendant
  `7077acb75af28ea5777bcad98f8407d69158d8f6` on
  `codex/news-help2-n1-land`.
- That checkpoint excludes the later PRESS4 and producer history. It passed the
  full repository validation gate and was delivered directly to LAND.

## Producer scope

- [x] Project normal reporter candidates only from existing people with a
      current journalism work role and legitimate knowledge of the proposed
      question basis.
- [x] Record a source request/pitch as a canonical limited communication event,
      claim and reporter knowledge; do not arrange merely because a screen was
      opened.
- [x] Require a separate feature-owned reporter decision that explicitly
      accepts the channel, terms, attribution and question basis before
      arrangement; UI supplies no NPC choice or wording.
- [x] Project actual adviser candidates from current colleague roles rather
      than family status; preserve availability and assigned-work checks.
- [x] Produce preparation facts, follow-ups and options from what the assigned
      adviser actually knows; UI supplies no adviser prose.
- [x] Produce post-publication feedback only after the adviser has learned the
      actual saved story; derive the interpretation from the publication and
      confirmed answer, keeping it fallible and non-polling.
- [x] Prove normal request/pitch → consent → arrangement → work/preparation →
      written/interactive/condensed interview → publication/digest/person link
      → save/reload.
- [x] Preserve negative unknown/private/future/no-consent/non-journalist/
      unassigned-adviser/off-record controls and exact wording confirmation.
- [x] Regenerate producer-lane corpus/anchors, run focused and repository gates,
      then publish the later unreviewed producer SHA to #143 and UI #144.

## Ownership

- NEWS owns feature-local producer/domain interfaces and canonical press
  records.
- UI #144 already mounts `PressInterviewPanel` and remains the sole global root
  and navigation owner. This lane adds no panel or root edit.
- Existing `publishPublicEvent` and UI's one legislative publication caller
  remain the only publication writers; this lane adds no publisher.

## Verification

- Corpus: 1,897 templates, 259 warnings, 3,662 unclassified candidates, zero
  hard errors; 55,191 literals across 367 files; 420 live anchors, 445 ever
  issued and 25 retired.
- Focused simulation/public-information/corpus tests: 53 passed.
- The immediately preceding producer checkpoint passed full `npm run validate`:
  197 files, 3,589 passed and 2 skipped; source validation/replay, build,
  deterministic demo and art validation passed.
- The final NPC-agency closure passed format, lint, typecheck, the 8-test
  producer/PRESS4 suite, and generated-corpus check. Another isolated task held
  the shared heavy validation slot; the pushed draft leaves repository-wide CI
  to validate the final head without running a competing suite.
- Art inventory: 329 items; QA contact sheet and report generated.
- Browser suite: NEWS-HELP2 and NEWS-PRESS4 interaction proofs passed. Overall
  290 of 291 passed; the unrelated small-viewport creator case failed once in
  the full parallel run and passed on its exact isolated rerun.

LEARN: save each participant's decision before creating downstream work. A
request identity plus separate reporter and adviser acceptance records makes
consent inspectable without inventing agreement in the scheduling adapter.
