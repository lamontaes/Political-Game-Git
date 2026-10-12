import type { DistrictChamber } from "../../districts/types";
import type {
  DistrictResidenceInterval,
  DistrictSeatBinding,
} from "../../simulation/types";
import type { IsoDate } from "./calendar";
const MEMBERSHIP_PROVENANCE_METHODS = new Set([
  "authored",
  "simulated-event",
  "canonical-home-join",
  "split-home-assignment",
]);
const HOME_PLACEMENT_METHODS = new Set([
  "canonical-home-join",
  "split-home-assignment",
]);
export function isSupportedDistrictMembership(
  interval: DistrictResidenceInterval,
): boolean {
  if (!MEMBERSHIP_PROVENANCE_METHODS.has(interval.provenance.method)) {
    return false;
  }
  if (
    interval.provenance.method === "simulated-event" &&
    interval.provenance.sourceEventId === null
  ) {
    return false;
  }
  return true;
}

export function districtResidenceSince(
  intervals: readonly DistrictResidenceInterval[],
  resolvedBinding: DistrictSeatBinding | null,
  residenceSince: IsoDate | null,
  onDate: IsoDate,
): IsoDate | null {
  if (resolvedBinding === null) return null;
  const covering = intervals
    .filter(
      (interval) =>
        isSupportedDistrictMembership(interval) &&
        interval.binding.recordId === resolvedBinding.recordId &&
        interval.binding.vintage === resolvedBinding.vintage &&
        interval.binding.compilerVersion === resolvedBinding.compilerVersion &&
        interval.startedOn <= onDate &&
        (interval.endedOn === null || interval.endedOn > onDate),
    )
    .sort((left, right) => left.startedOn.localeCompare(right.startedOn));
  const earliest = covering[0];
  if (!earliest) return null;
  return HOME_PLACEMENT_METHODS.has(earliest.provenance.method)
    ? membershipStartedOn(earliest, residenceSince)
    : earliest.startedOn;
}

export function membershipStartedOn(
  membership: DistrictResidenceInterval,
  livedHereSince: IsoDate | null,
): IsoDate {
  if (livedHereSince === null) return membership.startedOn;
  return livedHereSince < membership.startedOn
    ? livedHereSince
    : membership.startedOn;
}

export function recordedDistrictMembership(
  intervals: readonly DistrictResidenceInterval[],
  chamber: DistrictChamber,
  onDate: IsoDate,
): DistrictResidenceInterval | null {
  return (
    intervals
      .filter(
        (interval) =>
          isSupportedDistrictMembership(interval) &&
          interval.binding.chamber === chamber &&
          interval.startedOn <= onDate &&
          (interval.endedOn === null || interval.endedOn > onDate),
      )
      .sort((left, right) =>
        left.startedOn.localeCompare(right.startedOn),
      )[0] ?? null
  );
}
