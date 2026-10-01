# Measure the monthly money calls before changing them

The full money route still exceeds its existing budget. This private diagnostic measures the three Team 7 calls so the next repair can follow observed costs. It does not change game state or remove checks.

## What it measures

The timer records calls, failures, inclusive milliseconds and exclusive milliseconds. Exclusive time subtracts only nested measured calls; it does not remove unmeasured child work. The salary label covers only the released salary initialization call in refresh. The schedule label covers the public ensure function. The monthly label covers the actual monthly handler. No extra registry, retry, writer or clock operation is introduced.

The final test hook prints TEAM7_C9_OWNED_CALL_COST. All 19 original assertions and the 60-second test budget remain. The 30-second setup budget also remains. No diagnostic runtime has run locally; Audit is the sole operator. Timing instrumentation can affect elapsed time, so a diagnostic result is not uninstrumented performance acceptance.

The patch is a delivery artifact under docs, not a production source change. It must not be installed in the game or merged as a simulation mechanism. No serializer, history or evaluator edit is authorized.

## Operator route

Apply the patch only to Audit’s current-main composition with the exact owned C9 hunks from PR #1353. The source head is 0512d39e136367c3d3e4d599f0f92b14a7bd8118. Verify the source hashes or review any current-main context difference before applying. Do not copy an older whole life-opportunities file over newer work. Restore the original bytes after the runner is terminal.
