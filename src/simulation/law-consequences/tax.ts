import { evaluateLawAmount } from "../law-consequence-amount";
import { lawInForce } from "../governing/law-in-force";
import { recordById } from "../history-index";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { assessPaycheckTaxes, residenceStateKey } from "../statutory-tax";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { World } from "../types";

const SELECTOR = "tax:recorded-wage-recipient";
const ACTION = "tax:assess-recorded-paycheck";

function checkRow(row: LawConsequenceRow): void {
  if (
    row.kind !== "tax" ||
    row.who.selector !== SELECTOR ||
    row.what !== ACTION ||
    !row.amount ||
    row.decision ||
    !["assessment", "payroll"].includes(row.when) ||
    row.lag.days !== 0 ||
    row.who.predicates.length ||
    row.conditions.length ||
    row.onRepeal !== "recompute-prospective"
  )
    throw new Error("Unsupported tax consequence binding.");
}

/**
 * First admitted tax activity: an actual recorded wage transfer. Reuse the
 * canonical assessment/withholding writer without inventing a second ledger.
 * Its immutable preview supplies the actual assessed amount; unsupported
 * authored amounts fail before returning any changed world.
 */
function prepare(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
) {
  checkRow(row);
  if (context.activity !== row.when || context.onDate !== world.currentDate)
    throw new Error("Tax activity must match the current assessment context.");
  const outcome = recordById(
    world.history.resourceTransferOutcomes,
    context.activityId,
  );
  const flow =
    outcome && recordById(world.history.resourceFlows, outcome.resourceFlowId);
  if (
    !outcome ||
    !flow ||
    outcome.occurredAt !== context.onDate ||
    outcome.transferredAmount.currency !== "USD" ||
    outcome.transferredAmount.minorUnits <= 0 ||
    flow.recipient.kind !== "person" ||
    flow.basisReference.kind !== "work"
  )
    throw new Error("Tax selector requires an actual USD wage transfer.");
  const personId = flow.recipient.personId;
  if (!context.subjectIds.includes(personId)) return null;
  const owners = Object.values(world.policyCatalog.propositions).filter(
    (question) => question.consequences?.some((item) => item.id === row.id),
  );
  if (owners.length !== 1)
    throw new Error("Tax row requires one canonical catalog question owner.");
  const question = owners[0]!;
  const admitted = question.consequences!.find((item) => item.id === row.id)!;
  if (JSON.stringify(admitted) !== JSON.stringify(row))
    throw new Error("Tax row differs from its catalog declaration.");
  const stateKey = residenceStateKey(world, personId);
  const jurisdiction =
    stateKey && chiefExecutiveJurisdiction(stateKey.slice(3));
  if (!jurisdiction)
    throw new Error("Tax payer state jurisdiction is missing.");
  const law = lawInForce(
    world,
    jurisdiction.id,
    question.id,
    outcome.occurredAt,
  );
  if (!law) throw new Error("Tax question has no resolved operative law.");
  if (context.governingLawId && context.governingLawId !== law.measureId)
    throw new Error("Tax governing law restriction does not match.");
  const preview = assessPaycheckTaxes(world, outcome.id);
  const liabilities = (preview.history.statutoryTaxLiabilities ?? []).filter(
    (liability) =>
      liability.sourceOutcomeId === outcome.id &&
      liability.payer.kind === "person" &&
      liability.payer.personId === personId &&
      liability.lawEffectStamps?.some(
        (stamp) =>
          stamp.questionKey === question.stableKey &&
          stamp.governingLawKey === law.measureId &&
          stamp.jurisdictionId === jurisdiction.id,
      ),
  );
  if (liabilities.length !== 1 || !liabilities[0]!.liability)
    throw new Error(
      "Missing canonical tax assessment for this law and activity.",
    );
  const liability = liabilities[0]!;
  const amount = evaluateLawAmount(row.amount!, {
    term: {},
    record: {
      "tax:assessed-minor": {
        value: liability.liability!.minorUnits,
        unit: "minor",
      },
      "tax:wages-minor": { value: liability.wages.minorUnits, unit: "minor" },
      ...(liability.taxableAmount
        ? {
            "tax:taxable-minor": {
              value: liability.taxableAmount.minorUnits,
              unit: "minor" as const,
            },
          }
        : {}),
    },
    capacity: {},
    exposure: {},
  });
  if (
    amount.unit !== "minor" ||
    amount.value !== liability.liability!.minorUnits
  )
    throw new Error(
      "Evaluated tax amount needs the shared generic assessment writer; it cannot override the canonical assessment.",
    );
  const resolved: ResolvedLawConsequence = {
    row,
    law,
    questionKey: question.stableKey,
    jurisdictionId: jurisdiction.id,
    subject: { kind: "person", id: personId },
    activityId: outcome.id,
    effectiveAt: outcome.occurredAt,
    sourceRecordIds: [
      outcome.id,
      flow.id,
      flow.basisReference.workRelationshipId,
    ],
    value: {
      type: "amount",
      value: amount.value,
      unit: "minor",
      currency: "USD",
    },
  };
  return { preview, resolved };
}

export const applyTaxConsequence: LawConsequenceKindRegistration["apply"] = (
  world,
  resolved,
) => {
  if (resolved.subject.kind !== "person")
    throw new Error("Tax activity requires its actual person payer.");
  const prepared = prepare(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
  });
  if (
    !prepared ||
    JSON.stringify(prepared.resolved) !== JSON.stringify(resolved)
  )
    throw new Error(
      "Resolved tax consequence does not match actual records and law.",
    );
  return prepared.preview;
};

export const TEAM_3_TAX_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "tax",
  owner: "Team3",
  selectors: [SELECTOR],
  actions: [ACTION],
  predicates: [],
  units: ["minor"],
  resolve: (world, row, context) => {
    const prepared = prepare(world, row, context);
    return prepared ? [prepared.resolved] : [];
  },
  apply: applyTaxConsequence,
};
