/** KEEP delivery guards, restoration arithmetic and completion request. Apply the capacity request and separately owned receiver between prepare and resume; all completion guards read the resulting facts. */
import type {
  EntityId,
  IsoDate,
  World,
  SimulationMoment,
  PublicProgramRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  PublicGovernmentIdentity,
  FutureDueItem,
  WorkItemStateRecord,
} from "../../simulation/types";
import { createStableId } from "../../simulation/ids";
import {
  publicGovernmentIdentityForRecord,
  samePublicGovernmentIdentity,
} from "./public-identity";
export interface DeliveryFacts {
  readonly worldId: EntityId;
  readonly onDate: IsoDate;
  readonly moment: SimulationMoment;
  readonly nextSequence: number;
  readonly records: readonly PublicProgramRecord[];
  readonly jurisdictions: World["jurisdictions"];
  readonly localPlaceLabels: ReadonlyMap<string, string>;
  readonly workItems: World["history"]["workItems"];
  readonly workItemStates: World["history"]["workItemStates"];
}
function ofKind<K extends PublicProgramRecord["kind"]>(
  facts: DeliveryFacts,
  key: string,
  kind: K,
  identity: PublicGovernmentIdentity,
) {
  return facts.records.filter(
    (r): r is Extract<PublicProgramRecord, { kind: K }> =>
      r.kind === kind &&
      r.programKey === key &&
      samePublicGovernmentIdentity(
        publicGovernmentIdentityForRecord(r),
        identity,
      ),
  );
}
function programCapacity(
  facts: DeliveryFacts,
  key: string,
  identity: PublicGovernmentIdentity,
) {
  return ofKind(facts, key, "capacity", identity).at(-1) ?? null;
}
function programOutturns(
  facts: DeliveryFacts,
  key: string,
  identity: PublicGovernmentIdentity,
) {
  return ofKind(facts, key, "capacity-outturn", identity);
}
function resolved(context: string, outcomeEventId: EntityId | null) {
  return {
    kind: "result" as const,
    status: "resolved" as const,
    reasonKey: null,
    context,
    outcomeEventId,
  };
}
// stopgapId: "laws.linear-service-restoration"
export function capacityOutturnRequest(
  facts: DeliveryFacts,
  commitment: PublicProgramCommitmentRecord,
  installment: PublicProgramInstallmentRecord,
) {
  const identity = publicGovernmentIdentityForRecord(commitment);
  const capacity = programCapacity(facts, commitment.programKey, identity);
  if (!capacity) return null;
  const placeLabel =
    identity.kind === "local-government"
      ? facts.localPlaceLabels.get(identity.governmentKey)
      : facts.jurisdictions[commitment.jurisdictionId]?.name;
  if (!placeLabel?.trim())
    throw new Error(
      "A delivered service needs its canonical government place label.",
    );
  const before =
    programOutturns(facts, commitment.programKey, identity).at(-1)
      ?.unitsOperational ?? capacity.unitsOperational;
  const plan = commitment.installments[installment.installmentIndex]!;
  const restored = capacity.restorationCostPerUnit
    ? Math.min(
        capacity.unitsTotal - before,
        Math.floor(
          plan.amount.minorUnits / capacity.restorationCostPerUnit.minorUnits,
        ),
      )
    : null;
  const stableKey = `${installment.stableKey}:capacity`;
  return {
    stableKey,
    event: {
      stableKey,
      kind: "capacity-outturn",
      jurisdictionId: commitment.jurisdictionId,
      involved: [
        ...(commitment.recipientOrganizationId
          ? [commitment.recipientOrganizationId]
          : [commitment.jurisdictionId]),
      ],
      participant: null,
      visibility: "public",
      programKey: commitment.programKey,
      summary:
        restored !== null && restored > 0
          ? `Paid work for ${capacity.serviceLabel} in ${placeLabel} returned ${restored} ${capacity.unitLabel} to service on ${facts.onDate}; ${before + restored} of ${capacity.unitsTotal} are now in service.`
          : `A payment for ${capacity.serviceLabel} in ${placeLabel} posted, and no ${capacity.unitLabel} ${restored === null ? "can yet be counted as" : "has been"} returned to service; ${before} of ${capacity.unitsTotal} are in service.`,
    },
    record: {
      kind: "capacity-outturn",
      programKey: commitment.programKey,
      jurisdictionId: commitment.jurisdictionId,
      serviceLabel: capacity.serviceLabel,
      unitLabel: capacity.unitLabel,
      placeLabel,
      ...(commitment.publicGovernmentIdentity
        ? { publicGovernmentIdentity: commitment.publicGovernmentIdentity }
        : {}),
      commitmentId: commitment.id,
      installmentId: installment.id,
      unitsOperational: before + (restored ?? 0),
      restoredUnits: restored,
    },
  };
}
function workKey(commitment: PublicProgramCommitmentRecord): string {
  return `${commitment.stableKey}:work`;
}

export function closeWorkIfDone(
  facts: DeliveryFacts,
  commitment: PublicProgramCommitmentRecord,
) {
  const records = facts.records;
  const settled = records.filter(
    (r): r is PublicProgramInstallmentRecord =>
      r.kind === "installment" && r.commitmentId === commitment.id,
  );
  if (settled.length < commitment.installments.length) return null;
  const deliveries = settled.filter(
    (r) =>
      r.status === "posted" &&
      commitment.installments[r.installmentIndex]!.purpose === "maintenance",
  );
  if (
    deliveries.some(
      (r) =>
        !records.some(
          (o) => o.kind === "capacity-outturn" && o.installmentId === r.id,
        ),
    )
  )
    return null;
  const work = facts.workItems.find((w) => w.stableKey === workKey(commitment));
  if (!work) return null;
  const previous = facts.workItemStates
    .filter((row) => row.workItemId === work.id)
    .at(-1)!;
  if (!previous) throw new Error(`Missing work item or state: ${work.id}`);
  if (previous.status === "completed" || previous.status === "cancelled")
    return null;
  const stableKey = `${workKey(commitment)}:completed`;
  const state: WorkItemStateRecord = {
    ...previous,
    id: createStableId("work-item-state", `${facts.worldId}:${stableKey}`),
    stableKey,
    sequence: facts.nextSequence,
    recordedAt: facts.moment,
    status: "completed",
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    outcomeEventId: null,
    supersedesStateId: previous.id,
  };
  return state;
}

function dueTarget(
  facts: DeliveryFacts,
  due: FutureDueItem,
  suffix: string,
): {
  commitment: PublicProgramCommitmentRecord;
  index: number;
} | null {
  const match = new RegExp(`^(.*):installment:(\\d+)${suffix}$`).exec(
    due.stableKey,
  );
  if (!match) return null;
  const commitment = facts.records.find(
    (r): r is PublicProgramCommitmentRecord =>
      r.kind === "commitment" && r.stableKey === match[1],
  );
  return commitment ? { commitment, index: Number(match[2]) } : null;
}
export function programDeliveryHandler(
  facts: DeliveryFacts,
  due: FutureDueItem,
) {
  const target = dueTarget(facts, due, ":delivery");
  if (!target) return resolved("No program commitment matches.", null);
  const installment = ofKind(
    facts,
    target.commitment.programKey,
    "installment",
    publicGovernmentIdentityForRecord(target.commitment),
  ).find(
    (r) =>
      r.commitmentId === target.commitment.id &&
      r.installmentIndex === target.index,
  );
  if (!installment || installment.status !== "posted")
    return resolved("Nothing was paid, so nothing is delivered.", null);
  if (
    programOutturns(
      facts,
      target.commitment.programKey,
      publicGovernmentIdentityForRecord(target.commitment),
    ).some((r) => r.installmentId === installment.id)
  )
    return resolved("Already delivered.", null);
  return {
    kind: "apply-capacity-and-receivers" as const,
    commitment: target.commitment,
    installment,
    capacity: capacityOutturnRequest(facts, target.commitment, installment),
  };
}
export function resumeProgramDelivery(
  facts: DeliveryFacts,
  prepared: Extract<
    ReturnType<typeof programDeliveryHandler>,
    { kind: "apply-capacity-and-receivers" }
  >,
) {
  const outturn = programOutturns(
    facts,
    prepared.commitment.programKey,
    publicGovernmentIdentityForRecord(prepared.commitment),
  ).find((r) => r.installmentId === prepared.installment.id);
  if (!outturn)
    return {
      kind: "result" as const,
      status: "blocked" as const,
      reasonKey: "public-program:capacity-unavailable",
      context:
        "The payment posted, but no matching service capacity profile exists; no delivery record was written.",
      outcomeEventId: null,
      completion: null,
    };
  return {
    ...resolved(
      outturn.restoredUnits !== null && outturn.restoredUnits > 0
        ? "Maintenance delivered."
        : "The payment posted; no service unit was restored yet.",
      outturn.eventId,
    ),
    completion: closeWorkIfDone(facts, prepared.commitment),
  };
}
