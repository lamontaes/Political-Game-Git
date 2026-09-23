import type { EntityId, IsoDate, World } from "../simulation";
import { BEREAVEMENT_NOTICE_EVENT } from "../simulation/people-bereavement";

/**
 * The deaths this person was told of between two dates, in the words they
 * were told them ("Your sister, Lily Norris, died after a serious illness on
 * March 3, 2052.").
 *
 * Reads only the family notice the death writers already record: one
 * `life.death-learned` event per death and recipient, and the knowledge row
 * written with it. Nothing is counted or inferred, and a death this person was
 * never told of is not here.
 */
export interface DeathNews {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly learnedAt: IsoDate;
  readonly deceasedPersonId: EntityId;
  readonly sentence: string;
}

export function deathNewsBetween(
  world: World,
  personId: EntityId,
  sinceExclusive: IsoDate,
  untilInclusive: IsoDate,
): readonly DeathNews[] {
  const news: DeathNews[] = [];
  for (const event of world.history.events) {
    if (event.type !== BEREAVEMENT_NOTICE_EVENT) continue;
    if (event.occurredAt <= sinceExclusive || event.occurredAt > untilInclusive)
      continue;
    if (
      !event.participants.some(
        (entry) => entry.personId === personId && entry.role === "focus:told",
      )
    )
      continue;
    const deceased = event.participants.find(
      (entry) => entry.role === "focus:subject",
    )?.personId;
    const told = world.history.knowledge.find(
      (row) =>
        row.personId === personId &&
        row.stableKey === `${event.stableKey}:knowledge`,
    );
    if (!deceased || !told) continue;
    news.push({
      eventId: event.id,
      sequence: event.sequence,
      learnedAt: event.occurredAt,
      deceasedPersonId: deceased,
      sentence: told.believedSummary,
    });
  }
  return news;
}
