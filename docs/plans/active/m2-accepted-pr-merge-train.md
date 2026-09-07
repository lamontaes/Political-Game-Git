# M2 accepted PR merge train

Authorization: M2 Drive `1VEr2BvmOc9Ai58iYBQh3ocnwY9R6dXuU8FQhXM0MidQ`, activated by the owner after M1 acceptance and merge.

Order follows the latest owner instruction: #113, #114, #116, #117, #111.

For each accepted head, merge live main ordinarily into the existing remote PR branch, retain current-main ownership tests, preserve feature blobs, regenerate combined source artifacts where needed, run focused regressions and full validation, then require exact-head CI before Ready and ordinary merge. Stop for semantic conflicts or failed CI; no broad re-audits.

Initial main: `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`.
PR #113 accepted head: `4adfd7849bd081ad0e302953d679a60b53686976`.

LEARN: verify feature-owned blobs separately from shared generated surfaces; a clean automatic merge does not prove the canonical ownership test was retained.

## Reconciliation record

| PR   | Accepted head                              | Reconciled head                            | Merge commit                               | Passing CI runs          |
| ---- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ------------------------ |
| #113 | `4adfd7849bd081ad0e302953d679a60b53686976` | `a62394ebb0614dbf0624a99ad776e1219a6ca0b2` | `414b24ce6120799985d3b0bddbf196c9c064df36` | 34074482917              |
| #114 | `93b797d749b26e30f50377c065beb60b41e67ec6` | `50a6200c2ab592f39beab0721c7cbacade383faf` | `1a91101ab4f5369aeec21c6e9f32c21114794c81` | 34075842107              |
| #116 | `4123edcbf9d06ef70b92758fb24c439e3c5d707d` | `2487c19dda6f3668d850c158cce6460736f7e3fe` | `9c36b2fb9f559db8c1cdc45ce98f7305c949f0ad` | 34077096091, 34077093521 |
| #117 | `ee59f79e485ab53e8bbc0f8d0da12b2e57eeff50` | `3fa83c2d60c4704cefce00b3fa7be5aeb850ca08` | `4f12772d25d26587e988f90418e56aedbb97a64a` | 34078491289, 34078488901 |

All feature-owned files compared byte-identically with their accepted heads.
The ownership test was explicitly restored from current main in every branch.
Shared source manifests were regenerated from the combined domain tree; additive
source documentation retained each domain. No production gate or source evidence
was weakened.

Local full validation passed with `VITEST_MAX_WORKERS=1`: #113 2392 tests,
#114 2460 tests, #116 2475 tests, #117 2502 tests. Each also ran art inventory
and QA. Initial parallel #113 validation attempts hit default five-second
timeouts; all affected tests passed in isolation and the unchanged full suite
passed with one worker. Test timeouts and repository configuration were unchanged.

Concurrent activity: another task merged #115 at `333eeb12b3df4322aaebe6dfa987a653bf143223`
while #116 CI ran. The pre-merge fetch observed it, but #116 was merged without
another branch reconciliation. Its seven additive files did not overlap #116's
source feature. The subsequent #117 reconciliation and both passing CI runs cover
the combined tree. This deviation is recorded rather than claiming #116's
reconciliation head contained that later main commit.

Final cargo #111 starts from accepted `fdaaf2a857f564e806e102c0c27a23f78bd31b30`
and merges `4f12772d25d26587e988f90418e56aedbb97a64a`. Its substantive files
remain byte-identical; only the canonical shared ownership test is reconciled.
The final exact-head CI and merge outcome are recorded in the task completion
report after the result exists; this document does not predict acceptance.

LEARN refinement: make current-main ancestry an executable pre-push and
pre-merge guard. A successful fetch alone does not prevent merging a head whose
CI predates another writer's main update.
