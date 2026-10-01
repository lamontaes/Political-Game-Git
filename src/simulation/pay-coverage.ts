import { makeIsoDate } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import {
  appendedList,
  recordById,
  recordsWithFieldValue,
} from "./history-index";
import { createStableId } from "./ids";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  PAY_SELECTOR,
  PAY_ACTION,
} from "./law-consequences/pay-rows";
import { matchPayCoveragePredicates } from "./pay-coverage-predicates";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";
import { assertWorldIntegrity } from "./world";

const SOURCES = [
  "https://www.dol.gov/agencies/whd/minimum-wage",
  "https://www.dol.gov/agencies/whd/fact-sheets/14-flsa-coverage",
];
const QUESTIONS = new Set([
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
]);

export function workPayCoverageAt(
  world: World,
  workId: EntityId,
  cutoff: HistoricalCutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  },
): WorkPayCoverageDeterminationRecord | undefined {
  return recordsWithFieldValue(
    world.history.workPayCoverageDeterminations ?? [],
    "workRelationshipId",
    workId,
  )
    .filter(
      (record) =>
        record.determinedAt <= cutoff.asOfDate &&
        record.sequence < cutoff.historySequenceExclusive,
    )
    .at(-1);
}

/** At hire/opening, once per actual active paid job; no invented exception facts. */
export function determineWorkPayCoverage(
  world: World,
  workIds: readonly EntityId[],
  reason: WorkPayCoverageDeterminationRecord["reason"],
): World {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const propositions = Object.values(world.policyCatalog.propositions).filter(
    (entry) => QUESTIONS.has(entry.stableKey),
  );
  const existing = new Set(
    (world.history.workPayCoverageDeterminations ?? []).map(
      (record) => record.workRelationshipId,
    ),
  );
  const added: WorkPayCoverageDeterminationRecord[] = [];
  for (const workId of workIds) {
    if (existing.has(workId)) continue;
    const work = recordById(world.history.workRelationships, workId);
    if (!work)
      throw new Error("Pay coverage requires an actual work relationship");
    if (
      !work.organizationId ||
      (work.compensation !== "paid" && work.compensation !== "mixed") ||
      workStatusAt(world, workId, cutoff)?.status !== "active"
    )
      continue;
    const role = workRoleAt(world, workId, cutoff);
    if (!role?.locationJurisdictionId)
      throw new Error(
        "Pay coverage requires its actual workplace jurisdiction",
      );
    const profile = organizationProfileAt(world, work.organizationId, cutoff);
    const factRecordIds = [work.id, role.id, ...(profile ? [profile.id] : [])];
    const governingLaws: WorkPayCoverageDeterminationRecord["governingLaws"][number][] =
      [];
    const exceptions: WorkPayCoverageDeterminationRecord["exceptions"][number][] =
      [];
    const sources = new Set(SOURCES);
    for (const proposition of propositions) {
      const law = lawInForce(
        world,
        role.locationJurisdictionId,
        proposition.id,
        world.currentDate,
      );
      if (!law || law.answer !== "yes") continue;
      governingLaws.push({
        questionKey: proposition.stableKey,
        governingLawKey: law.measureId,
        origin: law.origin,
      });
      for (const row of proposition.consequences ?? []) {
        if (
          row.kind !== "pay" ||
          row.who.selector !== PAY_SELECTOR ||
          row.what !== PAY_ACTION
        )
          continue;
        const predicates = [...row.who.predicates, ...row.conditions];
        if (predicates.length === 0) continue;
        const match = matchPayCoveragePredicates(
          world,
          workId,
          predicates,
          cutoff,
        );
        if (!match.matches) continue;
        if (
          exceptions.some(
            (entry) => entry.questionKey === proposition.stableKey,
          )
        )
          throw new Error(
            "Ambiguous pay exception requires a disjoint canonical scope",
          );
        exceptions.push({
          questionKey: proposition.stableKey,
          rowId: row.id,
          factRecordIds: match.factRecordIds,
        });
        factRecordIds.push(...match.factRecordIds);
        row.evidence.sourceIds.forEach((source) => sources.add(source));
      }
    }
    const stableKey = `work-pay-coverage:${work.id}:initial`;
    added.push({
      id: createStableId("work-pay-coverage", `${world.id}:${stableKey}`),
      stableKey,
      sequence: world.history.nextSequence + added.length,
      workRelationshipId: work.id,
      personId: work.personId,
      employerOrganizationId: work.organizationId,
      workRoleId: role.id,
      jurisdictionId: role.locationJurisdictionId,
      determinedAt: world.currentDate,
      reason,
      defaultCategory: "standard",
      factRecordIds: [...new Set(factRecordIds)],
      sources: [...sources],
      governingLaws,
      exceptions,
    });
    existing.add(workId);
  }
  if (!added.length) return world;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + added.length,
      workPayCoverageDeterminations: appendedList(
        world.history.workPayCoverageDeterminations ?? [],
        added,
      ),
    },
  };
  assertWorldIntegrity(next);
  return next;
}

/** The opening owner calls this once after actual jobs and laws are present. */
export function initializeWorkPayCoverage(world: World): World {
  return determineWorkPayCoverage(
    world,
    world.history.workRelationships.map((record) => record.id),
    "opening",
  );
}

export function assertWorkPayCoverageIntegrity(world: World): void {
  const seen = new Set<EntityId>();
  for (const record of world.history.workPayCoverageDeterminations ?? []) {
    const work = recordById(
      world.history.workRelationships,
      record.workRelationshipId,
    );
    const role = recordById(world.history.workRoles, record.workRoleId);
    const date: IsoDate = makeIsoDate(record.determinedAt);
    if (
      seen.has(record.workRelationshipId) ||
      !work ||
      !role ||
      work.personId !== record.personId ||
      work.organizationId !== record.employerOrganizationId ||
      role.workRelationshipId !== work.id ||
      role.locationJurisdictionId !== record.jurisdictionId ||
      role.sequence >= record.sequence ||
      work.sequence >= record.sequence ||
      role.effectiveAt > date ||
      date > world.currentDate ||
      record.defaultCategory !== "standard" ||
      !["hire", "opening"].includes(record.reason) ||
      record.sources.length === 0 ||
      !record.factRecordIds.includes(work.id) ||
      !record.factRecordIds.includes(role.id)
    )
      throw new Error(
        "Pay coverage determination must bind its actual dated work facts",
      );
    seen.add(record.workRelationshipId);
  }
}
