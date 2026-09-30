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
const ELIGIBILITY_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
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
      return "Your former office must confirm whether you can take this lobbying job.";
    const law = lawInForce(world, state.id, proposition.id, on);
    if (!law)
      return "Your former office must confirm whether you can take this lobbying job.";
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
          legislatorMonths: number | null;
          executiveMonths?: number;
          startAt: string;
          basis: string;
        }
      >
    )[stateKey!];
    const startingLaw = law.measureId.startsWith("starting-law:");
    if (!startingLaw && law.answer === "no") continue;
    if (startingLaw && work.kind !== "employment:legislative-member") {
      // Executive restrictions are independent laws. Their recorded role,
      // target agency/matter and effective-date scope cannot be inferred from
      // a generic employer classification or the legislature's starting answer.
      const rules =
        research.startingExecutiveRules[
          stateKey! as keyof typeof research.startingExecutiveRules
        ];
      return rules?.rules.length
        ? "Your former office must confirm which lobbying work you may do under its post-employment restrictions."
        : "Your former office must confirm whether you can take this lobbying job.";
    }
    const months = terms?.values.coolingMonths ?? starting?.legislatorMonths;
    if (typeof months !== "number")
      return "Your former office must confirm when you can take this lobbying job.";
    if (startingLaw && law.answer === "no") continue;
    const departure = workStatusAt(world, work.id)!.effectiveAt;
    let startsAt = departure;
    const mode = terms ? "leaving-office" : starting?.startAt;
    if (mode !== "leaving-office") {
      const expiry = world.history.futureDueItems.find(
        (d) =>
          d.transitionKey.includes("term-expiry") &&
          d.entityIds.includes(work.id),
      )?.dueAt;
      if (mode === "term-end") {
        if (!expiry)
          return "Your former office must confirm when your elected term ends before you take this lobbying job.";
        if (expiry > startsAt) startsAt = expiry;
      }
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
        else if (!end)
          return "Your former office must confirm the legislative session’s end date before you take this lobbying job.";
      }
    }
    // North Carolina uses the later of departure plus six months or session
    // close, rather than adding six more months after session close.
    const until =
      startingLaw && mode === "later-of-departure-and-session-end"
        ? [startsAt, addCalendarMonths(departure, months)].sort().at(-1)!
        : addCalendarMonths(startsAt, months);
    if (
      on < until &&
      startingLaw &&
      mode === "later-of-departure-and-session-end"
    )
      return `You can't take this lobbying job until ${ELIGIBILITY_DATE.format(new Date(`${until}T00:00:00Z`))}: ${months} months must pass after you leave office, and the legislative session must have ended.`;
    if (on < until)
      return `You can't take this lobbying job until ${ELIGIBILITY_DATE.format(new Date(`${until}T00:00:00Z`))}: state law requires a ${months}-month waiting period after ${mode === "term-end" ? "your term ends" : mode?.includes("session") ? "the legislative session ends" : "you leave office"}.`;
  }
  return null;
}
