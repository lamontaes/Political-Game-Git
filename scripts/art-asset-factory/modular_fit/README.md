# Calibrated modular intake

The solver consumes semantic source and body descriptors, not an asset-name list.
Current faces are regression inputs. Adding a compatible head, hairstyle or body
is a descriptor/paint/registry operation; it does not require a fitter branch.

`fit_core.py` and the 27 original tests come from the user's supplied tested
SYSTEMIC MODULAR REPAIR bundle. `intake.py` pins source and mask hashes, validates
calibration, solves simultaneous width/height bands with a uniform scale, and
refuses unavailable geometry, views, poses and native detail. Transparent canvas
padding is diagnostic; it is not anatomy. Calibration estimates are labeled as
such, with provenance; they are not claimed physical measurements.

Run the supplied tests with the private bundle present:

```sh
MODULAR_SUPPLIED_EVIDENCE=/absolute/path/to/source_evidence \
  python3 -m unittest discover -s scripts/art-asset-factory/modular_fit -p 'test_*.py'
python3 scripts/art-asset-factory/modular_fit/prepare.py calibration.json /absolute/repo
node --import tsx scripts/art-asset-factory/modular_fit/freeze.ts candidate.json registry.json report.json
python3 scripts/art-asset-factory/modular_fit/prepare_poses.py pose-calibration.json /absolute/repo
```

The preparation descriptor declares `heads`, `bodies`, `hairstyles`, `fits`,
`materials`, optional new `families` and `garments`, output paths, palette ramps,
and generation. All file references are root-relative with SHA-256. A source
head declares anatomy bounds, crown, chin, eye line, attachment and scalp frame,
semantic/ownership/protected masks, view, source pose and calibration. A body
supplies its compatible source poses, neck-owned paint/materials, attachment,
height/width bands and preferred height. No body-weight size multiplier exists.

A fit rule names a prior compatible registry definition as its schema/provenance
parent. `operation: "add"` creates a new logical family without superseding that
parent. The default replacement operation creates an additive revision and
records its predecessor. New logical families must provide their component
compatibility metadata, prepared family/feature records and garment-fit profiles.
New outputs are immutable; changed pixels require new IDs. Freezing checks old
assets, templates, prepared parts and generations before appending membership.

`logicalIdentity` links a face across body fits; the hairstyle descriptor's
`logicalStyle` supplies the equivalent hair identity. A missing compatible fit
is a refusal, not permission to substitute a different identity. Source-specific
calibration belongs in private authoring data, never in this solver.

Material maps store a grayscale shading coordinate in RGB and an independent
blend weight in alpha. They are not extra painted layers. The renderer remaps
only weighted RGB, retains the original alpha, and leaves excluded pixels exact.
Skin and hair maps/ramps remain separate. Prepared eye whites, iris, eyebrows,
lip color, outlines and fabric exclusions require calibrated source masks.

Pose preparation uses the same head/hair solver with explicit posed body sockets
and neck ownership. Source body/garment paint and declared foot/pelvis contacts
remain retained. A frontal standing/listening identity is not a generated side
view. Pose contacts, seams and portrait crops still require visual acceptance.

The historical e50 private delivery included a data-only admission rehearsal using a real
held-out prepared head from the supplied bundle and an explicitly synthetic new
body socket. Its receipt hashes the fitter and renderer before/after, registers
an additional logical family, and runs through the existing outfit resolver.
That historical receipt is superseded by the CRUNCH47 real-source proof below.

LEARN: geometric PASS is not seam/material acceptance. Keep machine fit receipts,
exact pixel invariants, the normal browser route, and visual sheets as separate
receipts. Preserve rejected attempts as diagnostics outside the active pack.

## CRUNCH47 profile and source preparation

`rig.py` validates the shared 600×1200 offline body-profile contract. Each body
keeps its own authored proportions and every supported pose has pinned paint,
explicit landmarks and one uniform reduction. Missing landmarks and unsupported
views are refusals. A clean v2 head owns face/ears/curved jaw; the body owns neck,
chest and limbs. `source_parts.py` applies hash-pinned ownership/material masks
and declared alpha cleanup, then transforms paint and masks together.

Prepared components may declare `prepared_profile: {id, sha256}`. An explicit
profile-backed successor can recalibrate root, anchors, contacts, layer and
origin while preserving kind, logical family, canvas, pose/view and compatibility.
An ordinary raster successor still requires exact metadata. Context resolution
requires the selected part and body to share their profile hash. This is the
bounded geometry extension authorized by CRUNCH47 E1; it does not alter old
catalog membership, generation signatures or saved choices.

A prepared garment may point at an `anatomyOverride` auxiliary body corrective.
The renderer draws that painted anatomy in the body slot; the garment never owns
skin. This supports authored hand/cuff and neckline corrections while keeping
face, hair, skin and clothing selection independent. Conflicting or non-body
correctives refuse. `expressionVariants` selects another authored expression in
the same face frame; neutral remains the default and identity is unchanged.

These paths prepare private candidates. Automated success does not promote art
or establish human visual acceptance. The real expansion receipt must freeze
fitter/renderer hashes before admitting genuinely new source paint through data.

The CRUNCH47 private pack supplies `art/authoring/modular47/expansion-proof.json`:
newly painted Avery face, swept-pixie hair and a green-shirt body/outfit enter
through calibrated source data after checkpoint 867e755b. Thirteen new head/body
pairs, 38 hair fits and four new body/garment parts use unchanged fitter and
renderer hashes. The extra body declares standing only; unpainted poses refuse.
It remains an expansion specimen outside the main six-body generation-15 kit.
The main kit has standing, listening and seated coverage, neutral/smile faces,
two garment options, independent skin/hair materials and matching native hair
views. Listening intentionally reuses compatible standing body artwork through
an explicit pose declaration. No named-character conditional exists in the fitter.

Private source recipes, raw masters, masks, profile landmarks, material ramps,
generation hashes and all preparation scripts travel with the matching pack.
The calibration reads the retained generation-14 registry so it remains
reproducible after generation 15 is appended. Use the no-overwrite installer on
a fresh matching checkout; do not replace another owner's installed private pack.

LEARN: complete private banks can exceed Git's default 1 MiB subprocess output
buffer. Raise the bounded capacity while preserving complete identity hashing.
Validate actual viewport containment and installed input evidence in the browser;
asset-fit tests alone cannot detect clipped preview feet or stale missing-pack text.

Native head view is explicit. A body socket lists `supportedHeadViews`; each
hair source must still match its head's exact authored view and source pose.
Admitting a turned face never rotates or reuses a frontal hair cap implicitly.
Pose rules accept `hairLayers` with separate front/back layers in that shared
head frame. Source heads may declare `expressions.smile`, an independently
painted descriptor with `identityOf` naming the same face and the same native
view/pose. The existing outfit preview exposes only prepared expressions.

New sources may opt into `materialSampling: "coverage-normalized-v1"`.
Preparation filters material ownership with the paint's coverage and converts
it back into a conditional weight, so antialiasing does not apply silhouette
alpha twice and restore donor pigment at the edge. The historical resampling
path remains byte-compatible. Tests cover translucent edges, excluded features
and unchanged paint alpha.

LEARN: matching pixels require matching source semantics. Validate native view,
profile compatibility and material ownership at intake; a successful geometry
fit cannot establish them. Latest-generation choices exclude parts whose
profile has no compatible current body, while pinned old generations retain
their exact prior choices.
