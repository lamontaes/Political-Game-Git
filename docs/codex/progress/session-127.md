# Session 127: Venue demand is being reconciled

The venue audit identifies 15 painted literal targets, five unresolved keys,
and 15 dynamic expressions. Complete venue coverage remains unproven. The
runtime wiring assertion still fails for every explicit painted-place key;
shared reader and tag-data ownership remain protected.

## Resume state

Current item: b24-p5. Branch: codex/session127-b24-p5.
Starting main: 9cfa3dcd8505235f20999841c2522f8e5627e5a5.
Claim: https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6021608729.
No shared place-reader edit has been made. The independent demand script and
audit test are candidates; the shared writer boundary remains pending with
Session 11 and the CTO.
Received main 3e61cdf6de1f8e5105622e8328d1012b8514a51c before publication
without conflicts. Fresh published
checks follow; prior checks are not transferred.

## Previous b24-p4 demand results

The previous demand task started on 72bab03fc60f8befd5c30b402d874ae6a37d8c7c.
It received main 066a8c4cfab8e12430d4c0e8fab1b504290e5745 before publication
and composed it without conflicts.
The [claim](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020981465)
is recorded on the assignment board.

The [generator](../../../scripts/appearance/art-demand.ts#L1) reads staging,
the existing people-pack manifest, and the literal outfit specs in the existing
builder. Parsing the builder's syntax tree avoids running its top-level art
writes. Place dress codes come from the current shared reader. Each spot's
required pose and view are checked directly, including lean and away-facing
back views that the current pack cannot supply.

The measured grid contains 19,305 outfit cells and 186 head cells. It records
11,397 missing outfit cells and 124 missing head cells. Each missing outfit cell
has place, spot, pose, view, presentation, build, outfit, and missing components.
The report includes hashes of its three source files. Coverage means declared
manifest entries and masks; this command does not decode files or approve art.

The [tests](../../../scripts/appearance/art-demand.test.ts#L1) execute the script,
count the real outfit product independently from the builder's literal rows,
verify source hashes and the checked-in generated report, and prove that a
fully covered fixture has no missing cells. They also reject front/standing
fallback and missing garment masks or head layers. Five tests pass. Focused
strict TypeScript, ESLint, and Prettier pass after correcting a parser narrowing
error. Logs are /tmp/session127-demand-final-test.log and
/tmp/session127-art-demand.log.

## Earlier work and remaining boundaries

The [slot audit](https://github.com/lamontaes/Political-Game-Git/pull/2742)
is draft at 5572f251df5dcf5f3fa54721230fc5b1386ffdb7. Fresh checks there pass
formatter and ESLint; four tests pass and four fail. Away maps to front, lean
is absent, 58 staged places lack surface declarations, and painted production
rooms retain legacy anchors. All 56 measured surface references pass. The
[receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020992421)
records restoration of a tracked input omitted by sparse checkout. No data,
pack, or shared reader writer was taken over.

[Hair](https://github.com/lamontaes/Political-Game-Git/pull/2730) landed at
34bfffa3f1f343524e5a15449beb826fb6358088. Its explicit empty turned-input assertion
has CTO authorization and does not establish turned pixel proof.
[Collar](https://github.com/lamontaes/Political-Game-Git/pull/2732) remains READY
for CTO review at fa83b89e98088772e3c6e75c72a2a3f01e347253. Its exact-head test
passes 104 front cases and retains eight failing missing-native assertions.
[Rim](https://github.com/lamontaes/Political-Game-Git/pull/2725),
[cuff](https://github.com/lamontaes/Political-Game-Git/pull/2734), and
[tag validation](https://github.com/lamontaes/Political-Game-Git/pull/2739)
remain drafts. Native originals and tag-owner data remain protected.

## Current venue inventory and next action

The new source-bound audit runs with `--places-only`. Its generated report is
art/coverage/missing-places.json. It lists 15 exact literal targets, all painted;
five unresolved location keys; and 15 dynamic location expressions. Prefix
defaults, imported identifiers, mutable values, and shadowed identifiers do not
become proven targets. Every source has a hash, and rows retain file and line.
The report's empty known-missing subset is not a complete coverage result.

The new runtime assertion requests each painted place through its explicit
`place:<id>` location key. It exposes the still-unfinished wiring requirement;
no existing place-reader file was modified. The current audit stays draft.
Focused strict script TypeScript and ESLint pass. Original combined checks
passed seven tests and failed the runtime wiring assertion. Fresh checks after
parser-scope repairs passed eight tests and retained the one wiring failure at
17:29:47 UTC. All 117 explicit painted-place keys remain unresolved. The log
is /tmp/session127-place-wiring-final-test.log.

The renderer reaches place pictures through play-scene-context and the shared
place reader. Scene venues and campaign catalogs have literal location keys;
some canonical producers build dynamic keys. An inventory must retain those
expressions as unresolved instead of fabricating exact venue records. School
is an actual scene setting. Hospital is an occupation-derived place target;
no wedding location producer was found in the examined runtime path. These
are source-audit observations, not complete venue-coverage proof.

The current manifest contains 117 painted place ids. The place reader names
32 of them literally, leaving 85 without literal references. This is not an
unwired count: dynamic capitol resolution covers many ids. The assignment's
historical count of 15 therefore cannot be reused as today's measurement.
Reconcile the current data with its producer before wiring or asserting a
complete missing-place set.

Native demand landed as PR #2749, producer
4716c962448a690d3e9af19781b07706868b46d3, into main
9cfa3dcd8505235f20999841c2522f8e5627e5a5. Fresh producer checks passed five
changed tests at 17:18:01 UTC, ESLint, Prettier including the full generated
report, whitespace, report, release, and zero-dice. The full report SHA-256 is
26b3ee7d3a8262190593db93d2485e1bbb9ee9f91cc01012f7f2212d30a7660b;
its 3,176,363 bytes match published Git blob
6686226b9e87f7673408d51f7529e4a3345d8c2f. The
[READY receipt](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6021601457)
records source identities. This workspace received that actual landing.

Publish the bounded venue audit as draft after receiving current main. Compose
actual conflicts and run
changed-file checks at the published head under the
[current CTO gate](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6020443625).
Do not transfer earlier CI or wait on full typecheck. Continue the independent canonical venue inventory, retain dynamic-key gaps,
and reconcile the shared place-reader owner before wiring changes. No art generation or
visual/runtime acceptance is claimed.
