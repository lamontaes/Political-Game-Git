import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { searchLifePlaces, stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import {
  createHousehold,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "../life";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import { recordPersonDeath } from "../vitality";
import {
  localOutcomeKey,
  placeOutcomeAt,
  placeOutcomesForMonth,
  type PlaceOutcomeRecord,
} from "../outcome-web/place-outcomes";
import { STATES } from "../state-reference";
import type {
  EntityId,
  IsoDate,
  HistoricalEvent,
  LegislativeVoteRecord,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  LAW_EFFECT_EVENT_TYPE,
  LAW_EFFECT_MEASURE_TAG,
  lawNewsReaders,
  lawOutcomeFindings,
} from "./law-effect-news";

/*
 * A law that moves a place's outcome is news a year after it took effect,
 * and so is its repeal. One rule for all 56 places: a town in every state,
 * D.C. and territory passes the same ordinance. The world is partial and
 * unseeded, as in the outcome web's own city test, so nothing drifts and the
 * law acts at its central size.
 */

const OVERSIGHT = "proposition_civilian_oversight" as EntityId;
const OVERSIGHT_KEY =
  "us-policy-positions:justice-public-safety.civilian-oversight-of-police";
const CRIME = "crime.violent";

function ordinance(
  jurisdictionId: EntityId,
  tag: string,
  answer: "yes" | "no",
  effectiveAt: string,
  sequence: number,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${tag}_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${tag}:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `ORD ${sequence}`,
      shortTitle: "Civilian Oversight of Police Ordinance",
      summary: "A test ordinance.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [OVERSIGHT],
      propositionAnswers: [{ propositionId: OVERSIGHT, answer }],
    },
    enactment: {
      id: `enactment_${tag}_${sequence}` as EntityId,
      stableKey: `test:${tag}:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_${tag}_${sequence}` as EntityId,
    },
  };
}

type Law = ReturnType<typeof ordinance>;

function worldWith(
  laws: readonly Law[],
  currentDate: string,
  months: readonly {
    month: IsoDate;
    records: readonly PlaceOutcomeRecord[];
  }[] = [],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    policyCatalog: {
      propositions: {
        [OVERSIGHT]: {
          id: OVERSIGHT,
          stableKey: OVERSIGHT_KEY,
          name: "Civilian oversight of police",
        },
      },
    },
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
    placeOutcomes: { months },
  } as unknown as World;
}

/** The world on `on`, after its monthly passes from January 2026. */
function run(laws: readonly Law[], through: string, on: string): World {
  let world = worldWith(laws, on);
  let month = makeIsoDate("2026-01-01");
  while (month <= through) {
    const records = placeOutcomesForMonth(world, month);
    world = worldWith(laws, on, [
      ...(world.placeOutcomes?.months ?? []),
      { month, records },
    ]);
    const date = new Date(`${month}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    month = makeIsoDate(date.toISOString().slice(0, 10));
  }
  return world;
}

/** A town in each of the 56 places. */
const TOWNS = Object.keys(STATES).map((usps) => {
  const key = `US-${usps}`;
  const town = searchLifePlaces("", 5, {
    stateJurisdictionKey: key,
    scope: "locality",
  })[0]!;
  return { key, jurisdictionId: town.context.jurisdiction.id };
});

/**
 * Whether the outcome web itself shows the ordinance acting in the town that
 * month: its own record, moved. A town whose state keeps no crime base, D.C.
 * (no city under it), or a town the state does not let answer the question
 * has none.
 */
function actsIn(world: World, jurisdictionId: EntityId, on: string): boolean {
  const record = placeOutcomeAt(world, CRIME, jurisdictionId, makeIsoDate(on));
  return (
    record !== null &&
    record.placeKey === localOutcomeKey(jurisdictionId) &&
    record.multiplier !== 1
  );
}

describe("a law that moves a place's outcome is news a year on", () => {
  it("in every one of the 56 places, the ordinance's first year is reported, and its repeal's", () => {
    expect(TOWNS).toHaveLength(56);
    const enacted = TOWNS.map((town, index) =>
      ordinance(town.jurisdictionId, town.key, "yes", "2026-03-01", index + 1),
    );
    const repealed = TOWNS.map((town, index) =>
      ordinance(town.jurisdictionId, town.key, "no", "2027-09-01", index + 101),
    );
    const places = TOWNS.map((town) => town.jurisdictionId);

    // Before its anniversary, nothing.
    const early = run(enacted, "2027-02-01", "2027-02-20");
    expect(lawOutcomeFindings(early, places)).toEqual([]);

    const yearOn = run([...enacted, ...repealed], "2027-03-01", "2027-03-10");
    const found = lawOutcomeFindings(yearOn, places).filter(
      (finding) => finding.outcome === CRIME,
    );
    const acting = TOWNS.filter((town) =>
      actsIn(yearOn, town.jurisdictionId, "2027-03-01"),
    );
    for (const town of TOWNS) {
      const finding = found.find((row) => row.place === town.jurisdictionId);
      if (!acting.includes(town)) {
        expect(finding, town.key).toBeUndefined();
        continue;
      }
      expect(finding, town.key).toBeDefined();
      expect(finding!.answer).toBe("yes");
      expect(finding!.question).toBe("Civilian oversight of police");
      // Civilian oversight acts after 12 months: 2% less violent crime.
      expect(finding!.after / finding!.before).toBeCloseTo(0.98, 3);
    }
    expect(found.length).toBe(acting.length);
    // 32 of 56 towns may pass it and keep a crime record of their own.
    expect(found.length).toBeGreaterThan(20);

    // A year after the repeal took effect, the other way.
    const repealYear = run(
      [...enacted, ...repealed],
      "2028-09-01",
      "2028-09-10",
    );
    const undone = lawOutcomeFindings(repealYear, places).filter(
      (finding) => finding.outcome === CRIME,
    );
    expect(undone.length).toBe(found.length);
    for (const finding of undone) {
      expect(finding.answer).toBe("no");
      expect(finding.enactment.effectiveAt).toBe("2027-09-01");
      expect(finding.after / finding.before).toBeCloseTo(1 / 0.98, 3);
    }
  });

  it("a late sweep still finds it within the window, and not after", () => {
    const town = TOWNS.find((row) =>
      actsIn(
        run(
          [ordinance(row.jurisdictionId, row.key, "yes", "2026-03-01", 1)],
          "2027-03-01",
          "2027-03-10",
        ),
        row.jurisdictionId,
        "2027-03-01",
      ),
    )!;
    const law = ordinance(
      town.jurisdictionId,
      town.key,
      "yes",
      "2026-03-01",
      1,
    );
    const late = run([law], "2027-03-01", "2027-03-30");
    expect(lawOutcomeFindings(late, [town.jurisdictionId])).not.toEqual([]);
    const tooLate = run([law], "2027-04-01", "2027-04-05");
    expect(lawOutcomeFindings(tooLate, [town.jurisdictionId])).toEqual([]);
  });
});

// A bounded reader fixture: real place IDs, canonical residence writers,
// and explicit authored law/vote records. No opening-life generation.
function readerFixture() {
  const town = searchLifePlaces("Carson City").find(
    (place) => place.stateJurisdictionKey === "US-NV",
  )!;
  const away = searchLifePlaces("Reno").find(
    (place) => place.stateJurisdictionKey === "US-NV",
  )!;
  const seed = "law-news-residence";
  const date = makeIsoDate("2026-03-01");
  const people = Array.from({ length: 6 }, (_, index) =>
    createLightweightPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      index,
      currentDate: date,
      homeJurisdictionId: town.context.jurisdiction.id,
    }),
  );
  let world = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [town.context.jurisdiction, away.context.jurisdiction],
    people,
  });
  const provenance = { kind: "authored", note: "Law reader fixture." } as const;
  for (const index of [0, 1, 2, 3]) {
    world = createHousehold(world, {
      stableKey: `reader:house:${index}`,
      formedAt: date,
      label: `Reader household ${index}`,
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    world = recordHouseholdLocation(world, {
      stableKey: `reader:location:${index}`,
      householdId,
      effectiveAt: date,
      jurisdictionId:
        index < 2 ? town.context.jurisdiction.id : away.context.jurisdiction.id,
      label: "Fixture residence",
      kind: "residence:fixture",
      provenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: `reader:membership:${index}`,
      personId: people[index]!.id,
      householdId,
      startedAt: date,
      residenceRole: index === 1 ? "secondary" : "primary",
      kind: "resident:fixture",
      provenance,
    });
  }
  world = recordWorldEvent(world, {
    stableKey: "reader:law-effect",
    type: LAW_EFFECT_EVENT_TYPE,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: town.context.jurisdiction.id,
    involvedEntityIds: [town.context.jurisdiction.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "A recorded local law changed residents' pay.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    people,
    event: world.history.events.at(-1)!,
    town,
    away,
    provenance,
  };
}

describe("law story resident readers", () => {
  it("reaches actual residents without a measure or subscription and leaves the world unchanged", () => {
    const { world, people, event } = readerFixture();
    const before = JSON.stringify(world);
    expect(lawNewsReaders(world, event)).toEqual(
      [people[0]!.id, people[1]!.id].sort(),
    );
    // All six still have the town as their home field. Only two actually live there.
    expect(
      people.every(
        (person) => person.homeJurisdictionId === event.jurisdictionId,
      ),
    ).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("follows recorded moves into and out of the story's town", () => {
    const fixture = readerFixture();
    let { world } = fixture;
    const { people, event, town, away, provenance } = fixture;
    for (const index of [0, 2]) {
      const previous = world.history.householdLocations[index]!;
      world = recordHouseholdLocation(world, {
        stableKey: `reader:move:${index}`,
        householdId: previous.householdId,
        effectiveAt: world.currentDate,
        jurisdictionId:
          index === 0
            ? away.context.jurisdiction.id
            : town.context.jurisdiction.id,
        label: "Moved residence",
        kind: "residence:fixture",
        provenance,
        supersedesLocationId: previous.id,
      });
    }
    expect(lawNewsReaders(world, event)).toEqual(
      [people[1]!.id, people[2]!.id].sort(),
    );
  });

  it("excludes ended residence while retaining the other resident", () => {
    const { world, people, event, provenance } = readerFixture();
    const previous = world.history.householdMembershipStates[0]!;
    const next = recordHouseholdMembershipState(world, {
      stableKey: "reader:ended",
      membershipId: previous.membershipId,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: previous.residenceRole,
      kind: previous.kind,
      provenance,
      supersedesStateId: previous.id,
    });
    expect(lawNewsReaders(next, event)).toEqual([people[1]!.id]);
  });

  it("does not deliver resident news to a person whose death is recorded", () => {
    const { world, people, event, provenance } = readerFixture();
    const next = recordPersonDeath(world, {
      stableKey: "reader:death",
      personId: people[0]!.id,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "An authored fixture death.",
      provenance,
    });
    expect(lawNewsReaders(next, event)).toEqual([people[1]!.id]);
  });

  it("uses actual household locations for statewide reach", () => {
    const { world, people, event, town } = readerFixture();
    const state = stateJurisdictionForKey(town.stateJurisdictionKey!)!;
    expect(
      lawNewsReaders(world, { ...event, jurisdictionId: state.id }),
    ).toEqual(
      people
        .slice(0, 4)
        .map((person) => person.id)
        .sort(),
    );
  });

  it("does not add a resident audience to private, future or unrelated events", () => {
    const { world, event } = readerFixture();
    const variants: HistoricalEvent[] = [
      { ...event, visibility: "private" },
      { ...event, occurredAt: makeIsoDate("2026-03-02") },
      { ...event, recordedAt: makeIsoDate("2026-03-02") },
      { ...event, type: "world.created" },
    ];
    for (const candidate of variants)
      expect(lawNewsReaders(world, candidate)).toEqual([]);
  });

  it("preserves subjects, sponsors and floor voters and deduplicates residents", () => {
    const { world, people, event, town } = readerFixture();
    const measure = {
      ...ordinance(
        town.context.jurisdiction.id,
        "readers",
        "yes",
        world.currentDate,
        world.history.nextSequence,
      ).measure,
      sponsorPersonId: people[3]!.id,
    };
    const vote: LegislativeVoteRecord = {
      id: "vote_reader_fixture" as EntityId,
      stableKey: "reader:vote",
      sequence: world.history.nextSequence + 1,
      measureId: measure.id,
      forum: { kind: "chamber", chamberKey: "council" },
      purpose: "floor-stage",
      floorStageKey: null,
      takenAt: world.currentDate,
      eligibleMembers: 1,
      presentMembers: 1,
      dispositions: [
        { memberKey: "member-1", personId: people[4]!.id, disposition: "yea" },
      ],
      tally: { yea: 1, nay: 0, presentNotVoting: 0, absent: 0, excused: 0 },
      thresholdLabel: "Fixture majority",
      denominatorKind: "membership",
      denominatorValue: 1,
      requiredVotes: 1,
      outcome: "passed",
      provenance: {
        method: "authored-fixture",
        note: "Reader regression fixture.",
        sourceEntityIds: [],
      },
    };
    const next: World = {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 2,
        legislativeMeasures: [measure],
        legislativeVotes: [vote],
      },
    };
    expect(
      lawNewsReaders(next, {
        ...event,
        involvedEntityIds: [people[0]!.id, people[5]!.id],
        tags: [`${LAW_EFFECT_MEASURE_TAG}${measure.id}`],
      }),
    ).toEqual([0, 1, 3, 4, 5].map((index) => people[index]!.id).sort());
  });
});
