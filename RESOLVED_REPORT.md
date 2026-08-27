# Character Asset System - Final Production Hardening

This PR updates the seeded character asset architecture and rebases it cleanly onto the accepted `main` (`5f27bccc759600968cd12d1610eb6f328fe84da8`). All changes remain isolated from `Run A` UI, simulation semantics, and existing `Asset-QA` ownership.

## 1. Starting State and Base
- **Current `main` SHA:** `5f27bccc759600968cd12d1610eb6f328fe84da8`
- **Rebase:** Cleanly rebased the previous draft onto `main`.

## 2. Library Identity Contract (Fixing the library-growth flaw)
Previously, the report incorrectly assumed that adding new assets to a selection pool (even under the same version) was harmless. Because of modulo hashing, it is not.
- **Implemented:** `src/character-assets/identity.ts` exposing `deriveLibrarySignature()`.
- **Behavior:** This extracts and canonically sorts (via code-unit sorting) all selection-relevant IDs across all collections (bodies, heads, hairs, complexions, facial hairs, accessories, wardrobes, poses), alongside the version, and derives an FNV-1a signature.
- **Enforcement:** `PersistentAppearanceRecipe` now securely records this `librarySignature`. The `resolveContextualOutfit()` function strictly evaluates the incoming library and explicitly **throws an error** if the library signature does not match the recipe's signature. This proves that library content has mutated and rejects silent reshuffling of persisted appearances.

## 3. Human Appearance Channels Added
We expanded the asset types securely without imposing demographic stereotyping or breaking morphology boundaries:
- **Complexion:** `ComplexionId` is uniquely resolved against the `HeadFamilyId` compatibility list, entirely independent of the `BodyFamilyId`.
- **Facial Hair:** Implemented as a persistent tendency (`FacialHairFamilyId` or `null`) mapping to a contextual, life-state specific `FacialHairAssetId`. This correctly supports aging or shaving.
- **Accessories:** Included `AccessoryId` (e.g., glasses) mapping to the `HeadFamilyId`.

## 4. Referential Validation
Added rigorous integrity checks inside `validateAssetLibrary()`:
- IDs must be globally unique across all mapped entities.
- Every `HeadAsset` points to a valid `HeadFamily`.
- Every `HairAsset` points to a valid `HairFamily`.
- Every `FacialHairAsset` points to a valid `FacialHairFamily`.
- Complexions, Facial Hairs, and Accessories point to valid `HeadFamilies`.
- Poses must map correctly back to their specific Body Families.
- Lifecycles are fully covered (each head, hair, and facial hair family has an asset for `young_adult`, `adult`, and `senior`).

## 5. Test Coverage
- **10 Vitest Specs** specifically testing the `resolver` and `identity` modules.
- Proved adversarial manipulation is blocked (e.g. shuffling array order doesn't shift the signature; adding/removing assets changes the signature; and signatures must match context evaluation).
- 349 total repository tests passed smoothly.

## 6. Rendering-Manifest Boundaries
This branch stops strictly at deterministic trait resolution. The actual *image composition* (e.g., 2D bounds, crop coordinates, transparent canvas handling, layer depth sorting) is outside the scope of this architecture and should be handled by an independent generic `Asset-QA` / compositing service later.

---

PR #7 was automatically published:
https://github.com/lamontaes/Political-Game-Git/pull/7

Current reviewed head:
9f794f847fe16d8a716147ae94224dbf4914f4d8 (prior to this final hardening pass).
