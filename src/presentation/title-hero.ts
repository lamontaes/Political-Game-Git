import { stableHash } from "../simulation/ids";
import type { BrowserWorldSummary } from "./browser-world-repository";
import type { TitleCapabilityTag, TitleHeroInput } from "./title-tableau";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Turning a saved game into the little the title screen is allowed to know.
 *
 * The title screen has a save summary and nothing else. It has not loaded the
 * world, so it cannot ask the capability resolver anything, and this module
 * exists so that limitation is stated in one place instead of being worked
 * around in the shell.
 *
 * The rule is that a capability tag is only emitted for a fact the summary
 * ACTUALLY CARRIES. Age is on the summary, so adulthood is knowable. Whether
 * somebody has a residence is on the summary, so that is knowable too. Whether
 * they hold an office, sit in a legislature, run a campaign or lead an
 * executive agency is NOT on the summary — and the absence of a fact is not
 * evidence of it, so no tag is emitted and the tableaux gated on those tags
 * simply never match. That is the whole defence against a title screen that
 * hands an ordinary person a podium because the podium art exists.
 *
 * When the persistence lane starts carrying canonical capability tags on the
 * summary, they belong here, and every tableau gated on them lights up without
 * a line changing in the tableau registry or the shell.
 */

/**
 * The age at which the formative years end and this repository's other
 * surfaces start treating a character as grown. Repeated here as a named
 * boundary rather than a bare 18 in a comparison.
 */
export const TITLE_ADULT_AGE = 18;

/**
 * Tags this module can honestly produce.
 *
 * `office` and `legislature` are deliberately absent: they exist in the
 * tableau registry, and they are exactly the tags a save summary cannot
 * support.
 */
export const TITLE_ADULT_TAG: TitleCapabilityTag = "adult";
export const TITLE_RESIDENCE_TAG: TitleCapabilityTag = "residence-known";

/**
 * A stable name for the current state of the art library.
 *
 * Selection is stable for one library and may move when the library grows,
 * which is what the tableau contract promises. Hashing the released asset ids
 * makes "the library grew" mean what it says: a new released plate changes the
 * version, and a code change that releases nothing does not.
 */
export function visualLibraryVersion(library: RuntimeVisualLibrary): string {
  const ids = [...library.keys()].sort();
  return `library-${stableHash(ids.join("|"))}`;
}

/**
 * Builds the title's view of a saved character, or null when there is no save.
 *
 * `availablePoseFamilies` and `availableFacings` are empty and will stay empty
 * until production person art exists. That is not a stub: it is the reason the
 * title falls to a room with the character's name on it rather than drawing
 * somebody. A caller that filled them in with fixture poses would be claiming
 * art the game does not have.
 */
export function titleHeroFromSaveSummary(
  summary: BrowserWorldSummary | undefined,
): TitleHeroInput | null {
  if (!summary) return null;

  const capabilities: TitleCapabilityTag[] = [];
  if (summary.playerAge >= TITLE_ADULT_AGE) capabilities.push(TITLE_ADULT_TAG);
  if (summary.residence !== null) capabilities.push(TITLE_RESIDENCE_TAG);

  return {
    // The life, not the slot. Two saves of one world are one character and
    // get one title; a second life gets its own.
    heroIdentityKey: `${summary.worldId}:${summary.playerPersonId}`,
    displayName: summary.playerName,
    capabilities,
    availablePoseFamilies: [],
    availableFacings: [],
  };
}
