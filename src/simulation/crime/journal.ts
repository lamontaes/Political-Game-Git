import type { EntityId, HistoricalEvent } from "../types";
import type { CrimeOffense } from "./contract";
import { CRIME_EVENT_TYPES, offenseOf } from "./producer";
import { lifePlaceByJurisdictionId } from "../life-places";

/** What happened, said to the person it happened to. */
const HAPPENED_TO_YOU: Readonly<Record<CrimeOffense, string>> = {
  assault: "You were assaulted",
  robbery: "You were robbed",
  burglary: "Someone broke into your home",
  vandalism: "Someone vandalized your home",
};

/** The case an arrest was made in, from the victim's side. */
const YOUR_CASE: Readonly<Record<CrimeOffense, string>> = {
  assault: "the assault on you",
  robbery: "your robbery",
  burglary: "the break-in at your home",
  vandalism: "the vandalism at your home",
};

function town(event: HistoricalEvent): string {
  const name = event.jurisdictionId
    ? lifePlaceByJurisdictionId(event.jurisdictionId)?.displayName
    : undefined;
  return name ? name.split(",")[0]!.trim() : "town";
}

/**
 * A crime's line in one person's own Journal. A town's police log is news,
 * not a person's life: only a victim's Journal carries a crime, and it says
 * what happened to them. `undefined` for an event that is not a crime; `null`
 * for a crime this person was not a victim of.
 */
export function crimeJournalLine(
  event: HistoricalEvent,
  personId: EntityId,
): string | null | undefined {
  const isCrime =
    event.type === CRIME_EVENT_TYPES.reported ||
    event.type === CRIME_EVENT_TYPES.unreported ||
    event.type === CRIME_EVENT_TYPES.arrest;
  if (!isCrime) return undefined;
  const offense = offenseOf(event);
  const victim = event.participants.some(
    (row) => row.personId === personId && row.role === "impact:crime-victim",
  );
  if (!offense || !victim) return null;
  if (event.type === CRIME_EVENT_TYPES.arrest)
    return `Police in ${town(event)} made an arrest in ${YOUR_CASE[offense]}.`;
  return event.type === CRIME_EVENT_TYPES.reported
    ? `${HAPPENED_TO_YOU[offense]}, and police in ${town(event)} took the report.`
    : `${HAPPENED_TO_YOU[offense]}. No one reported it to police.`;
}
