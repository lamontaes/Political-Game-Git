/** Connect a confirmed federal seat to canonical work history. */

import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../life";
import { activeWorkRelationshipsAt } from "../life-queries";
import type { EntityId, World } from "../types";
import { courtById, seatHolderAt } from "./courts";

const courtOrganizationKey = (courtId: string) => `federal-court:${courtId}`;

/**
 * A confirmed judge gets one court-linked job. Only work that cannot coexist
 * with the new full-time office ends; unrelated flexible work remains recorded.
 */
export function startConfirmedFederalJudicialEmployment(
  world: World,
  input: {
    readonly selectionRecordId: string;
    readonly nomineeId: EntityId;
    readonly courtId: string;
    readonly resultEventId: EntityId;
  },
): World {
  const court = courtById(world, input.courtId);
  const seat = world.judiciary?.selections.find(
    (selection) => selection.recordId === input.selectionRecordId,
  );
  const linkedSeat = seat ? world.judiciary?.seats[seat.seatId] : null;
  if (!court?.level.startsWith("federal-"))
    throw new Error("Confirmed judicial employment needs a federal court.");
  if (
    !linkedSeat ||
    linkedSeat.courtId !== court.courtId ||
    seatHolderAt(world, linkedSeat.seatId)?.personId !== input.nomineeId ||
    !world.history.events.some(
      (event) =>
        event.type === "judicial.commission-issued" &&
        event.tags.includes(`selection:${input.selectionRecordId}`) &&
        event.tags.includes(`result:${input.resultEventId}`) &&
        event.tags.includes(`seat:${linkedSeat.seatId}`),
    )
  )
    throw new Error("Judicial employment needs a commissioned, occupied seat.");
  if (
    !world.history.events.some(
      (event) =>
        event.id === input.resultEventId &&
        event.type === "judicial.senate-result" &&
        event.tags.includes(`selection:${input.selectionRecordId}`) &&
        event.tags.includes("outcome:confirmed"),
    )
  )
    throw new Error("Judicial work needs the confirmed Senate result.");
  const workKey = `judicial-confirmation:${input.selectionRecordId}:employment`;
  if (
    world.history.workRelationships.some((work) => work.stableKey === workKey)
  )
    return world;
  const provenance = {
    kind: "simulated-event" as const,
    eventId: input.resultEventId,
  };
  let next = world;
  for (const { relationship, status, role } of activeWorkRelationshipsAt(
    next,
    input.nomineeId,
  )) {
    const incompatible =
      role.timeDemand.concurrency === "mostly-exclusive" ||
      relationship.kind === "employment:executive-office" ||
      relationship.kind === "employment:legislative-member" ||
      relationship.kind === "employment:congress-member" ||
      relationship.kind === "employment:judicial-office";
    if (!incompatible) continue;
    next = recordWorkStatus(next, {
      stableKey: `${workKey}:end:${relationship.id}`,
      workRelationshipId: relationship.id,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: "Confirmed federal judicial service began.",
      supersedesStatusId: status.id,
      provenance,
    });
  }
  const organizationKey = courtOrganizationKey(court.courtId);
  let organization = next.history.organizations.find(
    (item) => item.stableKey === organizationKey,
  );
  if (!organization) {
    next = createOrganization(next, {
      stableKey: organizationKey,
      formedAt: next.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: court.name,
        classification: "service:federal-court",
        locationJurisdictionId: court.jurisdictionId,
      },
    });
    organization = next.history.organizations.at(-1)!;
  }
  const title =
    linkedSeat?.linkedOfficeId === "us-chief-justice"
      ? "Chief Justice of the United States"
      : court.level === "federal-district"
        ? "United States district judge"
        : court.level === "federal-appellate"
          ? "United States circuit judge"
          : "Justice of the United States";
  return createWorkRelationship(next, {
    stableKey: workKey,
    personId: input.nomineeId,
    organizationId: organization.id,
    startedAt: next.currentDate,
    initialStatus: "active",
    kind: "employment:judicial-office",
    compensation: "paid",
    authority: "self-directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title,
      occupationClassification: "profession:federal-judge",
      locationJurisdictionId: court.jurisdictionId,
      // PLACEHOLDER(wave2): time demand is a game profile, not sourced hours.
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: court.jurisdictionId,
      },
    },
  });
}
