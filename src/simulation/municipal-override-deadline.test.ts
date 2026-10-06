import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "./nationwide-world/district-of-columbia-council-opening";
import * as municipalGovernment from "./municipal-government";
import * as procedureWorld from "./legislative-procedure-world";
import { knownRule } from "./legislature-rules";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import {
  actOnCouncilMeasure,
  COUNCIL_ACT_OVERRIDE_DEADLINE,
  municipalExecutiveHolder,
  overrideDeadline,
} from "./municipal-ordinance-procedure";
import {
  enrollMeasure,
  introduceMeasure,
  measureActions,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  takeFloorVote,
} from "./legislation";
import { nextMeasureNumbering } from "./measure-numbering";
import { chamberByKey } from "./legislature-rules";
import { addDays, daysBetween } from "./dates";
import { mayAnswerQuestion } from "./governing/question-authority";
import { SeededRng } from "./rng";
import { advanceWorld } from "./world";
import { composeWorldTimeHandlers } from "./campaigns";
import { ensureStateExecutiveIncumbent } from "./nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "./serialization";

const seed = "cto0955-canonical-municipal-override-window-20261002";
const home =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;

function presentedFixture() {
  const small = smallWorld({ place: home, people: 4, seed });
  let world = small.world;
  const dc = createScenarioWorld(
    `${seed}:dc-context`,
    requireLifePlace("1150000").context,
    { peopleCount: 4 },
  );
  for (const id of dc.jurisdictionOrder)
    world = ensureJurisdiction(world, dc.jurisdictions[id]!);
  world = ensureDistrictOfColumbiaCouncilOpening(world);
  world = ensureStateExecutiveIncumbent(world, small.personId, "DC");
  const government =
    municipalGovernment.municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const compiled = municipalGovernment.municipalRulePackFor(government);
  if (!compiled.ok)
    throw new Error("Expected sourced canonical DC municipal pack");
  const chamber = chamberByKey(compiled.pack, "council");
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(seats).toHaveLength(13);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  )!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => mayAnswerQuestion(world, jurisdictionId, row.id),
  )!;
  expect(proposition).toBeDefined();
  world = introduceMeasure(world, {
    stableKey: `${seed}:received`,
    jurisdictionId,
    rulePackId: compiled.pack.packId,
    ...nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamber,
      rulePackId: compiled.pack.packId,
    }),
    shortTitle: "Received override deadline fixture",
    summary: "Authored act for the existing executive return route.",
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
    expect(position.floorStageKey).toBe(stage.stageKey);
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
  expect(measurePosition(world, measure.id).phase).toBe("awaiting-enrollment");
  world = enrollMeasure(world, {
    stableKey: `${measure.stableKey}:enrolled`,
    measureId: measure.id,
  });
  world = presentMeasureToExecutive(world, {
    stableKey: `${measure.stableKey}:presented`,
    measureId: measure.id,
  });
  const mayor = municipalExecutiveHolder(world, DC_GOVERNMENT_KEY);
  expect(mayor).not.toBeNull();
  return {
    world: { ...world, control: { kind: "person" as const, personId: mayor! } },
    measure,
    government,
  };
}

function returnFixture(setup: ReturnType<typeof presentedFixture>) {
  const result = actOnCouncilMeasure(setup.world, {
    governmentKey: DC_GOVERNMENT_KEY,
    measureId: setup.measure.id,
    decision: "return",
    reasons: "Authored executive return with written reasons.",
  });
  if (!result.ok) throw new Error(result.reason);
  expect(measurePosition(result.world, setup.measure.id).phase).toBe(
    "awaiting-override",
  );
  return result.world;
}

afterEach(() => vi.restoreAllMocks());

describe(`canonical municipal override window (seed-drawn home ${home})`, () => {
  it("dates DC reenactment from the saved return and schedules expiry the following day", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const setup = presentedFixture();
    const world = returnFixture(setup);
    const returned = measureActions(world, setup.measure.id).find(
      (row) => row.kind === "vetoed",
    )!;
    expect(returned).toBeDefined();
    const deadline = overrideDeadline(
      world,
      DC_GOVERNMENT_KEY,
      setup.measure.id,
    );
    expect(deadline).toBe(addDays(returned.occurredAt, 30));
    const due = world.history.futureDueItems.find(
      (row) =>
        row.transitionKey === COUNCIL_ACT_OVERRIDE_DEADLINE &&
        row.entityIds.includes(setup.measure.id),
    )!;
    expect(due).toBeDefined();
    expect(due.dueAt).toBe(addDays(deadline!, 1));
  });

  it("leaves the final reenactment day open and expires only the next day, identically after reopening", () => {
    const setup = presentedFixture();
    const world = returnFixture(setup);
    const deadline = overrideDeadline(
      world,
      DC_GOVERNMENT_KEY,
      setup.measure.id,
    )!;
    const handlers = composeWorldTimeHandlers();
    const onDeadline = advanceWorld(
      world,
      daysBetween(world.currentDate, deadline),
      handlers,
    );
    expect(measurePosition(onDeadline, setup.measure.id).phase).toBe(
      "awaiting-override",
    );
    const expired = advanceWorld(onDeadline, 1, handlers);
    expect(measurePosition(expired, setup.measure.id).phase).not.toBe(
      "awaiting-override",
    );
    const reopened = deserializeWorld(serializeWorld(onDeadline));
    expect(advanceWorld(reopened, 1, handlers)).toEqual(expired);
  });

  it("does not invent a deadline or schedule expiry when the structured window is missing", () => {
    const setup = presentedFixture();
    const pack = procedureWorld.legislativeRulePackForWorld(
      setup.world,
      setup.measure.rulePackId,
    );
    vi.spyOn(procedureWorld, "legislativeRulePackForWorld").mockReturnValue({
      ...pack,
      councilActions: { ...pack.councilActions, overrideWindowDays: undefined },
    });
    const world = returnFixture(setup);
    expect(
      overrideDeadline(world, DC_GOVERNMENT_KEY, setup.measure.id),
    ).toBeNull();
    expect(
      world.history.futureDueItems.some(
        (row) =>
          row.transitionKey === COUNCIL_ACT_OVERRIDE_DEADLINE &&
          row.entityIds.includes(setup.measure.id),
      ),
    ).toBe(false);
  });

  it("reads a controlled structured override window independently of the executive action window", () => {
    const setup = presentedFixture();
    const reading = municipalGovernment.municipalProcedureReading(
      setup.government,
    );
    const pack = procedureWorld.legislativeRulePackForWorld(
      setup.world,
      setup.measure.rulePackId,
    );
    const rule = pack.councilActions?.overrideWindowDays;
    if (rule?.kind !== "known") throw new Error("Expected sourced DC window");
    // Authored contract boundary, not a claim that DC law grants seven days.
    vi.spyOn(procedureWorld, "legislativeRulePackForWorld").mockReturnValue({
      ...pack,
      councilActions: {
        ...pack.councilActions,
        overrideWindowDays: knownRule(7, rule.source),
      },
    });
    const world = returnFixture(setup);
    const returned = measureActions(world, setup.measure.id).find(
      (row) => row.kind === "vetoed",
    )!;
    expect(overrideDeadline(world, DC_GOVERNMENT_KEY, setup.measure.id)).toBe(
      addDays(returned.occurredAt, 7),
    );
    const due = world.history.futureDueItems.find(
      (row) =>
        row.transitionKey === COUNCIL_ACT_OVERRIDE_DEADLINE &&
        row.entityIds.includes(setup.measure.id),
    )!;
    expect(due.dueAt).toBe(addDays(returned.occurredAt, 8));
    expect(
      municipalGovernment.municipalProcedureReading(setup.government).procedure
        .mayoralActionWindow,
    ).toEqual(reading.procedure.mayoralActionWindow);
  });
});
