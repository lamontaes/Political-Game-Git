import { stableHash } from "../simulation/ids";
import type { PersonAppearance } from "../simulation/person-appearance";
import { SeededRng } from "../simulation/rng";

/**
 * Modular character component contract.
 *
 * This module is presentation-only. It reads the canonical person-owned
 * `PersonAppearance` identity and the art manifest, and it never writes
 * simulation state. It is deliberately free of React, DOM, Vite, and Node
 * APIs so the art validator and the browser runtime share one implementation.
 *
 * Three anchor concepts stay distinct:
 * - a SCENE anchor (visual-integration) owns where a character sits in a room;
 * - a CHARACTER ROOT (pelvis-hip-center) owns where the rig meets the scene;
 * - an ATTACHMENT anchor owns where a component meets the rig.
 *
 * Attachment anchors are metadata declared on the body component. They are
 * never encoded as marks in imagery.
 */

export const CHARACTER_COMPONENT_KINDS = [
  "body",
  "head",
  "hair-front",
  "hair-back",
  "facial-hair",
  "eyewear",
  "top",
  "bottom",
  "footwear",
  "accessory",
] as const;

export type CharacterComponentKind = (typeof CHARACTER_COMPONENT_KINDS)[number];

/**
 * Kinds that may own a recipe slot. `hair-back` is only reachable through a
 * `hair-front` pairing so a hairstyle is one identity choice with two layers.
 */
export type CharacterSlotKind = Exclude<CharacterComponentKind, "hair-back">;

const HEAD_ATTACHED_KINDS: ReadonlySet<CharacterComponentKind> = new Set([
  "hair-front",
  "hair-back",
  "facial-hair",
  "eyewear",
]);

const BODY_ATTACHED_KINDS: ReadonlySet<CharacterComponentKind> = new Set([
  "head",
  "top",
  "bottom",
  "footwear",
]);

/**
 * Art complexion bands.
 *
 * These name ART DIRECTION, never demography. Complexion is source art on the
 * body and head components, selected through the appearance recipe like any
 * other component. It must never be inferred from a person's name, and no body
 * geometry may encode race or ethnicity.
 */
export const CHARACTER_COMPLEXION_BANDS = [
  "light",
  "medium-warm",
  "medium-cool",
  "deep-rich",
] as const;

export type CharacterComplexion = (typeof CHARACTER_COMPLEXION_BANDS)[number];

/** A point where a body meets scene geometry, normalized in the body canvas. */
export interface CharacterContactPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Where this body touches the world. The scene owns the floor line and the
 * seat plane; the body owns the points that must land on them. Together they
 * replace per-sprite hand tuning.
 */
export interface CharacterBodyContacts {
  readonly leftFoot?: CharacterContactPoint;
  readonly rightFoot?: CharacterContactPoint;
  /** Seated poses only: the point that must land on the seat plane. */
  readonly seatedPelvis?: CharacterContactPoint;
}

export interface CharacterAttachmentAnchor {
  /** Stable anchor identity such as `head`, `torso`, or `feet`. */
  readonly id: string;
  /** Normalized position in the body canvas, 0..1 from the top-left. */
  readonly x: number;
  readonly y: number;
}

export interface CharacterComponentOrigin {
  /** Normalized point in the component's own canvas that lands on its anchor. */
  readonly x: number;
  readonly y: number;
}

export interface CharacterCanvas {
  /** Authored raster size in pixels. Validation checks it against the file. */
  readonly width: number;
  readonly height: number;
}

export interface CharacterRigRoot {
  readonly convention: "pelvis-hip-center";
  readonly x: number;
  readonly y: number;
}

/**
 * Manifest-facing component definition. Field names follow the manifest's
 * snake_case convention because this object is stored inside
 * `art/manifest/asset_manifest.json`.
 *
 * Every component names a `family`. For a body the family is the body
 * geometry family; for a head it is the head geometry family; for every other
 * kind it groups the same item drawn for different poses or head orientations.
 * Identity selects families; the pose-dependent context selects components.
 */
export interface CharacterComponentDefinition {
  readonly kind: CharacterComponentKind;
  readonly family: string;
  /** Append-only catalog lineage generation in which this component appeared. */
  readonly catalog_generation: number;
  /** Integer draw order within one character; higher draws in front. */
  readonly layer: number;
  readonly canvas: CharacterCanvas;

  /** Body only: the pose this body raster presents. */
  readonly pose_family?: string;
  /** Body only: the head orientation this pose presents. */
  readonly head_orientation?: string;
  /** Body only: rig root. */
  readonly root?: CharacterRigRoot;
  /** Body only: attachment anchors owned by this rig. */
  readonly attachment_anchors?: readonly CharacterAttachmentAnchor[];

  /** Non-body: the body-rig anchor this component attaches to. */
  readonly attaches_to?: string;
  /** Non-body: the point in this component's canvas that lands on the anchor. */
  readonly origin?: CharacterComponentOrigin;

  /** Head and body-attached kinds: compatible body families. */
  readonly compatible_body_families?: readonly string[];
  /** Head-attached kinds: compatible head families. */
  readonly compatible_head_families?: readonly string[];
  /** Body-attached kinds: compatible poses; omitted means every pose. */
  readonly compatible_pose_families?: readonly string[];
  /** Head and head-attached kinds: compatible orientations; omitted means all. */
  readonly compatible_head_orientations?: readonly string[];

  /** hair-front only: asset ID of the hair-back layer drawn behind the body. */
  readonly paired_with?: string;

  /**
   * Body and head only: the art complexion band this raster was drawn in. A
   * head's complexion must equal its body's; there is no runtime recolour.
   */
  readonly complexion?: CharacterComplexion;

  /** Body only: contact points this pose offers a scene. */
  readonly contacts?: CharacterBodyContacts;

  /**
   * Non-body: slot IDs this component forbids while it is worn, so a garment
   * can refuse a conflicting layer instead of drawing through it.
   */
  readonly blocked_slots?: readonly string[];
}

export interface CharacterComponentManifestRecord {
  readonly asset_id: string;
  readonly asset_type: string;
  readonly fixed_or_modular?: "fixed" | "modular";
  readonly generation_status: "draft" | "approved" | "rejected" | "pending";
  readonly qa_status: "approved" | "rejected" | "pending";
  readonly runtime_release_status: "unreleased" | "released";
  readonly final_path?: string;
  readonly hash?: string;
  readonly component?: CharacterComponentDefinition;
  /**
   * Manifest-level availability class. A `development-fixture` component is
   * eligible for identity selection only while no `production-candidate`
   * component of the same kind exists at the resolved generation, so DEV
   * fixtures keep serving generation-1 people and regression tests without
   * ever being chosen for people once real components exist. Lives on the
   * record, not the definition, so past generation signatures are unaffected.
   */
  readonly availability?: CharacterComponentAvailability;

  /**
   * The definition a banked candidate WOULD carry once promoted. Named
   * differently from `component` on purpose: nothing that resolves an identity
   * reads this field, so a candidate cannot leak into a person by accident.
   *
   * It carries no `catalog_generation`, because a banked candidate is in no
   * generation (D-063, D-065). The number is not withheld for tidiness: a
   * generation's membership is frozen by its signature, so writing one down
   * before anyone has agreed to admit the part would name a membership that
   * does not exist. Promotion assigns it — see `promoteCandidateComponent`.
   */
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

/**
 * What a banked candidate knows about itself: everything a catalog component
 * declares except which generation it belongs to.
 *
 * Deriving it from `CharacterComponentDefinition` rather than restating the
 * fields keeps the two from drifting, and makes the single difference between
 * a banked part and a catalog part legible in the type: membership.
 */
export type CharacterComponentCandidateDefinition = Omit<
  CharacterComponentDefinition,
  "catalog_generation"
>;

export type CharacterComponentAvailability =
  "development-fixture" | "production-candidate";

export const CHARACTER_COMPONENT_ASSET_TYPE = "character-component";

/**
 * A modular part that has been banked but has NOT entered the catalog.
 *
 * Intake produces real files, real hashes and a real definition long before
 * anyone has agreed the art is good enough to put on a person. A candidate is
 * that state, made explicit: its bytes, provenance and reproducibility are
 * under test, and it is invisible to identity resolution.
 *
 * Keeping candidates out of the catalog is not bookkeeping. A catalog
 * generation's membership is frozen by its signature so that a saved person
 * keeps resolving to the same parts forever; admitting a component that cannot
 * be drawn yet would either render that person as a placeholder now, or change
 * who they look like on the day the art is accepted. Promotion is therefore a
 * deliberate act — `candidate_component` becomes `component`, the type changes,
 * and the component joins a NEW generation — not a status flag flipping.
 */
export const CHARACTER_COMPONENT_CANDIDATE_ASSET_TYPE =
  "character-component-candidate";

export interface CharacterSlotDefinition {
  readonly slot_id: string;
  readonly kind: CharacterSlotKind;
  readonly required: boolean;
  /** Optional slots only: deterministic presence rate in [0, 1]. */
  readonly presence_rate?: number;
}

export interface CharacterCatalogGeneration {
  readonly generation: number;
  readonly component_ids: readonly string[];
  /** `csig_` + stableHash of the generation's canonical component definitions. */
  readonly signature: string;
}

/**
 * Append-only character catalog ledger stored in
 * `art/manifest/character_catalog.json`. A generation's membership and
 * definitions are frozen by its signature, so an established recipe pinned to
 * a generation is reproducible after the library grows.
 */
export interface CharacterCatalogData {
  readonly catalog_generation: number;
  readonly slots: readonly CharacterSlotDefinition[];
  readonly generations: readonly CharacterCatalogGeneration[];
}

export interface CharacterComponent {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
  /** Runtime eligible per the existing approval + QA + release gate. */
  readonly released: boolean;
  /** True for DEV/NON-PRODUCTION fixtures (see `availability`). */
  readonly fixture: boolean;
}

export interface CharacterComponentLibrary {
  readonly catalogGeneration: number;
  readonly slots: readonly CharacterSlotDefinition[];
  readonly generations: readonly CharacterCatalogGeneration[];
  readonly components: ReadonlyMap<string, CharacterComponent>;
}

export const CHARACTER_GENERATION_SIGNATURE_PREFIX = "csig_";

const isFiniteInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);
const isUnitInterval = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(isNonEmptyString);

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${canonicalJson(entryValue)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isComponentRecord(
  record: CharacterComponentManifestRecord,
): record is CharacterComponentManifestRecord & {
  readonly component: CharacterComponentDefinition;
} {
  return (
    record.asset_type === CHARACTER_COMPONENT_ASSET_TYPE ||
    record.component !== undefined
  );
}

function isRuntimeEligible(record: CharacterComponentManifestRecord): boolean {
  return (
    record.generation_status === "approved" &&
    record.qa_status === "approved" &&
    record.runtime_release_status === "released"
  );
}

/**
 * Canonical signature for one catalog generation: the sorted component IDs
 * and their complete definitions, hashed with the repository's stable hash.
 * Any edit to a past generation's membership or definitions changes it.
 */
export function computeCharacterGenerationSignature(
  components: readonly {
    readonly assetId: string;
    readonly definition: CharacterComponentDefinition;
  }[],
): string {
  const payload = [...components]
    .sort((a, b) =>
      a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
    )
    .map((component) => ({
      asset_id: component.assetId,
      component: component.definition,
    }));
  return `${CHARACTER_GENERATION_SIGNATURE_PREFIX}${stableHash(
    `character-generation-v1:${canonicalJson(payload)}`,
  )}`;
}

const COMPLEXION_BANDS: ReadonlySet<string> = new Set(
  CHARACTER_COMPLEXION_BANDS,
);

function validateComplexion(
  definition: CharacterComponentDefinition,
  label: string,
  errors: string[],
): void {
  if (definition.complexion === undefined) return;
  if (!COMPLEXION_BANDS.has(definition.complexion)) {
    errors.push(
      `${label} declares complexion '${definition.complexion}', which is not one of ${CHARACTER_COMPLEXION_BANDS.join(", ")}.`,
    );
  }
}

function validateBodyContacts(
  definition: CharacterComponentDefinition,
  label: string,
  errors: string[],
): void {
  const contacts = definition.contacts;
  if (contacts === undefined) return;
  if (typeof contacts !== "object") {
    errors.push(`${label} (body) 'contacts' must be an object.`);
    return;
  }
  for (const key of ["leftFoot", "rightFoot", "seatedPelvis"] as const) {
    const point = contacts[key];
    if (point === undefined) continue;
    if (!isUnitInterval(point.x) || !isUnitInterval(point.y)) {
      errors.push(
        `${label} (body) contact '${key}' must be normalized 0..1 in the body canvas.`,
      );
    }
  }
  if (
    (contacts.leftFoot === undefined) !==
    (contacts.rightFoot === undefined)
  ) {
    errors.push(
      `${label} (body) declares one foot contact without the other; a floor line needs both soles.`,
    );
  }
}

export function createCharacterComponentLibrary(
  records: readonly CharacterComponentManifestRecord[],
  catalog: CharacterCatalogData,
): CharacterComponentLibrary {
  const components = new Map<string, CharacterComponent>();
  for (const record of records) {
    if (!isComponentRecord(record)) continue;
    components.set(record.asset_id, {
      assetId: record.asset_id,
      definition: record.component,
      released: isRuntimeEligible(record),
      fixture: record.availability === "development-fixture",
    });
  }
  return {
    catalogGeneration: catalog.catalog_generation,
    slots: catalog.slots,
    generations: catalog.generations,
    components,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Structural validation shared by `validate:art` and tests. Returns named
 * errors rather than throwing so the art validator can aggregate them.
 * File existence, hashes, provenance, and raster dimensions remain the art
 * validator's responsibility.
 */
export function validateCharacterComponentLibrary(
  records: readonly CharacterComponentManifestRecord[],
  catalog: CharacterCatalogData,
): readonly string[] {
  const errors: string[] = [];

  if (!catalog || typeof catalog !== "object") {
    return ["Character catalog is missing or not an object."];
  }
  if (
    !isFiniteInteger(catalog.catalog_generation) ||
    catalog.catalog_generation < 0
  ) {
    errors.push(
      "Character catalog 'catalog_generation' must be a non-negative integer.",
    );
  }
  if (!Array.isArray(catalog.slots)) {
    errors.push("Character catalog 'slots' must be an array.");
  }
  if (!Array.isArray(catalog.generations)) {
    errors.push("Character catalog 'generations' must be an array.");
  }
  if (errors.length > 0) return errors;

  // Slots ---------------------------------------------------------------
  const slotIds = new Set<string>();
  const slotKinds = new Set<CharacterSlotKind>();
  for (const slot of catalog.slots) {
    if (!isNonEmptyString(slot.slot_id)) {
      errors.push("A character slot is missing its 'slot_id'.");
      continue;
    }
    if (slotIds.has(slot.slot_id)) {
      errors.push(`Duplicate character slot_id '${slot.slot_id}'.`);
    }
    slotIds.add(slot.slot_id);
    const slotKind: string = slot.kind;
    if (
      !CHARACTER_COMPONENT_KINDS.includes(slotKind as CharacterComponentKind) ||
      slotKind === "hair-back"
    ) {
      errors.push(
        `Character slot '${slot.slot_id}' has invalid kind '${slot.kind}'.`,
      );
    } else {
      slotKinds.add(slot.kind);
    }
    if (typeof slot.required !== "boolean") {
      errors.push(
        `Character slot '${slot.slot_id}' must declare boolean 'required'.`,
      );
    } else if (slot.required && slot.presence_rate !== undefined) {
      errors.push(
        `Required character slot '${slot.slot_id}' must not declare 'presence_rate'.`,
      );
    } else if (!slot.required && !isUnitInterval(slot.presence_rate)) {
      errors.push(
        `Optional character slot '${slot.slot_id}' must declare 'presence_rate' in [0, 1].`,
      );
    }
  }
  if (catalog.slots.length > 0 && !slotKinds.has("body")) {
    errors.push("Character catalog must declare a required 'body' slot.");
  }
  if (catalog.slots.length > 0 && !slotKinds.has("head")) {
    errors.push("Character catalog must declare a required 'head' slot.");
  }
  for (const slot of catalog.slots) {
    if (
      (slot.kind === "body" || slot.kind === "head") &&
      slot.required === false
    ) {
      errors.push(
        `Character slot '${slot.slot_id}' of kind '${slot.kind}' must be required.`,
      );
    }
  }
  const kindSlotCount = new Map<CharacterSlotKind, number>();
  for (const slot of catalog.slots) {
    kindSlotCount.set(slot.kind, (kindSlotCount.get(slot.kind) ?? 0) + 1);
  }
  for (const [kind, count] of kindSlotCount) {
    if ((kind === "body" || kind === "head") && count > 1) {
      errors.push(
        `Character catalog declares ${count} '${kind}' slots; exactly one is allowed.`,
      );
    }
  }

  // Components ------------------------------------------------------------
  const components: CharacterComponent[] = [];
  const seenIds = new Set<string>();
  for (const record of records) {
    const hasType = record.asset_type === CHARACTER_COMPONENT_ASSET_TYPE;
    const hasDefinition = record.component !== undefined;
    if (!hasType && !hasDefinition) continue;
    if (hasType !== hasDefinition) {
      errors.push(
        `Asset '${record.asset_id}' must declare both asset_type '${CHARACTER_COMPONENT_ASSET_TYPE}' and a 'component' definition, or neither.`,
      );
      continue;
    }
    if (record.fixed_or_modular !== "modular") {
      errors.push(
        `Character component '${record.asset_id}' must declare fixed_or_modular 'modular'.`,
      );
    }
    if (
      record.availability !== undefined &&
      record.availability !== "development-fixture" &&
      record.availability !== "production-candidate"
    ) {
      errors.push(
        `Character component '${record.asset_id}' has invalid availability '${String(record.availability)}'.`,
      );
    }
    if (seenIds.has(record.asset_id)) {
      errors.push(`Duplicate character component ID '${record.asset_id}'.`);
      continue;
    }
    seenIds.add(record.asset_id);
    components.push({
      assetId: record.asset_id,
      definition: record.component as CharacterComponentDefinition,
      released: isRuntimeEligible(record),
      fixture: record.availability === "development-fixture",
    });
  }

  const byId = new Map(
    components.map((component) => [component.assetId, component]),
  );
  const bodyFamilies = new Set<string>();
  const headFamilies = new Set<string>();
  const poseFamilies = new Set<string>();
  const headOrientations = new Set<string>();
  for (const { definition } of components) {
    if (definition.kind === "body") {
      if (isNonEmptyString(definition.family))
        bodyFamilies.add(definition.family);
      if (isNonEmptyString(definition.pose_family))
        poseFamilies.add(definition.pose_family);
      if (isNonEmptyString(definition.head_orientation)) {
        headOrientations.add(definition.head_orientation);
      }
    }
    if (definition.kind === "head" && isNonEmptyString(definition.family)) {
      headFamilies.add(definition.family);
    }
  }

  for (const { assetId, definition } of components) {
    const label = `Character component '${assetId}'`;
    if (!CHARACTER_COMPONENT_KINDS.includes(definition.kind)) {
      errors.push(`${label} has invalid kind '${definition.kind}'.`);
      continue;
    }
    if (!isNonEmptyString(definition.family)) {
      errors.push(`${label} must declare a non-empty 'family'.`);
    }
    if (
      !isFiniteInteger(definition.catalog_generation) ||
      definition.catalog_generation < 1
    ) {
      errors.push(
        `${label} must declare an integer 'catalog_generation' >= 1.`,
      );
    } else if (definition.catalog_generation > catalog.catalog_generation) {
      errors.push(
        `${label} declares catalog_generation ${definition.catalog_generation} beyond the catalog's ${catalog.catalog_generation}.`,
      );
    }
    if (!isFiniteInteger(definition.layer)) {
      errors.push(`${label} must declare an integer 'layer'.`);
    }
    if (
      !definition.canvas ||
      !isFiniteInteger(definition.canvas.width) ||
      !isFiniteInteger(definition.canvas.height) ||
      definition.canvas.width <= 0 ||
      definition.canvas.height <= 0
    ) {
      errors.push(
        `${label} must declare a positive integer 'canvas' width and height.`,
      );
    }

    const isBody = definition.kind === "body";
    if (isBody) {
      if (!isNonEmptyString(definition.pose_family)) {
        errors.push(`${label} (body) must declare 'pose_family'.`);
      }
      if (!isNonEmptyString(definition.head_orientation)) {
        errors.push(`${label} (body) must declare 'head_orientation'.`);
      }
      if (
        !definition.root ||
        definition.root.convention !== "pelvis-hip-center" ||
        !isUnitInterval(definition.root.x) ||
        !isUnitInterval(definition.root.y)
      ) {
        errors.push(
          `${label} (body) must declare a normalized pelvis-hip-center 'root'.`,
        );
      }
      if (
        !Array.isArray(definition.attachment_anchors) ||
        definition.attachment_anchors.length === 0
      ) {
        errors.push(
          `${label} (body) must declare at least one attachment anchor.`,
        );
      } else {
        const anchorIds = new Set<string>();
        for (const anchor of definition.attachment_anchors) {
          if (!isNonEmptyString(anchor.id)) {
            errors.push(
              `${label} (body) has an attachment anchor without an id.`,
            );
            continue;
          }
          if (anchorIds.has(anchor.id)) {
            errors.push(
              `${label} (body) declares duplicate attachment anchor '${anchor.id}'.`,
            );
          }
          anchorIds.add(anchor.id);
          if (!isUnitInterval(anchor.x) || !isUnitInterval(anchor.y)) {
            errors.push(
              `${label} (body) attachment anchor '${anchor.id}' must be normalized 0..1.`,
            );
          }
        }
      }
      for (const forbidden of [
        "attaches_to",
        "origin",
        "compatible_body_families",
        "compatible_head_families",
        "compatible_pose_families",
        "compatible_head_orientations",
        "paired_with",
        "blocked_slots",
      ] as const) {
        if (definition[forbidden] !== undefined) {
          errors.push(`${label} (body) must not declare '${forbidden}'.`);
        }
      }
      validateComplexion(definition, label, errors);
      validateBodyContacts(definition, label, errors);
      continue;
    }

    // Non-body components -------------------------------------------------
    if (!isNonEmptyString(definition.attaches_to)) {
      errors.push(`${label} must declare 'attaches_to'.`);
    }
    if (
      !definition.origin ||
      !isUnitInterval(definition.origin.x) ||
      !isUnitInterval(definition.origin.y)
    ) {
      errors.push(`${label} must declare a normalized 'origin'.`);
    }
    for (const forbidden of [
      "pose_family",
      "head_orientation",
      "root",
      "attachment_anchors",
      "contacts",
    ] as const) {
      if (definition[forbidden] !== undefined) {
        errors.push(
          `${label} (${definition.kind}) must not declare body-only '${forbidden}'.`,
        );
      }
    }
    if (definition.kind === "head") {
      validateComplexion(definition, label, errors);
    } else if (definition.complexion !== undefined) {
      errors.push(
        `${label} (${definition.kind}) must not declare 'complexion'; complexion is source art on bodies and heads only.`,
      );
    }
    if (definition.blocked_slots !== undefined) {
      if (!isStringArray(definition.blocked_slots)) {
        errors.push(`${label} 'blocked_slots' must be a string array.`);
      } else {
        for (const blocked of definition.blocked_slots) {
          const slot = catalog.slots.find((entry) => entry.slot_id === blocked);
          if (!slot) {
            errors.push(`${label} blocks unknown character slot '${blocked}'.`);
          } else if (slot.required) {
            errors.push(
              `${label} blocks required character slot '${blocked}'; a required slot can never be left empty.`,
            );
          }
        }
      }
    }

    const needsBodyFamilies =
      definition.kind === "head" || BODY_ATTACHED_KINDS.has(definition.kind);
    const needsHeadFamilies = HEAD_ATTACHED_KINDS.has(definition.kind);
    const isAccessory = definition.kind === "accessory";

    if (
      needsBodyFamilies &&
      !isStringArray(definition.compatible_body_families)
    ) {
      errors.push(
        `${label} (${definition.kind}) must declare 'compatible_body_families'.`,
      );
    } else if (
      needsBodyFamilies &&
      definition.compatible_body_families?.length === 0
    ) {
      errors.push(
        `${label} (${definition.kind}) 'compatible_body_families' must not be empty.`,
      );
    }
    if (
      needsHeadFamilies &&
      !isStringArray(definition.compatible_head_families)
    ) {
      errors.push(
        `${label} (${definition.kind}) must declare 'compatible_head_families'.`,
      );
    } else if (
      needsHeadFamilies &&
      definition.compatible_head_families?.length === 0
    ) {
      errors.push(
        `${label} (${definition.kind}) 'compatible_head_families' must not be empty.`,
      );
    }
    if (
      isAccessory &&
      !(
        (isStringArray(definition.compatible_body_families) &&
          definition.compatible_body_families.length > 0) ||
        (isStringArray(definition.compatible_head_families) &&
          definition.compatible_head_families.length > 0)
      )
    ) {
      errors.push(
        `${label} (accessory) must declare compatible body or head families.`,
      );
    }
    if (
      !needsBodyFamilies &&
      !isAccessory &&
      definition.compatible_body_families !== undefined
    ) {
      errors.push(
        `${label} (${definition.kind}) must not declare 'compatible_body_families'.`,
      );
    }
    if (
      !needsHeadFamilies &&
      !isAccessory &&
      definition.compatible_head_families !== undefined
    ) {
      errors.push(
        `${label} (${definition.kind}) must not declare 'compatible_head_families'.`,
      );
    }

    for (const family of definition.compatible_body_families ?? []) {
      if (!bodyFamilies.has(family)) {
        errors.push(`${label} references unknown body family '${family}'.`);
      }
    }
    for (const family of definition.compatible_head_families ?? []) {
      if (!headFamilies.has(family)) {
        errors.push(`${label} references unknown head family '${family}'.`);
      }
    }
    if (definition.compatible_pose_families !== undefined) {
      if (!isStringArray(definition.compatible_pose_families)) {
        errors.push(
          `${label} 'compatible_pose_families' must be a string array.`,
        );
      } else {
        for (const pose of definition.compatible_pose_families) {
          if (!poseFamilies.has(pose)) {
            errors.push(`${label} references unknown pose family '${pose}'.`);
          }
        }
      }
    }
    if (definition.compatible_head_orientations !== undefined) {
      if (!isStringArray(definition.compatible_head_orientations)) {
        errors.push(
          `${label} 'compatible_head_orientations' must be a string array.`,
        );
      } else {
        for (const orientation of definition.compatible_head_orientations) {
          if (!headOrientations.has(orientation)) {
            errors.push(
              `${label} references unknown head orientation '${orientation}'.`,
            );
          }
        }
      }
    }

    // Pairing ---------------------------------------------------------------
    if (definition.paired_with !== undefined) {
      if (definition.kind !== "hair-front") {
        errors.push(
          `${label} (${definition.kind}) must not declare 'paired_with'.`,
        );
      } else {
        const back = byId.get(definition.paired_with);
        if (!back) {
          errors.push(
            `${label} pairs with missing component '${definition.paired_with}'.`,
          );
        } else {
          if (back.definition.kind !== "hair-back") {
            errors.push(
              `${label} pairs with '${back.assetId}' which is not a hair-back component.`,
            );
          }
          if (
            isFiniteInteger(back.definition.layer) &&
            isFiniteInteger(definition.layer) &&
            back.definition.layer >= definition.layer
          ) {
            errors.push(
              `${label} hair-back layer must be behind its hair-front layer.`,
            );
          }
          const frontHeads = new Set(definition.compatible_head_families ?? []);
          for (const family of frontHeads) {
            if (
              !(back.definition.compatible_head_families ?? []).includes(family)
            ) {
              errors.push(
                `${label} hair-back '${back.assetId}' is not compatible with head family '${family}'.`,
              );
            }
          }
          if (back.definition.family !== definition.family) {
            errors.push(
              `${label} and its hair-back '${back.assetId}' must share one family.`,
            );
          }
          if (
            back.definition.catalog_generation !== definition.catalog_generation
          ) {
            errors.push(
              `${label} and its hair-back '${back.assetId}' must share one catalog generation.`,
            );
          }
        }
      }
    }
  }

  // hair-back must be paired by exactly one hair-front.
  const backPairCount = new Map<string, number>();
  for (const { definition } of components) {
    if (definition.kind === "hair-front" && definition.paired_with) {
      backPairCount.set(
        definition.paired_with,
        (backPairCount.get(definition.paired_with) ?? 0) + 1,
      );
    }
  }
  for (const { assetId, definition, released } of components) {
    if (definition.kind !== "hair-back") continue;
    const count = backPairCount.get(assetId) ?? 0;
    if (count !== 1) {
      errors.push(
        `Character component '${assetId}' (hair-back) must be paired by exactly one hair-front; found ${count}.`,
      );
    }
    if (released) {
      const front = components.find(
        (candidate) => candidate.definition.paired_with === assetId,
      );
      if (front && !front.released) {
        errors.push(
          `Released hair-back '${assetId}' is paired with unreleased hair-front '${front.assetId}'.`,
        );
      }
    }
  }
  for (const { assetId, definition, released } of components) {
    if (
      definition.kind === "hair-front" &&
      released &&
      definition.paired_with
    ) {
      const back = byId.get(definition.paired_with);
      if (back && !back.released) {
        errors.push(
          `Released hair-front '${assetId}' is paired with unreleased hair-back '${back.assetId}'.`,
        );
      }
    }
  }

  // Complexion is a property of the head family, so identity can fix a
  // complexion by choosing a head and the body must then agree.
  const headFamilyComplexion = new Map<string, string | undefined>();
  for (const { assetId, definition } of components) {
    if (definition.kind !== "head" || !isNonEmptyString(definition.family)) {
      continue;
    }
    if (!headFamilyComplexion.has(definition.family)) {
      headFamilyComplexion.set(definition.family, definition.complexion);
    } else if (
      headFamilyComplexion.get(definition.family) !== definition.complexion
    ) {
      errors.push(
        `Character component '${assetId}' declares complexion '${definition.complexion ?? "none"}' but other members of head family '${definition.family}' declare a different one; one head family is one complexion.`,
      );
    }
  }

  // A head that declares a complexion must be able to reach a body of the same
  // complexion in every body family it claims, or the pair cannot render.
  const bodyComplexionsByFamily = new Map<string, Set<string | undefined>>();
  for (const { definition } of components) {
    if (definition.kind !== "body" || !isNonEmptyString(definition.family)) {
      continue;
    }
    const set =
      bodyComplexionsByFamily.get(definition.family) ??
      new Set<string | undefined>();
    set.add(definition.complexion);
    bodyComplexionsByFamily.set(definition.family, set);
  }
  for (const { assetId, definition } of components) {
    if (definition.kind !== "head" || definition.complexion === undefined) {
      continue;
    }
    for (const bodyFamily of definition.compatible_body_families ?? []) {
      const available = bodyComplexionsByFamily.get(bodyFamily);
      if (!available) continue; // unknown family is already reported above
      if (!available.has(definition.complexion)) {
        errors.push(
          `Character component '${assetId}' (head, complexion '${definition.complexion}') is compatible with body family '${bodyFamily}', which has no body in that complexion; head and body complexion must match.`,
        );
      }
    }
  }

  // Family compatibility must be uniform within one family so identity can
  // reason about families without inspecting every pose variant.
  const familyCompat = new Map<string, string>();
  for (const { assetId, definition } of components) {
    if (definition.kind === "body" || !isNonEmptyString(definition.family))
      continue;
    const key = `${definition.kind}:${definition.family}`;
    const compat = canonicalJson({
      body: sortStrings(definition.compatible_body_families ?? []),
      head: sortStrings(definition.compatible_head_families ?? []),
    });
    const previous = familyCompat.get(key);
    if (previous === undefined) {
      familyCompat.set(key, compat);
    } else if (previous !== compat) {
      errors.push(
        `Character component '${assetId}' declares different family compatibility from other members of ${definition.kind} family '${definition.family}'.`,
      );
    }
  }

  // Attachment anchors must exist on every body the component can reach.
  const bodiesByFamily = new Map<string, CharacterComponent[]>();
  for (const component of components) {
    if (component.definition.kind !== "body") continue;
    const list = bodiesByFamily.get(component.definition.family) ?? [];
    list.push(component);
    bodiesByFamily.set(component.definition.family, list);
  }
  const headBodyFamilies = new Map<string, Set<string>>();
  for (const { definition } of components) {
    if (definition.kind !== "head") continue;
    const set = headBodyFamilies.get(definition.family) ?? new Set<string>();
    for (const family of definition.compatible_body_families ?? [])
      set.add(family);
    headBodyFamilies.set(definition.family, set);
  }
  for (const { assetId, definition } of components) {
    if (definition.kind === "body" || !isNonEmptyString(definition.attaches_to))
      continue;
    const reachableBodyFamilies = new Set<string>(
      definition.compatible_body_families ?? [],
    );
    for (const headFamily of definition.compatible_head_families ?? []) {
      for (const bodyFamily of headBodyFamilies.get(headFamily) ?? []) {
        reachableBodyFamilies.add(bodyFamily);
      }
    }
    for (const bodyFamily of reachableBodyFamilies) {
      for (const body of bodiesByFamily.get(bodyFamily) ?? []) {
        const anchors = body.definition.attachment_anchors ?? [];
        if (!anchors.some((anchor) => anchor.id === definition.attaches_to)) {
          errors.push(
            `Character component '${assetId}' attaches to anchor '${definition.attaches_to}' which body '${body.assetId}' does not declare.`,
          );
        }
      }
    }
  }

  // Catalog lineage ---------------------------------------------------------
  const generations = [...catalog.generations].sort(
    (a, b) => a.generation - b.generation,
  );
  generations.forEach((generation, index) => {
    if (generation.generation !== index + 1) {
      errors.push(
        `Character catalog generations must be contiguous from 1; found ${generation.generation} at position ${index + 1}.`,
      );
    }
  });
  if (generations.length !== catalog.catalog_generation) {
    errors.push(
      `Character catalog declares catalog_generation ${catalog.catalog_generation} but records ${generations.length} generations.`,
    );
  }
  const ledgerIds = new Set<string>();
  for (const generation of generations) {
    if (!isStringArray(generation.component_ids)) {
      errors.push(
        `Character catalog generation ${generation.generation} 'component_ids' must be a string array.`,
      );
      continue;
    }
    for (const id of generation.component_ids) {
      if (ledgerIds.has(id)) {
        errors.push(
          `Character catalog lists component '${id}' in more than one generation.`,
        );
      }
      ledgerIds.add(id);
    }
    const declared = sortStrings(
      components
        .filter(
          (component) =>
            component.definition.catalog_generation === generation.generation,
        )
        .map((component) => component.assetId),
    );
    const recorded = sortStrings(generation.component_ids);
    if (canonicalJson(declared) !== canonicalJson(recorded)) {
      errors.push(
        `Character catalog generation ${generation.generation} membership does not match components declaring that generation.`,
      );
      continue;
    }
    const expected = computeCharacterGenerationSignature(
      components.filter(
        (component) =>
          component.definition.catalog_generation === generation.generation,
      ),
    );
    if (generation.signature !== expected) {
      errors.push(
        `Character catalog generation ${generation.generation} signature '${generation.signature}' does not match its components; expected '${expected}'.`,
      );
    }
  }
  for (const { assetId, definition } of components) {
    if (
      isFiniteInteger(definition.catalog_generation) &&
      definition.catalog_generation >= 1 &&
      !ledgerIds.has(assetId)
    ) {
      errors.push(
        `Character component '${assetId}' is not recorded in any catalog generation.`,
      );
    }
  }

  // Deterministic resolution probe ------------------------------------------
  if (
    errors.length === 0 &&
    catalog.catalog_generation >= 1 &&
    components.length > 0
  ) {
    const library = createCharacterComponentLibrary(records, catalog);
    const probes = Array.from({ length: 8 }, (_, index) => ({
      seed: `app_probe_${index}`,
      recipeVersion: "appearance-recipe-v1",
    }));
    for (const poseFamily of sortStrings([...poseFamilies])) {
      for (const appearance of probes) {
        try {
          const first = resolveCharacterRecipe(
            { appearance, poseFamily },
            library,
          );
          const second = resolveCharacterRecipe(
            { appearance, poseFamily },
            library,
          );
          if (canonicalJson(first) !== canonicalJson(second)) {
            errors.push(
              `Character recipe resolution is not deterministic for pose '${poseFamily}'.`,
            );
          }
          const layers = first.context.components.map(
            (component) => component.layer,
          );
          if (new Set(layers).size !== layers.length) {
            errors.push(
              `Character recipe for pose '${poseFamily}' resolves components sharing one layer; layers must be distinct.`,
            );
          }
        } catch (error) {
          errors.push(
            `Character recipe resolution failed for pose '${poseFamily}': ${(error as Error).message}`,
          );
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface CharacterRecipeRequest {
  readonly appearance: PersonAppearance;
  readonly poseFamily: string;
  /** Catalog generation to resolve against; defaults to the library's current. */
  readonly catalogGeneration?: number;
}

/**
 * Pose-independent identity. Same seed, recipe version, and pinned catalog
 * generation always yield the same identity regardless of pose, library
 * growth in later generations, or release state.
 */
export interface CharacterRecipeIdentity {
  readonly bodyFamily: string;
  readonly headFamily: string;
  /**
   * Art complexion fixed by the chosen head family. The body chosen for any
   * pose must share it. Null when the library declares no complexions.
   */
  readonly complexion: CharacterComplexion | null;
  /** slot_id -> selected family, or null when an optional slot is absent. */
  readonly slots: Readonly<Record<string, string | null>>;
}

/**
 * Why a resolved context is not a complete person. Diagnostics are data, not
 * exceptions: the compositor still draws what resolved, the debug overlay
 * names what did not, and a required-slot gap fails the render plan closed.
 */
export type CharacterRecipeDiagnosticCode =
  /** W9: a required slot resolved no component for this context. */
  | "required-slot-empty"
  /** The chosen family has art, but none for this pose. */
  | "slot-family-has-no-art-for-pose"
  /** The chosen family has art for this pose, but not for this facing. */
  | "slot-family-has-no-art-for-facing"
  /** W8: another worn component forbids this slot. */
  | "slot-conflict"
  /** No body in the chosen family carries the identity's complexion. */
  | "body-complexion-unavailable";

export interface CharacterRecipeDiagnostic {
  readonly code: CharacterRecipeDiagnosticCode;
  readonly slotId: string;
  readonly kind: CharacterComponentKind | null;
  readonly family: string | null;
  readonly message: string;
}

export interface ResolvedCharacterComponent {
  readonly slotId: string;
  readonly kind: CharacterComponentKind;
  readonly family: string;
  readonly assetId: string;
  readonly layer: number;
  readonly released: boolean;
  /** Present on the hair-front entry when a hair-back layer exists. */
  readonly pairedAssetId?: string;
}

export interface CharacterRecipeContext {
  readonly poseFamily: string;
  readonly headOrientation: string | null;
  /** Ordered by layer ascending. Slots with no art for this pose are omitted. */
  readonly components: readonly ResolvedCharacterComponent[];
  /** Named reasons a slot is absent; empty when the person is complete. */
  readonly diagnostics: readonly CharacterRecipeDiagnostic[];
}

export interface CharacterRecipe {
  readonly appearanceSeed: string;
  readonly recipeVersion: string;
  readonly catalogGeneration: number;
  readonly identity: CharacterRecipeIdentity;
  readonly context: CharacterRecipeContext;
}

/**
 * Lifts banked candidates into a throwaway library shape for human review.
 *
 * A candidate has files, hashes and a definition; what it lacks is anyone's
 * agreement that it looks right. Reviewing it needs it composed onto a person,
 * and composing needs a library — so this builds one, marked approved and
 * released, containing NOTHING but the candidates.
 *
 * It is a development surface and never the production library. The records it
 * returns are constructed here rather than read from the manifest, so no
 * amount of misuse can make a candidate visible to the real catalog: the two
 * libraries are separate objects built from disjoint sets of records.
 */
export function liftCandidatesForReview(
  records: readonly CharacterComponentManifestRecord[],
  slots: readonly CharacterSlotDefinition[],
): {
  readonly records: readonly CharacterComponentManifestRecord[];
  readonly catalog: CharacterCatalogData;
} {
  const lifted = records
    .filter(
      (record) =>
        record.asset_type === CHARACTER_COMPONENT_CANDIDATE_ASSET_TYPE &&
        record.candidate_component !== undefined,
    )
    .map((record) => ({
      ...record,
      asset_type: CHARACTER_COMPONENT_ASSET_TYPE,
      generation_status: "approved" as const,
      qa_status: "approved" as const,
      runtime_release_status: "released" as const,
      component: {
        ...record.candidate_component!,
        catalog_generation: CANDIDATE_REVIEW_GENERATION,
      },
      candidate_component: undefined,
    }));
  // The review generation is invented here and belongs to this throwaway
  // library alone. A candidate declares no generation, so there is no number to
  // carry over; composing one for review needs a library, a library needs a
  // ledger, and a ledger needs a generation. Numbering them all 1 keeps that
  // scaffolding visibly local: this is not generation 1 of the real catalog,
  // and nothing here is written back to it.
  const members = lifted.map((record) => ({
    assetId: record.asset_id,
    definition: record.component,
  }));
  return {
    records: lifted,
    catalog: {
      catalog_generation: CANDIDATE_REVIEW_GENERATION,
      slots,
      generations: [
        {
          generation: CANDIDATE_REVIEW_GENERATION,
          component_ids: members.map((member) => member.assetId).sort(),
          signature: computeCharacterGenerationSignature(members),
        },
      ],
    },
  };
}

/**
 * The generation number the review lift stamps on its throwaway library.
 *
 * Exported so a test can name it rather than assume it, and so nothing has to
 * guess which number the review surface used.
 */
export const CANDIDATE_REVIEW_GENERATION = 1;

/**
 * Promotes one banked candidate into a catalog generation.
 *
 * This is the only place a generation is assigned to banked art, which is what
 * makes "a candidate is in no generation" a fact about the code rather than a
 * claim in prose. The caller supplies the generation because admitting a part
 * is an authorized decision about the catalog, not something the part can
 * decide about itself.
 *
 * It returns a new record and writes nothing. Promoting the thirty-five banked
 * derivatives additionally requires the human visual acceptance D-063 reserves;
 * none has been promoted.
 */
export function promoteCandidateComponent(
  record: CharacterComponentManifestRecord,
  generation: number,
): CharacterComponentManifestRecord {
  if (
    record.asset_type !== CHARACTER_COMPONENT_CANDIDATE_ASSET_TYPE ||
    record.candidate_component === undefined
  ) {
    throw new Error(
      `Asset '${record.asset_id}' is not a banked candidate and cannot be promoted.`,
    );
  }
  if (!isFiniteInteger(generation) || generation < 1) {
    throw new Error(
      `Asset '${record.asset_id}' must be promoted into an integer catalog generation >= 1.`,
    );
  }
  const { candidate_component: candidate, ...rest } = record;
  return {
    ...rest,
    asset_type: CHARACTER_COMPONENT_ASSET_TYPE,
    component: { ...candidate, catalog_generation: generation },
  };
}

/**
 * What a banked candidate must say about itself.
 *
 * The rules are deliberately narrow. A candidate is not asked to be good; it is
 * asked to be honest about not being in the catalog yet, so that "we have this
 * art" and "a person can wear this art" stay separate claims.
 */
export function validateCharacterComponentCandidates(
  records: readonly CharacterComponentManifestRecord[],
): string[] {
  const errors: string[] = [];
  for (const record of records) {
    const isCandidateType =
      record.asset_type === CHARACTER_COMPONENT_CANDIDATE_ASSET_TYPE;
    const hasCandidate = record.candidate_component !== undefined;
    if (!isCandidateType && !hasCandidate) continue;
    if (isCandidateType !== hasCandidate) {
      errors.push(
        `Asset '${record.asset_id}' must declare both asset_type '${CHARACTER_COMPONENT_CANDIDATE_ASSET_TYPE}' and a 'candidate_component' definition, or neither.`,
      );
      continue;
    }
    if (record.component !== undefined) {
      errors.push(
        `Asset '${record.asset_id}' is a banked candidate and must not also declare a catalog 'component'; promotion replaces one with the other.`,
      );
    }
    if (record.runtime_release_status === "released") {
      errors.push(
        `Asset '${record.asset_id}' is a banked candidate, so it cannot be runtime-released; promote it into a catalog generation instead.`,
      );
    }
    if (record.availability !== "production-candidate") {
      errors.push(
        `Asset '${record.asset_id}' is a banked candidate and must declare availability 'production-candidate'.`,
      );
    }
    if (record.fixed_or_modular !== "modular") {
      errors.push(
        `Asset '${record.asset_id}' is a banked modular candidate and must declare fixed_or_modular 'modular'.`,
      );
    }
    // The manifest is JSON, so the type that forbids this field cannot reach
    // it. Without this check a candidate could go on declaring membership of a
    // generation it is not in, which is exactly the disagreement between the
    // records and D-063 that D-065 repairs.
    if (
      (record.candidate_component as Record<string, unknown> | undefined)?.[
        "catalog_generation"
      ] !== undefined
    ) {
      errors.push(
        `Asset '${record.asset_id}' is a banked candidate and must not declare a 'catalog_generation'; a generation is assigned only when it is promoted.`,
      );
    }
  }
  return errors;
}

/**
 * Components eligible at a generation. Development fixtures of a kind step
 * aside as soon as a RELEASED production component of that kind exists at or
 * below the generation; because a generation's membership is frozen, a person
 * pinned to a fixture-only generation keeps resolving exactly as before.
 *
 * Release is part of the test on purpose. A production candidate that has been
 * banked but not yet visually accepted has no runtime raster behind it, so
 * letting it displace a fixture would replace a drawn person with a
 * placeholder. Selection still ignores release for everything else — this is
 * the one place where "is there something real here yet" is the question being
 * asked, and answering it wrong is visible to the player.
 */
export function componentsAtGeneration(
  library: CharacterComponentLibrary,
  generation: number,
): CharacterComponent[] {
  const inGeneration = [...library.components.values()].filter(
    (component) => component.definition.catalog_generation <= generation,
  );
  const productionKinds = new Set(
    inGeneration
      .filter((component) => !component.fixture && component.released)
      .map((component) => component.definition.kind),
  );
  return inGeneration
    .filter(
      (component) =>
        !component.fixture || !productionKinds.has(component.definition.kind),
    )
    .sort((a, b) =>
      a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
    );
}

function familyCompatibleWithIdentity(
  definition: CharacterComponentDefinition,
  bodyFamily: string,
  headFamily: string,
): boolean {
  const bodyOk =
    definition.compatible_body_families === undefined ||
    definition.compatible_body_families.includes(bodyFamily);
  const headOk =
    definition.compatible_head_families === undefined ||
    definition.compatible_head_families.includes(headFamily);
  if (definition.kind === "accessory") {
    const declaresBody = definition.compatible_body_families !== undefined;
    const declaresHead = definition.compatible_head_families !== undefined;
    return (declaresBody && bodyOk) || (declaresHead && headOk);
  }
  return bodyOk && headOk;
}

function contextCompatible(
  definition: CharacterComponentDefinition,
  poseFamily: string,
  headOrientation: string,
): boolean {
  const poseOk =
    definition.compatible_pose_families === undefined ||
    definition.compatible_pose_families.includes(poseFamily);
  const orientationOk =
    definition.compatible_head_orientations === undefined ||
    definition.compatible_head_orientations.includes(headOrientation);
  return poseOk && orientationOk;
}

function pickFamily(
  rng: SeededRng,
  key: string,
  families: readonly string[],
): string {
  return rng.fork(key).pick(sortStrings(families));
}

function pickComponent(
  rng: SeededRng,
  key: string,
  candidates: readonly CharacterComponent[],
): CharacterComponent {
  const sorted = [...candidates].sort((a, b) =>
    a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0,
  );
  return rng.fork(key).pick(sorted);
}

/**
 * Resolves a person's modular character recipe.
 *
 * Identity selection forks the repository `SeededRng` from the person-owned
 * appearance seed once per slot, so later slots never perturb earlier ones and
 * adding a slot cannot reshuffle existing choices. Candidate sets are limited
 * to the pinned catalog generation, whose membership is frozen by its ledger
 * signature, so growth in later generations cannot change a pinned identity.
 * Release state affects only the `released` flag, never selection.
 */
export function resolveCharacterRecipe(
  request: CharacterRecipeRequest,
  library: CharacterComponentLibrary,
): CharacterRecipe {
  const { appearance, poseFamily } = request;
  if (
    !isNonEmptyString(appearance.seed) ||
    !isNonEmptyString(appearance.recipeVersion)
  ) {
    throw new Error(
      "Character recipe requires a person-owned appearance seed and recipe version.",
    );
  }
  if (!isNonEmptyString(poseFamily)) {
    throw new Error("Character recipe requires a pose family.");
  }
  if (library.catalogGeneration < 1) {
    throw new Error(
      "Character catalog has no generation; no modular components can resolve.",
    );
  }
  const generation = request.catalogGeneration ?? library.catalogGeneration;
  if (
    !isFiniteInteger(generation) ||
    generation < 1 ||
    generation > library.catalogGeneration
  ) {
    throw new Error(
      `Character recipe generation ${generation} is outside the catalog range 1..${library.catalogGeneration}.`,
    );
  }

  const rng = new SeededRng(appearance.seed);
  const version = appearance.recipeVersion;
  const available = componentsAtGeneration(library, generation);

  const bodyFamilies = [
    ...new Set(
      available
        .filter((component) => component.definition.kind === "body")
        .map((component) => component.definition.family),
    ),
  ];
  if (bodyFamilies.length === 0) {
    throw new Error(
      `Character catalog generation ${generation} has no body families.`,
    );
  }
  const bodyFamily = pickFamily(
    rng,
    `character-identity:${version}:body-family`,
    bodyFamilies,
  );

  const headFamilies = [
    ...new Set(
      available
        .filter(
          (component) =>
            component.definition.kind === "head" &&
            (component.definition.compatible_body_families ?? []).includes(
              bodyFamily,
            ),
        )
        .map((component) => component.definition.family),
    ),
  ];
  if (headFamilies.length === 0) {
    throw new Error(
      `No head family is compatible with body family '${bodyFamily}' at generation ${generation}.`,
    );
  }
  const headFamily = pickFamily(
    rng,
    `character-identity:${version}:head-family`,
    headFamilies,
  );

  const slots: Record<string, string | null> = {};
  for (const slot of library.slots) {
    if (slot.kind === "body") {
      slots[slot.slot_id] = bodyFamily;
      continue;
    }
    if (slot.kind === "head") {
      slots[slot.slot_id] = headFamily;
      continue;
    }
    const families = [
      ...new Set(
        available
          .filter(
            (component) =>
              component.definition.kind === slot.kind &&
              familyCompatibleWithIdentity(
                component.definition,
                bodyFamily,
                headFamily,
              ),
          )
          .map((component) => component.definition.family),
      ),
    ];
    if (families.length === 0) {
      if (slot.required) {
        throw new Error(
          `Required character slot '${slot.slot_id}' has no ${slot.kind} family compatible with body '${bodyFamily}' and head '${headFamily}' at generation ${generation}.`,
        );
      }
      slots[slot.slot_id] = null;
      continue;
    }
    if (!slot.required) {
      const present =
        rng
          .fork(`character-identity:${version}:${slot.slot_id}:presence`)
          .next() < (slot.presence_rate ?? 0);
      if (!present) {
        slots[slot.slot_id] = null;
        continue;
      }
    }
    slots[slot.slot_id] = pickFamily(
      rng,
      `character-identity:${version}:${slot.slot_id}:family`,
      families,
    );
  }

  // Complexion is fixed by the head family; the body must match it.
  const complexion =
    available.find(
      (component) =>
        component.definition.kind === "head" &&
        component.definition.family === headFamily &&
        component.definition.complexion !== undefined,
    )?.definition.complexion ?? null;

  const identity: CharacterRecipeIdentity = {
    bodyFamily,
    headFamily,
    complexion,
    slots,
  };

  const diagnostics: CharacterRecipeDiagnostic[] = [];
  const bodySlotId =
    library.slots.find((slot) => slot.kind === "body")?.slot_id ?? "body";

  // Context: pose-dependent component choice within the established families.
  const posedBodies = available.filter(
    (component) =>
      component.definition.kind === "body" &&
      component.definition.family === bodyFamily &&
      component.definition.pose_family === poseFamily,
  );
  const bodyCandidates =
    complexion === null
      ? posedBodies
      : posedBodies.filter(
          (component) => component.definition.complexion === complexion,
        );
  const resolved: ResolvedCharacterComponent[] = [];
  let headOrientation: string | null = null;

  if (bodyCandidates.length === 0) {
    if (posedBodies.length > 0 && complexion !== null) {
      diagnostics.push({
        code: "body-complexion-unavailable",
        slotId: bodySlotId,
        kind: "body",
        family: bodyFamily,
        message: `Body family '${bodyFamily}' has ${poseFamily} art but none in complexion '${complexion}', which head family '${headFamily}' requires.`,
      });
    } else {
      diagnostics.push({
        code: "slot-family-has-no-art-for-pose",
        slotId: bodySlotId,
        kind: "body",
        family: bodyFamily,
        message: `Body family '${bodyFamily}' has no art for pose '${poseFamily}'.`,
      });
    }
  }

  if (bodyCandidates.length > 0) {
    const body = pickComponent(
      rng,
      `character-context:${version}:body:${poseFamily}`,
      bodyCandidates,
    );
    headOrientation = body.definition.head_orientation ?? null;
    resolved.push({
      slotId: bodySlotId,
      kind: "body",
      family: bodyFamily,
      assetId: body.assetId,
      layer: body.definition.layer,
      released: body.released,
    });

    // Chosen components first, so a garment can forbid a slot resolved later.
    const chosenBySlot = new Map<string, CharacterComponent>();
    for (const slot of library.slots) {
      if (slot.kind === "body") continue;
      const family = slots[slot.slot_id];
      if (!family) {
        if (slot.required) {
          diagnostics.push({
            code: "required-slot-empty",
            slotId: slot.slot_id,
            kind: slot.kind,
            family: null,
            message: `Required slot '${slot.slot_id}' resolved no ${slot.kind} family for this identity.`,
          });
        }
        continue;
      }
      const inFamily = available.filter(
        (component) =>
          component.definition.kind === slot.kind &&
          component.definition.family === family,
      );
      const forPose = inFamily.filter(
        (component) =>
          component.definition.compatible_pose_families === undefined ||
          component.definition.compatible_pose_families.includes(poseFamily),
      );
      const candidates = forPose.filter((component) =>
        contextCompatible(
          component.definition,
          poseFamily,
          headOrientation ?? "",
        ),
      );
      if (candidates.length === 0) {
        const code: CharacterRecipeDiagnosticCode =
          forPose.length === 0
            ? "slot-family-has-no-art-for-pose"
            : "slot-family-has-no-art-for-facing";
        const detail =
          forPose.length === 0
            ? `has no art for pose '${poseFamily}'`
            : `has no art facing '${headOrientation ?? "unknown"}', which body '${body.assetId}' presents`;
        diagnostics.push({
          code: slot.required ? "required-slot-empty" : code,
          slotId: slot.slot_id,
          kind: slot.kind,
          family,
          message: `${slot.required ? "Required slot" : "Slot"} '${slot.slot_id}' family '${family}' ${detail}.`,
        });
        continue;
      }
      chosenBySlot.set(
        slot.slot_id,
        pickComponent(
          rng,
          `character-context:${version}:${slot.slot_id}:${poseFamily}:${headOrientation ?? ""}`,
          candidates,
        ),
      );
    }

    // Blocked slots: a worn component may forbid another slot. Blocking a
    // required slot is a validation error, so only optional layers drop here.
    const blocked = new Map<string, string>();
    for (const [slotId, component] of chosenBySlot) {
      for (const target of component.definition.blocked_slots ?? []) {
        if (!blocked.has(target)) blocked.set(target, slotId);
      }
    }

    for (const slot of library.slots) {
      if (slot.kind === "body") continue;
      const chosen = chosenBySlot.get(slot.slot_id);
      if (!chosen) continue;
      const blockedBy = blocked.get(slot.slot_id);
      if (blockedBy !== undefined && blockedBy !== slot.slot_id) {
        diagnostics.push({
          code: "slot-conflict",
          slotId: slot.slot_id,
          kind: slot.kind,
          family: chosen.definition.family,
          message: `Slot '${slot.slot_id}' is blocked by the component worn in slot '${blockedBy}'; the conflicting layer is not drawn.`,
        });
        continue;
      }
      const family = chosen.definition.family;
      const entry: ResolvedCharacterComponent = {
        slotId: slot.slot_id,
        kind: chosen.definition.kind,
        family,
        assetId: chosen.assetId,
        layer: chosen.definition.layer,
        released: chosen.released,
        ...(chosen.definition.paired_with
          ? { pairedAssetId: chosen.definition.paired_with }
          : {}),
      };
      resolved.push(entry);
      if (chosen.definition.paired_with) {
        const back = library.components.get(chosen.definition.paired_with);
        if (back) {
          resolved.push({
            slotId: slot.slot_id,
            kind: back.definition.kind,
            family,
            assetId: back.assetId,
            layer: back.definition.layer,
            released: back.released,
          });
        }
      }
    }
  } else {
    for (const slot of library.slots) {
      if (slot.kind === "body" || !slot.required) continue;
      diagnostics.push({
        code: "required-slot-empty",
        slotId: slot.slot_id,
        kind: slot.kind,
        family: slots[slot.slot_id] ?? null,
        message: `Required slot '${slot.slot_id}' cannot resolve because no body resolved for pose '${poseFamily}'.`,
      });
    }
  }

  resolved.sort((a, b) => a.layer - b.layer);
  diagnostics.sort((a, b) =>
    a.slotId < b.slotId ? -1 : a.slotId > b.slotId ? 1 : 0,
  );

  return {
    appearanceSeed: appearance.seed,
    recipeVersion: version,
    catalogGeneration: generation,
    identity,
    context: {
      poseFamily,
      headOrientation,
      components: resolved,
      diagnostics,
    },
  };
}

/**
 * An established recipe is the identity a presentation session already showed
 * for a person. Re-resolving it against the same pinned generation must
 * reproduce it exactly; a mismatch means the catalog lineage was rewritten.
 */
export interface EstablishedCharacterRecipe {
  readonly appearanceSeed: string;
  readonly recipeVersion: string;
  readonly catalogGeneration: number;
  readonly identity: CharacterRecipeIdentity;
}

export function reproduceCharacterRecipe(
  established: EstablishedCharacterRecipe,
  poseFamily: string,
  library: CharacterComponentLibrary,
): CharacterRecipe {
  const recipe = resolveCharacterRecipe(
    {
      appearance: {
        seed: established.appearanceSeed,
        recipeVersion: established.recipeVersion,
      },
      poseFamily,
      catalogGeneration: established.catalogGeneration,
    },
    library,
  );
  if (canonicalJson(recipe.identity) !== canonicalJson(established.identity)) {
    throw new Error(
      `Established character identity for appearance '${established.appearanceSeed}' at catalog generation ${established.catalogGeneration} could not be reproduced; the catalog lineage has changed.`,
    );
  }
  return recipe;
}

// ---------------------------------------------------------------------------
// Layer projection
// ---------------------------------------------------------------------------

export interface ProjectedCharacterLayer {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly slotId: string;
  readonly layer: number;
  readonly released: boolean;
  /** Anchor the layer attaches to; null for the body rig itself. */
  readonly attachmentAnchorId: string | null;
  /** Rectangle in body-canvas units (body = 0,0,1,1). */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ProjectedCharacter {
  readonly root: CharacterRigRoot;
  readonly bodyCanvas: CharacterCanvas;
  /** Ordered by layer ascending; render in this order. */
  readonly layers: readonly ProjectedCharacterLayer[];
  /** True when every layer is runtime eligible. */
  readonly fullyReleased: boolean;
}

/**
 * Projects a resolved context into ordered layers positioned so each
 * component's declared origin lands on its declared body-rig anchor. Sizes are
 * relative to the body canvas at a 1:1 authored pixel scale within one body
 * family. Returns null when the pose has no body art (fail closed).
 */
export function projectCharacterLayers(
  recipe: CharacterRecipe,
  library: CharacterComponentLibrary,
): ProjectedCharacter | null {
  const bodyEntry = recipe.context.components.find(
    (component) => component.kind === "body",
  );
  if (!bodyEntry) return null;
  const body = library.components.get(bodyEntry.assetId);
  if (!body || !body.definition.root || !body.definition.attachment_anchors) {
    throw new Error(
      `Body component '${bodyEntry.assetId}' is missing rig metadata.`,
    );
  }
  const bodyCanvas = body.definition.canvas;
  const anchors = new Map(
    body.definition.attachment_anchors.map((anchor) => [anchor.id, anchor]),
  );

  const layers: ProjectedCharacterLayer[] = [];
  for (const entry of recipe.context.components) {
    const component = library.components.get(entry.assetId);
    if (!component) {
      throw new Error(
        `Resolved component '${entry.assetId}' is missing from the library.`,
      );
    }
    if (entry.kind === "body") {
      layers.push({
        assetId: entry.assetId,
        kind: entry.kind,
        slotId: entry.slotId,
        layer: entry.layer,
        released: entry.released,
        attachmentAnchorId: null,
        left: 0,
        top: 0,
        width: 1,
        height: 1,
      });
      continue;
    }
    const { attaches_to, origin, canvas } = component.definition;
    if (!attaches_to || !origin) {
      throw new Error(
        `Component '${entry.assetId}' is missing attachment metadata.`,
      );
    }
    const anchor = anchors.get(attaches_to);
    if (!anchor) {
      throw new Error(
        `Component '${entry.assetId}' attaches to anchor '${attaches_to}' which body '${body.assetId}' does not declare.`,
      );
    }
    const width = canvas.width / bodyCanvas.width;
    const height = canvas.height / bodyCanvas.height;
    layers.push({
      assetId: entry.assetId,
      kind: entry.kind,
      slotId: entry.slotId,
      layer: entry.layer,
      released: entry.released,
      attachmentAnchorId: anchor.id,
      left: anchor.x - origin.x * width,
      top: anchor.y - origin.y * height,
      width,
      height,
    });
  }
  layers.sort((a, b) => a.layer - b.layer);

  return {
    root: body.definition.root,
    bodyCanvas,
    layers,
    fullyReleased: layers.every((layer) => layer.released),
  };
}
