# National judicial selection and tenure source

Status: complete

## Authority and scope

- Base: freshly fetched `origin/main` at `48e217cce3929abc1f8c848c70743f5af2a53b0f`.
- Publication reconciliation: rebased without conflict onto freshly fetched
  `origin/main` at `850048dc06ac5a1ee4c08d8f41d286c377707bb5`.
- Research authority: `92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION`,
  Google Drive file `1zHRVfLrHcQuZnmSwpSKIavwuUEH_vIhs`, as of 2026-09-05.
- PR #100 is historical architecture input only. Its unavailable-research and
  five-jurisdiction production-gate claims are superseded by 92L.
- This run creates a Node-only source domain. It adds no simulation behavior,
  judging, ideology, quality scoring, or player UI.

## Implementation

1. Lock the exact 92L packet bytes and keep the packet distinct from the
   first-party legal authorities it reports.
2. Compile every researched jurisdiction/office-family slot with stable IDs,
   explicit office existence, atomic selection stages, ordered reported
   workflows, vacancy mechanics, tenure, renewal, retirement, qualifications,
   and source-state distinctions.
3. Validate the 51-jurisdiction/148-active-office universe, eight explicit
   non-applicable intermediate-court slots, distinctive structural families,
   pipeline ordering, source honesty, and forbidden-concept absence.
4. Regenerate source outputs and documentation, then run focused, full,
   deterministic replay, build/demo, and art validation.
5. Refetch and reconcile current main immediately before publication, publish
   a draft PR, and leave it unmerged for independent judicial source audit.

## Completion evidence

- The exact Drive packet is locked at 406,819 bytes with SHA-256
  `de494b4f778fd47710649a9014718c52247504d90619d67d24a158c12128bf24`.
- Production compilation emits 156 deterministic records: 148 active office
  families and eight explicit non-applicable intermediate-appellate slots
  across 51 jurisdictions. The canonical corpus digest is
  `556d46cc98e4ba578dccf2469cfd08cdeab37a43431028fa6cf85607aa34df02`.
- Focused 92L tests pass: 15/15. Post-rebase 92L plus source-substrate tests
  pass: 34/34.
- The full unit matrix passes serially under shared-host-safe limits: 132 files,
  2,289 tests. An earlier default-parallel run hit nine unrelated five-second
  timeouts and one port collision while multiple worktrees were testing; none
  reproduced serially.
- `source:validate` reports 156 judicial records and zero judicial errors;
  `source:replay` reports every tracked source artifact byte-identical.
- Type checking, the production build, deterministic `validation-seed` demo,
  art validation, the 322-item art inventory, and art QA regeneration pass.
  The output-producing art commands leave no diff.
- The small LEARN pass is encoded in the source-substrate contract: a research
  synthesis, its companion transcription, and the primary authorities it cites
  remain separate evidence layers and cannot silently promote one another.
- Review state is draft and unmerged. Independent judicial source audit remains
  required before acceptance.
