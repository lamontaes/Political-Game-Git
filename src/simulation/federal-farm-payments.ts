import { evaluateLawAmount } from "./law-consequence-amount";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { lawEffectStamp, type LawEffectStamp } from "./law-effect-stamp";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  FARM_PAYMENT_QUESTION,
  SERVICE_DELIVERED_LAW_ROWS,
} from "./law-consequences/service-delivered-data";
import type {
  World,
  IsoDate,
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  MoneyAmount,
} from "./types";

export { FARM_PAYMENT_QUESTION } from "./law-consequences/service-delivered-data";

function farmAuthority(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
) {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === appropriation.sourceMeasureId,
  );
  return (
    appropriation.programKey.split(":")[0] === "farm" &&
    measure?.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id &&
    measure.propositionAnswers?.some(
      (answer) =>
        answer.answer === "yes" &&
        world.policyCatalog.propositions[answer.propositionId]?.stableKey ===
          FARM_PAYMENT_QUESTION,
    )
  );
}

/** Adopted annual dollars per recipient; missing numeric text remains unsupported. */
export function recordedFarmCapAt(world: World, onDate: IsoDate) {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === FARM_PAYMENT_QUESTION,
  );
  const law = proposition
    ? lawInForce(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        proposition.id,
        onDate,
      )
    : null;
  return {
    law,
    term:
      law?.answer === "yes"
        ? readFinalEnactedLawTerm(world, law, {
            questionKey: FARM_PAYMENT_QUESTION,
            termKey: "cap",
            unit: "dollars/year",
          })
        : null,
  };
}

/** Only saved farm-authorized commitments supply a base; this creates no recipients or grants. */
export function farmProgramPaymentAt(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  commitment: PublicProgramCommitmentRecord,
  planned: MoneyAmount,
) {
  const unchanged = {
    amount: planned,
    reason: null as string | null,
    lawEffectStamps: [] as LawEffectStamp[],
  };
  if (!farmAuthority(world, appropriation)) return unchanged;
  const read = recordedFarmCapAt(world, world.currentDate);
  const { law, term } = read;
  if (!law || law.answer !== "yes") return unchanged;
  if (
    !term ||
    planned.currency !== "USD" ||
    !Number.isSafeInteger(term.value * 100) ||
    term.value < 0
  )
    return {
      ...unchanged,
      reason: "The farm payment has no supported adopted annual recipient cap.",
    };
  const records = world.history.publicProgramRecords ?? [];
  const eligibleCommitments = new Set(
    records
      .filter((record) => {
        if (
          record.kind !== "commitment" ||
          record.recipientOrganizationId !== commitment.recipientOrganizationId
        )
          return false;
        const authority = records.find(
          (row) =>
            row.kind === "appropriation" && row.id === record.appropriationId,
        );
        return (
          authority?.kind === "appropriation" && farmAuthority(world, authority)
        );
      })
      .map((row) => row.id),
  );
  const flows = new Map(
    world.history.resourceFlows.map((row) => [row.id, row]),
  );
  const paid = world.history.resourceTransferOutcomes.filter((outcome) => {
    const flow = flows.get(outcome.resourceFlowId);
    return (
      outcome.occurredAt <= world.currentDate &&
      outcome.occurredAt.slice(0, 4) === world.currentDate.slice(0, 4) &&
      outcome.transferredAmount.currency === planned.currency &&
      outcome.transferredAmount.minorUnits > 0 &&
      (outcome.status === "completed" || outcome.status === "partial") &&
      flow?.basisReference.kind === "public-program" &&
      eligibleCommitments.has(flow.basisReference.commitmentId)
    );
  });
  const remaining = Math.max(
    0,
    term.value * 100 -
      paid.reduce((sum, row) => sum + row.transferredAmount.minorUnits, 0),
  );
  const row = SERVICE_DELIVERED_LAW_ROWS[FARM_PAYMENT_QUESTION]?.[0];
  if (!row?.amount) throw new Error("Missing farm payment consequence row.");
  const amount = evaluateLawAmount(row.amount, {
    term: {},
    capacity: {},
    exposure: {},
    record: {
      "farm.committed-payment": { value: planned.minorUnits, unit: "minor" },
      "farm.remaining-annual-cap": { value: remaining, unit: "minor" },
    },
  });
  const stamp = lawEffectStamp(law, {
    effectKind: "service-delivered",
    questionKey: FARM_PAYMENT_QUESTION,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    appliedAt: world.currentDate,
    sourceRecordIds: [
      ...term.sourceRecordIds,
      appropriation.id,
      commitment.id,
      ...paid.map((outcome) => outcome.id),
    ],
  });
  return {
    amount: { ...planned, minorUnits: amount.value },
    reason:
      amount.value === 0
        ? "The adopted annual farm cap is exhausted for this recorded recipient."
        : null,
    lawEffectStamps: stamp ? [stamp] : [],
  };
}
