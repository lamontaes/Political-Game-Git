/**
 * What a partner's ask to live together may say, from the partnerships
 * engine's records: whether the one asking is the one who would move
 * (`asker-moves`, by the engine's own order: the one with less cash goes,
 * unless they cannot leave), and whether the one asked has a living relative
 * on record (`asked-has-family`). A fact with no record behind it is left out,
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
  if (order?.[0].id === askerId)
    facts["asker-moves"] = {
      text: asker.givenName,
      sourceRecordIds: [causeId, askerId, askedId],
    };
  const relative = [...asked.familyIds]
    .filter((id) => id !== askerId && core.people.get(id)?.alive)
    .sort()[0];
  if (relative)
    facts["asked-has-family"] = {
      text: core.people.get(relative)!.givenName,
      sourceRecordIds: [askedId, relative],
    };
  return facts;
}
