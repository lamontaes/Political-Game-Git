import type { HistoricalEvent, EntityId } from "../../simulation/types";
import type { IsoDate } from "./calendar";
import type { NominationPlan } from "../../simulation/nominations/nomination-rules";
import type { NominationEntrant } from "../../simulation/nominations/party-nominations";
const tagOf = (event: HistoricalEvent, prefix: string) =>
  event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
  null;
export function filedNominationDue(
  before: IsoDate,
  after: IsoDate,
  field: HistoricalEvent,
  fieldType: string,
  stableKeySuffix: string,
  pendingRunoff: IsoDate | null,
) {
  if (field.type !== fieldType || !field.stableKey.endsWith(stableKeySuffix))
    return null;
  const primaryDate = tagOf(field, "primary-date:") as IsoDate | null;
  if (!primaryDate) return null;
  const primaryDue = before < primaryDate && primaryDate <= after;
  const runoffDue =
    pendingRunoff !== null && before < pendingRunoff && pendingRunoff <= after;
  return primaryDue || runoffDue
    ? { primaryDate, primaryDue, runoffDue }
    : null;
}
export function filedPrimaryEntrants(
  field: HistoricalEvent,
  primaryDate: IsoDate,
  plan: NominationPlan,
  alive: ReadonlySet<EntityId>,
): NominationEntrant[] {
  if (!plan.known || plan.primaryDate !== primaryDate) return [];
  return field.participants.flatMap((participant) => {
    const [party, kind, how] = (participant.detail ?? "").split("|");
    if (!party || !alive.has(participant.personId)) return [];
    return [
      {
        personId: participant.personId,
        party,
        incumbent: kind === "incumbent",
        partyBacked: kind !== "incumbent" && how !== "self-starter",
      },
    ];
  });
}
export function filedRunoffDue(
  before: IsoDate,
  after: IsoDate,
  runoffOn: IsoDate | null,
): boolean {
  return !!runoffOn && before < runoffOn && runoffOn <= after;
}

export function nominationSeatAdmitted(
  packExists: boolean,
  titleExists: boolean,
  jurisdictionExists: boolean,
): boolean {
  return packExists && titleExists && jurisdictionExists;
}
export function congressNominationFieldSeat(
  field: HistoricalEvent,
  seats: ReadonlyMap<string, { readonly seatKey: string }>,
  expectedSlateKey: (seatKey: string) => string,
) {
  const key = tagOf(field, "seat:") ?? "";
  const seat = seats.get(key);
  return seat && field.stableKey === expectedSlateKey(seat.seatKey)
    ? seat
    : null;
}
