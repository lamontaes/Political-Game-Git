import { createStableId } from "./ids";
import { PERSONNEL_PROCEDURE_KEYS } from "./civil-personnel-contract";
import type { EntityId, PersonnelPower, PersonnelRecord, World } from "./types";

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
            offer.positionId !== record.positionId
          )
            fail(record, "is not the accepted reinstatement it names.");
        }
        only(record, `incumbency:${record.workRelationshipId}`);
        break;
      }
      case "informal-resolution": {
        earlier(record, record.incumbencyId, "incumbency");
        earlier(record, record.designationId, "authority-designation");
        if (
          !world.history.scheduledActivities.some(
            (a) => a.id === record.scheduledActivityId,
          )
        )
          fail(record, "names a missing meeting.");
        break;
      }
      case "disciplinary-action": {
        const incumbency = earlier(record, record.incumbencyId, "incumbency");
        earlier(record, record.designationId, "authority-designation");
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
        if (
          action.action !== "discharge" ||
          action.actorPersonId !== record.actorPersonId
        )
          fail(record, "is not the acting appointing authority's filing.");
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
        if (designation.power !== "commissioner-settlement")
          fail(record, "was not decided under the commissioner's power.");
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
        if (
          designation.power !== "appointing-authority" ||
          designation.organizationId !== position.organizationId ||
          former.personId !== record.personId ||
          formerPosition.classKey !== position.classKey
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
        only(record, `response:${offer.id}`);
        break;
      }
    }
    byId.set(record.id, record);
  }
}
