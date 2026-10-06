# Session 127: Native collars stay behind front hair

The supplied front composites preserve fully opaque hair pixels where they
overlap the measured collar band. The native harness detects overpainting in
an explicitly reconstructed collar-last ordering. Turned art is
still missing, so turned acceptance remains incomplete under CTO review.
Continue the independent
queue while the source holder supplies the required inputs.

## Resume state

Current item: b24-p1-s3. Branch: codex/session127-b24-p1-s3.
Base: ae27b4da00da3d9391a9d4c34776f1ef28f436cc on main.
Claim and Session 11 collar-region question posted in
[board comment 6019843641](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019843641).
Main already contains the collar ordering correction from 2c64c2acf (#2567).
Production assemble.ts and all source PNGs remain unchanged.
Actual landed main 34bfffa3f1f343524e5a15449beb826fb6358088 (#2733 and hair
#2730) is incorporated. The only conflict was the add/add resume marker;
this task marker is retained and the landed hair result is recorded below.

The [native collar test](../../../src/presentation/appearance-engine/collar-hair-order.test.ts#L1)
covers both presentations, average build, every front hairstyle, standing and
seated, formal and hooded outfits. Historical pre-hair-landing receipt: all 104 front cases pass: 16,522 opaque
hair/collar overlap pixels measured, zero contaminated in the current composite.
Forty-nine cells have a nonempty overlap mask. An explicitly labeled legacy-order
reconstruction overlays the native collar band last and produces 16,498
contaminated pixels. This is reconstructed old ordering, not an alleged failure
of current main or fabricated old-render output.

Eight requested turned cells fail because they fall back to front. These are
missing-input failures, not turned pixel measurements. The CTO authorization
for input-gap assertions applied specifically to the hair PR; it has not been
extended to this collar task. Native dimensions are checked; PEOPLE_PACK_ROOT
can select a supplied immutable pack. Complete turned source inputs and supported
cloud staging remain requested in board comment 6018953167. When supplied,
extend the overlap measurement to actual turned hair layers before READY.
[CTO dispatch 6020522772](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020522772)
now requests a fresh published head and READY after incorporating landed main.
READY is the requested review state, not a claim that turned assertions pass.
Preserve all eight explicit missing-view failures; report the exact fresh-head
result to CTO. No hair-only scope exception is inferred for collars.
No collar production fix, turned pixel proof, visual approval, installed runtime,
merge or Steam action is claimed.

Terminal test receipt: /tmp/session127-collar-test.log (104 passed / 8 failed),
published in the [measured board receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019923810).
Final follow-up run includes 31 unchanged appearance-engine tests, all passing:
135 passed / 8 missing-input failures in /tmp/session127-collar-final-test.log.
Focused strict TypeScript, ESLint, formatter, release, report, whitespace and
no-dice checks pass. Exact publication head is reported on the board.
Release impact is none because this branch adds a regression harness only.

Previous hair task b24-p1-s2 is merged under CTO input-gap scope as
[PR #2730](https://github.com/lamontaes/Political-Game-Git/pull/2730), exact head
producer d8915628fd3404d8cccb762b06f57987897e5706 -> actual main
34bfffa3f1f343524e5a15449beb826fb6358088 at 16:12:40 UTC. Changed checks:
57 tests pass, explicit
turned-input gap, no turned pixel proof. GitHub unit112357271825 SUCCESS and
scope112357199197 SUCCESS at that head; repository still running at last check.
Full local npm run typecheck exits 1 with four inherited time-command.ts moment
errors at 325/326/327/396, owned by the clock writer. No unrelated edits.
See [exact-head receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6019877943).

Rim task b24-p1-s1 remains draft #2725 at ef9d9ed6e290398fd5cf8def16856e539628fcbf.
Supplied front cells have zero near-white rim pixels; assemble.ts is unchanged.
Four turned cells lack native inputs. Its marker remains on its own branch.

Next: publish this fresh collar head and execute changed-file formatter, lint
and tests there; post CTO-requested READY with exact missing-input failures.
Cuff draft #2734 and tag work on codex/session127-b24-p2 remain protected.
Then continue the independent queue at b24-p3, preserving Session 11 tag data. Every task starts from main and has its
own PR. Do not mark missing art as measured or approved.

Exact resume command, from /workspace/game with subprocess execution enabled:

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/collar-hair-order.test.ts --disableConsoleIntercept
```
