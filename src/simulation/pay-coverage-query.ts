import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  PAY_SELECTOR,
  PAY_ACTION,
} from "./law-consequences/pay-rows";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { workRoleAt } from "./life-queries";
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
} from "./pay-coverage-predicates";
import { recordById, recordsWithFieldValue } from "./history-index";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";

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
  // Authority depends on catalog and legal history, so recheck even on a fact-cache hit.
  for (const record of records) assertCoverageAuthority(world, record);
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

/** Revalidate saved exception authority from the same dated facts used at determination. */
function assertCoverageAuthority(
  world: World,
  record: WorkPayCoverageDeterminationRecord,
): void {
  const cutoff = {
    asOfDate: record.determinedAt,
    historySequenceExclusive: record.sequence,
  };
  const workplace = payWorkplaceAt(world, record.workRelationshipId, cutoff);
  const expectedLawKeys = new Set<string>();
  const expectedExceptionKeys = new Set<string>();
  for (const question of Object.values(world.policyCatalog.propositions)) {
    if (
      ![
        FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        STATE_MINIMUM_WAGE_QUESTION_KEY,
      ].includes(question.stableKey)
    )
      continue;
    const jurisdictionId =
      workplace.jurisdictionId ??
      (question.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
        ? NATIONAL_ELECTION_JURISDICTION.id
        : null);
    const law = jurisdictionId
      ? lawInForce(
          world,
          jurisdictionId,
          question.id,
          record.determinedAt,
          "all",
          cutoff,
        )
      : null;
    if (
      !law ||
      (law.origin === "enacted" && law.answer !== "yes") ||
      (question.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
        law.origin === "in-force-at-start" &&
        law.answer === "no")
    )
      continue;
    expectedLawKeys.add(question.stableKey);
    for (const row of question.consequences ?? []) {
      if (
        row.kind !== "pay" ||
        row.who.selector !== PAY_SELECTOR ||
        row.what !== PAY_ACTION
      )
        continue;
      const predicates = [...row.who.predicates, ...row.conditions];
      if (
        !predicates.length ||
        !matchPayCoveragePredicates(
          world,
          record.workRelationshipId,
          predicates,
          cutoff,
        ).matches
      )
        continue;
      if (expectedExceptionKeys.has(question.stableKey))
        throw new Error("Pay coverage has ambiguous canonical exceptions");
      expectedExceptionKeys.add(question.stableKey);
    }
  }
  const seenLaws = new Set<string>();
  for (const saved of record.governingLaws) {
    const question = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === saved.questionKey,
    );
    const jurisdictionId =
      workplace.jurisdictionId ??
      (saved.questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
        ? NATIONAL_ELECTION_JURISDICTION.id
        : null);
    const law =
      question && jurisdictionId
        ? lawInForce(
            world,
            jurisdictionId,
            question.id,
            record.determinedAt,
            "all",
            cutoff,
          )
        : null;
    if (
      seenLaws.has(saved.questionKey) ||
      ![
        FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        STATE_MINIMUM_WAGE_QUESTION_KEY,
      ].includes(saved.questionKey) ||
      !law ||
      law.measureId !== saved.governingLawKey ||
      law.origin !== saved.origin ||
      (law.origin === "enacted" && law.answer !== "yes") ||
      (saved.questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
        law.origin === "in-force-at-start" &&
        law.answer === "no")
    )
      throw new Error(
        "Pay coverage governing law must match its actual dated authority",
      );
    seenLaws.add(saved.questionKey);
  }
  const seenExceptions = new Set<string>();
  for (const saved of record.exceptions) {
    const question = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === saved.questionKey,
    );
    const row = question?.consequences?.find((r) => r.id === saved.rowId);
    if (
      !seenLaws.has(saved.questionKey) ||
      seenExceptions.has(saved.questionKey) ||
      !row ||
      row.kind !== "pay" ||
      row.who.selector !== PAY_SELECTOR ||
      row.what !== PAY_ACTION
    )
      throw new Error(
        "Pay coverage exception must name its canonical governing pay row",
      );
    const predicates = [...row.who.predicates, ...row.conditions];
    const match = matchPayCoveragePredicates(
      world,
      record.workRelationshipId,
      predicates,
      cutoff,
    );
    const actualIds = [...new Set(match.factRecordIds)].sort();
    const savedIds = [...new Set(saved.factRecordIds)].sort();
    if (
      !predicates.length ||
      !match.matches ||
      saved.factRecordIds.length !== savedIds.length ||
      JSON.stringify(actualIds) !== JSON.stringify(savedIds) ||
      savedIds.some((id) => !record.factRecordIds.includes(id))
    )
      throw new Error(
        "Pay coverage exception evidence must match its actual dated predicates",
      );
    seenExceptions.add(saved.questionKey);
  }
  if (
    seenLaws.size !== expectedLawKeys.size ||
    [...expectedLawKeys].some((key) => !seenLaws.has(key)) ||
    seenExceptions.size !== expectedExceptionKeys.size ||
    [...expectedExceptionKeys].some((key) => !seenExceptions.has(key))
  )
    throw new Error(
      "Pay coverage must retain every applicable dated law and exception",
    );
}
