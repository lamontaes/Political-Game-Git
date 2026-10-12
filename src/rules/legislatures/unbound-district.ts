import {
  buildStateChamberPlan,
  type ChamberPlanFacts,
} from "../elections/chamber-plan";
import type {
  EntityId,
  ElectionContestRecord,
  DistrictResidenceInterval,
} from "../../simulation/types";
import type { DistrictChamber } from "../../districts/types";
import type { resolveDistrictBinding } from "../../districts/query";
import type { CandidacyPack } from "../../simulation/candidacy-packs";
import { isSupportedDistrictMembership } from "../offices/district-residence";
export interface UnboundDistrictFacts {
  readonly packs: ReadonlyMap<string, CandidacyPack>;
  readonly intervals: readonly DistrictResidenceInterval[];
  readonly resolutions: ReadonlyMap<
    EntityId,
    ReturnType<typeof resolveDistrictBinding>
  >;
  readonly chamberFacts: ReadonlyMap<string, ChamberPlanFacts>;
}
export function gazetteerChamberForOfficeChamberKey(
  chamberKey: string,
): DistrictChamber | null {
  if (chamberKey === "house" || chamberKey === "assembly") return "state-lower";
  if (chamberKey === "senate" || chamberKey === "legislature") {
    return "state-upper";
  }
  if (chamberKey === "congressional") return "congressional";
  return null;
}
function stateSeatsInDistrict(
  facts: UnboundDistrictFacts,
  packId: string,
  officeKey: string,
  districtRecordId: string,
): readonly { readonly ordinal: number }[] {
  const pack = facts.packs.get(packId);
  const raw = facts.chamberFacts.get(packId);
  const plan =
    pack && raw
      ? buildStateChamberPlan(raw, pack).chambers.find(
          (p) => p.officeKey === officeKey,
        )
      : null;
  if (!plan) return [];
  const seats: { ordinal: number }[] = [];
  plan.districts.forEach((district, index) => {
    const ordinal = index + 1;
    if (ordinal > plan.size - plan.atLargeSeats) return;
    if (district?.recordId !== districtRecordId) return;
    seats.push({ ordinal });
  });
  return seats;
}
export function legacyUnboundDistrictSeat(
  facts: UnboundDistrictFacts,
  contest: ElectionContestRecord,
  winnerPersonId: EntityId,
  packId: string,
): string | null {
  if (contest.office.districtBinding || contest.office.seatKey) return null;
  const pack = facts.packs.get(packId);
  const stateUsps = /^US-([A-Z]{2})$/.exec(pack?.jurisdictionKey ?? "")?.[1];
  const chamber = gazetteerChamberForOfficeChamberKey(
    contest.office.officeKey.split(":").at(-1) ?? "",
  );
  if (
    !stateUsps ||
    !chamber ||
    !pack?.offices.some(
      (office) => office.officeKey === contest.office.officeKey,
    ) ||
    !contest.candidatePersonIds.includes(winnerPersonId)
  )
    return null;
  const districts = new Set<string>();

  for (const interval of facts.intervals) {
    if (
      interval.personId !== winnerPersonId ||
      !isSupportedDistrictMembership(interval) ||
      interval.startedOn > contest.electionDate ||
      (interval.endedOn !== null && interval.endedOn <= contest.electionDate) ||
      interval.binding.chamber !== chamber ||
      interval.binding.stateUsps !== stateUsps
    )
      continue;
    const resolved = facts.resolutions.get(interval.id)!;
    if (resolved.kind === "refused") continue;
    districts.add(resolved.binding.recordId);
  }
  if (districts.size !== 1) return null;
  const [districtRecordId] = districts;
  return stateSeatsInDistrict(
    facts,
    packId,
    contest.office.officeKey,
    districtRecordId!,
  ).length === 1
    ? districtRecordId!
    : null;
}
