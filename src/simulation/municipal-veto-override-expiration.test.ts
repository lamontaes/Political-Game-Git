import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createScenarioWorld } from "./demo";
import {
  enrollMeasure,
  introduceMeasure,
  measureActions,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  takeFloorVote,
} from "./legislation";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "./municipal-government";
import {
  actOnCouncilMeasure,
  COUNCIL_ACT_OVERRIDE_DEADLINE,
  councilActOverrideDeadlineHandler,
  municipalExecutiveHolder,
  overrideDeadline,
} from "./municipal-ordinance-procedure";
import { municipalMeasureKey } from "./municipal-public-work";
import { ensureStateExecutiveIncumbent } from "./nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

const seed = "a82-sourced-return-expiration-20261001";
const place = drawRandomPlace(seed, (candidate) => {
  const government = municipalGovernmentForLifePlace(candidate);
  if (!government) return false;
  const rules = municipalRulePackFor(government);
  return (
    rules.ok &&
    rules.evidence === "enacted-text" &&
    rules.pack.executive.vetoOverrideWindow?.kind === "known" &&
    rules.pack.executive.vetoOverrideWindow.value.anchor ===
      "executive-return" &&
    rules.pack.executive.vetoOverrideWindow.value.dayBasis === "CALENDAR"
  );
});

function onDate(world: World, date: string): World {
  const currentMoment = simulationMomentOnLocalDate(world.currentMoment, date);
  return { ...world, currentDate: currentMoment.date, currentMoment };
}

describe(`A82 sourced executive-return caller in ${place.displayName} (${seed})`, () => {
  it("saves the actual return, schedules its sourced expiration and retains it through reload/repeat", () => {
    const government = municipalGovernmentForLifePlace(place)!;
    const rules = municipalRulePackFor(government);
    if (!rules.ok) throw new Error("The sampled source pack is unavailable.");
    const chamber = rules.pack.chambers[0]!;
    if (chamber.seats.kind !== "known")
      throw new Error("Council size is unsourced.");
    let world = createScenarioWorld(seed, place.context, {
      peopleCount: chamber.seats.value,
    });
    world = ensureStateExecutiveIncumbent(
      world,
      world.personOrder[0]!,
      government.state,
    );
    const holder = municipalExecutiveHolder(world, government.key);
    expect(holder).not.toBeNull();
    if (!holder) throw new Error("No actual executive holder is recorded.");
    world = { ...world, control: { kind: "person", personId: holder } };
    // Passage and the player's chosen return are explicit fixture inputs.
    // No executive choice, authority, timing rule or due item is mocked.
    world = introduceMeasure(world, {
      stableKey: municipalMeasureKey(government.key, "Fixture 2"),
      jurisdictionId: place.context.jurisdiction.id,
      rulePackId: rules.pack.packId,
      designation: "Fixture 2",
      shortTitle: "Supplied returned act for expiration",
      summary:
        "Supplied passage; the real executive desk saves the chosen return.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: chamber.chamberKey,
      sponsorPersonId: world.personOrder[0]!,
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    world = placeMeasureOnCalendar(world, {
      stableKey: `${measure.stableKey}:agenda`,
      measureId: measure.id,
    });
    const voters = world.personOrder.slice(0, chamber.seats.value);
    for (const stage of chamber.floorStages) {
      world = onDate(world, addDays(world.currentDate, 40));
      world = takeFloorVote(world, {
        stableKey: `${measure.stableKey}:${stage.stageKey}`,
        measureId: measure.id,
        dispositions: voters.map((personId, index) => ({
          memberKey: `${chamber.chamberKey}:${index + 1}`,
          personId,
          disposition: "yea",
        })),
        provenance: {
          method: "authored-fixture",
          note: "Supplied passage only.",
          sourceEntityIds: [measure.id],
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
    const result = actOnCouncilMeasure(world, {
      governmentKey: government.key,
      measureId: measure.id,
      decision: "return",
      reasons: "The controlled executive chooses to return this supplied act.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const returned = result.world;
    const action = measureActions(returned, measure.id).at(-1)!;
    expect(action.kind).toBe("vetoed");
    expect(action.occurredAt).toBe(returned.currentDate);
    const deadline = overrideDeadline(returned, government.key, measure.id);
    expect(deadline).not.toBeNull();
    if (!deadline)
      throw new Error("The admitted source window did not resolve.");
    const due = returned.history.futureDueItems.filter(
      (item) =>
        item.transitionKey === COUNCIL_ACT_OVERRIDE_DEADLINE &&
        item.entityIds.includes(measure.id),
    );
    expect(due).toHaveLength(1);
    expect(due[0]!.dueAt).toBe(addDays(deadline, 1));
    const loaded = deserializeWorld(serializeWorld(returned));
    expect(overrideDeadline(loaded, government.key, measure.id)).toBe(deadline);
    expect(loaded.history.futureDueItems).toEqual(
      returned.history.futureDueItems,
    );
    const expired = councilActOverrideDeadlineHandler(
      onDate(loaded, due[0]!.dueAt),
      due[0]!,
    ).world;
    expect(measurePosition(expired, measure.id).phase).toBe("failed");
    const repeated = councilActOverrideDeadlineHandler(expired, due[0]!).world;
    expect(measureActions(repeated, measure.id)).toEqual(
      measureActions(expired, measure.id),
    );
  });

  it.todo(
    "a naturally filed NPC act reaches a return and reenactment through ordinary play without supplied passage",
  );
  it.todo(
    "source-backed override timing and actual clerk-receipt or holiday-calendar routes exist throughout all 56 jurisdictions",
  );
});
