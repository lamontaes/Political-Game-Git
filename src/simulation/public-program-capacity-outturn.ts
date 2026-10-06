import { eventById } from "./event-index";
import { publicProgramRecords } from "./public-program-integrity";
import type {
  EntityId,
  IsoDate,
  PublicProgramAppropriationRecord,
  PublicProgramCapacityOutturnRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  World,
} from "./types";

/** Saved lineage for one capacity outturn, resolved by the canonical writer. */
export interface PublicProgramCapacityOutturnContext {
  readonly outturn: PublicProgramCapacityOutturnRecord;
  readonly eventDate: IsoDate;
  readonly commitment: PublicProgramCommitmentRecord;
  readonly installment: PublicProgramInstallmentRecord;
  readonly appropriation: PublicProgramAppropriationRecord;
  /** Null means the appropriation has no recorded enacted-measure link. */
  readonly sourceMeasureId: EntityId | null;
}

export type PublicProgramCapacityOutturnReceiver = (
  world: World,
  context: PublicProgramCapacityOutturnContext,
) => World;

export interface PublicProgramCapacityOutturnReceiverRegistration {
  readonly key: string;
  readonly receive: PublicProgramCapacityOutturnReceiver;
}

/** Apply registered pure reducers in stable manifest order after a new write. */
export function applyPublicProgramCapacityOutturnReceivers(
  before: World,
  after: World,
  commitment: PublicProgramCommitmentRecord,
  installment: PublicProgramInstallmentRecord,
  registrations: readonly PublicProgramCapacityOutturnReceiverRegistration[],
): World {
  const records = publicProgramRecords(after);
  const outturn = records.find(
    (record): record is PublicProgramCapacityOutturnRecord =>
      record.kind === "capacity-outturn" &&
      record.commitmentId === commitment.id &&
      record.installmentId === installment.id &&
      !publicProgramRecords(before).some((prior) => prior.id === record.id),
  );
  if (!outturn) return after;

  const event = eventById(after, outturn.eventId);
  const savedCommitment = records.find(
    (record): record is PublicProgramCommitmentRecord =>
      record.kind === "commitment" && record.id === outturn.commitmentId,
  );
  const savedInstallment = records.find(
    (record): record is PublicProgramInstallmentRecord =>
      record.kind === "installment" && record.id === outturn.installmentId,
  );
  const appropriation = records.find(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" &&
      record.id === savedCommitment?.appropriationId,
  );
  if (!event || !savedCommitment || !savedInstallment || !appropriation)
    throw new Error(
      "A public program capacity outturn needs its saved event and appropriation lineage before receivers run.",
    );

  const context: PublicProgramCapacityOutturnContext = Object.freeze({
    outturn,
    eventDate: event.occurredAt,
    commitment: savedCommitment,
    installment: savedInstallment,
    appropriation,
    sourceMeasureId: appropriation.sourceMeasureId ?? null,
  });
  const keys = new Set<string>();
  let next = after;
  for (const registration of registrations) {
    if (!registration.key.trim() || keys.has(registration.key))
      throw new Error(
        `Invalid or duplicate public program capacity outturn receiver: ${registration.key}`,
      );
    keys.add(registration.key);
    next = registration.receive(next, context);
  }
  return next;
}
