import type { BrowserWorldSummary } from "./browser-world-repository";
import {
  resolveCharacterRecipe,
  type CharacterComponentLibrary,
} from "./character-components";
import type { PlacedScenePerson } from "./life-scene-people";
import { composeTitleLectern } from "./title-lectern-pose";
import {
  TITLE_LECTERN_SCENE,
  TITLE_LECTERN_VISUALS,
} from "./title-lectern-scene";
import type { TitlePresentation } from "./title-tableau";
import type { RuntimeVisualLibrary } from "./visual-integration";
import {
  derivePersonAppearance,
  LEGACY_APPEARANCE_RECIPE_VERSION,
} from "../simulation";

/**
 * The last unwired step of the title hero.
 *
 * `composeTitleLectern` builds a real speaker at the lectern from a person's
 * own recipe and the private title41 pose pack. It was complete and covered by
 * no caller: nothing in the title ever asked for it, so the machinery existed
 * and no player ever saw a hero. This module is the missing call, and the only
 * thing above it that has to change is that `AmbientTableau` now hands the
 * composed figure to the backdrop instead of dropping it.
 *
 * It resolves to null in exactly the states where there is honestly no hero to
 * draw: no save, no private lectern plate in this checkout, an appearance the
 * catalog cannot dress, or a recipe the title41 pack has no matching variant
 * for. Null is today's behaviour, so a checkout without the private art — every
 * public one, and this cloud one — is unchanged, and the hero lights up only
 * where the art it needs is actually present.
 *
 * WHAT THIS DOES NOT CLAIM. The appearance is DERIVED from the saved player's
 * person id, which is the same seed every other render site falls back to when
 * a person carries no explicit appearance; it is not a load of the saved
 * world, which the title cannot do. Whether the composed portrait is the right
 * likeness, and whether it reads well against the private plate, is a judgement
 * only the owner can make on a build that has the art — this file settles the
 * wiring, not the pixels.
 */

/** The pose the lectern anchor admits; the recipe is resolved against it. */
export const TITLE_LECTERN_POSE_FAMILY = "standing-podium-or-lectern";

/** The registered asset id of the private lectern plate. */
const LECTERN_PLATE_ASSET_ID = "title41-corrected-audience";

export interface TitleLecternHero {
  /** A hero-in-tableau presentation standing in the lectern scene. */
  readonly presentation: TitlePresentation;
  /** The composed speaker, ready for the backdrop to paint. */
  readonly hero: PlacedScenePerson;
  /**
   * The visual library that carries the lectern plate. It is separate because
   * the plate is private art that no production catalog holds; a caller merges
   * it with the production library so both the hero's room and the ambient
   * rooms resolve their plates.
   */
  readonly visuals: RuntimeVisualLibrary;
}

/**
 * Resolves the title's lectern hero for a returning player, or null.
 *
 * `compose` is injectable purely so the wiring can be tested without the
 * private pack, which is not in a public checkout; every runtime caller uses
 * the default and gets the real composer.
 */
export function resolveTitleLecternHero(
  summary: BrowserWorldSummary | undefined,
  library: CharacterComponentLibrary,
  compose: typeof composeTitleLectern = composeTitleLectern,
): TitleLecternHero | null {
  if (!summary) return null;
  // The lectern plate itself is private. Without it there is no room to stand a
  // speaker in front of, so there is nothing honest to show.
  if (!TITLE_LECTERN_VISUALS.has(LECTERN_PLATE_ASSET_ID)) return null;

  let hero: PlacedScenePerson | null;
  try {
    const appearance = derivePersonAppearance(
      summary.playerPersonId,
      LEGACY_APPEARANCE_RECIPE_VERSION,
      library.catalogGeneration,
    );
    const recipe = resolveCharacterRecipe(
      { appearance, poseFamily: TITLE_LECTERN_POSE_FAMILY },
      library,
    );
    hero = compose(
      recipe,
      appearance,
      summary.playerPersonId,
      summary.playerName,
    );
  } catch {
    // An appearance the catalog cannot dress, or any other resolution failure,
    // is an absent hero rather than a broken title.
    return null;
  }
  if (!hero) return null;

  return buildTitleLecternHero(summary.playerName, hero);
}

/**
 * Wraps a composed speaker in the lectern presentation, without any of the
 * resolution guards. Split out so the presentation shape can be checked
 * directly, since a public checkout has no private plate and so never reaches
 * this from `resolveTitleLecternHero`.
 */
export function buildTitleLecternHero(
  heroName: string,
  hero: PlacedScenePerson,
): TitleLecternHero {
  const presentation: TitlePresentation = {
    kind: "hero-in-tableau",
    tableau: null,
    scene: TITLE_LECTERN_SCENE,
    heroAnchorId: hero.anchorId,
    heroName,
    description: `${heroName} at the lectern.`,
    reasons: [],
  };
  return { presentation, hero, visuals: TITLE_LECTERN_VISUALS };
}
