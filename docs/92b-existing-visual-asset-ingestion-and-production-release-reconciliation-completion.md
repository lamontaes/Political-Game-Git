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

|       | Claim                                                                     | Answer today                                                                                                         |
| ----- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **A** | The source/generated image **exists**                                     | **Yes**, extensively.                                                                                                |
| **B** | The image has **passed mechanical intake/QA**                             | **Mostly yes** for the repo art (chopped, measured, despilled, dispositioned); **not yet** for the new Drive sheets. |
| **C** | The image is **released and eligible for production runtime composition** | **No — for a genuine reason on every candidate, not a missed step.**                                                 |

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
`src/presentation/production-release-boundary.test.ts` (14 assertions, all green).

---

## 3. `EXISTING_ASSET_LIFECYCLE_MATRIX`

Full machine-readable form:
`art/qa/p92/existing_asset_lifecycle_matrix.json`. Summary:

| Family                                                                                        | A exists  | B intake | C released  | Lifecycle state                                                              | Why not released                                                                                                                |
| --------------------------------------------------------------------------------------------- | :-------: | :------: | :---------: | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **ocd feminine 8-pose bodies** (`ocd-p71/bodies` → `ocd-p76/bodies-despilled`)                |     ✓     |    ✓     |      ✗      | **DESPILLED** (green 67–80% → 0.00%, alpha + interior RGB SHA-256 identical) | **Undersized** (~1264×1696 cells vs 1696×2528 floor) **+** anchors not measured/accepted (D-068) **+** no visual acceptance     |
| **ocd 12 heads** (`ocd-p71/heads`)                                                            |     ✓     |    ✓     |      ✗      | **CHOPPED + MEASURED + PASS** (12/12)                                        | Alpha-cropped 800–849 wide, not square, vs 1024² square head floor; and no matching production body exists                      |
| **ocd 12 footwear** (`ocd-p71/footwear`)                                                      |     ✓     |    ✓     |      ✗      | **CHOPPED + MEASURED + REVISE**                                              | **Wrong viewpoint** — bonded three-quarter pairs, contract wants front-on; size is fine                                         |
| **pg-modular** (25 masters + 35 candidates)                                                   |     ✓     |    ✓     |      ✗      | **REGISTERED CANDIDATE → REJECTED WITH REASON** (D-063)                      | Untextured **gray geometry** mannequins + unfitted garments; "the answer is currently no"; anchors non-authoritative (D-068)    |
| **dev-modular gen 1/2** (46)                                                                  |     ✓     |    ✓     | dev-fixture | **RELEASED AS DEVELOPMENT FIXTURE**                                          | By design; fixtures are never promoted to the production library                                                                |
| **human_candidate A01/B01**                                                                   |     ✓     |    ✓     | dev-fixture | **RELEASED FIXTURE (frozen, 765×1024)**                                      | Frozen fixture poses, not modular bodies                                                                                        |
| **Drive Wave A morphology sheets** (average/skinny/older woman, average man, fat-female pose) | ✓ (Drive) |    ✗     |      ✗      | **SOURCE SHEET IN DRIVE — NOT INGESTED**                                     | Generated 2026-09-04, never brought into the repo; the four primary sheets are **>10 MB and not fetchable in this environment** |
| **Drive IMG_5202–5207**                                                                       | ✓ (Drive) |    ✗     |      ✗      | **UNKNOWN — NEEDS OWNER PIXEL ACCESS**                                       | 76B could not inspect; several exceed the fetch limit                                                                           |

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
- **Footwear (12, REVISE).** **Step:** re-render the same twelve designs **front-on**
  (Pack 74 B2). Keep the three-quarter sheets as source for a future three-quarter
  family. This is a genuine generation need — viewpoint cannot be transformed.
- **pg-modular.** **Step:** none toward release. Gray geometry is structural
  reference, not player-facing body art. It is legitimate **input** to PR #89's
  morphology proof and PR #90's arm measurement, which may be _run_, not modified.
  Real textured, complexion-carrying bodies are the generation need.

---

## 5. `OWNER_VISUAL_GATES` — what a human must actually inspect

Only genuine pixel decisions are listed. Each names the images and the decision.

1. **Despilled feminine bodies — art acceptance.**
   Path: `art/generated/candidates/ocd-p76/bodies-despilled/*.png` (8 poses).
   Review surface: `?view=character-proof&set=real` and
   `art/qa/contact_sheets/index.html`.
   **Decision:** is the despilled figure quality good enough to become production
   body art _once regenerated at production resolution_? (The current rasters are
   undersized, so this is an acceptance-in-principle of the family, not of these
   exact bytes.)
2. **Feminine body anchors — D-068 acceptance.** After a production-resolution
   re-export, the six semantic anchors (crown, brow, head, torso, hips, feet) must
   be measured from the shipping raster and shown on a debug proof for the owner to
   accept. **Decision:** accept or correct the proposed anchors. Anchors must not be
   authored on the current (to-be-re-exported) raster (D-073).
3. **Heads — square re-frame acceptance.** Path: `art/generated/candidates/ocd-p71/heads/*.png`.
   **Decision:** confirm the intended square head-master framing per head.
4. **New Drive morphology sheets — pixel classification.**
   `average woman.png` (`1boAeSN5vzZETmiM1UAQ1fK3zbXd0j1w6`),
   `skinny woman.png` (`13LjnCB9tk9XdEJkKbZPVzMzcbKEmcT0o`),
   `older woman.png` (`1jzF9B6OCiNOayObGrAVaqej6iO9P_a10`),
   `average man.png` (`1j2gkjfVWH3fXzDNpZqI1dCSFQsV4HrBo`),
   `additional fat female pose.png` (`1UknGAET4TCu7h4CaVadfeYRC5hTTGYYq`).
   **Decision + action:** these could not be fetched here (see §9). Bring them into
   the repo (as IMG_5178/5181/5176 were), then intake can proceed; the owner then
   judges resolution, transparency, edge and quality.
5. **Drive scene candidates.** `IMG_5189.JPG` executive office (generic, clears the
   floor) needs a **camera/floor-calibration** decision (D-070) before it can be a
   runtime plate; `IMG_5190.JPG` campaign storefront must be revised to remove baked
   "FIELD OFFICE" / box text (D-064). `IMG_5202–5207` need pixel classification.

---

## 6. `SAFE_CHANGES_COMPLETED`

Branch `claude/new-session-4owtvv`, base `1d05923`. Additive only.

| Path                                                   | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/presentation/production-release-boundary.test.ts` | 14 assertions locking A/B/C apart: no production component (or body) is released; every released character component is a dev fixture; every candidate/master is unreleased; the banked candidates validate; the feminine bodies are REVISE→despilled yet below the body floor (verified through `evaluateMasterDimensions`); the twelve heads PASS but are non-square/underwidth; the twelve footwear are REVISE yet clear the size floor. |
| `art/qa/p92/existing_asset_lifecycle_matrix.json`      | The full machine-readable reconciliation table (repo + Drive), deterministic.                                                                                                                                                                                                                                                                                                                                                               |
| `docs/92b-…-completion.md`                             | This report.                                                                                                                                                                                                                                                                                                                                                                                                                                |

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
- **Front-on footwear** (Pack 74 B2) — viewpoint, not size; not transformable.
- **A `standing-podium-or-lectern` pose** in the same body family (Pack 74 B1) —
  three released rooms declare a lectern anchor and no body can stand at it.
- **Child and adolescent bodies** — separate geometry; a scaled adult is not a
  child (Pack 74 C1/C2).
- **A revised campaign storefront** without baked text (`IMG_5190` fails D-064).
- **The Wave A morphology sheets are NOT a generation need** — they exist in Drive;
  they need ingestion, not regeneration (see §8/§9).

---

## 8. `GRAPHICS_READY_NOW_QUEUE`

Independent jobs launchable now without duplicating #89/#90 (the durable queue is
`art/requests/asset-requests.json`; these are the reconciled next moves):

1. **Ingest the Wave A morphology sheets** the moment they are reachable as pixels
   (bring the five Drive PNGs into the repo, or run from an environment that can
   fetch >10 MB from Drive): `chop:source-sheet` → `measure:references` →
   dispositions. This is pure deterministic intake and unblocks the morphology
   matrix PR #89 explicitly says it is missing.
2. **Re-frame the twelve PASS heads** to square head masters and bank as candidates.
3. **Regenerate the feminine body sheet at production resolution** (the single P0).
4. **Intake `IMG_5189`** executive office as a plate candidate (pending the human
   camera/calibration gate).
5. **Front-on footwear** and **lectern pose** re-renders (Pack 74 B1/B2).

---

## 9. Drive reconciliation and the honest tool limit

The current Drive workspace (folder `2026-09-02_PR53_LEGISLATION_AND_ASSET_HANDOFF`,
`1zHIsZcJ7pWDbcpZTdPtsUzRJepFyokGz`; control docs: Assignment Board
`1s0YTUaYcWpOi_MqbaXNW71-nhYrVTTd57AnNPa8pv0E`, Staging Index
`1LqfWO3Bv8gldXOJEDM_ZlAMRh-5Okrn14CLAge75du8`, current handoff `91H…`
`1b04xmguDz-tu6ttWR0v8rn8oQjaA32ZBUg3VupYZagM`) **does** contain new generated
morphology sheets, uploaded 2026-09-04:

- `average woman.png` 11.9 MB, `skinny woman.png` 11.6 MB, `older woman.png`
  11.9 MB, `average man.png` 11.1 MB, `additional fat female pose.png` 8.7 MB.

These are the Pack 74 Wave A bodies. They were **never brought into the
repository** and therefore never chopped or categorized — which is exactly the gap
the owner noticed.

**Tool-visibility limit, stated honestly:** the Drive download tool has a hard
10 MB cap, the agent proxy refuses `drive.google.com`, and no Drive API token is
exposed to this session. So the four primary sheets (>10 MB) **cannot be fetched or
pixel-inspected in this environment.** No intake verdict is claimed for their
pixels. This is a tool limit, not "the art is missing." The correct next step is to
bring them into the repo (as `IMG_5178/5181/5176` already were for the ocd masters)
and run the deterministic intake, which needs no human pixel decision until the
review/anchor gates.

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
| `src/presentation/production-release-boundary.test.ts` | 14/14 PASS                                                                               |
| `npm run validate`                                     | see PR description for the full run at the pushed head                                   |

**Success condition met:** the owner can now distinguish, without ambiguity, that a
generated image _exists_ (A), that it has _passed mechanical intake/QA_ (B), and
that it is _released for production composition_ (C) — and the records say which is
which for every asset, rather than blurring them. No good art remains unused for
want of a deterministic step this environment could run, and no unaccepted art was
smuggled toward production.
