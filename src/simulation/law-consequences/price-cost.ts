import { rentConstructionCovered } from "./rent-construction-coverage";
import {
  RENT_COVERAGE_PREDICATE,
  RENT_CAP_TERM,
  RENT_STABILIZATION_ROW,
} from "./rent-stabilization-row";
import { townLeases, rentPriceLevel } from "../living-world/town-rent";
import { addDays } from "../dates";
import { evaluateLawAmount } from "../law-consequence-amount";
import type {
  LawAmountExpression,
  LawAmountUnit,
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { lawInForce } from "../governing/law-in-force";
import {
  readFinalEnactedLawCategories,
  readFinalEnactedLawTerm,
} from "../governing/automatic-legislation";
import { recordById, recordByStableKey } from "../history-index";
import { lawEffectStamp } from "../law-effect-stamp";
import { resourceFlowTermsAt } from "../resource-queries";
import { organizationProfileAt } from "../life-queries";
import {
  recordedStudyPeriodTuitionPrice,
  recordedTuitionFreezePrice,
} from "../public-budgets/tuition-freeze";
import {
  TUITION_FREEZE_ROW,
  TUITION_COVERAGE_PREDICATE,
} from "./tuition-freeze-row";
import { money, recordResourceFlowTerms } from "../resources";
import type { World } from "../types";

const SELECTOR = "person-price-flows";
const ACTION = "set-resource-flow-price";
const BASIS = "price-flow-basis";

/** The kind requests only the typed terms its amount expression actually reads. */
function requiredTermUnits(
  expression: LawAmountExpression,
): ReadonlyMap<string, LawAmountUnit> {
  const units = new Map<string, LawAmountUnit>();
  function visit(node: LawAmountExpression): void {
    switch (node.op) {
      case "term": {
        const prior = units.get(node.key);
        if (prior && prior !== node.unit)
          throw new Error(
            `Price-cost term '${node.key}' has conflicting units`,
          );
        units.set(node.key, node.unit);
        return;
      }
      case "sum":
      case "minimum":
      case "maximum":
        node.operands.forEach(visit);
        return;
      case "difference":
      case "product":
      case "ratio":
        visit(node.left);
        visit(node.right);
        return;
      default:
        return;
    }
  }
  visit(expression);
  return units;
}

/** Resolves one actual priced flow activity, not every flow in the world. */
export function resolvePriceCostConsequences(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== "price-cost" ||
    row.who.selector !== SELECTOR ||
    row.what !== ACTION
  )
    throw new Error("Missing price-cost selector/action capability");
  if (row.decision || !row.amount)
    throw new Error("Price-cost requires an amount, not a legal decision");
  if (row.lag.days !== 0)
    throw new Error("Missing price-cost delayed-activity capability");
  if (context.onDate > world.currentDate)
    throw new Error("Price-cost cannot apply to a future activity date");
  if (row.when !== context.activity) return [];
  const activity = recordById(
    world.history.resourceFlowTerms,
    context.activityId,
  );
  const flow = recordById(
    world.history.resourceFlows,
    activity?.resourceFlowId ?? context.activityId,
  );
  if (!flow) {
    // Payment dispatch also carries statutory tax outcomes, which are not priced flows.
    if (context.activity === "payment" && !activity) return [];
    throw new Error("Missing price-cost resource-flow activity");
  }
  const conditions = [...row.who.predicates, ...row.conditions];
  if (
    conditions.some(
      (condition) =>
        condition.capability === BASIS &&
        typeof condition.parameters.basisKind === "string" &&
        condition.parameters.basisKind !== flow.basisKind,
    )
  )
    return [];
  if (flow.source.kind !== "person" || !world.people[flow.source.personId])
    throw new Error("Missing price-cost person payer capability");
  if (!context.subjectIds.includes(flow.source.personId)) return [];
  if (flow.basisKind.startsWith("compensation:"))
    throw new Error("Compensation belongs to the pay handler");
  let tuitionCap: {
    amountMinor: number;
    sourceRecordIds: readonly (typeof flow.id)[];
  } | null = null;
  let jurisdictionId = flow.jurisdictionId;
  if (row.id === TUITION_FREEZE_ROW.id) {
    if (
      flow.recipient.kind !== "organization" ||
      flow.basisKind !== "obligation:tuition" ||
      world.history.resourceTransferOutcomes.some(
        (outcome) =>
          outcome.resourceFlowId === flow.id && outcome.status === "completed",
      )
    )
      return [];
    const schoolId = flow.recipient.organizationId;
    const payerId = flow.source.personId;
    const enrollment = world.history.educationEnrollments.find(
      (candidate) =>
        candidate.personId === payerId &&
        candidate.organizationId === schoolId &&
        flow.stableKey.startsWith(`life-paths2.study-period:${candidate.id}:`),
    );
    const period = Number(flow.stableKey.split(":").at(-1));
    if (!enrollment || !Number.isSafeInteger(period) || period <= 0) return [];
    const at = { ...world, currentDate: context.onDate };
    const price = recordedStudyPeriodTuitionPrice(at, enrollment.id, period);
    const legacy = price ? null : recordedTuitionFreezePrice(at, enrollment.id);
    tuitionCap =
      price?.cap !== null && price?.cap !== undefined
        ? { amountMinor: price.cap, sourceRecordIds: price.sourceRecordIds }
        : legacy?.status === "frozen"
          ? {
              amountMinor: legacy.amountMinor,
              sourceRecordIds: legacy.sourceRecordIds,
            }
          : null;
    if (!tuitionCap) return [];
    const owner = organizationProfileAt(at, schoolId)?.publicGovernmentIdentity;
    jurisdictionId ??=
      owner?.kind === "jurisdiction" ? owner.jurisdictionId : null;
  }
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId])
    throw new Error("Missing price-cost application jurisdiction");
  if (!conditions.some((condition) => condition.capability === BASIS))
    throw new Error(
      "Price-cost requires an explicit flow-basis coverage predicate",
    );
  for (const condition of conditions) {
    if (
      condition.capability === RENT_COVERAGE_PREDICATE ||
      (condition.capability === TUITION_COVERAGE_PREDICATE &&
        row.id === TUITION_FREEZE_ROW.id)
    )
      continue;
    if (condition.capability !== BASIS)
      throw new Error(`Missing price-cost predicate: ${condition.capability}`);
    if (
      Object.keys(condition.parameters).length !== 1 ||
      typeof condition.parameters.basisKind !== "string"
    )
      throw new Error(
        "Price-cost flow-basis predicate requires only basisKind",
      );
    if (condition.parameters.basisKind !== flow.basisKind) return [];
  }
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((candidate) =>
    candidate.consequences?.some((entry) => entry.id === row.id),
  );
  if (!proposition)
    throw new Error(`Missing price-cost catalog row: ${row.id}`);
  if (context.questionKey && context.questionKey !== proposition.stableKey)
    return [];
  const registered = proposition.consequences!.find(
    (entry) => entry.id === row.id,
  )!;
  if (JSON.stringify(registered) !== JSON.stringify(row))
    throw new Error("Price-cost row differs from its canonical catalog input");
  const law = lawInForce(world, jurisdictionId, proposition.id, context.onDate);
  if (!law || law.answer !== "yes") return [];
  if (context.governingLawId && context.governingLawId !== law.measureId)
    return [];
  let coverageSourceIds: (typeof flow.id)[] = [
    ...(tuitionCap?.sourceRecordIds ?? []),
  ];
  if (
    conditions.some(
      (condition) => condition.capability === RENT_COVERAGE_PREDICATE,
    )
  ) {
    const categories = readFinalEnactedLawCategories(world, law, {
      questionKey: proposition.stableKey,
      termKey: "coverage",
    });
    const lease = townLeases(world, context.onDate).find(
      (candidate) => candidate.flow.id === flow.id && !candidate.ended,
    );
    const dwelling = lease
      ? recordById(world.history.dwellings, lease.dwellingId)
      : null;
    const cap = readFinalEnactedLawTerm(world, law, {
      questionKey: proposition.stableKey,
      termKey: RENT_CAP_TERM,
      unit: "ratio",
    });
    if (
      (!categories && law.origin !== "in-force-at-start") ||
      !lease ||
      !dwelling ||
      !cap ||
      !Number.isFinite(cap.value) ||
      cap.value < 0 ||
      (categories
        ? !categories.values.includes(
            `${lease.regime}:${dwelling.classification}`,
          )
        : lease.regime !== "market")
    )
      return [];
    if (law.origin === "in-force-at-start") {
      const window = readFinalEnactedLawTerm(world, law, {
        questionKey: proposition.stableKey,
        termKey: "new-construction-exemption-years",
        unit: "years",
      });
      if (
        !rentConstructionCovered(
          world,
          dwelling,
          context.onDate,
          window?.value ?? null,
        )
      )
        return [];
      coverageSourceIds.push(...(window?.sourceRecordIds ?? []));
    }
    coverageSourceIds = [
      ...coverageSourceIds,
      ...(categories?.sourceRecordIds ?? [law.measureId]),
      lease.tenureId,
      dwelling.id,
    ];
  }

  const terms =
    activity ??
    resourceFlowTermsAt(world, flow.id, {
      asOfDate: context.onDate,
      historySequenceExclusive: world.history.nextSequence,
    });
  if (
    row.when === "renewal" &&
    activity &&
    activity.effectiveAt !== context.onDate
  )
    throw new Error(
      "Price-cost renewal activity must be the current saved terms record",
    );
  const prior = terms?.supersedesTermsId
    ? recordById(world.history.resourceFlowTerms, terms.supersedesTermsId)
    : undefined;
  if (!terms || terms.status !== "active" || flow.startsAt > context.onDate)
    return [];
  const requestedTerms = requiredTermUnits(row.amount);
  const legalTerms = [];
  for (const [termKey, unit] of requestedTerms) {
    let term = readFinalEnactedLawTerm(world, law, {
      questionKey: proposition.stableKey,
      termKey,
      unit,
    });
    if (!term && row.id === RENT_STABILIZATION_ROW.id) return [];
    if (!term)
      throw new Error(`Missing law amount capability: term:${termKey}`);
    if (term.measureId !== law.measureId || term.unit !== unit)
      throw new Error(
        `Price-cost term '${termKey}' differs from its governing law`,
      );
    if (
      row.id === RENT_STABILIZATION_ROW.id &&
      termKey === RENT_CAP_TERM &&
      law.origin === "in-force-at-start"
    ) {
      const offset = readFinalEnactedLawTerm(world, law, {
        questionKey: proposition.stableKey,
        termKey: "cap-inflation-offset",
        unit: "ratio",
      });
      if (!offset) return [];
      const inflation =
        rentPriceLevel(world, flow.jurisdictionId!, context.onDate) /
          rentPriceLevel(
            world,
            flow.jurisdictionId!,
            addDays(context.onDate, -365),
          ) -
        1;
      term = {
        ...term,
        value: Math.min(term.value, offset.value + inflation),
        sourceRecordIds: [...term.sourceRecordIds, ...offset.sourceRecordIds],
      };
    }
    legalTerms.push({ termKey, term });
  }
  // No catalog parameter declaration is mistaken for an operative numeric value.
  // Unsupported term, capacity or exposure keys fail in the shared evaluator.
  const amount = evaluateLawAmount(row.amount, {
    term: Object.fromEntries(
      legalTerms.map(({ termKey, term }) => [
        termKey,
        { value: term.value, unit: term.unit },
      ]),
    ),
    record: {
      ...(prior
        ? {
            "prior-flow-minor": {
              value: prior.amount.minorUnits,
              unit: "minor" as const,
            },
          }
        : {}),
      "current-flow-minor": { value: terms.amount.minorUnits, unit: "minor" },
      ...(tuitionCap
        ? {
            "operative-tuition-minor": {
              value: tuitionCap.amountMinor,
              unit: "minor" as const,
            },
          }
        : {}),
    },
    capacity: {},
    exposure: {},
  });
  // Whole cents must stay at or below the adopted ceiling.
  if (row.id === RENT_STABILIZATION_ROW.id && amount.unit === "minor")
    amount.value = Math.floor(amount.value);
  if (
    amount.unit !== "minor" ||
    !Number.isSafeInteger(amount.value) ||
    amount.value < 0
  )
    throw new Error(
      "Price-cost requires nonnegative whole currency minor units",
    );
  return [
    {
      row,
      law,
      questionKey: proposition.stableKey,
      jurisdictionId,
      subject: { kind: "person", id: flow.source.personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds: [
        flow.id,
        terms.id,
        flow.source.personId,
        ...coverageSourceIds,
        ...(prior ? [prior.id] : []),
        ...new Set(legalTerms.flatMap(({ term }) => term.sourceRecordIds)),
      ],
      value: {
        type: "amount",
        value: amount.value,
        unit: "minor",
        currency: terms.amount.currency,
      },
    },
  ];
}

/** Reuses the canonical terms writer; price changes never become cash payments. */
export function applyPriceCostConsequence(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  const current = resolvePriceCostConsequences(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
  })[0];
  if (!current) return world; // Repeal ends this prospective restriction.
  if (
    resolved.subject.kind !== "person" ||
    current.questionKey !== resolved.questionKey ||
    current.jurisdictionId !== resolved.jurisdictionId ||
    JSON.stringify(current.law) !== JSON.stringify(resolved.law)
  )
    throw new Error(
      "Price-cost resolved law or subject does not match actual activity",
    );
  if (
    resolved.value.type !== "amount" ||
    current.value.type !== "amount" ||
    resolved.value.unit !== "minor" ||
    resolved.value.currency !== current.value.currency
  )
    throw new Error(
      "Price-cost resolved currency/unit does not match actual flow",
    );
  const stableKey = `law-price-cost:${JSON.stringify([
    resolved.row.id,
    resolved.law.measureId,
    resolved.law.operativeAt,
    resolved.subject.id,
    resolved.activityId,
    resolved.effectiveAt,
  ])}`;
  const existing = recordByStableKey(
    world.history.resourceFlowTerms,
    stableKey,
  );
  if (existing) {
    if (existing.amount.minorUnits !== resolved.value.value)
      throw new Error(
        "Price-cost activity already applied with a different amount",
      );
    return world;
  }
  if (resolved.value.value !== current.value.value)
    throw new Error("Price-cost resolved amount is stale or unverified");
  const activity = recordById(
    world.history.resourceFlowTerms,
    current.activityId,
  );
  const flowId = activity?.resourceFlowId ?? current.activityId;
  const previous = resourceFlowTermsAt(world, flowId)!;
  const pricedTerms =
    activity ??
    resourceFlowTermsAt(world, flowId, {
      asOfDate: current.effectiveAt,
      historySequenceExclusive: world.history.nextSequence,
    });
  if (previous.id !== pricedTerms?.id)
    throw new Error(
      "Price-cost activity no longer names the latest flow terms",
    );
  if (previous.amount.minorUnits === resolved.value.value) return world;
  const stamp = lawEffectStamp(current.law, {
    effectKind: "price-cost",
    questionKey: current.questionKey,
    jurisdictionId: current.jurisdictionId,
    appliedAt: current.effectiveAt,
    sourceRecordIds: current.sourceRecordIds,
  });
  if (!stamp)
    throw new Error("Price-cost requires an operative canonical law stamp");
  return recordResourceFlowTerms(world, {
    stableKey,
    resourceFlowId: flowId,
    effectiveAt: current.effectiveAt,
    status: "active",
    amount: money(resolved.value.value, previous.amount.currency),
    cadenceKind: previous.cadenceKind,
    reason: `Price terms under ${current.law.measureId}.`,
    provenance: {
      kind: "authored",
      note: `Applied law consequence ${current.row.id} to the recorded price activity.`,
    },
    supersedesTermsId: previous.id,
    lawEffectStamps: [stamp],
  });
}

/** Coordinator appends this export to the sole shared registry. */
export const TEAM_4_PRICE_COST_REGISTRATION: LawConsequenceKindRegistration = {
  kind: "price-cost",
  owner: "Team4",
  selectors: [SELECTOR],
  actions: [ACTION],
  predicates: [BASIS, RENT_COVERAGE_PREDICATE, TUITION_COVERAGE_PREDICATE],
  units: ["minor"],
  resolve: resolvePriceCostConsequences,
  apply: applyPriceCostConsequence,
};
