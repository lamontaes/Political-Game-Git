import { createCharacterHistoryContextPerson } from "../../src/simulation/character-history";
import {
  createCrisisTransitionRegistry,
  ensureCrisisMortality,
  MORTALITY_DEATH_KEY,
} from "../../src/simulation/crisis";
import {
  createLegislativeScenario,
  bodyForChamber,
  committeeMembers,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "../../src/simulation/legislation-scenarios";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  referMeasure,
  scheduleCommitteeHearing,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  measurePosition,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  recordExecutiveAction,
  recordEnactment,
} from "../../src/simulation/legislation";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import {
  fileRuleChangeProvision,
  enactedRuleChanges,
} from "../../src/simulation/enacted-rule-changes";
import { ensureOpeningJudiciary } from "../../src/simulation/judiciary/opening";
import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../src/simulation/dates";
import {
  advanceWorld,
  createWorld,
  createWorldId,
} from "../../src/simulation/world";
import { createLightweightPerson } from "../../src/simulation/people";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { SeededRng } from "../../src/simulation/rng";
import { nationalElectionRules } from "../../src/simulation/national-election-rules";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation/national-election-geography";
import {
  appendNationalRecord,
  nationalAllocation,
  nationalRecords,
  recordNationalCount,
  registerNationalElection,
} from "../../src/simulation/national-elections";
import {
  planNationalOfficeTerm,
  qualifyNationalOfficeEntry,
  scheduleNationalCount,
} from "../../src/simulation/national-election-consumer";
import type { ProofInput } from "./parity";
import type { World, IsoDate, EntityId } from "../../src/simulation/types";

/** Small canonical saved-record fixture, with a locality selected by the caller
 * from the complete 56-jurisdiction plan. No production world hook is bypassed
 * in a production lineage: this deliberately uses the fixture lineage. */
export function openClockFixture(
  input: ProofInput,
  currentDate: IsoDate,
): World {
  const place = lifePlaceByKey(input.placeKey);
  if (!place?.stateJurisdictionKey)
    throw new Error("Source-backed locality required");
  const state = stateJurisdictionForKey(place.stateJurisdictionKey);
  if (!state) throw new Error("Source-backed state jurisdiction required");
  const jurisdictions = [
    ...new Map(
      [state, place.context.jurisdiction].map((j) => [j.id, j]),
    ).values(),
  ];
  const people = Array.from({ length: 4 }, (_, index) =>
    createLightweightPerson({
      worldId: createWorldId(input.seed),
      worldSeed: input.seed,
      index,
      currentDate,
      homeJurisdictionId: place.context.jurisdiction.id,
    }),
  );
  return createWorld({ seed: input.seed, currentDate, jurisdictions, people });
}
/** Real scheduled count receiver, deliberately missing electoral inputs. The
 * supported outcome is one blocked due state, not an invented election result. */
export function openNationalCountFixture(input: ProofInput): World {
  const rules = nationalElectionRules(2028);
  let world = ensureNationalElectionJurisdiction(
    openClockFixture(input, makeIsoDate(addDays(rules.countDate, -1))),
  );
  const ids = world.personOrder;
  const states = rules.units
    .filter((unit) => unit.countsPopular)
    .map((unit) => unit.state);
  const rng = new SeededRng(`clock-fixture-residence:${input.seed}`);
  world = registerNationalElection(world, {
    stableKey: "c2-count-fixture",
    cycle: rules.cycle,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    tickets: [
      {
        presidentPersonId: ids[0]!,
        vicePresidentPersonId: ids[1]!,
        presidentState: states[rng.nextUint32() % states.length]!,
        vicePresidentState: states[rng.nextUint32() % states.length]!,
      },
    ],
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Declared fictional fixture ticket; no vote, allocation or outcome supplied.",
    },
  });
  return scheduleNationalCount(
    world,
    world.history.nationalElections!.at(-1)!.id,
  );
}

/** Authored elderly cohort from the existing mortality regression's birth-date
 * pattern. Names come from the canonical seeded generator. No hazard rate,
 * crossing date, cause, or death result is supplied by this fixture. */
export function openMortalityBoundaryFixture(input: ProofInput) {
  let world = openClockFixture(input, makeIsoDate("2026-03-31"));
  const homeJurisdictionId = lifePlaceByKey(input.placeKey)!.context
    .jurisdiction.id;
  for (let index = 0; index < 40; index++) {
    const identity = createLightweightPerson({
      worldId: world.id,
      worldSeed: world.seed,
      index: index + 4,
      currentDate: world.currentDate,
      homeJurisdictionId,
    });
    world = createCharacterHistoryContextPerson(world, {
      stableKey: `c2-elder:${index}`,
      givenName: identity.givenName,
      familyName: identity.familyName,
      birthDate: makeIsoDate(
        `19${24 + (index % 12)}-0${1 + (index % 9)}-1${index % 9}`,
      ),
      homeJurisdictionId,
    });
  }
  const registry = createCrisisTransitionRegistry();
  world = advanceWorld(ensureCrisisMortality(world), 1, registry);
  const pending = world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === MORTALITY_DEATH_KEY &&
        item.dueAt > world.currentDate,
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.sequence - b.sequence);
  const deathDue = pending[0];
  if (!deathDue)
    throw new Error(
      "The actual mortality producer supplied no future death in this fixture window",
    );
  const dayBefore = addDays(deathDue.dueAt, -1);
  const days = daysBetween(world.currentDate, dayBefore);
  if (days > 0) world = advanceWorld(world, days, registry);
  return { world, registry, deathDue };
}

const COURT_FIXTURE_PROVENANCE = {
  method: "authored-fixture" as const,
  note: "Explicit legacy Alaska court-law control; authored legislative votes, not simulated approval.",
  sourceEntityIds: [] as readonly EntityId[],
};
function courtFixtureToFloor(
  scenario: LegislativeScenario,
  world: World,
  chamberKey: string,
) {
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const body = bodyForChamber(scenario, chamberKey);
  const seats = chamber.committees[0]!.appointedMembers;
  let next = referMeasure(world, {
    stableKey: `${chamberKey}:referral`,
    measureId: scenario.measureId,
    committeeKey: chamber.committees[0]!.committeeKey,
  });
  if (
    chamber.referral.everyMeasureMustBeHeard.kind === "known" &&
    chamber.referral.everyMeasureMustBeHeard.value
  ) {
    const hearingDate = addDays(next.currentDate, 7);
    next = scheduleCommitteeHearing(next, {
      stableKey: `${chamberKey}:hearing`,
      measureId: scenario.measureId,
      hearingDate,
    });
    next = advanceWorld(
      next,
      7,
      createFutureTransitionHandlerRegistry([
        [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
      ]),
    );
  }
  next = recordCommitteeDisposition(next, {
    stableKey: `${chamberKey}:committee`,
    measureId: scenario.measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(committeeMembers(body, seats), {
      yea: seats,
      nay: 0,
    }),
    rationale: "Authored court-clock fixture committee approval.",
    provenance: COURT_FIXTURE_PROVENANCE,
  });
  next = placeMeasureOnCalendar(next, {
    stableKey: `${chamberKey}:calendar`,
    measureId: scenario.measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(
      next,
      scenario.measureId,
    ).earliestNextFloorDate;
    if (until && next.currentDate < until)
      next = advanceWorld(next, daysBetween(next.currentDate, until));
    next = takeFloorVote(next, {
      stableKey: `${chamberKey}:${stage.stageKey}`,
      measureId: scenario.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: COURT_FIXTURE_PROVENANCE,
    });
  }
  return next;
}
/** Existing legacy fixture only. This does not claim a nationwide enacted-law
 * fixture factory: createLegislativeScenario has named scenario blueprints. */
export function openLegacyCourtBoundaryFixture() {
  const scenario = createLegislativeScenario("alaska");
  let world = ensureOpeningJudiciary(scenario.world);
  const courtId = "us-ak:highest_court";
  world = fileRuleChangeProvision(world, {
    stableKey: "c2-court-size",
    measureId: scenario.measureId,
    officeKey: courtId,
    field: "court.seats",
    value: 9,
  });
  world = courtFixtureToFloor(scenario, world, "house");
  world = transmitMeasure(world, {
    stableKey: "c2-transmit",
    measureId: scenario.measureId,
  });
  world = courtFixtureToFloor(scenario, world, "senate");
  world = enrollMeasure(world, {
    stableKey: "c2-enroll",
    measureId: scenario.measureId,
  });
  world = presentMeasureToExecutive(world, {
    stableKey: "c2-present",
    measureId: scenario.measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: "c2-sign",
    measureId: scenario.measureId,
    action: "signed",
    rationale: "Authored court-clock fixture executive signature.",
  });
  world = recordEnactment(world, {
    stableKey: "c2-enactment",
    measureId: scenario.measureId,
    actDesignation: "Authored Alaska C2 court-clock fixture",
  });
  const operative = enactedRuleChanges(world).find(
    (change) =>
      change.measureId === scenario.measureId && change.field === "court.seats",
  );
  if (!operative)
    throw new Error(
      "No operative court-size rule was produced by the canonical enactment chain",
    );
  const days = daysBetween(
    world.currentDate,
    addDays(operative.operativeAt, -1),
  );
  if (days > 0) world = advanceWorld(world, days);
  return {
    world,
    courtId,
    measureId: scenario.measureId,
    operativeAt: operative.operativeAt,
  };
}

/** Same canonical authored-input route as national-elections.test.ts: supplied
 * fictional unit results/certifications/ballots feed the real count and term
 * writers. The count produces the outcome; this fixture never inserts one. */
const NOON_FIXTURE_PROVENANCE = {
  method: "authored" as const,
  sourceEntityIds: [] as readonly EntityId[],
  note: "Supplied fictional clock-test results and oath, not a simulated election or observed voter decision.",
};
export function positionClockFixture(
  world: World,
  date: IsoDate,
  minuteOfDay: number,
): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentAtLocalTime({
      date,
      minuteOfDay,
      timeZone: "America/New_York",
    }),
  };
}
export function openPlannedNationalNoonFixture(input: ProofInput) {
  const rules = nationalElectionRules(2028);
  let world = ensureNationalElectionJurisdiction(
    openClockFixture(input, makeIsoDate(addDays(rules.electionDate, -1))),
  );
  const [a, av, b, bv] = world.personOrder;
  if (!a || !av || !b || !bv)
    throw new Error("Four canonical fixture people required");
  const residenceStates = rules.units
    .filter((unit) => unit.countsPopular)
    .map((unit) => unit.state);
  const rng = new SeededRng(`noon-fixture-residence:${input.seed}`);
  const residence = () =>
    residenceStates[rng.nextUint32() % residenceStates.length]!;
  world = registerNationalElection(world, {
    stableKey: "c2-noon-election",
    cycle: rules.cycle,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    tickets: [
      {
        presidentPersonId: a,
        vicePresidentPersonId: av,
        presidentState: residence(),
        vicePresidentState: residence(),
      },
      {
        presidentPersonId: b,
        vicePresidentPersonId: bv,
        presidentState: residence(),
        vicePresidentState: residence(),
      },
    ],
    provenance: NOON_FIXTURE_PROVENANCE,
  });
  const electionId = world.history.nationalElections!.at(-1)!.id;
  world = positionClockFixture(
    world,
    makeIsoDate(addDays(rules.electionDate, 1)),
    0,
  );
  for (const unit of rules.units) {
    world = appendNationalRecord(world, {
      stableKey: `c2-noon-result:${unit.key}`,
      electionId,
      kind: "unit-result",
      unitKey: unit.key,
      sourceContestResultId: null,
      allocationWinnerPersonId: a,
      tallies: [
        { candidatePersonId: a, votes: 2 },
        { candidatePersonId: b, votes: 1 },
      ],
      provenance: NOON_FIXTURE_PROVENANCE,
    });
    const resultId = nationalRecords(world, electionId).at(-1)!.id;
    world = appendNationalRecord(world, {
      stableKey: `c2-noon-certification:${unit.key}`,
      electionId,
      kind: "certification",
      resultId,
      disposition: "certified",
      allocationWinnerPersonId: a,
      authorityNote:
        "Supplied fictional fixture certification; not a simulated approval.",
      provenance: NOON_FIXTURE_PROVENANCE,
    });
  }
  world = positionClockFixture(world, rules.electorMeetingDate, 0);
  for (const elector of nationalAllocation(world, electionId).electors) {
    world = appendNationalRecord(world, {
      kind: "ballot",
      stableKey: `c2-noon-ballot:${elector.key}`,
      electionId,
      electorKey: elector.key,
      presidentPersonId: elector.allocatedTicketPresidentId,
      vicePresidentPersonId: av,
      disposition: "accepted",
      provenance: NOON_FIXTURE_PROVENANCE,
    });
  }
  world = recordNationalCount(positionClockFixture(world, rules.countDate, 0), {
    stableKey: "c2-noon-count",
    electionId,
    provenance: NOON_FIXTURE_PROVENANCE,
  });
  world = planNationalOfficeTerm(world, {
    stableKey: "c2-noon-plan",
    electionId,
    office: "president",
    qualificationNote: "Expected term only; no oath has been recorded.",
    workTimeDemand: {
      expectedWeekly: { minimumHours: 10, maximumHours: 45 },
      attention: "high",
      concurrency: "partly-concurrent",
      scheduleRigidity: "mixed",
      interruptibility: "limited",
      locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    },
    provenance: NOON_FIXTURE_PROVENANCE,
  });
  const plan = nationalRecords(world, electionId).at(-1)!;
  if (plan.kind !== "term-plan")
    throw new Error("Canonical term plan not produced");
  world = positionClockFixture(
    world,
    plan.startsAt.date,
    plan.startsAt.minuteOfDay - 1,
  );
  return { world, electionId, plan, personId: plan.personId };
}
export function recordClockFixtureOath(
  world: World,
  electionId: EntityId,
  planId: EntityId,
  personId: EntityId,
): World {
  return qualifyNationalOfficeEntry(world, {
    stableKey: "c2-noon-oath",
    electionId,
    planId,
    personId,
    disposition: "qualified-and-sworn",
    authorityNote:
      "Supplied fictional qualification and actually recorded fixture oath.",
    provenance: NOON_FIXTURE_PROVENANCE,
  });
}
