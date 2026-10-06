# Session 127: Front hair clears measured face-side overlap

The front-hair candidate clears measured overlap on every supplied front style
while preserving bangs and original art. Turned inputs remain missing. The CTO
authorized explicit input-gap reporting while retaining pixel checks for any
supplied turned layers. Continue the independent queue after the scoped checks.

## Resume state

Current item: b24-p1-s2. Branch: codex/session127-b24-p1-s2.
Base: ae27b4da00da3d9391a9d4c34776f1ef28f436cc on main.

Previous item b24-p1-s1 is published as draft PR #2725, exact head
ef9d9ed6e290398fd5cf8def16856e539628fcbf. Its native composite harness passed
four front cells with before=0 and after=0, and rejected all four missing turned
cells. assemble.ts is unchanged because no supplied front cell reproduces the
fringe. Its resume marker remains on that branch.

Claim for b24-p1-s2 is delivered on #2424, comment 6019027259. Session 11 received
the exact hair-layering boundary question there; manifest/tag files are untouched.
Native measurement reproduced opaque face-side overlap in 24 of 26 styles. The
candidate modifies only pack.ts hair layering, measuring the selected face's
widest opaque row and clearing front-hair alpha in the outer quarters of the
face below it. The mask follows actual face support below the body neck anchor.
Bangs, RGB, back hair, body anchors and original PNG files remain unchanged.
The mask writer is [pack.ts:1007](../../../src/presentation/appearance-engine/pack.ts#L1007).

The new source-bound native test covers all 26 front hairstyles in standing and
seated poses on one build. All 52 front cases pass. Under the
[CTO ruling](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019622068),
one explicit assertion reports the empty turned arrays instead of treating
missing inputs as a candidate defect. When turned arrays are nonempty, both
poses still require the requested view and zero opaque face-side overlap. The
existing four hair-face-window tests pass unchanged. Latest combined result:
57 passed, with one recorded input gap and no turned pixel proof. Art approval,
installed runtime and merge are not claimed.

Strict focused TypeScript validation includes the production code and the new
test's typed PNG decoder interface.
Formatter, ESLint and whitespace checks were executed. Final validation results
are recorded below. Logs are /tmp/session127-hair-test.log and
/tmp/session127-hair-typecheck.log.

Historical receipts before the CTO-authorized assertion change, on candidate
89d6ed33d8ced52425fbf0a08c823e12f1769461:
all 52 front cases log 7,632 opaque overlap pixels before and zero after. The
other selected pack tests pass (35 tests). After retrieving declared JSON and
runtime raster inputs omitted by the sparse checkout, the remaining four
integration suites pass unchanged (70 tests). Total across the disjoint checks:
157 passed / 4 failed; all failures require the absent turned hair. Strict
production+new-test TypeScript, formatting, ESLint, diff, report and no-dice
checks pass. Release check passes after metadata history was fetched. The
required speed:years command cannot run because main has no such npm script.
These are actual executed results, published in the
[scoped board receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019561755).
The source-bound measurement and preservation assertions are in
[front-hair-sides.test.ts:106](../../../src/presentation/appearance-engine/front-hair-sides.test.ts#L106).

The unrelated repository job 112337327269 on PR #2725 at ef9d9ed6 fails on
time-command.ts moment fields and facet-opportunistic.test.ts preferences.
Session 10 delivered that exact receipt; Session 127 preserves those owners'
files and does not create another baseline or writer for them.

Complete immutable turned pack and supported cloud staging are still requested
on #2424, comment 6018953167; Session 10 acknowledged the exact source-bank gap.
Continue the independent queue after publishing this candidate. Next id is
b24-p1-s3; check for an open cloud-task PR and post the claim before working.

CTO-scope receipts: /tmp/session127-hair-cto-tests.log records 57 passing tests
and the plain turned-input gap message, as posted in the
[current board receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019766375).
Formatter, ESLint, whitespace, no-dice
and Lexington grep on both changed source files pass (grep has no matches).
Before landed main was incorporated, full npm run typecheck failed at time-command.ts lines 325, 326, 327 and 396
with TS2339 missing moment; these unrelated baseline failures stay with their
existing owner. The focused strict production/test typecheck passed. The earlier 157/4
receipt above describes the superseded missing-input assertion, not a new failure.

Gate recovery: verified #2733 merged at 99f04b3113ba7604707b9e06ff7472f520f356d0.
This branch incorporates actual landed main without changing clock/trait writers.
All earlier CI/typecheck results above belong to their stated older heads.
Run required checks on the new published head and record exact outcomes on
#2424; do not transfer old CI. The source/input-gap scope is unchanged.

Exact next command (from /workspace/game, with subprocess execution enabled):

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/front-hair-sides.test.ts src/presentation/appearance-engine/hair-face-window.test.ts --silent=false
```

PEOPLE_PACK_ROOT selects the supplied immutable pack when it becomes available.
Do not count missing turned cells or candidate pixel QA as visual acceptance.
