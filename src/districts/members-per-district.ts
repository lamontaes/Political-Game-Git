/**
 * How many members one state legislative district elects.
 *
 * Most districts elect one. Arizona, Idaho, New Jersey, North Dakota, South
 * Dakota and Washington seat two Representatives from each House district;
 * Maryland's elect three, some split into subdistricts; Vermont's vary by
 * district in both chambers. The counts live in `members-per-district.json`
 * with their sources, so no state is named here. A chamber or district the
 * file does not list elects one member.
 */

import counts from "./members-per-district.json" with { type: "json" };
import type { DistrictChamber, DistrictIdentity } from "./types";

interface ChamberCounts {
  readonly membersPerDistrict: number;
  readonly districts?: Readonly<Record<string, number>>;
}

const states = counts.states as unknown as Readonly<
  Record<string, Readonly<Record<string, ChamberCounts>>>
>;

/** Members the district elects: its own count, its chamber's, or one. */
export function membersInDistrict(
  stateUsps: string,
  chamber: DistrictChamber,
  districtCode: string,
): number {
  const chamberCounts = states[stateUsps]?.[chamber];
  if (!chamberCounts) return 1;
  return (
    chamberCounts.districts?.[districtCode] ?? chamberCounts.membersPerDistrict
  );
}

/** Every seat of a chamber's districts, one entry per member, in district order. */
export function seatsByDistrict(
  districts: readonly DistrictIdentity[],
): readonly DistrictIdentity[] {
  return districts.flatMap((district) =>
    Array.from(
      {
        length: membersInDistrict(
          district.stateUsps,
          district.chamber,
          district.districtCode,
        ),
      },
      () => district,
    ),
  );
}
