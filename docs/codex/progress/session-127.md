# Session 127: Front collars preserve opaque hair pixels

The supplied front composites preserve fully opaque hair pixels where they
overlap the measured collar band. Turned acceptance remains incomplete because
native inputs are missing. The CTO requested READY for review while retaining
those failures; continue the independent queue without claiming turned proof.

## Resume state

Current item: b24-p1-s3. Branch: codex/session127-b24-p1-s3. PR #2732.
Actual main34bfffa3f1f343524e5a15449beb826fb6358088 is incorporated, including
#2733 and landed hair #2730. Only the add/add resume-marker conflict required
composition. Production assemble.ts and original PNGs are unchanged; main
already contains the collar ordering fix from #2567.

[CTO dispatch 6020522772](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020522772)
requests fresh-head READY. That is the requested review state, not eight-red
acceptance. All missing-view assertions remain; no hair-only exception is
inferred for collars. Complete native turned input or a collar-specific scope
decision is still required before claiming complete turned pixel acceptance.

Fresh executed receipt on producer0f8ec7cceb5f709e508b43bb381682fa331a2afb:
104 native front cases PASS / eight turned-view failures, test EXIT1. Native
fully opaque hair/collar-band overlap16,253 pixels across47 nonempty cells;
current contaminated pixels0. Explicit reconstructed collar-last ordering
contaminates16,230 pixels. This is a reconstruction, not an old render or a
claimed defect in current main. Every failed cell returns front fallback:
both presentations x standing/seated x formal/hoodie outfits. No assertion
removed, skipped or weakened.
[Fresh exact-head receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020637219).
[Native test](../../../src/presentation/appearance-engine/collar-hair-order.test.ts#L1).
Log: /tmp/session127-collar-recovered-test.log.

Changed-file Prettier/ESLint, whitespace, report and release PASS at that head.
This marker correction changes prose only; final publication head and checks
are posted on #2424. Historical187cceb4 had135 PASS/eight missing-input failures,
including31 unchanged appearance-engine tests. Its formatting/type/release
checks and GitHub failures belong to that old head; no historical CI transfers.
[Historical publication receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019954798).

Hair #2730 is merged: producer d8915628fd3404d8cccb762b06f57987897e5706 ->
main34bfffa3f1f343524e5a15449beb826fb6358088 at16:12:40 UTC, under CTO's explicit
input-gap scope. Exact producer changed-file tests57 PASS and format/lint PASS.
No turned proof, visual approval, installed runtime or full repository PASS.
[Hair merge receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020488002).

Cuff draft #2734 at4125bdd2 retains17 PASS/15 mask/turned failures: its broad
junction probe is not a finished cuff alpha mask. Tag work on
codex/session127-b24-p2 is committed/protected; proposed validator tests3 PASS/
one explicit absent art/tags.json failure, no tag data or reader writes.
Session11 keeps vocabulary/manifest/pose-data ownership. Rim draft #2725 remains
blocked on turned inputs and reproduced fringe; no production change.

Next: publish this corrected marker, report CTO-requested READY exact head
and the preserved eight-red gap, then continue b24-p3 independent work while
protecting tag/cuff ownership. Full typecheck/GitHub waiting is not a gate under
[CTO dispatch 6020443625](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020443625).

Exact command from /workspace/game with subprocess execution enabled:

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/collar-hair-order.test.ts --disableConsoleIntercept
```

No collar production fix, turned proof, visual approval, installed runtime,
merge, Steam action or queue completion is claimed.
