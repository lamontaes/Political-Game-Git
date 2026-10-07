import { appendCrisisRecord, crisisRecords } from "./records";
import type { EntityId, IsoDate, World } from "../types";
import type { SnapParticipationRecord } from "./types";

export function snapParticipationRecords(
  world: World,
): readonly SnapParticipationRecord[] {
  return crisisRecords(world).filter(
    (record): record is SnapParticipationRecord =>
      record.kind === "snap-participation",
  );
}

export function snapParticipationAt(
  world: World,
  householdId: EntityId,
  onDate: IsoDate = world.currentDate,
): SnapParticipationRecord | undefined {
  return snapParticipationRecords(world)
    .filter(
      (record) =>
        record.householdId === householdId && record.effectiveAt <= onDate,
    )
    .sort(
      (left, right) =>
        left.effectiveAt.localeCompare(right.effectiveAt) ||
        left.sequence - right.sequence,
    )
    .at(-1);
}

export interface SnapParticipationInput {
  readonly householdId: EntityId;
  readonly enrolled: boolean;
  readonly monthlyBenefitMinor: number | null;
  readonly benefitSource: string | null;
  readonly causeId: EntityId;
  readonly applicationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly householdSize: number;
  readonly monthlyWorkHours: number | null;
  readonly incomeToThreshold: number | null;
}

/** The one household SNAP enrollment writer; a zero change still gets a row. */
export function recordSnapParticipation(
  world: World,
  input: SnapParticipationInput,
): World {
  const prior = snapParticipationAt(
    world,
    input.householdId,
    input.effectiveAt,
  );
  if (
    prior?.enrolled === input.enrolled &&
    prior.effectiveAt === input.effectiveAt &&
    prior.causeId === input.causeId
  )
    return world;
  const enrolled = input.enrolled;
  return appendCrisisRecord(world, {
    kind: "snap-participation",
    stableKey: `snap-participation:${input.householdId}:${input.effectiveAt}:${input.causeId}:${input.applicationId}`,
    effectiveAt: input.effectiveAt,
    causalParentIds: [],
    visibility: "private",
    eventId: null,
    householdId: input.householdId,
    enrolled,
    monthlyBenefitMinor: enrolled ? input.monthlyBenefitMinor : null,
    benefitBasis: enrolled ? "ESTIMATED FROM STATE AVERAGE" : null,
    benefitSource: enrolled ? input.benefitSource : null,
    causeId: input.causeId,
    householdSize: input.householdSize,
    monthlyWorkHours: input.monthlyWorkHours,
    incomeToThreshold: input.incomeToThreshold,
  });
}
