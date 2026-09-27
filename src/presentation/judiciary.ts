import { chiefExecutiveJurisdictionId } from "../simulation/nationwide-world/government-jurisdiction";
import { seatHolderAt, seatsForCourt } from "../simulation/judiciary/courts";
import { personName } from "../simulation/people";
import type { EntityId, IsoDate, World } from "../simulation/types";

export interface JudicialSeatView {
  readonly seatId: string;
  readonly personId: EntityId | null;
  readonly name: string;
  readonly startedAt: IsoDate | null;
}

export interface JudicialCourtView {
  readonly courtId: string;
  readonly name: string;
  readonly seatCount: number;
  readonly geographyDetail: "exact-court" | "office-family-only";
  readonly holders: readonly JudicialSeatView[];
}

export interface JudiciaryView {
  readonly supremeCourt: JudicialCourtView | null;
  readonly federalCourts: readonly JudicialCourtView[];
  readonly stateCourts: readonly JudicialCourtView[];
  readonly stateName: string | null;
}

/** Read-only public court roster; an old save without courts stays unchanged. */
export function projectJudiciary(
  world: World,
  stateUsps: string | null,
): JudiciaryView {
  const judiciary = world.judiciary;
  if (!judiciary)
    return {
      supremeCourt: null,
      federalCourts: [],
      stateCourts: [],
      stateName: null,
    };
  const stateJurisdictionId = stateUsps
    ? chiefExecutiveJurisdictionId(stateUsps)
    : null;
  const view = (courtId: string): JudicialCourtView => {
    const court = judiciary.courts[courtId]!;
    const seats = seatsForCourt(world, courtId);
    return {
      courtId,
      name: court.name,
      seatCount: seats.length,
      geographyDetail: court.geographyDetail ?? "exact-court",
      holders: seats.map((seat) => {
        const tenure = seatHolderAt(world, seat.seatId);
        const personId = tenure?.personId ?? null;
        const person = personId ? world.people[personId] : null;
        return {
          seatId: seat.seatId,
          personId,
          name: person ? personName(person) : "Vacant",
          startedAt: tenure?.startedAt ?? null,
        };
      }),
    };
  };
  const supremeCourt = judiciary.courts["us-supreme-court"]
    ? view("us-supreme-court")
    : null;
  const federalCourts = Object.values(judiciary.courts)
    .filter(
      (court) =>
        court.level.startsWith("federal-") &&
        court.courtId !== "us-supreme-court",
    )
    .sort(
      (a, b) =>
        (a.level === "federal-appellate" ? 0 : 1) -
          (b.level === "federal-appellate" ? 0 : 1) ||
        a.name.localeCompare(b.name),
    )
    .map((court) => view(court.courtId));
  const levelOrder: Readonly<Record<string, number>> = {
    "local-highest": 0,
    "local-intermediate": 1,
    "local-chancery": 2,
    "local-general-trial": 3,
  };
  const stateCourts = stateJurisdictionId
    ? Object.values(judiciary.courts)
        .filter(
          (court) =>
            court.jurisdictionId === stateJurisdictionId &&
            !court.level.startsWith("federal-"),
        )
        .sort(
          (a, b) =>
            (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9) ||
            a.name.localeCompare(b.name),
        )
        .map((court) => view(court.courtId))
    : [];
  return {
    supremeCourt,
    federalCourts,
    stateCourts,
    stateName: stateJurisdictionId
      ? (world.jurisdictions[stateJurisdictionId]?.name ?? null)
      : null,
  };
}
