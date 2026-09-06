import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  jointBody,
  KENTUCKY_CONTEXT,
  legislativeScenarioKeys,
  type LegislativeScenario,
} from "./legislation-scenarios";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  attemptVetoOverride,
  availableMeasureSteps,
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  enrollMeasure,
  introduceMeasure,
  measureActions,
  measureGate,
  measurePosition,
  measureVotes,
  offerFloorAmendment,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordAdjournmentDeath,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
} from "./legislation";
import {
  ALASKA_RULE_PACK,
  ILLINOIS_RULE_PACK,
  KENTUCKY_RULE_PACK,
  LEGISLATIVE_RULE_PACKS,
  MINNESOTA_RULE_PACK,
  NEBRASKA_RULE_PACK,
} from "./legislature-rule-packs";
import {
  assertRulePackIntegrity,
  chamberByKey,
  fractionOf,
  knownRule,
  majorityOf,
  nextChamberKey,
  notApplicableRule,
  requireKnown,
  resolveRequiredVotes,
  unknownRule,
  type RuleSourceRef,
} from "./legislature-rules";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";
import { advanceWorld, assertWorldIntegrity } from "./world";

const SOURCE: RuleSourceRef = {
  authority: "constitution",
  citation: "Test Sec. 1",
  sourceTitle: "Test instrument",
  sourceUrl: null,
  retrievedAt: null,
  verification: "verified",
  note: null,
};

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [] as readonly EntityId[],
};

const hearingRegistry = createFutureTransitionHandlerRegistry([
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
]);

/** Drives a measure to the point where the chamber is about to vote. */
function toFloor(
  scenario: LegislativeScenario,
  world: World,
  chamberKey: string,
  committeeYea: number,
): World {
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const committeeKey = chamber.committees[0]!.committeeKey;
  const body = bodyForChamber(scenario, chamberKey);
  const seats = chamber.committees[0]!.appointedMembers;

  let next = referMeasure(world, {
    stableKey: `${chamberKey}:referral`,
    measureId: scenario.measureId,
    committeeKey,
  });

  const mustHear = chamber.referral.everyMeasureMustBeHeard;
  if (mustHear.kind === "known" && mustHear.value) {
    next = scheduleCommitteeHearing(next, {
      stableKey: `${chamberKey}:hearing`,
      measureId: scenario.measureId,
      hearingDate: "2026-01-12",
    });
    next = advanceWorld(next, 7, hearingRegistry);
  }

  next = recordCommitteeDisposition(next, {
    stableKey: `${chamberKey}:committee`,
    measureId: scenario.measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(committeeMembers(body, seats), {
      yea: committeeYea,
      nay: seats - committeeYea,
    }),
    rationale: "The committee backed the bill after taking testimony.",
    provenance: AUTHORED,
  });

  return placeMeasureOnCalendar(next, {
    stableKey: `${chamberKey}:calendar`,
    measureId: scenario.measureId,
  });
}

/** Clears every floor stage in a chamber with the supplied yes count. */
function clearFloor(
  scenario: LegislativeScenario,
  world: World,
  chamberKey: string,
  yea: number,
): World {
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const body = bodyForChamber(scenario, chamberKey);
  let next = world;
  for (const stage of chamber.floorStages) {
    next = waitForFloorDay(next, scenario.measureId);
    next = takeFloorVote(next, {
      stableKey: `${chamberKey}:${stage.stageKey}`,
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea,
        nay: chamber.seats - yea,
      }),
      presentMembers: chamber.seats,
      provenance: AUTHORED,
    });
  }
  return next;
}

/** Moves the world on to the first day this stage may legally be reached. */
function waitForFloorDay(world: World, measureId: EntityId): World {
  const until = measurePosition(world, measureId).earliestNextFloorDate;
  if (!until || world.currentDate >= until) return world;
  return advanceWorld(
    world,
    daysBetween(world.currentDate, until),
    createFutureTransitionHandlerRegistry([]),
  );
}

describe("Legislative rule packs", () => {
  it("describe internally coherent institutions", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
      expect(pack.sources.length).toBeGreaterThan(0);
    }
  });

  it("keep unknown, not-applicable and a known negative apart", () => {
    // Not applicable: Nebraska has no second chamber at all.
    expect(NEBRASKA_RULE_PACK.interChamber.kind).toBe("not-applicable");
    // Unknown: the sources did not settle what inaction means.
    expect(KENTUCKY_RULE_PACK.executive.inactionOutcomeInSession.kind).toBe(
      "unknown",
    );
    // Known negative: the Kentucky Senate's own rules provide a remedy for a
    // committee that will not report a bill, which means a committee can sit
    // on one. The guarantee is present and false, not missing.
    const kySenate = chamberByKey(KENTUCKY_RULE_PACK, "senate");
    expect(kySenate.referral.everyMeasureMustBeHeard).toEqual({
      kind: "known",
      value: false,
      source: expect.anything(),
    });
    // Unknown: Nebraska's official explanation says *most* bills get a public
    // hearing. "Most" is not "every", and the pack refuses to round it up.
    const neChamber = chamberByKey(NEBRASKA_RULE_PACK, "legislature");
    expect(neChamber.referral.everyMeasureMustBeHeard.kind).toBe("unknown");

    // Reading an unknown or a not-applicable rule raises distinct errors.
    expect(() =>
      requireKnown(
        KENTUCKY_RULE_PACK.executive.inactionOutcomeInSession,
        "Inaction outcome",
      ),
    ).toThrow(/is unknown in this legislature/);
    expect(() =>
      requireKnown(
        ALASKA_RULE_PACK.executive.override.kind === "joint-session"
          ? ALASKA_RULE_PACK.executive.override.appropriationsThreshold
          : { kind: "not-applicable", note: "n/a" },
        "Appropriations threshold",
      ),
    ).not.toThrow();
  });

  it("resolves thresholds with the right denominator and rounding", () => {
    // A majority is strictly more than half, so 38 seats need 20 not 19.
    expect(
      resolveRequiredVotes(
        majorityOf("members-elected", "a majority of elected", SOURCE),
        38,
      ).requiredVotes,
    ).toBe(20);
    expect(
      resolveRequiredVotes(
        majorityOf("members-elected", "a majority of elected", SOURCE),
        100,
      ).requiredVotes,
    ).toBe(51);
    // Three-fifths of 49 is 29.4, and the rule takes at least the fraction.
    expect(
      resolveRequiredVotes(
        fractionOf(3, 5, "members-elected", "three-fifths", SOURCE),
        49,
      ).requiredVotes,
    ).toBe(30);
    // Exact fractions do not round up past themselves.
    expect(
      resolveRequiredVotes(
        fractionOf(2, 3, "joint-total-membership", "two-thirds", SOURCE),
        60,
      ).requiredVotes,
    ).toBe(40);
    expect(
      resolveRequiredVotes(
        fractionOf(3, 4, "joint-total-membership", "three-quarters", SOURCE),
        60,
      ).requiredVotes,
    ).toBe(45);
  });
});

describe("Kentucky bicameral path", () => {
  const scenario = createLegislativeScenario("kentucky");

  it("moves a bill from filing to law through both chambers and a signature", () => {
    let world = scenario.world;
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-referral",
    );

    world = toFloor(scenario, world, "house", 9);
    expect(measurePosition(world, scenario.measureId).phase).toBe("on-floor");

    world = clearFloor(scenario, world, "house", 60);
    let position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("awaiting-transmittal");

    world = transmitMeasure(world, {
      stableKey: "transmit",
      measureId: scenario.measureId,
    });
    position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("awaiting-referral");
    expect(position.chamberKey).toBe("senate");

    world = toFloor(scenario, world, "senate", 6);
    world = clearFloor(scenario, world, "senate", 25);
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-enrollment",
    );

    world = enrollMeasure(world, {
      stableKey: "enroll",
      measureId: scenario.measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "present",
      measureId: scenario.measureId,
    });
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-executive",
    );

    world = recordExecutiveAction(world, {
      stableKey: "governor",
      measureId: scenario.measureId,
      action: "signed",
      rationale: "The Governor supported the transit pilot.",
    });
    world = recordEnactment(world, {
      stableKey: "enactment",
      measureId: scenario.measureId,
      actDesignation: "2026 Ky. Acts ch. 14",
    });

    position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("enacted");
    expect(position.terminal).toBe(true);
    expect(position.outcome).toBe("enacted");
    expect(availableMeasureSteps(world, scenario.measureId)).toEqual([]);
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("applies each chamber's own denominator on the floor", () => {
    let world = toFloor(scenario, scenario.world, "house", 9);
    world = clearFloor(scenario, world, "house", 60);
    const houseVote = measureVotes(world, scenario.measureId).at(-1)!;
    expect(houseVote.denominatorValue).toBe(100);
    expect(houseVote.requiredVotes).toBe(51);

    world = transmitMeasure(world, {
      stableKey: "t",
      measureId: scenario.measureId,
    });
    world = toFloor(scenario, world, "senate", 6);
    world = clearFloor(scenario, world, "senate", 25);
    const senateVote = measureVotes(world, scenario.measureId).at(-1)!;
    expect(senateVote.denominatorValue).toBe(38);
    expect(senateVote.requiredVotes).toBe(20);
  });

  it("fails the bill when a chamber falls short", () => {
    let world = toFloor(scenario, scenario.world, "house", 9);
    world = takeFloorVote(world, {
      stableKey: "house:short",
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(
        bodyForChamber(scenario, "house").members,
        { yea: 50, nay: 45, absent: 5 },
      ),
      presentMembers: 95,
      provenance: AUTHORED,
    });
    const position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("failed");
    expect(position.outcome).toBe("failed-on-floor");
    const vote = measureVotes(world, scenario.measureId).at(-1)!;
    expect(vote.requiredVotes).toBe(51);
    expect(vote.outcome).toBe("failed");
  });

  it("kills the bill when its committee refuses to report it", () => {
    let world = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "house-transportation",
    });
    world = recordCommitteeDisposition(world, {
      stableKey: "committee",
      measureId: scenario.measureId,
      recommendation: "unfavorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(bodyForChamber(scenario, "house"), 17),
        { yea: 6, nay: 11 },
      ),
      rationale: "The committee was not persuaded by the fiscal note.",
      provenance: AUTHORED,
    });
    const position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("failed");
    expect(position.outcome).toBe("failed-in-committee");
  });

  it("overrides a veto only when both chambers reach a majority of their elected members", () => {
    let world = toFloor(scenario, scenario.world, "house", 9);
    world = clearFloor(scenario, world, "house", 60);
    world = transmitMeasure(world, {
      stableKey: "t",
      measureId: scenario.measureId,
    });
    world = toFloor(scenario, world, "senate", 6);
    world = clearFloor(scenario, world, "senate", 25);
    world = enrollMeasure(world, {
      stableKey: "e",
      measureId: scenario.measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "p",
      measureId: scenario.measureId,
    });
    const vetoed = recordExecutiveAction(world, {
      stableKey: "veto",
      measureId: scenario.measureId,
      action: "vetoed",
      rationale: "The Governor objected to the ongoing cost.",
    });
    expect(measurePosition(vetoed, scenario.measureId).phase).toBe(
      "awaiting-override",
    );

    const succeeded = attemptVetoOverride(vetoed, {
      stableKey: "override-ok",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "house",
          dispositions: dispositionsFromCounts(
            bodyForChamber(scenario, "house").members,
            { yea: 55, nay: 45 },
          ),
        },
        {
          forumKey: "senate",
          dispositions: dispositionsFromCounts(
            bodyForChamber(scenario, "senate").members,
            { yea: 21, nay: 17 },
          ),
        },
      ],
      rationale: "Both chambers reconsidered the vetoed bill.",
      provenance: AUTHORED,
    });
    expect(measurePosition(succeeded, scenario.measureId).phase).toBe(
      "awaiting-enactment",
    );

    const sustained = attemptVetoOverride(vetoed, {
      stableKey: "override-fail",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "house",
          dispositions: dispositionsFromCounts(
            bodyForChamber(scenario, "house").members,
            { yea: 55, nay: 45 },
          ),
        },
        {
          forumKey: "senate",
          dispositions: dispositionsFromCounts(
            bodyForChamber(scenario, "senate").members,
            { yea: 19, nay: 19 },
          ),
        },
      ],
      rationale: "The Senate fell one vote short.",
      provenance: AUTHORED,
    });
    const position = measurePosition(sustained, scenario.measureId);
    expect(position.phase).toBe("failed");
    expect(position.outcome).toBe("vetoed-and-sustained");
    const senateOverride = measureVotes(sustained, scenario.measureId).at(-1)!;
    expect(senateOverride.requiredVotes).toBe(20);
    expect(senateOverride.outcome).toBe("failed");
  });
});

describe("Nebraska unicameral path", () => {
  const scenario = createLegislativeScenario("nebraska");

  it("does not promise a hearing its sources do not promise", () => {
    // Nebraska's official explanation says most bills get a public hearing,
    // with exceptions. An unresolved constraint is not enforced as though it
    // were certain, and it is not advertised to the player as a guarantee.
    const chamber = chamberByKey(NEBRASKA_RULE_PACK, "legislature");
    expect(chamber.referral.everyMeasureMustBeHeard.kind).toBe("unknown");
    const referred = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "transportation-telecommunications",
    });
    const reported = recordCommitteeDisposition(referred, {
      stableKey: "early",
      measureId: scenario.measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(bodyForChamber(scenario, "legislature"), 8),
        { yea: 6, nay: 2 },
      ),
      rationale: "The committee voted on reporting the bill.",
      provenance: AUTHORED,
    });
    expect(measurePosition(reported, scenario.measureId).phase).toBe(
      "awaiting-floor",
    );
  });

  it("holds the hearing through the world clock, not a separate one", () => {
    let world = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "transportation-telecommunications",
    });
    const startDate = world.currentDate;
    world = scheduleCommitteeHearing(world, {
      stableKey: "hearing",
      measureId: scenario.measureId,
      hearingDate: "2026-01-12",
    });
    expect(
      measureActions(world, scenario.measureId).some(
        (action) => action.kind === "committee-hearing-held",
      ),
    ).toBe(false);

    world = advanceWorld(world, 7, hearingRegistry);
    expect(world.currentDate).not.toBe(startDate);
    const hearing = measureActions(world, scenario.measureId).find(
      (action) => action.kind === "committee-hearing-held",
    );
    expect(hearing).toBeDefined();
    expect(hearing!.occurredAt).toBe("2026-01-12");
  });

  it("passes three separate floor stages and never transmits anywhere", () => {
    let world = toFloor(scenario, scenario.world, "legislature", 6);
    const chamber = chamberByKey(NEBRASKA_RULE_PACK, "legislature");
    expect(chamber.floorStages.map((stage) => stage.stageKey)).toEqual([
      "general-file",
      "select-file",
      "final-reading",
    ]);

    const body = bodyForChamber(scenario, "legislature");
    // General File
    world = takeFloorVote(world, {
      stableKey: "gf",
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, { yea: 30, nay: 19 }),
      provenance: AUTHORED,
    });
    expect(measurePosition(world, scenario.measureId).floorStageKey).toBe(
      "select-file",
    );
    // Select File
    world = waitForFloorDay(world, scenario.measureId);
    world = takeFloorVote(world, {
      stableKey: "sf",
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, { yea: 28, nay: 21 }),
      provenance: AUTHORED,
    });
    expect(measurePosition(world, scenario.measureId).floorStageKey).toBe(
      "final-reading",
    );
    // Final Reading
    world = waitForFloorDay(world, scenario.measureId);
    world = takeFloorVote(world, {
      stableKey: "fr",
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, { yea: 27, nay: 22 }),
      provenance: AUTHORED,
    });
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-enrollment",
    );

    // There is nowhere to send it, and the engine says so rather than guessing.
    expect(() =>
      transmitMeasure(world, { stableKey: "t", measureId: scenario.measureId }),
    ).toThrow(/currently awaiting-enrollment/);
    expect(
      measureVotes(world, scenario.measureId).filter(
        (v) => v.purpose === "floor-stage",
      ),
    ).toHaveLength(3);
  });

  it("overrides a veto with three-fifths of all elected senators", () => {
    let world = toFloor(scenario, scenario.world, "legislature", 6);
    world = clearFloor(scenario, world, "legislature", 30);
    world = enrollMeasure(world, {
      stableKey: "e",
      measureId: scenario.measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "p",
      measureId: scenario.measureId,
    });
    world = recordExecutiveAction(world, {
      stableKey: "veto",
      measureId: scenario.measureId,
      action: "vetoed",
      rationale: "The Governor objected to the formula change.",
    });

    const body = bodyForChamber(scenario, "legislature");
    const short = attemptVetoOverride(world, {
      stableKey: "short",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "legislature",
          dispositions: dispositionsFromCounts(body.members, {
            yea: 29,
            nay: 20,
          }),
        },
      ],
      rationale: "One vote short of the three-fifths bar.",
      provenance: AUTHORED,
    });
    const shortVote = measureVotes(short, scenario.measureId).at(-1)!;
    expect(shortVote.requiredVotes).toBe(30);
    expect(measurePosition(short, scenario.measureId).outcome).toBe(
      "vetoed-and-sustained",
    );

    const carried = attemptVetoOverride(world, {
      stableKey: "carried",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "legislature",
          dispositions: dispositionsFromCounts(body.members, {
            yea: 30,
            nay: 19,
          }),
        },
      ],
      rationale: "Exactly thirty senators voted to override.",
      provenance: AUTHORED,
    });
    expect(measurePosition(carried, scenario.measureId).phase).toBe(
      "awaiting-enactment",
    );
  });
});

describe("Alaska joint-session override", () => {
  const scenario = createLegislativeScenario("alaska");

  function toVeto(): World {
    let world = toFloor(scenario, scenario.world, "house", 4);
    world = clearFloor(scenario, world, "house", 25);
    world = transmitMeasure(world, {
      stableKey: "t",
      measureId: scenario.measureId,
    });
    world = toFloor(scenario, world, "senate", 4);
    world = clearFloor(scenario, world, "senate", 15);
    world = enrollMeasure(world, {
      stableKey: "e",
      measureId: scenario.measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "p",
      measureId: scenario.measureId,
    });
    return recordExecutiveAction(world, {
      stableKey: "veto",
      measureId: scenario.measureId,
      action: "vetoed",
      rationale: "The Governor reduced the appropriation.",
    });
  }

  it("reconsiders the veto as one 60-member body, not chamber by chamber", () => {
    const world = toVeto();
    const gate = measureGate(world, scenario.measureId);
    expect(gate.actorLabel).toBe("Joint session of the Legislature");

    // Supplying per-chamber forums is refused: the institution does not work that way.
    expect(() =>
      attemptVetoOverride(world, {
        stableKey: "wrong",
        measureId: scenario.measureId,
        forums: [
          {
            forumKey: "house",
            dispositions: dispositionsFromCounts(
              bodyForChamber(scenario, "house").members,
              { yea: 30, nay: 10 },
            ),
          },
          {
            forumKey: "senate",
            dispositions: dispositionsFromCounts(
              bodyForChamber(scenario, "senate").members,
              { yea: 15, nay: 5 },
            ),
          },
        ],
        rationale: "Attempted a per-chamber override.",
        provenance: AUTHORED,
      }),
    ).toThrow(/reconsiders a veto as one body/);
  });

  it("applies the three-quarters bar to an appropriation and counts all sixty seats", () => {
    const world = toVeto();
    const joint = jointBody(scenario);
    expect(joint.members).toHaveLength(60);

    const short = attemptVetoOverride(world, {
      stableKey: "short",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "joint",
          dispositions: dispositionsFromCounts(joint.members, {
            yea: 44,
            nay: 16,
          }),
        },
      ],
      rationale: "Forty-four votes on an appropriation bill.",
      provenance: AUTHORED,
    });
    const shortVote = measureVotes(short, scenario.measureId).at(-1)!;
    expect(shortVote.denominatorValue).toBe(60);
    expect(shortVote.requiredVotes).toBe(45);
    expect(shortVote.outcome).toBe("failed");
    expect(measurePosition(short, scenario.measureId).outcome).toBe(
      "vetoed-and-sustained",
    );

    const carried = attemptVetoOverride(world, {
      stableKey: "carried",
      measureId: scenario.measureId,
      forums: [
        {
          forumKey: "joint",
          dispositions: dispositionsFromCounts(joint.members, {
            yea: 45,
            nay: 15,
          }),
        },
      ],
      rationale: "Three-quarters of the combined membership.",
      provenance: AUTHORED,
    });
    expect(measurePosition(carried, scenario.measureId).phase).toBe(
      "awaiting-enactment",
    );
  });
});

describe("Procedural discipline", () => {
  const scenario = createLegislativeScenario("kentucky");

  it("refuses steps that the measure's current position does not allow", () => {
    expect(() =>
      takeFloorVote(scenario.world, {
        stableKey: "early",
        measureId: scenario.measureId,
        dispositions: dispositionsFromCounts(
          bodyForChamber(scenario, "house").members,
          { yea: 60, nay: 40 },
        ),
        provenance: AUTHORED,
      }),
    ).toThrow(/currently awaiting-referral/);

    expect(() =>
      presentMeasureToExecutive(scenario.world, {
        stableKey: "early",
        measureId: scenario.measureId,
      }),
    ).toThrow(/currently awaiting-referral/);

    expect(() =>
      recordEnactment(scenario.world, {
        stableKey: "early",
        measureId: scenario.measureId,
      }),
    ).toThrow(/Cannot record the measure as law/);
  });

  it("rejects impossible vote records", () => {
    const world = toFloor(scenario, scenario.world, "house", 9);
    const body = bodyForChamber(scenario, "house");
    // Presence smaller than the members who actually acted.
    expect(() =>
      takeFloorVote(world, {
        stableKey: "bad-presence",
        measureId: scenario.measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: 60,
          nay: 20,
        }),
        presentMembers: 40,
        provenance: AUTHORED,
      }),
    ).toThrow(/Recorded presence is smaller/);

    // The same member cannot vote twice on one question.
    expect(() =>
      takeFloorVote(world, {
        stableKey: "double",
        measureId: scenario.measureId,
        dispositions: [
          { memberKey: "house-seat-001", personId: null, disposition: "yea" },
          { memberKey: "house-seat-001", personId: null, disposition: "nay" },
        ],
        provenance: AUTHORED,
      }),
    ).toThrow(/Member voted twice/);
  });

  it("records an amendment and its own vote at an amendable stage", () => {
    let world = toFloor(scenario, scenario.world, "house", 9);
    const body = bodyForChamber(scenario, "house");
    world = offerFloorAmendment(world, {
      stableKey: "amendment",
      measureId: scenario.measureId,
      description: "Narrow the pilot to two counties.",
      offeredByLabel: "Member for District 12",
      dispositions: dispositionsFromCounts(body.members, { yea: 58, nay: 42 }),
      provenance: AUTHORED,
    });
    const amendment = (world.history.legislativeAmendments ?? [])[0]!;
    expect(amendment.status).toBe("adopted");
    const amendmentVote = measureVotes(world, scenario.measureId).find(
      (vote) => vote.purpose === "amendment",
    );
    expect(amendmentVote?.outcome).toBe("passed");
    // The bill is still at the same stage; amending is not passing.
    expect(measurePosition(world, scenario.measureId).phase).toBe("on-floor");
  });

  it("will not end a measure at adjournment while that rule is unresolved", () => {
    // None of the three packs has a source establishing what becomes of a
    // measure still pending when a session ends, so none of them can record
    // one dying. An unresolved rule is not permission.
    for (const key of legislativeScenarioKeys()) {
      const other = createLegislativeScenario(key);
      const world = referMeasure(other.world, {
        stableKey: "ref",
        measureId: other.measureId,
        committeeKey: chamberByKey(other.pack, other.pack.chamberOrder[0]!)
          .committees[0]!.committeeKey,
      });
      expect(() =>
        recordAdjournmentDeath(world, {
          stableKey: "sine-die",
          measureId: other.measureId,
        }),
      ).toThrow(/is unknown in this legislature/);
    }
  });

  it("keeps a known negative, an unknown and a not-applicable apart at the gate", () => {
    // All three refuse, and each refuses in its own words, so a caller can
    // never mistake one for another.
    expect(() =>
      requireKnown(knownRule(false, SOURCE), "A known negative"),
    ).not.toThrow();
    expect(requireKnown(knownRule(false, SOURCE), "A known negative")).toBe(
      false,
    );
    expect(() => requireKnown(unknownRule("no source"), "Unsettled")).toThrow(
      /is unknown in this legislature/,
    );
    expect(() =>
      requireKnown(notApplicableRule("no such thing here"), "Absent"),
    ).toThrow(/does not apply in this legislature/);
  });
});

describe("Durability", () => {
  it("preserves the exact legislative state through save and reload", () => {
    const scenario = createLegislativeScenario("kentucky");
    let world = toFloor(scenario, scenario.world, "house", 9);
    world = clearFloor(scenario, world, "house", 60);
    world = transmitMeasure(world, {
      stableKey: "t",
      measureId: scenario.measureId,
    });

    const restored = deserializeWorld(serializeWorld(world));
    expect(restored).toEqual(world);
    expect(measurePosition(restored, scenario.measureId)).toEqual(
      measurePosition(world, scenario.measureId),
    );
    expect(measureVotes(restored, scenario.measureId)).toEqual(
      measureVotes(world, scenario.measureId),
    );

    const repository = new SqliteWorldRepository(":memory:");
    repository.save(world);
    const loaded = repository.load(world.id);
    repository.close();
    expect(loaded).toEqual(world);
  });

  it("replays identically from the same scenario and the same decisions", () => {
    for (const key of legislativeScenarioKeys()) {
      const first = createLegislativeScenario(key);
      const second = createLegislativeScenario(key);
      expect(second.world).toEqual(first.world);

      const chamberKey = first.pack.chamberOrder[0]!;
      const committee = chamberByKey(first.pack, chamberKey).committees[0]!;
      const yes = Math.floor(committee.appointedMembers / 2) + 1;
      const a = toFloor(first, first.world, chamberKey, yes);
      const b = toFloor(second, second.world, chamberKey, yes);
      expect(b).toEqual(a);
    }
  });

  it("keeps every measure's story in ordinary world history", () => {
    const scenario = createLegislativeScenario("kentucky");
    let world = toFloor(scenario, scenario.world, "house", 9);
    world = clearFloor(scenario, world, "house", 60);

    const actions = measureActions(world, scenario.measureId);
    expect(actions.length).toBeGreaterThanOrEqual(4);
    for (const action of actions) {
      const event = world.history.events.find(
        (candidate) => candidate.id === action.eventId,
      );
      expect(event, action.kind).toBeDefined();
      expect(event!.tags).toContain("legislation");
    }
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });
});

describe("Where a bill starts decides where it goes next", () => {
  /** The jurisdiction a Kentucky scenario world already contains. */
  const kentuckyJurisdiction = KENTUCKY_CONTEXT.jurisdiction.id;

  function measureByKey(world: World, stableKey: string) {
    const record = (world.history.legislativeMeasures ?? []).find(
      (candidate) => candidate.stableKey === stableKey,
    );
    expect(record, `measure ${stableKey}`).toBeDefined();
    return record!;
  }

  function introducedAction(world: World, measureId: EntityId) {
    const action = (world.history.legislativeActions ?? []).find(
      (candidate) =>
        candidate.measureId === measureId && candidate.kind === "introduced",
    );
    expect(action, `introduced action for ${measureId}`).toBeDefined();
    return action!;
  }

  function expectPermanentReplayToReject(
    validWorld: World,
    tamper: (world: World) => void,
    expected: RegExp,
  ): void {
    const corrupted = structuredClone(validWorld);
    tamper(corrupted);
    expect(() => assertWorldIntegrity(corrupted)).toThrow(expected);

    const persisted = JSON.parse(serializeWorld(validWorld)) as {
      world: World;
    };
    tamper(persisted.world);
    expect(() => deserializeWorld(JSON.stringify(persisted))).toThrow(expected);
  }

  function introduceOriginReplayFixture(
    stableKey: string,
    rulePackId: string,
    subjectClass: "general-policy" | "revenue",
    originChamberKey: "house" | "senate",
  ): { readonly world: World; readonly measureId: EntityId } {
    const scenario = createLegislativeScenario("kentucky");
    const world = introduceMeasure(scenario.world, {
      stableKey,
      jurisdictionId: kentuckyJurisdiction,
      rulePackId,
      designation: stableKey,
      shortTitle: "Origination replay integrity fixture",
      summary: "Written for the permanent replay integrity regression.",
      origin: "member-introduction",
      subjectClass,
      originChamberKey,
    });
    return {
      world,
      measureId: measureByKey(world, stableKey).id,
    };
  }

  it("sends a bill introduced in the second chamber onward to the first", () => {
    // A measure that starts in the Senate used to have nowhere to go, because
    // the next chamber was read off a fixed position in chamberOrder rather
    // than from where the bill actually began.
    const scenario = createLegislativeScenario("kentucky");
    const world = introduceMeasure(scenario.world, {
      stableKey: "senate-origin:measure",
      jurisdictionId: kentuckyJurisdiction,
      rulePackId: KENTUCKY_RULE_PACK.packId,
      designation: "SB 12",
      shortTitle: "Senate-originated test measure",
      summary: "Written for this test, to prove a Senate bill can travel.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
    });
    const measure = measureByKey(world, "senate-origin:measure");

    expect(measure.originChamberKey).toBe("senate");
    expect(measurePosition(world, measure.id).chamberKey).toBe("senate");
    // Onward is the House, and the House is the end of the road for it.
    expect(nextChamberKey(KENTUCKY_RULE_PACK, "senate", "senate")).toBe(
      "house",
    );
    expect(nextChamberKey(KENTUCKY_RULE_PACK, "house", "senate")).toBeNull();
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("still defaults to the declared first chamber when none is named", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = introduceMeasure(scenario.world, {
      stableKey: "default-origin:measure",
      jurisdictionId: kentuckyJurisdiction,
      rulePackId: KENTUCKY_RULE_PACK.packId,
      designation: "HB 12",
      shortTitle: "Default-origin test measure",
      summary: "Written for this test.",
      origin: "member-introduction",
      subjectClass: "general-policy",
    });
    expect(measureByKey(world, "default-origin:measure").originChamberKey).toBe(
      "house",
    );
  });

  it("refuses a Minnesota revenue bill filed anywhere but the House", () => {
    // Minn. Const. art. IV, § 18 confines revenue bills to the House. The rule
    // is enforced where a measure is actually filed, not by pretending every
    // Minnesota measure is House-originated.
    const scenario = createLegislativeScenario("kentucky");
    const revenueInSenate = () =>
      introduceMeasure(scenario.world, {
        stableKey: "mn-revenue:measure",
        jurisdictionId: kentuckyJurisdiction,
        rulePackId: MINNESOTA_RULE_PACK.packId,
        designation: "SF 1",
        shortTitle: "Revenue measure filed in the wrong chamber",
        summary: "Written for this test.",
        origin: "member-introduction",
        subjectClass: "revenue",
        originChamberKey: "senate",
      });
    expect(revenueInSenate).toThrow(/cannot originate in the Senate/);

    // The same bill in the House is fine, and an ordinary bill is unrestricted
    // in either chamber because Minnesota's general rule is unresolved.
    expect(() =>
      introduceMeasure(scenario.world, {
        stableKey: "mn-revenue-house:measure",
        jurisdictionId: kentuckyJurisdiction,
        rulePackId: MINNESOTA_RULE_PACK.packId,
        designation: "HF 1",
        shortTitle: "Revenue measure filed in the House",
        summary: "Written for this test.",
        origin: "member-introduction",
        subjectClass: "revenue",
        originChamberKey: "house",
      }),
    ).not.toThrow();
    expect(() =>
      introduceMeasure(scenario.world, {
        stableKey: "mn-policy-senate:measure",
        jurisdictionId: kentuckyJurisdiction,
        rulePackId: MINNESOTA_RULE_PACK.packId,
        designation: "SF 2",
        shortTitle: "Ordinary measure filed in the Senate",
        summary: "Written for this test.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "senate",
      }),
    ).not.toThrow();
  });

  it("lets an Illinois bill start in either house, because Illinois says so", () => {
    const scenario = createLegislativeScenario("kentucky");
    for (const chamberKey of ["house", "senate"]) {
      expect(() =>
        introduceMeasure(scenario.world, {
          stableKey: `il-origin-${chamberKey}:measure`,
          jurisdictionId: kentuckyJurisdiction,
          rulePackId: ILLINOIS_RULE_PACK.packId,
          designation: `Bill from the ${chamberKey}`,
          shortTitle: "Illinois either-house test measure",
          summary: "Written for this test.",
          origin: "member-introduction",
          subjectClass: "general-policy",
          originChamberKey: chamberKey,
        }),
      ).not.toThrow();
    }
  });

  it("rejects a persisted Minnesota revenue measure whose stored origin and introduction are both Senate", () => {
    const fixture = introduceOriginReplayFixture(
      "mn-revenue-tampered-senate:measure",
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );

    expectPermanentReplayToReject(
      fixture.world,
      (world) => {
        const measure = (world.history.legislativeMeasures ?? []).find(
          (candidate) => candidate.id === fixture.measureId,
        )!;
        Object.assign(measure, { originChamberKey: "senate" });
        Object.assign(introducedAction(world, fixture.measureId), {
          chamberKey: "senate",
        });
      },
      /cannot originate in the Senate/,
    );
  });

  it("rejects a persisted introduction that disagrees with the measure's stored origin", () => {
    const fixture = introduceOriginReplayFixture(
      "mn-origin-mismatch:measure",
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );

    expectPermanentReplayToReject(
      fixture.world,
      (world) => {
        Object.assign(introducedAction(world, fixture.measureId), {
          chamberKey: "senate",
        });
      },
      /introduction names chamber 'senate' while the measure's stored origin is 'house'/,
    );
  });

  it("keeps a legal Minnesota revenue House introduction valid after reload", () => {
    const fixture = introduceOriginReplayFixture(
      "mn-revenue-house-replay:measure",
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );

    expect(() => assertWorldIntegrity(fixture.world)).not.toThrow();
    expect(deserializeWorld(serializeWorld(fixture.world))).toStrictEqual(
      fixture.world,
    );
  });

  it("keeps an ordinary Minnesota Senate introduction valid when general origination is unknown", () => {
    const fixture = introduceOriginReplayFixture(
      "mn-policy-senate-replay:measure",
      MINNESOTA_RULE_PACK.packId,
      "general-policy",
      "senate",
    );

    expect(() => assertWorldIntegrity(fixture.world)).not.toThrow();
    expect(deserializeWorld(serializeWorld(fixture.world))).toStrictEqual(
      fixture.world,
    );
  });

  it("keeps Illinois ordinary introductions legal from either chamber after reload", () => {
    for (const chamberKey of ["house", "senate"] as const) {
      const fixture = introduceOriginReplayFixture(
        `il-${chamberKey}-replay:measure`,
        ILLINOIS_RULE_PACK.packId,
        "general-policy",
        chamberKey,
      );
      expect(() => assertWorldIntegrity(fixture.world)).not.toThrow();
      expect(deserializeWorld(serializeWorld(fixture.world))).toStrictEqual(
        fixture.world,
      );
    }
  });

  it("rejects a persisted Kentucky revenue measure whose stored origin and introduction are both Senate", () => {
    const fixture = introduceOriginReplayFixture(
      "ky-revenue-tampered-senate:measure",
      KENTUCKY_RULE_PACK.packId,
      "revenue",
      "house",
    );

    expectPermanentReplayToReject(
      fixture.world,
      (world) => {
        const measure = (world.history.legislativeMeasures ?? []).find(
          (candidate) => candidate.id === fixture.measureId,
        )!;
        Object.assign(measure, { originChamberKey: "senate" });
        Object.assign(introducedAction(world, fixture.measureId), {
          chamberKey: "senate",
        });
      },
      /cannot originate in the Senate/,
    );
  });
});

describe("An unresolved stage rule is not permission to amend", () => {
  it("refuses a Minnesota floor amendment as unresolved rather than forbidden", () => {
    // Minnesota's third reading is `unknown`, and the refusal says so: the
    // engine must not read silence as either a yes or a settled no.
    const stage = MINNESOTA_RULE_PACK.chambers[0]!.floorStages[0]!;
    expect(stage.amendable.kind).toBe("unknown");
    if (stage.amendable.kind === "unknown") {
      expect(stage.amendable.note).toMatch(/not read for this pack/);
    }
  });

  it("refuses an Alaska third-reading floor amendment as a known prohibition, not unresolved", () => {
    // Alaska Uniform Rule 35 expressly states that a bill may not be amended
    // in third reading and must return to second reading for specific amendment.
    // The engine must refuse the amendment as a known rule prohibition, not
    // as unresolved silence.
    const stage = ALASKA_RULE_PACK.chambers[0]!.floorStages[0]!;
    expect(stage.amendable).toMatchObject({
      kind: "known",
      value: false,
      source: {
        citation: "Uniform Rule 35",
      },
    });

    const alaska = createLegislativeScenario("alaska");
    const alaskaOnFloor = toFloor(alaska, alaska.world, "house", 4);
    expect(
      availableMeasureSteps(alaskaOnFloor, alaska.measureId),
    ).not.toContain("offer-amendment");

    const body = bodyForChamber(alaska, "house");
    expect(() =>
      offerFloorAmendment(alaskaOnFloor, {
        stableKey: "ak-third-reading-amendment",
        measureId: alaska.measureId,
        description: "Add harbor requirement",
        offeredByLabel: "Representative from District 1",
        dispositions: dispositionsFromCounts(body.members, {
          yea: 21,
          nay: 19,
        }),
        provenance: AUTHORED,
      }),
    ).toThrow("Third reading and final passage does not accept amendments.");
  });

  it("keeps offering the amendment step only where both rules resolve to yes", () => {
    // Kentucky resolves both the chamber permission and the stage, so the step
    // is offered there. Alaska prohibits third-reading amendments (and leaves
    // general floor authority unresolved), and never offers it.
    const kentucky = createLegislativeScenario("kentucky");
    const onFloor = toFloor(kentucky, kentucky.world, "house", 9);
    expect(availableMeasureSteps(onFloor, kentucky.measureId)).toContain(
      "offer-amendment",
    );

    const alaska = createLegislativeScenario("alaska");
    const alaskaOnFloor = toFloor(alaska, alaska.world, "house", 4);
    expect(
      availableMeasureSteps(alaskaOnFloor, alaska.measureId),
    ).not.toContain("offer-amendment");
  });
});
