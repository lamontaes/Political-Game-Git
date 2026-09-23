import { describe, expect, it } from "vitest";
import {
  crisisRecords,
  currentGovernorOf,
  declareHazardEpisode,
  decideStateDisasterRequest,
  disasterHandlingWeight,
  disasterResponses,
  householdLocationAt,
  recordKinship,
  rememberedDisasterHandling,
  searchLifePlaces,
  UNRESEARCHED_DISASTER_HANDLING,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

const SLOW = 900_000;

/**
 * The Nevada replay: a governor let request after request for federal help
 * lapse, and the only consequence was a line in the paper. Played as the
 * sitting governor of Nevada, a major flood either gets a request or lapses.
 */
function asNevadaGovernorAfterAFlood() {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-NV",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "disaster-handling-nv",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const governor = currentGovernorOf(game.world, "NV")!;
  // A seated governor is generated without relatives on record, so this
  // fixture gives them one: the life that was just generated is their
  // sibling. Authored fixture relationship, not a generated family.
  const related = recordKinship(game.world, {
    stableKey: "disaster-handling-nv:sibling",
    personIds: [governor.personId, game.playerPersonId],
    establishedAt: game.world.currentDate,
    kind: "collateral:sibling",
    provenance: { kind: "authored", note: "Test fixture relative." },
  });
  const asGovernor: World = {
    ...related,
    control: { kind: "person", personId: governor.personId },
  };
  const home = householdLocationAt(
    asGovernor,
    asGovernor.history.households[0]!.id,
  )!.jurisdictionId;
  const world = declareHazardEpisode(asGovernor, {
    stableKey: "nevada-flood",
    family: "flood",
    magnitude: "major",
    stateUsps: "NV",
    jurisdictionIds: [home],
    durationDays: 4,
    basis: "Declared test episode; not a local hazard prediction.",
    sourceReference: null,
  });
  const episodeId = crisisRecords(world).find(
    (record) => record.kind === "hazard-episode",
  )!.id;
  return { world, episodeId, governorId: governor.personId };
}

function reactionsTo(world: World, governorId: EntityId) {
  const traces = world.history.decisionTraces.filter((trace) =>
    trace.stableKey.includes(":handling-reaction:"),
  );
  const said = world.history.events.filter(
    (event) =>
      event.type.startsWith("crisis.handling-") &&
      event.participants.some((entry) => entry.personId === governorId),
  );
  return { traces, said };
}

describe("a governor's handling of a disaster is noticed", () => {
  const { world, episodeId, governorId } = asNevadaGovernorAfterAFlood();

  it(
    "letting the request for federal help lapse counts against them",
    () => {
      const lapsed = passOrdinaryDays(world, 35);
      const response = disasterResponses(lapsed, episodeId).find(
        (record) => record.stage === "no-state-request",
      )!;
      expect(response.decidedBy).toBe("lapse");
      const remembered = rememberedDisasterHandling(lapsed, governorId);
      expect(remembered.map((judgment) => judgment.verdict)).toEqual([
        "failed",
      ]);
      expect(
        disasterHandlingWeight(lapsed, governorId, lapsed.currentDate),
      ).toBe(UNRESEARCHED_DISASTER_HANDLING.laterContestWeight.failed);
      // Everybody around them who read it was asked what they thought, and
      // whatever each one said to them is on the record with its effect.
      const { traces, said } = reactionsTo(lapsed, governorId);
      // An empty loop below would pass on nothing, so the readers must exist.
      expect(traces.length).toBeGreaterThan(0);
      for (const event of said) {
        expect([
          "crisis.handling-criticize",
          "crisis.handling-defend",
        ]).toContain(event.type);
        const interaction = lapsed.history.relationshipInteractions.find(
          (row) => row.eventId === event.id,
        )!;
        expect(interaction.change).toBe(
          event.type === "crisis.handling-criticize"
            ? "strained"
            : "maintained",
        );
      }
      expect(said.length).toBeLessThanOrEqual(traces.length);
    },
    SLOW,
  );

  it(
    "asking for the help the damage called for counts for them",
    () => {
      const waited = passOrdinaryDays(world, 5);
      const asked = decideStateDisasterRequest(waited, episodeId, "request");
      expect(
        rememberedDisasterHandling(asked, governorId).map(
          (judgment) => judgment.verdict,
        ),
      ).toEqual(["sound"]);
      expect(disasterHandlingWeight(asked, governorId, asked.currentDate)).toBe(
        UNRESEARCHED_DISASTER_HANDLING.laterContestWeight.sound,
      );
      // The people around them react on the next weekly news sweep.
      const read = passOrdinaryDays(asked, 8);
      const { traces, said } = reactionsTo(read, governorId);
      expect(traces.length).toBeGreaterThan(0);
      for (const event of said)
        expect(event.type).toBe("crisis.handling-praise");
    },
    SLOW,
  );
});
