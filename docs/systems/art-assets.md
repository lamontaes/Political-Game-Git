# Art Assets and Runtime Release

Status: **Stage 6.5 runtime-release gate contract**

## Approval and release are separate

The existing asset manifest is the sole art registry. `generation_status`
records generation or ordinary production review, and `qa_status` records QA
review. Neither approval makes an asset available to the normal runtime.

`runtime_release_status` is a separate closed state:

- `unreleased` keeps the asset out of normal runtime use, including when its
  generation and QA reviews are approved;
- `released` is an explicit project-control release and lock claim.

An entry is runtime eligible only when the complete manifest validates and the
entry has `generation_status: "approved"`, `qa_status: "approved"`, and
`runtime_release_status: "released"`. Runtime consumers must use only that
validated eligible set. File existence, a path, or one generic approval never
implies runtime eligibility.

## Final files and hashes

`final_path` remains optional for references and incomplete experimental work.
When present, it must be a repository-relative POSIX path under `art/`, contain
no parent traversal, resolve to an existing regular file, and remain under the
real art root after symlinks are resolved.

Every released asset requires a lowercase 64-character SHA-256 digest in
`hash`. Validation computes the digest from the actual file bytes using the
same `hashArtFile` primitive as inventory generation and rejects missing,
malformed, or mismatched hashes.

## Provenance

Provenance IDs and asset IDs are stable links. Duplicate provenance IDs and
provenance entries pointing at absent manifest assets are invalid. Ordinary
approved assets retain the existing requirement for linked provenance, a final
path, and a hash, and may not cite rejected provenance. A released asset also
requires at least one linked provenance entry whose `approval_status` is
`approved`. `rights_license_status: "unknown"` remains a valid recorded fact;
release validation does not invent or upgrade rights.

For an AI-generated asset, provenance identifies that origin with
`reference_type: "ai-generated"`. A released asset with that provenance must
record `generator_tool`, `generated_model_version`,
`prompt_spec_manifest_id`, and a valid `generation_edit_date`. Those fields are
not required for photographs, measured drawings, HABS sources, hand-authored
art, or other provenance classes.

## Bootstrap and development runtime release

An empty production manifest and empty provenance set remain valid for a new
bootstrap. Reference, draft, pending, and experimental entries may remain
incomplete only while they make no runtime-release claim and omit any
nonexistent `final_path`.

Packet 76 provides the initial development fixture assets to verify the
runtime compositor pipeline: one ordinary council/legislative staff-office
environment plate under the reusable `council-staff-office` family and two
authored-pose character recipes (historical A01/B01). The supplied raw bytes are
verified before import. The two green-field sources remain under
`art/references/approved/packet76/`; a fixed green-dominance alpha ramp plus
transition-pixel spill clamp produces the runtime PNGs. The transform is
deterministic, changes no opaque clothing, skin, hair, face, hand, foot, or
anatomy pixels, and is reproduced by the focused art suite. Gemini is recorded
as the generator family and `not-recorded` as the honestly unknown model
version. Rights remain `unknown`; project approval and runtime release do not
upgrade them.

PNG transparency QA is pixel-based. An alpha-capable PNG is `confirmed` only
when deterministic decoding finds at least one pixel whose alpha is below 255;
an all-opaque RGBA image does not satisfy `requires_transparency` merely because
its header declares an alpha channel.

The historical Prompt 30 room is preserved byte-for-byte as a development/test
fixture. Runtime composition uses a deterministic 2048×1144 separable Lanczos-3
derivative alongside a transparent foreground mask covering the desk and chair
foreground polygons with 2×2 edge coverage. Both derivatives are ordinary
released manifest assets with their own hashes and linked provenance; neither
creates a parallel registry, changes the source bytes, or redraws the room.

## Current project art authority

The historical Prompt 30 plate, A01, and B01 assets serve as temporary
development/test fixture runtime material for verifying presentation code.
They do not represent the final production art set:

- **Office Environment Authority**: `PG-E02 CLEAN` is the human-approved current
  office composition master (locally verified Topaz source = 5568×3008 PNG /
  24.2 MB). This master provides full resolution sufficient for a later
  non-enlarging crop to 4096×2288. The office does not require another
  regeneration or upscale.
- **Character Authority**: Historical A01 and B01 are development fixtures,
  not final characters. Final characters are composed at runtime from
  reusable modular components under D-053; the earlier "asset-substitution
  pass" wording described retiring the fixtures and is not authority for
  flattened one-image-per-person characters. Externally generated character
  material (Gemini, Firefly, fit-and-extract tools) is development-time
  component production recorded in provenance.
- No synthetic or unverified hashes, paths, or provenance records are added
  until the actual production files are supplied to the repository.

## Modular character components

Status: **Foundation contract (D-053); no component art is released**

A modular character component is an ordinary manifest asset with
`asset_type: "character-component"`, `fixed_or_modular: "modular"`, and a
`component` definition. It passes exactly the same generation, QA, hash,
provenance, and runtime-release checks as every other asset; the modular
contract adds structure, it does not bypass the gate. The contract lives in
`src/presentation/character-components.ts` so the art validator and the
browser runtime share one implementation.

Kinds are a closed set: `body`, `head`, `hair-front`, `hair-back`,
`facial-hair`, `eyewear`, `top`, `bottom`, `footwear`, `accessory`. Each
component names a `family`, an append-only `catalog_generation`, an integer
`layer` (draw order within one character), and its authored `canvas` size,
which validation checks against the real raster when a final file exists.

- A **body** is the rig owner. It declares `pose_family`, the
  `head_orientation` that pose presents, the pelvis-hip-center `root`, and the
  `attachment_anchors` (normalized in the body canvas) other components attach
  to. Anchors are metadata; they are never painted into imagery.
- Every other component declares `attaches_to` (a body anchor) and an
  `origin` (the normalized point in its own canvas that lands on that anchor),
  plus the minimum compatibility it needs: `compatible_body_families` for
  heads and garments, `compatible_head_families` for hair, facial hair, and
  eyewear, optional `compatible_pose_families` and
  `compatible_head_orientations`. Every member of one family must declare the
  same compatibility.
- A `hair-front` may pair with one `hair-back` (`paired_with`) drawn behind the
  body; the pair shares one family and generation, and a released front may
  not pair with an unreleased back.

Scene anchors, the character root, and attachment anchors remain three
distinct concepts: the scene anchor owns where a character sits in a room, the
root owns where the rig meets the scene, and the attachment anchor owns where a
component meets the rig.

### Catalog ledger and stable identity

`art/manifest/character_catalog.json` declares the recipe slots (kind,
required, and a deterministic `presence_rate` for optional slots) and an
append-only list of generations. Each generation records its component IDs and
a `csig_` signature — the repository `stableHash` of the canonical component
definitions in that generation. Validation rejects a generation whose
membership or signature no longer matches, so a past generation cannot be
edited or smuggled into; new content must arrive as a new generation.

Identity resolution reads only the canonical person-owned appearance seed and
recipe version. It forks the repository `SeededRng` once per slot and selects
families among components whose generation is at or below the requested
generation. Because a generation is frozen, an established identity pinned to
its generation reproduces exactly after later generations add hairstyles,
garments, or accessories; `reproduceCharacterRecipe` rejects any drift. The
pose-dependent context then selects the components of those families that fit
the requested pose and head orientation; a slot with no art for a pose is
omitted without changing identity, and a pose with no body art fails closed.
Release state marks each resolved component `released` for the compositor and
never influences selection.

The validator's `validate:art` run rejects duplicate IDs, missing or
non-modular declarations, invalid layers and canvases, unknown families,
non-uniform family compatibility, missing or duplicate attachment metadata,
anchors that a reachable body does not declare, dangling or misordered pairs,
ledger mismatches, and non-deterministic or unsatisfiable recipe resolution.
The fixture library under `art/fixtures/valid_character_*.json` exercises the
contract without any raster.

### Appearance pin and runtime proof

Under D-054 the catalog generation a person is pinned to is stored as the
optional `PersonAppearance.catalogGeneration`, set at creation from a
caller-supplied generation. Presentation reads it and never writes it; an
absent pin resolves against the frozen first generation. The pin, not the
browser session, is what keeps an established person stable across reload,
other scenes, and later library growth.

The production catalog is at generation 1 and holds sixteen released
**DEV / NON-PRODUCTION** modular components under
`art/generated/approved/dev-modular/`. They are flat procedural silhouettes
drawn deterministically by `scripts/art-asset-factory/dev-character-fixtures.ts`
(`npm run fixtures:dev-characters`), project-owned, and hash-verifiable; the
validator and a focused test regenerate them and compare hashes and the ledger
signature. Their geometry, palette, and canvas sizes are fixture choices, not a
production standard, and they must not be used as art direction.

`src/presentation/character-render-plan.ts` turns a person's appearance plus a
scene-owned `ModularSceneAnchor` (position, scale, pose, depth, and the
visual-estimate body width at that anchor) into an ordered list of positioned,
runtime-eligible layers in plate percent units, plus the root and attachment
anchors for developer debugging. A resolved component that is not runtime
eligible produces a null URL and marks the plan incomplete. The
`ModularCharacter` React component renders that plan as ordered DOM image
layers inside the ordinary scene camera; anchor markers are DOM overlays. The
`?view=character-proof` developer route renders four generated people and one
of them again seated, with save/reload through the snapshot codec. The
accepted office scene still renders the authored A01/B01 recipes and does not
yet consume modular recipes.

### Real Political Game masters (generation 2)

Under D-055 the first real components are owner-supplied masters normalized
by `scripts/art-asset-factory/pg-modular-intake.ts`
(`npm run intake:pg-modular`). The selected masters are preserved
byte-for-byte under `art/references/masters/pg-modular/` with their pack
manifests; the released derivatives live under
`art/generated/approved/pg-modular/` as `availability: "production-candidate"`
components in catalog generation 2. Per-row neutral-background keying,
opaque-bounds cropping, mask-derived rig measurement, fixed fit ratios, and
Lanczos-3 resampling are the only operations; provenance records the master
hash, keying profile, crop, scale, and fit for every derivative, and a test
reproduces every hash and the generation signature.

The candidate set is two body families (`pg-female-lean`, `pg-male-lean`
from the gray body-geometry authorities), five bald heads (one feminine
sample, four masculine identity masters), eight Black feminine hairstyles,
four tops, three bottoms, and three footwear designs. Garment designs are
fitted once per body family, so one design family yields `_fl_` and `_ml_`
derivatives; hair attaches at the rig's `brow` anchor by its measured
hairline, heads at the neck by their neck cut, garments at the shoulder line
or waist, footwear at the sole line. The DEV fixtures remain in generation 1
as `development-fixture` components and step aside wherever a production
candidate of the same kind exists.

Known asset requirements, recorded rather than faked: no seated real body
exists (real people cannot yet sit in the office); the gray geometry
authorities carry no complexion, so exposed skin on modular bodies renders
gray until complexion-matched body bases exist; no masculine hairstyle,
eyewear, or accessory master exists locally; garment compatibility is not
gendered, so any bottom may resolve for any body family.
