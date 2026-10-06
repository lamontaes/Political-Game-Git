import { createScenarioWorld } from "../../src/simulation/demo";
import { requireLifePlace } from "../../src/simulation/life-places";
import { ensureJurisdiction } from "../../src/simulation/national-election-geography";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "../../src/simulation/nationwide-world/district-of-columbia-council-opening";
import * as municipalGovernment from "../../src/simulation/municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "../../src/simulation/municipal-public-work";
import { municipalExecutiveHolder } from "../../src/simulation/municipal-ordinance-procedure";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  takeFloorVote,
} from "../../src/simulation/legislation";
import { nextMeasureNumbering } from "../../src/simulation/measure-numbering";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import { daysBetween } from "../../src/simulation/dates";
import { mayAnswerQuestion } from "../../src/simulation/governing/question-authority";
import { advanceWorld } from "../../src/simulation/world";
import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { ensureStateExecutiveIncumbent } from "../../src/simulation/nationwide-world/state-executives";
import { openMunicipalBillMatter } from "../../src/simulation/governing/state-governing";
import type { World } from "../../src/simulation/types";

/** Controlled downstream preview: supplied roll calls through actual council
 * writers, with the generated incumbent. This neither seats the new player
 * nor asserts that the new player filed, campaigned, or won an election.
 * No account funding or appropriation is injected by this preview. The
 * ordinary clock still runs its existing work, payments and public records.
 */
export function recordedCouncilBillPreview(
  input: World,
  seed: string,
  options: { readonly openDesk?: boolean } = {},
) {
  if (input.control.kind !== "person")
    throw new Error("Person control is required.");
  let world = input;
  const subject = input.control.personId;
  const dc = createScenarioWorld(
    `${seed}:dc-context`,
    requireLifePlace("1150000").context,
    { peopleCount: 4 },
  );
  for (const id of dc.jurisdictionOrder)
    world = ensureJurisdiction(world, dc.jurisdictions[id]!);
  world = ensureDistrictOfColumbiaCouncilOpening(world);
  world = ensureStateExecutiveIncumbent(world, subject, "DC");
  const government =
    municipalGovernment.municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const compiled = municipalGovernment.municipalRulePackFor(government);
  if (!compiled.ok)
    throw new Error("Expected sourced canonical DC municipal pack");
  const chamber = chamberByKey(compiled.pack, "council");
  if (chamber.seats.kind !== "known")
    throw new Error("No recorded council size.");
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  if (seats.length !== chamber.seats.value)
    throw new Error("The council roster is incomplete.");
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  )!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => mayAnswerQuestion(world, jurisdictionId, row.id),
  )!;
  if (!proposition) throw new Error("No question is within council authority.");
  world = introduceMeasure(world, {
    stableKey: `${seed}:received`,
    jurisdictionId,
    rulePackId: compiled.pack.packId,
    ...nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamber,
      rulePackId: compiled.pack.packId,
    }),
    shortTitle: "Council act for the shared executive desk",
    summary:
      "Supplied council roll calls isolate the shared sign or return route.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: seats[0]!.personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${measure.stableKey}:agenda`,
    measureId: measure.id,
  });
  // Explicit fixture ballots through the real writer, respecting every
  // canonical reading interval. No ballot or legal-rule mock is involved.
  for (const stage of chamber.floorStages) {
    const position = measurePosition(world, measure.id);
    if (position.floorStageKey !== stage.stageKey)
      throw new Error("Unexpected council stage.");
    if (
      position.earliestNextFloorDate &&
      position.earliestNextFloorDate > world.currentDate
    )
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, position.earliestNextFloorDate),
        composeWorldTimeHandlers(),
      );
    world = takeFloorVote(world, {
      stableKey: `${measure.stableKey}:${stage.stageKey}`,
      measureId: measure.id,
      dispositions: seats.map((seat) => ({
        memberKey: `council:${seat.participationId}`,
        personId: seat.personId,
        disposition: "yea" as const,
      })),
      presentMembers: seats.length,
      electedMembers: seats.length,
      provenance: {
        method: "authored-fixture",
        sourceEntityIds: seats.map((seat) => seat.personId),
        note: "Authored unanimous fixture roll call.",
      },
    });
  }

  world = enrollMeasure(world, {
    stableKey: `${measure.stableKey}:enrolled`,
    measureId: measure.id,
  });
  world = presentMeasureToExecutive(world, {
    stableKey: `${measure.stableKey}:presented`,
    measureId: measure.id,
  });
  const mayor = municipalExecutiveHolder(world, DC_GOVERNMENT_KEY);
  if (!mayor) throw new Error("The council has no actual executive.");
  world = { ...world, control: { kind: "person", personId: mayor } };
  if (options.openDesk !== false)
    world = openMunicipalBillMatter(world, measure, DC_GOVERNMENT_KEY);
  return {
    world: { ...world, control: { kind: "person" as const, personId: mayor! } },
    measure,
    government,
  };
}
