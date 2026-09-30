import { ageOnDate } from "../../src/simulation/dates";
import { addCalendarMonths } from "../../src/simulation/justice/jail-terms";
import { recordWorldEvent } from "../../src/simulation/world";
import { recordWorkStatus } from "../../src/simulation/life";
import { workStatusAt } from "../../src/simulation/life-queries";
import { principledLeaning } from "../../src/simulation/governing/officeholder-principles";
import {
  COOLING_OFF_QUESTION,
  officeState,
} from "../../src/simulation/lobbying-cooling-off";
import { FEDERAL_MINIMUM_QUESTION } from "../../src/simulation/justice/federal-mandatory-minimums";
import { DISASTER_COST_SHARING_QUESTION } from "../../src/simulation/governing/disaster-cost-sharing";
import { declareHazardEpisode } from "../../src/simulation/crisis/disaster";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import type { EntityId, World } from "../../src/simulation/types";

/** Explicit matched conditions, never inferred guilt, retirement or hazard incidence. */
export function prepareCommonCondition(
  world: World,
  law: string,
  stateKey: string,
  townId: EntityId,
): { world: World; condition: string | null } {
  if (law === COOLING_OFF_QUESTION) {
    const question = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === law,
    )!;
    const office = world.history.workRelationships.find(
      (w) =>
        w.kind === "employment:legislative-member" &&
        officeState(world, w) === stateKey &&
        workStatusAt(world, w.id)?.status === "active" &&
        principledLeaning(world, w.personId, question.id).score <= 0,
    );
    if (!office)
      throw Error(
        "No recorded member whose own views permit the matched post-office lobbying comparison",
      );
    const condition =
      "Matched fictional departure of one actual sitting member before either arm. Their recorded views permit lobbying; this does not estimate retirement incidence.";
    return {
      condition,
      world: recordWorkStatus(world, {
        stableKey: "laws-proof:common-office-departure",
        workRelationshipId: office.id,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: condition,
        provenance: { kind: "authored", note: condition },
        supersedesStatusId: workStatusAt(world, office.id)!.id,
      }),
    };
  }
  if (law === FEDERAL_MINIMUM_QUESTION) {
    const person = world.personOrder
      .map((id) => world.people[id]!)
      .find(
        (p) =>
          p.homeJurisdictionId === townId &&
          ageOnDate(p.birthDate, world.currentDate) >= 30 &&
          ageOnDate(p.birthDate, world.currentDate) <= 55,
      );
    if (!person)
      throw Error(
        "No actual adult local resident for the matched fictional federal sentence",
      );
    const condition =
      "Matched fictional federal sentence for one actual resident: 500 grams of interstate cocaine trafficking, sentenced 36 months before the common intervention to 60 months. No guilt or crime incidence is inferred from a rate.";
    return {
      condition,
      world: recordWorldEvent(world, {
        stableKey: "laws-proof:common-federal-sentence",
        type: "justice.sentenced",
        occurredAt: addCalendarMonths(world.currentDate, -36),
        recordedAt: world.currentDate,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        involvedEntityIds: [person.id],
        participants: [
          {
            personId: person.id,
            role: "focus:defendant",
            detail: "Defendant in matched fictional sentence",
          },
        ],
        personFactConstraints: [],
        visibility: "limited",
        tags: [
          "justice.sentence:jail",
          "justice.sentence-months:60",
          "justice.cocaine-grams:500",
          "justice.drug-trafficking",
          "justice.interstate-conduct",
        ],
        summary: condition,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: condition,
          immediateReaction: null,
        },
      }),
    };
  }
  return { world, condition: null };
}

export function prepareMatchedHazard(
  world: World,
  law: string,
  stateUsps: string,
  townId: EntityId,
): World {
  return law === DISASTER_COST_SHARING_QUESTION
    ? declareHazardEpisode(world, {
        stableKey: "laws-proof:matched-flood",
        family: "flood",
        magnitude: "catastrophic",
        stateUsps,
        jurisdictionIds: [townId],
        durationDays: 3,
        basis:
          "Explicit matched fictional disaster; this is not a claim of local hazard incidence.",
        sourceReference: null,
      })
    : world;
}
