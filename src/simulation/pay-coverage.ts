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
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
} from "./pay-coverage-predicates";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";
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
      const law = workplace.jurisdictionId
        ? lawInForce(
            world,
            workplace.jurisdictionId,
            proposition.id,
            world.currentDate,
          )
        : null;
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

const VALIDATED = new WeakMap<
  readonly WorkPayCoverageDeterminationRecord[],
  {
    work: World["history"]["workRelationships"];
    roles: World["history"]["workRoles"];
    profiles: World["history"]["organizationProfiles"];
    statuses: World["history"]["workStatuses"];
    latestDate: IsoDate;
  }
>();

export function assertWorkPayCoverageIntegrity(
  world: World,
  ids: Set<EntityId> = new Set(),
): void {
  const records = world.history.workPayCoverageDeterminations;
  if (!records?.length) return;
  // Register identity on every call, even when the dated facts are cached.
  for (const record of records) {
    if (ids.has(record.id))
      throw new Error(`Duplicate world entity ID: ${record.id}`);
    const stableKey = `work-pay-coverage:${record.workRelationshipId}:initial`;
    if (
      record.stableKey !== stableKey ||
      record.id !==
        createStableId("work-pay-coverage", `${world.id}:${stableKey}`)
    )
      throw new Error("Pay coverage ID must match its canonical stable key");
    ids.add(record.id);
  }
  const cached = VALIDATED.get(records);
  if (
    cached &&
    cached.work === world.history.workRelationships &&
    cached.roles === world.history.workRoles &&
    cached.profiles === world.history.organizationProfiles &&
    cached.statuses === world.history.workStatuses &&
    cached.latestDate <= world.currentDate
  )
    return;
  const seen = new Set<EntityId>();
  let latestDate = records[0]!.determinedAt;
  for (const record of records) {
    const work = recordById(
      world.history.workRelationships,
      record.workRelationshipId,
    );
    const role = recordById(world.history.workRoles, record.workRoleId);
    const date: IsoDate = makeIsoDate(record.determinedAt);
    const cutoff = {
      asOfDate: date,
      historySequenceExclusive: record.sequence,
    };
    const workplace =
      work && role ? payWorkplaceAt(world, work.id, cutoff) : null;
    if (
      seen.has(record.workRelationshipId) ||
      !work ||
      !role ||
      work.personId !== record.personId ||
      work.organizationId !== record.employerOrganizationId ||
      role.workRelationshipId !== work.id ||
      workplace?.jurisdictionId !== record.jurisdictionId ||
      workRoleAt(world, work.id, cutoff)?.id !== record.workRoleId ||
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
    latestDate = date > latestDate ? date : latestDate;
    for (const id of record.factRecordIds) {
      const relatedWork = recordById(world.history.workRelationships, id);
      const relatedRole = recordById(world.history.workRoles, id);
      const relatedStatus = recordById(world.history.workStatuses, id);
      const relatedProfile = recordById(world.history.organizationProfiles, id);
      const fact =
        relatedWork ?? relatedRole ?? relatedStatus ?? relatedProfile;
      if (!fact || fact.sequence >= record.sequence)
        throw new Error(
          "Pay coverage evidence must be an actual prior saved fact",
        );
      if (
        relatedWork &&
        (relatedWork.organizationId !== work!.organizationId ||
          relatedWork.recordedAt > date)
      )
        throw new Error(
          "Pay coverage workforce evidence must belong to the dated employer",
        );
      if (
        relatedProfile &&
        (relatedProfile.organizationId !== work!.organizationId ||
          relatedProfile.effectiveAt > date)
      )
        throw new Error(
          "Pay coverage employer evidence must precede its determination",
        );
      if (
        relatedRole &&
        (relatedRole.workRelationshipId !== work!.id ||
          relatedRole.effectiveAt > date)
      )
        throw new Error("Pay coverage role evidence must bind its dated work");
      if (relatedStatus) {
        const statusWork = recordById(
          world.history.workRelationships,
          relatedStatus.workRelationshipId,
        );
        if (
          statusWork?.organizationId !== work!.organizationId ||
          relatedStatus.effectiveAt > date
        )
          throw new Error(
            "Pay coverage status evidence must bind the dated employer",
          );
      }
    }
  }
  VALIDATED.set(records, {
    work: world.history.workRelationships,
    roles: world.history.workRoles,
    profiles: world.history.organizationProfiles,
    statuses: world.history.workStatuses,
    latestDate,
  });
}
