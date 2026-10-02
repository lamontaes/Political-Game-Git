import { lawInForce } from "./governing/law-in-force";
import {
  appendedList,
  recordById,
  recordsWithFieldValue,
} from "./history-index";
import { createStableId } from "./ids";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
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
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
} from "./pay-coverage-predicates";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { EntityId, World } from "./types";
export {
  workPayCoverageAt,
  assertWorkPayCoverageIntegrity,
} from "./pay-coverage-query";
import { assertWorldIntegrity } from "./world";

const SOURCES = [
  "https://www.dol.gov/agencies/whd/minimum-wage",
  "https://www.dol.gov/agencies/whd/fact-sheets/14-flsa-coverage",
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title29-section206&num=0&edition=prelim",
];
const QUESTIONS = new Set([
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
]);

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
  const existing = new Set<EntityId>();
  const added: WorkPayCoverageDeterminationRecord[] = [];
  for (const workId of workIds) {
    if (
      existing.has(workId) ||
      recordsWithFieldValue(
        world.history.workPayCoverageDeterminations ?? [],
        "workRelationshipId",
        workId,
      ).length
    )
      continue;
    const work = recordById(world.history.workRelationships, workId);
    if (!work)
      throw new Error("Pay coverage requires an actual work relationship");
    const status = workStatusAt(world, workId, cutoff);
    if (
      !work.organizationId ||
      (work.compensation !== "paid" && work.compensation !== "mixed") ||
      status?.status !== "active"
    )
      continue;
    const role = workRoleAt(world, workId, cutoff);
    if (!role)
      throw new Error("Pay coverage requires its actual dated work role");
    const workplace = payWorkplaceAt(world, workId, cutoff);
    const profile = organizationProfileAt(world, work.organizationId, cutoff);
    const factRecordIds = [
      work.id,
      role.id,
      status.id,
      ...(profile ? [profile.id] : []),
    ];
    const governingLaws: WorkPayCoverageDeterminationRecord["governingLaws"][number][] =
      [];
    const exceptions: WorkPayCoverageDeterminationRecord["exceptions"][number][] =
      [];
    const sources = new Set(SOURCES);
    for (const proposition of propositions) {
      // This is federal legal authority, not a replacement workplace fact.
      // With no recorded place its chain cannot contain a state/local law.
      const jurisdictionId =
        workplace.jurisdictionId ??
        (proposition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
          ? NATIONAL_ELECTION_JURISDICTION.id
          : null);
      if (!jurisdictionId) continue;
      const law = lawInForce(
        world,
        jurisdictionId,
        proposition.id,
        world.currentDate,
      );
      if (!law || (law.origin === "enacted" && law.answer !== "yes")) continue;
      if (
        proposition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
        law.origin === "in-force-at-start" &&
        law.answer === "no"
      )
        continue;
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
      jurisdictionId: workplace.jurisdictionId,
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
