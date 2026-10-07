import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import {
  ensureDistrictOfColumbiaCouncilOpening,
  DC_GOVERNMENT_KEY,
} from "./nationwide-world/district-of-columbia-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import {
  introduceMeasure,
  measureActions,
  measureAmendments,
  measurePosition,
  placeMeasureOnCalendar,
} from "./legislation";
import { nextMeasureNumbering } from "./measure-numbering";
import { chamberByKey } from "./legislature-rules";
import { dcCouncilSittingHandler } from "./dc-council-sittings";
import { SeededRng } from "./rng";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPublicPosition,
} from "./politics";
import * as amendmentAuthors from "./governing/amendment-authors";
import * as chamberProcedure from "./governing/chamber-procedure";
import * as councilLawmaking from "./governing/council-lawmaking";
import { mayAnswerQuestion } from "./governing/question-authority";

const seed = "cto0946-dc-amendment-wiring-20261002";
const home =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;

function fixture(playerSponsored = false) {
  const small = smallWorld({ place: home, people: 4, seed });
  let world = small.world;
  // Reuse the real DC scenario only for its canonical jurisdictions. The
  // controlled person's home remains the seed-drawn jurisdiction above.
  const dc = createScenarioWorld(
    `${seed}:dc-context`,
    requireLifePlace("1150000").context,
    { peopleCount: 4 },
  );
  for (const id of dc.jurisdictionOrder)
    world = ensureJurisdiction(world, dc.jurisdictions[id]!);
  world = ensureDistrictOfColumbiaCouncilOpening(world, [small.personId]);
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) throw new Error("Expected canonical DC municipal rule pack");
  const pack = rules.pack;
  const chamber = chamberByKey(pack, "council");
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
  // Authored support isolates reading timing; it does not assert spontaneous
  // amendment behavior or amendability in the production DC rules.
  for (const seat of seats) {
    world = recordPrivateBelief(world, {
      stableKey: `${seed}:${seat.personId}:support`,
      personId: seat.personId,
      propositionId: proposition.id,
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    world = recordPublicPosition(world, {
      stableKey: `${seed}:${seat.personId}:public`,
      personId: seat.personId,
      propositionId: proposition.id,
      statedAt: world.currentDate,
      stance: "support",
      statement: "Authored support for the reading fixture.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
  }
  world = introduceMeasure(world, {
    stableKey: `${seed}:received:${playerSponsored ? "player" : "npc"}`,
    jurisdictionId,
    rulePackId: pack.packId,
    ...nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamber,
      rulePackId: pack.packId,
    }),
    shortTitle: "Received DC reading fixture",
    summary: "Authored measure for the existing DC sitting.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: playerSponsored ? small.personId : seats[0]!.personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${measure.stableKey}:agenda`,
    measureId: measure.id,
  });
  return { world, measure, seats, chamber, pack };
}

afterEach(() => vi.restoreAllMocks());

describe(`DC amendment reading activity (seed-drawn home ${home})`, () => {
  it("keeps the canonical unread amendment rule closed while recording a reading", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const setup = fixture();
    const position = measurePosition(setup.world, setup.measure.id);
    const stage = setup.chamber.floorStages.find(
      (row) => row.stageKey === position.floorStageKey,
    )!;
    expect(
      chamberProcedure.floorStageTakesAmendments(setup.chamber, stage),
    ).toBe(false);
    const offered = vi.spyOn(amendmentAuthors, "offerPlannedAmendment");
    const before = measureActions(setup.world, setup.measure.id).length;
    const next = dcCouncilSittingHandler(setup.world).world;
    expect(offered).not.toHaveBeenCalled();
    expect(measureActions(next, setup.measure.id).length).toBeGreaterThan(
      before,
    );
    expect(measureAmendments(next, setup.measure.id)).toHaveLength(0);
  });

  it("checks authored wiring before the reading vote, then waits for Reading2 without offering again", () => {
    const setup = fixture();
    const position = measurePosition(setup.world, setup.measure.id);
    const stage = setup.chamber.floorStages.find(
      (row) => row.stageKey === position.floorStageKey,
    )!;
    // Controlled wiring boundary only: neither spy changes canonical rules,
    // records an amendment, nor proves a lawful positive amendment outcome.
    vi.spyOn(chamberProcedure, "floorStageTakesAmendments").mockReturnValue(
      true,
    );
    const offered = vi
      .spyOn(amendmentAuthors, "offerPlannedAmendment")
      .mockImplementation((world) => world);
    const voted = vi.spyOn(councilLawmaking, "decideCouncilVote");
    const next = dcCouncilSittingHandler(setup.world).world;
    const callIndex = offered.mock.calls.findIndex(
      ([, input]) => input.measureId === setup.measure.id,
    );
    expect(callIndex).toBeGreaterThanOrEqual(0);
    const input = offered.mock.calls[callIndex]![1];
    expect(input.chamber).toEqual(setup.chamber);
    expect(input.stage).toEqual(stage);
    expect(input.members.map((row) => row.personId).sort()).toEqual(
      setup.seats.map((row) => row.personId).sort(),
    );
    expect(
      input.members.every(
        (row) =>
          row.personId !== null && Boolean(setup.world.people[row.personId]),
      ),
    ).toBe(true);
    expect(input.nonpartisan).toBe(false);
    expect(input.admissible).toEqual(expect.any(Function));
    expect(offered.mock.invocationCallOrder[callIndex]).toBeLessThan(
      voted.mock.invocationCallOrder[0]!,
    );
    const after = measurePosition(next, setup.measure.id);
    expect(after.phase).toBe("on-floor");
    expect(after.floorStageKey).not.toBe(stage.stageKey);
    expect(after.earliestNextFloorDate! > next.currentDate).toBe(true);
    const actions = measureActions(next, setup.measure.id).length;
    offered.mockClear();
    const waiting = dcCouncilSittingHandler(next).world;
    expect(offered).not.toHaveBeenCalled();
    expect(measureActions(waiting, setup.measure.id)).toHaveLength(actions);
    expect(measureAmendments(waiting, setup.measure.id)).toHaveLength(0);
  });

  it("leaves player-sponsored acts outside NPC amendment activity even at the authored permission boundary", () => {
    const setup = fixture(true);
    vi.spyOn(chamberProcedure, "floorStageTakesAmendments").mockReturnValue(
      true,
    );
    const offered = vi
      .spyOn(amendmentAuthors, "offerPlannedAmendment")
      .mockImplementation((world) => world);
    const before = measureActions(setup.world, setup.measure.id);
    const next = dcCouncilSittingHandler(setup.world).world;
    expect(offered).not.toHaveBeenCalled();
    expect(measureActions(next, setup.measure.id)).toEqual(before);
  });
});
