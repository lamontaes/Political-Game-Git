import type { CandidacyPack } from "../../simulation/candidacy-packs";
import type { DistrictIdentity } from "../../districts/types";
export interface ChamberPlanFacts {
  readonly districts: Readonly<Record<string, readonly DistrictIdentity[]>>;
  readonly memberCounts: Readonly<Record<string, number>>;
  readonly atLargeSeats: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
}
function seatsByDistrict(
  facts: ChamberPlanFacts,
  districts: readonly DistrictIdentity[],
): readonly DistrictIdentity[] {
  return districts.flatMap((district) =>
    Array.from(
      { length: facts.memberCounts[district.recordId] ?? 1 },
      () => district,
    ),
  );
}
export type ChamberSizeBasis =
  "rule-pack" | "one-member-per-district" | "members-per-district";

export interface SeatedChamberPlan {
  readonly officeKey: string;
  readonly chamberKey: string;
  readonly chamberName: string;
  readonly size: number;
  readonly basis: ChamberSizeBasis;
  readonly districts: readonly (DistrictIdentity | null)[];
  readonly atLargeSeats: number;
}

type StateChamberPlan = {
  readonly chambers: readonly SeatedChamberPlan[];
  readonly unseated: readonly {
    officeKey: string;
    reason: string;
  }[];
};

export function buildStateChamberPlan(
  facts: ChamberPlanFacts,
  pack: CandidacyPack,
): StateChamberPlan {
  const chambers: SeatedChamberPlan[] = [];
  const unseated: {
    officeKey: string;
    reason: string;
  }[] = [];
  for (const office of pack.offices) {
    const chamberKey = office.officeKey.split(":").at(-1) ?? "";
    const districts = [...(facts.districts[chamberKey] ?? [])].sort((l, r) =>
      l.districtCode.localeCompare(r.districtCode, "en", { numeric: true }),
    );
    let size: number;
    let basis: ChamberSizeBasis;
    const drawn =
      office.seats.kind === "known" &&
      office.seats.source?.authority === "game-profile";
    if (office.seats.kind === "known" && !(drawn && districts.length > 0)) {
      size = office.seats.value;
      basis = "rule-pack";
    } else if (districts.length > 0) {
      size = seatsByDistrict(facts, districts).length;
      basis =
        size === districts.length
          ? "one-member-per-district"
          : "members-per-district";
    } else {
      unseated.push({
        officeKey: office.officeKey,
        reason:
          "Neither the rule pack nor the Census district record says how many members this chamber has.",
      });
      continue;
    }
    const atLargeSeats = Math.min(
      size,
      facts.atLargeSeats[pack.jurisdictionKey]?.[chamberKey] ?? 0,
    );
    chambers.push({
      officeKey: office.officeKey,
      chamberKey,
      chamberName: office.chamberName,
      size,
      basis,
      districts: bindDistricts(facts, size - atLargeSeats, districts, size),
      atLargeSeats,
    });
  }
  return { chambers, unseated };
}

function bindDistricts(
  facts: ChamberPlanFacts,
  districtSeats: number,
  districts: readonly DistrictIdentity[],
  size: number = districtSeats,
): readonly (DistrictIdentity | null)[] {
  const counted = seatsByDistrict(facts, districts);
  if (districtSeats > 0 && counted.length === districtSeats) {
    return Array.from({ length: size }, (_, index) =>
      index < districtSeats ? counted[index]! : null,
    );
  }
  if (
    districtSeats <= 0 ||
    districts.length === 0 ||
    districtSeats % districts.length !== 0
  ) {
    return Array.from({ length: size }, () => null);
  }
  const perDistrict = districtSeats / districts.length;
  return Array.from({ length: size }, (_, index) =>
    index < districtSeats ? districts[Math.floor(index / perDistrict)]! : null,
  );
}
export function stateSeatOrdinalsInDistrict(
  plan: SeatedChamberPlan | null,
  districtRecordId: string,
): readonly number[] {
  if (!plan) return [];
  const seats: number[] = [];
  plan.districts.forEach((district, index) => {
    const ordinal = index + 1;
    if (ordinal > plan.size - plan.atLargeSeats) return;
    if (district?.recordId !== districtRecordId) return;
    seats.push(ordinal);
  });
  return seats;
}

// stopgapId: "SG-P14-elections-district-seat-default"
