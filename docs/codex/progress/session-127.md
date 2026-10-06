# Session 127: The slot contract has unresolved gaps

Away-facing people request front art, lean is absent from the body-pose list,
and surface declarations are incomplete. The independent audit also checks
whether painted production rooms retain the older anchor contract. Existing
data and runtime writers remain protected.

## Resume state

Current item: b24-p3. Branch: codex/session127-b24-p3.
Starting main: 4695fe7c2afc323dc4a4db0da7ae5f6141f22deb.
Received main f67c37470979af4a0d2a7eb82268df34c400ddde before publication;
merged without conflicts. Run fresh changed-file checks on the published head.
The claim is on the [assignment board](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020811408).

The [slot audit](../../../src/presentation/slot-contract.test.ts#L17) checks
all four facing values, lean, every staged place's surface declaration, existing
measured surface references, and production-room anchor retirement. Fixture
exceptions are listed from the actual registry. It adds no surface geometry.

Measured metadata contains 117 staged places, 59 surface declarations, and
58 places without a declaration. Existing staging has 56 surface references.
BodyView supports front and three-quarter, not back. That type boundary must
be resolved before away-facing people can request back art. The data owner
must reconcile surface declarations and the shared reader boundary before
production changes. No tag, staging, surface, pack, or registry file is changed.

## Earlier work

[Hair](https://github.com/lamontaes/Political-Game-Git/pull/2730) merged into
main at 34bfffa3f1f343524e5a15449beb826fb6358088. Its authorized input-gap
assertion records empty turned arrays; it provides no turned pixel proof.

[Collar](https://github.com/lamontaes/Political-Game-Git/pull/2732) is READY
for CTO review at fa83b89e98088772e3c6e75c72a2a3f01e347253. At that exact head,
formatter and ESLint pass. The changed test passes 104 front cases and fails
eight missing-native turned assertions. All eight assertions remain intact.
The [receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020703617)
reports the input gap separately from the READY instruction.

[Rim](https://github.com/lamontaes/Political-Game-Git/pull/2725),
[cuff](https://github.com/lamontaes/Political-Game-Git/pull/2734), and
[tag validation](https://github.com/lamontaes/Political-Game-Git/pull/2739)
remain drafts with explicit input or owner-data gaps. Native originals remain
unchanged. These receipts establish neither visual approval nor installed
runtime behavior.

## Next action and checks

Executed slot-contract.test.ts: 4 passed and 4 failed. The failures are away
facing, missing lean, incomplete surface declarations, and legacy production
anchors. All 56 measured surface references pass. Formatter and ESLint pass.
The test log is /tmp/session127-slot-test.log. Record the published head on
the board. Under the
[current CTO gate](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020443625),
full typecheck and GitHub jobs are not waiting gates. A failing contract audit
stays draft. Continue with the independent b24-p4 demand list after publication.
Read outfit specs from the existing builder without executing its art writes.
