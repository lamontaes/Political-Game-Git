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

### Real Political Game masters (banked candidates)

Under D-055 the first real components are owner-supplied masters normalized
by `scripts/art-asset-factory/pg-modular-intake.ts`
(`npm run intake:pg-modular`). The selected masters are preserved
byte-for-byte under `art/references/masters/pg-modular/` with their pack
manifests; the derivatives live under `art/generated/approved/pg-modular/` as
`asset_type: "character-component-candidate"` records — banked, hashed,
reproducible, `unreleased`, and in NO catalog generation (D-063). Their
definitions live in `candidate_component`, which nothing that resolves an
identity reads and which declares no `catalog_generation` at all: a banked part
has no membership to state, and a generation is assigned only by
`promoteCandidateComponent` when a promotion actually happens (D-065). Validation
rejects a candidate that declares one. Per-row neutral-background keying,
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
or waist, footwear at the sole line. The DEV fixtures are the catalog, and a
production candidate of a kind displaces them only once it is both in a
generation and released.

Review them at `?view=character-proof&set=real`, which composes four people
from the candidate review library alone. That view is where the art is accepted
or rejected; nothing else in the repository can reach these parts.

Known asset requirements, recorded rather than faked, and the reason these
parts are still candidates: no seated real body exists (real people cannot yet
sit in the office); the gray geometry authorities carry no complexion and no
measurable sole contact, so exposed skin renders gray and the bodies declare
neither `complexion` nor `contacts`; no masculine hairstyle,
eyewear, or accessory master exists locally; garment compatibility is not
gendered, so any bottom may resolve for any body family.

## Pose families, masters and cargo

`art/manifest/pose_families.json` is the pose contract every body component
answers to; `docs/systems/pose-families.md` describes it. A body whose
`pose_family` is not registered there is a validation error, as is a body whose
own contacts drift outside its family's tolerance, and as is a family whose
declared production status the library contradicts in either direction. The
body master minimums now resolve through that registry, so a new posture
declares its own source dimensions instead of needing a new constant.

`art/references/masters/pg-modular/` holds twenty-five source masters re-homed
from the superseded PR #48 branch. They are registered as
`character-component-master` assets: approved, QA pending, and permanently
`unreleased`, because a master is a source and not a runtime asset. Two of them
— the standing body authorities at 1696x2528 — meet the current dimension
contract; the other twenty-three sit 3.1x to 4.7x below their class minimum,
and none of the twenty-five carries alpha. They are what to regenerate from,
never what to ship, and the pipeline does not enlarge a master to reach a
canvas. Thirty-five derivatives normalized from them are banked beside them as
candidates; see above.

The five upstream pack manifests are preserved beside the masters, byte for
byte, and they record something nothing else here knew: across the five sets
the packs declare 54 masters and 22 were re-homed. The other 32 exist upstream
and were simply never collected — 9 bottoms, 9 footwear, 8 tops, 4 hairstyles
and 2 faces. That is the difference between art that is missing and art that
has not been fetched, and it is why the generation queue distinguishes them:
one is a commission, the other is a download. The manifests list masters by
their received filenames, which include the demographic tokens the intake
re-cuts away; they stay in the provenance record and never enter an asset ID
or a path.

Identifiers are re-cut on intake. The source named heads and hair with
demographic tokens; complexion is art direction, never demography, and is never
inferred from a name, so those tokens do not enter asset IDs or paths. The
received filenames stay in provenance so the lineage remains checkable.

`art/manifest/cargo_disposition.json` records what happened to the cargo on the
superseded graphics branches and to the externally downloaded packs. Validation
refuses a `re-homed` claim that does not name real manifest assets or that was
not measured in this repository, and refuses any disposition without a reason;
an entry that was not measured here must name the command that would settle it.
No external pack is counted as coverage anywhere.

`art/qa/asset_bank_inventory.md` is generated by `npm run inventory:asset-bank`
from those registries. It is the current answer to what is usable now, what is
covered, and what still needs making, and a test regenerates it so it cannot go
stale.

## Dynamic surfaces and civic symbols

A scene surface slot names a closed `kind` and closed `allowed_content_classes`.
A slot presenting anything that follows simulation state is dynamic and must
clear a legibility floor of 5% of plate width by 5% of plate height — 5% of a
1080-line viewport is 54 lines, about enough for a chart with two labelled axes
— so a surface too small for a player to read a change on stays ambient
decoration rather than being promoted to a screen. A surface lying nearly flat
to the camera, like a desk document, is held to 3% of plate height instead,
because foreshortening compresses height and not width; a surface carrying a
known image or one line of text rather than a data component is held to the
height floor alone. The same constants back `slotIsPromotable`, so the spec
validator and the component binder cannot disagree. A slot that may present a civic seal or flag must
declare `civic_symbol_policy: "canonical-source-only"`. Civic symbols come from
their canonical source and are never generated, redrawn or approximated.
