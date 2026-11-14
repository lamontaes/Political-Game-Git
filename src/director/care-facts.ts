/**
 * What a visit to someone seriously ill may say, from the record that caused
 * it (`health.serious-illness`, the health engine) and the family records
 * around it: the relative of theirs who still has to be told, the one they ask
 * the player to tell. Each fact is cited to the records it came from; a fact
 * with no record behind it is left out, so the lines that need it never play.
 *
 * The visit is to someone in the player's own town (family life report 1, Nov
 * 14 2026: the player has no act that takes them to another state's bedside),
 * so a relative who lives elsewhere gives no fact here and the illness is told
 * as news instead.
 */
import { closenessBetween } from "../core2/closeness";
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const CARE_TYPE = "care";

/** The health engine's record of a serious illness. */
const SERIOUS_ILLNESS = "health.serious-illness";

/**
 * The facts for `askerId`, the one who is ill, asking `askedId`, the one who
 * came. Empty for any other type, a cause that is not their illness, or an
 * ill person who lives in another town.
 */
export function careFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  if (typeKey !== CARE_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== SERIOUS_ILLNESS) return {};
  if (!record.personIds.includes(askerId)) return {};
  const ill = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!ill?.alive || !asked || ill.placeId !== asked.placeId) return {};
  // The relative of theirs who does not live with them and is closest to
  // them: the one they would want told first.
  const [relative] = [...ill.familyIds]
    .filter((id) => id !== askedId)
    .map((id) => core.people.get(id))
    .filter(
      (row): row is NonNullable<typeof row> =>
        !!row?.alive && row.householdId !== ill.householdId,
    )
    .map((row) => ({ row, close: closenessBetween(core, ill.id, row.id) }))
    .sort((a, b) => b.close - a.close || a.row.id.localeCompare(b.row.id))
    .map((row) => row.row);
  if (!relative) return {};
  return {
    relative: {
      text: relative.givenName,
      sourceRecordIds: [causeId, ill.id, relative.id],
    },
  };
}
