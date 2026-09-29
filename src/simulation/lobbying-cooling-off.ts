import research from "../../data/research/laws/lobbying-cooling-off.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "./life-places";
import { addCalendarMonths } from "./justice/jail-terms";
import type { EntityId, IsoDate, World, WorkRelationship } from "./types";
export const COOLING_OFF_QUESTION =
  "us-policy-positions:government-operations.ban-lobbying-after-office";
export const LOBBYING_EMPLOYER = "enterprise:lobbying-firm";
export const POST_OFFICE_KINDS = new Set([
  "employment:legislative-member",
  "employment:executive-office",
  "employment:state-agency-director",
]);
export function officeState(
  world: World,
  work: WorkRelationship,
): string | null {
  const role = workRoleAt(world, work.id);
  const location =
    role?.locationJurisdictionId ??
    world.people[work.personId]?.homeJurisdictionId;
  if (!location) return null;
  return (
    lifePlaceByJurisdictionId(location)?.stateJurisdictionKey ??
    (world.jurisdictions[location]
      ? stateKeyForJurisdiction(world.jurisdictions[location]!)
      : null)
  );
}
export function departedOffices(
  world: World,
  personId?: EntityId,
): readonly WorkRelationship[] {
  return world.history.workRelationships.filter(
    (w) =>
      (!personId || w.personId === personId) &&
      POST_OFFICE_KINDS.has(w.kind) &&
      workStatusAt(world, w.id)?.status === "ended",
  );
}
/** Reads the actual office and departure dates; no probability assigns eligibility. */
export function lobbyingBar(
  world: World,
  personId: EntityId,
  employerId: EntityId,
  on: IsoDate = world.currentDate,
): string | null {
  if (
    organizationProfileAt(world, employerId)?.classification !==
    LOBBYING_EMPLOYER
  )
    return null;
  for (const work of departedOffices(world, personId)) {
    const stateKey = officeState(world, work);
    const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === COOLING_OFF_QUESTION,
    );
    const employerLocation = organizationProfileAt(
      world,
      employerId,
    )?.locationJurisdictionId;
    const employerState = employerLocation
      ? lifePlaceByJurisdictionId(employerLocation)?.stateJurisdictionKey
      : null;
    if (employerState && stateKey && employerState !== stateKey) continue;
    if (!state || !proposition)
      return "The former office's lobbying eligibility is not recorded.";
    const law = lawInForce(world, state.id, proposition.id, on);
    if (!law)
      return "No recorded law resolves post-office lobbying eligibility.";
    const terms = policyTermsInForce(
      world,
      state.id,
      COOLING_OFF_QUESTION,
      on,
    )?.terms;
    const starting = (
      research.startingPeriods as Record<
        string,
        {
          legislatorMonths: number;
          executiveMonths?: number;
          startAt: string;
          basis: string;
        }
      >
    )[stateKey!];
    const months =
      terms?.values.coolingMonths ??
      (work.kind === "employment:legislative-member"
        ? starting?.legislatorMonths
        : (starting?.executiveMonths ?? starting?.legislatorMonths));
    if (
      law.measureId.startsWith("starting-law:") &&
      law.answer === "no" &&
      (work.kind === "employment:legislative-member" ||
        !starting?.executiveMonths)
    )
      continue;
    if (!law.measureId.startsWith("starting-law:") && law.answer === "no")
      continue;
    if (months === undefined)
      return "The existing statutory cooling-off duration has not been established.";
    const departure = workStatusAt(world, work.id)!.effectiveAt;
    let startsAt = departure;
    const mode = terms ? "leaving-office" : starting?.startAt;
    if (mode !== "leaving-office") {
      const expiry = world.history.futureDueItems.find(
        (d) =>
          d.transitionKey.includes("term-expiry") &&
          d.entityIds.includes(work.id),
      )?.dueAt;
      // The record's expected term end is preferred; if it was never recorded, retain the explicit departure-date estimate in the reason.
      if (mode === "term-end" && expiry && expiry > startsAt) startsAt = expiry;
      if (mode?.includes("session")) {
        const end = world.history.futureDueItems
          .filter(
            (d) =>
              d.jurisdictionId === state.id &&
              /adjourn|session-end/.test(d.transitionKey) &&
              d.dueAt >= departure,
          )
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]?.dueAt;
        if (end && end > startsAt) startsAt = end;
        else if (mode === "next-session-end")
          startsAt = addCalendarMonths(departure, 24);
      }
    }
    const until = addCalendarMonths(startsAt, months);
    if (on < until)
      return `Lobbying is barred until ${until}: ${months} months from ${startsAt}; recorded office ${work.id}, departure ${departure}. ${terms?.reason ?? starting?.basis}`;
  }
  return null;
}
