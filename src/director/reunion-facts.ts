/**
 * What a reunion may say, from the records the world already keeps: how long
 * the two went without seeing each other (the director's thread for the pair,
 * whose renewing turn keeps the last day they were in touch), where the one
 * who has come back lives now (the person's place), what changed in their
 * life since (`life-news.ts`: a child, a wedding, a move, work, an illness)
 * and whether the tie soured in between (the thread's own turns). Each fact
 * is cited to the records it came from.
 */
import { daysBetweenText } from "../core2/kernel/dates";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { spanSaid } from "../english/span-words";
import type { Director } from "./ledger";
import { newsSince, type NewsFact } from "./life-news";

/** The situation type that reads these facts. */
export const REUNION_TYPE = "reunion";

/**
 * The facts for `askerId`, who has come back into `askedId`'s life on the
 * day of `momentId`. Empty for any other type, or when the pair's thread
 * has no renewing turn on that day. `placeSaid` names a place id as people
 * do ("Pocatello", "Kentucky"); it is passed in so this file imports no scene.
 */
export function reunionFacts(
  core: Readonly<CoreState>,
  director: Director,
  typeKey: string,
  momentDate: string,
  askerId: PersonId,
  askedId: PersonId,
  placeSaid: (placeId: string) => string | null,
): Record<string, NewsFact> {
  if (typeKey !== REUNION_TYPE) return {};
  const thread = director.ledger.people.get(askedId)?.threads.get(askerId);
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!thread || !asker || !asked) return {};
  const back = [...thread.turns]
    .reverse()
    .find((turn) => turn.turn === "renewed" && turn.date === momentDate);
  const facts: Record<string, NewsFact> = {};
  if (!back?.since) return facts;
  const cited = [back.causeId, thread.otherId];
  const days = daysBetweenText(back.since, back.date);
  facts.away = { text: spanSaid(days), sourceRecordIds: cited };
  // Where they live now, when it is not where the player lives.
  if (asker.placeId !== asked.placeId) {
    const town = placeSaid(asker.placeId);
    if (town) facts.hometown = { text: town, sourceRecordIds: [asker.placeId] };
  }
  // The tie soured between the two (a turn the director kept), before they
  // came back to each other.
  const soured = [...thread.turns]
    .reverse()
    .find((turn) => turn.turn === "soured" && turn.date <= back.since!);
  if (soured)
    facts["fell-out"] = {
      text: "yes",
      sourceRecordIds: [soured.causeId, thread.otherId],
    };
  // Out of work: the jobs engine holds them as a seeker without a job.
  if (asker.tier !== "husk" && core.modules.has(JOBS_MODULE_ID)) {
    const seeker = coreAPI(core as CoreState)
      .moduleState(JOBS_MODULE_ID)
      .table("seekers")
      .get(askerId) as unknown as { id: string; employed: boolean } | undefined;
    if (seeker && !seeker.employed)
      facts["looking-for-work"] = {
        text: "yes",
        sourceRecordIds: [seeker.id, askerId],
      };
  }
  for (const [key, fact] of Object.entries(
    newsSince(core, askerId, back.since, asked.householdId, back.date),
  ))
    facts[key] = fact;
  return facts;
}
