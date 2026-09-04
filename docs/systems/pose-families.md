# Pose Families

Status: **Pose contract and control-plate authoring (Packet 50)**

## What a pose family is

A pose family is reusable data. It is not a filename convention, not a folder,
and not a hand-tuned CSS box. It is the shared, art-independent description of
one posture, and it is what a scene anchor asks for.

Three ownerships stay separate, and the separation is the whole point:

- a **scene anchor** owns physical placement — normalized position, floor and
  seat planes, perspective scale, paint order, occlusion, footprint and hitbox;
- a **pose family** owns the posture — its class, its facing, its root, where
  the body meets the world, and where its major landmarks sit;
- a **body component** owns one raster drawn in that posture, with its own
  canvas, rig root, attachment anchors and contacts.

Pose data is presentation metadata. It never encodes personality, role,
occupation, sex or gender, political identity, or biography, and nothing in the
simulation reads it.

The registry is `art/manifest/pose_families.json`. The contract lives in
`src/presentation/pose-families.ts` so the art validator, the control-plate
generator and the browser runtime share one implementation.

## What a family declares

- `pose_family_id`, a human `label` and a reviewable `intent`;
- `posture_class`: `standing`, `seated`, `leaning` or `podium-or-lectern`;
- `facing`: `front` or a three-quarter facing. Profile facings exist in the
  vocabulary but may not be registered until a consumer asks for one, because
  the current project authority limits the near-term facing set;
- `root`, the pelvis-hip-center;
- `contacts`: both foot contacts for any posture that stands on a floor, plus
  the seated pelvis that lands on a seat plane for a seated one;
- `contact_tolerance`, how far a body's own contacts may differ from the
  family's before validation calls it drift;
- `landmarks`: all eighteen of head, neck, chest, both shoulders, elbows,
  wrists, hands, hips, knees and ankles. `head` is the head ATTACHMENT
  landmark — the top of the neck, where a head component's origin lands — not
  the centre of a skull, because that is the point the rig actually uses;
- `compatible_body_families`, and `garment_pose_family`, the token a garment
  must name to be worn in this pose. A standing jacket is never stretched onto
  a seated body;
- `required_footwear_state` and `prop_attachment_slots`;
- `nominal_canvas` and `master_minimum`, which is also what the body master
  contract reads for that posture;
- `production_status`, `human_qa`, `contact_verification` and `provenance`;
- `control_plate`, the deterministic structural plate and its hash.

## Statuses that cannot flatter

`production_status` is checked against the library in both directions. A family
claiming `production-ready`, `production-candidate` or `development-fixture`
must have released body art declaring that pose; a family claiming
`pending-generation` must have none. A family served only by development
fixtures may not claim approved human QA.

`contact_verification` is `measured-from-art` or `declared-unverified`, and an
unverified claim must say why. Code can measure pixels; it cannot judge whether
a pose looks like a person, so human visual acceptance stays a separate release
gate.

Catalog generation 1 predates typed contacts and is frozen by its ledger
signature, so its bodies cannot be given contacts retroactively. The registry
records that exemption explicitly in `legacy_contactless_body_families` with a
reason; any other body that omits contacts is a validation error rather than a
silent fallback to the pelvis root.

## The near-term library

**P0 — required for current and near-term inhabited play**

| Family                    | Posture  | State                     |
| ------------------------- | -------- | ------------------------- |
| `standing-neutral`        | standing | development fixtures only |
| `standing-conversational` | standing | pending generation        |
| `seated-guest-neutral`    | seated   | pending generation        |
| `seated-at-desk`          | seated   | development fixtures only |

**P1 — contract and control plate now, art when a consumer asks**

| Family                       | Posture           | Why it waits                    |
| ---------------------------- | ----------------- | ------------------------------- |
| `standing-podium-or-lectern` | podium-or-lectern | No scene anchor consumes it yet |
| `standing-listening`         | standing          | No scene anchor consumes it yet |

**Deliberately not registered.** A seated hearing-table pose is not a separate
family: the committee fixture's `member-seat-left` already models a member at a
table as `seated-at-desk`, and the geometry does not materially differ, so
registering a second family would be fiction rather than coverage. A walking or
transit pose is not registered either: nothing presents visible locomotion yet.
Both are recorded here so the decision is visible, and either becomes a normal
registry addition the moment a consumer appears.

Eight-direction turnarounds are not a target. The near-term facing vocabulary
is deliberately narrow and validation enforces it.

## How an anchor gets a pose

`resolvePoseForRequest` answers with a family or with named gaps. The rule is
narrow on purpose:

- an anchor's permitted poses are tried in the order the anchor lists them;
- a substitution only ever happens between poses that anchor itself permits,
  because the anchor's author declared those interchangeable there, and it is
  always reported as `preferred-pose-substituted`;
- a pose the anchor does not permit is never substituted in;
- when nothing permitted can be drawn for this person's body family, the
  resolution is null, the compositor fails closed, and the gap names the exact
  incompatibility — which body families do have art, and which do not.

The body family in that question comes from the person's own identity, which is
pose-independent by contract. Asking "does any body have this pose" instead of
"does THIS person's body family have this pose" is the bug the registry
replaces.

Gaps surface in the shared scene diagnostic family, so a pose gap appears in
the debug overlay beside placement and slot warnings rather than in a second
vocabulary.

## Control plates

Structure and rendering are separate control layers. Prose-only anatomy
prompting repeatedly normalized toward a model's default proportions; a
structural control image does not. So every family generates one plate, from
its own landmarks and contacts, with `npm run derive:pose-plates`.

A plate is:

- **deterministic** — the same registry always yields the same bytes, and the
  art validator re-derives every plate and rejects one whose landmarks moved
  without regeneration;
- **free of text** — no labels, numbers or legends, because text in a control
  image bleeds into generated art;
- **never production art** — a plate is an authoring input. No bone line,
  landmark dot or contact ring may ever appear in a finished character raster.

The plate draws limb mass, a closed torso, the skull above the headless body
canvas, the body canvas frame, the contact planes, the skeleton, every landmark
and both contacts. One plate exists per pose and facing; the filename is derived
from the family so a plate cannot be pointed at another pose's picture. The
contract fixture keeps its own plates beside itself under `art/fixtures/`.

## Proof

`?view=scene-proof` carries a pose and contact section. Each row is one person;
each cell is one registered pose family, showing the control plate beside the
body the modular recipe actually composes. Markers are DOM overlays read from
metadata and are never drawn into a raster, and each figure box carries its own
aspect ratio so a percentage overlay lands exactly where the art does.

A cell says which asset IDs resolved, whether the body's contacts agree with the
family's within tolerance, the contact-verification state, the master minimum,
any required slot that stayed empty, and any component that resolved but is not
runtime approved. A pose with no art stays empty and names the gap rather than
borrowing another pose's picture.

The coverage table above the rows is computed from the registry and the released
library, not asserted, and it is the same computation the asset bank inventory
and the generation queue use.
