import { createWorkRelationship, recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import { LIVING_WORLD_KEYS } from "./opening";

/**
 * A seat in Congress held by the person being played, as work.
 *
 * The seat itself is the tenure event the Congress roll reads. That record is
 * not a job, so a member who took the seat kept earning only what their old
 * job paid. This adds the job, paid through the same office salary every
 * public office uses.
 *
 * Other jobs are left as they are. Whether a member may keep them, and how
 * much outside pay is allowed, is research question
 * outside-work-while-in-office; nothing ends them until that rule is on file.
 *
 * Only the person being played gets one. Nobody else's pay is simulated, and
 * a job for each of 535 members would be records nothing reads.
 */
export const CONGRESS_MEMBER_WORK_KIND = "employment:congress-member" as const;

function seatWorkPrefix(seatKey: string): string {
  return `${LIVING_WORLD_KEYS.seat(seatKey)}:member-work:`;
}

function activeSeatWork(world: World, seatKey: string) {
  const prefix = seatWorkPrefix(seatKey);
  return world.history.workRelationships.filter(
    (work) =>
      work.kind === CONGRESS_MEMBER_WORK_KIND &&
      work.stableKey.startsWith(prefix) &&
      workStatusAt(world, work.id)?.status === "active",
  );
}

/**
 * Ends the seat's job for whoever held it, unless they hold the seat again.
 * Idempotent: an ended job is not ended twice.
 */
export function endCongressSeatWork(
  world: World,
  input: {
    readonly seatKey: string;
    readonly continuingPersonId: EntityId | null;
    readonly effectiveAt: IsoDate;
    readonly sourceEventId: EntityId | null;
  },
): World {
  let next = world;
  for (const work of activeSeatWork(world, input.seatKey)) {
    if (work.personId === input.continuingPersonId) continue;
    const status = workStatusAt(next, work.id)!;
    next = recordWorkStatus(next, {
      stableKey: `${work.stableKey}:ended:${input.effectiveAt}`,
      workRelationshipId: work.id,
      effectiveAt: input.effectiveAt,
      status: "ended",
      reason: "The term in this seat ended.",
      supersedesStatusId: status.id,
      provenance: input.sourceEventId
        ? { kind: "simulated-event", eventId: input.sourceEventId }
        : { kind: "authored", note: "The seat's next term began." },
    });
  }
  return next;
}

/**
 * Starts the seat's job for the member being played. A member returned for
 * another term keeps the job they have.
 */
export function takeCongressSeatWork(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly seatKey: string;
    readonly title: string;
    readonly chamberOrganizationId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly startsAt: IsoDate;
    readonly tenureEventId: EntityId;
  },
): World {
  if (
    activeSeatWork(world, input.seatKey).some(
      (work) => work.personId === input.personId,
    )
  )
    return world;
  const stableKey = `${seatWorkPrefix(input.seatKey)}${input.personId}:${input.startsAt}`;
  if (world.history.workRelationships.some((w) => w.stableKey === stableKey))
    return world;
  return createWorkRelationship(world, {
    stableKey,
    personId: input.personId,
    organizationId: input.chamberOrganizationId,
    startedAt: input.startsAt,
    initialStatus: "active",
    kind: CONGRESS_MEMBER_WORK_KIND,
    compensation: "paid",
    authority: "shared",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: input.tenureEventId },
    initialRole: {
      title: input.title,
      occupationClassification: "service:elected-legislator",
      locationJurisdictionId: input.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 50, maximumHours: 70 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: input.jurisdictionId,
      },
    },
  });
}
