# 38C_JULES_CURRENT_SCENE_CONSUMER_CODE_AUDIT

**Audit Reference:** Packet 38 — Task 3 (`38C_JULES_CURRENT_SCENE_CONSUMER_CODE_AUDIT`)
**Scope:** PR #60 (`codex/stage-6-5-run-a-playable-slice` / `codex/stage-6-5-visual-integration`), PR #63 (`feature/environment-scene-spec-v2-12164851251524904142` / `codex/environment-scene-contract-clean`), and PR #74 (`claude/asset-factory-scene-authoring-pipeline` / `claude/scene-person-presentation-foundation-r5aqaw`).
**Status:** Complete READ-ONLY Audit.

---

## 1. Executive Summary & Architectural Context

This audit inspects every code path across PR #60, PR #63, and PR #74 that selects, projects, or renders background environments, scene plates, and spatial surfaces.

### 1.1 Evolution across PR #60, PR #63, and PR #74

1. **PR #60 (`codex/stage-6-5-run-a-playable-slice`)**:
   - Initial playable slice implementation.
   - Environments were rendered using pure CSS/DOM simulated elements in `src/player/OfficeScene.tsx` (`office-window`, `office-curtain`, `wall-frame`, `bookcase`, `office-plant`, `office-rug`, `office-desk`), styled via `src/player/player.css`.
   - Scene identities were represented by static string keys (`run-a:lexington-office`, `run-b:lexington-office:occupied`).

2. **PR #63 (`feature/environment-scene-spec-v2-12164851251524904142`)**:
   - Established the strict runtime specification contract `EnvironmentSceneSpec` in `src/environment/environment-scene-spec.ts`.
   - Defined camera policies, safe area bounds, floor calibration vectors, surface slots, anchor kinds (`floor-standing`, `seat`, `prop-surface`), and raster tier ladders.

3. **PR #74 (`claude/asset-factory-scene-authoring-pipeline` / `codex/stage-6-5-visual-integration`)**:
   - Connected `EnvironmentSceneSpec` to runtime scene presentation and authoring pipelines.
   - Introduced `SCENE_REGISTRY` in `src/presentation/scene-registry.ts` and visual integration in `src/presentation/visual-integration.ts`.
   - Transitioned `OfficeScene.tsx` from CSS/DOM shapes to actual raster plate compositing (`<img className="scene-environment-art" src={visualComposition.environment.url} />`).
   - Derived `OFFICE_VISUAL_SCENE` configuration from the registered fixture spec `office-council-staff-fixture`.

### 1.2 Current Core Deficiency

Across all branches, **scene selection is completely hard-coded to development fixtures**. Specifically:

- Every office view defaults to `OFFICE_VISUAL_SCENE` which is derived from `office-council-staff-fixture`.
- Every room context maps to fixed keys (`run-a:lexington-office`, `run-b:lexington-office:occupied`, `run-c:lexington-office:transit-provision`).
- Scene rendering has no seam to resolve background plates dynamically based on player location, jurisdiction level (municipal vs state vs federal), office tier, committee assignment, or campaign location.

---

## 2. Comprehensive Inventory of Scene Consumer Locations

The current codebase contains 18 exact consumer files across 4 architectural layers.

### Layer A: React DOM UI Presentation Components

#### A1. `src/player/OfficeScene.tsx`

- **Location**: `src/player/OfficeScene.tsx`
- **Role**: Primary workspace view component.
- **Consumer Behavior**:
  - In PR #60: Renders simulated CSS background elements (`.office-window`, `.office-curtain`, `.bookcase`, `.office-desk`).
  - In PR #74: Renders raster plate art via `<img className="scene-environment-art" src={visualComposition.environment.url} />` inside `<div className="scene-camera">`.
  - Consumes `visualComposition = composeOfficeVisuals(fixture.scenePeople, PRODUCTION_VISUAL_LIBRARY)`.
  - Sets viewport camera transform using `OFFICE_VISUAL_SCENE.plate` (width: `2160px`, height: `1440px`) and `OFFICE_VISUAL_SCENE.camera`.
  - Places interactive document entries (`working-draft`, `briefing-memo`, `civic-marker`) on the plate using hard-coded percentages from `OFFICE_VISUAL_SCENE.documentAnchors`.
- **Hardcoded Selection**: Directly imports and relies on `OFFICE_VISUAL_SCENE` from `../presentation/visual-integration`.

#### A2. `src/player/PlayerOffice.tsx`

- **Location**: `src/player/PlayerOffice.tsx`
- **Role**: Top-level office workspace shell component.
- **Consumer Behavior**:
  - Instantiates `OfficeScene` passing `fixture`, `dossiers`, and UI state.
  - Passes `scenePeople` to `composeOfficeVisuals(...)` which defaults `scene` parameter to `OFFICE_VISUAL_SCENE`.
- **Hardcoded Selection**: No scene resolution parameter is passed down from world state or player jurisdiction; defaults implicitly to `OFFICE_VISUAL_SCENE`.

#### A3. `src/player/ConversationStrip.tsx`

- **Location**: `src/player/ConversationStrip.tsx`
- **Role**: Dialogue and character interaction strip overlay.
- **Consumer Behavior**:
  - Positions interlocutor avatars and speech overlays relative to scene anchor IDs (`primary_desk_seated`, `left_guest_seated`).
- **Hardcoded Selection**: References anchor IDs hardcoded to match `OFFICE_VISUAL_SCENE` anchor layouts.

#### A4. `src/player/WorkingDocumentWorkspace.tsx`, `LegislationWorkspace.tsx`, `CalendarWorkspace.tsx`, `WorkPendingWorkspace.tsx`

- **Location**: `src/player/*.tsx`
- **Role**: Scene-native document and calendar overlay workspaces.
- **Consumer Behavior**:
  - Renders desk-native interactive surfaces over the background plate.
  - Positioned at fixed plate percentages relative to `OFFICE_VISUAL_SCENE` document anchors.
- **Hardcoded Selection**: Bound to `OFFICE_VISUAL_SCENE` plate dimensions.

#### A5. `src/ui/ScenePresentationProofView.tsx` & `src/ui/SceneAuthoringProofView.tsx`

- **Location**: `src/ui/ScenePresentationProofView.tsx`, `src/ui/SceneAuthoringProofView.tsx`
- **Role**: Development/QA proofing and authoring visual inspection views.
- **Consumer Behavior**:
  - Iterates over `SCENE_REGISTRY` to render scene plates, safe zones, camera bounds, and character placements.
- **Hardcoded Selection**: Directly consumes `SCENE_REGISTRY.scenes.values()`.

---

### Layer B: Projection & Visual Integration Layer

#### B1. `src/presentation/visual-integration.ts`

- **Location**: `src/presentation/visual-integration.ts`
- **Role**: Central bridge between `SCENE_REGISTRY`, `EnvironmentSceneSpec`, asset manifest, and React UI components.
- **Key Exports & Code Paths**:
  - `OFFICE_FIXTURE_SCENE_ID = "office-council-staff-fixture"` (Line 296 in scene-registry / Line 24 in visual-integration).
  - `OFFICE_FIXTURE_SCENE = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID)` (Line 446).
  - `OFFICE_VISUAL_SCENE: OfficeVisualSceneConfiguration = projectOfficeVisualScene(OFFICE_FIXTURE_SCENE)` (Line 451).
  - `projectOfficeVisualScene(scene: RegisteredScene)` (Line 375): Projects a `RegisteredScene` into `OfficeVisualSceneConfiguration`. Extracts `environmentAssetId` (`scene.raster.assetId`), `plate`, `camera`, `safeArea`, `uiSafeZones`, `anchors`, and `occluders`.
  - `composeOfficeVisualScene(library, people, scene = OFFICE_VISUAL_SCENE)` (Line 532): Default parameter `scene = OFFICE_VISUAL_SCENE`. Calls `requireAsset(library, scene.environmentAssetId)` to resolve background image URL.
- **Hardcoded Selection**: Global singleton `OFFICE_VISUAL_SCENE` is permanently wired to `"office-council-staff-fixture"`.

#### B2. `src/presentation/run-a-fixture.ts` & `src/presentation/run-b-fixture.ts`

- **Location**: `src/presentation/run-a-fixture.ts`, `src/presentation/run-b-fixture.ts`
- **Role**: Test and slice fixture state providers.
- **Hardcoded Selection**:
  - `run-a-fixture.ts`: Hardcodes `locationDisplayName: "Lexington, Kentucky"`.
  - `run-b-fixture.ts`: Hardcodes `sceneKey: "run-b:lexington-office:occupied"` and `sceneKey: "run-b:lexington-office:private-capable"`.

#### B3. `src/presentation/run-a-projection.ts`, `run-b-conversation.ts`, `run-c-working-document.ts`, `run-d-lite.ts`

- **Location**: `src/presentation/run-*.ts`
- **Role**: Domain state presentation projection modules.
- **Hardcoded Selection**:
  - `run-c-working-document.ts` (Line 259): Hardcodes `sceneKey: "run-c:lexington-office:transit-provision"`.
  - Projection functions construct scene contexts with fixed string keys without consulting player jurisdiction or location state.

#### B4. `src/presentation/title-tableau.ts`

- **Location**: `src/presentation/title-tableau.ts`
- **Role**: Title screen and tableau presentation projector.
- **Hardcoded Selection**: Hardcodes scene IDs `"office-council-staff-fixture"` (Lines 284, 296, 334) and `"committee-room-fixture"` (Lines 308, 322).

---

### Layer C: Scene Registry, Composition & Transform Systems

#### C1. `src/presentation/scene-registry.ts`

- **Location**: `src/presentation/scene-registry.ts`
- **Role**: Central runtime lookup registry for validated environment scenes.
- **Key Code Paths**:
  - `createSceneRegistry([OFFICE_COUNCIL_STAFF_FIXTURE_SCENE, COMMITTEE_ROOM_FIXTURE_SCENE])` (Line 291).
  - `getRegisteredScene(registry, sceneId)` / `requireScene(registry, sceneId)` (Lines 256, 264).
  - Holds `SCENE_REGISTRY` initialized with two development fixtures: `"office-council-staff-fixture"` and `"committee-room-fixture"`.
- **Hardcoded Selection**: Registry only contains two hard-coded development fixtures; lacks indexing by jurisdiction, location category, or office tier.

#### C2. `src/presentation/scene-composition.ts`

- **Location**: `src/presentation/scene-composition.ts`
- **Role**: Character sprite and background layer composition engine.
- **Code Paths**: `composeSceneCharacter(request)` & `composeScenePresentation(request)`. Calculates perspective scale and anchor positioning on a `RegisteredScene`.

#### C3. `src/presentation/scene-placement.ts`

- **Location**: `src/presentation/scene-placement.ts`
- **Role**: Perspective scale resolution from floor calibration vectors.
- **Code Paths**: `resolvePerspectiveScale(scene, contactFloorYPercent)`. Interpolates scale factors linearly between `floor_calibration.near` and `floor_calibration.far`.

#### C4. `src/presentation/scene-transform.ts`

- **Location**: `src/presentation/scene-transform.ts`
- **Role**: Virtual scene plate camera clipping and CSS transform resolution.
- **Code Paths**: `resolveSceneTransform(viewport, virtualScene, cameraPolicy)`. Calculates uniform scale, device pixel ratio, and translation matrices.

---

### Layer D: Environment Spec Fixtures & Asset Pipeline

#### D1. `src/environment/scenes/office-council-staff-fixture.ts`

- **Location**: `src/environment/scenes/office-council-staff-fixture.ts`
- **Role**: Authoritative `EnvironmentSceneSpec` for the municipal council staff office plate.
- **Spec Details**:
  - `environment_id: "environment:council-staff-office:prompt30-fixture:v1"`
  - `scene_id: "office-council-staff-fixture"`
  - `presentation_status: "development-fixture"`
  - `raster`: `{ assetId: "env_office_council_staff_fixture_raster_v1", tiers: [...] }`

#### D2. `src/environment/scenes/committee-room-fixture.ts`

- **Location**: `src/environment/scenes/committee-room-fixture.ts`
- **Role**: Authoritative `EnvironmentSceneSpec` for the legislative committee room plate.
- **Spec Details**:
  - `environment_id: "environment:generic-committee-room:metadata-fixture:v1"`
  - `scene_id: "committee-room-fixture"`

#### D3. `src/authoring/fixtures/scene-families.ts`

- **Location**: `src/authoring/fixtures/scene-families.ts`
- **Role**: Fixture definitions for authoring scene scaffold specs (`OFFICE_COUNCIL_STAFF_SCENE_FAMILY`).

#### D4. `art/manifest/asset_manifest.json`

- **Location**: `art/manifest/asset_manifest.json`
- **Role**: Visual asset record manifest.
- **Asset Entry**: Maps `env_office_council_staff_fixture_raster_v1` -> `art/environments/office/plates/env_office_council_staff_fixture_v1.png`.

#### D5. `scripts/art-asset-factory/office-plate-derive.ts` & `environment-intake.ts`

- **Location**: `scripts/art-asset-factory/office-plate-derive.ts`, `environment-intake.ts`
- **Role**: Authoring pipeline tools that extract chroma keys, compute perspective scale, and emit `EnvironmentSceneSpec` JSON.

---

## 3. Hard-Coded & Fixture Selection Matrix

| Consumer Location                                        | Current Selection Mechanism                    | Hard-Coded / Fixture Dependency                                             | Impact on Arbitrary Real-Place Selection                                                             |
| :------------------------------------------------------- | :--------------------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `src/player/OfficeScene.tsx`                             | Imports `OFFICE_VISUAL_SCENE`                  | Bound to `office-council-staff-fixture` plate dimensions & document anchors | Player in an arbitrary Census place (e.g. Anchorage, AK) still sees Lexington municipal staff office |
| `src/player/PlayerOffice.tsx`                            | Defaults `scene` arg in `composeOfficeVisuals` | Defaults to `OFFICE_VISUAL_SCENE`                                           | Cannot switch scene backgrounds dynamically when office location changes                             |
| `src/presentation/visual-integration.ts`                 | Global constant `OFFICE_VISUAL_SCENE`          | Hardcodes `OFFICE_FIXTURE_SCENE_ID = "office-council-staff-fixture"`        | Prevents dynamic scene configuration based on jurisdiction or office level                           |
| `src/presentation/run-a-fixture.ts` & `run-b-fixture.ts` | Static fixture objects                         | Scene keys `run-a:lexington-office`, `run-b:lexington-office:occupied`      | Locks slice presentation to Lexington, KY                                                            |
| `src/presentation/run-c-working-document.ts`             | Hardcoded string literal                       | `sceneKey: "run-c:lexington-office:transit-provision"`                      | Document workspace assumes fixed Lexington scene                                                     |
| `src/presentation/title-tableau.ts`                      | String literals in tableau map                 | `"office-council-staff-fixture"`, `"committee-room-fixture"`                | Tableau presentations cannot render non-fixture scenes                                               |
| `src/presentation/scene-registry.ts`                     | Static registry map                            | Only contains 2 development fixtures                                        | No indexed lookup for state capitals, county seats, federal chambers, or campaign offices            |

---

## 4. Minimal Future Resolver Seam Design

To transition from static fixture selection to dynamic environment rendering (e.g., when a player selects any arbitrary Census place, state legislative seat, or federal office), a clean resolver seam must be introduced.

### 4.1 Proposed Resolver Seam Interface: `EnvironmentSceneResolver`

```typescript
/**
 * Context required to resolve an environment scene for presentation.
 */
export interface EnvironmentSceneContext {
  /** Real-place identity or jurisdiction GEOID (e.g., Census Place GEOID "0203000" for Anchorage). */
  readonly placeGeoid?: string;
  /** State FIPS code (e.g., "02" for Alaska). */
  readonly stateFips?: string;
  /** Primary government level / jurisdiction tier. */
  readonly jurisdictionLevel:
    | "municipal"
    | "county"
    | "state"
    | "federal"
    | "campaign";
  /** Category of physical workspace/location. */
  readonly locationCategory:
    | "council_staff_office"
    | "executive_private_office"
    | "legislative_member_office"
    | "committee_hearing_room"
    | "legislative_chamber"
    | "campaign_field_office"
    | "residence";
  /** Optional architectural style or region hint derived from geography corpus. */
  readonly regionHint?: "northeast" | "south" | "midwest" | "west" | "pacific";
}

/**
 * Result of environment scene resolution.
 */
export interface ResolvedEnvironmentScene {
  readonly sceneId: string;
  readonly spec: EnvironmentSceneSpec;
  readonly visualConfig: OfficeVisualSceneConfiguration;
  /** Dynamic surface text/image bindings for dynamic plates (e.g. state seals, office plaques). */
  readonly dynamicSurfaceBindings: Readonly<Record<string, string>>;
}

/**
 * Seam function: Resolves the appropriate EnvironmentSceneSpec from context with fallback to default fixture.
 */
export function resolveEnvironmentScene(
  context: EnvironmentSceneContext,
  registry: SceneRegistry = SCENE_REGISTRY,
): ResolvedEnvironmentScene;
```

### 4.2 Key Architectural Seam Changes Needed

1. **Registry Indexing Expansion (`src/presentation/scene-registry.ts`)**:
   - Enhance `SceneRegistry` to index registered scenes by `(jurisdictionLevel, locationCategory, regionHint)` in addition to raw `sceneId`.
   - Provide fallback matching: Exact match -> Jurisdiction/Category match -> Generic Category match -> Default Fixture (`office-council-staff-fixture`).

2. **Decouple `visual-integration.ts` from Global Singleton**:
   - Deprecate direct usage of global static `OFFICE_VISUAL_SCENE` in UI components.
   - Refactor `projectOfficeVisualScene(scene)` to accept any `RegisteredScene`.
   - Refactor `composeOfficeVisualScene` to accept `visualConfig` resolved dynamically from state projection.

3. **Pass Resolved Scene via Presentation State Projection**:
   - Update `PlayerOffice.tsx` and workspace views to receive `resolvedScene: OfficeVisualSceneConfiguration` from projection state (`run-a-projection.ts`, `run-b-conversation.ts`).
   - Derive interactive surface document anchors dynamically from `resolvedScene.essentialContentArea` or `surface_slots` rather than static `OFFICE_VISUAL_SCENE.documentAnchors`.

---

## 5. Summary & Verification

This audit provides an exhaustive mapping of every scene/environment consumer in PR #60, PR #63, and PR #74. By implementing the `EnvironmentSceneResolver` seam described in Section 4, the runtime can completely stop hard-coded fixture selection and support arbitrary real-place environment presentation across the national Places corpus.
