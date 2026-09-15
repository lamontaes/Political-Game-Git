import type { HistoricalEvent } from "./types";

/** Versioned authored terms travel with the canonical asking event. Old asks
 * have no terms; projections must not backfill them from today's content. */
export interface LifeRequestDetails {
  readonly version: 1;
  readonly task: string;
  readonly opening: string;
  readonly condition: string | null;
  readonly minutes: number | null;
}
const PREFIX = "life.request.v1:";
export function lifeRequestDetailsTag(details: LifeRequestDetails): string {
  return `${PREFIX}${JSON.stringify(details)}`;
}
export function lifeRequestDetails(
  event: HistoricalEvent,
): LifeRequestDetails | null {
  const tags = event.tags.filter((tag) => tag.startsWith(PREFIX));
  if (tags.length !== 1) return null;
  try {
    const value = JSON.parse(
      tags[0]!.slice(PREFIX.length),
    ) as LifeRequestDetails;
    if (
      value.version !== 1 ||
      typeof value.task !== "string" ||
      !value.task.trim() ||
      typeof value.opening !== "string" ||
      !value.opening.trim() ||
      !(
        value.condition === null ||
        (typeof value.condition === "string" && value.condition.trim())
      ) ||
      !(
        value.minutes === null ||
        (Number.isSafeInteger(value.minutes) && value.minutes > 0)
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
