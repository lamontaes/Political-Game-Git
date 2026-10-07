import programs from "../../../../../data/research/money/public-programs-2026.json" with { type: "json" };
import benefitData from "../../../../../data/research/money/snap-average-monthly-benefit-by-state-fy2023.json" with { type: "json" };
import { ageOnDate } from "../../../dates";
import { createStableId } from "../../../ids";
import {
  annualPovertyLineMinor,
  recordedMonthlyPayByPerson,
} from "../../../household-pay";
import {
  householdLocationAt,
  peopleInHouseholdAt,
  activeWorkRelationshipsAt,
} from "../../../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../../life-places";
import { readEligibilityLawsInForce } from "../../../enacted-eligibility";
import { placeOutcomeRecords } from "../../../outcome-web/place-outcome-store";
import {
  snapParticipationAt,
  recordSnapParticipation,
} from "../../../crisis/snap-participation";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, IsoDate, World } from "../../../types";

export const SNAP_WORK_REQUIREMENT_QUESTION =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
export const SNAP_PARTICIPATION_ROW: LawConsequenceRow = {
  id: "program.snap-receipt:household-participation",
  kind: "snap-participation",
  when: "renewal",
  who: {
    selector: "snap-households-in-state",
    predicates: [
      { capability: "snap-recorded-household-facts", parameters: {} },
    ],
  },
  what: "record-ranked-snap-household-enrollment",
  decision: { op: "record", key: "snap-household-enrolled", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: ["snap-work-requirement-to-participation"] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: [
      "data/research/outcome-web/links.json#snap-work-requirement-to-participation",
      "data/research/outcome-web/place-outcome-bases-2024.json#program.snap-receipt",
      "data/research/money/public-programs-2026.json#federal.snap.grossIncomeTestPctFpl",
      "data/research/money/snap-average-monthly-benefit-by-state-fy2023.json",
    ],
    population:
      "Households with recorded residence, people, income and work facts.",
    scope:
      "A state's actual work-requirement law and its monthly SNAP participation outcome.",
    why: "A recorded household enrollment changes only as far as the law-linked participation outcome changes.",
    uncertainty:
      "Benefit values are ESTIMATED from the published FY2023 state average; participation ranking uses only recorded household facts.",
  },
};

interface Candidate {
  householdId: EntityId;
  size: number;
  incomeToThreshold: number | null;
  monthlyWorkHours: number | null;
  enrolled: boolean;
}

function candidateFor(
  world: World,
  householdId: EntityId,
  stateKey: string,
  onDate: IsoDate,
): Candidate | null {
  const household = world.history.households.find(
    (row) => row.id === householdId,
  );
  if (!household) return null;
  const location = householdLocationAt(world, householdId, {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (
    !location ||
    lifePlaceByJurisdictionId(location.jurisdictionId)?.stateJurisdictionKey !==
      stateKey
  )
    return null;
  const people = peopleInHouseholdAt(world, householdId, {
    asOfDate: onDate,
    historySequenceExclusive: world.history.nextSequence,
  }).filter(
    (id) =>
      world.people[id] && ageOnDate(world.people[id]!.birthDate, onDate) >= 0,
  );
  if (!people.length) return null;
  const pay = recordedMonthlyPayByPerson(world, onDate);
  const anyPay = people.some((id) => pay.has(id));
  const knownMonthlyIncome = people.reduce(
    (sum, id) => sum + (pay.get(id) ?? 0),
    0,
  );
  const line = annualPovertyLineMinor(stateKey, people.length, onDate) / 12;
  const threshold =
    line * (programs.federal.snap.grossIncomeTestPctFpl.value / 100);
  const incomeToThreshold =
    anyPay && threshold > 0 ? knownMonthlyIncome / threshold : null;
  const monthlyWorkHours = people.reduce((sum, personId) => {
    const jobs = activeWorkRelationshipsAt(world, personId, {
      asOfDate: onDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    return (
      sum +
      jobs.reduce((hours, job) => {
        const range = job.role.timeDemand.expectedWeekly;
        return (
          hours +
          ((range.minimumHours + range.maximumHours) / 2) * (365.25 / 12 / 7)
        );
      }, 0)
    );
  }, 0);
  const prior = snapParticipationAt(world, householdId, onDate);
  return {
    householdId,
    size: people.length,
    incomeToThreshold: incomeToThreshold ?? prior?.incomeToThreshold ?? null,
    monthlyWorkHours: Number.isFinite(monthlyWorkHours)
      ? monthlyWorkHours
      : (prior?.monthlyWorkHours ?? null),
    enrolled: prior?.enrolled ?? false,
  };
}

function currentSnapOutcome(world: World, stateKey: string, onDate: IsoDate) {
  return placeOutcomeRecords(world)
    .filter(
      (row) =>
        row.measure === "program.snap-receipt" &&
        row.placeKey === stateKey &&
        row.month <= onDate,
    )
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
}

function previousSnapOutcome(world: World, stateKey: string, month: IsoDate) {
  return placeOutcomeRecords(world)
    .filter(
      (row) =>
        row.measure === "program.snap-receipt" &&
        row.placeKey === stateKey &&
        row.month < month,
    )
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
}

function rankRemoval(a: Candidate, b: Candidate): number {
  const ratio =
    (b.incomeToThreshold ?? Number.POSITIVE_INFINITY) -
    (a.incomeToThreshold ?? Number.POSITIVE_INFINITY);
  return (
    ratio ||
    a.size - b.size ||
    (a.monthlyWorkHours ?? Number.POSITIVE_INFINITY) -
      (b.monthlyWorkHours ?? Number.POSITIVE_INFINITY) ||
    a.householdId.localeCompare(b.householdId)
  );
}

export function resolveSnapParticipation(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.id !== SNAP_PARTICIPATION_ROW.id ||
    row.kind !== "snap-participation" ||
    context.questionKey !== SNAP_WORK_REQUIREMENT_QUESTION
  )
    return [];
  const selected = new Map<EntityId, string>();
  for (const householdId of context.subjectIds) {
    const household = world.history.households.find(
      (entry) => entry.id === householdId,
    );
    const location =
      household &&
      householdLocationAt(world, householdId, {
        asOfDate: context.onDate,
        historySequenceExclusive: world.history.nextSequence,
      });
    const stateKey = location
      ? lifePlaceByJurisdictionId(location.jurisdictionId)?.stateJurisdictionKey
      : null;
    if (stateKey) selected.set(householdId, stateKey);
  }
  const stateKeys = [...new Set(selected.values())].sort();
  const resolved: ResolvedLawConsequence[] = [];
  for (const stateKey of stateKeys) {
    const jurisdiction = stateJurisdictionForKey(stateKey);
    const outcome = currentSnapOutcome(world, stateKey, context.onDate);
    const law = jurisdiction
      ? readEligibilityLawsInForce(
          world,
          jurisdiction.id,
          [SNAP_WORK_REQUIREMENT_QUESTION],
          context.onDate,
        ).get(SNAP_WORK_REQUIREMENT_QUESTION)
      : null;
    const benefit = (
      benefitData.monthlyBenefitDollarsByPlace as Record<string, number>
    )[stateKey];
    if (!jurisdiction || !outcome || !law || benefit === undefined) continue;
    const households = world.history.households
      .map((entry) => candidateFor(world, entry.id, stateKey, context.onDate))
      .filter((candidate): candidate is Candidate => candidate !== null);
    const totalPeople = households.reduce(
      (sum, candidate) => sum + candidate.size,
      0,
    );
    if (!totalPeople) continue;
    const baselineOnly =
      context.activityId ===
      createStableId("event", `${world.id}:snap-baseline:${context.onDate}`);
    const enrollments = new Set(
      households
        .filter((candidate) => candidate.enrolled)
        .map((candidate) => candidate.householdId),
    );
    if (baselineOnly) {
      const targetPeople = Math.max(
        1,
        Math.round((totalPeople * outcome.base) / 100),
      );
      let enrolledPeople = 0;
      for (const candidate of households
        .filter(
          (item) =>
            item.incomeToThreshold !== null && item.incomeToThreshold <= 1.3,
        )
        .sort(rankRemoval)) {
        if (enrolledPeople >= targetPeople) break;
        enrollments.add(candidate.householdId);
        enrolledPeople += candidate.size;
      }
    } else {
      const priorOutcome = previousSnapOutcome(world, stateKey, outcome.month);
      const priorRate = priorOutcome?.value ?? outcome.base;
      if (outcome.value < priorRate) {
        const exitShare =
          (priorRate - outcome.value) / Math.max(priorRate, 0.01);
        const exitCount = Math.max(1, Math.ceil(enrollments.size * exitShare));
        let released = 0;
        for (const candidate of households
          .filter((item) => enrollments.has(item.householdId))
          .sort(rankRemoval)) {
          if (released >= exitCount) break;
          enrollments.delete(candidate.householdId);
          released += 1;
        }
      } else if (outcome.value > priorRate) {
        const gainShare =
          (outcome.value - priorRate) / Math.max(priorRate, 0.01);
        const gainCount = Math.max(
          1,
          Math.ceil(Math.max(1, enrollments.size) * gainShare),
        );
        let added = 0;
        for (const candidate of households
          .filter(
            (item) =>
              !enrollments.has(item.householdId) &&
              item.incomeToThreshold !== null &&
              item.incomeToThreshold <= 1.3,
          )
          .sort((a, b) => rankRemoval(b, a))) {
          if (added >= gainCount) break;
          enrollments.add(candidate.householdId);
          added += 1;
        }
      }
    }
    const candidates = households.filter(
      (candidate) => selected.get(candidate.householdId) === stateKey,
    );
    for (const candidate of candidates) {
      const prior = snapParticipationAt(
        world,
        candidate.householdId,
        context.onDate,
      );
      const enrolled = enrollments.has(candidate.householdId);
      const sourceRecordIds = prior ? [prior.id] : [];
      resolved.push({
        row,
        law,
        questionKey: SNAP_WORK_REQUIREMENT_QUESTION,
        jurisdictionId: jurisdiction.id,
        subject: { kind: "household", id: candidate.householdId },
        activityId: context.activityId,
        effectiveAt: context.onDate,
        sourceRecordIds,
        value: { type: "boolean", value: enrolled },
      });
    }
  }
  return resolved;
}

export function applySnapParticipation(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (
    resolved.subject.kind !== "household" ||
    resolved.value.type !== "boolean"
  )
    return world;
  const prior = snapParticipationAt(
    world,
    resolved.subject.id,
    resolved.effectiveAt,
  );
  const people = peopleInHouseholdAt(world, resolved.subject.id, {
    asOfDate: resolved.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  const personIds = people.filter((id) => world.people[id]);
  const location = householdLocationAt(world, resolved.subject.id, {
    asOfDate: resolved.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  const stateKey = location
    ? lifePlaceByJurisdictionId(location.jurisdictionId)?.stateJurisdictionKey
    : undefined;
  const benefit = stateKey
    ? (benefitData.monthlyBenefitDollarsByPlace as Record<string, number>)[
        stateKey
      ]
    : undefined;
  const pay = recordedMonthlyPayByPerson(world, resolved.effectiveAt);
  const monthlyIncome = personIds.reduce(
    (sum, id) => sum + (pay.get(id) ?? 0),
    0,
  );
  const line = stateKey
    ? annualPovertyLineMinor(
        stateKey,
        Math.max(1, personIds.length),
        resolved.effectiveAt,
      ) / 12
    : null;
  const ratio =
    line && line > 0
      ? monthlyIncome /
        ((line * programs.federal.snap.grossIncomeTestPctFpl.value) / 100)
      : null;
  const monthlyWorkHours = personIds.reduce(
    (sum, personId) =>
      sum +
      activeWorkRelationshipsAt(world, personId, {
        asOfDate: resolved.effectiveAt,
        historySequenceExclusive: world.history.nextSequence,
      }).reduce((hours, job) => {
        const range = job.role.timeDemand.expectedWeekly;
        return (
          hours +
          ((range.minimumHours + range.maximumHours) / 2) * (365.25 / 12 / 7)
        );
      }, 0),
    0,
  );
  return recordSnapParticipation(world, {
    householdId: resolved.subject.id,
    enrolled: resolved.value.value,
    monthlyBenefitMinor:
      resolved.value.value && benefit !== undefined
        ? Math.round(benefit * 100)
        : null,
    benefitSource: resolved.value.value
      ? `${benefitData.source.url}#${benefitData.source.table}`
      : null,
    causeId: resolved.law.measureId,
    applicationId: resolved.activityId,
    effectiveAt: resolved.effectiveAt,
    householdSize: Math.max(1, personIds.length),
    monthlyWorkHours: Number.isFinite(monthlyWorkHours)
      ? monthlyWorkHours
      : (prior?.monthlyWorkHours ?? null),
    incomeToThreshold: ratio ?? prior?.incomeToThreshold ?? null,
  });
}

export const registrations: readonly LawConsequenceKindRegistration[] = [
  {
    kind: "snap-participation",
    owner: "session-52",
    selectors: [SNAP_PARTICIPATION_ROW.who.selector],
    actions: [SNAP_PARTICIPATION_ROW.what],
    predicates: ["snap-recorded-household-facts"],
    units: [],
    resolve: resolveSnapParticipation,
    apply: applySnapParticipation,
  },
];
