import type { EngineRecipe, PeoplePackManifest } from "./pack";

/**
 * HOW A RETURNING PLAYER STANDS ON THE TITLE SCREEN, BY THEIR ROLE.
 *
 * The title shows the saved character in front of their role's civic place
 * (CLOUD E's title-picture-hero.ts reads the role from the save summary).
 * This picks their pose, turn and face for it:
 *
 * - someone who speaks for a living (an elected official, an executive, a
 *   candidate) stands at the podium, turned three quarters;
 * - a judge sits, in the robe;
 * - an organizer explains;
 * - everyone else stands with their arms folded, sure of themselves.
 *
 * Each is drawn as far as the pack has it: a pose, turn or face without its
 * painting falls back as it does everywhere (pack.ts posedPieces).
 */

/** Role kinds whose work is speaking to a room (SavedRoleKind in #892). */
const SPEAKERS: ReadonlySet<string> = new Set([
  "president",
  "member-of-congress",
  "governor",
  "state-executive",
  "state-legislator",
  "mayor",
  "council-member",
  "county-commissioner",
  "candidate",
]);

/**
 * The hero's recipe for a role kind, from the look the save carries. A role
 * kind the title does not know, or none, is "everyone else".
 */
export function heroRecipe(
  recipe: EngineRecipe,
  roleKind: string | null | undefined,
  manifest: PeoplePackManifest,
): EngineRecipe {
  if (roleKind && SPEAKERS.has(roleKind))
    return {
      ...recipe,
      pose: "podium",
      view: "three-quarter",
      expression: "smile",
    };
  if (roleKind === "judge") {
    const robe = manifest.presentations[recipe.presentation].outfits.find(
      (outfit) => outfit.id === "judge-robe",
    );
    return {
      ...recipe,
      ...(robe ? { outfit: robe.id, colors: {} } : {}),
      pose: "seated",
      expression: "neutral",
    };
  }
  if (roleKind === "organizer")
    return { ...recipe, pose: "explaining", expression: "smile" };
  return { ...recipe, pose: "arms-folded", expression: "smile" };
}
