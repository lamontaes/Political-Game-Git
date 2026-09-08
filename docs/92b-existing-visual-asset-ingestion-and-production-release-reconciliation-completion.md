# 92B — Existing Visual Asset Ingestion + Production-Release Reconciliation — Completion Report

Packet: `92B_CLAUDE_EXISTING_VISUAL_ASSET_INGESTION_AND_PRODUCTION_RELEASE_RECONCILIATION`
(Drive `1ToLS5TuaSfMitmQyMw8JY5qCxf5rM6C4z7sfvgRERX0`, 2026-09-05).

- **Accepted main at packet creation:** `1d05923e549981af22b46026f26b65ab8dda7b2f` (#91 merged).
- **Branch:** `claude/new-session-4owtvv`, cut from `1d05923`. **Not merged.**
- **Mode:** evidence-first audit + safe, additive reconciliation. No runtime behaviour,
  no manifest, and no character catalog changed. No pixel was promoted or released.

This run did **not** begin by declaring the production art missing. It proved the
exact lifecycle state of every relevant generated asset, in the repository and in
the Claude/Drive asset workspace, against the runtime catalog, the asset manifest,
the Packet-71/76 intake evidence and the accepted decisions.

> **REVISION — post-completion independent correction incorporated (2026-09-05).**
> An independent pass re-opened the source material, current main, the contact
> sheet, the character-proof code and the five Wave-A Drive PNGs after this report
> was first delivered. Four corrections are now folded into the body of this
> document and into `art/qa/p92/existing_asset_lifecycle_matrix.json`:
>
> 1. **`?view=character-proof&set=real` is not authoritative for the OCD p76
>    despilled feminine bodies** and no longer appears as their review surface. That
>    route renders `CANDIDATE_REVIEW_CHARACTER_LIBRARY`, lifted from
>    `character-component-candidate` records; the OCD p76 bodies are not registered
>    as such (verified: `ocd_body_` occurs **0** times in `asset_manifest.json` and
>    `character_catalog.json`). The owner gate is `art/qa/contact_sheets/index.html`
>    and/or the files under `art/generated/candidates/ocd-p76/bodies-despilled/`,
>    which the contact sheet does carry (verified: all eight present). See §5 gate 1.
> 2. **The anchor gate is unchanged.** The owner may accept or reject the ART now;
>    D-068 anchor acceptance still happens only **after** a production-resolution
>    re-export, and the current undersized raster must not receive authoritative
>    anchors. See §5 gate 2.
> 3. **The Wave-A pixels have been inspected**, so this report's original
>    "cannot be fetched or pixel-inspected" claim is **obsolete**. Dimensions,
>    the below-floor cell arithmetic, the baked desk/chair/lectern geometry in some
>    pose cells, and the fat-female file being a three-pose supplement rather than a
>    complete family are all recorded in §9.
> 4. **PR #95 stays draft and unmerged.** Green exact-head CI does not override
>    these evidence corrections, and nothing here authorizes a runtime or pixel
>    release.
>
> This revision changed documentation and the lifecycle matrix only. No generation,
> upscaling, anchor authoring, manifest promotion, or release was performed.

> **REVISION 2 — completed Wave-A / recent-Drive cargo absorbed (2026-09-05).**
> The Codex cargo branch `codex/wave-a-morphology-ingestion` was absorbed into this
> branch by **fast-forward** (merge base was this PR's own head; 0 behind, 4 ahead;
> no merge commit manufactured). It brings the Wave A morphology sheets and the
> recent-Drive sources into the repository as candidates/reference, with a
> **completed 286-image visual sweep** — zero metadata-only, zero uninspected, zero
> inaccessible, zero unresolved. §9 now records that sweep, and these conclusions
> are corrected throughout:
>
> - **Front-facing footwear no longer needs generation.** `shoes.png` is the
>   corrected front-facing source; Pack 74 B2 is closed as a generation item.
> - **The lanyard source is not absent** — it exists in `supplies` and in the older
>   `IMG_5203.PNG`; only item-level segmentation remains a gate.
> - **`skinny woman copy.png` is an exact duplicate**, correctly excluded and
>   retained as provenance. It must not be deleted without owner authorization.
> - **Front-facing clothing and fat-man / skinny-man sources exist** with
>   candidate-stage intake evidence.
> - **Nothing found removes the need for production-resolution body masters.**
> - **Poses with baked chairs/desks/lecterns still need clean revision** or an
>   explicit per-pose disposition.
> - **`supplies` still needs an accepted item-level segmentation/layout decision**
>   before independent accessory promotion.
>
> The cargo touches no `src/` file and no `art/manifest/` file: no runtime
> composition change, no manifest promotion, no catalog change, no released pixel.

> **OWNER DECISION ON THE OCD p76 FEMININE BODIES (recorded, binding).**
>
> - The owner **accepts the woman/body design and the eight-pose art direction.**
> - The owner **does NOT accept the current undersized, residual-green raster as
>   final production pixels.**
> - **Do not author D-068 production anchors on the undersized raster.**
> - A **production-resolution, clean-transparency re-export/regeneration remains
>   required** before final anchor acceptance.

---

## 1. The contradiction, resolved

The owner can see generated character art — the eight-pose adult feminine body
family, twelve heads, twelve footwear, the pg-modular masters, and five new
morphology sheets dropped into Drive on 2026-09-04 — yet the runtime catalog
(`art/manifest/character_catalog.json`) still lists only development component
families (`dev_*`, `dev_g2_*`), and no arbitrary person composes into any
released room.

**That is correct, and it is truthful.** Three claims that look like one are in
fact three, and the project keeps them apart on purpose:

|       | Claim                                                                     | Answer today                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | The source/generated image **exists**                                     | **Yes**, extensively.                                                                                                                                                           |
| **B** | The image has **passed mechanical intake/QA**                             | **Yes** — repo art was already chopped/measured/despilled/dispositioned, and the Wave A + recent-Drive sources are now ingested, chopped, measured and candidate-reviewed (§9). |
| **C** | The image is **released and eligible for production runtime composition** | **No — for a genuine reason on every candidate, not a missed step.**                                                                                                            |

No good existing art is being withheld by an un-run deterministic step that this
environment could have completed. Every production-body candidate is blocked by a
real reason: human rejection, a hard resolution floor, a viewpoint mismatch, or an
unmet **human** gate. The runtime fails closed — it shows a named, spatially
correct placeholder and never substitutes another person's likeness
(`src/presentation/life-scene-people.ts`).

---

## 2. The release boundary, as code enforces it

- `createCharacterComponentLibrary` (`src/presentation/character-components.ts`)
  builds the runtime library from the asset manifest + the catalog. A
  `character-component-candidate` carries `candidate_component`, **not**
  `component`, so the library **cannot see it**. `promoteCandidateComponent` is the
  only candidate→catalog path and "additionally requires the human visual
  acceptance D-063 reserves; none has been promoted."
- `runtime_release_status` on `art/manifest/asset_manifest.json`: **56 released,
  66 unreleased.** Everything released is a development fixture (46 `dev_*`
  components, availability `development-fixture`), the two frozen `human_candidate`
  poses, seven environment plates and one foreground mask. Every
  `character-component-master` (28 = 25 pg-modular + 3 ocd source sheets) and
  `character-component-candidate` (35) is **unreleased**.
- The production master floor (`src/presentation/component-masters.ts`, on the
  **source** master, never the runtime raster): standing body ≥ 1696×2528, seated
  body ≥ 1530×2048, head ≥ 1024×1024 **and square**, everything else ≥ 1024 on the
  long edge. **Undersized art is rejected, never enlarged.**

A machine-checkable version of all of this now lives in
`src/presentation/production-release-boundary.test.ts` (20 assertions, all green).

---

## 3. `EXISTING_ASSET_LIFECYCLE_MATRIX`

Full machine-readable form:
`art/qa/p92/existing_asset_lifecycle_matrix.json`. Summary:

| Family                                                                                                                        | A exists  | B intake | C released  | Lifecycle state                                                              | Why not released                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | :-------: | :------: | :---------: | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ocd feminine 8-pose bodies** (`ocd-p71/bodies` → `ocd-p76/bodies-despilled`)                                                |     ✓     |    ✓     |      ✗      | **DESPILLED** (green 67–80% → 0.00%, alpha + interior RGB SHA-256 identical) | **Undersized** (~1264×1696 cells vs 1696×2528 floor) **+** anchors not measured/accepted (D-068) **+** no visual acceptance                                                                                                                                                                                                  |
| **ocd 12 heads** (`ocd-p71/heads`)                                                                                            |     ✓     |    ✓     |      ✗      | **CHOPPED + MEASURED + PASS** (12/12)                                        | Alpha-cropped 800–849 wide, not square, vs 1024² square head floor; and no matching production body exists                                                                                                                                                                                                                   |
| **ocd 12 footwear** (`ocd-p71/footwear`)                                                                                      |     ✓     |    ✓     |      ✗      | **CHOPPED + MEASURED + REVISE** (superseded as the front-on source)          | Wrong viewpoint for front-on use — bonded three-quarter pairs. **No longer a generation need:** `shoes.png` (4336×5804, CORRECTED_REPLACEMENT) is the corrected front-facing twelve-pair source, now ingested and deterministically chopped into 12 candidates. The p71 sheets stay as a future three-quarter family source. |
| **pg-modular** (25 masters + 35 candidates)                                                                                   |     ✓     |    ✓     |      ✗      | **REGISTERED CANDIDATE → REJECTED WITH REASON** (D-063)                      | Untextured **gray geometry** mannequins + unfitted garments; "the answer is currently no"; anchors non-authoritative (D-068)                                                                                                                                                                                                 |
| **dev-modular gen 1/2** (46)                                                                                                  |     ✓     |    ✓     | dev-fixture | **RELEASED AS DEVELOPMENT FIXTURE**                                          | By design; fixtures are never promoted to the production library                                                                                                                                                                                                                                                             |
| **human_candidate A01/B01**                                                                                                   |     ✓     |    ✓     | dev-fixture | **RELEASED FIXTURE (frozen, 765×1024)**                                      | Frozen fixture poses, not modular bodies                                                                                                                                                                                                                                                                                     |
| **Wave A morphology sheets** (average/skinny/older woman, average man, fat man, skinny man; + a 3-pose fat-female supplement) |     ✓     |    ✓     |      ✗      | **INGESTED — CHOPPED, MEASURED, CANDIDATE-REVIEWED** (§9)                    | Source sheets are 5056×3392, so cells fall **below the 1696×2528 body floor**: `eligibleAsProductionCharacterBody` is **false on all 111** chopped components. Useful #89 morphology evidence (51 of 111); 29 carry **baked desk/chair/lectern geometry** needing per-pose disposition                                       |
| **Drive IMG_5202–5207**                                                                                                       | ✓ (Drive) |    ✗     |      ✗      | **UNKNOWN — NEEDS OWNER PIXEL ACCESS**                                       | 76B could not inspect; several exceed the fetch limit                                                                                                                                                                                                                                                                        |

---

## 4. `PRODUCTION_RELEASE_BLOCKERS` — the exact remaining step per family

Not "needs art." The precise next step:

- **Feminine 8-pose bodies (P0).** The figures are good and the green is gone, but
  the sheet is below the body-master floor. A green-clean re-export at the _same_
  5056×3392 resolution would still fail (cells stay ~1264 wide < 1696).
  **Step:** regenerate the sheet at ≥ ~6784×5056 so 4×2 cells clear 1696×2528;
  then chop → measure → propose anchors (STARTING POINT) → **owner accepts anchors
  and art** → register candidate → promote into a new catalog generation → release.
- **Heads (12, PASS).** **Step:** re-frame each PASS head to a ≥1024×1024 **square**
  head-master canvas from the source cell (the full grid cell ~1194×1200 is
  near-square, so this is mechanical), then bank as candidate. Not player-useful
  until a production body of matching complexion exists.
- **Footwear.** **Generation is no longer required.** `shoes.png` is the corrected
  front-facing twelve-pair source; it is ingested, preserved and deterministically
  chopped into 12 candidates. **Step:** the ordinary fit, anchor and human
  acceptance gates — an intake/approval need, not a missing-art need. The p71
  three-quarter sheets are kept as source for a future three-quarter family.
- **pg-modular.** **Step:** none toward release. Gray geometry is structural
  reference, not player-facing body art. It is legitimate **input** to PR #89's
  morphology proof and PR #90's arm measurement, which may be _run_, not modified.
  Real textured, complexion-carrying bodies are the generation need.

---

## 5. `OWNER_VISUAL_GATES` — what a human must actually inspect

Only genuine pixel decisions are listed. Each names the images and the decision.

1. **Despilled feminine bodies — art acceptance.**
   Path: `art/generated/candidates/ocd-p76/bodies-despilled/*.png` (8 poses).
   **Review surface: `art/qa/contact_sheets/index.html` and/or those files
   directly.** The contact sheet does carry all eight despilled bodies (verified:
   24 `ocd-p76/bodies-despilled` references, all eight asset ids present).
   **`?view=character-proof&set=real` is NOT authoritative for this family** and
   must not be used as proof of it: `CharacterProofView` builds the `real` set from
   `CANDIDATE_REVIEW_CHARACTER_LIBRARY`, which is lifted from
   `character-component-candidate` records — and the OCD p76 chopped/despilled
   bodies are not registered as candidate components (verified: `ocd_body_` appears
   **0** times in `asset_manifest.json` and `character_catalog.json`). That route
   remains useful for the candidate-review library it genuinely renders (the
   pg-modular bank), and nothing more.
   **Status: DECIDED.** The owner **accepts the woman/body design and the eight-pose
   art direction**, and **does not accept the current undersized, residual-green
   raster as final production pixels**. So the family is approved in principle and
   the exact bytes are not; a production-resolution, clean-transparency
   re-export/regeneration is required before final anchor acceptance. The anchor
   decision stays separate — see gate 2.
2. **Feminine body anchors — D-068 acceptance.** After a production-resolution
   re-export, the six semantic anchors (crown, brow, head, torso, hips, feet) must
   be measured from the shipping raster and shown on a debug proof for the owner to
   accept. **Decision:** accept or correct the proposed anchors. **Production anchors
   must NOT be authored on the current undersized raster** (D-068/D-073) — this is
   explicit in the owner decision recorded above.
3. **Heads — square re-frame acceptance.** Path: `art/generated/candidates/ocd-p71/heads/*.png`.
   **Decision:** confirm the intended square head-master framing per head.
4. **New Drive morphology sheets — pixel classification.**
   `average woman.png` (`1boAeSN5vzZETmiM1UAQ1fK3zbXd0j1w6`),
   `skinny woman.png` (`13LjnCB9tk9XdEJkKbZPVzMzcbKEmcT0o`),
   `older woman.png` (`1jzF9B6OCiNOayObGrAVaqej6iO9P_a10`),
   `average man.png` (`1j2gkjfVWH3fXzDNpZqI1dCSFQsV4HrBo`),
   `additional fat female pose.png` (`1UknGAET4TCu7h4CaVadfeYRC5hTTGYYq`).
   **Status: INGESTED.** All five are now in the repository under
   `art/references/candidates/wave-a-morphology/source-sheets/`, chopped, measured,
   hashed and candidate-reviewed (§9). Four are 5056×3392 RGBA 4×2 sheets;
   `additional fat female pose.png` is 4352×3904 RGBA carrying **three poses**, not
   a complete eight-pose family. The 8-pose `fat man.png` and `skinny man.png` came
   in the same sweep.
   **Decision that remains:** **per-pose disposition of the 29 baked-prop
   components** (LECTERN 5, CHAIR 4, DESK 8, OTHER 12) — clean furniture-free
   re-render where the pose is needed as a modular body, or an explicit decision to
   keep it as an interaction-specific reference. No cell may be promoted
   automatically as a clean body layer. Review surface:
   `art/qa/p95-recent-drive-sweep/candidate-contact-sheet.html`.
5. **Drive scene candidates.** `IMG_5189.JPG` executive office (generic, clears the
   floor) needs a **camera/floor-calibration** decision (D-070) before it can be a
   runtime plate; `IMG_5190.JPG` campaign storefront must be revised to remove baked
   "FIELD OFFICE" / box text (D-064). `IMG_5202–5207` need pixel classification.

---

## 6. `SAFE_CHANGES_COMPLETED`

Branch `claude/new-session-4owtvv`, base `1d05923`. Additive only.

| Path                                                                 | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/production-release-boundary.test.ts`               | 20 assertions locking A/B/C apart: no production component (or body) is released; every released character component is a dev fixture; every candidate/master is unreleased; the banked candidates validate; the feminine bodies are REVISE→despilled yet below the body floor (verified through `evaluateMasterDimensions`); the twelve heads PASS but are non-square/underwidth; the twelve footwear are REVISE yet clear the size floor; and (added by the post-completion correction) no OCD body is registered as a candidate component or present in the candidate-review library, so `?view=character-proof&set=real` cannot be mistaken for proof of that family.     |
| `art/qa/p92/existing_asset_lifecycle_matrix.json`                    | The full machine-readable reconciliation table (repo + Drive), deterministic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `docs/92b-…-completion.md`                                           | This report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Absorbed cargo** (fast-forward, 4 commits, 165 added / 3 modified) | `art/references/candidates/**` source sheets and recent-Drive source images; `art/generated/candidates/wave-a-morphology/**` and `art/generated/candidates/recent-drive-sweep/**` (111 chopped candidates); `art/qa/p95-wave-a-morphology/**` and `art/qa/p95-recent-drive-sweep/**` sweep evidence (inventory, raw provider metadata, 15-page visual review, per-sheet chop reports, 111-component review, candidate contact sheet, determinism proof); `docs/95-wave-a-morphology-and-recent-drive-ingestion.md`. Regenerated: `art/qa/contact_sheets/index.html`, `art/qa/inventory_report.json`, `art/qa/qa_report.json`. **No `src/` file and no `art/manifest/` file.** |

Deterministic evidence was **re-verified**, not regenerated into a diff:
`npm run despill:edges`, `npm run measure:references` and `npm run qa:art` all
reproduce their committed outputs **byte-identically** (clean `git status` after),
and `npm run validate:art` / `inventory:art` / `inventory:asset-bank` pass. No
`src/` runtime file, no manifest and no catalog was touched.

---

## 7. `STILL_NEEDS_GENERATION`

Genuinely absent, rejected, or a new-view asset after inventory:

- **A production-resolution feminine body sheet** (≥ ~6784×5056) — the existing art
  is good but undersized. (P0.)
- **A `standing-podium-or-lectern` pose** in the same body family (Pack 74 B1) —
  three released rooms declare a lectern anchor and no body can stand at it.
- **Child and adolescent bodies** — separate geometry; a scaled adult is not a
  child (Pack 74 C1/C2).
- **A revised campaign storefront** without baked text (`IMG_5190` fails D-064).
- **Clean, furniture-free revisions** of the poses that bake in a chair, desk or
  lectern — 29 of the 111 chopped components — **where those poses are needed as
  modular bodies**. Alternatively an explicit per-pose disposition keeping them as
  interaction-specific references. (Human call; see §5.)
- **An accepted item-level segmentation/layout decision for `supplies`** before its
  lanyard or any other merged region can be promoted as an independent accessory.
  The source exists; the accepted chopper resolves only 12 coarse regions, several
  holding multiple objects.

Explicitly **NOT** generation needs any more:

- **Front-facing footwear is solved.** `shoes.png` is the corrected source (Pack 74
  B2 is closed as a generation item).
- **A lanyard/accessory source exists** — in `supplies` and in the older
  `IMG_5203.PNG`. Do not record the lanyard source as absent.
- **The Wave A morphology sheets are ingested**, not pending — see §9. They remain
  morphology evidence only because of the resolution floor, which is a separate
  need already listed above.
- **Front-facing clothing and the fat-man / skinny-man body sources exist** and
  carry candidate-stage intake evidence.

---

## 8. `GRAPHICS_READY_NOW_QUEUE`

Independent jobs launchable now without duplicating #89/#90 (the durable queue is
`art/requests/asset-requests.json`; these are the reconciled next moves):

1. **Regenerate body masters at production resolution** — the single remaining P0.
   Every one of the 111 chopped Wave A / recent-Drive components reports
   `eligibleAsProductionCharacterBody: false` because its source cell is under the
   ~1696×2528 floor. This is the only thing between the project and a first usable
   production person.
2. **Human review of the candidate contact sheet**
   (`art/qa/p95-recent-drive-sweep/candidate-contact-sheet.html`) — nothing in the
   ingested cargo is visual acceptance.
3. **Per-pose disposition of the 29 baked-prop components** (LECTERN 5, CHAIR 4,
   DESK 8, OTHER 12): clean furniture-free re-render where the pose is needed as a
   modular body, or an explicit decision to keep it as an interaction-specific
   reference.
4. **Decide the `supplies` item-level segmentation/layout** so the lanyard and the
   other merged regions can become independent accessory components.
5. **Re-frame the twelve PASS heads** to square head masters and bank as candidates.
6. **Take the corrected footwear, clothing and accessory candidates through the
   ordinary fit / anchor / human-acceptance gates** — an approval need, not a
   generation need.
7. **Intake `IMG_5189`** executive office as a plate candidate (pending the human
   camera/calibration gate).
8. **A `standing-podium-or-lectern` pose** in a production-resolution body family
   (Pack 74 B1) — still genuinely missing as clean modular art.

---

## 9. Drive reconciliation — the completed 286-image sweep

**Superseded twice, and now closed.** This report first said the Wave A sheets could
not be pixel-inspected here (true only of this agent sandbox: a 10 MB download cap,
a proxy that refuses `drive.google.com`, no Drive API token). A later pass inspected
them. A completed Codex sweep has now **inventoried, byte-verified and visually
dispositioned every recent Drive image**, and its cargo is absorbed into this branch
by fast-forward. Nothing is metadata-only, uninspected, inaccessible or unresolved.

Evidence: `art/qa/p95-recent-drive-sweep/drive-image-inventory.json` (+ the
unmodified provider metadata beside it), the 15-page review surface
`art/qa/p95-recent-drive-sweep/drive-visual-review/index.html`, the 111-component
record `candidate-component-review.json`, the family-separated
`candidate-contact-sheet.html`, and the rerun proof `source-sheet-determinism.json`
(**PASS** — all 12 processed sheets byte-identical on re-chop).

**286 images, window from `2026-09-02T15:00:00Z`. Verified counts:**

| Classification                  | Count |
| ------------------------------- | ----: |
| REFERENCE_ONLY                  |   160 |
| ALREADY_REPRESENTED             |    74 |
| EXACT_DUPLICATE                 |    32 |
| SOURCE_SHEET_REQUIRES_CHOP      |    10 |
| NEW_PRODUCTION_SOURCE_CANDIDATE |     5 |
| ADDITIONAL_VARIANT              |     4 |
| CORRECTED_REPLACEMENT           |     1 |
| IRRELEVANT_SCREENSHOT_OR_PHOTO  |     0 |
| UNRESOLVED                      |     0 |
| **Total**                       |   286 |

Gate: `COMPLETE_ZERO_METADATA_ONLY_OR_VISUALLY_UNINSPECTED`. Byte-verified 286/286
(34 previously + 252 newly); visually classified 286; inaccessible 0; unresolved 0.

### What the sweep settled

1. **Front-facing footwear is solved.** `shoes.png` (4336×5804) is the single
   `CORRECTED_REPLACEMENT`: the corrected front-facing twelve-pair source that
   supersedes the angled p71 sheets for front-on use. It is preserved and
   deterministically chopped into 12 candidates. **Pack 74 B2 is closed as a
   generation need**; what remains is the ordinary fit/anchor/human gate.
2. **A lanyard source exists** — in `supplies` (5516×3008, 27 staggered objects
   including a lanyard ID badge) and in the older `IMG_5203.PNG`. The lanyard is
   **not** absent. But the accepted chopper resolves only **12 coarse regions**,
   several holding multiple objects, so item-level lanyard promotion waits on an
   accepted segmentation/layout decision. No competing crop method was invented.
3. **`skinny woman copy.png` is an exact Drive duplicate** — byte-identical to
   `skinny woman.png`. It was correctly excluded from candidate duplication and is
   retained as duplicate provenance evidence. **It must not be deleted without owner
   authorization.**
4. **Front-facing clothing and the fat-man / skinny-man bodies exist**, with
   candidate-stage intake evidence: 12 feminine tops, 12 masculine tops, 12
   masculine bottoms, and 8-pose `fat man.png` / `skinny man.png` sheets.
5. **No newly found source removes the need for production-resolution body
   masters.** All 111 chopped components report
   `eligibleAsProductionCharacterBody: false`; every body sheet is 5056×3392, so
   cells sit under the ~1696×2528 floor. 51 of 111 are usable as #89 morphology
   evidence.
6. **Baked interaction props remain a real revision need** — 29 components carry
   them (LECTERN 5, CHAIR 4, DESK 8, OTHER 12). Dispositions:
   `MORPHOLOGY_REFERENCE_READY` 34, `OTHER_CANDIDATE_INTAKE_ONLY` 48,
   `REVISE_BAKED_PROP` 17, `NEEDS_HUMAN_CLASSIFICATION` 12.
7. **Nothing was released.** The component record declares
   `releaseStatus: CANDIDATE_REFERENCE_ONLY` and `productionPixelsReleased: false`;
   the cargo touches **no** `src/` file and **no** `art/manifest/` file.

`IMG_5192.PNG` (a green-clean single pose) confirms the edge fix is achievable; the
repo already holds the despilled equivalents, and it is still sheet-resolution.

---

## 10. Respecting #89 / #90 and every human gate

- **PR #89** (`claude/garment-morphology-fit-profiles`) owns garment
  morphology-fit for the four body-attached kinds — **top, bottom, footwear,
  accessory** (it explicitly does **not** fit heads, hair, eyewear or the body, so
  the packet's "head fit contract" label is a misnomer): direct / affine /
  bounded-warp / REFUSED, fails closed, a non-renderable warp never silently draws.
  It is **not on main**, is unmerged, and currently conflicts with main. Its fixture
  morphology table is _declared, not measured_, because no measured production
  morphology body exists — Wave A is that body. Nothing here rewrites its algorithm
  or declares its human gate passed.
- Both #89 and #90 add a `D-075` decision entry, so they **collide**; whoever merges
  second must renumber. This run adds no decision-log entry and does not enter that
  collision.
- **PR #90** (`claude/arm-sleeve-measurement-contract`) owns arm/sleeve measurement
  and the sleeve-readiness gate. It **already measures the eight Packet-71 feminine
  poses** as real-body input (elbow-down measurable, upper arm fused, seated poses
  occluded) and derives no sleeve transform because the alpha does not hold it.
  Nothing here changes it.
- No anchor recommendation was treated as accepted; no gray art was promoted; no
  identity substitution exists; no body-fit or sleeve algorithm was invented.

---

## 11. Validation

| Check                                                  | Result                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `npm run validate:art`                                 | PASS                                                                                     |
| `npm run inventory:art`                                | PASS — 176 items                                                                         |
| `npm run qa:art`                                       | PASS — contact sheet + report regenerate byte-identically                                |
| `npm run inventory:asset-bank`                         | PASS — 8 released plates, 9 released kinds, 28 masters, 6 pose families, 4 open requests |
| `npm run despill:edges` / `measure:references`         | Re-run byte-identical (deterministic)                                                    |
| `src/presentation/production-release-boundary.test.ts` | 20/20 PASS                                                                               |
| `npm run validate`                                     | see PR description for the full run at the pushed head                                   |

**Success condition met:** the owner can now distinguish, without ambiguity, that a
generated image _exists_ (A), that it has _passed mechanical intake/QA_ (B), and
that it is _released for production composition_ (C) — and the records say which is
which for every asset, rather than blurring them. No good art remains unused for
want of a deterministic step this environment could run, and no unaccepted art was
smuggled toward production.
