import { ageOnDate, completedMonthsBetween } from "../dates";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  dwellingOccupancyStateAt,
} from "../resource-queries";
import type { EntityId, HousingTenure, World } from "../types";
import { openingOwnerMortgageEvidence } from "./opening-mortgage-evidence";

export interface OpeningMortgageTenureReading {
  readonly housingTenureId: EntityId;
  readonly dwellingId: EntityId;
  readonly ownerPersonId: EntityId;
  readonly ageBand: string | null;
  readonly paidMonths: number | null;
  readonly basis:
    "recorded-home-start" | "same-town-owner-average" | "missing-owner-tenure";
  readonly sourceRecordIds: readonly EntityId[];
}

/**
 * Read actual primary owners once, then average recorded residence months
 * among owners in the same town and cited age band. Opening-generated dates
 * on today's date do not describe a prior residence. An empty observed cohort
 * supplies no estimate; it is not a zero-year mortgage or a fictional move.
 */
export function openingMortgageTenureReadings(
  world: World,
  jurisdictionId: EntityId,
): readonly OpeningMortgageTenureReading[] {
  const deceased = new Set(
    world.history.personDeaths
      .filter((row) => row.diedAt <= world.currentDate)
      .map((row) => row.personId),
  );
  const latestMemberships = new Map(
    world.history.householdMembershipStates
      .filter((row) => row.effectiveAt <= world.currentDate)
      .map((row) => [row.membershipId, row] as const),
  );
  const members = new Map<EntityId, EntityId[]>();
  const membershipSources = new Map<string, readonly EntityId[]>();
  for (const row of world.history.householdMemberships) {
    const state = latestMemberships.get(row.id);
    const person = world.people[row.personId];
    if (
      !person ||
      deceased.has(person.id) ||
      row.startedAt > world.currentDate ||
      person.homeJurisdictionId !== jurisdictionId ||
      state?.status !== "resident" ||
      state.residenceRole !== "primary"
    )
      continue;
    const group = members.get(row.householdId) ?? [];
    group.push(person.id);
    members.set(row.householdId, group);
    membershipSources.set(`${row.householdId}|${person.id}`, [
      row.id,
      state.id,
    ]);
  }
  const ownerOf = (tenure: HousingTenure): EntityId | null => {
    if (tenure.holder.kind === "organization") return null;
    if (tenure.holder.kind === "person") {
      const person = world.people[tenure.holder.personId];
      return person?.homeJurisdictionId === jurisdictionId &&
        !deceased.has(person.id)
        ? person.id
        : null;
    }
    return (
      members
        .get(tenure.holder.householdId)
        ?.reduce((oldest, personId) =>
          world.people[personId]!.birthDate < world.people[oldest]!.birthDate
            ? personId
            : oldest,
        ) ?? null
    );
  };
  const holderKey = (tenure: HousingTenure) =>
    tenure.holder.kind === "person"
      ? `person:${tenure.holder.personId}`
      : tenure.holder.kind === "household"
        ? `household:${tenure.holder.householdId}`
        : null;
  const occupancies = new Map(
    activeDwellingOccupanciesAt(world)
      .filter(
        (row) =>
          dwellingOccupancyStateAt(world, row.id)?.residenceRole === "primary",
      )
      .map((row) => [
        `${row.occupant.kind}:${row.occupant.kind === "person" ? row.occupant.personId : row.occupant.householdId}|${row.dwellingId}`,
        row,
      ]),
  );
  const dwellings = new Map(
    world.history.dwellings.map((row) => [row.id, row] as const),
  );
  const readings: OpeningMortgageTenureReading[] = [];
  for (const tenure of activeHousingTenuresAt(world)) {
    if (!tenure.kind.startsWith("ownership:")) continue;
    if (dwellings.get(tenure.dwellingId)?.jurisdictionId !== jurisdictionId)
      continue;
    const ownerPersonId = ownerOf(tenure);
    const occupancy = occupancies.get(
      `${holderKey(tenure)}|${tenure.dwellingId}`,
    );
    if (!ownerPersonId || !occupancy) continue;
    const initializedToday =
      occupancy.startedAt === world.currentDate &&
      occupancy.provenance.kind === "generated";
    readings.push({
      housingTenureId: tenure.id,
      dwellingId: tenure.dwellingId,
      ownerPersonId,
      ageBand:
        openingOwnerMortgageEvidence(
          ageOnDate(world.people[ownerPersonId]!.birthDate, world.currentDate),
        )?.ageBand ?? null,
      paidMonths: initializedToday
        ? null
        : completedMonthsBetween(occupancy.startedAt, world.currentDate),
      basis: initializedToday ? "missing-owner-tenure" : "recorded-home-start",
      sourceRecordIds: [
        tenure.id,
        occupancy.id,
        ...(tenure.holder.kind === "household"
          ? (membershipSources.get(
              `${tenure.holder.householdId}|${ownerPersonId}`,
            ) ?? [])
          : []),
      ],
    });
  }
  const cohorts = new Map<
    string,
    { months: number; count: number; sourceRecordIds: EntityId[] }
  >();
  for (const row of readings) {
    if (row.paidMonths === null || row.ageBand === null) continue;
    const group = cohorts.get(row.ageBand) ?? {
      months: 0,
      count: 0,
      sourceRecordIds: [],
    };
    group.months += row.paidMonths;
    group.count += 1;
    group.sourceRecordIds.push(...row.sourceRecordIds);
    cohorts.set(row.ageBand, group);
  }
  return readings.map((row) => {
    if (row.paidMonths !== null || row.ageBand === null) return row;
    const cohort = cohorts.get(row.ageBand);
    return cohort
      ? {
          ...row,
          paidMonths: Math.round(cohort.months / cohort.count),
          basis: "same-town-owner-average",
          sourceRecordIds: [...row.sourceRecordIds, ...cohort.sourceRecordIds],
        }
      : row;
  });
}
