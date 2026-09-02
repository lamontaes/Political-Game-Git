import { stableHash } from "../simulation/ids";
import {
  requireScene,
  type RegisteredScene,
  type SceneRegistry,
} from "./scene-registry";

/**
 * Title tableau primitives.
 *
 * PRESENTATION ONLY, and deliberately disjoint from the player shell. This
 * module holds no saves, loads no worlds, and derives no biography. Every fact
 * about a hero arrives through `TitleHeroInput`, supplied by whoever owns the
 * player spine; this module's whole job is to decide which tableau such a hero
 * may appear in and what to show when none of them fit.
 *
 * The honesty rule is structural rather than advisory: eligibility is caller
 * truth, so there is no code path here that can invent a podium for a character
 * whose life never included one, and the fallback ladder never substitutes
 * another person's likeness for a missing one.
 */

/**
 * An opaque capability tag. This module never interprets one; it only checks
 * that the caller's set contains what a tableau requires. Keeping them opaque
 * is what stops presentation from quietly becoming a second source of truth
 * about a person's life.
 */
export type TitleCapabilityTag = string;

export interface TitleTableauDefinition {
  readonly tableauId: string;
  readonly familyId: string;
  /** Developer-facing label. Never player copy. */
  readonly label: string;
  /** Scene this tableau composes against, resolved from the scene registry. */
  readonly sceneId: string;
  /** Anchor in that scene where the hero stands or sits. */
  readonly heroAnchorId: string;
  readonly requiredPoseFamily: string;
  readonly requiredFacing: string;
  /** Capability tags a hero must have for this tableau to be truthful. */
  readonly requiredCapabilities: readonly TitleCapabilityTag[];
  /** True when the tableau reads correctly with no character in it at all. */
  readonly supportsNoCharacter: boolean;
  /** What the tableau shows when the hero slot cannot be filled. */
  readonly emptyHeroTreatment: string;
}

/** Everything this module is allowed to know about the hero. */
export interface TitleHeroInput {
  /** Stable key used for deterministic selection. Never parsed for meaning. */
  readonly heroIdentityKey: string;
  /** Display name, supplied by the caller and never re-derived here. */
  readonly displayName: string;
  /** Canonical capability tags. This module treats them as given truth. */
  readonly capabilities: readonly TitleCapabilityTag[];
  /** Pose families this hero's art can actually satisfy at runtime quality. */
  readonly availablePoseFamilies: readonly string[];
  /** Facings this hero's art can actually satisfy. */
  readonly availableFacings: readonly string[];
}

export interface TitleTableauRegistry {
  readonly tableaux: readonly TitleTableauDefinition[];
  readonly neutralBank: readonly TitleTableauDefinition[];
}

/**
 * The fallback ladder, in order. Each rung is honest about what it is showing:
 * none of them implies a character the caller did not supply.
 */
export type TitlePresentationKind =
  /** A compatible tableau with the hero composited into it. */
  | "hero-in-tableau"
  /** A compatible tableau with a neutral silhouette and the hero's name. */
  | "silhouette-in-tableau"
  /** A banked tableau with nobody in it, plus a typographic name block. */
  | "neutral-tableau"
  /** No art at all: the typographic title. */
  | "typographic";

export interface TitlePresentation {
  readonly kind: TitlePresentationKind;
  readonly tableau: TitleTableauDefinition | null;
  readonly scene: RegisteredScene | null;
  readonly heroAnchorId: string | null;
  /** The hero's name, when there is a hero to name. Never invented. */
  readonly heroName: string | null;
  /**
   * Player-facing sentence for surfaces that need one. It says what is actually
   * on screen and never mentions assets, tiers, registries or capabilities.
   */
  readonly description: string;
  /** Developer-facing reasons the ladder fell to this rung. */
  readonly reasons: readonly string[];
}

export interface TitlePresentationRequest {
  /** Null means no hero is available, which is an ordinary state. */
  readonly hero: TitleHeroInput | null;
  /**
   * Asset library version. Selection is stable for one library; when the
   * library grows the title may change, and it never changes the person.
   */
  readonly assetLibraryVersion: string;
  readonly registry: TitleTableauRegistry;
  readonly scenes: SceneRegistry;
}

function heroSatisfies(
  tableau: TitleTableauDefinition,
  hero: TitleHeroInput,
): boolean {
  return (
    tableau.requiredCapabilities.every((tag) =>
      hero.capabilities.includes(tag),
    ) &&
    hero.availablePoseFamilies.includes(tableau.requiredPoseFamily) &&
    hero.availableFacings.includes(tableau.requiredFacing)
  );
}

function eligibleByCapability(
  tableau: TitleTableauDefinition,
  hero: TitleHeroInput,
): boolean {
  return tableau.requiredCapabilities.every((tag) =>
    hero.capabilities.includes(tag),
  );
}

/**
 * Deterministic pick from a stable key. The same key and the same library
 * always choose the same tableau, so a title does not reshuffle on every
 * refresh — a title that changes every load reads as broken.
 */
export function selectTableauDeterministically<T>(
  candidates: readonly T[],
  key: string,
  identify: (candidate: T) => string,
): T | null {
  if (candidates.length === 0) return null;
  const ordered = [...candidates].sort((a, b) => {
    const left = identify(a);
    const right = identify(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const digest = stableHash(`title-tableau-v1:${key}`);
  let accumulator = 0;
  for (const character of digest) {
    accumulator = (accumulator * 31 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return ordered[accumulator % ordered.length]!;
}

/**
 * Resolves what the title should show, from explicit inputs only.
 *
 * Step 1  No hero -> the neutral bank, chosen deterministically from the
 *         library version so the no-save title is stable.
 * Step 2  Filter tableaux to those the hero's CAPABILITIES justify. A child
 *         gets the neutral bank; an ordinary adult never gets a podium.
 * Step 3  Filter again to those the hero's ART can actually satisfy.
 * Step 4  Pick deterministically from the hero key plus the library version.
 * Step 5  Fall down the ladder honestly when a rung cannot be filled.
 */
export function resolveTitlePresentation(
  request: TitlePresentationRequest,
): TitlePresentation {
  const { hero, assetLibraryVersion, registry, scenes } = request;
  const reasons: string[] = [];

  const neutral = (extraReasons: readonly string[]): TitlePresentation => {
    const banked = selectTableauDeterministically(
      registry.neutralBank.filter((tableau) => tableau.supportsNoCharacter),
      `neutral:${assetLibraryVersion}:${hero?.heroIdentityKey ?? "no-hero"}`,
      (tableau) => tableau.tableauId,
    );
    if (!banked) {
      return {
        kind: "typographic",
        tableau: null,
        scene: null,
        heroAnchorId: null,
        heroName: hero?.displayName ?? null,
        description: hero
          ? `The title screen, with ${hero.displayName}'s name.`
          : "The title screen.",
        reasons: [
          ...reasons,
          ...extraReasons,
          "No banked no-character tableau is available.",
        ],
      };
    }
    return {
      kind: "neutral-tableau",
      tableau: banked,
      scene: scenes.scenes.get(banked.sceneId) ?? null,
      heroAnchorId: null,
      heroName: hero?.displayName ?? null,
      description: hero
        ? `${banked.label} with nobody in it, and ${hero.displayName}'s name.`
        : `${banked.label} with nobody in it.`,
      reasons: [...reasons, ...extraReasons],
    };
  };

  if (!hero) {
    return neutral(["No hero was supplied."]);
  }

  const byCapability = registry.tableaux.filter((tableau) =>
    eligibleByCapability(tableau, hero),
  );
  if (byCapability.length === 0) {
    return neutral([
      `No tableau is justified by this character's capabilities (${hero.capabilities.join(", ") || "none"}).`,
    ]);
  }

  const compatible = byCapability.filter((tableau) =>
    heroSatisfies(tableau, hero),
  );

  const chosen = selectTableauDeterministically(
    compatible.length > 0 ? compatible : byCapability,
    `${hero.heroIdentityKey}:${assetLibraryVersion}`,
    (tableau) => tableau.tableauId,
  );
  if (!chosen) {
    return neutral(["No tableau survived selection."]);
  }

  const scene = requireScene(scenes, chosen.sceneId);

  if (compatible.length === 0) {
    // The character is entitled to this setting, but their art cannot pose for
    // it. Show the setting with a silhouette and their name; never borrow
    // somebody else's likeness to fill the gap.
    return {
      kind: "silhouette-in-tableau",
      tableau: chosen,
      scene,
      heroAnchorId: chosen.heroAnchorId,
      heroName: hero.displayName,
      description: `${chosen.label} with ${hero.displayName} shown in outline, because their likeness is not ready yet.`,
      reasons: [
        ...reasons,
        `No eligible tableau matches this character's available poses (${hero.availablePoseFamilies.join(", ") || "none"}) and facings (${hero.availableFacings.join(", ") || "none"}).`,
      ],
    };
  }

  return {
    kind: "hero-in-tableau",
    tableau: chosen,
    scene,
    heroAnchorId: chosen.heroAnchorId,
    heroName: hero.displayName,
    description: `${chosen.label} with ${hero.displayName} in it.`,
    reasons,
  };
}

/**
 * The tableau definitions the presentation layer knows about today, both
 * pointed at development fixture scenes because no title plate exists yet.
 * Adding a real tableau is adding a definition and a scene, not new React.
 *
 * NOTE FOR THE PLAYER-SPINE OWNER: nothing here reads a save. To wire the
 * recent character in, build a `TitleHeroInput` from the save summary — the
 * persisted appearance identity for the art, and the canonical capability
 * resolver's output for `capabilities` — and pass it as `hero`. Do not add
 * fields to this module to reach the save yourself.
 */
export const TITLE_TABLEAU_REGISTRY: TitleTableauRegistry = {
  tableaux: [
    {
      tableauId: "civic-office-standing",
      familyId: "civic-office",
      label: "A quiet public office",
      sceneId: "office-council-staff-fixture",
      heroAnchorId: "near-desk-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: ["adult"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      tableauId: "signing-at-a-desk",
      familyId: "civic-office",
      label: "A desk with work on it",
      sceneId: "office-council-staff-fixture",
      heroAnchorId: "primary-desk-chair",
      requiredPoseFamily: "seated-at-desk",
      requiredFacing: "front",
      requiredCapabilities: ["adult", "office"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "an empty chair",
    },
    {
      tableauId: "committee-room-testimony",
      familyId: "committee-room",
      label: "A committee room before it fills",
      sceneId: "committee-room-fixture",
      heroAnchorId: "witness-chair",
      requiredPoseFamily: "seated-at-desk",
      requiredFacing: "front",
      requiredCapabilities: ["adult", "legislature"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "an empty witness chair",
    },
  ],
  neutralBank: [
    {
      tableauId: "committee-room-empty",
      familyId: "committee-room",
      label: "A committee room before it fills",
      sceneId: "committee-room-fixture",
      heroAnchorId: "witness-chair",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: [],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      tableauId: "civic-office-empty",
      familyId: "civic-office",
      label: "A quiet public office",
      sceneId: "office-council-staff-fixture",
      heroAnchorId: "near-desk-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: [],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
  ],
};
