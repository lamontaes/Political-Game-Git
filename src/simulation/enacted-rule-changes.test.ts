import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "./legislation-scenarios";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  enrollMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
} from "./legislation";
import { chamberByKey } from "./legislature-rules";
import { createStableId } from "./ids";
import {
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordCaliforniaRatification,
  recordConstitutionalProposalVote,
} from "./constitutional-process";
import {
  enactedRuleChangeAt,
  enactedRuleChanges,
  fileRuleChangeProvision,
} from "./enacted-rule-changes";
import {
  resolveCapability,
  resolveCapabilityField,
} from "./rule-capability-resolver";
import { resolveNationwideRuleCapability } from "./nationwide-world/rule-capability-port";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, Jurisdiction, World } from "./types";
import { advanceWorld, assertWorldIntegrity, createWorld } from "./world";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [] as readonly EntityId[],
};
const HOUSE = "us-ky-general-assembly-v1:house";
const KY = { kind: "state", stateUsps: "KY" } as const;

const hearingRegistry = createFutureTransitionHandlerRegistry([
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
]);

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
    const until = measurePosition(
      next,
      scenario.measureId,
    ).earliestNextFloorDate;
    if (until && next.currentDate < until) {
      next = advanceWorld(
        next,
        daysBetween(next.currentDate, until),
        createFutureTransitionHandlerRegistry([]),
      );
    }
    next = takeFloorVote(next, {
      stableKey: `${chamberKey}:${stage.stageKey}`,
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea,
        nay: body.members.length - yea,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
  return next;
}

/** Kentucky's bill, walked through both chambers and signed into law. */
function enact(
  scenario: LegislativeScenario,
  world: World,
  effectiveAt?: string,
): World {
  let next = toFloor(scenario, world, "house", 9);
  next = clearFloor(scenario, next, "house", 60);
  next = transmitMeasure(next, {
    stableKey: "transmit",
    measureId: scenario.measureId,
  });
  next = toFloor(scenario, next, "senate", 6);
  next = clearFloor(scenario, next, "senate", 25);
  next = enrollMeasure(next, {
    stableKey: "enroll",
    measureId: scenario.measureId,
  });
  next = presentMeasureToExecutive(next, {
    stableKey: "present",
    measureId: scenario.measureId,
  });
  next = recordExecutiveAction(next, {
    stableKey: "governor",
    measureId: scenario.measureId,
    action: "signed",
    rationale: "The Governor signed the House reform.",
  });
  return recordEnactment(next, {
    stableKey: "enactment",
    measureId: scenario.measureId,
    actDesignation: "2026 Ky. Acts ch. 40",
    ...(effectiveAt ? { effectiveAt } : {}),
  });
}

function houseReformBill() {
  const scenario = createLegislativeScenario("kentucky");
  let world = fileRuleChangeProvision(scenario.world, {
    stableKey: "house-seats",
    measureId: scenario.measureId,
    officeKey: HOUSE,
    field: "body.seats",
    value: 120,
  });
  world = fileRuleChangeProvision(world, {
    stableKey: "house-term",
    measureId: scenario.measureId,
    officeKey: HOUSE,
    field: "term.years",
    value: 4,
  });
  return { scenario, world };
}

function houseRule(
  world: World | undefined,
  field: "body.seats" | "term.years" | "term.expiry",
  onDate: string,
) {
  return resolveCapabilityField({
    scope: KY,
    officeKey: HOUSE,
    field,
    onDate: makeIsoDate(onDate),
    ...(world ? { world } : {}),
  });
}

describe("A Kentucky bill changing the House's rules", () => {
  it("changes nothing while the bill is only a bill", () => {
    const { world } = houseReformBill();
    expect(enactedRuleChanges(world)).toEqual([]);
    // Kentucky's pack declines to state the House's seat count, so the game
    // does not know it until a law in this World says what it is.
    expect(houseRule(world, "body.seats", world.currentDate).state).toBe(
      "UNKNOWN",
    );
    expect(houseRule(world, "term.years", world.currentDate).value).toBe(2);
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("changes the seat count and term from the act's effective date, and nowhere before it", () => {
    const { scenario, world: filed } = houseReformBill();
    const world = enact(scenario, filed);
    const enactment = world.history.legislativeEnactments!.at(-1)!;
    expect(enactment.outcome).toBe("enacted");
    // Nothing in play dates an act, and Kentucky's effective-date rule is not
    // modelled, so the blanket ninety days applies and says so.
    expect(enactment.effectiveAt).toBeNull();
    const effectiveAt = addDays(enactment.resolvedAt, 90);
    expect(enactedRuleChanges(world)[0]?.operativeBasis).toBe("game-default");

    const seats = houseRule(world, "body.seats", effectiveAt);
    expect(seats).toMatchObject({
      state: "ADMITTED",
      value: 120,
      ruleScope: "state-statute",
      validFrom: effectiveAt,
    });
    expect(seats.source?.citation).toContain("2026 Ky. Acts ch. 40");
    expect(seats.source?.citation).toContain("default of 90 days");
    expect(houseRule(world, "term.years", effectiveAt).value).toBe(4);
    // A term's end is derived from its length, so it follows.
    expect(houseRule(world, "term.expiry", effectiveAt).value).toEqual({
      kind: "derived-from-start",
      years: 4,
    });

    // The day before the act takes effect, the old law still governs.
    const before = makeIsoDate(
      new Date(Date.parse(effectiveAt) - 86_400_000).toISOString().slice(0, 10),
    );
    expect(houseRule(world, "body.seats", before).state).toBe("UNKNOWN");
    expect(houseRule(world, "term.years", before).value).toBe(2);

    // Real law is untouched: a question asked without this World gets the
    // compiled rule, and so does another life.
    expect(houseRule(undefined, "term.years", effectiveAt).value).toBe(2);
    expect(
      houseRule(
        createLegislativeScenario("kentucky").world,
        "term.years",
        effectiveAt,
      ).value,
    ).toBe(2);

    // The nationwide producers read rules through the port, and get it too.
    const port = resolveNationwideRuleCapability({
      scope: KY,
      officeKey: HOUSE,
      action: "inspect",
      onDate: effectiveAt,
      fields: ["body.seats"],
      world,
    });
    expect(port.fields[0]).toMatchObject({ state: "ADMITTED", value: 120 });

    // The Senate was not named in the bill.
    const senate = resolveCapability({
      scope: KY,
      officeKey: "us-ky-general-assembly-v1:senate",
      action: "inspect",
      onDate: effectiveAt,
      world,
    }).fields.find((field) => field.field === "body.seats");
    expect(senate?.state).toBe("UNKNOWN");

    expect(() => assertWorldIntegrity(world)).not.toThrow();
    const reopened = deserializeWorld(serializeWorld(world));
    expect(() => assertWorldIntegrity(reopened)).not.toThrow();
    expect(houseRule(reopened, "body.seats", effectiveAt).value).toBe(120);
  });

  it("uses the act's own effective date when the record carries one", () => {
    const { scenario, world } = houseReformBill();
    const law = enact(scenario, world, "2026-07-15");
    expect(enactedRuleChanges(law)[0]).toMatchObject({
      operativeAt: "2026-07-15",
      operativeBasis: "enacted-date",
    });
    expect(houseRule(law, "term.years", "2026-07-14").value).toBe(2);
    expect(houseRule(law, "term.years", "2026-07-15").value).toBe(4);
    expect(
      houseRule(law, "body.seats", "2026-07-15").source?.citation,
    ).not.toContain("default");
  });

  it("refuses clauses the game cannot act on, and says why", () => {
    const { scenario, world } = houseReformBill();
    expect(() =>
      fileRuleChangeProvision(world, {
        stableKey: "calendar",
        measureId: scenario.measureId,
        officeKey: HOUSE,
        field: "election.date",
        value: 1,
      }),
    ).toThrow(/election calendar/);
    expect(() =>
      fileRuleChangeProvision(world, {
        stableKey: "tiny",
        measureId: scenario.measureId,
        officeKey: HOUSE,
        field: "body.seats",
        value: 0,
      }),
    ).toThrow(/whole number from 1/);
    expect(() =>
      fileRuleChangeProvision(world, {
        stableKey: "nebraska",
        measureId: scenario.measureId,
        officeKey: "us-ne-legislature-v1:legislature",
        field: "body.seats",
        value: 55,
      }),
    ).toThrow(/KY's own offices/);
    expect(() =>
      fileRuleChangeProvision(world, {
        stableKey: "house-seats-again",
        measureId: scenario.measureId,
        officeKey: HOUSE,
        field: "body.seats",
        value: 90,
      }),
    ).toThrow(/already changes/);
    const law = enact(scenario, world);
    expect(() =>
      fileRuleChangeProvision(law, {
        stableKey: "late",
        measureId: scenario.measureId,
        officeKey: HOUSE,
        field: "qualification.minimumAge",
        value: 30,
      }),
    ).toThrow(/final outcome/);
  });

  it("refuses a save whose clause was slipped in after the bill became law", () => {
    const { scenario, world } = houseReformBill();
    const law = enact(scenario, world);
    const forged: World = {
      ...law,
      history: {
        ...law.history,
        nextSequence: law.history.nextSequence + 1,
        ruleChangeProvisions: [
          ...law.history.ruleChangeProvisions!,
          {
            id: createStableId("rule-change-provision", `${law.id}:forged`),
            stableKey: "forged",
            sequence: law.history.nextSequence,
            measureId: scenario.measureId,
            stateUsps: "KY",
            officeKey: HOUSE,
            field: "qualification.minimumAge",
            value: 40,
            filedAt: law.currentDate,
          },
        ],
      },
    };
    expect(() => assertWorldIntegrity(forged)).toThrow(
      /after the bill's outcome/,
    );
  });
});

describe("A California constitutional amendment changing a rule", () => {
  const ASSEMBLY = "us-ca-legislature:assembly";
  function california(): World {
    const id = createStableId("jurisdiction", "US-CA");
    const j: Jurisdiction = {
      id,
      slug: "california",
      name: "US-CA",
      kind: "state",
      parentName: null,
      provenance: {
        asOf: makeIsoDate("2026-09-13"),
        source: "Authored identity fixture",
        jurisdiction: id,
        status: "placeholder",
      },
    };
    return createWorld({
      seed: "enacted rule change fixture",
      currentDate: makeIsoDate("2026-09-13"),
      people: [],
      jurisdictions: [j],
    });
  }
  function votes(n: number, yes: number) {
    return Array.from({ length: n }, (_, i) => ({
      memberKey: `member:${i}`,
      personId: null,
      disposition: (i < yes ? "yea" : "nay") as "yea" | "nay",
    }));
  }

  it("becomes the rule from its operative date once the voters ratify it", () => {
    let w = proposeConstitutionalMeasure(california(), {
      stableKey: "assembly-size",
      jurisdictionId: createStableId("jurisdiction", "US-CA"),
      jurisdictionKey: "US-CA",
      processKind: "state-amendment",
      designation: "ACA 9",
      shortTitle: "Assembly size",
      text: "The Assembly shall consist of 100 members. This is fictional test text.",
      textVersion: "v1",
      sponsoringAuthority: "California Legislature",
      sponsorPersonId: null,
      ratificationMode: "statewide-electors",
      deadlineAt: null,
      delayedOperativeAt: makeIsoDate("2026-12-01"),
      ruleDelta: {
        kind: "rule-field",
        officeKey: ASSEMBLY,
        field: "body.seats",
        value: 100,
      },
      ordinaryMeasureId: null,
    });
    const id = w.history.constitutionalMeasures!.at(-1)!.id;
    w = recordConstitutionalProposalVote(
      w,
      id,
      "assembly",
      votes(80, 54),
      80,
      AUTHORED,
    );
    w = recordConstitutionalProposalVote(
      w,
      id,
      "senate",
      votes(40, 27),
      40,
      AUTHORED,
    );
    const unratified = w;
    w = recordCaliforniaRatification(w, id, {
      kind: "statewide-vote",
      yes: 100,
      no: 99,
      electionAt: makeIsoDate("2026-09-13"),
      statementFiledAt: makeIsoDate("2026-09-13"),
    });
    expect(constitutionalPosition(w, id).operativeAt).toBe("2026-12-01");
    expect(constitutionalPosition(w, id).modeledEffect).toBe(true);

    const on = (world: World, date: string) =>
      enactedRuleChangeAt(world, {
        stateUsps: "CA",
        officeKey: ASSEMBLY,
        field: "body.seats",
        onDate: makeIsoDate(date),
      });
    expect(on(unratified, "2027-01-01")).toBeNull();
    expect(on(w, "2026-11-30")).toBeNull();
    expect(on(w, "2026-12-01")).toMatchObject({
      value: 100,
      instrument: "constitutional-amendment",
    });
    const resolved = resolveCapabilityField({
      scope: { kind: "state", stateUsps: "CA" },
      officeKey: ASSEMBLY,
      field: "body.seats",
      onDate: makeIsoDate("2026-12-01"),
      world: w,
    });
    expect(resolved).toMatchObject({
      state: "ADMITTED",
      value: 100,
      ruleScope: "state-constitution",
    });
    expect(() => assertWorldIntegrity(w)).not.toThrow();
  });

  it("refuses a rule change the federal route cannot carry yet", () => {
    const usId = createStableId("jurisdiction", "US");
    const us = createWorld({
      seed: "federal fixture",
      currentDate: makeIsoDate("2026-09-13"),
      people: [],
      jurisdictions: [
        {
          id: usId,
          slug: "united-states",
          name: "US",
          kind: "state",
          parentName: null,
          provenance: {
            asOf: makeIsoDate("2026-09-13"),
            source: "Authored identity fixture",
            jurisdiction: usId,
            status: "placeholder",
          },
        },
      ],
    });
    expect(() =>
      proposeConstitutionalMeasure(us, {
        stableKey: "house-size",
        jurisdictionId: usId,
        jurisdictionKey: "US",
        processKind: "federal-amendment",
        designation: "H.J.Res. 1",
        shortTitle: "House size",
        text: "Fictional test text.",
        textVersion: "v1",
        sponsoringAuthority: "Congress",
        sponsorPersonId: null,
        ratificationMode: "state-legislatures",
        deadlineAt: null,
        delayedOperativeAt: null,
        ruleDelta: {
          kind: "rule-field",
          officeKey: "us-congress:house",
          field: "body.seats",
          value: 500,
        },
        ordinaryMeasureId: null,
      }),
    ).toThrow(/federal and charter changes are not modelled/);
  });
});
