import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { lawInForce } from "./law-in-force";
import { propositionIdFor } from "../public-budgets/fiscal";
import { STATE_TRANSIT_SERVICE_QUESTION } from "../legislation-transit-families";
import { TRANSIT_METRIC_INPUT } from "../transit-contract-definitions";
import { TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR } from "../legislation-transit-families";
import { publishPublicEvent } from "../public-information";
import { ageOnDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import { personName } from "../people";
import { recordEventKnowledge, recordMemory } from "../records";
import { createExactQuantity } from "../quantity";
import { stateTransitServiceProfileForMeasure } from "../state-transit-service-profile";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  recordWorldMetricState,
  worldMetricStateForPeriodAt,
} from "../world-metrics";
import { recordWorldEvent } from "../world";
import type {
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  World,
} from "../types";

/**
 * The Wave 2 game price is authored contract arithmetic, not a sourced
 * transit cost, observed ridership, travel time, or household access result.
 */
export const TRANSIT_PROGRAM_COST_BASIS = "PLACEHOLDER(wave2)";

function hoursText(minorUnits: number): string {
  const price = TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR;
  const whole = Math.floor(minorUnits / price);
  const rest = minorUnits % price;
  const hours =
    rest === 0
      ? String(whole)
      : `${whole}.${String(rest)
          .padStart(String(price).length - 1, "0")
          .replace(/0+$/, "")}`;
  return `${hours} vehicle-service ${hours === "1" ? "hour" : "hours"}`;
}

/** One posted operating installment produces one counted service outturn. */
export function recordPaidTransitProgramService(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  commitment: PublicProgramCommitmentRecord,
  installment: PublicProgramInstallmentRecord,
): World {
  const plan = commitment.installments[installment.installmentIndex];
  if (
    installment.status !== "posted" ||
    !installment.resourceFlowId ||
    plan?.purpose !== "operating" ||
    plan.amount.minorUnits <= 0 ||
    !appropriation.sourceMeasureId
  )
    return world;
  if (
    commitment.appropriationId !== appropriation.id ||
    installment.commitmentId !== commitment.id
  )
    throw new Error(
      "Transit service requires the saved appropriation payment chain.",
    );
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === appropriation.sourceMeasureId,
  );
  const profile = measure
    ? stateTransitServiceProfileForMeasure(world, measure)
    : null;
  const lineage = (world.history.legislativeDraftLineages ?? []).find(
    (row) => row.measureId === measure?.id,
  );
  if (
    !measure ||
    !profile ||
    lineage?.variantKey !== "transit-staged-service-v2" ||
    profile.programKey !== appropriation.programKey
  )
    return world;
  const outcome = world.history.resourceTransferOutcomes.find(
    (row) =>
      row.resourceFlowId === installment.resourceFlowId &&
      row.status === "completed",
  );
  if (
    !outcome ||
    outcome.transferredAmount.minorUnits !== plan.amount.minorUnits ||
    outcome.transferredAmount.currency !== plan.amount.currency
  )
    throw new Error("Transit service hours require the exact posted payment.");
  const propositionId = propositionIdFor(world, STATE_TRANSIT_SERVICE_QUESTION);
  const governingLaw = propositionId
    ? lawInForce(
        world,
        appropriation.jurisdictionId,
        propositionId,
        installment.recordedAt,
      )
    : null;
  // Never attribute this payment to a different measure answering the same question.
  const ownLaw = governingLaw?.measureId === measure.id ? governingLaw : null;
  const sources = [
    measure.id,
    appropriation.id,
    commitment.id,
    installment.id,
    installment.resourceFlowId,
    outcome.id,
  ];
  const spendingStamp = lawEffectStamp(ownLaw, {
    effectKind: "state-spending",
    questionKey: STATE_TRANSIT_SERVICE_QUESTION,
    jurisdictionId: appropriation.jurisdictionId,
    appliedAt: installment.recordedAt,
    sourceRecordIds: sources,
  });
  const key = `${installment.stableKey}:paid-service-hours`;
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  let next = world;
  if (spendingStamp) {
    const budgetMetric = Object.values(world.metricCatalog.definitions).find(
      (definition) => definition.stableKey === "government.outlays",
    );
    const budget = budgetMetric
      ? worldMetricStateForPeriodAt(
          world,
          budgetMetric.id,
          { jurisdictionId: appropriation.jurisdictionId, segmentKey: null },
          {
            kind: "interval",
            startsAt: installment.recordedAt,
            endsAt: installment.recordedAt,
          },
          {
            asOfDate: world.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          },
        )
      : null;
    if (
      !budget ||
      budget.value.kind !== "money" ||
      budget.value.money.currency !== plan.amount.currency ||
      budget.value.money.minorUnits < plan.amount.minorUnits ||
      budget.provenance.kind !== "simulated" ||
      !budget.provenance.sourceEntityIds.includes(installment.eventId)
    )
      throw new Error(
        "A transit cost stamp requires its actual government outlay.",
      );
    const priorStamps =
      (budget as typeof budget & LawEffectStampedRecord).lawEffectStamps ?? [];
    // Append provenance to the already posted budget total; never post the payment again.
    next = recordWorldMetricState(next, {
      stableKey: `${key}:budget-cost`,
      metricId: budget.metricId,
      scope: budget.scope,
      referencePeriod: budget.referencePeriod,
      value: budget.value,
      recordedAt: world.currentDate,
      provenance: budget.provenance,
      supersedesStateId: budget.id,
      ...{
        lawEffectStamps: [
          ...priorStamps,
          {
            ...spendingStamp,
            sourceRecordIds: [...sources, installment.eventId, budget.id],
          },
        ],
      },
    });
  }
  const eligibleResidents = Object.values(world.people).filter((person) => {
    const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
    return (
      person.id !==
        (world.control.kind === "person" ? world.control.personId : null) &&
      person.birthDate <= installment.recordedAt &&
      ageOnDate(person.birthDate, installment.recordedAt) >= 18 &&
      !world.history.personDeaths.some(
        (death) =>
          death.personId === person.id &&
          death.diedAt <= installment.recordedAt,
      ) &&
      place?.scope === "locality" &&
      place.stateJurisdictionKey === profile.jurisdictionKey &&
      world.jurisdictions[person.homeJurisdictionId] !== undefined
    );
  });
  const modeledAreaId =
    [
      ...new Set(eligibleResidents.map((person) => person.homeJurisdictionId)),
    ].sort(
      (left, right) =>
        stableHash(`${installment.id}:${left}`).localeCompare(
          stableHash(`${installment.id}:${right}`),
        ) || left.localeCompare(right),
    )[0] ?? null;
  const area = modeledAreaId ? lifePlaceByJurisdictionId(modeledAreaId) : null;
  if (modeledAreaId && area) {
    next = recordWorldEvent(next, {
      stableKey: `${key}:modeled-area`,
      type: "transit.modeled-service-area",
      occurredAt: installment.recordedAt,
      recordedAt: installment.recordedAt,
      jurisdictionId: modeledAreaId,
      involvedEntityIds: [
        measure!.id,
        installment.resourceFlowId,
        modeledAreaId,
      ],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["transit.service", `program:${profile.programKey}`],
      summary: `For this paid period, ${area.displayName} is the modeled local service area for ${measure!.designation}. This assignment does not identify a researched route or classify the locality as rural.`,
      context: {
        location: {
          jurisdictionId: modeledAreaId,
          label: area.displayName,
          setting: null,
        },
        socialContext: "Modeled service-area allocation",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  const rider = modeledAreaId
    ? (eligibleResidents
        .filter((person) => person.homeJurisdictionId === modeledAreaId)
        .sort(
          (left, right) =>
            stableHash(`${installment.id}:${left.id}`).localeCompare(
              stableHash(`${installment.id}:${right.id}`),
            ) || left.id.localeCompare(right.id),
        )[0] ?? null)
    : null;
  next = recordWorldEvent(next, {
    stableKey: key,
    type: "transit.program-paid-service-hours",
    ...(spendingStamp ? { lawEffectStamps: [spendingStamp] } : {}),
    occurredAt: installment.recordedAt,
    recordedAt: installment.recordedAt,
    jurisdictionId: modeledAreaId ?? appropriation.jurisdictionId,
    involvedEntityIds: [
      measure!.id,
      installment.resourceFlowId,
      ...(modeledAreaId ? [modeledAreaId] : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["transit.service", `program:${profile.programKey}`],
    summary: `The state paid ${plan.amount.minorUnits / 100} USD for ${hoursText(plan.amount.minorUnits)} of modeled added rural-transit service under ${measure!.designation}. This paid service record does not establish ridership, travel time, access, or who learned of the payment.`,
    context: {
      location: null,
      socialContext: "Paid state rural-transit service",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const serviceEventId = next.history.events.at(-1)!.id;
  const metric = createWorldMetricDefinition(TRANSIT_METRIC_INPUT);
  if (!next.metricCatalog.definitions[metric.id])
    next = {
      ...next,
      metricCatalog: createWorldMetricCatalog({
        definitions: [
          ...next.metricCatalog.definitionOrder.map(
            (id) => next.metricCatalog.definitions[id]!,
          ),
          metric,
        ],
      }),
    };
  const serviceStamp = lawEffectStamp(ownLaw, {
    effectKind: "transit.paid-service-hours",
    questionKey: STATE_TRANSIT_SERVICE_QUESTION,
    jurisdictionId: modeledAreaId ?? appropriation.jurisdictionId,
    appliedAt: installment.recordedAt,
    sourceRecordIds: [...sources, serviceEventId],
  });
  next = recordWorldMetricState(next, {
    ...(spendingStamp || serviceStamp
      ? {
          lawEffectStamps: [spendingStamp, serviceStamp].filter(
            (stamp) => stamp !== null,
          ),
        }
      : {}),
    stableKey: `${key}:metric`,
    metricId: metric.id,
    scope: {
      jurisdictionId: modeledAreaId ?? appropriation.jurisdictionId,
      segmentKey: `public-program.installment-${stableHash(installment.id)}`,
    },
    referencePeriod: { kind: "point", at: installment.recordedAt },
    value: {
      kind: "quantity",
      quantity: createExactQuantity(
        plan.amount.minorUnits,
        TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR,
        "duration:vehicle-service-hour",
      ),
    },
    recordedAt: installment.recordedAt,
    provenance: { kind: "simulated", sourceEntityIds: [serviceEventId] },
    supersedesStateId: null,
  });
  next = publishPublicEvent(next, {
    stableKey: `${key}:publication`,
    sourceEventId: serviceEventId,
  });
  if (!rider || !area) return next;
  const riderName = personName(rider);
  const rideSummary = `${riderName} took a modeled ride on the added service in ${area.displayName} and welcomed the trip. This event does not establish household vehicle access or travel-time change.`;
  next = recordWorldEvent(next, {
    stableKey: `${key}:rider-experience`,
    type: "transit.modeled-rider-experience",
    occurredAt: installment.recordedAt,
    recordedAt: installment.recordedAt,
    jurisdictionId: rider.homeJurisdictionId,
    involvedEntityIds: [
      rider.id,
      rider.homeJurisdictionId,
      measure!.id,
      installment.resourceFlowId,
    ],
    participants: [
      {
        personId: rider.id,
        role: "presence:transit-rider",
        detail: "Took one modeled ride within the paid service area.",
      },
      {
        personId: rider.id,
        role: "impact:transit-rider",
        detail: "Welcomed that ride.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.service", `program:${profile.programKey}`],
    summary: rideSummary,
    context: {
      location: {
        jurisdictionId: rider.homeJurisdictionId,
        label: area.displayName,
        setting: "modeled transit ride",
      },
      socialContext: "One ride during the paid service period",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: "Welcomed this trip without asserting who funded it.",
    },
  });
  const rideEventId = next.history.events.at(-1)!.id;
  next = recordEventKnowledge(next, {
    stableKey: `${key}:rider-direct-knowledge`,
    personId: rider.id,
    eventId: rideEventId,
    learnedAt: installment.recordedAt,
    believedSummary: `I rode the added service in ${area.displayName} and welcomed the trip.`,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordMemory(next, {
    stableKey: `${key}:rider-memory`,
    personId: rider.id,
    eventId: rideEventId,
    formedAt: installment.recordedAt,
    rememberedSummary: `I rode the added service in ${area.displayName} and welcomed the trip.`,
    interpretation:
      "The paid service gave me one trip I valued. I do not yet know who funded it.",
    strength: "moderate",
    relevanceTags: ["transit.service", "experienced-service"],
    supersedesMemoryId: null,
  });
  const governor = world.people[commitment.decidedByPersonId];
  const sponsor = measure!.sponsorPersonId
    ? world.people[measure!.sponsorPersonId]
    : null;
  if (!governor || !sponsor) return next;
  next = recordWorldEvent(next, {
    stableKey: `${key}:decision-report`,
    type: "transit.government-decision-reported",
    occurredAt: installment.recordedAt,
    recordedAt: installment.recordedAt,
    jurisdictionId: appropriation.jurisdictionId,
    involvedEntityIds: [
      governor.id,
      sponsor.id,
      measure!.id,
      installment.resourceFlowId,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["transit.service", `program:${profile.programKey}`],
    summary: `${personName(sponsor)} sponsored ${measure!.designation}; Governor ${personName(governor)} committed its saved appropriation to this paid service period. The payment funded ${hoursText(plan.amount.minorUnits)} of modeled added service.`,
    context: {
      location: null,
      socialContext:
        "Public record of sponsorship, executive decision, and payment",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const reportEventId = next.history.events.at(-1)!.id;
  next = publishPublicEvent(next, {
    stableKey: `${key}:decision-publication`,
    sourceEventId: reportEventId,
  });
  const publication = next.history.publications!.at(-1)!;
  next = recordWorldEvent(next, {
    stableKey: `${key}:report-encounter`,
    type: "transit.resident-read-decision-report",
    occurredAt: installment.recordedAt,
    recordedAt: installment.recordedAt,
    jurisdictionId: rider.homeJurisdictionId,
    involvedEntityIds: [rider.id, rider.homeJurisdictionId, publication.id],
    participants: [
      {
        personId: rider.id,
        role: "agency:read-report",
        detail: "Read the saved public report after the ride.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.service", `program:${profile.programKey}`],
    summary: `${riderName} read a public report naming ${personName(sponsor)} as the bill's sponsor and Governor ${personName(governor)} as the executive who committed its appropriation, after taking the modeled ride.`,
    context: {
      location: {
        jurisdictionId: rider.homeJurisdictionId,
        label: area.displayName,
        setting: "reading a public report",
      },
      socialContext: "Encountered a published funding report",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction:
        "Welcomed the recorded funding decision after a valued trip.",
    },
  });
  const encounterId = next.history.events.at(-1)!.id;
  next = recordEventKnowledge(next, {
    stableKey: `${key}:report-knowledge`,
    personId: rider.id,
    eventId: reportEventId,
    learnedAt: installment.recordedAt,
    believedSummary: next.history.events.find(
      (event) => event.id === reportEventId,
    )!.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "public-record",
      reference: `publication:${publication.id};encounter:${encounterId}`,
    },
  });
  return recordMemory(next, {
    stableKey: `${key}:reasoned-view`,
    personId: rider.id,
    eventId: encounterId,
    formedAt: installment.recordedAt,
    rememberedSummary: `I read that ${personName(sponsor)} sponsored the bill and Governor ${personName(governor)} committed the funding after I rode the added service.`,
    interpretation: `I welcomed the trip, so I appreciate this recorded funding decision by Governor ${personName(governor)}. This is a private reaction, not a vote prediction.`,
    strength: "moderate",
    relevanceTags: ["transit.service", "public-funding-view"],
    supersedesMemoryId: null,
  });
}
