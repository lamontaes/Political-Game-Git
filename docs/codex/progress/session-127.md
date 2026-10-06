# Session 127: Preserve existing behavior while tags arrive

An independent tag validator captures current dress-code and title behavior.
The existing tag owner still controls the vocabulary and manifest data. The
proposed validation boundary remains unconfirmed, so no reader or tag data was
changed. Continue the independent work while preserving that ownership.

## Resume state

Current item: b24-p2, independent reader/validation portion only.
Branch: codex/session127-b24-p2. Original base ae27b4da on main; actual
landed main 34bfffa3f1f343524e5a15449beb826fb6358088 is now incorporated.
Only the add/add resume-marker conflict needed resolution; retained this task
marker while recording the landed hair result below. No owner data/reader edit.
[Claim and owner boundary question](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020272903).
Session 11 retains art/tags.json, backdrop tags and pack pose-data ownership.
The new [test](../../../src/presentation/backdrop-tags.test.ts#L1) proposes twelve
closed lists directly on tags.json, row.tags values as strings/string arrays,
and reuse of campus region/climate/terrain values. Reconcile the actual owner's
schema before treating this proposal as a landed API. No invented place tags.

Executed baseline on main ae27b4da: 117 places, 346 backdrop rows. SHA256 snapshots
cover every dress-code result, civic kind and full fixture-URL title rotation,
without a hard-coded place list. Test result: three passed / one failed. Closed
value rejection and existing behavior parity pass; the explicit missing
art/tags.json assertion fails. PLACE_RULES/KIND_RULES and production readers
remain unchanged. No tag migration or READY claimed.
[Executed baseline/test receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020325155).
Logs: /tmp/session127-tag-baseline.log and /tmp/session127-tags-landed-test.log.
Actual landed-main validator run remains three passed / one missing-vocabulary
failure. Changed-file formatter, ESLint, diff, no-dice and release checks pass.
Focused strict TypeScript with noUncheckedIndexedAccess also passes.
Strict validation initially found undefined-list typing in the test; the guard
is corrected. Final changed-file checks run on the resulting published head
under CTO 6020443625; full typecheck is a separately reported supplemental check.

CTO dispatch 6020150829 requires actual #2733 landing before repository gate
recovery. The merge is now verified: 99f04b3113ba7604707b9e06ff7472f520f356d0,
producer 871ff86ad018a91055d59fc808cbffd2da1ac3f1, merged at 16:04:58 UTC. Receive
current origin/main, preserve this committed independent work, and update the
existing owned branches. Execute required checks at every resulting exact head;
never transfer old CI or duplicate clock/trait repairs. No merge authority used.

Existing queue artifacts:

- Hair #2730 is merged under CTO input-gap scope: producer d8915628 -> actual
  main 34bfffa3f, at 16:12:40 UTC. Exact producer changed-file 57 tests/format/lint
  pass; no turned proof, visual approval, runtime or full repository PASS.
  [Merged receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020488002).
- Collar #2732 is READY for CTO-requested review at fa83b89e: actual fresh
  changed-test result 104 pass / eight absent turned failures, format/lint pass.
  Native current opaque collar-band overpaint zero; explicit failures retained.
  READY is not eight-red acceptance or an inferred hair-only exception.
  [Final review receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020703617).
- Cuff draft #2734 at 4125bdd2: 17 pass / 15 mask/turned failures. Its broad
  junction probe is not a finished cuff mask; production and source art unchanged.
- Rim draft #2725 at ef9d9ed6: four front cells pass with zero near-white rim;
  four missing turned cells fail. Production unchanged pending reproduced cause.
  Each branch has its detailed resume marker and exact scoped board receipts.

Next command from /workspace/game with subprocess execution enabled:

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/backdrop-tags.test.ts --disableConsoleIntercept
```

Finish changed-file checks, publish the bounded validator as a draft, reconcile
Session 11's actual vocabulary schema and reader boundary, then continue the
independent queue at b24-p3. No waiting on a full typecheck or GitHub acceptance
gate under [CTO dispatch 6020443625](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020443625).
Missing owned tags remain an explicit input/interface gap, not silently skipped.
No installed runtime, visual approval, Steam action or queue completion claimed.
