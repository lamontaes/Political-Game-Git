import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  jointBody,
  legislativeScenarioKeys,
  type LegislativeScenario,
} from "./legislation-scenarios";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  attemptVetoOverride,
  availableMeasureSteps,
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  enrollMeasure,
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
  KENTUCKY_RULE_PACK,
  LEGISLATIVE_RULE_PACKS,
  NEBRASKA_RULE_PACK,
} from "./legislature-rule-packs";
import {
  assertRulePackIntegrity,
  chamberByKey,
  fractionOf,
  majorityOf,
  requireKnown,
  resolveRequiredVotes,
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
    report: "favorable",
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
    // Known negative: Kentucky committees may decline to hear a bill, so the
    // guarantee of a hearing is present and false rather than missing.
    const kyHouse = chamberByKey(KENTUCKY_RULE_PACK, "house");
    expect(kyHouse.referral.everyMeasureMustBeHeard).toEqual({
      kind: "known",
      value: false,
      source: expect.anything(),
    });
    const neChamber = chamberByKey(NEBRASKA_RULE_PACK, "legislature");
    expect(
      requireKnown(neChamber.referral.everyMeasureMustBeHeard, "hearing"),
    ).toBe(true);

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
      committeeKey: "house-standing",
    });
    world = recordCommitteeDisposition(world, {
      stableKey: "committee",
      measureId: scenario.measureId,
      report: "unfavorable",
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

  it("requires a public hearing before the committee may report", () => {
    const referred = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "standing",
    });
    expect(() =>
      recordCommitteeDisposition(referred, {
        stableKey: "early",
        measureId: scenario.measureId,
        report: "favorable",
        dispositions: dispositionsFromCounts(
          committeeMembers(bodyForChamber(scenario, "legislature"), 8),
          { yea: 6, nay: 2 },
        ),
        rationale: "Tried to report without a hearing.",
        provenance: AUTHORED,
      }),
    ).toThrow(/guarantee every referred measure a public hearing/);
  });

  it("holds the hearing through the world clock, not a separate one", () => {
    let world = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "standing",
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
    ).toThrow(/only be enacted after it is signed or a veto is overridden/);
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

  it("ends a measure that runs out of session", () => {
    const world = referMeasure(scenario.world, {
      stableKey: "ref",
      measureId: scenario.measureId,
      committeeKey: "house-standing",
    });
    const dead = recordAdjournmentDeath(world, {
      stableKey: "sine-die",
      measureId: scenario.measureId,
    });
    const position = measurePosition(dead, scenario.measureId);
    expect(position.outcome).toBe("died-on-adjournment");
    expect(position.terminal).toBe(true);
  });

  it("will not claim a measure died at adjournment where that rule is unresolved", () => {
    const alaska = createLegislativeScenario("alaska");
    expect(() =>
      recordAdjournmentDeath(alaska.world, {
        stableKey: "sine-die",
        measureId: alaska.measureId,
      }),
    ).toThrow(/unresolved, so this cannot be recorded/);
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
