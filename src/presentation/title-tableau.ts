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
  /**
   * A bare noun phrase naming the room, used to BUILD player copy.
   *
   * It is not free-form: `resolveTitlePresentation` completes it into
   * sentences like "<label> with nobody in it." and "<label> with <name> in
   * it.", so a label that already says what is in the room reads as "a living
   * room with nobody in it with nobody in it". Name the room and stop.
   */
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
  /**
   * The front door of the game: the one banked tableau shown when there is no
   * character at all.
   *
   * Without it the no-save title is whatever the deterministic chooser lands
   * on, which is stable but arbitrary — and the first screen of a game is the
   * one place arbitrary is wrong. It applies ONLY when there is no hero; a
   * character who falls to the neutral bank still gets a tableau chosen from
   * their own key, so two saves do not look like the same life.
   */
  readonly frontDoorTableauId?: string;
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
    const admissible = registry.neutralBank.filter(
      (tableau) => tableau.supportsNoCharacter,
    );
    const frontDoor =
      hero === null && registry.frontDoorTableauId !== undefined
        ? (admissible.find(
            (tableau) => tableau.tableauId === registry.frontDoorTableauId,
          ) ?? null)
        : null;
    const banked =
      frontDoor ??
      selectTableauDeterministically(
        admissible,
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
 * The tableaux the title screen may show today.
 *
 * WHAT CHANGED AND WHY. Every entry used to point at a development fixture,
 * and the one an ordinary adult resolved to was the Lexington council staff
 * office — a room with a Fayette County map on its wall, handed to any adult
 * with a saved game. That is exactly the universal-office substitution the
 * consumer map forbids, so the Lexington fixture is gone from this registry
 * altogether. It is not gated more tightly; it is absent, because the fact
 * that would justify it — which jurisdiction this character's job answers to —
 * is not something a title screen can know.
 *
 * What replaced it is production art with no jurisdiction in it: two ordinary
 * apartment living rooms and a generic public meeting hall.
 *
 * Adding a tableau is adding a definition and a scene. There is still no
 * title-specific React below this line.
 *
 * NOTE FOR THE PLAYER-SPINE OWNER: nothing here reads a save. Build a
 * `TitleHeroInput` with `titleHeroFromSaveSummary` and pass it as `hero`. Do
 * not add fields to this module to reach the save yourself.
 */
export const TITLE_TABLEAU_REGISTRY: TitleTableauRegistry = {
  tableaux: [
    {
      /**
       * Where an ordinary adult belongs: their own living room. It requires
       * nothing of a life except that it is grown and lived somewhere, which
       * is what `residence` on a save actually attests.
       */
      tableauId: "an-evening-at-home",
      familyId: "apartment-ordinary",
      label: "A living room",
      sceneId: "residence-apartment-living-canonical-03",
      heroAnchorId: "living-room-floor-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: ["adult", "residence-known"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      /** The same claim, a different room, so two saves do not look alike. */
      tableauId: "a-quiet-room-at-home",
      familyId: "apartment-ordinary",
      label: "A second living room",
      sceneId: "residence-apartment-living-ordinary-02",
      heroAnchorId: "living-room-floor-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: ["adult", "residence-known"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      /**
       * A hearing is somewhere a legislator is actually expected to be, which
       * is why this one is gated on the legislative capability rather than on
       * merely having a job. Nothing weaker justifies standing at that lectern.
       */
      tableauId: "before-a-hearing",
      familyId: "civic-hearing-room",
      label: "A hearing room",
      sceneId: "civic-hearing-room-production",
      heroAnchorId: "witness-lectern-standing",
      requiredPoseFamily: "standing-podium-or-lectern",
      requiredFacing: "front",
      requiredCapabilities: ["adult", "legislature"],
      supportsNoCharacter: true,
      emptyHeroTreatment: "an empty lectern",
    },
  ],

  /**
   * Rooms that read correctly with nobody in them.
   *
   * The community meeting hall is deliberately NOT in `tableaux` above. Being
   * an adult, or having a job, does not mean a character has ever spoken at a
   * public meeting, and putting them at that lectern because the picture has a
   * lectern is presentation inventing a life. Empty, it is simply a civic room
   * — which is the right thing to show before any character exists at all.
   */
  neutralBank: [
    {
      tableauId: "a-community-meeting",
      familyId: "civic-community-meeting",
      label: "A hall set out for a community meeting",
      sceneId: "civic-community-meeting-title",
      heroAnchorId: "stage-left-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: [],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      tableauId: "an-empty-living-room",
      familyId: "apartment-ordinary",
      label: "A living room",
      sceneId: "residence-apartment-living-canonical-03",
      heroAnchorId: "living-room-floor-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: [],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
    {
      tableauId: "an-empty-hearing-room",
      familyId: "civic-hearing-room",
      label: "A hearing room",
      sceneId: "civic-hearing-room-production",
      heroAnchorId: "hearing-floor-standing",
      requiredPoseFamily: "standing-neutral",
      requiredFacing: "front",
      requiredCapabilities: [],
      supportsNoCharacter: true,
      emptyHeroTreatment: "the room alone",
    },
  ],

  frontDoorTableauId: "a-community-meeting",
};
