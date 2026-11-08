/**
 * Rescues (Lives, Nov 8, 2026): a serious illness that begins (the health
 * engine's onset record) while someone grown shares the sufferer's home is
 * met by that person: the housemate closest to them, by the tie's closeness
 * today (the lowest id breaking a tie), calls for help and stays. Written as
 * `health.rescued`, naming the sufferer and the rescuer, with the rest of the
 * household as witnesses, and recorded as time together on their tie. Alone,
 * nobody is there and nothing is written. The director's `rescue` scene reads it.
 *
 * Every onset is treated as acute (SG-LIVES-rescue-acute): the health engine
 * does not yet tell a sudden episode from a slow one.
 */
import { closenessBetween } from "../closeness";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreEventInput, CoreState, PersonId } from "../types";

export const HEALTH_RESCUED = "health.rescued";

export function rescueOnset(api: CoreAPI, onset: CoreEventInput): void {
  const core = api.state as CoreState;
  const sufferer = core.people.get(onset.personIds[0]!);
  if (!sufferer?.alive || sufferer.tier === "husk") return;
  api.stopgap("SG-LIVES-rescue-acute");
  const today = makeIsoDate(core.date);
  const adult = api.parameter("votingAge");
  let best: { id: PersonId; level: number } | undefined;
  for (const id of [
    ...(core.households.get(sufferer.householdId)?.memberIds ?? []),
  ].sort()) {
    const other = core.people.get(id);
    if (
      !other?.alive ||
      other.id === sufferer.id ||
      other.tier === "husk" ||
      ageOnDate(makeIsoDate(other.birthDate), today) < adult
    )
      continue;
    const level = closenessBetween(core, sufferer.id, id);
    if (!best || level > best.level) best = { id: id as PersonId, level };
  }
  if (!best) return;
  const rescuer = core.people.get(best.id)!;
  const others = (core.households.get(sufferer.householdId)?.memberIds ?? [])
    .filter((id) => id !== sufferer.id && id !== best!.id)
    .filter((id) => core.people.get(id)?.alive)
    .sort();
  const id = `${HEALTH_RESCUED}:${sufferer.id}:${best.id}:${core.date}`;
  api.emit({
    id,
    date: core.date,
    kind: HEALTH_RESCUED,
    personIds: [sufferer.id, best.id],
    placeId: sufferer.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: `${rescuer.givenName} ${rescuer.familyName} was with ${sufferer.givenName} ${sufferer.familyName} when the illness began.`,
      estimatedFrom:
        "The health engine's onset record and the sufferer's household at the time.",
    },
    witnessIds: others as PersonId[],
    facts: { onsetId: onset.id, closeness: String(best.level) },
  });
  api.relationship(
    sufferer.id,
    best.id,
    "contact",
    api.parameter("rescueHours"),
    undefined,
    {
      cause: "rescue",
      sourceId: id,
    },
  );
}
