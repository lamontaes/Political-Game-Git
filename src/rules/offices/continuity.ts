// STOPGAP offices.continuity-birthday: Continuity age compares month/day strings, so a leap-day birthday advances on March 1 in a common year.
// stopgapId: "offices.continuity-birthday"
import { generalElectionDay } from "./executive-calendar";
import type { IsoDate } from "./calendar";
export function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}
export function congressSeatHeldBy<T extends { readonly seatKey: string }>(
  seats: readonly {
    readonly seatKey: string;
    readonly occupant: {
      readonly kind: string;
      readonly member?: { readonly personId: string };
    };
  }[],
  catalog: readonly T[],
  personId: string,
): T | undefined {
  const held = seats.find(
    (seat) =>
      seat.occupant.kind === "member" &&
      seat.occupant.member?.personId === personId,
  );
  return held
    ? catalog.find((candidate) => candidate.seatKey === held.seatKey)
    : undefined;
}
export function districtSeatMustBeNamed(facts: {
  readonly executive: boolean;
  readonly congressional: boolean;
  readonly local: boolean;
  readonly officeExists: boolean;
  readonly chamberExists: boolean;
  readonly stateKeyKnown: boolean;
  readonly isTerritory: boolean;
  readonly districtCount: number;
}): boolean {
  if (
    facts.executive ||
    facts.congressional ||
    facts.local ||
    !facts.officeExists ||
    !facts.chamberExists ||
    !facts.stateKeyKnown ||
    facts.isTerritory
  )
    return false;
  return facts.districtCount > 0;
}
export function municipalSeatMustBeNamed(choices: readonly unknown[]): boolean {
  return choices.length > 0;
}
export function seatOne(facts: {
  readonly compiled: boolean;
  readonly mayor: boolean;
  readonly bodySize: number | null;
  readonly seatedMembers: number;
  readonly hasOrganization: boolean;
}): "install-and-seat" | "install-only" | "participate" | "organization-only" {
  if (facts.compiled) {
    if (
      !facts.mayor &&
      facts.bodySize !== null &&
      facts.seatedMembers >= facts.bodySize
    )
      return "install-only";
    return "install-and-seat";
  }
  return facts.hasOrganization ? "participate" : "organization-only";
}

export function nextCongressionalElectionAfter(date: IsoDate): IsoDate {
  let year = Number(date.slice(0, 4));
  if (year % 2 === 1) year += 1;
  let day = generalElectionDay(
    {
      cycleYears: 2,
      referenceYear: 0,
      day: "first-tuesday-after-first-monday-in-november",
    },
    year,
  );
  if (day <= date)
    day = generalElectionDay(
      {
        cycleYears: 2,
        referenceYear: 0,
        day: "first-tuesday-after-first-monday-in-november",
      },
      year + 2,
    );
  return day;
}
