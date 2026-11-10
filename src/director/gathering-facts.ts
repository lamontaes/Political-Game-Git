/**
 * What a family gathering with someone missing may say, from the record that
 * caused it (`family.gathering-missed`, kin-contact.ts) and the records
 * around it: whose birthday it was and how old they turned (the person's
 * birth date), who was missing and where they live (the person's place), what
 * changed in the missing relative's life lately (`life-news.ts`: a child, a
 * wedding, a move, new work, a serious illness) and whether their last word
 * with the player was a quarrel (the tie's record, passed in by the caller).
 * Each fact is cited to the records it came from; a fact with no record
 * behind it is left out, so the lines that need it never play.
 */
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { FAMILY_GATHERING_MISSED } from "../core2/modules/people";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { newsSince, type NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const GATHERING_TYPE = "gathering-missing";

/** Days back the missing relative's news still counts as news to the family. */
const { newsDays: NEWS_DAYS } = rulesFile.occasionFacts;

/**
 * The facts for `askerId`, a member of the household that held the
 * gathering, asking `askedId` to reach out. Empty for any other type, or a
 * cause that is not a missed gathering. `quarreled` says whether two people's
 * last word on their tie was a quarrel.
 */
export function gatheringFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  placeSaid: (placeId: string) => string | null,
  quarreled: (aId: PersonId, bId: PersonId) => boolean,
): Record<string, NewsFact> {
  if (typeKey !== GATHERING_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== FAMILY_GATHERING_MISSED) return {};
  const absent = core.people.get(String(record.facts?.absentId) as PersonId);
  const honoree = core.people.get(record.personIds.at(P.zero) as PersonId);
  const asked = core.people.get(askedId);
  if (!absent || !honoree || !asked) return {};
  const facts: Record<string, NewsFact> = {};
  facts.absent = {
    text: absent.givenName,
    sourceRecordIds: [causeId, absent.id],
  };

  // Whose birthday it was, and the age they turned.
  const cited = [causeId, honoree.id];
  if (honoree.id === askedId)
    facts["birthday-yours"] = { text: "yes", sourceRecordIds: cited };
  else if (honoree.id === askerId)
    facts["birthday-mine"] = { text: "yes", sourceRecordIds: cited };
  else facts.honoree = { text: honoree.givenName, sourceRecordIds: cited };
  facts.age = {
    text: String(
      ageOnDate(makeIsoDate(honoree.birthDate), makeIsoDate(record.date)),
    ),
    sourceRecordIds: cited,
  };

  // Where the missing relative lives, when it is not the player's town.
  if (absent.placeId !== asked.placeId) {
    const town = placeSaid(absent.placeId);
    if (town)
      facts.hometown = {
        text: town,
        sourceRecordIds: [absent.placeId, causeId],
      };
  }

  // Their life lately: a child, a wedding, a move, new work, an illness.
  for (const [key, fact] of Object.entries(
    newsSince(
      core,
      absent.id,
      addDays(makeIsoDate(record.date), -NEWS_DAYS.value),
      asked.householdId,
      record.date,
    ),
  ))
    facts[key] = {
      text: fact.text,
      sourceRecordIds: [...fact.sourceRecordIds, causeId],
    };

  // The last word between the player and the missing relative was a quarrel.
  if (quarreled(absent.id, askedId))
    facts["fell-out"] = { text: "yes", sourceRecordIds: [causeId, absent.id] };
  return facts;
}
