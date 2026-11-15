/**
 * What a partner's ask to live together may say, from the partnerships
 * engine's records: who would move (`asker-moves` or `asked-moves`, by the
 * engine's own order: the one with less cash goes, unless they cannot leave),
 * whether the one asked lives with family or has a place of their own, and
 * whether they have a living relative on record (`asked-has-family`). A fact with no record behind it is left out,
 * so the lines that need it never play.
 */
import {
  FAMILY_MOVE_IN_ASKED,
  movingOrder,
} from "../core2/modules/partnerships";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const MOVE_IN_TYPE = "move-in";

export function moveInFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  if (typeKey !== MOVE_IN_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== FAMILY_MOVE_IN_ASKED) return {};
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker?.alive || !asked?.alive) return {};
  const facts: Record<string, NewsFact> = {};
  const order = movingOrder(
    coreAPI(core as CoreState),
    asker,
    asked,
    core.playerId ?? undefined,
  );
  const [mover] = order ?? [];
  if (mover?.id === askerId)
    facts["asker-moves"] = {
      text: asker.givenName,
      sourceRecordIds: [causeId, askerId, askedId],
    };
  if (mover?.id === askedId)
    facts["asked-moves"] = {
      text: asked.givenName,
      sourceRecordIds: [causeId, askerId, askedId],
    };
  // Whether the one asked lives with family, or has a place of their own
  // (nobody of their family at home), so a no says what it would give up.
  const atHome = core.households.get(asked.householdId)?.memberIds ?? [];
  const family = [...atHome].filter(
    (id) => id !== askedId && asked.familyIds.has(id) && id !== askerId,
  );
  if (family.length)
    facts["asked-lives-with-family"] = {
      text: asked.givenName,
      sourceRecordIds: [asked.householdId, ...family],
    };
  else
    facts["asked-has-own-place"] = {
      text: asked.givenName,
      sourceRecordIds: [asked.householdId],
    };
  const [relative] = [...asked.familyIds]
    .filter((id) => id !== askerId && core.people.get(id)?.alive)
    .sort();
  if (relative)
    facts["asked-has-family"] = {
      text: core.people.get(relative)!.givenName,
      sourceRecordIds: [askedId, relative],
    };
  return facts;
}
