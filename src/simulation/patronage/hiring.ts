import { recordFavor } from "../favors";
import { organizationProfileAt } from "../life-queries";
import { personName } from "../people";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { APPOINTMENTS_VERSION } from "./appointments";

/**
 * A job given is a favor (Research 1, build step 6; Lamontae's 9:35 p.m.
 * note, September 28, 2026: power grows from control of anything people
 * depend on, private jobs included).
 *
 * When a town employer hires someone in play, the person who runs that
 * employer gave them the job, and the hire is written as a favor from that
 * person through the one favor record. An employer that hires much of a town
 * therefore collects debts across many households, which is how an observer
 * would come to call it a company town. The code sets no such state: it only
 * writes who gave whom a job.
 *
 * A public employer's hire is never a favor. Since Rutan v. Republican Party
 * of Illinois, 497 U.S. 62 (June 21, 1990), hiring, promotion, transfer and
 * recall of public employees on the basis of party affiliation or support
 * violates the First Amendment everywhere in the country, except in
 * policymaking and confidential posts (read by curl from the opinion's text at
 * law.cornell.edu). A town's public jobs are rank-and-file posts, so a public
 * employer's head does not give them away. Policymaking posts are filled by
 * appointment, and those are written as favors (`appointments.ts`). The game
 * starts after 1990, so the rule applies in every game; it is exact because
 * it is a landmark ruling, not an estimate.
 */

const HIRING_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

/** Organization kinds whose jobs are public. */
const PUBLIC_CLASSIFICATIONS: readonly string[] = [
  "sector:federal-government-office",
  "sector:local-government-office",
  "sector:state-government-office",
  "service:fire",
  "service:police",
  "service:public-health",
  "service:school",
];

export function isPublicEmployer(world: World, organizationId: EntityId) {
  const profile = organizationProfileAt(world, organizationId);
  return !!profile && PUBLIC_CLASSIFICATIONS.includes(profile.classification);
}

/**
 * Who runs each organization today: the holder of its active job that
 * directs others. One pass over the work records.
 */
function directorsOf(
  world: World,
  organizationIds: ReadonlySet<EntityId>,
): Map<EntityId, EntityId> {
  const latest = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= world.currentDate)
      latest.set(row.workRelationshipId, row.status);
  const directors = new Map<EntityId, EntityId>();
  for (const relationship of world.history.workRelationships) {
    if (
      !relationship.organizationId ||
      !organizationIds.has(relationship.organizationId) ||
      relationship.authority !== "directs-others" ||
      latest.get(relationship.id) !== "active"
    )
      continue;
    const current = directors.get(relationship.organizationId);
    // The longest-serving head runs it when two hold the title.
    if (!current || relationship.personId.localeCompare(current) < 0)
      directors.set(relationship.organizationId, relationship.personId);
  }
  return directors;
}

/**
 * Writes a favor from the person who runs each private employer to everyone
 * it hired in this round. `jobKeySuffix` names the round's jobs, as
 * `fillTownJobs` keys them.
 */
export function recordHiringFavors(
  world: World,
  town: EntityId,
  jobKeyPrefix: string,
  jobKeySuffix: string,
): World {
  const hires = world.history.workRelationships.filter(
    (row) =>
      row.stableKey.startsWith(jobKeyPrefix) &&
      row.stableKey.endsWith(jobKeySuffix) &&
      row.organizationId !== null &&
      row.startedAt === world.currentDate,
  );
  if (hires.length === 0) return world;
  const organizations = new Set(hires.map((row) => row.organizationId!));
  const directors = directorsOf(world, organizations);
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  let next = world;
  for (const hire of hires) {
    const organizationId = hire.organizationId!;
    const director = directors.get(organizationId);
    if (
      !director ||
      director === hire.personId ||
      !next.people[director] ||
      dead.has(director) ||
      isPublicEmployer(next, organizationId)
    )
      continue;
    const profile = organizationProfileAt(next, organizationId);
    const employerName = profile?.name ?? "the business";
    const stableKey = `${APPOINTMENTS_VERSION}:hire:${hire.id}`;
    next = recordWorldEvent(next, {
      stableKey,
      type: "patronage.hired",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [director, hire.personId, organizationId],
      participants: [
        { personId: director, role: "focus:actor", detail: employerName },
        { personId: hire.personId, role: "focus:subject", detail: "Hired" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [APPOINTMENTS_VERSION, "favor:private-job"],
      summary: `${personName(next.people[director]!)} hired ${personName(next.people[hire.personId]!)} at ${employerName}.`,
      context: HIRING_CONTEXT,
    });
    next = recordFavor(next, {
      stableKey: `${stableKey}:favor`,
      givenAt: next.currentDate,
      giverPersonId: director,
      receiverPersonId: hire.personId,
      kind: "private:job",
      description: `hired them at ${employerName}`,
      eventId: next.history.events.at(-1)!.id,
      subject: { kind: "organization", organizationId },
      // Work given for work done: whoever hires expects the job done and some
      // loyalty to the place.
      motive: "trade",
      weight: "great",
      audience: "limited",
      witnessPersonIds: [],
      inReturnForFavorId: null,
      undertakingId: null,
    });
  }
  return next;
}
