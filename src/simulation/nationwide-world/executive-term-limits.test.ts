import { describe, expect, it } from "vitest";

import { candidacyEligibility } from "../candidacy";
import { daysBetween, makeIsoDate } from "../dates";
import { fileRuleChangeProvision } from "../enacted-rule-changes";
import type {
  RuleChangeApplicability,
  RuleChangeValue,
} from "../enacted-rule-changes";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  enrollMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../legislation-scenarios";
import type { LegislativeScenario } from "../legislation-scenarios";
import { chamberByKey } from "../legislature-rules";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, IsoDate, World } from "../types";
import { advanceWorld, recordWorldEvent } from "../world";
import {
  checkExecutiveTermLimit,
  compiledExecutiveTermLimit,
  drawnExecutiveTermLimit,
  researchedExecutiveTermLimits,
} from "./executive-term-limits";
import {
  isStateExecutiveElectionYearInWorld,
  nextRegularElectionInWorld,
  stateExecutiveTermRuleInWorld,
  termDatesAfterElectionInWorld,
} from "./executive-term-rules-in-world";
import { chiefExecutiveJurisdictionId } from "./government-jurisdiction";
import { nextFilableStateExecutiveTerm } from "./state-executive-turnover-calendar";

const GOVERNOR = "us-ne-governor";
const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [] as readonly EntityId[],
};

/** A term the World records the scenario's player as having served. */
function servedTerm(
  world: World,
  personId: EntityId,
  startsAt: string,
  endsAt: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `test:ne-governor-tenure:${startsAt}`,
    type: "world.office-tenure",
    occurredAt: makeIsoDate(startsAt),
    recordedAt: world.currentDate,
    jurisdictionId: chiefExecutiveJurisdictionId("NE"),
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:subject", detail: "governor" }],
    personFactConstraints: [],
    visibility: "public",
    tags: [`office:${GOVERNOR}`, `term-end:${endsAt}`],
    summary: "Served a term as Governor of Nebraska.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Nebraska's one chamber passes the bill, the Governor signs, and it is law. */
function enactNebraskaBill(
  scenario: LegislativeScenario,
  world: World,
  effectiveAt: string,
): World {
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const body = bodyForChamber(scenario, "legislature");
  let next = referMeasure(world, {
    stableKey: "referral",
    measureId: scenario.measureId,
    committeeKey: committee.committeeKey,
  });
  next = recordCommitteeDisposition(next, {
    stableKey: "committee",
    measureId: scenario.measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(
      committeeMembers(body, committee.appointedMembers),
      { yea: committee.appointedMembers, nay: 0 },
    ),
    rationale: "The committee backed the bill.",
    provenance: AUTHORED,
  });
  next = placeMeasureOnCalendar(next, {
    stableKey: "calendar",
    measureId: scenario.measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(
      next,
      scenario.measureId,
    ).earliestNextFloorDate;
    if (until && next.currentDate < until)
      next = advanceWorld(
        next,
        daysBetween(next.currentDate, until),
        createFutureTransitionHandlerRegistry([]),
      );
    next = takeFloorVote(next, {
      stableKey: stage.stageKey,
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
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
    rationale: "The Governor signed it.",
  });
  return recordEnactment(next, {
    stableKey: "enactment",
    measureId: scenario.measureId,
    actDesignation: "LB 1, 2026",
    effectiveAt,
  });
}

/** A Nebraska bill carrying one change to the Governor's office, made law. */
function nebraskaLaw(
  field: "executive.term.limit" | "executive.term.years",
  value: RuleChangeValue,
  options: {
    readonly world?: (scenario: LegislativeScenario) => World;
    readonly applicability?: RuleChangeApplicability;
  } = {},
) {
  const scenario = createLegislativeScenario("nebraska");
  const start = options.world ? options.world(scenario) : scenario.world;
  const filed = fileRuleChangeProvision(start, {
    stableKey: `governor:${field}`,
    measureId: scenario.measureId,
    officeKey: GOVERNOR,
    field,
    value,
    ...(options.applicability ? { applicability: options.applicability } : {}),
  });
  return {
    scenario,
    before: filed,
    world: enactNebraskaBill(scenario, filed, "2026-07-01"),
  };
}

/** The scenario's player has served two consecutive terms and sits in the second. */
function twoTermGovernor(scenario: LegislativeScenario): World {
  const personId = playerOf(scenario.world);
  let world = servedTerm(scenario.world, personId, "2019-01-10", "2023-01-05");
  world = servedTerm(world, personId, "2023-01-05", "2027-01-07");
  return world;
}

function playerOf(world: World): EntityId {
  if (world.control.kind !== "person") throw new Error("No player.");
  return world.control.personId;
}

function checkNextTerm(world: World) {
  const term = nextFilableStateExecutiveTerm(world, "NE")!;
  return checkExecutiveTermLimit(world, {
    stateUsps: "NE",
    personId: playerOf(world),
    termStartsAt: term.startsAt,
  })!;
}

function governorBlocks(world: World) {
  return candidacyEligibility(world, {
    personId: playerOf(world),
    jurisdictionId: chiefExecutiveJurisdictionId("NE")!,
    officeKey: GOVERNOR,
    alreadyACandidate: false,
  }).blocks;
}

describe("A governor's term limit, state by state and under this World's law", () => {
  it("holds a two-term Nebraska governor to the constitution's two in a row", () => {
    const world = twoTermGovernor(createLegislativeScenario("nebraska"));
    const check = checkNextTerm(world);
    expect(check.limit.basis).toBe("sourced");
    expect(check.consecutiveTerms).toBe(2);
    expect(check.barredReason).toBe(
      "This office allows two terms in a row, and this character has served two consecutive terms. They may stand again after sitting out a term.",
    );
    // The same refusal reaches the filing screen, in plain words, with no
    // citation behind it.
    const block = governorBlocks(world).find(
      (candidate) => candidate.kind === "term-limit",
    );
    expect(block?.reason).toBe(check.barredReason);
    expect(block?.citation).toBeUndefined();
    // The constitution's row is no longer asked a second time as an
    // unanswerable qualification. (The residence rule still is, correctly:
    // this character has not lived in Nebraska five years.)
    expect(
      governorBlocks(world)
        .filter((candidate) => candidate.kind !== "term-limit")
        .map((candidate) => candidate.reason)
        .join(" "),
    ).not.toMatch(/term/i);
  });

  it("lets the same governor stand once a law allows three terms instead of two", () => {
    const { before, world } = nebraskaLaw(
      "executive.term.limit",
      { maxConsecutiveTerms: 3, maxLifetimeTerms: null, lookbackYears: null },
      { world: twoTermGovernor },
    );
    // Filed is not law: until the bill is enacted, two is still the limit.
    expect(checkNextTerm(before).barredReason).not.toBeNull();

    const check = checkNextTerm(world);
    expect(check.limit.basis).toBe("enacted");
    expect(check.limit.limit?.maxConsecutiveTerms).toBe(3);
    expect(check.limit.enactment?.designation).toBe("LB 1, 2026");
    // The law was silent on terms already served, so they count; two is under
    // three.
    expect(check.limit.enactment?.countsPriorService).toBe(true);
    expect(check.barredReason).toBeNull();
    expect(
      governorBlocks(world).some(
        (candidate) => candidate.kind === "term-limit",
      ),
    ).toBe(false);

    // The law survives the save.
    const reopened = deserializeWorld(serializeWorld(world));
    expect(checkNextTerm(reopened).barredReason).toBeNull();
  });

  it("starts the count afresh when the law says terms already served do not count", () => {
    const one = {
      maxConsecutiveTerms: 1,
      maxLifetimeTerms: null,
      lookbackYears: null,
    };
    const counting = nebraskaLaw("executive.term.limit", one, {
      world: twoTermGovernor,
      applicability: { appliesTo: null, countsPriorService: true },
    });
    expect(checkNextTerm(counting.world).barredReason).toContain(
      "one term in a row",
    );
    const fresh = nebraskaLaw("executive.term.limit", one, {
      world: twoTermGovernor,
      applicability: { appliesTo: null, countsPriorService: false },
    });
    const check = checkNextTerm(fresh.world);
    expect(check.consecutiveTerms).toBe(0);
    expect(check.barredReason).toBeNull();
  });

  it("counts a lifetime limit across a break, where a consecutive limit would not", () => {
    const brokenService = (scenario: LegislativeScenario) => {
      const personId = playerOf(scenario.world);
      let world = servedTerm(
        scenario.world,
        personId,
        "2011-01-06",
        "2015-01-08",
      );
      world = servedTerm(world, personId, "2019-01-10", "2023-01-05");
      return world;
    };
    // Under the constitution's consecutive limit a term sat out resets the run.
    const scenario = createLegislativeScenario("nebraska");
    const unchanged = checkNextTerm(brokenService(scenario));
    expect(unchanged.consecutiveTerms).toBe(0);
    expect(unchanged.barredReason).toBeNull();

    const { world } = nebraskaLaw(
      "executive.term.limit",
      { maxConsecutiveTerms: null, maxLifetimeTerms: 2, lookbackYears: null },
      { world: brokenService },
    );
    const check = checkNextTerm(world);
    expect(check.lifetimeTerms).toBe(2);
    expect(check.barredReason).toBe(
      "This office allows two terms in a lifetime, and this character has already served two terms.",
    );
  });

  it("lifts the limit entirely when a law says there is none", () => {
    const { world } = nebraskaLaw("executive.term.limit", null, {
      world: twoTermGovernor,
    });
    const check = checkNextTerm(world);
    expect(check.limit.limit).toBeNull();
    expect(check.barredReason).toBeNull();
  });
});

describe("A governor's term length, changed by law", () => {
  it("moves the election calendar from the first term the law reaches, and nowhere before", () => {
    const scenario = createLegislativeScenario("nebraska");
    // Before the law: four-year terms, elections in 2026 and 2030.
    expect(
      isStateExecutiveElectionYearInWorld(scenario.world, "NE", 2030),
    ).toBe(true);

    const { world } = nebraskaLaw("executive.term.years", 6);
    // The law is operative from July 2026; the first term to begin after that
    // is the one won in November 2026, so that election is the first on the
    // new cycle and the next is six years on.
    const rule = stateExecutiveTermRuleInWorld(
      world,
      "NE",
      makeIsoDate("2026-07-02"),
    )!;
    expect(rule.termYears).toBe(6);
    expect(rule.enactedChanges[0]).toMatchObject({
      value: 6,
      designation: "LB 1, 2026",
      deferredFromImmediate: false,
    });
    expect(isStateExecutiveElectionYearInWorld(world, "NE", 2026)).toBe(true);
    expect(isStateExecutiveElectionYearInWorld(world, "NE", 2030)).toBe(false);
    expect(isStateExecutiveElectionYearInWorld(world, "NE", 2032)).toBe(true);
    const election2026 = nextRegularElectionInWorld(
      world,
      "NE",
      makeIsoDate("2026-07-02"),
    )!;
    expect(election2026.slice(0, 4)).toBe("2026");
    const term = termDatesAfterElectionInWorld(world, "NE", election2026)!;
    expect(
      Number(term.endsAt.slice(0, 4)) - Number(term.startsAt.slice(0, 4)),
    ).toBe(6);
    expect(
      nextRegularElectionInWorld(world, "NE", makeIsoDate("2026-12-01"))!.slice(
        0,
        4,
      ),
    ).toBe("2032");
    // The compiled rule, which the game read and every other life uses, is
    // untouched.
    expect(
      isStateExecutiveElectionYearInWorld(scenario.world, "NE", 2030),
    ).toBe(true);
  });

  it("applies a law that asks to reach the sitting term from the next term, and records that it did", () => {
    const { world } = nebraskaLaw("executive.term.years", 6, {
      applicability: { appliesTo: "immediately", countsPriorService: null },
    });
    const rule = stateExecutiveTermRuleInWorld(
      world,
      "NE",
      makeIsoDate("2026-07-02"),
    )!;
    expect(rule.enactedChanges[0]?.deferredFromImmediate).toBe(true);
    expect(isStateExecutiveElectionYearInWorld(world, "NE", 2032)).toBe(true);
  });
});

describe("A state the game has not read", () => {
  it("draws its limit from the limits read states actually enacted, the same every time", () => {
    const read = researchedExecutiveTermLimits();
    expect(read.length).toBeGreaterThan(0);
    const onDate = makeIsoDate("2027-01-04") as IsoDate;
    const nevada = compiledExecutiveTermLimit("NV", onDate);
    expect(nevada.basis).toBe("game-profile");
    expect(nevada.provenance).toContain("not researched");
    expect(read).toContainEqual(nevada.limit);
    expect(drawnExecutiveTermLimit("NV")).toEqual(nevada.limit);
    expect(compiledExecutiveTermLimit("NV", onDate)).toEqual(nevada);
    // Read states keep their own law rather than the draw.
    expect(compiledExecutiveTermLimit("MO", onDate).limit).toEqual({
      maxConsecutiveTerms: null,
      maxLifetimeTerms: 2,
      lookbackYears: null,
    });
  });
});
