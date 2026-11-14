/**
 * What a celebration may say, from the records the world already keeps: what
 * is being celebrated (a wedding, from `family.married`; a new job, from the
 * job and its employer), whose it is (the player's own or a housemate's),
 * whether the one who asks came in from another town (the person's place),
 * whether they have a new child, or are out of work (`life-news.ts`), and
 * whether the last word between the two was a quarrel (the tie's record,
 * passed in by the caller). Each fact is cited to the records it came from;
 * a fact with no record behind it is left out, so the lines that need it
 * never play.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { FAMILY_MARRIED } from "../core2/modules/partnerships";
import type { CoreState, PersonId } from "../core2/types";
import { withArticle } from "../english/journal-words";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { newsSince, seekerWithoutJob, type NewsFact } from "./life-news";
import { organizationName } from "./words";

/** The situation type that reads these facts. */
export const CELEBRATION_TYPE = "celebration";

/** Days back a guest's news (a child born) still counts as news at a celebration. */
const { newsDays: NEWS_DAYS } = rulesFile.occasionFacts;

/**
 * The facts for `askerId`, a relative at the celebration of `honoreeId`
 * that `causeId` records, asking `askedId`. Empty for any other type.
 * `placeSaid` names a place id as people do; it is passed in so this file
 * imports no scene.
 */
export function celebrationFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  date: string,
  askerId: PersonId,
  askedId: PersonId,
  honoreeId: PersonId | undefined,
  placeSaid: (placeId: string) => string | null,
): Record<string, NewsFact> {
  if (typeKey !== CELEBRATION_TYPE) return {};
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked) return {};
  const facts: Record<string, NewsFact> = {};
  const honoree = honoreeId ? core.people.get(honoreeId) : undefined;

  // Whose occasion it is: the player's own, or a housemate's.
  if (honoree && honoree.id === askedId)
    facts.yours = { text: "yes", sourceRecordIds: [causeId, askedId] };
  else if (honoree)
    facts.honoree = {
      text: honoree.givenName,
      sourceRecordIds: [causeId, honoree.id],
    };

  // A wedding: the other person in the marriage record.
  const record = core.durableLog.get(causeId);
  if (record?.kind === FAMILY_MARRIED) {
    facts.wedding = { text: "yes", sourceRecordIds: [causeId] };
    const spouse = record.personIds
      .filter((id) => id !== honoreeId)
      .map((id) => core.people.get(id))
      .find((row) => row?.alive);
    if (spouse)
      facts.spouse = {
        text: spouse.givenName,
        sourceRecordIds: [causeId, spouse.id],
      };
  }

  // A new job: the job row the cause names, with its employer and position.
  const job = core.jobs.get(causeId);
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && org) {
    const cited = [job.id, org.id];
    facts["new-job"] = { text: "yes", sourceRecordIds: cited };
    facts.employer = { text: organizationName(org), sourceRecordIds: cited };
    if (job.title)
      facts.position = {
        text: withArticle(job.title),
        sourceRecordIds: [job.id],
      };
  }

  // A guest who came in from another town.
  if (asker.placeId !== asked.placeId) {
    const town = placeSaid(asker.placeId);
    if (town)
      facts.hometown = {
        text: town,
        sourceRecordIds: [asker.placeId, causeId],
      };
  }

  // The guest's own life lately: a child born, out of work.
  const news = newsSince(
    core,
    askerId,
    addDays(makeIsoDate(date), -NEWS_DAYS.value),
    asked.householdId,
    date,
  );
  if (news["new-child"]) facts["new-child"] = news["new-child"];
  const seeking = seekerWithoutJob(core, askerId);
  if (seeking)
    facts["looking-for-work"] = {
      text: "yes",
      sourceRecordIds: [seeking, askerId],
    };
  return facts;
}
