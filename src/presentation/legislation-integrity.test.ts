import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "../simulation/legislation-scenarios";
import { applyLegislativeStep } from "./legislation-session";
import {
  electedMembersFor,
  measureActions,
  measurePosition,
  nextMeasureStableKey,
  recordCommitteeDisposition,
  recordEnactment,
  replayMeasure,
} from "../simulation/legislation";
import {
  ALASKA_RULE_PACK,
  KENTUCKY_RULE_PACK,
  LEGISLATIVE_RULE_PACKS,
  NEBRASKA_RULE_PACK,
} from "../simulation/legislature-rule-packs";
import {
  chamberByKey,
  resolveRequiredVotes,
} from "../simulation/legislature-rules";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { assertWorldIntegrity } from "../simulation/world";
import type { MeasureStepKey } from "../simulation/legislation";
import type { LegislativeActionRecord, World } from "../simulation/types";

/**
 * Hostile histories.
 *
 * A save is only trustworthy if the checks refuse the ones that could never
 * have happened. These tests build such histories on purpose.
 */

function play(
  scenario: LegislativeScenario,
  world: World,
  steps: readonly MeasureStepKey[],
): World {
  let next = world;
  for (const step of steps) {
    next = applyLegislativeStep(scenario, next, step).world;
  }
  return next;
}

const TO_KENTUCKY_LAW: readonly MeasureStepKey[] = [
  "request-referral",
  "request-committee-hearing",
  "move-committee-report",
  "request-calendar-placement",
  "move-floor-vote",
  "transmit-to-second-chamber",
  "request-referral",
  "move-committee-report",
  "request-calendar-placement",
  "move-floor-vote",
  "request-enrollment",
  "present-to-executive",
  "await-executive-decision",
  "move-veto-override",
  "record-enactment",
];

/** Rewrites one action in place, the way a tampered save would look. */
function withEditedAction(
  world: World,
  match: (action: LegislativeActionRecord) => boolean,
  edit: (action: LegislativeActionRecord) => LegislativeActionRecord,
): World {
  return {
    ...world,
    history: {
      ...world.history,
      legislativeActions: (world.history.legislativeActions ?? []).map(
        (action) => (match(action) ? edit(action) : action),
      ),
    },
  };
}

describe("Histories that could never have happened", () => {
  it("refuses a first action that nothing could have led to", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = withEditedAction(
      scenario.world,
      (action) => action.kind === "introduced",
      (action) => ({ ...action, kind: "enrolled" }),
    );
    expect(replayMeasure(world, scenario.measureId).violations).toHaveLength(1);
    expect(() => assertWorldIntegrity(world)).toThrow(
      /'enrolled' cannot follow the phase 'drafting'/,
    );
  });

  it("refuses anything recorded after the bill has already finished", () => {
    const scenario = createLegislativeScenario("kentucky");
    const finished = play(scenario, scenario.world, TO_KENTUCKY_LAW);
    expect(measurePosition(finished, scenario.measureId).outcome).toBe(
      "enacted",
    );

    // Append one more action to a finished bill, exactly as a bad save would.
    const last = measureActions(finished, scenario.measureId).at(-1)!;
    const tampered: World = {
      ...finished,
      history: {
        ...finished.history,
        nextSequence: finished.history.nextSequence + 1,
        legislativeActions: [
          ...(finished.history.legislativeActions ?? []),
          {
            ...last,
            id: `${last.id}x` as LegislativeActionRecord["id"],
            stableKey: `${last.stableKey}:again`,
            sequence: finished.history.nextSequence,
            kind: "died-on-adjournment",
          },
        ],
      },
    };
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /after the measure had already finished/,
    );
  });

  it("refuses an action that names a chamber the bill was never in", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = play(scenario, scenario.world, [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
    ]);
    const tampered = withEditedAction(
      world,
      (action) => action.kind === "referred",
      (action) => ({ ...action, chamberKey: "senate" }),
    );
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /referral names the senate while the measure is in the house/,
    );
  });

  it("records law once, and only from the point where law is the next step", () => {
    const scenario = createLegislativeScenario("kentucky");
    const finished = play(scenario, scenario.world, TO_KENTUCKY_LAW);

    // A bill that is already law cannot be enacted a second time.
    expect(() =>
      recordEnactment(finished, {
        stableKey: "again",
        measureId: scenario.measureId,
      }),
    ).toThrow(/Cannot record the measure as law/);
    expect(finished.history.legislativeEnactments).toHaveLength(1);

    // Nor can a bill still sitting on the desk be recorded as law.
    const onTheDesk = play(
      scenario,
      scenario.world,
      TO_KENTUCKY_LAW.slice(0, 12),
    );
    expect(() =>
      recordEnactment(onTheDesk, {
        stableKey: "early",
        measureId: scenario.measureId,
      }),
    ).toThrow(/Cannot record the measure as law/);
  });

  it("refuses an enactment record that contradicts the bill's own history", () => {
    const scenario = createLegislativeScenario("kentucky");
    const finished = play(scenario, scenario.world, TO_KENTUCKY_LAW);
    const tampered: World = {
      ...finished,
      history: {
        ...finished.history,
        legislativeEnactments: (
          finished.history.legislativeEnactments ?? []
        ).map((record) => ({ ...record, outcome: "vetoed-and-sustained" })),
      },
    };
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /but the measure's own history says/,
    );
  });

  it("refuses an executive act dated apart from the act it records", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = play(scenario, scenario.world, TO_KENTUCKY_LAW.slice(0, 13));
    const tampered: World = {
      ...world,
      history: {
        ...world.history,
        executiveDispositions: (world.history.executiveDispositions ?? []).map(
          (record) => ({ ...record, actedAt: "2020-01-01" as never }),
        ),
      },
    };
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /before the bill reached the desk|its action happened on/,
    );
  });

  it("keeps the governor's date, the action and the event in agreement", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = play(scenario, scenario.world, TO_KENTUCKY_LAW.slice(0, 13));
    const disposition = (world.history.executiveDispositions ?? [])[0]!;
    const action = measureActions(world, scenario.measureId).find(
      (record) => record.kind === "vetoed",
    )!;
    const event = world.history.events.find(
      (record) => record.id === action.eventId,
    )!;
    expect(disposition.actedAt).toBe(action.occurredAt);
    expect(event.occurredAt).toBe(disposition.actedAt);
    expect(disposition.actedAt).toBe(world.currentDate);
  });
});

describe("Committee reports and refusals are different events", () => {
  const scenario = createLegislativeScenario("kentucky");
  const committee = chamberByKey(scenario.pack, "house").committees[0]!;
  const body = bodyForChamber(scenario, "house");
  const panel = committeeMembers(body, committee.appointedMembers);
  const carries = { yea: 10, nay: 7 };
  const fails = { yea: 7, nay: 10 };
  const AUTHORED = {
    method: "authored-fixture",
    note: "Committee members' recorded decisions.",
    sourceEntityIds: [],
  } as const;

  function report(
    recommendation: "favorable" | "unfavorable" | "without-recommendation",
    counts: { yea: number; nay: number },
  ): World {
    const referred = play(scenario, scenario.world, [
      "request-referral",
      "request-committee-hearing",
    ]);
    return recordCommitteeDisposition(referred, {
      stableKey: "report",
      measureId: scenario.measureId,
      recommendation,
      dispositions: dispositionsFromCounts(panel, counts),
      rationale: "The committee voted on reporting the bill.",
      provenance: AUTHORED,
    });
  }

  it("sends a bill to the floor even when the committee dislikes it", () => {
    // Kentucky's chambers let a committee report a bill "with the expression
    // of opinion that it should not pass". That is still a report.
    const world = report("unfavorable", carries);
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-floor",
    );
    const action = (world.history.committeeActions ?? []).at(-1)!;
    expect(action.disposition).toEqual({
      kind: "reported",
      recommendation: "unfavorable",
    });
    assertWorldIntegrity(world);
  });

  it("carries a report with no recommendation either way", () => {
    const world = report("without-recommendation", carries);
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-floor",
    );
    expect((world.history.committeeActions ?? []).at(-1)!.disposition).toEqual({
      kind: "reported",
      recommendation: "without-recommendation",
    });
  });

  it("ends the bill where the motion to report never carried", () => {
    // Failing to report is a different event from reporting unfavourably, and
    // it does not get filed as one.
    const world = report("favorable", fails);
    const position = measurePosition(world, scenario.measureId);
    expect(position.phase).toBe("failed");
    expect(position.outcome).toBe("failed-in-committee");
    expect((world.history.committeeActions ?? []).at(-1)!.disposition).toEqual({
      kind: "not-reported",
    });
    assertWorldIntegrity(world);
  });
});

describe("Identity belongs to the saved world", () => {
  it("survives repeated saves and reloads with several amendments", () => {
    const scenario = createLegislativeScenario("kentucky");
    let world = play(scenario, scenario.world, [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
    ]);

    // Amend, save, reload, amend again, save, reload, amend a third time.
    for (let round = 0; round < 3; round += 1) {
      world = applyLegislativeStep(scenario, world, "offer-amendment").world;
      world = deserializeWorld(serializeWorld(world));
      assertWorldIntegrity(world);
    }

    const amendments = (world.history.legislativeAmendments ?? []).filter(
      (record) => record.measureId === scenario.measureId,
    );
    expect(amendments).toHaveLength(3);
    expect(new Set(amendments.map((record) => record.stableKey)).size).toBe(3);
    expect(new Set(amendments.map((record) => record.id)).size).toBe(3);
  });

  it("keeps two interleaved bills from ever sharing a key", () => {
    const kentucky = createLegislativeScenario("kentucky");
    const alaska = createLegislativeScenario("alaska");
    let kentuckyWorld = kentucky.world;
    let alaskaWorld = alaska.world;

    const opening: readonly MeasureStepKey[] = [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
    ];
    for (const step of opening) {
      kentuckyWorld = applyLegislativeStep(kentucky, kentuckyWorld, step).world;
      alaskaWorld = applyLegislativeStep(alaska, alaskaWorld, step).world;
    }

    // Each world's next key is derived from that world alone, so playing them
    // in step does not let one take a key from the other.
    expect(
      nextMeasureStableKey(
        kentuckyWorld,
        kentucky.measureId,
        "floor:house:final-passage",
      ),
    ).toBe("floor:house:final-passage:1");
    expect(
      nextMeasureStableKey(
        alaskaWorld,
        alaska.measureId,
        "floor:house:final-passage",
      ),
    ).toBe("floor:house:final-passage:1");

    kentuckyWorld = applyLegislativeStep(
      kentucky,
      kentuckyWorld,
      "move-floor-vote",
    ).world;
    expect(
      nextMeasureStableKey(
        kentuckyWorld,
        kentucky.measureId,
        "floor:house:final-passage",
      ),
    ).toBe("floor:house:final-passage:2");
    expect(
      nextMeasureStableKey(
        alaskaWorld,
        alaska.measureId,
        "floor:house:final-passage",
      ),
    ).toBe("floor:house:final-passage:1");

    assertWorldIntegrity(kentuckyWorld);
    assertWorldIntegrity(alaskaWorld);
  });
});

describe("Rule packs say what their sources say", () => {
  it("cites each Kentucky chamber's own rules rather than the other's", () => {
    const house = chamberByKey(KENTUCKY_RULE_PACK, "house");
    const senate = chamberByKey(KENTUCKY_RULE_PACK, "senate");
    expect(house.referral.source.citation).toMatch(/^House Rule/);
    expect(senate.referral.source.citation).toMatch(/^Senate Rule/);
    expect(house.amendments.source.citation).toMatch(/^House Rule/);
    expect(senate.amendments.source.citation).toMatch(/^Senate Rule/);
    expect(house.committees[0]!.reportThreshold.source.citation).toBe(
      "House Rule 47",
    );
    expect(senate.committees[0]!.reportThreshold.source.citation).toBe(
      "Senate Rule 47",
    );
  });

  it("puts Alaska's action window and effective date on the right sections", () => {
    expect(ALASKA_RULE_PACK.executive.actionWindowDaysInSession).toMatchObject({
      kind: "known",
      value: 15,
      source: { citation: "Alaska Const. Art. II, Sec. 17" },
    });
    // Inaction is not a mystery in Alaska: the bill becomes law.
    expect(ALASKA_RULE_PACK.executive.inactionOutcomeInSession).toMatchObject({
      kind: "known",
      value: "becomes-law-without-signature",
      source: { citation: "Alaska Const. Art. II, Sec. 17" },
    });
    expect(ALASKA_RULE_PACK.enactment.defaultEffectiveRule).toMatchObject({
      kind: "known",
      source: { citation: "Alaska Const. Art. II, Sec. 18" },
    });
    // Uniform Rule 22 is Open and Executive Sessions; it cannot be the
    // authority for referral or floor amendments.
    const citations = ALASKA_RULE_PACK.sources.map((source) => source.citation);
    expect(citations).not.toContain("Uniform Rule 22");
    expect(citations).toContain("Uniform Rule 23");
    expect(citations).toContain("Uniform Rule 43");
  });

  it("does not turn Nebraska's 'most bills' into 'every bill'", () => {
    const chamber = chamberByKey(NEBRASKA_RULE_PACK, "legislature");
    expect(chamber.referral.everyMeasureMustBeHeard.kind).toBe("unknown");
    expect(NEBRASKA_RULE_PACK.executive.inactionOutcomeInSession).toMatchObject(
      { kind: "known", value: "becomes-law-without-signature" },
    );
    // Carryover to the end of a biennium is not death at adjournment.
    expect(NEBRASKA_RULE_PACK.session.measuresDieAtAdjournment.kind).toBe(
      "unknown",
    );
  });

  it("marks generic committee sizes as the scenario's, not the state's", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      for (const chamber of pack.chambers) {
        for (const committee of chamber.committees) {
          expect(committee.membershipBasis).toBe("scenario-fixture");
        }
      }
    }
  });

  it("never marks a source verified without saying what was read", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      for (const source of pack.sources) {
        expect(source.verification).not.toBe("unresolved");
        expect(source.note ?? "").not.toBe("");
        if (source.verification === "verified") {
          expect((source.note ?? "").length).toBeGreaterThan(40);
        }
      }
    }
  });
});

describe("A chamber that is not at full strength", () => {
  const senate = chamberByKey(KENTUCKY_RULE_PACK, "senate");

  it("counts a majority of the members there actually are", () => {
    // The Senate has 38 seats. A majority of members elected is 20 at full
    // strength and 19 with two seats vacant: the rule counts people, not
    // desks, and the two numbers are not interchangeable.
    const rule = senate.floorStages[0]!.vote;
    expect(rule.kind).toBe("known");
    if (rule.kind !== "known") return;
    expect(resolveRequiredVotes(rule.value, 38).requiredVotes).toBe(20);
    expect(resolveRequiredVotes(rule.value, 36).requiredVotes).toBe(19);
  });

  it("will not seat more members than the chamber has seats", () => {
    expect(electedMembersFor(senate, 36)).toBe(36);
    expect(electedMembersFor(senate)).toBe(38);
    expect(() => electedMembersFor(senate, 39)).toThrow(
      /cannot have more members elected than its 38 seats/,
    );
    expect(() => electedMembersFor(senate, 0)).toThrow(
      /positive count of elected members/,
    );
  });
});
