import { afterEach, describe, expect, it, vi } from "vitest";
import * as procedureWorld from "./legislative-procedure-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createScenarioWorld } from "./demo";
import { createStableId } from "./ids";
import {
  enrollMeasure,
  introduceMeasure,
  measureActions,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordExecutiveAction,
  takeFloorVote,
} from "./legislation";
import {
  knownRule,
  unknownRule,
  type ExecutiveRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";
import {
  municipalGovernmentForLifePlace,
  municipalGovernments,
  municipalProcedureReading,
  municipalRuleSourceRef,
  municipalRulePackFor,
} from "./municipal-government";
import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";
import { overrideDeadline } from "./municipal-ordinance-procedure";
import { municipalMeasureKey } from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

const SOURCE: RuleSourceRef = {
  authority: "game-profile",
  citation: "A82 controlled override-window reader fixture",
  sourceTitle: "Authored test conditions; not municipal law",
  sourceUrl: null,
  retrievedAt: null,
  verification: "game-profile",
  note: "The window and presentment are supplied test controls, not production research.",
};
type Window = ExecutiveRule["vetoOverrideWindow"];
const calendarWindow = knownRule(
  {
    days: 30,
    dayBasis: "CALENDAR" as const,
    anchor: "executive-return" as const,
  },
  SOURCE,
);

afterEach(() => vi.restoreAllMocks());

const sampledJurisdictions = new Set<string>();
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `a82-saved-override-window:${index}`;
  const place = drawRandomPlace(seed, (candidate) => {
    if (
      !candidate.stateJurisdictionKey ||
      sampledJurisdictions.has(candidate.stateJurisdictionKey)
    )
      return false;
    const government = municipalGovernmentForLifePlace(candidate);
    if (!government) return false;
    const rules = municipalRulePackFor(government);
    return rules.ok && rules.pack.chambers[0]?.seats.kind === "known";
  });
  sampledJurisdictions.add(place.stateJurisdictionKey!);
  return { seed, place };
});

function fixture(
  seed: string,
  place: (typeof samples)[number]["place"],
  window: Window,
) {
  const government = municipalGovernmentForLifePlace(place)!;
  const rules = municipalRulePackFor(government);
  if (!rules.ok)
    throw new Error(rules.missing.map((entry) => entry.reason).join("; "));
  const chamber = rules.pack.chambers[0]!;
  if (chamber.seats.kind !== "known")
    throw new Error("Fixture needs recorded council size.");
  let world = createScenarioWorld(seed, place.context, {
    peopleCount: chamber.seats.value,
  });
  vi.restoreAllMocks();
  const originalResolver = procedureWorld.legislativeRulePackForWorld;
  // The authored window is external test control, never a saved municipal rule.
  // Real measure, passage and return writers still produce every action record.
  const baselinePack = {
    ...rules.pack,
    executive: {
      ...rules.pack.executive,
      presentmentRequired: knownRule(true, SOURCE),
      vetoOverrideWindow: window,
    },
  };
  vi.spyOn(procedureWorld, "legislativeRulePackForWorld").mockImplementation(
    (saved, packId) =>
      packId === baselinePack.packId
        ? baselinePack
        : originalResolver(saved, packId),
  );
  world = introduceMeasure(world, {
    stableKey: municipalMeasureKey(government.key, "Fixture 1"),
    jurisdictionId: place.context.jurisdiction.id,
    rulePackId: baselinePack.packId,
    designation: "Fixture 1",
    shortTitle: "Controlled returned ordinance",
    summary: "Authored timing fixture with supplied passage ballots.",
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
  for (const stage of chamber.floorStages) {
    // Controlled fixture clock; no NPC outcome is sampled or manufactured.
    world = atDate(world, 40);
    world = takeFloorVote(world, {
      stableKey: `${measure.stableKey}:${stage.stageKey}`,
      measureId: measure.id,
      dispositions: world.personOrder.map((personId, index) => ({
        memberKey: `${chamber.chamberKey}:${index + 1}`,
        personId,
        disposition: "yea",
      })),
      provenance: {
        method: "authored-fixture",
        note: "Supplied passage ballots, not member decisions.",
        sourceEntityIds: [measure.id],
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
  expect(measurePosition(world, measure.id).phase).toBe("awaiting-executive");
  const beforeVeto = world;
  world = recordExecutiveAction(world, {
    stableKey: `${measure.stableKey}:return`,
    measureId: measure.id,
    action: "vetoed",
    rationale: "Supplied executive return for timing control.",
  });
  return { world, beforeVeto, measure, government };
}

function atDate(world: World, days: number): World {
  const currentDate = addDays(world.currentDate, days);
  return {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
  };
}

describe.each(samples)(
  "A82 controlled window reader in $place.displayName (seed $seed)",
  ({ seed, place }) => {
    it("reads a controlled calendar window against saved return records at and after its boundary", () => {
      const { world, measure, government } = fixture(
        seed,
        place,
        calendarWindow,
      );
      const deadline = addDays(world.currentDate, 30);
      const read = (saved: World) =>
        overrideDeadline(saved, government.key, measure.id);
      expect(read(world)).toBe(deadline);
      expect(read(atDate(world, 30))).toBe(deadline);
      expect(read(atDate(world, 31))).toBe(deadline);
      // Reload preserves actual action records; the window remains external spy control.
      const loaded = deserializeWorld(serializeWorld(world));
      expect(read(loaded)).toBe(deadline);
      expect(read(atDate(loaded, 31))).toBe(deadline);
      expect(measureActions(loaded, measure.id)).toEqual(
        measureActions(world, measure.id),
      );
    });
    it("requires an actual saved return at or before the current date", () => {
      const { world, beforeVeto, measure, government } = fixture(
        seed,
        place,
        calendarWindow,
      );
      expect(
        overrideDeadline(beforeVeto, government.key, measure.id),
      ).toBeNull();
      expect(
        overrideDeadline(atDate(world, -1), government.key, measure.id),
      ).toBeNull();
      expect(
        overrideDeadline(
          world,
          government.key,
          createStableId("measure", "absent"),
        ),
      ).toBeNull();
    });
    it.each([
      ["missing", undefined],
      [
        "unresolved",
        unknownRule("Fixture has no established override window."),
      ],
      [
        "clerk receipt absent",
        knownRule(
          { days: 30, dayBasis: "CALENDAR", anchor: "clerk-receipt" },
          SOURCE,
        ),
      ],
      [
        "business calendar absent",
        knownRule(
          { days: 10, dayBasis: "BUSINESS", anchor: "executive-return" },
          SOURCE,
        ),
      ],
    ] as const)("leaves %s timing unresolved", (_, window) => {
      const { world, measure, government } = fixture(seed, place, window);
      expect(overrideDeadline(world, government.key, measure.id)).toBeNull();
    });
  },
);

describe("A82 production municipal override-window export and compiler", () => {
  it("preserves each exported window and its exact field-specific evidence", () => {
    const exportedPacks = JSON.parse(
      MUNICIPAL_RULE_PACKS_JSON,
    ) as LegislativeRulePack[];
    const established: string[] = [];
    for (const government of municipalGovernments()) {
      const reading = municipalProcedureReading(government);
      const rules = municipalRulePackFor(government);
      const window = reading.procedure.vetoOverrideWindow;
      if (!window) {
        if (rules.ok)
          expect(rules.pack.executive.vetoOverrideWindow).toBeUndefined();
        continue;
      }
      established.push(government.key);
      expect(rules.ok).toBe(true);
      if (!rules.ok)
        throw new Error("Exported window lacks an executable municipal pack.");
      const fact = reading.facts.find(
        (candidate) =>
          candidate.path === "legislativeProcedure.vetoOverrideWindow",
      );
      expect(fact?.state).toBe("KNOWN");
      expect(fact?.value).toEqual(window);
      const evidence = fact?.evidence?.[0];
      expect(evidence).toBeDefined();
      const source = reading.sources.find(
        (candidate) => candidate.key === evidence?.artifactId,
      );
      expect(source).toBeDefined();
      expect(evidence?.locator.citation).toBeTruthy();
      const compiled = rules.pack.executive.vetoOverrideWindow;
      expect(compiled).toEqual(
        knownRule(
          window,
          municipalRuleSourceRef(reading, "veto override window"),
        ),
      );
      if (compiled?.kind !== "known")
        throw new Error("Exported window was not compiled as known.");
      expect(compiled.source.citation).toBe(evidence?.locator.citation);
      expect(compiled.source.sourceUrl).toBe(source?.url);
      expect(compiled.source.sourceTitle).toBe(source?.title);
      expect(
        exportedPacks.find((pack) => pack.packId === rules.pack.packId)
          ?.executive.vetoOverrideWindow,
      ).toEqual(compiled);
    }
    expect(established.length).toBeGreaterThan(0);
  });
});
