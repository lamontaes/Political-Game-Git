import { describe, expect, it } from "vitest";
import {
  lifePlaces,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import {
  buildDeepPast,
  DEFAULT_DEEP_PAST_DATA,
  type DeepPastFieldSource,
} from "./deep-past";
import { parameter as p } from "./parameters";
import type { CoreInput, PersonInput, Source } from "./types";

const seed = "p8-deep-past-source-cohorts";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = new SeededRng(`${seed}:place`).pick(
  lifePlaces().filter(
    (row) =>
      row.scope === "locality" &&
      row.stateJurisdictionKey === state.jurisdictionKey,
  ),
);
const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Authored deep-past constraints fixture, not an observed real person.",
  estimatedFrom: "A supplied identity, job start and dated personal record.",
};
type PastFact = NonNullable<PersonInput["pastFacts"]>[number] & {
  facts?: Readonly<Record<string, string>>;
};
type Reported = CoreInput & {
  priorFactsSource?: readonly DeepPastFieldSource[];
};

function person(
  id: string,
  birthDate: string,
  pastFacts: readonly PastFact[] = [],
): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate,
    placeId: place.context.jurisdiction.id,
    householdId: "household:fixture",
    tier: "daily",
    traits: {},
    liquidMinor: p("minorPerDollar") * p("percent"),
    livingCostDailyMinor: p("minorPerDollar"),
    source,
    familyIds: [],
    knownIds: [],
    pastFacts,
  };
}

function input(): CoreInput {
  const adult = person("person:adult", "1980-07-15", [
    {
      id: "known:birth",
      date: "1980-07-15",
      kind: "birth-date",
      summary: "Recorded birth date",
      source,
    },
    {
      id: "job:fixture:past:opening",
      date: "2018-04-01",
      kind: "work:opening",
      summary: "Recorded opening job start",
      source,
    },
    {
      id: "known:faith",
      date: "2015-02-01",
      kind: "faith:affiliation",
      summary: "Recorded affiliation",
      source,
    },
  ]);
  adult.jobId = "job:fixture";
  const children = [
    person("person:school-age", "2006-09-02"),
    person("person:infant", "2020-07-10"),
  ];
  return {
    seed,
    startedAt,
    people: [adult, ...children],
    households: [
      {
        id: "household:fixture",
        placeId: adult.placeId,
        memberIds: [adult.id, ...children.map((row) => row.id)],
        source,
      },
    ],
    jobs: [
      {
        id: "job:fixture",
        personId: adult.id,
        organizationId: "organization:fixture",
        title: "Analyst",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("workHours"),
        source,
      },
    ],
    organizations: [
      {
        id: "organization:fixture",
        placeId: adult.placeId,
        name: "Fixture employer",
        kind: "employer",
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [adult.placeId],
    calendarDates: [],
    gaps: [],
    placeMetadata: { placeKey: place.key, placeName: place.displayName },
  };
}

describe(`deep past, ${place.displayName}, ${state.name}, seed ${seed}`, () => {
  it("adds only dated prior facts within each supplied lifetime", () => {
    const before = input();
    const after = buildDeepPast(before);
    for (const actor of after.people) {
      const priorIds = new Set(
        before.people
          .find((row) => row.id === actor.id)!
          .pastFacts!.map((fact) => fact.id),
      );
      const added = actor.pastFacts!.filter((fact) => !priorIds.has(fact.id));
      for (const fact of added) {
        expect(fact.date >= actor.birthDate).toBe(true);
        expect(fact.date < startedAt).toBe(true);
        expect(fact.source.citation.length).toBeGreaterThan(p("zero"));
      }
      expect(new Set(actor.pastFacts!.map((fact) => fact.id)).size).toBe(
        actor.pastFacts!.length,
      );
    }
    const infant = after.people.find((row) => row.id === "person:infant")!;
    expect(
      infant.pastFacts!.some(
        (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.schools.kind,
      ),
    ).toBe(false);
    expect(
      infant.pastFacts!.some((fact) => fact.kind === "era:public-context"),
    ).toBe(false);
    const younger = after.people.find((row) => row.id === "person:school-age")!;
    expect(younger.pastFacts!.some((fact) => fact.date === "2001-09-11")).toBe(
      false,
    );
    expect(younger.pastFacts!.some((fact) => fact.date === "2020-03-11")).toBe(
      true,
    );
  });

  it("matches school cohorts to place and keeps attendance and credentials estimated", () => {
    const after = buildDeepPast(input());
    const adult = after.people.find((row) => row.id === "person:adult")!;
    const schools = adult.pastFacts!.filter(
      (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.schools.kind,
    ) as PastFact[];
    expect(schools.length).toBe(DEFAULT_DEEP_PAST_DATA.schools.stages.length);
    for (const fact of schools) {
      expect(fact.source.tag).toBe("ESTIMATED");
      expect(fact.facts!.placeId).toBe(adult.placeId);
      expect(fact.facts!.schoolName!.length).toBeGreaterThan(p("zero"));
      expect(fact.facts!.attendance).toBe("cohort-estimate");
      expect(fact.facts!.qualification).toBe("not-inferred");
      expect(fact.facts!.stopgapId).toBe("SG-P8-deep-past");
    }
    expect(schools.map((fact) => fact.date)).toEqual(
      [...schools.map((fact) => fact.date)].sort(),
    );
  });

  it("preserves established facts, sources, identity, funds and known-person constraints", () => {
    const before = input();
    const after = buildDeepPast(before);
    expect(after.jobs).toBe(before.jobs);
    expect(after.organizations).toBe(before.organizations);
    expect(after.households).toBe(before.households);
    for (const actor of before.people) {
      const result = after.people.find((row) => row.id === actor.id)!;
      expect(result.id).toBe(actor.id);
      expect(result.birthDate).toBe(actor.birthDate);
      expect(result.traits).toBe(actor.traits);
      expect(result.source).toBe(actor.source);
      expect(result.familyIds).toBe(actor.familyIds);
      expect(result.knownIds).toBe(actor.knownIds);
      expect(result.liquidMinor).toBe(actor.liquidMinor);
      expect(result.livingCostDailyMinor).toBe(actor.livingCostDailyMinor);
      for (const fact of actor.pastFacts!)
        expect(result.pastFacts!.find((row) => row.id === fact.id)).toBe(fact);
    }
    const adult = after.people.find((row) => row.id === "person:adult")!;
    const tenure = adult.pastFacts!.find(
      (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.work.kind,
    ) as PastFact;
    expect(tenure.date).toBe("2018-04-01");
    expect(tenure.source).toBe(source);
    expect(tenure.facts!.sourceFactId).toBe("job:fixture:past:opening");
    expect(tenure.facts!.earnings).toBe("not-reconstructed");
    const reports = (after as Reported).priorFactsSource!;
    expect(
      reports.find((row) => row.personId === adult.id && row.field === "faith")!
        .status,
    ).toBe("preserved");
    expect(
      reports.find(
        (row) => row.personId === adult.id && row.field === "losses",
      )!.status,
    ).toBe("unresolved");
  });

  it("is repeatable and only seeded generated school identity varies between worlds", () => {
    const before = input();
    const first = buildDeepPast(before);
    expect(buildDeepPast(before)).toEqual(first);
    expect(buildDeepPast(first)).toEqual(first);
    const schoolNames = new Set<string>();
    for (const worldSeed of [seed, `${seed}:another`, `${seed}:third`]) {
      const result = buildDeepPast({ ...before, seed: worldSeed });
      expect(
        result.people.map((row) => [row.id, row.birthDate, row.liquidMinor]),
      ).toEqual(
        before.people.map((row) => [row.id, row.birthDate, row.liquidMinor]),
      );
      const schools = result.people[p("zero")]!.pastFacts!.filter(
        (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.schools.kind,
      ) as PastFact[];
      schoolNames.add(schools.map((fact) => fact.facts!.schoolName).join(";"));
    }
    expect(schoolNames.size).toBeGreaterThan(p("one"));
  });

  it("keeps an already clicked school constraint and augments a newly supplied person additively", () => {
    const before = input();
    const clicked: PastFact = {
      id: "clicked:school",
      date: "1994-09-01",
      kind: "education:secondary",
      summary: "Established named school",
      source,
      facts: {
        placeId: place.context.jurisdiction.id,
        schoolName: "Recorded campus",
      },
    };
    const adult = {
      ...before.people[p("zero")]!,
      pastFacts: [...before.people[p("zero")]!.pastFacts!, clicked],
    };
    const first = buildDeepPast({
      ...before,
      people: [adult, ...before.people.slice(p("one"))],
    });
    expect(
      first.people[p("zero")]!.pastFacts!.find(
        (fact) => fact.id === clicked.id,
      ),
    ).toBe(clicked);
    expect(
      first.people[p("zero")]!.pastFacts!.some(
        (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.schools.kind,
      ),
    ).toBe(false);
    const added = person("person:late-click", "1992-01-31");
    const second = buildDeepPast({
      ...first,
      people: [...first.people, added],
    });
    for (const actor of first.people)
      expect(second.people.find((row) => row.id === actor.id)).toBe(actor);
    expect(
      second.people.find((row) => row.id === added.id)!.pastFacts!.length,
    ).toBeGreaterThan(p("zero"));
  });

  it("admits another dated era from data without assigning knowledge or an outcome", () => {
    const extra = {
      id: "additional-archive-date",
      date: "2010-06-01",
      kind: "era:additional-source",
      title: "Additional archive context",
      facts: { sourceRecordId: "archive:fixture" },
      source,
    };
    const after = buildDeepPast(input(), {
      data: {
        ...DEFAULT_DEEP_PAST_DATA,
        eras: [...DEFAULT_DEEP_PAST_DATA.eras, extra],
      },
    });
    const adult = after.people[p("zero")]!;
    const fact = adult.pastFacts!.find(
      (row) => row.kind === extra.kind,
    ) as PastFact;
    expect(fact.date).toBe(extra.date);
    expect(fact.source).toBe(extra.source);
    expect(fact.facts!.knowledge).toBe("not-inferred");
    expect(fact.facts!.cohortRelation).toBe("alive-on-context-date");
  });

  it("refuses conflicting birth dates and avoids backdating a town across missing move evidence", () => {
    const before = input();
    const conflicting = {
      ...before.people[p("zero")]!,
      birthDate: "1981-07-15",
    };
    expect(() => buildDeepPast({ ...before, people: [conflicting] })).toThrow(
      /birth date contradicts/,
    );
    const move: PastFact = {
      id: "known:move",
      date: "1983-01-01",
      kind: "residence:move",
      summary: "Recorded earlier move with location omitted",
      source,
    };
    const constrained = {
      ...before.people[p("zero")]!,
      pastFacts: [...before.people[p("zero")]!.pastFacts!, move],
    };
    const after = buildDeepPast({ ...before, people: [constrained] });
    expect(
      after.people[p("zero")]!.pastFacts!.some(
        (fact) => fact.kind === DEFAULT_DEEP_PAST_DATA.schools.kind,
      ),
    ).toBe(false);
    expect(
      (after as Reported).priorFactsSource!.find(
        (row) => row.field === DEFAULT_DEEP_PAST_DATA.schools.field,
      )!.status,
    ).toBe("unresolved");
  });
});
