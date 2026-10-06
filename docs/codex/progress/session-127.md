# Session 127: Front hair clears measured face-side overlap

The front-hair candidate clears measured overlap on every supplied front style
while preserving bangs and original art. Complete turned inputs remain missing,
so the candidate is a draft and its full acceptance test still fails. Continue
the independent queue while the source holder supplies those inputs.

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
seated poses on one build. All 52 front cases pass; four three-quarter layer
requirements fail because the manifest has no turned hair. The existing four
hair-face-window tests pass unchanged. Full combined result: 56 passed / 4 failed.
No turned pixel proof, READY, art approval, installed runtime or merge is claimed.

Strict focused TypeScript validation includes the production code and the new
test's typed PNG decoder interface.
Formatter, ESLint and whitespace checks were executed. Final validation results
are recorded below. Logs are /tmp/session127-hair-test.log and
/tmp/session127-hair-typecheck.log.

Final scoped receipts on candidate 89d6ed33d8ced52425fbf0a08c823e12f1769461:
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

Exact next command (from /workspace/game, with subprocess execution enabled):

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/front-hair-sides.test.ts src/presentation/appearance-engine/hair-face-window.test.ts --silent=false
```

PEOPLE_PACK_ROOT selects the supplied immutable pack when it becomes available.
Do not count missing turned cells or candidate pixel QA as visual acceptance.
