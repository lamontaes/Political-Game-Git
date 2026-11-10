/**
 * What a new-baby visit may say, from the birth record that caused it
 * (`person-birth`, renewal.ts): the child's name, the other parent's name
 * (for the one asked: the mother when they are the other parent, else the
 * other parent) and the town the visitor comes from when it is not the
 * parent's. Each fact is cited to the records it came from; a fact with no
 * record behind it is left out, so the lines that need it never play.
 */
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const NEW_BABY_TYPE = "new-baby";

const BIRTH_KIND = "person-birth";

/**
 * The facts for `askerId`, who comes to see the baby `causeId` records, asking
 * `askedId`, one of its parents. Empty for any other type, or a cause that is
 * not a birth the asked person is a parent in.
 */
export function birthFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  placeSaid: (placeId: string) => string | null,
): Record<string, NewsFact> {
  if (typeKey !== NEW_BABY_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== BIRTH_KIND) return {};
  const mother = String(record.facts?.motherId ?? "");
  const other = String(record.facts?.otherParentId ?? "");
  if (askedId !== mother && askedId !== other) return {};
  const child = core.people.get(String(record.facts?.childId) as PersonId);
  if (!child) return {};
  const facts: Record<string, NewsFact> = {};
  facts.kid = {
    text: child.givenName,
    sourceRecordIds: [causeId, child.id],
  };
  const partner = core.people.get(
    (askedId === mother ? other : mother) as PersonId,
  );
  if (partner?.alive)
    facts.partner = {
      text: partner.givenName,
      sourceRecordIds: [causeId, partner.id],
    };
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (asker && asked && asker.placeId !== asked.placeId) {
    const town = placeSaid(asker.placeId);
    if (town)
      facts.hometown = {
        text: town,
        sourceRecordIds: [asker.placeId, causeId],
      };
  }
  return facts;
}
