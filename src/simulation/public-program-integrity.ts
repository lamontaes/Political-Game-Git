import { createStableId } from "./ids";
import type {
  EntityId,
  IsoDate,
  PublicProgramCommitmentRecord,
  PublicProgramRecord,
  World,
} from "./types";

/**
 * The integrity half of GOVERNING public programs. It depends only on types
 * and ids so the resource validators can call it without an import cycle.
 */

export const PUBLIC_PROGRAM_EVENT_PREFIX = "public-program.";

export function publicProgramRecords(
  world: World,
): readonly PublicProgramRecord[] {
  return world.history.publicProgramRecords ?? [];
}

export function publicProgramRecordId(
  world: World,
  stableKey: string,
): EntityId {
  return createStableId("public-program-record", `${world.id}:${stableKey}`);
}

/** A program payment must name an earlier commitment and one of its installments. */
export function assertProgramInstallmentBasis(
  world: World,
  commitmentId: EntityId,
  installmentIndex: number,
  sequenceExclusive: number,
  date: IsoDate,
): void {
  const commitment = publicProgramRecords(world).find(
    (record): record is PublicProgramCommitmentRecord =>
      record.id === commitmentId && record.kind === "commitment",
  );
  if (
    !commitment ||
    commitment.sequence >= sequenceExclusive ||
    commitment.recordedAt > date ||
    !Number.isSafeInteger(installmentIndex) ||
    !commitment.installments[installmentIndex] ||
    commitment.installments[installmentIndex]!.dueAt > date
  )
    throw new Error(
      "A program payment needs an earlier commitment whose installment has fallen due.",
    );
}

const positive = (value: number) => Number.isSafeInteger(value) && value > 0;
const count = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** Runs on every write. Records are append-only and reference only earlier ones. */
export function assertPublicProgramIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const byId = new Map<EntityId, PublicProgramRecord>();
  const keys = new Set<string>();
  const installmentKeys = new Set<string>();
  const outturnFor = new Set<EntityId>();
  const committed = new Map<EntityId, bigint>();
  let prior = -1;
  const fail = (record: PublicProgramRecord, message: string): never => {
    throw new Error(`Public program record ${record.stableKey}: ${message}`);
  };
  const earlier = <K extends PublicProgramRecord["kind"]>(
    record: PublicProgramRecord,
    id: EntityId,
    kind: K,
  ): Extract<PublicProgramRecord, { kind: K }> => {
    const found = byId.get(id);
    if (!found || found.kind !== kind)
      fail(record, `does not reference an earlier ${kind} record.`);
    if (found!.programKey !== record.programKey)
      fail(record, "references another program.");
    return found as Extract<PublicProgramRecord, { kind: K }>;
  };
  for (const record of publicProgramRecords(world)) {
    if (record.sequence <= prior) fail(record, "records are not in order.");
    prior = record.sequence;
    if (keys.has(record.stableKey)) fail(record, "duplicate stable key.");
    keys.add(record.stableKey);
    if (ids.has(record.id)) fail(record, "duplicate identity.");
    ids.add(record.id);
    if (record.id !== publicProgramRecordId(world, record.stableKey))
      fail(record, "identity does not match its stable key.");
    if (record.recordedAt > world.currentDate)
      fail(record, "is recorded after the current date.");
    if (!/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9.-]*$/.test(record.programKey))
      fail(record, "program key must be namespace:name.");
    if (!world.jurisdictions[record.jurisdictionId])
      fail(record, "names a missing jurisdiction.");
    const event = world.history.events.find((e) => e.id === record.eventId);
    if (
      !event ||
      event.type !== `${PUBLIC_PROGRAM_EVENT_PREFIX}${record.kind}` ||
      event.occurredAt !== record.recordedAt ||
      event.sequence > record.sequence
    )
      fail(record, "lacks its paired ordinary event.");
    switch (record.kind) {
      case "capacity":
        if (
          !positive(record.unitsTotal) ||
          !count(record.unitsOperational) ||
          record.unitsOperational > record.unitsTotal ||
          !positive(record.monthlyOperatingNeed.minorUnits) ||
          (record.completedPermille !== null &&
            (!count(record.completedPermille) ||
              record.completedPermille > 1000)) ||
          (record.restorationCostPerUnit !== null &&
            !positive(record.restorationCostPerUnit.minorUnits)) ||
          !record.basis.note.trim()
        )
          fail(record, "declares an impossible capacity.");
        break;
      case "appropriation":
        if (
          !positive(record.amount.minorUnits) ||
          record.availableThrough < record.availableFrom ||
          !world.history.organizations.some(
            (o) => o.id === record.accountOrganizationId,
          ) ||
          (record.sourceMeasureId != null &&
            !(world.history.legislativeMeasures ?? []).some(
              (measure) =>
                measure.id === record.sourceMeasureId &&
                measure.sequence < record.sequence,
            )) ||
          !record.basis.note.trim()
        )
          fail(record, "declares an impossible appropriation.");
        break;
      case "commitment": {
        const appropriation = earlier(
          record,
          record.appropriationId,
          "appropriation",
        );
        if (!world.people[record.decidedByPersonId])
          fail(record, "names a missing decision-maker.");
        if (!record.authority.trim()) fail(record, "states no authority.");
        let total = 0n;
        let lastDue = record.recordedAt;
        for (const plan of record.installments) {
          if (
            !positive(plan.amount.minorUnits) ||
            plan.amount.currency !== appropriation.amount.currency ||
            plan.dueAt < lastDue ||
            plan.dueAt > appropriation.availableThrough
          )
            fail(record, "schedules an installment outside its appropriation.");
          lastDue = plan.dueAt;
          total += BigInt(plan.amount.minorUnits);
        }
        if (record.installments.length > 0 && !record.recipientOrganizationId)
          fail(record, "commits money without a recipient.");
        if (
          record.deliveryLeadDays !== null &&
          !positive(record.deliveryLeadDays)
        )
          fail(record, "has an impossible delivery lead.");
        if (
          record.recordedAt < appropriation.availableFrom ||
          record.recordedAt > appropriation.availableThrough
        )
          fail(record, "was made outside the appropriation's availability.");
        const sum = (committed.get(appropriation.id) ?? 0n) + total;
        if (sum > BigInt(appropriation.amount.minorUnits))
          fail(record, "commits more than the appropriation holds.");
        committed.set(appropriation.id, sum);
        break;
      }
      case "installment": {
        const commitment = earlier(record, record.commitmentId, "commitment");
        const plan = commitment.installments[record.installmentIndex];
        const key = `${commitment.id}:${record.installmentIndex}`;
        if (!plan) fail(record, "names an installment the commitment lacks.");
        if (installmentKeys.has(key))
          fail(record, "settles an installment twice.");
        installmentKeys.add(key);
        if (record.recordedAt < plan!.dueAt)
          fail(record, "settles an installment before it fell due.");
        const flow = record.resourceFlowId
          ? world.history.resourceFlows.find(
              (f) => f.id === record.resourceFlowId,
            )
          : undefined;
        if (record.status === "posted") {
          if (
            !flow ||
            flow.basisReference.kind !== "public-program" ||
            flow.basisReference.commitmentId !== commitment.id ||
            flow.basisReference.installmentIndex !== record.installmentIndex ||
            flow.sequence > record.sequence
          )
            fail(record, "was posted without its payment.");
        } else if (record.resourceFlowId !== null || !record.reason?.trim())
          fail(record, "a failed installment pays nothing and says why.");
        break;
      }
      case "capacity-outturn": {
        const commitment = earlier(record, record.commitmentId, "commitment");
        const installment = earlier(
          record,
          record.installmentId,
          "installment",
        );
        if (
          installment.commitmentId !== commitment.id ||
          installment.status !== "posted" ||
          outturnFor.has(installment.id) ||
          !count(record.unitsOperational) ||
          (record.restoredUnits !== null && !count(record.restoredUnits))
        )
          fail(record, "does not follow a posted installment once.");
        outturnFor.add(installment.id);
        break;
      }
    }
    byId.set(record.id, record);
  }
  for (const flow of world.history.resourceFlows) {
    if (flow.basisReference.kind !== "public-program") continue;
    const commitment = byId.get(flow.basisReference.commitmentId);
    if (
      !commitment ||
      commitment.kind !== "commitment" ||
      flow.recipient.kind !== "organization" ||
      flow.recipient.organizationId !== commitment.recipientOrganizationId
    )
      throw new Error(
        "A program payment lost its commitment or recipient binding.",
      );
    const posted = publicProgramRecords(world).filter(
      (r) => r.kind === "installment" && r.resourceFlowId === flow.id,
    );
    if (posted.length > 1)
      throw new Error("A program payment cannot settle twice.");
  }
}
