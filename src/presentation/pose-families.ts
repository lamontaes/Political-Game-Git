import type {
  CharacterBodyContacts,
  CharacterComponentManifestRecord,
  CharacterContactPoint,
} from "./character-components";

/**
 * The pose-family contract.
 *
 * A pose family is reusable DATA, not a filename convention and not a hand
 * tuned CSS box. It says what a posture is, where the body meets the world in
 * it, where its major landmarks sit, what art is compatible with it, and how
 * far its declared numbers have actually been verified.
 *
 * It deliberately extends the existing modular-character contract rather than
 * introducing a parallel character schema:
 *
 * - a BODY component still owns its own raster, canvas, rig root, attachment
 *   anchors and contacts (`character-components.ts`);
 * - a POSE FAMILY owns the shared, art-independent description of the posture
 *   those bodies are drawn in, and is what a scene anchor asks for;
 * - a SCENE ANCHOR still owns placement, floor and seat planes, scale, depth,
 *   occlusion and footprint (`scene-registry.ts`, `scene-placement.ts`).
 *
 * Pose data is presentation metadata. It never encodes personality, role,
 * occupation, sex or gender, political identity, or biography, and nothing in
 * the simulation may read it.
 *
 * This module is deliberately free of React, DOM, Vite and Node APIs so the
 * art validator, the control-plate generator and the browser runtime share one
 * implementation.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * Posture classes. A bounded set: a posture that is not one of these is a new
 * class with its own contact rules, not a free-text label.
 */
export const POSE_POSTURE_CLASSES = [
  "standing",
  "seated",
  "leaning",
  "podium-or-lectern",
] as const;

export type PosePostureClass = (typeof POSE_POSTURE_CLASSES)[number];

/**
 * Facing vocabulary. Profile facings are declared here so the contract is
 * complete, but the current project authority limits near-term production to
 * front and the two three-quarter facings; a family may only claim a profile
 * facing once a consumer actually asks for one.
 */
export const POSE_FACINGS = [
  "front",
  "three-quarter-left",
  "three-quarter-right",
  "profile-left",
  "profile-right",
] as const;

export type PoseFacing = (typeof POSE_FACINGS)[number];

export const NEAR_TERM_POSE_FACINGS: readonly PoseFacing[] = [
  "front",
  "three-quarter-left",
  "three-quarter-right",
];

/**
 * The landmark set every pose family declares. These are the points needed for
 * compatibility reasoning, control-plate authoring and debug overlays. `head`
 * is the HEAD ATTACHMENT landmark — the top of the neck, where a head
 * component's origin lands — not the centre of a skull, because that is the
 * point the rig actually uses.
 */
export const POSE_LANDMARK_IDS = [
  "head",
  "neck",
  "chest",
  "shoulder-left",
  "shoulder-right",
  "elbow-left",
  "elbow-right",
  "wrist-left",
  "wrist-right",
  "hand-left",
  "hand-right",
  "pelvis",
  "hip-left",
  "hip-right",
  "knee-left",
  "knee-right",
  "ankle-left",
  "ankle-right",
] as const;

export type PoseLandmarkId = (typeof POSE_LANDMARK_IDS)[number];

/**
 * Where a pose family stands in the production queue. P0 families are required
 * for current or near-term inhabited play; P1 families have a contract and a
 * control plate so generation can start the moment a consumer needs them.
 */
export const POSE_PRIORITIES = ["P0", "P1"] as const;
export type PosePriority = (typeof POSE_PRIORITIES)[number];

/**
 * The truthful art status of a pose family, using the asset-bank vocabulary.
 *
 * `pending-generation` is the honest state of a family whose contract exists
 * and whose art does not. Validation checks the claim against the actual
 * component library in both directions, so this field cannot drift into a
 * flattering fiction.
 */
export const POSE_PRODUCTION_STATUSES = [
  "production-ready",
  "production-candidate",
  "visual-source",
  "development-fixture",
  "pending-generation",
  "archive",
  "rejected",
] as const;

export type PoseProductionStatus = (typeof POSE_PRODUCTION_STATUSES)[number];

/** Statuses that assert released body art exists for the family. */
const STATUSES_REQUIRING_ART: ReadonlySet<PoseProductionStatus> = new Set([
  "production-ready",
  "production-candidate",
  "development-fixture",
]);

export const POSE_HUMAN_QA_STATES = ["approved", "pending", "rejected"] as const;
export type PoseHumanQaState = (typeof POSE_HUMAN_QA_STATES)[number];

/**
 * How far the declared contacts have actually been checked against art.
 * `measured-from-art` means the numbers were read off real geometry;
 * `declared-unverified` means they are an authoring target and must carry a
 * reason. Code can measure pixels; it cannot judge whether a pose looks like a
 * person, which is why human QA stays a separate release gate.
 */
export const POSE_CONTACT_VERIFICATION_STATES = [
  "measured-from-art",
  "declared-unverified",
] as const;

export type PoseContactVerificationState =
  (typeof POSE_CONTACT_VERIFICATION_STATES)[number];

/** Whether shoes must be visible art in this posture. */
export const POSE_FOOTWEAR_STATES = [
  "shoes-visible",
  "shoes-occluded",
] as const;

export type PoseFootwearState = (typeof POSE_FOOTWEAR_STATES)[number];

/** Hand and prop attachment slots a pose may offer. */
export const POSE_PROP_SLOTS = ["hand-left", "hand-right"] as const;
export type PosePropSlot = (typeof POSE_PROP_SLOTS)[number];

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PoseCanvas {
  readonly width: number;
  readonly height: number;
}

export interface PoseContactVerification {
  readonly status: PoseContactVerificationState;
  /** Required when the status is `declared-unverified`. */
  readonly reason?: string;
}

export interface PoseControlPlateRecord {
  /** Repository-relative POSIX path under `art/`. */
  readonly path: string;
  /** Lowercase 64-character SHA-256 of the generated plate. */
  readonly hash: string;
}

export interface PoseProvenance {
  /** What the numbers in this record were derived from, in one sentence. */
  readonly derived_from: string;
  /** Authority that governs external generation for this family. */
  readonly generation_authority: string;
}

/**
 * A pose family, as stored in `art/manifest/pose_families.json`. Field names
 * follow the manifest's snake_case convention.
 */
export interface PoseFamilyDefinition {
  readonly pose_family_id: string;
  readonly label: string;
  /** What this posture is for, in reviewable prose. Never a character trait. */
  readonly intent: string;
  readonly priority: PosePriority;
  readonly posture_class: PosePostureClass;
  readonly facing: PoseFacing;

  /** Normalized runtime canvas a master is reduced to. */
  readonly nominal_canvas: PoseCanvas;
  /** Minimum SOURCE master dimensions. The pipeline never enlarges to reach it. */
  readonly master_minimum: PoseCanvas;

  /** Pelvis-hip-center root, normalized in the nominal canvas. */
  readonly root: CharacterContactPoint;
  /** Where this posture meets the world. */
  readonly contacts: CharacterBodyContacts;
  /**
   * How far a body's own contacts may differ from the family's, normalized.
   * Bodies are drawn at different widths; their soles still land on one line.
   */
  readonly contact_tolerance: number;
  /** Every landmark in `POSE_LANDMARK_IDS`, normalized in the nominal canvas. */
  readonly landmarks: Readonly<Record<string, CharacterContactPoint>>;

  /** Body families this pose is authored for. */
  readonly compatible_body_families: readonly string[];
  /**
   * The token garments must name in `compatible_pose_families` to be worn in
   * this pose. A standing jacket is not stretched onto a seated body.
   */
  readonly garment_pose_family: string;
  readonly required_footwear_state: PoseFootwearState;
  readonly prop_attachment_slots: readonly PosePropSlot[];

  readonly production_status: PoseProductionStatus;
  readonly human_qa: PoseHumanQaState;
  readonly contact_verification: PoseContactVerification;
  readonly provenance: PoseProvenance;
  /** The deterministic structural plate generated from these landmarks. */
  readonly control_plate: PoseControlPlateRecord;
}

export interface PoseFamilyRegistryData {
  readonly pose_registry_version: string;
  /**
   * Body families that predate the typed-contact contract and are permitted to
   * omit `contacts`. Catalog generation 1 is frozen by its ledger signature, so
   * its bodies cannot be given contacts retroactively without invalidating
   * every identity pinned to it. Placement falls back to the pelvis root for
   * them and says so at runtime (W1/W2); they are never production art.
   */
  readonly legacy_contactless_body_families: readonly string[];
  readonly legacy_contactless_note: string;
  readonly families: readonly PoseFamilyDefinition[];
}

export interface PoseFamilyRegistry {
  readonly version: string;
  readonly legacyContactlessBodyFamilies: ReadonlySet<string>;
  readonly families: ReadonlyMap<string, PoseFamilyDefinition>;
}

export function createPoseFamilyRegistry(
  data: PoseFamilyRegistryData,
): PoseFamilyRegistry {
  return {
    version: data.pose_registry_version,
    legacyContactlessBodyFamilies: new Set(
      data.legacy_contactless_body_families ?? [],
    ),
    families: new Map(
      data.families.map((family) => [family.pose_family_id, family]),
    ),
  };
}

export function requirePoseFamily(
  registry: PoseFamilyRegistry,
  poseFamilyId: string,
): PoseFamilyDefinition {
  const family = registry.families.get(poseFamilyId);
  if (!family) {
    throw new Error(
      `Pose family '${poseFamilyId}' is not registered. Registered families: ${[
        ...registry.families.keys(),
      ]
        .sort()
        .join(", ")}.`,
    );
  }
  return family;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const isUnitInterval = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const isPoint = (value: unknown): value is CharacterContactPoint =>
  typeof value === "object" &&
  value !== null &&
  isUnitInterval((value as CharacterContactPoint).x) &&
  isUnitInterval((value as CharacterContactPoint).y);

const CONTENT_HASH = /^[0-9a-f]{64}$/;

/**
 * Vertical ordering a human body obeys in every supported posture. Checked as
 * a chain so a transposed or mistyped landmark is caught instead of quietly
 * producing an impossible control plate.
 */
const VERTICAL_ORDER: readonly (readonly [PoseLandmarkId, PoseLandmarkId])[] = [
  ["head", "neck"],
  ["neck", "chest"],
  ["chest", "pelvis"],
  ["pelvis", "knee-left"],
  ["pelvis", "knee-right"],
  ["knee-left", "ankle-left"],
  ["knee-right", "ankle-right"],
];

/** Landmarks whose left member must sit left of its right member. */
const LATERAL_PAIRS: readonly (readonly [PoseLandmarkId, PoseLandmarkId])[] = [
  ["shoulder-left", "shoulder-right"],
  ["hip-left", "hip-right"],
  ["knee-left", "knee-right"],
  ["ankle-left", "ankle-right"],
];

/** Lower-body band a standing sole contact must fall inside. */
export const STANDING_SOLE_MINIMUM_Y = 0.9;
/** Band a seated pelvis contact must fall inside. */
export const SEATED_PELVIS_Y_RANGE = { minimum: 0.45, maximum: 0.8 } as const;

function validateLandmarks(
  family: PoseFamilyDefinition,
  label: string,
  errors: string[],
): void {
  const landmarks = family.landmarks;
  if (typeof landmarks !== "object" || landmarks === null) {
    errors.push(`${label} must declare a 'landmarks' object.`);
    return;
  }
  for (const id of POSE_LANDMARK_IDS) {
    if (!isPoint(landmarks[id])) {
      errors.push(
        `${label} is missing landmark '${id}' or declares it outside the normalized 0..1 canvas.`,
      );
    }
  }
  const extra = Object.keys(landmarks).filter(
    (id) => !(POSE_LANDMARK_IDS as readonly string[]).includes(id),
  );
  for (const id of extra.sort()) {
    errors.push(`${label} declares unknown landmark '${id}'.`);
  }
  if (errors.some((error) => error.startsWith(label))) {
    // Ordering checks below would report noise on an incomplete set.
    const complete = POSE_LANDMARK_IDS.every((id) => isPoint(landmarks[id]));
    if (!complete) return;
  }

  for (const [upper, lower] of VERTICAL_ORDER) {
    const above = landmarks[upper];
    const below = landmarks[lower];
    if (!above || !below) continue;
    if (above.y >= below.y) {
      errors.push(
        `${label} places '${upper}' at y ${above.y} at or below '${lower}' at y ${below.y}; a human body does not fold that way.`,
      );
    }
  }
  for (const [left, right] of LATERAL_PAIRS) {
    const a = landmarks[left];
    const b = landmarks[right];
    if (!a || !b) continue;
    if (a.x >= b.x) {
      errors.push(
        `${label} places '${left}' at x ${a.x} at or right of '${right}' at x ${b.x}.`,
      );
    }
  }

  const pelvis = landmarks.pelvis;
  if (pelvis && Math.abs(pelvis.y - family.root.y) > family.contact_tolerance) {
    errors.push(
      `${label} declares a pelvis landmark at y ${pelvis.y} but a rig root at y ${family.root.y}; the root is the pelvis.`,
    );
  }
  if (pelvis && Math.abs(pelvis.x - family.root.x) > family.contact_tolerance) {
    errors.push(
      `${label} declares a pelvis landmark at x ${pelvis.x} but a rig root at x ${family.root.x}; the root is the pelvis.`,
    );
  }
}

function validateContacts(
  family: PoseFamilyDefinition,
  label: string,
  errors: string[],
): void {
  const contacts = family.contacts;
  if (typeof contacts !== "object" || contacts === null) {
    errors.push(`${label} must declare a 'contacts' object.`);
    return;
  }
  const { leftFoot, rightFoot, seatedPelvis } = contacts;

  const needsFeet =
    family.posture_class === "standing" ||
    family.posture_class === "seated" ||
    family.posture_class === "podium-or-lectern" ||
    family.posture_class === "leaning";
  if (needsFeet) {
    if (!isPoint(leftFoot) || !isPoint(rightFoot)) {
      errors.push(
        `${label} (${family.posture_class}) must declare both 'leftFoot' and 'rightFoot' contacts; a floor line needs two soles.`,
      );
    } else {
      if (leftFoot.x >= rightFoot.x) {
        errors.push(
          `${label} declares its left sole at x ${leftFoot.x} at or right of its right sole at x ${rightFoot.x}; foot contacts are ordered.`,
        );
      }
      if (
        family.posture_class === "standing" ||
        family.posture_class === "podium-or-lectern"
      ) {
        for (const [side, point] of [
          ["leftFoot", leftFoot],
          ["rightFoot", rightFoot],
        ] as const) {
          if (point.y < STANDING_SOLE_MINIMUM_Y) {
            errors.push(
              `${label} puts its ${side} contact at y ${point.y}, above the plausible lower-body band (>= ${STANDING_SOLE_MINIMUM_Y}) for a standing pose.`,
            );
          }
        }
      }
    }
  }

  if (family.posture_class === "seated") {
    if (!isPoint(seatedPelvis)) {
      errors.push(
        `${label} (seated) must declare a 'seatedPelvis' contact so it can land on a seat plane.`,
      );
    } else if (
      seatedPelvis.y < SEATED_PELVIS_Y_RANGE.minimum ||
      seatedPelvis.y > SEATED_PELVIS_Y_RANGE.maximum
    ) {
      errors.push(
        `${label} puts its seated pelvis at y ${seatedPelvis.y}, outside the plausible seated band ${SEATED_PELVIS_Y_RANGE.minimum}..${SEATED_PELVIS_Y_RANGE.maximum}.`,
      );
    }
  } else if (seatedPelvis !== undefined) {
    errors.push(
      `${label} (${family.posture_class}) declares a 'seatedPelvis' contact; only a seated pose sits on a seat plane.`,
    );
  }
}

function contactsAgree(
  declared: CharacterContactPoint | undefined,
  expected: CharacterContactPoint | undefined,
  tolerance: number,
): boolean {
  if (expected === undefined) return declared === undefined;
  if (declared === undefined) return false;
  return (
    Math.abs(declared.x - expected.x) <= tolerance &&
    Math.abs(declared.y - expected.y) <= tolerance
  );
}

/**
 * Structural validation of the pose registry against the component library.
 *
 * Returns named errors rather than throwing so the art validator can aggregate
 * them alongside the component and provenance errors. File existence and
 * control-plate bytes are the art validator's and the plate generator's
 * responsibility; everything checkable from metadata alone is checked here.
 */
export function validatePoseFamilyRegistry(
  data: PoseFamilyRegistryData,
  records: readonly CharacterComponentManifestRecord[],
): readonly string[] {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return ["Pose family registry is missing or not an object."];
  }
  if (!isNonEmptyString(data.pose_registry_version)) {
    errors.push("Pose family registry must declare 'pose_registry_version'.");
  }
  if (!Array.isArray(data.legacy_contactless_body_families)) {
    errors.push(
      "Pose family registry must declare 'legacy_contactless_body_families', even when empty.",
    );
  } else if (
    data.legacy_contactless_body_families.length > 0 &&
    !isNonEmptyString(data.legacy_contactless_note)
  ) {
    errors.push(
      "Pose family registry exempts body families from the contact contract and must say why in 'legacy_contactless_note'.",
    );
  }
  if (!Array.isArray(data.families)) {
    errors.push("Pose family registry 'families' must be an array.");
    return errors;
  }

  const seen = new Set<string>();
  for (const family of data.families) {
    const id = family?.pose_family_id;
    if (!isNonEmptyString(id)) {
      errors.push("A pose family is missing its 'pose_family_id'.");
      continue;
    }
    const label = `Pose family '${id}'`;
    if (seen.has(id)) {
      errors.push(`Duplicate pose family id '${id}'.`);
      continue;
    }
    seen.add(id);

    for (const field of ["label", "intent", "garment_pose_family"] as const) {
      if (!isNonEmptyString(family[field])) {
        errors.push(`${label} must declare a non-empty '${field}'.`);
      }
    }
    if (!(POSE_PRIORITIES as readonly string[]).includes(family.priority)) {
      errors.push(`${label} has invalid priority '${family.priority}'.`);
    }
    if (
      !(POSE_POSTURE_CLASSES as readonly string[]).includes(
        family.posture_class,
      )
    ) {
      errors.push(
        `${label} has invalid posture class '${family.posture_class}'.`,
      );
      continue;
    }
    if (!(POSE_FACINGS as readonly string[]).includes(family.facing)) {
      errors.push(`${label} has invalid facing '${family.facing}'.`);
    } else if (!NEAR_TERM_POSE_FACINGS.includes(family.facing)) {
      errors.push(
        `${label} claims facing '${family.facing}'. The near-term facing vocabulary is ${NEAR_TERM_POSE_FACINGS.join(", ")}; a profile facing may only be registered once a consumer asks for one.`,
      );
    }
    if (
      !(POSE_PRODUCTION_STATUSES as readonly string[]).includes(
        family.production_status,
      )
    ) {
      errors.push(
        `${label} has invalid production status '${family.production_status}'.`,
      );
    }
    if (!(POSE_HUMAN_QA_STATES as readonly string[]).includes(family.human_qa)) {
      errors.push(`${label} has invalid human_qa state '${family.human_qa}'.`);
    }
    if (
      !(POSE_FOOTWEAR_STATES as readonly string[]).includes(
        family.required_footwear_state,
      )
    ) {
      errors.push(
        `${label} has invalid required_footwear_state '${family.required_footwear_state}'.`,
      );
    }
    if (!Array.isArray(family.prop_attachment_slots)) {
      errors.push(`${label} must declare 'prop_attachment_slots'.`);
    } else {
      for (const slot of family.prop_attachment_slots) {
        if (!(POSE_PROP_SLOTS as readonly string[]).includes(slot)) {
          errors.push(`${label} declares unknown prop slot '${slot}'.`);
        }
      }
    }

    for (const canvasField of ["nominal_canvas", "master_minimum"] as const) {
      const canvas = family[canvasField];
      if (
        !canvas ||
        !isPositiveInteger(canvas.width) ||
        !isPositiveInteger(canvas.height)
      ) {
        errors.push(
          `${label} must declare a positive integer '${canvasField}' width and height.`,
        );
      }
    }
    const nominal = family.nominal_canvas;
    const minimum = family.master_minimum;
    if (
      nominal &&
      minimum &&
      isPositiveInteger(nominal.width) &&
      isPositiveInteger(minimum.width) &&
      (minimum.width < nominal.width || minimum.height < nominal.height)
    ) {
      errors.push(
        `${label} declares a ${minimum.width}x${minimum.height} master minimum below its ${nominal.width}x${nominal.height} nominal canvas; the pipeline never enlarges a master to reach its canvas.`,
      );
    }

    if (
      typeof family.contact_tolerance !== "number" ||
      !(family.contact_tolerance > 0) ||
      family.contact_tolerance > 0.1
    ) {
      errors.push(
        `${label} must declare a 'contact_tolerance' in (0, 0.1]; a looser tolerance is not a contact.`,
      );
    }
    if (!isPoint(family.root)) {
      errors.push(`${label} must declare a normalized 'root'.`);
    }

    validateContacts(family, label, errors);
    validateLandmarks(family, label, errors);

    if (!Array.isArray(family.compatible_body_families)) {
      errors.push(`${label} must declare 'compatible_body_families'.`);
    }

    const verification = family.contact_verification;
    if (
      !verification ||
      !(POSE_CONTACT_VERIFICATION_STATES as readonly string[]).includes(
        verification.status,
      )
    ) {
      errors.push(
        `${label} must declare a valid 'contact_verification' status.`,
      );
    } else if (
      verification.status === "declared-unverified" &&
      !isNonEmptyString(verification.reason)
    ) {
      errors.push(
        `${label} declares unverified contacts and must say why in 'contact_verification.reason'.`,
      );
    } else if (
      verification.status === "measured-from-art" &&
      verification.reason !== undefined
    ) {
      errors.push(
        `${label} declares measured contacts and must not also carry an unverified reason.`,
      );
    }

    const provenance = family.provenance;
    if (
      !provenance ||
      !isNonEmptyString(provenance.derived_from) ||
      !isNonEmptyString(provenance.generation_authority)
    ) {
      errors.push(
        `${label} must declare provenance with 'derived_from' and 'generation_authority'.`,
      );
    }

    const plate = family.control_plate;
    if (!plate || !isNonEmptyString(plate.path)) {
      errors.push(`${label} must declare a 'control_plate' path.`);
    } else if (!plate.path.startsWith("art/") || plate.path.includes("..")) {
      errors.push(
        `${label} control plate path '${plate.path}' must be a repository-relative path under 'art/'.`,
      );
    }
    if (!plate || !CONTENT_HASH.test(plate.hash ?? "")) {
      errors.push(
        `${label} control plate hash must be a lowercase 64-character SHA-256 digest.`,
      );
    }
  }

  errors.push(...validateRegistryAgainstComponents(data, records));
  return errors;
}

/**
 * Cross-checks: every body claims a registered pose family, every family's
 * declared status matches the art that actually exists, and every body's own
 * contacts land within its family's tolerance.
 */
function validateRegistryAgainstComponents(
  data: PoseFamilyRegistryData,
  records: readonly CharacterComponentManifestRecord[],
): readonly string[] {
  const errors: string[] = [];
  const byId = new Map(
    data.families.map((family) => [family.pose_family_id, family]),
  );
  const legacyContactless = new Set(
    data.legacy_contactless_body_families ?? [],
  );

  const releasedBodyPoses = new Map<string, string[]>();
  const declaredPoseTokens = new Set<string>();

  for (const record of records) {
    const definition = record.component;
    if (!definition) continue;

    if (definition.kind === "body") {
      const poseId = definition.pose_family;
      if (!poseId) continue; // reported by the component contract
      declaredPoseTokens.add(poseId);
      const family = byId.get(poseId);
      if (!family) {
        errors.push(
          `Character component '${record.asset_id}' (body) declares pose family '${poseId}', which the pose registry does not define.`,
        );
        continue;
      }
      const runtimeEligible =
        record.generation_status === "approved" &&
        record.qa_status === "approved" &&
        record.runtime_release_status === "released";
      if (runtimeEligible) {
        const list = releasedBodyPoses.get(poseId) ?? [];
        list.push(record.asset_id);
        releasedBodyPoses.set(poseId, list);
      }

      if (!family.compatible_body_families.includes(definition.family)) {
        errors.push(
          `Character component '${record.asset_id}' (body family '${definition.family}') claims pose '${poseId}', which is authored for ${family.compatible_body_families.join(", ") || "no body family"}.`,
        );
      }
      if (definition.head_orientation !== family.facing) {
        errors.push(
          `Character component '${record.asset_id}' presents head orientation '${definition.head_orientation}' but pose family '${poseId}' declares facing '${family.facing}'.`,
        );
      }

      const tolerance = family.contact_tolerance ?? 0;
      if (definition.contacts === undefined) {
        if (!legacyContactless.has(definition.family)) {
          errors.push(
            `Character component '${record.asset_id}' claims pose '${poseId}', which declares contacts, but the body declares none of its own and body family '${definition.family}' is not recorded in 'legacy_contactless_body_families'; placement would silently fall back to the pelvis root.`,
          );
        }
      } else {
        for (const key of ["leftFoot", "rightFoot", "seatedPelvis"] as const) {
          if (
            !contactsAgree(
              definition.contacts[key],
              family.contacts[key],
              tolerance,
            )
          ) {
            errors.push(
              `Character component '${record.asset_id}' declares contact '${key}' ${JSON.stringify(definition.contacts[key] ?? null)}, outside pose family '${poseId}' tolerance ${tolerance} of ${JSON.stringify(family.contacts[key] ?? null)}.`,
            );
          }
        }
      }
    } else if (definition.compatible_pose_families !== undefined) {
      for (const poseId of definition.compatible_pose_families) {
        declaredPoseTokens.add(poseId);
        if (!byId.has(poseId)) {
          errors.push(
            `Character component '${record.asset_id}' (${definition.kind}) claims compatibility with pose family '${poseId}', which the pose registry does not define.`,
          );
        }
      }
    }
  }

  for (const family of data.families) {
    const released = releasedBodyPoses.get(family.pose_family_id) ?? [];
    const claimsArt = STATUSES_REQUIRING_ART.has(family.production_status);
    if (claimsArt && released.length === 0) {
      errors.push(
        `Pose family '${family.pose_family_id}' claims production status '${family.production_status}' but no released body art declares that pose.`,
      );
    }
    if (family.production_status === "pending-generation" && released.length > 0) {
      errors.push(
        `Pose family '${family.pose_family_id}' claims 'pending-generation' but ${released.length} released body component(s) already declare it: ${released.sort().join(", ")}.`,
      );
    }
    if (
      family.production_status === "development-fixture" &&
      family.human_qa === "approved"
    ) {
      errors.push(
        `Pose family '${family.pose_family_id}' is served only by development fixtures, so its human QA state cannot be 'approved'.`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Anchor resolution
// ---------------------------------------------------------------------------

/**
 * What a scene anchor asks a pose for. The anchor owns physical placement; this
 * is only the shape of the request.
 */
export interface PoseRequest {
  readonly anchorId: string;
  /** Poses this anchor permits, in preference order. */
  readonly permittedPoseFamilies: readonly string[];
  /** Facings this anchor permits; null means any registered facing. */
  readonly permittedFacings: readonly string[] | null;
  /** Whether this anchor offers a seat plane. */
  readonly hasSeatContact: boolean;
  /** Body family of the person being placed, for compatibility reasoning. */
  readonly bodyFamily: string;
}

export type PoseGapCode =
  /** The anchor permits no pose the registry defines. */
  | "anchor-permits-no-registered-pose"
  /** Every permitted pose is registered but none has released body art. */
  | "no-released-art-for-permitted-pose"
  /** Art exists, but not for this person's body family. */
  | "no-art-for-body-family"
  /** The preferred pose was unavailable and a permitted alternate was used. */
  | "preferred-pose-substituted"
  /** The anchor has a seat plane but permits only standing poses, or vice versa. */
  | "posture-class-mismatch"
  /** Art exists for the pose but not in a facing this anchor permits. */
  | "facing-not-available";

export interface PoseGap {
  readonly code: PoseGapCode;
  readonly anchorId: string;
  readonly poseFamilyId: string | null;
  readonly bodyFamily: string;
  /** Names the exact compatibility gap, not just "missing". */
  readonly message: string;
}

export interface PoseResolution {
  /** Null when nothing compatible could be resolved; the caller fails closed. */
  readonly poseFamily: PoseFamilyDefinition | null;
  /** Every reason this resolution is imperfect, named. Never silent. */
  readonly gaps: readonly PoseGap[];
}

/** Released body art available per pose family, keyed by body family. */
export interface PoseArtIndex {
  /** poseFamilyId -> body families with released art in that pose. */
  readonly bodyFamiliesByPose: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Builds the art index from manifest records. Only runtime-eligible bodies
 * count: an unreleased body is not art a scene may rely on.
 */
export function indexPoseArt(
  records: readonly CharacterComponentManifestRecord[],
): PoseArtIndex {
  const bodyFamiliesByPose = new Map<string, Set<string>>();
  for (const record of records) {
    const definition = record.component;
    if (!definition || definition.kind !== "body") continue;
    if (
      record.generation_status !== "approved" ||
      record.qa_status !== "approved" ||
      record.runtime_release_status !== "released"
    ) {
      continue;
    }
    const poseId = definition.pose_family;
    if (!poseId) continue;
    const set = bodyFamiliesByPose.get(poseId) ?? new Set<string>();
    set.add(definition.family);
    bodyFamiliesByPose.set(poseId, set);
  }
  return { bodyFamiliesByPose };
}

/**
 * Resolves the pose a scene anchor should be drawn in.
 *
 * The rule is deliberately narrow. A substitution is only ever made between
 * poses the anchor itself lists as permitted — the anchor's author declared
 * those interchangeable there — and it is always reported. A pose the anchor
 * does not permit is never substituted in, and when nothing permitted can be
 * drawn for this body family the resolution is null and the caller fails
 * closed rather than borrowing incompatible art.
 */
export function resolvePoseForRequest(
  request: PoseRequest,
  registry: PoseFamilyRegistry,
  art: PoseArtIndex,
): PoseResolution {
  const gaps: PoseGap[] = [];
  const gap = (
    code: PoseGapCode,
    poseFamilyId: string | null,
    message: string,
  ) => {
    gaps.push({
      code,
      anchorId: request.anchorId,
      poseFamilyId,
      bodyFamily: request.bodyFamily,
      message,
    });
  };

  const registered = request.permittedPoseFamilies
    .map((id) => registry.families.get(id))
    .filter((family): family is PoseFamilyDefinition => family !== undefined);

  const unregistered = request.permittedPoseFamilies.filter(
    (id) => !registry.families.has(id),
  );
  for (const id of unregistered) {
    gap(
      "anchor-permits-no-registered-pose",
      id,
      `Anchor '${request.anchorId}' permits pose '${id}', which the pose registry does not define.`,
    );
  }
  if (registered.length === 0) {
    return { poseFamily: null, gaps };
  }

  const expectedPosture = request.hasSeatContact ? "seated" : "standing";
  const posturallyValid = registered.filter((family) =>
    request.hasSeatContact
      ? family.posture_class === "seated"
      : family.posture_class !== "seated",
  );
  for (const family of registered) {
    if (!posturallyValid.includes(family)) {
      gap(
        "posture-class-mismatch",
        family.pose_family_id,
        `Anchor '${request.anchorId}' offers ${request.hasSeatContact ? "a seat plane" : "a floor line only"}, so it needs a ${expectedPosture} pose; '${family.pose_family_id}' is ${family.posture_class}.`,
      );
    }
  }
  if (posturallyValid.length === 0) {
    return { poseFamily: null, gaps };
  }

  const facingAllowed = (family: PoseFamilyDefinition) =>
    request.permittedFacings === null ||
    request.permittedFacings.includes(family.facing);

  const facingValid = posturallyValid.filter(facingAllowed);
  for (const family of posturallyValid) {
    if (!facingAllowed(family)) {
      gap(
        "facing-not-available",
        family.pose_family_id,
        `Anchor '${request.anchorId}' permits facings ${(request.permittedFacings ?? []).join(", ") || "none"}; pose '${family.pose_family_id}' faces '${family.facing}'.`,
      );
    }
  }
  if (facingValid.length === 0) {
    return { poseFamily: null, gaps };
  }

  const drawable = facingValid.filter((family) =>
    art.bodyFamiliesByPose.get(family.pose_family_id)?.has(request.bodyFamily),
  );

  const preferred = facingValid[0]!;
  if (drawable.length === 0) {
    for (const family of facingValid) {
      const bodies = art.bodyFamiliesByPose.get(family.pose_family_id);
      if (!bodies || bodies.size === 0) {
        gap(
          "no-released-art-for-permitted-pose",
          family.pose_family_id,
          `Pose '${family.pose_family_id}' (${family.priority}, ${family.production_status}) has no released body art at all, so anchor '${request.anchorId}' cannot use it.`,
        );
      } else {
        gap(
          "no-art-for-body-family",
          family.pose_family_id,
          `Pose '${family.pose_family_id}' has released body art for ${[...bodies].sort().join(", ")}, but not for body family '${request.bodyFamily}'.`,
        );
      }
    }
    return { poseFamily: null, gaps };
  }

  const chosen = drawable[0]!;
  if (chosen.pose_family_id !== preferred.pose_family_id) {
    gap(
      "preferred-pose-substituted",
      preferred.pose_family_id,
      `Anchor '${request.anchorId}' prefers pose '${preferred.pose_family_id}' but body family '${request.bodyFamily}' has no released art for it; the anchor's next permitted pose '${chosen.pose_family_id}' was used instead.`,
    );
  }
  return { poseFamily: chosen, gaps };
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export interface PoseCoverageRow {
  readonly poseFamilyId: string;
  readonly priority: PosePriority;
  readonly postureClass: PosePostureClass;
  readonly productionStatus: PoseProductionStatus;
  /** Body families with released art in this pose, sorted. */
  readonly coveredBodyFamilies: readonly string[];
  /** Body families the pose is authored for but has no released art in. */
  readonly missingBodyFamilies: readonly string[];
  readonly covered: boolean;
}

export interface PoseCoverageReport {
  readonly rows: readonly PoseCoverageRow[];
  /** P0 families with no released art for at least one authored body family. */
  readonly p0Gaps: readonly PoseCoverageRow[];
}

/**
 * Which pose families are actually drawable, per body family. This is the
 * answer to "what still needs generating", computed from the registry and the
 * library rather than asserted in prose.
 */
export function reportPoseCoverage(
  registry: PoseFamilyRegistry,
  art: PoseArtIndex,
): PoseCoverageReport {
  const rows = [...registry.families.values()]
    .sort((a, b) =>
      a.pose_family_id < b.pose_family_id
        ? -1
        : a.pose_family_id > b.pose_family_id
          ? 1
          : 0,
    )
    .map((family) => {
      const covered = art.bodyFamiliesByPose.get(family.pose_family_id);
      const coveredBodyFamilies = [...(covered ?? [])].sort();
      const missingBodyFamilies = family.compatible_body_families
        .filter((bodyFamily) => !covered?.has(bodyFamily))
        .sort();
      return {
        poseFamilyId: family.pose_family_id,
        priority: family.priority,
        postureClass: family.posture_class,
        productionStatus: family.production_status,
        coveredBodyFamilies,
        missingBodyFamilies,
        covered:
          coveredBodyFamilies.length > 0 && missingBodyFamilies.length === 0,
      } satisfies PoseCoverageRow;
    });
  return {
    rows,
    p0Gaps: rows.filter((row) => row.priority === "P0" && !row.covered),
  };
}
