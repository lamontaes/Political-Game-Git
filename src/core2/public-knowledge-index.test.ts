import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { createLifeCore, availableActs } from "./life";
import { LIFE_MODULE } from "./modules/life";
import { parameter as p } from "./parameters";
import { coreAPI, knownPublicOrganizationIds } from "./state";
import type { CoreInput, CoreState, PersonInput, Source } from "./types";

const date = "2021-01-01";
const actorId = "person:public-knowledge-fixture";
const otherId = "person:other-public-knowledge-fixture";
const town = "place:public-knowledge-town";
const county = "place:public-knowledge-county";
const townFirst = "organization:town-first";
const townSecond = "organization:town-second";
const countyFirst = "organization:county-first";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation:
    "Small authored knowledge/order boundary fixture; no observed person or institution.",
};

function fixture(samePlace = false): CoreInput {
  const people: PersonInput[] = [actorId, otherId].map((id) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: town,
    countyId: samePlace ? town : county,
    householdId: "household:" + id,
    tier: "weekly",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("zero"),
    familyIds: [],
    knownIds: [],
    source,
  }));
  return {
    seed: "public-knowledge-projection-fixture",
    startedAt: date,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [],
    organizations: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    visiblePlaceIds: [town, county],
    calendarDates: [],
    gaps: [],
    publicOrganizations: [
      {
        id: countyFirst,
        placeId: county,
        name: countyFirst,
        kind: "fixture",
        source,
        affordances: ["known-group", "public-meeting-place", "known-office"],
      },
      {
        id: townFirst,
        placeId: town,
        name: townFirst,
        kind: "fixture",
        source,
        affordances: ["known-group", "public-meeting-place", "known-office"],
      },
      {
        id: townSecond,
        placeId: town,
        name: townSecond,
        kind: "fixture",
        source,
        affordances: ["known-group", "public-meeting-place"],
      },
    ],
  };
}
function targets(core: CoreState, kind: string, id = actorId): string[] {
  const action = DEFAULT_DATA.actions.find((row) => row.targetKind === kind)!;
  const provide = LIFE_MODULE.offerProviders![kind]!;
  return provide(coreAPI(core), core.people.get(id)!, action).map(
    (row) => row.targetId,
  );
}
function learn(
  core: CoreState,
  organizationId: string,
  value = organizationId,
  id = actorId,
): void {
  coreAPI(core).observe(id, {
    key: `organization:${organizationId}:public`,
    value,
    learnedAt: date,
    sourceId: organizationId,
    access: "perceived",
  });
}

describe("fresh actor-private public knowledge projection", () => {
  it("keeps unknown targets out, empty-valued observed facts true, and actual local source order", () => {
    const core = createLifeCore(fixture());
    expect(targets(core, "known-group")).toEqual([]);
    expect(targets(core, "public-directory")).toEqual([
      townFirst,
      townSecond,
      countyFirst,
    ]);
    learn(core, countyFirst);
    learn(core, townSecond, "");
    learn(core, townFirst);
    expect(targets(core, "known-group")).toEqual([
      townFirst,
      townSecond,
      countyFirst,
    ]);
    expect(targets(core, "public-meeting-place")).toEqual([
      townFirst,
      townSecond,
      countyFirst,
    ]);
    expect(targets(core, "public-directory")).toEqual([]);
    expect(
      coreAPI(core).knows(actorId, `organization:${townSecond}:public`)?.value,
    ).toBe("");
    learn(core, townSecond, "Replacement observed label");
    expect(targets(core, "known-group")).toEqual([
      townFirst,
      townSecond,
      countyFirst,
    ]);
    expect(
      coreAPI(core).knows(actorId, `organization:${townSecond}:public`)?.value,
    ).toBe("Replacement observed label");
    expect(targets(core, "known-group", otherId)).toEqual([]);
  });

  it("reads observations between provider calls and ignores wrong keys and nonlocal or absent targets", () => {
    const core = createLifeCore(fixture());
    expect(targets(core, "known-group")).toEqual([]);
    coreAPI(core).observe(actorId, {
      key: `organization:${townFirst}:address`,
      value: "Recorded address",
      learnedAt: date,
      sourceId: townFirst,
      access: "public",
    });
    expect(targets(core, "known-group")).toEqual([]);
    learn(core, townFirst);
    expect(targets(core, "public-meeting-place")).toEqual([townFirst]);
    learn(core, "organization:absent");
    expect(targets(core, "known-group")).toEqual([townFirst]);
    expect(targets(core, "known-office")).toEqual([]); // No recorded staff, even with a known office.
    expect(knownPublicOrganizationIds(core, "person:absent").size).toBe(
      p("zero"),
    );
    expect(availableActs(core, "person:absent")).toEqual([]);
  });

  it("isolates identical IDs across interleaved worlds and keeps reads free of learned facts or acts", () => {
    const first = createLifeCore(fixture());
    const second = createLifeCore(fixture());
    expect(targets(first, "known-group")).toEqual([]);
    expect(targets(second, "known-group")).toEqual([]);
    learn(first, townFirst);
    expect(targets(first, "known-group")).toEqual([townFirst]);
    expect(targets(second, "known-group")).toEqual([]);
    const knowledge = new Map(first.knowledgeByPerson.get(actorId));
    targets(first, "public-directory");
    targets(second, "public-directory");
    expect(first.knowledgeByPerson.get(actorId)).toEqual(knowledge);
    expect(first.date).toBe(date);
    expect(first.people.get(actorId)!.actCount).toBe(p("zero"));
    expect(first.eventIds.size).toBe(p("zero"));
    expect(first.durableLog.size).toBe(p("zero"));
  });

  it("keeps fresh observations made by a registered provider visible later in the same menu", () => {
    const probeKind = "fixture:observe-public-record";
    const group = DEFAULT_DATA.actions.find(
      (row) => row.targetKind === "known-group",
    )!;
    const probe = {
      ...group,
      id: "fixture:record-observation",
      targetKind: probeKind,
    };
    const core = createLifeCore(fixture(), {
      data: {
        ...DEFAULT_DATA,
        actions: [probe, { ...group, prerequisites: [] }],
      },
      modules: [
        {
          id: "fixture:provider-observation",
          offerProviders: {
            [probeKind]: (api, actor) => {
              api.observe(actor.id, {
                key: `organization:${townFirst}:public`,
                value: townFirst,
                learnedAt: api.state.date,
                sourceId: townFirst,
                access: "perceived",
              });
              return [];
            },
          },
        },
      ],
    });
    expect(targets(core, "known-group")).toEqual([]); // Prime the negative projection.
    expect(availableActs(core, actorId).map((row) => row.targetId)).toEqual([
      townFirst,
    ]);
    expect(core.people.get(actorId)!.actCount).toBe(p("zero"));
  });

  it("admits the same actual known office only when a recorded staff job exists", () => {
    const input = fixture();
    const jobId = "job:public-knowledge-staff";
    input.people = input.people.map((row) =>
      row.id === otherId ? { ...row, jobId } : row,
    );
    input.organizations = [
      {
        id: townFirst,
        placeId: town,
        name: townFirst,
        kind: "fixture",
        liquidMinor: p("zero"),
        source,
      },
    ];
    input.jobs = [
      {
        id: jobId,
        personId: otherId,
        organizationId: townFirst,
        title: "Recorded fixture staff",
        hoursDaily: p("one"),
        wageDailyMinor: p("zero"),
        source,
      },
    ];
    input.publicOrganizations = input.publicOrganizations!.map((row) =>
      row.id === townFirst
        ? {
            ...row,
            staff: [
              {
                personId: otherId,
                jobId,
                title: "Recorded fixture staff",
                source,
              },
            ],
          }
        : row,
    );
    const core = createLifeCore(input);
    expect(targets(core, "known-office")).toEqual([]);
    learn(core, townFirst);
    expect(targets(core, "known-office")).toEqual([townFirst]);
    expect(
      coreAPI(core).knows(actorId, `person:${otherId}:public-role`),
    ).toBeUndefined();
    coreAPI(core).lookupPublicOrganization(actorId, townFirst);
    expect(
      coreAPI(core).knows(actorId, `person:${otherId}:public-role`)?.sourceId,
    ).toBe(jobId);
    expect(targets(core, "known-office")).toEqual([townFirst]);
  });

  it("preserves duplicate-place elimination and normal/circle/observer public offer results", () => {
    for (const observer of [false, true]) {
      for (const focused of [false, true]) {
        const input = fixture(true);
        if (focused) input.playerId = actorId;
        const core = createLifeCore(input, { observer });
        learn(core, townSecond);
        learn(core, townFirst);
        expect(targets(core, "known-group")).toEqual([townFirst, townSecond]);
        expect(targets(core, "public-directory")).toEqual([]);
        expect(targets(core, "known-group", otherId)).toEqual([]);
        expect(coreAPI(core)).toBe(coreAPI(core));
      }
    }
  });
});
