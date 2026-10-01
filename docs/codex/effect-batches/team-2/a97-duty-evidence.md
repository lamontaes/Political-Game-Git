# A worker no longer proves a legal duty was fulfilled

Before: A covered organization with an active worker was recorded as having complied with a duty. The worker's employment was the only evidence.

After: Without a qualifying fulfillment record, the body's compliance remains unknown. Unknown coverage and prior findings are preserved. This repairs new false compliance findings; positive fulfillment still needs an approved receipt binding.

## Why-chain

Measured source finding: the old settlement reader called hasWorkers and wrote complied when it found active employment (`enacted-duties.ts` before this patch, line 458). Employment says who works for the organization. It does not say that the person filed the required plan, made a report or delivered a service. The staffing assumption supplied an action absent from the record. Bedrock finding: an unsupported claim of legal performance.

Measured source finding: the candidate retains compliance-unknown for a placed, covered body without qualifying evidence (`enacted-duties.ts:442`). It preserves coverage-unknown where the body's location or applicability test is missing. An unknown finding establishes neither performance nor a breach.

## Research

Measured source-contract finding: Audit identified no approved fulfillment receipt joined to duty, measure, provision and organization. Its A97 contract calls for existing compliance-unknown until that join is admitted ([Audit contract in 00c](https://docs.google.com/document/d/1L5IksyT3b-NydhTq8Px3pVT4s8MxCZ9oAj-wqNm5AM4/edit)). This patch adds no legal deadline, rate, penalty, budget amount or success mechanism.

## Revisions

Measured source finding: the old employment helper and its imports are removed (`enacted-duties.ts:19`). The writer's existing one-finding-per-body guard remains. Saved game-profile findings are not rewritten, including historical staffing-based claims. Correcting those prior claims or upgrading unknown to fulfilled needs a separate approved record contract.

Measured source finding: the old presentation fixture still cannot reach enactment before settlement (`enacted-duties.test.ts:128`). It failed on unchanged A97 source and again on the candidate with the same null outcome. Its compliance assertions now require unknown for both utilities; the unrelated enactment fixture has not been bypassed or weakened.

## What gets built

1. Remove active employment as evidence that a body performed its duty.
2. Write compliance-unknown with unknown basis when the fulfillment join is absent.
3. Preserve both coverage-unknown paths, paired events, existing findings and repeat behavior.
4. Add a counterexample using a named actual worker, plus coverage, Continue and legacy-history cases.
5. Correct the old compliance assertions and disclose their existing enactment failure.

## Simulated, records, world pieces, checks

Measured: the fixture generates Erin Pace's opening world and records an actual utility employment relationship. The canonical writers supply an earlier legislative section and a linked duty record (`enacted-duty-evidence.test.ts:86`). These are controlled saved-duty inputs, not a naturally enacted law or a delivered continuity plan.

Measured: two placed utilities have no qualifying fulfillment receipt. One employs Erin and one is unstaffed. Both findings are compliance-unknown; the unplaced utility remains coverage-unknown (`/tmp/team2-a97-main.log:5`). Zero recorded complied findings does not establish that nobody performed the duty in the world.

Measured: the fixture's supplied legacy game-profile finding survives settlement and Continue unchanged (`enacted-duty-evidence.test.ts:250`). That case proves history preservation, not actual performance. The schema and public event family remain unchanged.

## Proof run

Measured: the baseline produced one failed counterexample and three passing preservation cases in 24.75 seconds (`/tmp/team2-a97-before.log`). The failed assertion received complied and game-profile for the staffed utility. That is the defect this patch removes.

Measured: all four new cases passed in the 53.75-second combined command on the candidate composed from fetched main (`/tmp/team2-a97-main.log`). The combined command also selected one older integration case, which failed at its existing enactment assertion; 77 unrelated cases were deliberately unselected. The command exited 1 and is not an all-green integration result. No assertion was removed or timeout increased.

Measured: the seed A97-staffing-is-not-performance selected Abeytas, New Mexico, from all 56 starting jurisdiction identities (`enacted-duty-evidence.test.ts:32`). This is one populated world and a generic saved-duty settlement fixture. All-56 populated worlds, ordinary law passage and an ordinary year were NOT RUN.

## Worked example

Measured: Erin Pace works at Staffed Utility in the supplied world. The baseline called that utility compliant merely because the employment record was active (`/tmp/team2-a97-before.log`). The candidate records its compliance as unknown because no qualifying fulfillment record binds the utility to the duty.

Measured: the candidate retains the duty identity enacted-duty-record_6cd93f7e4ec0c2cc, finding IDs and paired events through canonical Continue (`/tmp/team2-a97-main.log:5`). The unstaffed utility also remains unknown. No payment, penalty, filed continuity plan or actual service completion is claimed.

## Method and handoff

Audit gap A97. Runtime source is 836450e63f0a65ebca8b424cc1d13384fc9af592, based directly on main 493621af2e9ddb4fb7429c49747fceb61372a9f3. The earlier A79 state fixture and federal candidate remain on their preserved branches. This PR contains only the duty guard, focused tests, corrected compliance assertions, release declaration and evidence.

The repaired production file and new test have zero diagnostics across two strict roots. Including the older presentation test produces the same five diagnostics before and after the patch. Changed lint, format and whitespace passed. Release validation passed. Zero-dice has zero new findings and five inherited stale entries, exiting 1. Spelling found 21 inherited findings and none in the A97 files. The report passed its mechanical check and Light review.

The guarded native command selects the four A97 tests plus the old duty-recording case, with one worker and unchanged timeouts. Full suite, browser, ordinary enactment, year-speed and all-56 populated-world proof were NOT RUN. Next: exact-head review of the negative guard; Audit supplies the positive receipt binding and old enactment-fixture contract. Audit has now supplied the A79 saved-state roster contract. The state member-vote migration is the next independently authorized endpoint.
