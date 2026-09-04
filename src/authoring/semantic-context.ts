/**
 * SYSTEM 5 — PHYSICAL SCENE FAMILY VERSUS CANONICAL WORLD LABEL
 *
 * A picture of a modest apartment is a picture of a modest apartment. Whether
 * it is YOUR apartment, your parents' apartment, Jordan's apartment or a
 * friend's apartment is a fact about the World, not a fact about the image.
 *
 * Conflating the two is a trap that only springs later. The moment a plate is
 * named `parents_apartment.png` and treated as such, the same room cannot be
 * reused when the player rents their own place, and the library grows a near
 * identical second apartment. Repeat that across a career's worth of homes,
 * parks and offices and the asset bank is mostly duplicates.
 *
 * So this module keeps two things apart and makes the seam explicit:
 *
 * - a PHYSICAL SCENE FAMILY, which is what the art actually depicts, and
 * - a SEMANTIC BINDING, which is what the World is currently calling it.
 *
 * The binding is supplied by the caller. It is never derived from a filename,
 * never inferred from a family id, and never guessed from an access class.
 * Nothing in this module can invent a world label, which is the point.
 *
 * This is a typed data contract and its tests. It is deliberately NOT wired
 * into PlayerGame: integration is a later decision, and building the contract
 * first is what keeps that decision cheap.
 */

// ---------------------------------------------------------------------------
// Physical vocabulary
// ---------------------------------------------------------------------------

/**
 * Who may be in this kind of place, as a property of the PLACE.
 *
 * This is not permission. It is the class of gate a place has. Whether a
 * particular person is through that gate is canonical World truth, supplied at
 * evaluation time.
 */
export type SceneAccessClass =
  /** Anyone may be here: a park, a sidewalk, a public lobby. */
  | "public"
  /** A private household; entry depends on who lives there or is welcome. */
  | "household-private"
  /** An institution's controlled space: a members' floor, a secure corridor. */
  | "institutional-restricted"
  /** Restricted to a specific office or job. */
  | "role-restricted"
  /** Private but entered by invitation: a fundraiser, a private reception. */
  | "invited";

export const SCENE_ACCESS_CLASSES: readonly SceneAccessClass[] = [
  "public",
  "household-private",
  "institutional-restricted",
  "role-restricted",
  "invited",
];

/**
 * Life stages a scene is plausible for. A childhood birthday in a pavilion and
 * a campaign meet-and-greet in the same pavilion are both fine; a childhood
 * birthday in a members-only chamber is not.
 */
export type LifeStageSuitability =
  "childhood" | "adolescence" | "young-adulthood" | "adulthood" | "later-life";

export const LIFE_STAGE_SUITABILITIES: readonly LifeStageSuitability[] = [
  "childhood",
  "adolescence",
  "young-adulthood",
  "adulthood",
  "later-life",
];

/** Whether the architecture and decor are generic or tied to a real place. */
export type ArchitectureScope = "generic" | "jurisdiction-specific";

/**
 * One thing the World might legitimately use this place FOR.
 *
 * A use is not an event that has happened. `campaign-meet-and-greet` says the
 * pavilion can host one, not that it is hosting one, and certainly not that the
 * baked art depicts one. Art that depicted a specific event could only ever
 * serve that event.
 */
export interface SemanticUse {
  readonly useId: string;
  /** Developer-facing description. Never player copy. */
  readonly description: string;
  /** Surface slots this use needs filled to read correctly. */
  readonly requiredSurfaceSlots?: readonly string[];
  readonly lifeStages?: readonly LifeStageSuitability[];
}

export interface PhysicalSceneFamily {
  /** Stable physical identity, e.g. `HOME_APARTMENT_MODEST_01`. */
  readonly familyId: string;
  /** Developer label describing the ROOM, never its world meaning. */
  readonly label: string;
  /** Broad environment/context tags for search and grouping. */
  readonly environmentTags: readonly string[];
  readonly accessClass: SceneAccessClass;
  readonly lifeStageSuitability: readonly LifeStageSuitability[];
  readonly supportsStanding: boolean;
  readonly supportsSeated: boolean;
  readonly semanticUses: readonly SemanticUse[];
  /** Slot ids every use of this family needs, regardless of use. */
  readonly requiredSurfaceSlots: readonly string[];
  /**
   * Tags describing which roles or achievements might make this place
   * REACHABLE in future title/progression work.
   *
   * These grant nothing. A family tagged `mayor` does not make anyone a mayor
   * and does not admit anyone to the room; `evaluateSceneAccess` reads roles
   * from the canonical context and never from this list. The tag is a search
   * key for "what unlocks might eventually point here", nothing more.
   */
  readonly roleEligibilityTags: readonly string[];
  readonly architectureScope: ArchitectureScope;
  /**
   * Required when, and only when, `architectureScope` is
   * `jurisdiction-specific`. A generic room must not carry a jurisdiction.
   */
  readonly jurisdictionScope?: string;
  readonly note?: string;
}

// ---------------------------------------------------------------------------
// Binding a family to what the World calls it
// ---------------------------------------------------------------------------

/**
 * Where a world label came from. There is exactly one admissible answer, and
 * the type exists to make that visible at every call site rather than implied.
 */
export type WorldLabelSource = "canonical-world";

export interface SceneSemanticBindingRequest {
  readonly familyId: string;
  readonly useId: string;
  /**
   * What the World calls this place right now: "Your apartment", "Jordan's
   * apartment". Supplied by the caller from canonical truth.
   */
  readonly worldLabel: string;
  readonly labelSource: WorldLabelSource;
  /** Canonical owner/occupant, when the World has one. */
  readonly canonicalOwnerId?: string;
  readonly note?: string;
}

export interface SceneSemanticBinding {
  /** Unchanged by the binding. The art's identity does not move. */
  readonly familyId: string;
  readonly useId: string;
  readonly worldLabel: string;
  readonly labelSource: WorldLabelSource;
  readonly canonicalOwnerId: string | null;
  readonly accessClass: SceneAccessClass;
  readonly requiredSurfaceSlots: readonly string[];
}

export type SemanticBindingErrorCode =
  "unknown-use" | "empty-world-label" | "label-source-not-canonical";

export interface SemanticBindingError {
  readonly code: SemanticBindingErrorCode;
  readonly message: string;
}

export interface SemanticBindingResult {
  readonly binding: SceneSemanticBinding | null;
  readonly errors: readonly SemanticBindingError[];
}

/**
 * Binds a physical family to one canonical world meaning.
 *
 * The family is unchanged. Ten bindings over one family produce ten labels and
 * one `familyId`, which is the entire economic argument for the split: one
 * plate, one authoring pass, many rooms in the player's life.
 */
export function bindSceneSemantics(
  family: PhysicalSceneFamily,
  request: SceneSemanticBindingRequest,
): SemanticBindingResult {
  const errors: SemanticBindingError[] = [];
  const use = family.semanticUses.find(
    (candidate) => candidate.useId === request.useId,
  );
  if (!use) {
    errors.push({
      code: "unknown-use",
      message: `Family '${family.familyId}' declares no semantic use '${request.useId}'. A room may only be used for something it was authored to support.`,
    });
  }
  if (request.worldLabel.trim().length === 0) {
    errors.push({
      code: "empty-world-label",
      message: `Binding '${family.familyId}' supplied no world label. The label is canonical World truth and has no default; there is nothing for this module to fall back to.`,
    });
  }
  if (request.labelSource !== "canonical-world") {
    errors.push({
      code: "label-source-not-canonical",
      message: `Binding '${family.familyId}' declares label source '${request.labelSource}'. A world label is only ever supplied by the canonical World — never derived from a filename, a family id or an access class.`,
    });
  }
  if (errors.length > 0 || !use) return { binding: null, errors };

  const requiredSurfaceSlots = [
    ...new Set([
      ...family.requiredSurfaceSlots,
      ...(use.requiredSurfaceSlots ?? []),
    ]),
  ].sort();

  return {
    binding: {
      familyId: family.familyId,
      useId: use.useId,
      worldLabel: request.worldLabel,
      labelSource: request.labelSource,
      canonicalOwnerId: request.canonicalOwnerId ?? null,
      accessClass: family.accessClass,
      requiredSurfaceSlots,
    },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/**
 * Canonical facts about the person trying to be somewhere. Every field is
 * supplied by the World; none is derivable from the art.
 */
export interface SceneAccessContext {
  /** Roles the World says this person actually holds. */
  readonly heldRoles: readonly string[];
  /** Whether the World says this is their household. */
  readonly isHouseholdMember?: boolean;
  /** Whether the World says they were invited to this occasion. */
  readonly isInvited?: boolean;
  /** Whether the World says they have institutional clearance here. */
  readonly hasInstitutionalAccess?: boolean;
}

export type SceneAccessOutcome = "permitted" | "not-permitted";

export interface SceneAccessDecision {
  readonly outcome: SceneAccessOutcome;
  readonly accessClass: SceneAccessClass;
  readonly reason: string;
}

/**
 * Decides whether a canonical context clears a family's gate.
 *
 * `roleEligibilityTags` is deliberately unread here. A room tagged for mayors
 * does not admit the player because the tag exists; it admits them because the
 * World says they hold the role. Nothing about a scene's metadata can grant
 * anything — the tags describe where progression might one day point, and
 * progression itself lives somewhere else entirely.
 */
export function evaluateSceneAccess(
  family: PhysicalSceneFamily,
  context: SceneAccessContext,
): SceneAccessDecision {
  switch (family.accessClass) {
    case "public":
      return {
        outcome: "permitted",
        accessClass: family.accessClass,
        reason: "The place is public.",
      };
    case "household-private":
      return context.isHouseholdMember === true
        ? {
            outcome: "permitted",
            accessClass: family.accessClass,
            reason: "The World records this person as part of the household.",
          }
        : {
            outcome: "not-permitted",
            accessClass: family.accessClass,
            reason:
              "A private household admits people the World records as belonging there; nothing about the art decides it.",
          };
    case "invited":
      return context.isInvited === true
        ? {
            outcome: "permitted",
            accessClass: family.accessClass,
            reason: "The World records an invitation.",
          }
        : {
            outcome: "not-permitted",
            accessClass: family.accessClass,
            reason: "The World records no invitation to this occasion.",
          };
    case "institutional-restricted":
      return context.hasInstitutionalAccess === true
        ? {
            outcome: "permitted",
            accessClass: family.accessClass,
            reason: "The World records institutional access here.",
          }
        : {
            outcome: "not-permitted",
            accessClass: family.accessClass,
            reason: "The World records no institutional access to this space.",
          };
    case "role-restricted": {
      // Tags are not consulted. Held roles are canonical; tags are a search key.
      const matched = family.roleEligibilityTags.find((tag) =>
        context.heldRoles.includes(tag),
      );
      return matched
        ? {
            outcome: "permitted",
            accessClass: family.accessClass,
            reason: `The World records this person holding '${matched}'.`,
          }
        : {
            outcome: "not-permitted",
            accessClass: family.accessClass,
            reason:
              "This space is restricted to an office the World does not record this person holding. The scene's eligibility tags describe what could unlock it; they never grant it.",
          };
    }
  }
}

// ---------------------------------------------------------------------------
// Family validation
// ---------------------------------------------------------------------------

export type SceneFamilyFindingCode =
  | "duplicate-use-id"
  | "no-semantic-uses"
  | "no-pose-support"
  | "jurisdiction-on-generic-family"
  | "jurisdiction-missing-on-specific-family"
  | "unknown-access-class"
  | "unknown-life-stage"
  | "use-life-stage-outside-family"
  | "role-tags-without-role-restriction";

export interface SceneFamilyFinding {
  readonly code: SceneFamilyFindingCode;
  readonly severity: "error" | "warning";
  readonly message: string;
}

export interface SceneFamilyValidation {
  readonly valid: boolean;
  readonly findings: readonly SceneFamilyFinding[];
}

export function validatePhysicalSceneFamily(
  family: PhysicalSceneFamily,
): SceneFamilyValidation {
  const findings: SceneFamilyFinding[] = [];
  const push = (
    code: SceneFamilyFindingCode,
    severity: "error" | "warning",
    message: string,
  ) => findings.push({ code, severity, message });

  if (!SCENE_ACCESS_CLASSES.includes(family.accessClass)) {
    push(
      "unknown-access-class",
      "error",
      `Family '${family.familyId}' declares access class '${family.accessClass}', which is not one this contract recognises.`,
    );
  }
  for (const stage of family.lifeStageSuitability) {
    if (!LIFE_STAGE_SUITABILITIES.includes(stage)) {
      push(
        "unknown-life-stage",
        "error",
        `Family '${family.familyId}' declares life stage '${stage}', which is not one this contract recognises.`,
      );
    }
  }
  if (family.semanticUses.length === 0) {
    push(
      "no-semantic-uses",
      "error",
      `Family '${family.familyId}' declares no semantic uses, so the World could never legitimately bind it to anything.`,
    );
  }
  const seen = new Set<string>();
  for (const use of family.semanticUses) {
    if (seen.has(use.useId)) {
      push(
        "duplicate-use-id",
        "error",
        `Family '${family.familyId}' declares semantic use '${use.useId}' more than once.`,
      );
    }
    seen.add(use.useId);
    for (const stage of use.lifeStages ?? []) {
      if (!family.lifeStageSuitability.includes(stage)) {
        push(
          "use-life-stage-outside-family",
          "warning",
          `Use '${use.useId}' claims life stage '${stage}', which family '${family.familyId}' does not list as suitable.`,
        );
      }
    }
  }
  if (!family.supportsStanding && !family.supportsSeated) {
    push(
      "no-pose-support",
      "error",
      `Family '${family.familyId}' supports neither standing nor seated people, so no one could ever be placed in it.`,
    );
  }
  if (
    family.architectureScope === "generic" &&
    family.jurisdictionScope !== undefined
  ) {
    push(
      "jurisdiction-on-generic-family",
      "error",
      `Family '${family.familyId}' is generic architecture but claims jurisdiction '${family.jurisdictionScope}'. A generic room must not assert a jurisdiction.`,
    );
  }
  if (
    family.architectureScope === "jurisdiction-specific" &&
    (family.jurisdictionScope === undefined ||
      family.jurisdictionScope.trim().length === 0)
  ) {
    push(
      "jurisdiction-missing-on-specific-family",
      "error",
      `Family '${family.familyId}' declares jurisdiction-specific architecture without naming the jurisdiction it is specific to.`,
    );
  }
  if (
    family.roleEligibilityTags.length > 0 &&
    family.accessClass !== "role-restricted"
  ) {
    push(
      "role-tags-without-role-restriction",
      "warning",
      `Family '${family.familyId}' carries role eligibility tags but is '${family.accessClass}'. The tags are inert here — they grant nothing and gate nothing — so they are likely a leftover.`,
    );
  }

  return { valid: !findings.some((f) => f.severity === "error"), findings };
}

/** Every world label a set of bindings gives one family, in binding order. */
export function worldLabelsForFamily(
  familyId: string,
  bindings: readonly SceneSemanticBinding[],
): readonly string[] {
  return bindings
    .filter((binding) => binding.familyId === familyId)
    .map((binding) => binding.worldLabel);
}
