# DEV-SKILL4 — bounded PR138 repair

Authority: FINISH-WAVE4 shared contract + section I, Drive
`1L5NDuhmPzJ5Nio8hnnfQWl6_kZqmS7uL5RjdS5toVfk`, 2026-09-09.
Start: codex/dev-lab2, 90364dfa765d242f197cf07ceb45204bb85e9d9e;
fresh main6b95f3713590f18973e5e54a3da86e6cd66aa734.

D-2 source-verified control: unconditional generateBundle emitted local
workspace/branch/dirty/pid/runId into production JSON and define replacement.
Repair: public whitelist uses package version, exact revision/short revision
only; no development identity JSON is emitted. Local provenance requires explicit loopback review
serve mode, never build, even with the local flag set. Keep mismatch refusal.

Verify production artifacts (including JS/maps/static text), ordinary serve
absence, explicit local mismatch refusal, symlink dependency robustness and
original saved-world journey without changing seeds or assertion limits.
Coordinate Vite identity with UI/136; do not change App/PlayerGame or release.
PR147 is isolated in pg-dev-skill4-skills; histories remain separate.
No global settings, normal saves, historical screenshots, merges or monitors.

## Frozen release/UI composition contract

Keep VERSION-AUTO1-R1's canonical `resolveBuildIdentity` import, top-level
identity resolution and `define: buildIdentityDefines(identity)` in Vite.
DEV-LAB2's plugin now preserves those public defines when present. Its fallback
for this separate history reads package version and actual Git HEAD (never a
version literal or CI merge SHA). Add the existing DEV cacheDir and review.html
multi-entry alongside the release config; do not replace release identity or
App/PlayerGame navigation. No production dev JSON/endpoint/private define is
required. Local review alone supplies the full private identity.

Verification includes a real tiny Vite build with maps and the local flag set,
a public-asset negative scanner control, ordinary/local configuration checks,
canonical-define preservation, symlink dependency robustness and the original
two-server mismatch/refusal/owned-cleanup test. The symlink EISDIR case is
review-environment robustness, not a claimed normal-install regression.

LEARN: public release identity and local proof provenance have different
exposure boundaries. Test the emitted artifact and a deliberately leaking
control, not merely the source-side object's shape. Keep the full local
mismatch check and unchanged saved-world assertions.

## Completion

Executable head `d963895e83ecf73f982246dd5c8ee851f43f6bc2` passed full
`npm run validate`: 180 test files, 3,222 passing tests and two existing skips;
format, lint, typecheck, source validation/replay, production build,
deterministic demo and art validation passed. Explicit art inventory/QA also
passed. The subsequent closeout commit changes documentation only.

All 307 distributable files passed the private-provenance scan, including
exact local branch/run/path checks. The unchanged saved-world browser tests
passed 2/2 in 7.7 seconds on owned loopback port 5378. The recorded served HEAD
and source digest matched the clean checkout. Original seeds, normal save
records and historical tracked proof screenshots were preserved. The server
exited; no unrelated process was stopped.

Local evidence: `/private/tmp/dev-skill4-browser-d963895/dev-skill4-d963895/`
contains provenance.json, report/index.html and two screenshots under results.
The screenshots were inspected for the visible disposable marker and layout;
this is not independent human acceptance or normal-player reachability proof.
Full validation log: `/private/tmp/dev-skill4-dev-full-validate.log`.

Draft PR138 remains unmerged. UI/release composition and independent acceptance
remain reviewer gates. The shared heavy slot was explicitly released to LEG.
No monitoring or global settings changes were created.
