# NEXT24 A core proof repair

## Delivered core milestone

PR #219 landed 2026-09-12 at main
`215b3e90d163ed3344dbbd36bfaa621501bd67f8`, preserving source head
`c0b0ba33b7feaed8f75adf9897c82dd9862e3132`. Both exact-head repository CI
events passed. Changed browser paths passed 3/3. Full bounded unit rerun passed
325 files / 4622 tests / 2 skipped with two workers and a 30-second test budget.
Default validation's two failures are retained: one five-second wardrobe timeout
and one live shard mismatch (15 extra / 15 missing). Unchanged isolated files
each passed 4/4; fresh inventory was 445 baseline = 233 + 212 with no gaps or
duplicates. The mismatch was not relabelled harmless load. All remaining static,
source/replay, build, demo and art gates passed. Full browser CI remains pending.

Current clean source is visible at `http://127.0.0.1:5198/?art-preview=candidate`,
Vite PID 21217, source digest
`de6bcbc1dfff717adb006880cbfe418b2cd2841407e568bde57fb05f9eddefd0`.
Its title screen was directly observed after the full tests finished and only
the owned review server was restarted. Predecessor 18b823e2 remains frozen on 5192. Runtime/UI/World/manifest/package files are identical between those heads;
earlier minimum-route/native-wardrobe evidence remains named as 18b823e2 proof.
Version is 0.2.0, developer candidate preview, not an installed desktop artifact
or final human art acceptance. Shared root retains only its original two PNG
edits; saves, originals, port 5188 and other owner worktrees are untouched.

The following original work log remains historical; continuing ready returns
are tracked by `docs/plans/active/next24-a-ready-returns.md` and PR #220.

Preserve the playable 18b823e2 source on 5192. This isolated successor contains
only the corrected inline-workspace browser proof and bounded multi-stage
save/reopen test budgets. Runtime/UI, World and simulation files are unchanged.
E's ready source remains in a separate successor; D/new B publication blockers
and the active desktop owner are not absorbed into this small core landing.

The live shared contract and Section A were refreshed at the same revision.
Main is 172b2369; exact published 18b823e2 repository CI passed both events.
Its broad local browser receipt is 20 passed / 2 total-budget failures. The
later unchanged-source save/amendment diagnostic passed 1/1. The other long
diagnostic proved the test wrongly awaited URL navigation while the existing
PlayerGame workspace was visibly open inline. Correct that expectation now;
do not call the failure harmless load or change the product to match the test.

Freeze this commit before starting identified proof. Verify changed routes and
repository-required gates, fetch immediately before publication and make a
finite landing decision under actual branch protection (live main is not
protected). Preserve full workflows and report pending CI separately from
passed local checks, code delivery and human visual/art acceptance.

## LEARN

An inline workspace and a fixture-root navigation are distinct destinations.
Assert the destination owned by the clicked control. Freeze both source and
commit identity before the evidence server starts; committing during proof
correctly invalidates its receipt even without a runtime-file change.

Keep bulk unit/art fixture runs off a live play-server tree. Temporary fixture
paths can perturb import globs and HMR even when final Git state is clean.
The separate 18b play source stayed usable while 5198 observed fixture HMR;
after tests finished, only the owned server was restarted and its title was
verified. Use a separate test tree before exposing a new frozen play source.
