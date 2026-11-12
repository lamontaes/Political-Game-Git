/**
 * What a piece of news a household member brings the player may say, from the
 * record that is the news: a death (`life.death`), a pairing
 * (`family.partnered`) or a parting (`family.separated`). Who the news is
 * about, the other person in a pairing or parting, and whether the bearer
 * lived with the one it is about, each cited to the records it came from; a
 * fact with no record behind it is left out, so the lines that need it never
 * play. What the bearer asks of the player is the purpose itself
 * (SG-WORDS-news-ask-unrecorded).
 */
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const NEWS_TYPE = "news-arrives";

const DEATH = "life.death";
const PARTNERED = "family.partnered";
const SEPARATED = "family.separated";

/**
 * The facts for `askerId`, who brings the news that `causeId` records to
 * `askedId`, about `aboutId`. Empty for any other type or record.
 */
export function newsFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  aboutId: PersonId | undefined,
): Record<string, NewsFact> {
  if (typeKey !== NEWS_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (!record || ![DEATH, PARTNERED, SEPARATED].includes(record.kind))
    return {};
  const about = aboutId ? core.people.get(aboutId) : undefined;
  if (!about || aboutId === askedId || aboutId === askerId) return {};
  // A pairing or a parting the player is a party to is not news to them.
  if (record.kind !== DEATH && record.personIds.includes(askedId)) return {};
  const cited = [causeId, about.id];
  const facts: Record<string, NewsFact> = {};
  facts.subject = { text: about.givenName, sourceRecordIds: cited };
  if (record.kind === DEATH) {
    facts["news-death"] = { text: "yes", sourceRecordIds: cited };
    facts.deceased = { text: about.givenName, sourceRecordIds: cited };
  } else {
    facts[record.kind === PARTNERED ? "news-partnered" : "news-separated"] = {
      text: "yes",
      sourceRecordIds: cited,
    };
    const other = record.personIds
      .filter((id) => id !== about.id && id !== askedId && id !== askerId)
      .map((id) => core.people.get(id))
      .find((row) => row?.alive);
    if (other)
      facts.other = {
        text: other.givenName,
        sourceRecordIds: [causeId, other.id],
      };
  }
  const asker = core.people.get(askerId);
  if (asker && asker.householdId === about.householdId)
    facts["lived-with"] = {
      text: asker.givenName,
      sourceRecordIds: [...cited, asker.householdId],
    };
  return facts;
}
