# PEOPLE-SNAPSHOT6 — saved outfit caption and rendered layers

Existing PR #134, candidate-only. No source pixels, fit bounds, compatibility
records, production eligibility or canonical appearance IDs changed.

## Reproduced before changing application code

At `303c7ad81ca16649f6a99e25b5ba146e637b6b0f`, the actual route
`/?view=character-proof&set=visual4` reproduced the discrepancy after selecting
the reviewed person/head/hair, saving parka/joggers, changing to burgundy polo,
and reloading. The single-worker browser test passed in 3.7 seconds.

- `before-saved-caption-discrepancy.png`: fresh browser reproduction.
- `before-saved-caption-discrepancy.json`: primary caption, loaded image IDs,
  `src`/`currentSrc`, native dimensions and actual serialized review save.
- Historical `../people-visual4/selected-person-wardrobe-reload.png` is retained
  but **superseded for outfit-caption evidence**. Its independently passing
  source, fit and stable-identity evidence is not invalidated.

The primary caption printed `CharacterRenderPlan.recipeKey`: the stable seeded
base identity, containing green cable sweater / blue straight jeans. Effective
wardrobe resolution correctly supplied brown fur-hood parka / black joggers.
The fresh screenshot and loaded URLs agree on those effective assets. This is a
base-versus-effective labeling defect, not evidence of incorrect garment fit,
missing pixels or a broken saved wardrobe resolver. Delayed-load behavior is
verified separately rather than inferred from the historical screenshot.

## Presentation correction

`createPersonRenderSnapshot` captures immutable appearance and wardrobe context
and resolves each requested pose once. Full-figure, portrait and scene consumers
receive that snapshot. Placement remains consumer-owned. Stable `recipeKey`,
seed, recipe version, catalog generation, selection and serialized World remain
unchanged. Legacy unpinned appearances still resolve generation 1.

The primary caption lists effective rendered garment layers from that plan.
Separate details identify the stable base recipe, current requested preference
and last saved wardrobe. Saving updates the saved record; an unsaved request
cannot masquerade as saved state. Foreign person, appearance, library or
conflicting wardrobe snapshots are refused. Existing compatibility validation
still happens before snapshot creation.

The review scene remounts when person/layer URLs change, preventing the legacy
index-keyed image DOM from carrying a previous request into a new selection.
This is local to the review wrapper; ENV's renderer and normal scene layout are
not rewritten.

## Proof and acceptance

Frozen code/test revision: `52cb34eb5a395543e95392641cff151d42a08070`.
Final browser result: **2/2 passed in 26.7s**, single worker, port5294. Both
proof JSON files record that revision and two intercepted delayed garment
requests. Source-pixel comparisons passed on full figure, portrait and scene.

Corrected combinations (same older lined head, gray swept hairstyle, black
joggers and gray low-top sneakers):

- Brown fur-hood parka: `corrected-parka-joggers-full-figure.png`,
  `corrected-parka-joggers-portrait.png`, `corrected-parka-joggers-scene.png`.
- Burgundy long-sleeve polo: `corrected-burgundy-polo-joggers-full-figure.png`,
  `corrected-burgundy-polo-joggers-portrait.png`,
  `corrected-burgundy-polo-joggers-scene.png`.
- Exact IDs, source hashes, current URLs, native dimensions and decoded pixel
  hashes: `corrected-saved-outfit-layer-proof.json` and
  `corrected-person-aba-layer-proof.json`.

All six captures were visually inspected. The portrait capture preserves the
actual small portrait surface; it is not an enlarged claim of new raster detail.

Validation actually run: 61 tests across six scoped suites; 40 prose-corpus
tests; TypeScript; scoped ESLint and formatting; production build;
`validate:art`, `inventory:art`, `qa:art`. Build and all art commands exited0.
Existing duplicate-source-hash and build chunk-size warnings remain. No full
suite, admission intake, derivation or image generation was repeated.

The first browser invocation exposed a Node JSON import setup error before any
test ran. Combined browser scenarios then exceeded the existing30s limit while
advancing through successful assertions. They were split into two complete
scenarios and browser image reads batched; no timeout, pixel comparison,
compatibility threshold or acceptance bound was loosened. The final2/2 run
completed both scenarios. The failed combined logs are retained.

The new test uses explicit expected asset IDs and independently reads the
manifest files, verifies SHA-256, then compares each live DOM image's decoded
pixel digest against a separately decoded copy of that exact source. It checks
all three consumers, with delayed garment requests across page reload, actual
Save/Reload controls, outfit A/B/A, person A/B/A and rapid selection/reload.
Normal CI outputs remain in Playwright's per-run artifacts; tracked evidence is
written only when `PEOPLE_SNAPSHOT6_EVIDENCE` supplies the frozen code revision.

No human art acceptance, production promotion or merge is implied.

## UI #144 incremental adapter

Delta base: `303c7ad81ca16649f6a99e25b5ba146e637b6b0f`. Consume the code/test
stack through `52cb34eb5a395543e95392641cff151d42a08070`, preserving UI roots,
its browser fixture imports/per-run evidence paths, and ENV's current renderer.

- Create one `createPersonRenderSnapshot({personId, appearance, wardrobe,
library})` after the existing saved-wardrobe compatibility adapter succeeds.
- Pass it to `PersonPortrait` / `resolvePersonPortrait`,
  `composeSceneCharacter`, and `buildCharacterRenderPlan`. Review also passes it
  to `composeCandidateReviewSubject`; the caption comes from that actual plan's
  rendered layers, never `recipeKey`.
- `planLifeScenePeople` accepts optional
  `savedWardrobes.snapshotsByPersonId` alongside the existing per-person saved
  preference map. Production library identity, release and fixture gates remain
  enforced. Do not use a candidate snapshot to bypass those gates.
- Preserve World-owned canonical selection and browser-shell-owned saved
  wardrobe IDs. Snapshot objects are ephemeral and are never serialized.

Independent replay of this narrow correction and human approval of the named
candidate combinations remain pending. Previously accepted source/fit/identity
findings remain intact. No new missing-pixel requirement follows from the
reproduced caption defect; previously documented art/fit limitations remain.
