# PEOPLE-VISUAL4 execution evidence

Code checkpoint: `64b49a7d4a41d6b692ad7eaa566981168cd87408`.
The following delivery commit adds evidence/documentation only. Same PR134,
unmerged. No monitoring or server remains running in this lane.

> PEOPLE-SNAPSHOT6 correction: the primary outfit caption in
> `selected-person-wardrobe-reload.png` displays the stable base recipe, not the
> effective saved wardrobe. That caption evidence is superseded by
> [the reproduced and corrected snapshot proof](../people-snapshot6/README.md).
> Existing fit/source/identity acceptance is preserved.

## Browser proof

`PEOPLE_VISUAL4_PROOF_REVISION=64b49a7d4a41d6b692ad7eaa566981168cd87408
PLAYWRIGHT_PORT=5294 npx playwright test tests/e2e/people-visual4.spec.ts --workers=1`
passed2/2 in7.5s. The shared Mac slot was explicitly acquired after ENV and
released to MUNI after the final browser and serialized validation sequence.

`selected-person-wardrobe-reload.png` shows the same selected canonical person,
head/hair, jacket, trousers and shoes in the full-figure stage, shared portrait
and registered scene. `saved-identity-wardrobe.json` records the actual browser's
person ID, identity key, selected families, differing A/B layer IDs, restored A
layer IDs, modular portrait and complete scene status. No synthetic screenshot
identity or empty loaded-image assertion was substituted.

The tests activate native identity/wardrobe controls by pointer and keyboard
(type-ahead on this Mac), Save by pointer and Reload by Enter, select every
available standing body, inspect loaded pixels, check full-figure bounds, and
activate the attachment overlay by pointer/Space. The first browser attempts
exposed native-popup arrow keys that produced no input/change event; actual
type-ahead did produce those events. No application key handler, timeout increase
or fake selection event was added to make that pass.

Screenshot inspection also caught a viewport-fixed scene person over controls,
then an opaque empty content panel washing the scene out. The developer preview
now contains the shared backdrop and hides its empty content panel locally.
The final screenshot was inspected after both repairs. Normal full-scene styling
and ENV's renderer remain with their owners.

## Validation actually run

The full `validate` sequence was executed serially, with the test phase using
`npm run test -- --maxWorkers=1`. Initial full-suite result:182 files passed,
4 files failed;3296 tests passed,6 failed,6 skipped. The recorded failure log is
retained rather than rewritten as a clean first run.

The failures were stale generated evidence and expectations: a new preview
class changed the live prose count by one; the corrected maximum-percentage
metric changes the lean knit fixture from affine (3.14%, outside3%) to the
harness-only bounded warp (1.12%). Regenerated prose/report evidence and updated
that expectation without changing bounds, transforms or fixture pixels.

All four affected suites then passed:127 tests across `anchor-cli`,
`anchor-crossbranch`, `corpus`, and `garment-fit`. The other182 full-suite files
were not needlessly repeated. Source validation, source replay, production build,
deterministic demo, art validation, admission `--check`, and historical wardrobe
`--check` all then passed. Source validators retained their existing declared
source gates/warnings; the build retained its large-bundle warning.

Additional passed checks:32 focused identity/fit/framing/hair tests;6 exact
combination/per-person tests including all206 complete candidate wardrobes;
main and hair source/registry replays; typecheck, lint, formatting and diff
checks; art inventory and QA (1868 items, duplicate-source hash diagnostics
retained). Inventory count is not a count of approved assets.

A bounded CI query after the first published checkpoint returned no checks on
the PR branch. No remote CI result is inferred from local validation.

## Integration and acceptance

PR144 has mounted the published appearance controls, per-save wardrobe map and
shared portrait/scene forwarding in its integration checkout. The final frozen
follow-up is delivered for that owner's combined branch. Its normal-route
browser acceptance and ENV occlusion composition are separate evidence.

The browser proof establishes working candidate consumers and saved identity;
it is not human art approval. Source rights/lineage uncertainties, partial body
coverage, fit/occlusion limitations and exact remaining pixel needs are listed in
`art/qa/people-visual4/README.md`. No production catalog promotion, image-generation
wave, merge or deployment occurred.
