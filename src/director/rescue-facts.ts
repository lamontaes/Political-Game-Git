/**
 * What a rescue may say, from the record that caused it (`health.rescued`,
 * rescue.ts) and the records around it: that the rescuer is the player's
 * partner (the family records), that a child of the home was in the room
 * (the rescue record's witnesses and their birth dates) and that other
 * grown people in the home saw it (the witnesses). Each fact is cited to the
 * records it came from; a fact with no record behind it is left out, so the
 * lines that need it never play. What the rescuer asks is the purpose itself
 * (SG-WORDS-rescue-ask-unrecorded).
 */
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { familyRelation } from "../core2/closeness";
import { HEALTH_RESCUED } from "../core2/modules/people";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const RESCUE_TYPE = "rescue";

/** The relation the family records give two partners. */
const PARTNER = "partner";

/**
 * The facts for `askerId`, the one who got help, asking `askedId`, the one who
 * fell ill. Empty for any other type, or a cause that is not a rescue.
 */
export function rescueFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  if (typeKey !== RESCUE_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== HEALTH_RESCUED) return {};
  if (record.personIds.at(P.zero) !== askedId) return {};
  if (record.personIds.at(P.one) !== askerId) return {};
  const facts: Record<string, NewsFact> = {};
  if (familyRelation(core, askerId, askedId) === PARTNER)
    facts.partner = { text: "yes", sourceRecordIds: [causeId, askerId] };

  const today = makeIsoDate(record.date);
  const adult = P.votingAge;
  const seen = (record.witnessIds ?? [])
    .map((id) => core.people.get(id))
    .filter((row) => row?.alive)
    .sort((a, b) => a!.id.localeCompare(b!.id));
  const child = seen.find(
    (row) => ageOnDate(makeIsoDate(row!.birthDate), today) < adult,
  );
  if (child)
    facts.child = {
      text: child.givenName,
      sourceRecordIds: [causeId, child.id],
    };
  const grown = seen.filter((row) => row !== child);
  if (grown.length)
    facts["others-there"] = {
      text: "yes",
      sourceRecordIds: [causeId, ...grown.map((row) => row!.id)],
    };
  return facts;
}
