import table from "../../../data/research/clemency/board-appointments-2026.json" with { type: "json" };
import { completedMonthsBetween } from "../dates";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { createOrganization } from "../life";
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
      profile.experienceYears * 12
    )
      return true;
  }
  return false;
}

/** R16 first saved stage: an actual governor nominates an actual qualified person.
 * Confirmation has no nomination-bound shared chamber adapter yet, so this writer
 * NEVER creates active participation or speaks for an unseated board.
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
    for (let ordinal = 1; ordinal <= profile.seatCount; ordinal++) {
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
  return next;
}
