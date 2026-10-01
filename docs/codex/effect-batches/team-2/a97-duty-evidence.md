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

Measured fixture finding: all five cases returned a null enactment outcome because the supplied legislative scenario has no executive office (`/tmp/team2-a97-repair-before.log`). The downstream fixture now records an explicitly supplied signature through the canonical executive-action writer. It does not manufacture an officeholder or restore the production scenario fallback. This proves duty handling after a controlled signature, not an ordinary governor decision.

Measured type finding: two optional duty entries needed checked narrowing, and two spending assertions needed their standing-statute discriminant (`enacted-duties.test.ts:176`). The other-jurisdiction case now uses Iowa's canonical jurisdiction identity instead of an untyped invented ID. Missing records throw; no assertion is discarded.

## What gets built

1. Remove active employment as evidence that a body performed its duty.
2. Write compliance-unknown with unknown basis when the fulfillment join is absent.
3. Preserve both coverage-unknown paths, paired events, existing findings and repeat behavior.
4. Add a counterexample using a named actual worker, plus coverage, Continue and legacy-history cases.
5. Repair the controlled enactment fixture, strict type guards and expected unknown-compliance prose.

## Simulated, records, world pieces, checks

Measured: the fixture generates Erin Pace's opening world and records an actual utility employment relationship. The canonical writers supply an earlier legislative section and a linked duty record (`enacted-duty-evidence.test.ts:86`). These are controlled saved-duty inputs, not a naturally enacted law or a delivered continuity plan.

Measured: two placed utilities have no qualifying fulfillment receipt. One employs Erin and one is unstaffed. Both findings are compliance-unknown; the unplaced utility remains coverage-unknown (`/tmp/team2-a97-main.log:5`). Zero recorded complied findings does not establish that nobody performed the duty in the world.

Measured: the fixture's supplied legacy game-profile finding survives settlement and Continue unchanged (`enacted-duty-evidence.test.ts:250`). That case proves history preservation, not actual performance. The schema and public event family remain unchanged.

## Proof run

Measured: the baseline produced one failed counterexample and three passing preservation cases in 24.75 seconds (`/tmp/team2-a97-before.log`). The failed assertion received complied and game-profile for the staffed utility. That is the defect this patch removes.

Measured historical attempt: four new cases passed, while one selected older case failed before enactment (`/tmp/team2-a97-main.log`). The CTO returned the candidate for repair. That receipt is preserved and does not establish acceptance.

Measured repair: all 12 selected cases passed in 37.24 seconds with 70 unselected cases (`/tmp/team2-a97-repair-final.log`). The selection covers the CTO's five failures, four focused evidence cases and three cases affected by type repairs. No timeout increased or compliance assertion weakened.

Measured reader behavior: unknown performance reads “Of those on record, for 2, whether it was met is not known.” (`enacted-duties.test.ts:247`). The existing reader omits a zero compliance tally when performance is unknown.

Measured: the seed A97-staffing-is-not-performance selected Abeytas, New Mexico, from all 56 starting jurisdiction identities (`enacted-duty-evidence.test.ts:32`). This is one populated world and a generic saved-duty settlement fixture. All-56 populated worlds, ordinary law passage and an ordinary year were NOT RUN.

## Worked example

Measured: Erin Pace works at Staffed Utility in the supplied world. The baseline called that utility compliant merely because the employment record was active (`/tmp/team2-a97-before.log`). The candidate records its compliance as unknown because no qualifying fulfillment record binds the utility to the duty.

Measured: the candidate retains the duty identity enacted-duty-record_6cd93f7e4ec0c2cc, finding IDs and paired events through canonical Continue (`/tmp/team2-a97-main.log:5`). The unstaffed utility also remains unknown. No payment, penalty, filed continuity plan or actual service completion is claimed.

## Method and handoff

Audit gap A97. Repaired runtime source is 0faac89354130399466c9847bd1a2b622def6eaf, composed additively with fetched main 1bcc9a6cbb8024cae4135a55f01aa069942994b5. The A79 state migration remains separate on its published branch. This PR contains the duty guard, focused tests, repaired fixture, release declaration and evidence.

All three changed source/test roots have zero strict diagnostics, repaired from five (`/tmp/team2-a97-repair-after-types.log`). Changed lint, format, whitespace and release validation passed. Zero-dice has zero new findings and five inherited stale entries, exiting 1. The proof artifact preserves the individual validation receipts.

The intermediate repair run passed 11 cases and failed the outdated prose expectation. That receipt remains preserved at /tmp/team2-a97-repair-after.log. Spelling reported 23 existing findings and none in changed A97 prose. The final report requires its mechanical check and Light review before publication.

The guarded native command uses one worker and unchanged timeouts. Full suite, browser, ordinary enactment, year-speed and all-56 populated-world proof were NOT RUN. Next: renewed exact-head CTO review. Positive fulfillment still needs Audit’s approved duty-to-receipt binding. A supplied signature is not proof of an ordinary executive lifecycle.
