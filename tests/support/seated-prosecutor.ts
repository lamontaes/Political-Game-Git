import {
  createOrganization,
  createWorkRelationship,
} from "../../src/simulation/life";
import type { EntityId, World } from "../../src/simulation/types";

/**
 * Seats one recorded prosecutor for a venue in a small world: a government
 * office, an executive appointment and a prosecutor role covering the
 * jurisdiction. A case is charged or declined only by a recorded prosecutor,
 * so a test that follows a case past its charge decision needs one. The
 * prosecutor is another resident, never the defendant or the player.
 */
export function seatProsecutor(
  world: World,
  defendantId: EntityId,
  jurisdictionId: World["people"][string]["homeJurisdictionId"],
): { readonly world: World; readonly personId: EntityId } {
  const person = Object.values(world.people).find(
    (candidate) =>
      candidate.id !== defendantId &&
      (world.control.kind !== "person" ||
        candidate.id !== world.control.personId),
  );
  if (!person) throw new Error("No resident can be seated as prosecutor.");
  const provenance = {
    kind: "authored" as const,
    note: "Controlled recorded prosecutor appointment fixture; no opening official is invented.",
  };
  let next = createOrganization(world, {
    stableKey: "fixture:prosecutor:office",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded prosecution office",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createWorkRelationship(next, {
    stableKey: "fixture:prosecutor:appointment",
    personId: person.id,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "unpaid",
    authority: "self-directed",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Prosecutor",
      occupationClassification: "profession:prosecutor",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 0 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  return { world: next, personId: person.id };
}
