# Character Asset System - Draft Report

The isolated private draft of the character asset architecture has been successfully implemented and tested locally.

### 1. Architecture Decisions

1.  **Opaque IDs & No Stereotyping**:
    -   Implemented opaque/stable IDs (e.g., `body_family_01`, `head_family_01`).
    -   Moved dimensional data (shoulder width, stature band) into explicit geometry metadata (`shoulderWidthBand`, `statureBand`) inside `BodyFamilyAsset`.
2.  **Determinism Independence**:
    -   Created `src/character-assets/hash.ts` exposing a standalone TS `fnv1a` function.
    -   Selection uses explicit string hashing of `seed | libraryVersion | channel`.
    -   Arrays are canonically sorted by ID before selecting.
    -   This successfully ensures addition/removal of traits from the pool won't cross-contaminate existing assignments, and adding new channels later (e.g., `accessory`) won't shift existing head or body assignments.
3.  **Hybrid Age Identity**:
    -   Distinguished `HeadFamilyId` (the persistent core identity) from `HeadAssetId` (the rendered specific mesh/texture for a given age state).
    -   Age state (`young_adult`, `adult`, `senior`) is injected into the contextual resolver, resolving an age-appropriate `HeadAsset` that strictly belongs to the pre-resolved `HeadFamily`.
4.  **Wardrobe Context vs Identity Recipe**:
    -   `PersistentAppearanceRecipe` is generated once and captures only core identity (Seed, Body Family, Head Family, Hair).
    -   `ResolvedOutfitRecipe` dynamically evaluates Wardrobe and Pose contexts based on Simulation rules (Formality tags, Scene Anchors).

### 2. Exact Files Modified/Created

All changes were strictly contained within the draft namespaces without touching `src/simulation` UI, or Asset QA.

-   `src/character-assets/types.ts` (Schemas/Interfaces)
-   `src/character-assets/hash.ts` (FNV-1a Hash + Deterministic Selection logic)
-   `src/character-assets/compatibility.ts` (Strongly-typed constraint checking)
-   `src/character-assets/resolver.ts` (Persistent + Contextual resolver functions)
-   `src/character-assets/fixtures.ts` (Synthetic `SYNTHETIC_LIBRARY_V1` data proving the constraints)
-   `tests/character-assets/resolver.test.ts` (Vitest specs for verification)

### 3. Test Results

Vitest executed 9 tests targeting the determinism and compatibility logic. All passed.

-   `selects the same item given the same seed and channel`
-   `selects different items across different seeds (distribution)`
-   `selects differently when library version changes`
-   `resolves a stable identity for a given seed`
-   `adding a new asset channel doesn't reshuffle existing attributes`
-   `resolves contextual state correctly`
-   `throws if library version mismatches`
-   `throws on invalid combinations`
-   `preserves identical head family across ages`

### 4. Proof of Channel Independence

Test 5 explicitly proves that hashing `stable_seed | lib_v1 | body` yields a specific asset. Running a secondary derivation for `stable_seed | lib_v1 | accessory` does not invoke a shared simulation tick generator, meaning previously generated recipes stay 100% frozen.

### 5. Remaining Questions Before Production

1.  **Serialization**: Once a character is given an identity, we must decide if `PersistentAppearanceRecipe` is persisted to disk alongside the simulation state, or entirely re-derived at runtime on every load. Re-derivation is now safe thanks to our deterministic stateless hashing.
2.  **Asset Loading**: In a production environment, the library won't be hardcoded TS objects. We must integrate these types with Zod validation reading the finalized JSON manifests that the art production pipeline writes.
3.  **Integration into Run A**: How and where does the UI pipeline intercept a `PersonCore` ID to trigger the resolution?

No branches were pushed and no PRs were merged. The draft is confined strictly to this workspace.
