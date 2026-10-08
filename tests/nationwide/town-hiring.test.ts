import { describe, expect, it } from "vitest";
import { smallWorld } from "../fixtures/small-world";
import { addDays, ageOnDate } from "../../src/simulation/dates";
import {
  createEducationEnrollment,
  createOrganization,
  createWorkRelationship,
  recordEducationEnrollmentState,
  recordWorkStatus,
} from "../../src/simulation/life";
import {
  educationEnrollmentStateAt,
  workStatusAt,
} from "../../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  TOWN_WORKPLACES,
  fillTownJobs,
  type Resident,
} from "../../src/simulation/living-world/town-employment";
import {
  BUSINESS_OWNER_WORK_KIND,
  chooseHire,
  entryRequirementFor,
  heldEducation,
  hiringDecisionMaker,
} from "../../src/simulation/living-world/town-hiring";
import { recordTraitChange } from "../../src/simulation/people-traits";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";
import { recordWorldEvent } from "../../src/simulation/world";
import type {
  EntityId,
  OccupationClassification,
  World,
} from "../../src/simulation/types";

const SEED = "au2-dup-07-one-hiring-decision";
const PLACES = lifePlaceStateIdentities();
const provenance = { kind: "authored" as const, note: "AU2-DUP-07 fixture." };
const COOK: OccupationClassification = "occupation:cook";

function timeDemand(town: EntityId) {
  return {
    expectedWeekly: { minimumHours: 35, maximumHours: 45 },
    attention: "moderate" as const,
    concurrency: "mostly-exclusive" as const,
    scheduleRigidity: "rigid" as const,
    interruptibility: "limited" as const,
    locationJurisdictionId: town,
  };
}

function job(
  world: World,
  key: string,
  personId: EntityId,
  organizationId: EntityId,
  town: EntityId,
  input: {
    readonly startedAt: string;
    readonly kind: string;
    readonly authority: "directed" | "directs-others";
    readonly title?: string;
    readonly occupation?: OccupationClassification;
  },
): World {
  return createWorkRelationship(world, {
    stableKey: key,
    personId,
    organizationId,
    startedAt: input.startedAt,
    kind: input.kind as `employment:${string}`,
    compensation: "paid",
    authority: input.authority,
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: input.title ?? "Line cook",
      occupationClassification: input.occupation ?? COOK,
      locationJurisdictionId: town,
      timeDemand: timeDemand(town),
    },
  });
}

/** A restaurant with an owner and a cook, and two applicants for a cook's job. */
function fixture(place: string) {
  const game = smallWorld({
    place,
    date: "2026-03-02",
    people: 6,
    seed: `${SEED}:${place}`,
  });
  const [, owner, cook, experienced, newcomer] = game.world.personOrder as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  const town = game.jurisdictionId;
  let world = createOrganization(game.world, {
    stableKey: "au2-dup-07:diner",
    formedAt: addDays(game.world.currentDate, -2_000),
    provenance,
    initialProfile: {
      name: "Fixture diner",
      classification: "enterprise:food-service",
      locationJurisdictionId: town,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = job(world, "au2-dup-07:cook", cook, organizationId, town, {
    startedAt: addDays(world.currentDate, -900),
    kind: "employment:food-service",
    authority: "directed",
  });
  world = job(world, "au2-dup-07:owner", owner, organizationId, town, {
    startedAt: addDays(world.currentDate, -1_800),
    kind: BUSINESS_OWNER_WORK_KIND,
    authority: "directs-others",
    title: "Owner",
  });
  // The experienced applicant cooked for three years elsewhere, then left.
  world = createOrganization(world, {
    stableKey: "au2-dup-07:other-diner",
    formedAt: addDays(world.currentDate, -3_000),
    provenance,
    initialProfile: {
      name: "Fixture other diner",
      classification: "enterprise:food-service",
      locationJurisdictionId: town,
    },
  });
  const otherId = world.history.organizations.at(-1)!.id;
  world = job(world, "au2-dup-07:past", experienced, otherId, town, {
    startedAt: addDays(world.currentDate, -1_500),
    kind: "employment:food-service",
    authority: "directed",
  });
  const past = world.history.workRelationships.at(-1)!;
  world = recordWorkStatus(world, {
    stableKey: "au2-dup-07:past:ended",
    workRelationshipId: past.id,
    effectiveAt: addDays(world.currentDate, -200),
    status: "ended",
    reason: "labor:laid-off",
    provenance,
    supersedesStatusId: workStatusAt(world, past.id)!.id,
  });
  return { world, organizationId, owner, cook, experienced, newcomer, town };
}

describe("what the work usually asks of a new hire", () => {
  it("has a typical entry row for every occupation the town's workplaces employ", () => {
    const occupations = new Set(
      TOWN_WORKPLACES.flatMap((workplace) =>
        workplace.roles.map((entry) => entry.occupation),
      ),
    );
    expect(occupations.size).toBeGreaterThan(40);
    for (const occupation of occupations) {
      const row = entryRequirementFor(occupation);
      expect(row.basis, occupation).toBe("bls-typical-entry");
      expect(row.estimatedFrom).toBe("BLS typical entry-level education");
    }
  });

  it("marks an occupation with no row as estimated from the common row", () => {
    const row = entryRequirementFor("custom:unlisted-work");
    expect(row).toMatchObject({
      basis: "estimated-from-average",
      education: "high-school",
      experience: "none",
    });
  });
});

describe("who decides a hire", () => {
  it("is the owner on record, else whoever directs, else the most senior employee", () => {
    const { world, organizationId, owner, cook } = fixture("OH");
    expect(hiringDecisionMaker(world, organizationId)).toBe(owner);
    // Without the owner, the one who directs; with nobody directing, the
    // longest-serving employee.
    const ownerWork = world.history.workRelationships.find(
      (row) => row.personId === owner && row.organizationId === organizationId,
    )!;
    const ended = recordWorkStatus(world, {
      stableKey: "au2-dup-07:owner:ended",
      workRelationshipId: ownerWork.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "labor:retired",
      provenance,
      supersedesStatusId: workStatusAt(world, ownerWork.id)!.id,
    });
    expect(hiringDecisionMaker(ended, organizationId)).toBe(cook);
    expect(hiringDecisionMaker(world, "organization-none" as EntityId)).toBe(
      null,
    );
  });
});

describe("the employer's choice goes through the shared decision", () => {
  it.each(
    pickDistinct(new SeededRng(SEED), PLACES, PLACES.length).map((place) => [
      place.jurisdictionKey,
    ]),
  )(
    "in %s, the applicant with the work behind them is hired",
    (place) => {
      const { world, organizationId, owner, experienced, newcomer } =
        fixture(place);
      const need = {
        stableKey: `au2-dup-07:${place}`,
        organizationId,
        title: "Line cook",
        occupation: COOK,
      };
      const choice = chooseHire(world, need, [
        { personId: newcomer, introducerPersonId: null },
        { personId: experienced, introducerPersonId: null },
      ]);
      expect(choice.chosenPersonId).toBe(experienced);
      expect(choice.decisionMakerPersonId).toBe(owner);
      expect(choice.shortfalls.get(newcomer)).toBe("experience");
      // The same decision, asked again of the same world, is the same decision.
      const again = chooseHire(world, need, [
        { personId: experienced, introducerPersonId: null },
        { personId: newcomer, introducerPersonId: null },
      ]);
      expect(again.chosenPersonId).toBe(experienced);
      // It is recorded as the owner's own decision, with reasons for each option.
      const trace = choice.world.history.decisionTraces.find(
        (row) => row.id === choice.decisionTraceId,
      )!;
      expect(trace.context.decisionType).toBe("labor.employer-choose-hire");
      expect(trace.context.actorPersonId).toBe(owner);
      expect(trace.context.randomness).toBe("none");
      expect(
        trace.context.considerations.some((row) =>
          row.optionKey.endsWith(newcomer),
        ),
      ).toBe(true);
    },
    60_000,
  );

  it("looks further when the only applicant has none of the work behind them", () => {
    const { world, organizationId, newcomer } = fixture("KY");
    const choice = chooseHire(
      world,
      {
        stableKey: "au2-dup-07:alone",
        organizationId,
        title: "Line cook",
        occupation: COOK,
      },
      [{ personId: newcomer, introducerPersonId: null }],
    );
    expect(choice.chosenPersonId).toBeNull();
    expect(choice.shortfalls.get(newcomer)).toBe("experience");
  });

  it("hires the only applicant for work that asks for no experience", () => {
    const { world, organizationId, newcomer } = fixture("KY");
    const choice = chooseHire(
      world,
      {
        stableKey: "au2-dup-07:no-experience",
        organizationId,
        title: "Dishwasher",
        occupation: "occupation:dishwasher",
      },
      [{ personId: newcomer, introducerPersonId: null }],
    );
    expect(choice.chosenPersonId).toBe(newcomer);
  });
});

describe("an opening a budget funds is filled by the employer's choice", () => {
  it("takes the cook with the work behind them over the one who has none, and writes the job", () => {
    const { world, organizationId, owner, experienced, newcomer } =
      fixture("OH");
    const resident = (personId: EntityId): Resident => ({
      personId,
      age: ageOnDate(world.people[personId]!.birthDate, world.currentDate),
      enrolled: false,
      parentOfYoungChild: false,
    });
    const hired = fillTownJobs(
      world,
      world.people[owner]!.homeJurisdictionId,
      [resident(newcomer), resident(experienced)],
      {
        round: "au2-dup-07-funded",
        into: {
          workplace: "restaurant",
          organizationId,
          role: "Cook",
          openings: 1,
        },
      },
    );
    const jobs = hired.history.workRelationships.filter(
      (row) =>
        row.stableKey.includes("au2-dup-07-funded") &&
        row.organizationId === organizationId,
    );
    expect(jobs.map((row) => row.personId)).toEqual([experienced]);
    const trace = hired.history.decisionTraces.find(
      (row) => row.context.decisionType === "labor.employer-choose-hire",
    )!;
    expect(trace.context.actorPersonId).toBe(owner);
    expect(trace.selectedOptionKey).toBe(`person:${experienced}`);
  });
});

describe("the employer's own temperament shapes the choice", () => {
  it("makes a missing record count for more with an employer who thinks a choice through than with one who acts on impulse", () => {
    const { world, organizationId, owner, experienced, newcomer } =
      fixture("KY");
    const eventWorld = recordWorldEvent(world, {
      stableKey: "au2-dup-07:temperament-event",
      type: "test.temperament",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [owner],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "Set for this test.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = eventWorld.history.events.at(-1)!.id;
    const weightOfMissingRecord = (value: -2 | 2) => {
      const set = recordTraitChange(eventWorld, {
        personId: owner,
        trait: "deliberation",
        value,
        eventId,
        reason: "Set for this test, so one trait argues at a time.",
      });
      const choice = chooseHire(
        set,
        {
          stableKey: `au2-dup-07:temperament:${value}`,
          organizationId,
          title: "Line cook",
          occupation: COOK,
        },
        [
          { personId: newcomer, introducerPersonId: null },
          { personId: experienced, introducerPersonId: null },
        ],
      );
      const trace = choice.world.history.decisionTraces.find(
        (row) => row.id === choice.decisionTraceId,
      )!;
      const row = trace.context.considerations.find(
        (entry) =>
          entry.optionKey === `person:${newcomer}` &&
          entry.stableKey.endsWith(":experience"),
      )!;
      return { importance: row.importance, chosen: choice.chosenPersonId };
    };
    // Low on deliberation is the one who thinks a choice through.
    const thoughtful = weightOfMissingRecord(-2);
    const impulsive = weightOfMissingRecord(2);
    expect(thoughtful.importance).toBe("strong");
    expect(impulsive.importance).toBe("slight");
    // Either way the person with the work behind them is the one hired.
    expect(thoughtful.chosen).toBe(experienced);
    expect(impulsive.chosen).toBe(experienced);
  });
});

describe("schooling on record against what the work usually asks", () => {
  function schooled(
    world: World,
    personId: EntityId,
    organizationId: EntityId,
    programKind: `${string}:${string}`,
    completed: boolean,
  ): World {
    const next = createEducationEnrollment(world, {
      stableKey: `au2-dup-07:school:${personId}:${programKind}`,
      personId,
      organizationId,
      startedAt: addDays(world.currentDate, -2_000),
      programKind: programKind as `schooling:${string}`,
      contextKind: "program:fixture",
      provenance,
    });
    if (!completed) return next;
    const enrollment = next.history.educationEnrollments.at(-1)!;
    return recordEducationEnrollmentState(next, {
      stableKey: `au2-dup-07:school:${personId}:${programKind}:done`,
      enrollmentId: enrollment.id,
      effectiveAt: addDays(world.currentDate, -400),
      status: "completed",
      contextKind: "program:fixture",
      reason: "Finished the program.",
      provenance,
      supersedesStateId: educationEnrollmentStateAt(next, enrollment.id)!.id,
    });
  }

  it("reads the highest completed schooling, and leaves a person with no record unknown", () => {
    const { world, organizationId, experienced, newcomer } = fixture("OH");
    expect(heldEducation(world, newcomer)).toEqual({
      known: false,
      level: "none",
    });
    const degree = schooled(
      world,
      newcomer,
      organizationId,
      "postsecondary:bachelors-degree",
      true,
    );
    expect(heldEducation(degree, newcomer)).toEqual({
      known: true,
      level: "bachelors",
    });
    // Schooling begun and never finished is a record, and holds no credential.
    const unfinished = schooled(
      world,
      experienced,
      organizationId,
      "schooling:secondary",
      false,
    );
    expect(heldEducation(unfinished, experienced)).toEqual({
      known: true,
      level: "none",
    });
  });

  it("hires the applicant with the degree for work that asks for one, over one with schooling unfinished", () => {
    const { world, organizationId, owner, experienced, newcomer } =
      fixture("OH");
    const prepared = schooled(
      schooled(
        world,
        newcomer,
        organizationId,
        "postsecondary:bachelors-degree",
        true,
      ),
      experienced,
      organizationId,
      "schooling:secondary",
      false,
    );
    const choice = chooseHire(
      prepared,
      {
        stableKey: "au2-dup-07:teacher",
        organizationId,
        title: "Teacher",
        occupation: "profession:teacher",
      },
      [
        { personId: experienced, introducerPersonId: null },
        { personId: newcomer, introducerPersonId: null },
      ],
    );
    expect(choice.decisionMakerPersonId).toBe(owner);
    expect(choice.chosenPersonId).toBe(newcomer);
    expect(choice.shortfalls.get(experienced)).toBe("education");
  });

  it("does not hold an unknown education against an applicant", () => {
    const { world, organizationId, newcomer } = fixture("OH");
    const choice = chooseHire(
      world,
      {
        stableKey: "au2-dup-07:teacher-unknown",
        organizationId,
        title: "Teacher",
        occupation: "profession:teacher",
      },
      [{ personId: newcomer, introducerPersonId: null }],
    );
    expect(choice.chosenPersonId).toBe(newcomer);
    expect(choice.shortfalls.get(newcomer)).toBeNull();
  });
});
