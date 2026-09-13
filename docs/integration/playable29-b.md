# PLAYABLE29 safety increment

A applies playable29-b-opening.patch to the two opening call sites. The helper
requires both candidate-review mode and the new complete-outfit-v1 descriptor
marker. Fresh setup initialization writes that marker. New marked replay links
reproduce the complete recipe; old absent/pinned descriptors return the exact
input World. Save loads bypass initialization. No root wardrobe callback change
is needed: confirmed edits store identity and outfit in one World write through
the existing onWorldChange/autosave boundary. Old shell preferences stay intact;
an explicit newer canonical outfit takes precedence.

Copy tests/caller-proofs/playable29-outfit.spec.ts into tests/e2e for the composed
receiver. Normal New Game produces complete defaults; an explicit body change
previews required clothing before confirmation; actual top/bottom changes and
two independent save/reopens preserve the selected person. The old feminine
standing family has one fitted bottom. V's prepared families follow separately;
this increment does not fabricate a second bottom or count age/view variants as
six body types. Existing whole-person drawing/style and scene/layout issues are
not cleared by transaction tests.

Validation: 35 focused existing/new resolver, selection, snapshot and collar
tests passed; ordinary composed two-life browser journey passed. The new
version-boundary tests and final repository checks are recorded with the frozen
return. Early failed browser runs exposed canonical-current option shadowing
(fixed) and the exact one-bottom coverage gap (preserved, reported to V).

LEARN: validate proposal candidates without allowing the currently committed
outfit to override the proposal. Validate the final combination through the
same complete-outfit boundary before the one persistence callback. A displayed
replacement remains a preview until explicitly confirmed.
