import type { CongressSeat } from "../../simulation/living-world/congress-seats";
import type { HouseDelegateSeat } from "../../simulation/living-world/house-delegates";
import type { EntityId, HistoricalEvent } from "../../simulation/types";
import { makeIsoDate, type IsoDate } from "./calendar";
import { projectedCaucus } from "./delegate-projection";
import { seatTermWindow } from "./congress-term";
const tag = (record: HistoricalEvent, prefix: string) =>
  record.tags.find((value) => value.startsWith(prefix))?.slice(prefix.length) ??
  null;
export function statehoodSeats(
  classesByState: Readonly<Record<string, readonly (1 | 2 | 3)[]>>,
  facts: {
    readonly place: string;
    readonly senateSeats: number;
    readonly houseSeats: number;
    readonly houseDistrictCode: string;
  },
): CongressSeat[] {
  const counts = new Map<1 | 2 | 3, number>([
    [1, 0],
    [2, 0],
    [3, 0],
  ]);
  for (const classes of Object.values(classesByState))
    for (const c of classes) counts.set(c, (counts.get(c) ?? 0) + 1);
  const classes = [...counts.entries()]
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .slice(0, facts.senateSeats)
    .map(([c]) => c)
    .sort();
  const seats: CongressSeat[] = [];
  for (let index = 0; index < facts.houseSeats; index++)
    seats.push({
      seatKey: `us-house:${facts.place}-${facts.houseDistrictCode}`,
      chamberKey: "us-house",
      stateUsps: facts.place,
      district: facts.houseDistrictCode,
      senateClass: null,
    });
  for (const c of classes)
    seats.push({
      seatKey: `us-senate:${facts.place}:class-${c}`,
      chamberKey: "us-senate",
      stateUsps: facts.place,
      district: null,
      senateClass: c,
    });
  return seats;
}
export function delegateTermStarts(
  before: IsoDate,
  after: IsoDate,
  seat: HouseDelegateSeat,
  referenceYear: number,
  opening: boolean,
  admitted: boolean,
  hasTenure: boolean,
): IsoDate[] {
  if (after <= before || !opening || admitted || !hasTenure) return [];
  const dates: IsoDate[] = [];
  for (
    let year = Number(before.slice(0, 4));
    year <= Number(after.slice(0, 4));
    year++
  ) {
    const date = makeIsoDate(`${year}-01-03`);
    if (
      date > before &&
      date <= after &&
      (year - referenceYear) % seat.termYears === 0
    )
      dates.push(date);
  }
  return dates;
}
export function delegateTermDecision(
  seat: HouseDelegateSeat,
  startsAt: IsoDate,
  record: HistoricalEvent | undefined,
  alreadyWritten: boolean,
  alive: ReadonlySet<EntityId>,
) {
  if (alreadyWritten || !record || record.occurredAt >= startsAt) return null;
  const incumbent = record.participants.find(
    (p) => p.role === "focus:subject",
  )?.personId;
  const seeking = incumbent !== undefined && alive.has(incumbent);
  const recordedCaucus = tag(record, "caucus:");
  const caucus = projectedCaucus(seat, recordedCaucus, seeking);
  const returns = seeking && recordedCaucus === caucus;
  return {
    seat,
    startsAt,
    endExclusive: makeIsoDate(
      `${Number(startsAt.slice(0, 4)) + seat.termYears}-01-03`,
    ),
    caucus,
    returningPersonId: returns ? incumbent! : null,
    serviceSince: returns
      ? ((tag(record, "service-since:") as IsoDate | null) ?? record.occurredAt)
      : startsAt,
  };
}
export function statehoodTurnoverReady(
  before: IsoDate,
  after: IsoDate,
  hasEnactments: boolean,
  opening: boolean,
  admitted: IsoDate | null,
): boolean {
  return after > before && hasEnactments && opening && admitted !== null;
}
export function statehoodNextTerm(facts: {
  readonly seat: CongressSeat;
  readonly after: IsoDate;
  readonly record: HistoricalEvent | undefined;
  readonly alive: ReadonlySet<EntityId>;
  readonly project: (
    caucus: string | null,
    seeking: boolean,
  ) => "democratic" | "republican";
  readonly references: Parameters<typeof seatTermWindow>[2];
}) {
  const { record } = facts;
  if (!record) return null;
  const end = tag(record, "term-end:") as IsoDate | null;
  if (!end || end > facts.after) return null;
  const window = seatTermWindow(facts.seat, end, facts.references);
  const incumbent = record.participants.find(
    (p) => p.role === "focus:subject",
  )?.personId;
  const alive = incumbent !== undefined && facts.alive.has(incumbent);
  const recordedCaucus = tag(record, "caucus:");
  const caucus = facts.project(recordedCaucus, alive);
  const returns = alive && recordedCaucus === caucus;
  return {
    seat: facts.seat,
    startsAt: end,
    endExclusive: window.endExclusive,
    caucus,
    returningPersonId: returns ? incumbent! : null,
    serviceSince: returns
      ? ((tag(record, "service-since:") as IsoDate | null) ?? record.occurredAt)
      : end,
  };
}
export function statehoodAdmissionTerm(
  seat: CongressSeat,
  admitted: IsoDate,
  windowEnd: IsoDate,
  delegate: {
    readonly kind: string;
    readonly caucus: string;
    readonly personId: EntityId;
  } | null,
  project: (
    caucus: string | null,
    seeking: boolean,
  ) => "democratic" | "republican",
) {
  const returning =
    seat.chamberKey === "us-house" && delegate?.kind === "member"
      ? delegate
      : null;
  return {
    seat,
    startsAt: admitted,
    endExclusive: windowEnd,
    caucus: returning ? project(returning.caucus, true) : project(null, false),
    returningPersonId: returning ? returning.personId : null,
    serviceSince: admitted,
  };
}
export const STATEHOOD_TURNOVER_GUARD = 200;

// stopgapId: "SG-P14-elections-statehood-guard"

export function latestTerritorialTenure(
  events: readonly HistoricalEvent[],
  eventType: string,
  seatKey: string,
): HistoricalEvent | undefined {
  let latest: HistoricalEvent | undefined;
  for (const event of events) {
    if (event.type !== eventType || !event.tags.includes(`seat:${seatKey}`))
      continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}
export function statehoodRenewalAllowed(iteration: number): boolean {
  return iteration < STATEHOOD_TURNOVER_GUARD;
}
