/**
 * Deterministic Stable Identifiers for NOAA Storm Events Corpus
 */

export function createStormEventId(sourceEventId: number | string): string {
  return `storm-event:noaa:${sourceEventId}`;
}

export function createStormEpisodeId(sourceEpisodeId: number | string): string {
  return `storm-episode:noaa:${sourceEpisodeId}`;
}

export function createStormAggregateId(
  jurisdictionKey: string,
  eventFamily: string,
  decade: string,
): string {
  const cleanJurisdiction = jurisdictionKey
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  const cleanFamily = eventFamily.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanDecade = decade.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `storm-aggregate:${cleanJurisdiction}:${cleanFamily}:${cleanDecade}`;
}

export function parseStormEventId(id: string): number | null {
  const prefix = "storm-event:noaa:";
  if (!id.startsWith(prefix)) return null;
  const num = parseInt(id.slice(prefix.length), 10);
  return Number.isNaN(num) ? null : num;
}

export function parseStormEpisodeId(id: string): number | null {
  const prefix = "storm-episode:noaa:";
  if (!id.startsWith(prefix)) return null;
  const num = parseInt(id.slice(prefix.length), 10);
  return Number.isNaN(num) ? null : num;
}
