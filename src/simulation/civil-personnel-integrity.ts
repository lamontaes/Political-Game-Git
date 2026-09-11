import { CIVIL_PERSONNEL_SOURCE_PROJECTION } from "./civil-personnel-sources.generated";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { activeOrganizationParticipationsAt } from "./life-queries";
import { PERSONNEL_PROCEDURE_KEYS } from "./civil-personnel-contract";
import type {
  EntityId,
  IsoDate,
  PersonnelAuthorityDesignationRecord,
  PersonnelPower,
  PersonnelRecord,
  World,
} from "./types";

const procedures = CIVIL_PERSONNEL_SOURCE_PROJECTION.procedures;

function term(key: string, name: string): number | readonly string[] {
  const value = procedures.find((p) => p.key === key)?.terms[name];
  if (value === undefined)
    throw new Error(`Personnel integrity needs ${key} term ${name}.`);
  return value;
}

function observedOn(key: string): IsoDate {
  const found = procedures.find((p) => p.key === key);
  if (!found) throw new Error(`Personnel integrity needs procedure ${key}.`);
  return makeIsoDate(found.validity.observedOn);
}

function yearsAfter(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return makeIsoDate(target.toISOString().slice(0, 10));
}

/** Whether the person held the designated role when the record was written. */
function heldRole(
  world: World,
  personId: EntityId,
  designation: PersonnelAuthorityDesignationRecord,
  record: PersonnelRecord,
): boolean {
  if (!world.people[personId]) return false;
  return activeOrganizationParticipationsAt(world, personId, {
    asOfDate: record.recordedAt,
    historySequenceExclusive: record.sequence,
  }).some(
    (r) =>
      r.participation.organizationId === designation.organizationId &&
      r.state.roleKind === designation.roleKind,
  );
}

/** The durable NPC decision a record claims, made by that person, choosing that option. */
function traceChose(
  world: World,
  traceId: EntityId | null,
  stableKey: string,
  personId: EntityId,
  option: string,
): boolean {
  const trace = world.history.decisionTraces.find((t) => t.id === traceId);
  return (
    trace !== undefined &&
    trace.context.stableKey === stableKey &&
    trace.context.actorPersonId === personId &&
    trace.selectedOptionKey === option
  );
}

function endedOn(
  world: World,
  workRelationshipId: EntityId,
  record: PersonnelRecord,
): IsoDate | null {
  const latest = world.history.workStatuses
    .filter(
      (s) =>
        s.workRelationshipId === workRelationshipId &&
        s.sequence < record.sequence,
    )
    .at(-1);
  return latest?.status === "ended" ? latest.effectiveAt : null;
}

/**
 * The only organizations an authored charter or position may describe: game
 * fiction that says it is a state agency. Real institutions arrive through
 * source records or simulated events and are never chartered here.
 */
export const PERSONNEL_CHARTERED_CLASSIFICATION = "service:state-agency";

function charterable(world: World, organizationId: EntityId): boolean {
  const organization = world.history.organizations.find(
    (o) => o.id === organizationId,
  );
  const profile = world.history.organizationProfiles
    .filter((p) => p.organizationId === organizationId)
    .at(-1);
  return (
    organization?.provenance.kind === "authored" &&
    profile?.classification === PERSONNEL_CHARTERED_CLASSIFICATION
  );
}

/** The statutory procedure that names the office holding each power. */
export const PERSONNEL_POWER_STATUTES: Readonly<
  Record<PersonnelPower, readonly string[]>
> = {
  // The acquired enacted text never names who a given agency's appointing
  // authority is, so this power exists only by an agency's authored charter.
  "appointing-authority": [],
  "commissioner-settlement": ["mn-commissioner-settlement"],
};

export function personnelRecords(world: World): readonly PersonnelRecord[] {
  return world.history.personnelRecords ?? [];
}

export function personnelHistoryRecords(
  world: World,
): readonly PersonnelRecord[] {
  return personnelRecords(world);
}

type RecordOf<K extends PersonnelRecord["kind"]> = Extract<
  PersonnelRecord,
  { kind: K }
>;

/** The personnel half of the world's integrity contract; runs on every write. */
export function assertPersonnelIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const records = personnelRecords(world);
  const byId = new Map<EntityId, PersonnelRecord>();
  const keys = new Set<string>();
  let prior = -1;
  const fail = (record: PersonnelRecord, message: string): never => {
    throw new Error(`Personnel record ${record.stableKey}: ${message}`);
  };
  const earlier = <K extends PersonnelRecord["kind"]>(
    record: PersonnelRecord,
    id: EntityId,
    kind: K,
  ): RecordOf<K> => {
    const found = byId.get(id);
    if (!found || found.kind !== kind)
      fail(record, `does not reference an earlier ${kind} record.`);
    return found as RecordOf<K>;
  };
  const once = new Set<string>();
  const only = (record: PersonnelRecord, key: string) => {
    if (once.has(key)) fail(record, "duplicates a one-time procedural step.");
    once.add(key);
  };
  for (const record of records) {
    if (record.sequence <= prior)
      fail(record, "records are not sequence ordered.");
    prior = record.sequence;
    if (keys.has(record.stableKey)) fail(record, "duplicate stable key.");
    keys.add(record.stableKey);
    if (ids.has(record.id)) fail(record, "duplicate identity.");
    ids.add(record.id);
    if (
      record.id !==
      createStableId("personnel-record", `${world.id}:${record.stableKey}`)
    )
      fail(record, "identity does not match its stable key.");
    if (record.recordedAt > world.currentDate)
      fail(record, "is recorded after the current world date.");
    const event = world.history.events.find((e) => e.id === record.eventId);
    if (
      !event ||
      event.type !== `civil-personnel.${record.kind}` ||
      event.occurredAt !== record.recordedAt
    )
      fail(record, "lacks its paired ordinary event.");
    switch (record.kind) {
      case "authority-designation": {
        const organization = world.history.organizations.find(
          (o) => o.id === record.organizationId,
        );
        if (!organization) fail(record, "names a missing organization.");
        if (!record.roleKind.startsWith("leader:"))
          fail(record, "must name a leadership role.");
        if (record.basis.kind === "authored-charter") {
          if (
            !charterable(world, record.organizationId) ||
            record.power !== "appointing-authority" ||
            record.scope !== "employing-organization" ||
            !record.basis.note.trim()
          )
            fail(
              record,
              "an authored charter may only designate the appointing authority of an authored state agency.",
            );
        } else if (
          !PERSONNEL_POWER_STATUTES[record.power].includes(
            record.basis.procedureKey,
          ) ||
          !(PERSONNEL_PROCEDURE_KEYS as readonly string[]).includes(
            record.basis.procedureKey,
          ) ||
          record.scope !== "jurisdiction"
        )
          fail(record, "its statute does not name this power.");
        if (record.scope === "jurisdiction")
          only(
            record,
            `statutory-office:${record.power}:${record.jurisdictionKey}`,
          );
        break;
      }
      case "position": {
        if (
          event!.context.choice !==
          `class ${record.classKey}; civil ${record.civilClass}; bargaining ${record.bargainingCoverage}; agreement ${record.agreementCoverage}`
        )
          fail(record, "disagrees with the position its event established.");
        if (
          !charterable(world, record.organizationId) ||
          !record.basis.note.trim() ||
          !record.classKey.trim() ||
          !record.title.trim()
        )
          fail(
            record,
            "must be an authored position of an authored state agency.",
          );
        break;
      }
      case "incumbency": {
        const position = earlier(record, record.positionId, "position");
        if (
          !event!.participants.some(
            (p) =>
              p.personId === record.personId &&
              p.role === "focus:incumbent" &&
              p.detail === record.tenure,
          )
        )
          fail(record, "disagrees with the tenure its event established.");
        const work = world.history.workRelationships.find(
          (w) => w.id === record.workRelationshipId,
        );
        if (
          !work ||
          work.personId !== record.personId ||
          work.organizationId !== position.organizationId
        )
          fail(record, "does not match its work relationship.");
        if (record.basis.kind === "reinstatement") {
          const response = earlier(
            record,
            record.basis.responseId,
            "offer-response",
          );
          const offer = earlier(
            record,
            record.basis.offerId,
            "reinstatement-offer",
          );
          if (
            response.offerId !== offer.id ||
            response.response !== "accepted" ||
            response.workRelationshipId !== record.workRelationshipId ||
            offer.positionId !== record.positionId ||
            record.tenure !==
              (offer.probation === "required" ? "probationary" : "unknown")
          )
            fail(record, "is not the accepted reinstatement it names.");
        }
        const occupied = records.some(
          (other) =>
            other.kind === "incumbency" &&
            other.sequence < record.sequence &&
            other.positionId === record.positionId &&
            endedOn(world, other.workRelationshipId, record) === null,
        );
        if (occupied) fail(record, "fills a position that is not vacant.");
        only(record, `incumbency:${record.workRelationshipId}`);
        break;
      }
      case "informal-resolution": {
        const incumbency = earlier(record, record.incumbencyId, "incumbency");
        const position = earlier(record, incumbency.positionId, "position");
        const designation = earlier(
          record,
          record.designationId,
          "authority-designation",
        );
        if (
          designation.power !== "appointing-authority" ||
          designation.organizationId !== position.organizationId ||
          !heldRole(world, record.actorPersonId, designation, record)
        )
          fail(record, "was not held by the employer's appointing authority.");
        const activity = world.history.scheduledActivities.find(
          (a) => a.id === record.scheduledActivityId,
        );
        const state = world.history.scheduledActivityStates
          .filter((s) => s.activityId === record.scheduledActivityId)
          .at(-1);
        if (
          !activity ||
          state?.status !== "completed" ||
          !activity.participantPersonIds.includes(record.actorPersonId) ||
          !activity.participantPersonIds.includes(incumbency.personId)
        )
          fail(record, "names no meeting both people attended.");
        break;
      }
      case "disciplinary-action": {
        const incumbency = earlier(record, record.incumbencyId, "incumbency");
        const position = earlier(record, incumbency.positionId, "position");
        const designation = earlier(
          record,
          record.designationId,
          "authority-designation",
        );
        if (
          designation.power !== "appointing-authority" ||
          designation.organizationId !== position.organizationId ||
          !heldRole(world, record.actorPersonId, designation, record) ||
          record.actorPersonId === incumbency.personId
        )
          fail(record, "was not taken by the employer's appointing authority.");
        if (
          position.jurisdictionKey !== "US-MN" ||
          position.civilClass !== "classified" ||
          position.agreementCoverage !== "not-covered" ||
          incumbency.tenure !== "permanent" ||
          record.recordedAt < observedOn("mn-discipline-notice") ||
          record.effectiveOn !== record.recordedAt ||
          !(
            term("mn-just-cause-grounds", "grounds") as readonly string[]
          ).includes(record.ground) ||
          !record.reasons.trim()
        )
          fail(record, "is outside the compiled just-cause procedure.");
        const attempt = earlier(
          record,
          record.informalResolutionId,
          "informal-resolution",
        );
        if (attempt.incumbencyId !== incumbency.id)
          fail(record, "relies on another employee's informal attempt.");
        only(record, `attempt-used:${attempt.id}`);
        if (
          !world.history.evidenceArtifacts.some(
            (e) => e.id === record.noticeEvidenceId,
          )
        )
          fail(record, "lacks its written notice.");
        const discharge = record.action === "discharge";
        if (
          discharge !== (record.appealDeadline !== null) ||
          discharge !== (record.commissionerFilingDeadline !== null) ||
          discharge !== (record.endedWorkStatusId !== null)
        )
          fail(record, "carries deadlines that do not match its action.");
        if (
          discharge &&
          (record.appealDeadline !==
            addDays(
              record.effectiveOn,
              term(
                "mn-discipline-notice",
                "appealWithinCalendarDays",
              ) as number,
            ) ||
            record.commissionerFilingDeadline !==
              addDays(
                record.effectiveOn,
                term(
                  "mn-discipline-notice",
                  "commissionerFilingWithinCalendarDays",
                ) as number,
              ))
        )
          fail(record, "carries deadlines the statute does not set.");
        if (discharge) {
          const status = world.history.workStatuses.find(
            (s) => s.id === record.endedWorkStatusId,
          );
          if (
            !status ||
            status.status !== "ended" ||
            status.workRelationshipId !== incumbency.workRelationshipId ||
            status.effectiveAt !== record.effectiveOn
          )
            fail(record, "does not end the employment it discharges.");
        }
        break;
      }
      case "commissioner-filing": {
        const action = earlier(record, record.actionId, "disciplinary-action");
        const incumbency = earlier(record, action.incumbencyId, "incumbency");
        const position = earlier(record, incumbency.positionId, "position");
        const designation = earlier(
          record,
          record.designationId,
          "authority-designation",
        );
        if (
          action.action !== "discharge" ||
          designation.power !== "appointing-authority" ||
          designation.organizationId !== position.organizationId ||
          !heldRole(world, record.actorPersonId, designation, record)
        )
          fail(record, "is not an appointing authority's filing.");
        if (
          record.timely !==
          daysBetween(action.effectiveOn, record.recordedAt) <=
            (term(
              "mn-discipline-notice",
              "commissionerFilingWithinCalendarDays",
            ) as number)
        )
          fail(record, "misstates whether it was timely.");
        only(record, `filing:${action.id}`);
        break;
      }
      case "appeal": {
        const action = earlier(record, record.actionId, "disciplinary-action");
        if (record.recordedAt > action.appealDeadline!)
          fail(record, "was filed after the appeal period.");
        const incumbency = earlier(record, action.incumbencyId, "incumbency");
        if (
          action.action !== "discharge" ||
          incumbency.personId !== record.personId
        )
          fail(record, "is not the discharged employee's appeal.");
        if (
          !traceChose(
            world,
            record.decisionTraceId,
            `civil-personnel:appeal-decision:${action.id}`,
            record.personId,
            "appeal",
          )
        )
          fail(record, "lacks the employee's own recorded decision.");
        only(record, `appeal:${action.id}`);
        break;
      }
      case "settlement-decision": {
        const appeal = earlier(record, record.appealId, "appeal");
        if (appeal.jurisdictionKey !== record.jurisdictionKey)
          fail(record, "decides another jurisdiction's appeal.");
        const designation = earlier(
          record,
          record.designationId,
          "authority-designation",
        );
        const action = earlier(record, appeal.actionId, "disciplinary-action");
        if (
          designation.power !== "commissioner-settlement" ||
          !heldRole(world, record.actorPersonId, designation, record) ||
          record.actorPersonId === appeal.personId ||
          record.actorPersonId === action.actorPersonId ||
          record.recordedAt < observedOn("mn-commissioner-settlement")
        )
          fail(record, "was not decided by the commissioner's office holder.");
        if (
          !traceChose(
            world,
            record.decisionTraceId,
            `civil-personnel:settlement-decision:${appeal.id}`,
            record.actorPersonId,
            record.decision,
          )
        )
          fail(record, "lacks the commissioner's own recorded decision.");
        only(record, `settlement:${record.appealId}`);
        break;
      }
      case "reinstatement-offer": {
        const position = earlier(record, record.positionId, "position");
        const designation = earlier(
          record,
          record.designationId,
          "authority-designation",
        );
        const former = earlier(record, record.formerIncumbencyId, "incumbency");
        const formerPosition = earlier(record, former.positionId, "position");
        const separated = endedOn(world, former.workRelationshipId, record);
        if (
          designation.power !== "appointing-authority" ||
          designation.organizationId !== position.organizationId ||
          !heldRole(world, record.actorPersonId, designation, record) ||
          record.actorPersonId === record.personId ||
          former.personId !== record.personId ||
          former.tenure === "unknown" ||
          formerPosition.classKey !== position.classKey ||
          position.jurisdictionKey !== "US-MN" ||
          formerPosition.jurisdictionKey !== "US-MN" ||
          position.civilClass !== "classified" ||
          record.recordedAt < observedOn("mn-reinstatement") ||
          !separated ||
          record.recordedAt >
            yearsAfter(
              separated,
              term("mn-reinstatement", "withinYearsOfSeparation") as number,
            ) ||
          (record.probation === "required" &&
            formerPosition.organizationId === position.organizationId)
        )
          fail(
            record,
            "is not an appointing authority's offer in the former class.",
          );
        break;
      }
      case "offer-response": {
        const offer = earlier(record, record.offerId, "reinstatement-offer");
        if (offer.personId !== record.personId)
          fail(record, "was not given by the person offered.");
        if (
          (record.response === "accepted") !==
          (record.workRelationshipId !== null)
        )
          fail(record, "does not match its employment outcome.");
        const offeredPosition = earlier(record, offer.positionId, "position");
        if (
          record.recordedAt !== offer.recordedAt ||
          !traceChose(
            world,
            record.decisionTraceId,
            `civil-personnel:offer-decision:${offeredPosition.organizationId}:${record.personId}:${
              records.filter(
                (o) =>
                  o.kind === "reinstatement-offer" &&
                  o.sequence < offer.sequence &&
                  o.personId === offer.personId &&
                  byId.get(o.positionId)?.kind === "position" &&
                  (byId.get(o.positionId) as RecordOf<"position">)
                    .organizationId === offeredPosition.organizationId,
              ).length
            }`,
            record.personId,
            record.response === "accepted" ? "accept" : "decline",
          )
        )
          fail(record, "lacks the person's own recorded answer.");
        only(record, `response:${offer.id}`);
        break;
      }
    }
    byId.set(record.id, record);
  }
  // Offers are answered on receipt; none may be left open.
  for (const record of records) {
    if (record.kind !== "reinstatement-offer") continue;
    const answers = records.filter(
      (r) => r.kind === "offer-response" && r.offerId === record.id,
    );
    if (answers.length !== 1 || answers[0]!.recordedAt !== record.recordedAt)
      fail(record, "is not answered on receipt.");
  }
}
