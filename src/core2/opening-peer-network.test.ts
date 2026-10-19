import { describe, expect, it } from "vitest";
import {
  buildOpeningPeerContacts,
  DEFAULT_OPENING_PEER_DATA,
} from "./opening-peer-network";
import { initialFocusPeople } from "./focus";
import { PARAMETERS, parameter as p } from "./parameters";
import { createCore, coreAPI } from "./state";
import type { CoreInput, PersonInput, Source } from "./types";

const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Small authored school-peer boundary fixture; not an observed person or empirical network.",
  estimatedFrom: "Explicit fixture identity and school-context records.",
};
const ids = [
  "person:a",
  "person:b",
  "person:c",
  "person:d",
  "person:e",
  "person:f",
];
const registry = {
  ...PARAMETERS,
  openingPeerGroupSize: {
    value: 4,
    tag: "TUNABLE" as const,
    citation:
      "Technical small-fixture group size; not a production calibration.",
  },
};
type PastFact = NonNullable<PersonInput["pastFacts"]>[number];

function schoolFact(
  id: string,
  date = "1968-08-26",
  schoolName = "Fixture High School",
): PastFact {
  return {
    id: [id, "school", date].join(":"),
    date,
    kind: DEFAULT_OPENING_PEER_DATA.contextKinds[p("zero")]!,
    summary: "Fixture estimated school context",
    source,
    facts: {
      stage: "high",
      cohortYear: "1968",
      placeId: "place:fixture",
      schoolName,
      campusIdentity: "generated",
      attendance: "cohort-estimate",
      qualification: "not-inferred",
    },
  };
}

function fixture(): CoreInput {
  const people: PersonInput[] = ids.map((id) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1954-02-20",
    placeId: "place:fixture",
    householdId: [id, "household"].join(":"),
    tier: "weekly",
    traits: {},
    liquidMinor: p("minorPerDollar"),
    livingCostDailyMinor: p("zero"),
    source,
    familyIds: [],
    knownIds: [],
    pastFacts: [schoolFact(id)],
  }));
  people[p("zero")]!.jobId = "job:fixture";
  return {
    seed: "p8-school-peer-boundary",
    startedAt,
    people,
    households: people.map((person) => ({
      id: person.householdId,
      placeId: person.placeId,
      memberIds: [person.id],
      source,
    })),
    jobs: [
      {
        id: "job:fixture",
        personId: people[p("zero")]!.id,
        organizationId: "organization:fixture",
        title: "Supplied fixture role",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("one"),
        source,
      },
    ],
    organizations: [
      {
        id: "organization:fixture",
        placeId: "place:fixture",
        name: "Supplied fixture employer",
        kind: "employer",
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    playerId: ids[p("zero")]!,
    focusPersonIds: [],
    focusPlaceIds: [],
    visiblePlaceIds: ["place:fixture"],
    calendarDates: [],
    gaps: ["Prior fixture gap"],
  };
}

function build(input = fixture()) {
  return buildOpeningPeerContacts(input, {
    personIds: [ids[p("zero")]!],
    parameters: registry,
  });
}

describe("explicit opening school-peer prior", () => {
  it("uses only existing named records and preserves non-social state", () => {
    const input = fixture();
    const snapshot = structuredClone(input);
    const result = build(input);
    expect(input).toEqual(snapshot);
    expect(result.input.jobs).toBe(input.jobs);
    expect(result.input.households).toBe(input.households);
    expect(result.input.focusPersonIds).toBe(input.focusPersonIds);
    expect(result.input.focusPlaceIds).toBe(input.focusPlaceIds);
    expect(result.contacts.length).toBeGreaterThan(p("zero"));
    const byId = new Map(
      result.input.people.map((person) => [person.id, person]),
    );
    for (const previous of input.people) {
      const next = byId.get(previous.id)!;
      expect(next.id).toBe(previous.id);
      expect(next.birthDate).toBe(previous.birthDate);
      expect(next.familyIds).toBe(previous.familyIds);
      expect(next.householdId).toBe(previous.householdId);
      expect(next.liquidMinor).toBe(previous.liquidMinor);
      expect(next.livingCostDailyMinor).toBe(previous.livingCostDailyMinor);
      expect(next.traits).toBe(previous.traits);
      expect(next.tier).toBe(previous.tier);
      expect(next.knownIds).not.toContain(next.id);
    }
    for (const contact of result.contacts) {
      expect(byId.has(contact.personIds[p("zero")]!)).toBe(true);
      expect(byId.has(contact.personIds[p("one")]!)).toBe(true);
      expect(contact.date < startedAt).toBe(true);
      for (const id of contact.personIds)
        expect(contact.date >= byId.get(id)!.birthDate).toBe(true);
    }
  });

  it("records reciprocal historical basis and persistent name provenance, without current closeness", () => {
    const result = build();
    const byId = new Map(
      result.input.people.map((person) => [person.id, person]),
    );
    for (const contact of result.contacts) {
      const left = byId.get(contact.personIds[p("zero")]!)!;
      const right = byId.get(contact.personIds[p("one")]!)!;
      expect(left.knownIds).toContain(right.id);
      expect(right.knownIds).toContain(left.id);
      for (const [self, other] of [
        [left, right],
        [right, left],
      ]) {
        const nameSource = self!.knownIdSources?.[other!.id];
        expect(nameSource?.learnedAt).toBe(contact.date);
        const fact = self!.pastFacts?.find(
          (row) => row.id === nameSource?.sourceFactId,
        );
        expect(fact?.kind).toBe(DEFAULT_OPENING_PEER_DATA.factKind);
        expect(fact?.facts?.otherPersonId).toBe(other!.id);
        expect(fact?.facts?.currentCloseness).toBe("not-inferred");
        expect(fact?.facts?.historicalAttendance).toBe("not-verified");
        expect(fact?.source.tag).toBe("ESTIMATED");
        expect(fact?.facts?.stopgapId).toBe(
          DEFAULT_OPENING_PEER_DATA.stopgapId,
        );
        expect(
          self!.pastFacts?.some((row) => row.id === fact?.facts?.contextFactId),
        ).toBe(true);
      }
    }
    const core = createCore(result.input);
    expect(core.stopgapHits.has(DEFAULT_OPENING_PEER_DATA.stopgapId)).toBe(
      true,
    );
    expect(core.relationships.size).toBe(p("zero"));
    for (const contact of result.contacts) {
      const left = core.people.get(contact.personIds[p("zero")]!)!;
      const right = core.people.get(contact.personIds[p("one")]!)!;
      const knowledge = coreAPI(core).knows(
        left.id,
        ["person", right.id, "name"].join(":"),
      );
      expect(knowledge?.sourceId).toBe(
        left.knownIdSources?.[right.id]?.sourceFactId,
      );
      expect(knowledge?.learnedAt).toBe(contact.date);
    }
    const suppliedJob = result.input.jobs[p("zero")]!;
    const payKey = ["job", suppliedJob.id, "pay"].join(":");
    expect(coreAPI(core).knows(suppliedJob.personId, payKey)?.value).toBe(
      String(suppliedJob.wageDailyMinor),
    );
    for (const actorId of new Set(
      result.contacts.flatMap((row) => row.personIds),
    ))
      if (actorId !== suppliedJob.personId)
        expect(coreAPI(core).knows(actorId, payKey)).toBeUndefined();
    expect(initialFocusPeople(result.input).has(ids[p("zero")]!)).toBe(true);
    for (const id of result.reports[p("zero")]!.peerIds)
      expect(initialFocusPeople(result.input).has(id)).toBe(true);
  });

  it("preserves known family/name sources and never re-labels them as newly generated", () => {
    const input = fixture();
    const adult = input.people[p("zero")]!;
    const known = input.people[p("one")]!;
    const past: PastFact = {
      id: "recorded:prior-name",
      date: "2010-01-01",
      kind: "social:recorded-acquaintance",
      summary: "Fixture supplied prior name knowledge",
      source,
      facts: { otherPersonId: known.id },
    };
    const provided = { sourceFactId: past.id, learnedAt: past.date };
    adult.familyIds = [known.id];
    adult.knownIds = [known.id];
    adult.knownIdSources = { [known.id]: provided };
    adult.pastFacts = [...adult.pastFacts!, past];
    const result = buildOpeningPeerContacts(input, {
      personIds: [adult.id],
      parameters: {
        ...registry,
        openingPeerGroupSize: {
          ...registry.openingPeerGroupSize,
          value: ids.length,
        },
      },
    });
    const next = result.input.people.find((person) => person.id === adult.id)!;
    expect(next.familyIds).toBe(adult.familyIds);
    expect(next.knownIdSources?.[known.id]).toBe(provided);
    expect(next.pastFacts).toContain(past);
  });

  it("is idempotent and keeps generic createCore knowledge provenance on a rebuilt input", () => {
    const first = build();
    const second = build(first.input);
    expect(second).toEqual(first);
    const recreated = createCore(second.input);
    for (const person of second.input.people)
      for (const [otherId, nameSource] of Object.entries(
        person.knownIdSources ?? {},
      )) {
        const knowledge = coreAPI(recreated).knows(
          person.id,
          ["person", otherId, "name"].join(":"),
        );
        expect(knowledge?.sourceId).toBe(nameSource.sourceFactId);
        expect(knowledge?.learnedAt).toBe(nameSource.learnedAt);
      }
  });

  it("does not infer acquaintance from a common town or incomplete school fields", () => {
    const input = fixture();
    const adult = input.people[p("zero")]!;
    adult.pastFacts = [
      { ...schoolFact(adult.id), facts: { placeId: adult.placeId } },
    ];
    const result = build(input);
    expect(result.contacts).toEqual([]);
    expect(result.input.people).toEqual(input.people);
    expect(result.reports[p("zero")]!.status).toBe("unresolved");
  });

  it("does not fill a small newest cohort from a larger earlier cohort", () => {
    const input = fixture();
    const adult = input.people[p("zero")]!;
    adult.pastFacts = [
      ...adult.pastFacts!,
      schoolFact(adult.id, "1969-08-25", "Different Recorded School"),
    ];
    const result = build(input);
    expect(result.contacts).toEqual([]);
    expect(result.reports[p("zero")]!.peerIds).toEqual([]);
    expect(result.input.people).toEqual(input.people);
  });

  it("uses birth and actual opening boundaries without inventing older dates", () => {
    for (const date of ["1950-01-01", startedAt, "2022-08-26"]) {
      const input = fixture();
      for (const person of input.people)
        person.pastFacts = [schoolFact(person.id, date)];
      const result = build(input);
      expect(result.contacts).toEqual([]);
      expect(result.input.people).toEqual(input.people);
    }
    const input = fixture();
    input.people[p("zero")]!.pastFacts = [
      schoolFact(ids[p("zero")]!, "1968-02-30"),
    ];
    const snapshot = structuredClone(input);
    expect(() => build(input)).toThrow(/date/i);
    expect(input).toEqual(snapshot);
  });

  it("has stable named groups independent of source row order and request order", () => {
    const input = fixture();
    const reordered = { ...input, people: [...input.people].reverse() };
    const first = build(input);
    const second = build(reordered);
    expect(second.contacts).toEqual(first.contacts);
    expect(second.reports).toEqual(first.reports);
    for (const person of first.input.people)
      expect(second.input.people.find((row) => row.id === person.id)).toEqual(
        person,
      );
    expect(() =>
      buildOpeningPeerContacts(input, {
        personIds: ["person:absent"],
        parameters: registry,
      }),
    ).toThrow(/absent/i);
  });

  it("rejects a conflicting existing fact ID without mutating the input", () => {
    const first = build();
    const input = structuredClone(first.input);
    const owner = input.people.find((person) =>
      person.pastFacts?.some(
        (fact) => fact.kind === DEFAULT_OPENING_PEER_DATA.factKind,
      ),
    )!;
    owner.pastFacts = owner.pastFacts!.map((fact) =>
      fact.kind === DEFAULT_OPENING_PEER_DATA.factKind
        ? { ...fact, summary: "Contradictory fixture past" }
        : fact,
    );
    const snapshot = structuredClone(input);
    expect(() => build(input)).toThrow(/contradict/i);
    expect(input).toEqual(snapshot);
  });
});
