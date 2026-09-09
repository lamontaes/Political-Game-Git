# LAND-WAVE4 landing manifest

Status: active. This manifest records the finite accepted-work landing sequence
authorized by FINISH-WAVE4 section A. It does not grant semantic, editorial, or
visual acceptance beyond the independent decisions named below.

## Sequence

| Order | PR   | Accepted input head                        | State                                                                                                     |
| ----- | ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1     | #90  | `8d59622214c60a71aa8a642f344955d4419e8665` | composed with main `6b95f3713590f18973e5e54a3da86e6cd66aa734`; required gates passed; publication pending |
| 2     | #132 | `ca468153a765d35ea9b250be19a96856ba93853d` | queued independently after #90                                                                            |
| 3     | #139 | `2fa21d77586955a615e164e00c8c083266bda17b` | queued independently after #132                                                                           |
| 4     | #129 | `39d60da9f916a5f82db3a33b1dd8ebcfe0b36170` | W-1 repair required, then narrow independent recheck                                                      |
| 5     | #135 | `cd90ef187e80e417ccade95582f16a26dddded32` | stacked on #129; retarget only after #129 lands                                                           |

## Preserved gates

- #90, #132, and #139 carry independent technical READY verdicts and successful
  exact-head validation recorded by ACCEPT-WAVE3.
- #129 retains its accepted P2R2 runtime semantics and original
  `pr79-ordinary-baseline` seed. W-1 concerns only whether the regression
  control independently distinguishes valid initialization identity movement
  from wording changes.
- #135 retains its independently cleared campaign clock repair and recorded
  nonblocking caveats. Mergeability into #129 is not main readiness.
- No merge uses administrator bypass, force-push, branch deletion, release
  activation, or self-authored semantic acceptance.

## Completion rule

For each entry, refresh the live PR head and main, preserve the accepted input
in the composed tree, run the required changed-seam and repository gates, then
perform an ordinary merge commit with the exact expected head. Fetch the new
main before beginning the next entry. Move this plan to `completed/` only after
the finite sequence ends or record an exact unresolved gate.
