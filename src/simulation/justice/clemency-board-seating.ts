import table from "../../../data/research/clemency/board-appointments-2026.json" with { type: "json" };
import { completedMonthsBetween } from "../dates";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { createOrganization, createOrganizationParticipation } from "../life";
import {
  currentLifeCutoff,
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusAt,
} from "../life-queries";
import { appointmentCircle, chooseAppointee } from "../patronage/appointments";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";

export const CLEMENCY_BOARD_NOMINATED = "justice.clemency-board-nominated";
export const CLEMENCY_BOARD_APPOINTED = "justice.clemency-board-appointed";
export const clemencyBoardAppointmentProfiles = table.rows;

type Profile = (typeof table.rows)[number];

function organizationKey(profile: Profile): string {
  return `clemency-board:${profile.jurisdictionKey}:${profile.bodyKey}`;
}

/** Only explicitly recorded occupational fields establish professional experience.
 * A title, assumed biography, current office or unrecorded qualification cannot.
 * Partial overlapping work is conservatively refused rather than counted twice.
 */
function recordedQualification(
  world: World,
  personId: EntityId,
  profile: Profile,
): boolean {
  if (profile.experienceYears === null || profile.experienceFields.length === 0)
    return false;
  if (
    profile.qualifications &&
    world.currentDate <= profile.qualifications.appointmentsAfter
  )
    return false; // Prior qualification text has not been acquired.
  // An unrecorded accredited degree does not activate the shorter alternative.
  // The longer experience route suffices whether or not a degree exists.
  // Grandfathering requires actual membership on the cited date, never age.
  const requiredYears =
    profile.qualifications &&
    world.currentDate > profile.qualifications.appointmentsAfter
      ? profile.qualifications.withoutAccreditedBachelorsExperienceYears
      : profile.experienceYears;
  const cutoff = currentLifeCutoff(world);
  for (const work of workRelationshipHistoryForPerson(
    world,
    personId,
    cutoff,
  )) {
    const roles = workRoleHistory(world, work.id, cutoff);
    // One fully recorded continuous interval suffices. Combining partial intervals
    // needs a sourced/recorded qualification join and remains explicitly unsupported.
    if (roles.length !== 1 || roles[0]!.effectiveAt !== work.startedAt)
      continue;
    const field = roles[0]!.occupationClassification;
    if (
      !profile.experienceFields.some((value) => field === `profession:${value}`)
    )
      continue;
    const statuses = world.history.workStatuses.filter(
      (row) =>
        row.workRelationshipId === work.id &&
        row.effectiveAt <= world.currentDate,
    );
    if (
      statuses.length !== 1 ||
      workStatusAt(world, work.id, cutoff)?.status !== "active"
    )
      continue;
    if (
      completedMonthsBetween(work.startedAt, world.currentDate) >=
      requiredYears * 12
    )
      return true;
  }
  return false;
}

/** R16: actual recorded appointees serve while the confirmation path is unwired.
 * The appointment remains distinct from an actual chamber confirmation.
 */
export function ensureOpeningClemencyBoardAppointments(world: World): World {
  let next = world;
  for (const profile of clemencyBoardAppointmentProfiles) {
    if (
      profile.seatCount === null ||
      profile.requiresSenateConfirmation === null ||
      profile.experienceYears === null
    )
      continue;
    const office = governorOfficeForJurisdiction(next, profile.jurisdictionKey);
    if (!office || !next.people[office.holderPersonId]) continue;
    const boardKey = organizationKey(profile);
    // No qualifying advocacy organization/list is bound yet. Keep its required
    // capacity open instead of substituting an ordinary nominee for that route.
    const reservedForAdvocacy =
      profile.victimAdvocacyNomination &&
      next.currentDate > profile.victimAdvocacyNomination.appointmentsAfter
        ? profile.victimAdvocacyNomination.minimumMembers
        : 0;
    const ordinarySeatCount = profile.seatCount - reservedForAdvocacy;
    for (let ordinal = 1; ordinal <= ordinarySeatCount; ordinal++) {
      const seatKey = `${boardKey}:seat:${ordinal}`;
      const nominationKey = `${seatKey}:nomination`;
      if (
        next.history.events.some((event) => event.stableKey === nominationKey)
      )
        continue;
      const alreadyNamed = new Set(
        next.history.events
          .filter(
            (event) =>
              event.type === CLEMENCY_BOARD_NOMINATED &&
              event.tags.includes(`board-key:${boardKey}`),
          )
          .flatMap((event) =>
            event.participants
              .filter((person) => person.role === "agency:nominee")
              .map((person) => person.personId),
          ),
      );
      const circle = appointmentCircle(next, office.holderPersonId, []);
      const chosen = chooseAppointee(next, {
        stableKey: nominationKey,
        appointerPersonId: office.holderPersonId,
        post: { officeKey: seatKey, title: `${profile.label} member` },
        circle,
        eligible: (personId) =>
          !alreadyNamed.has(personId) &&
          !next.history.personDeaths.some(
            (death) =>
              death.personId === personId && death.diedAt <= next.currentDate,
          ) &&
          recordedQualification(next, personId, profile),
      });
      if (!chosen) continue;
      next = chosen.world;
      if (
        !next.history.organizations.some(
          (organization) => organization.stableKey === boardKey,
        )
      ) {
        next = createOrganization(next, {
          stableKey: boardKey,
          formedAt: next.currentDate,
          provenance: {
            // This is the opening's institution construction, not an assertion
            // that the later-acquired source was recorded on this earlier date.
            // The acquired sources stay attached to the saved nomination.
            kind: "generated",
            generatorKey: `clemency-board-opening:${table.asOf}:${boardKey}`,
          },
          initialProfile: {
            name: profile.label,
            classification: "service:clemency-board",
            locationJurisdictionId: office.jurisdictionId,
          },
        });
      }
      const organization = next.history.organizations.find(
        (row) => row.stableKey === boardKey,
      )!;
      next = recordWorldEvent(next, {
        stableKey: nominationKey,
        type: CLEMENCY_BOARD_NOMINATED,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: office.jurisdictionId,
        involvedEntityIds: [
          office.holderPersonId,
          chosen.personId,
          organization.id,
        ],
        participants: [
          {
            personId: office.holderPersonId,
            role: "agency:appointer",
            detail: office.title,
          },
          {
            personId: chosen.personId,
            role: "agency:nominee",
            detail: profile.label,
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          "clemency-board-appointments-v1",
          `board-key:${boardKey}`,
          `seat:${ordinal}`,
          `appointment-decision:${chosen.decisionTraceId}`,
          "appointment-status:nominated-pending",
          ...profile.sources.map((source) => `source:${source.citation}`),
        ],
        summary: `${profile.label}: a qualified nominee awaits the legally required appointment completion; the nominee is not seated.`,
        context: {
          location: null,
          socialContext: profile.label,
          pressure: null,
          choice: "Nominate",
          motivation: chosen.reasons.join(" "),
          immediateReaction: "Pending; no board vote or active membership.",
        },
      });
    }
  }
  return seatRecordedClemencyBoardAppointees(next);
}

/** CTO October 2 08:06: an appointed member serves pending confirmation.
 * No person or successful confirmation is manufactured by this saved-record join.
 */
export function seatRecordedClemencyBoardAppointees(world: World): World {
  let next = world;
  for (const nomination of world.history.events) {
    if (
      nomination.type !== CLEMENCY_BOARD_NOMINATED ||
      nomination.occurredAt > world.currentDate ||
      nomination.recordedAt > world.currentDate
    )
      continue;
    const boardKey = nomination.tags
      .find((tag) => tag.startsWith("board-key:"))
      ?.slice("board-key:".length);
    const nomineeId = nomination.participants.find(
      (row) => row.role === "agency:nominee",
    )?.personId;
    const appointerId = nomination.participants.find(
      (row) => row.role === "agency:appointer",
    )?.personId;
    const traceId = nomination.tags
      .find((tag) => tag.startsWith("appointment-decision:"))
      ?.slice("appointment-decision:".length);
    const trace = next.history.decisionTraces.find((row) => row.id === traceId);
    const board = next.history.organizations.find(
      (row) => row.stableKey === boardKey,
    );
    if (
      !board ||
      !nomineeId ||
      !appointerId ||
      !next.people[nomineeId] ||
      !next.people[appointerId] ||
      next.history.personDeaths.some(
        (row) => row.personId === nomineeId && row.diedAt <= next.currentDate,
      ) ||
      !trace ||
      trace.sequence >= nomination.sequence ||
      trace.recordedAt > nomination.recordedAt ||
      trace.context.decisionType !== "appointment.choose-appointee" ||
      trace.context.actorPersonId !== appointerId ||
      trace.selectedOptionKey !== `person:${nomineeId}`
    )
      continue;
    const stableKey = `${nomination.stableKey}:membership`;
    if (
      next.history.organizationParticipations.some(
        (row) => row.stableKey === stableKey,
      )
    )
      continue;
    const appointmentKey = `${nomination.stableKey}:appointed`;
    const existing = next.history.events.find(
      (event) => event.stableKey === appointmentKey,
    );
    if (!existing)
      next = recordWorldEvent(next, {
        stableKey: appointmentKey,
        type: CLEMENCY_BOARD_APPOINTED,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: nomination.jurisdictionId,
        involvedEntityIds: [nomineeId, appointerId, board.id],
        participants: [
          {
            personId: appointerId,
            role: "agency:appointer",
            detail: "Recorded governor appointer",
          },
          {
            personId: nomineeId,
            role: "agency:appointee",
            detail: "Serving pending confirmation",
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          `nomination:${nomination.id}`,
          `board-key:${boardKey}`,
          `appointment-decision:${trace.id}`,
          "appointment-status:serving-pending-confirmation",
        ],
        summary:
          "The recorded board appointee begins service pending confirmation.",
        context: {
          location: null,
          socialContext: "Clemency board appointment",
          pressure: null,
          choice: "Begin service pending confirmation",
          motivation: null,
          immediateReaction: null,
        },
      });
    const appointment = existing ?? next.history.events.at(-1)!;
    next = createOrganizationParticipation(next, {
      stableKey,
      personId: nomineeId,
      organizationId: board.id,
      startedAt: appointment.occurredAt,
      initialStatus: "active",
      kind: "membership:clemency-board",
      roleKind: "member:board",
      context: "Serving pending confirmation; not confirmed by a chamber vote.",
      provenance: { kind: "simulated-event", eventId: appointment.id },
    });
  }
  return next;
}
