import { describe, expect, it, vi } from "vitest";
import { advanceDate, catchUpPerson, duePeople } from "./calendar";
import { DEFAULT_DATA, extendData } from "./data";
import { parameter as p } from "./parameters";
import { createCore } from "./state";
import type {
  CoreData,
  CoreInput,
  CoreState,
  PersonInput,
  Source,
} from "./types";

const home = "place:calendar-fixture-home";
const county = "county:calendar-fixture-home";
const elsewhere = "place:calendar-fixture-away";
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-01-01",
  citation:
    "Controlled calendar contract fixture, not observed people or recorded legislative sessions.",
  estimatedFrom:
    "Supplied person, place, and calendar rows for boundary assertions only.",
};

function person(
  id: string,
  tier: string,
  overrides: Partial<PersonInput> = {},
): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: elsewhere,
    householdId: `household:${id}`,
    tier,
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("zero"),
    source,
    familyIds: [],
    knownIds: [],
    ...overrides,
  };
}

function fixture(
  people: readonly PersonInput[],
  options: {
    startedAt?: string;
    playerId?: string;
    focusPersonIds?: readonly string[];
    focusPlaceIds?: readonly string[];
    calendarDates?: readonly string[];
    data?: CoreData;
    observer?: boolean;
    husks?: CoreInput["husks"];
  } = {},
): CoreState {
  return createCore(
    {
      seed: "p8-indexed-calendar-contract",
      startedAt: options.startedAt ?? "2021-01-01",
      people,
      households: people.map((actor) => ({
        id: actor.householdId,
        placeId: actor.placeId,
        memberIds: [actor.id],
        source,
      })),
      jobs: [],
      organizations: [],
      husks: options.husks,
      playerId: options.playerId,
      focusPersonIds: options.focusPersonIds ?? [],
      focusPlaceIds: options.focusPlaceIds ?? [],
      calendarDates: options.calendarDates ?? [],
      gaps: [],
    },
    { data: options.data, observer: options.observer },
  );
}

function snapshot(core: CoreState) {
  return structuredClone({
    date: core.date,
    people: core.people,
    husks: core.husks,
    peopleByTier: core.peopleByTier,
    peopleByPlace: core.peopleByPlace,
    knowledgeByPerson: core.knowledgeByPerson,
    calendarDates: core.calendarDates,
    focusPersonIds: core.focusPersonIds,
    focusPlaceIds: core.focusPlaceIds,
    pendingCallbacks: core.pendingCallbacks,
    durableLog: core.durableLog,
    actCounters: core.actCounters,
    eventIds: core.eventIds,
    sequence: core.sequence,
  });
}

describe("indexed person calendar", () => {
  it("returns elapsed days without performing acts or advancing the date", () => {
    const core = fixture([person("person:daily", "daily")]);
    const before = snapshot(core);
    expect(duePeople(core, "2021-01-01")).toEqual([]);
    expect(duePeople(core, "2021-01-02")).toEqual([
      { personId: "person:daily", days: p("one") },
    ]);
    expect(duePeople(core, "2021-01-04")).toEqual([
      { personId: "person:daily", days: 3 },
    ]);
    expect(snapshot(core)).toEqual(before);
  });

  it("runs player, explicit circle, town, and county actors daily despite their coarse tiers", () => {
    const core = fixture(
      [
        person("person:player", "monthly"),
        person("person:circle", "weekly"),
        person("person:town", "calendar", { placeId: home }),
        person("person:county", "monthly", { countyId: county }),
        person("person:focused-inactive", "husk", {
          placeId: home,
          countyId: county,
        }),
        person("person:outside", "weekly"),
      ],
      {
        playerId: "person:player",
        focusPersonIds: ["person:circle", "person:town"],
        focusPlaceIds: [home, county],
      },
    );
    expect(
      new Map(
        duePeople(core, "2021-01-02").map((row) => [row.personId, row.days]),
      ),
    ).toEqual(
      new Map([
        ["person:player", p("one")],
        ["person:circle", p("one")],
        ["person:town", p("one")],
        ["person:county", p("one")],
        ["person:focused-inactive", p("one")],
      ]),
    );
    expect(core.peopleByPlace.get(county)).toContain("person:county");
    expect(core.peopleByTier.get("monthly")).toContain("person:county");
  });

  it("uses the weekly interval from the most recently completed act", () => {
    const core = fixture([person("person:weekly", "weekly")]);
    expect(duePeople(core, "2021-01-07")).toEqual([]);
    expect(duePeople(core, "2021-01-08")).toEqual([
      { personId: "person:weekly", days: p("daysPerWeek") },
    ]);
    expect(duePeople(core, "2021-01-10")).toEqual([
      { personId: "person:weekly", days: 9 },
    ]);
    advanceDate(core, "2021-01-08");
    core.people.get("person:weekly")!.lastActDate = core.date;
    expect(duePeople(core, "2021-01-14")).toEqual([]);
    expect(duePeople(core, "2021-01-15")).toEqual([
      { personId: "person:weekly", days: p("daysPerWeek") },
    ]);
  });

  it("runs every living full actor daily in observer mode while retaining husks and deceased actors", () => {
    const living = [
      person("person:weekly", "weekly"),
      person("person:monthly", "monthly"),
      person("person:calendar", "calendar"),
      person("person:inactive", "husk"),
    ];
    const core = fixture([...living, person("person:deceased", "daily")], {
      observer: true,
      husks: [
        {
          id: "person:retained-husk",
          givenName: "Recorded",
          familyName: "Face",
          placeId: elsewhere,
          looks: { appearanceSeed: "retained-appearance" },
          said: ["Retained exact words."],
          source,
        },
      ],
    });
    core.people.get("person:deceased")!.alive = false;
    const before = snapshot(core);
    expect(duePeople(core, "2021-01-01")).toEqual([]);
    expect(
      new Map(
        duePeople(core, "2021-01-02").map((row) => [row.personId, row.days]),
      ),
    ).toEqual(new Map(living.map((actor) => [actor.id, p("one")])));
    expect(core.people.has("person:retained-husk")).toBe(false);
    expect(core.husks.has("person:retained-husk")).toBe(true);
    expect(snapshot(core)).toEqual(before);
    core.observer = false;
    expect(duePeople(core, "2021-01-02")).toEqual([]);
  });

  it("reads new tier identities and intervals from extended data", () => {
    const tier = "fixture:two-day-review";
    const data = extendData(DEFAULT_DATA, {
      tiers: [
        { id: tier, cadence: "days", intervalParameter: "fixtureInterval" },
      ],
      parameters: {
        fixtureInterval: {
          value: p("two"),
          tag: "SOURCED",
          citation: "Explicit technical fixture interval.",
        },
      },
    });
    const core = fixture([person("person:custom", tier)], { data });
    expect(duePeople(core, "2021-01-02")).toEqual([]);
    expect(duePeople(core, "2021-01-03")).toEqual([
      { personId: "person:custom", days: p("two") },
    ]);
  });

  it.each([
    ["2021-01-31", "2021-02-27", "2021-02-28", 28],
    ["2020-01-31", "2020-02-28", "2020-02-29", 29],
    ["2021-01-15", "2021-02-14", "2021-02-15", 31],
    ["2021-12-31", "2022-01-30", "2022-01-31", 31],
  ] as const)(
    "uses the UTC month anniversary starting %s",
    (startedAt, before, due, days) => {
      const core = fixture([person("person:monthly", "monthly")], {
        startedAt,
      });
      expect(duePeople(core, before)).toEqual([]);
      expect(duePeople(core, due)).toEqual([
        { personId: "person:monthly", days },
      ]);
    },
  );

  it("anchors the next monthly anniversary to the last completed act", () => {
    const core = fixture([person("person:monthly", "monthly")], {
      startedAt: "2021-01-31",
    });
    advanceDate(core, "2021-02-28");
    core.people.get("person:monthly")!.lastActDate = core.date;
    expect(duePeople(core, "2021-03-27")).toEqual([]);
    expect(duePeople(core, "2021-03-28")).toEqual([
      { personId: "person:monthly", days: 28 },
    ]);
  });

  it("supports data-defined month intervals across leap years", () => {
    const tier = "fixture:year-anniversary";
    const data = extendData(DEFAULT_DATA, {
      tiers: [
        { id: tier, cadence: "months", intervalParameter: "monthsPerYear" },
      ],
    });
    const core = fixture([person("person:annual", tier)], {
      startedAt: "2020-02-29",
      data,
    });
    expect(duePeople(core, "2021-02-27")).toEqual([]);
    expect(duePeople(core, "2021-02-28")).toEqual([
      { personId: "person:annual", days: 365 },
    ]);
  });

  it("counts civil days through a daylight-saving boundary", () => {
    const core = fixture([person("person:weekly", "weekly")], {
      startedAt: "2021-03-07",
    });
    expect(duePeople(core, "2021-03-13")).toEqual([]);
    expect(duePeople(core, "2021-03-14")).toEqual([
      { personId: "person:weekly", days: p("daysPerWeek") },
    ]);
  });

  it("uses only supplied calendar dates and preserves a missed date for explicit catch-up", () => {
    const core = fixture([person("person:calendar", "calendar")], {
      calendarDates: ["2021-01-01", "2021-01-04", "2021-01-10"],
    });
    const before = snapshot(core);
    expect(duePeople(core, "2021-01-01")).toEqual([]);
    expect(duePeople(core, "2021-01-03")).toEqual([]);
    expect(duePeople(core, "2021-01-04")).toEqual([
      { personId: "person:calendar", days: 3 },
    ]);
    expect(duePeople(core, "2021-01-05")).toEqual([]);
    expect(catchUpPerson(core, "person:calendar", "2021-01-05")).toEqual({
      personId: "person:calendar",
      days: 4,
    });
    expect(snapshot(core)).toEqual(before);
  });

  it("does not fabricate a national wake when the supplied calendar is empty", () => {
    const core = fixture([person("person:calendar", "calendar")]);
    expect(duePeople(core, "2021-02-01")).toEqual([]);
    expect(duePeople(core, "2021-12-31")).toEqual([]);
    expect(core.calendarDates.size).toBe(p("zero"));
  });

  it("keeps nonfocused inactive actors and deceased actors out of routine work", () => {
    const core = fixture(
      [
        person("person:inactive", "husk"),
        person("person:deceased", "daily", { placeId: home }),
      ],
      { focusPersonIds: ["person:deceased"], focusPlaceIds: [home] },
    );
    core.people.get("person:deceased")!.alive = false;
    expect(duePeople(core, "2021-12-31")).toEqual([]);
  });

  it("uses indexed point lookups without reading history or iterating the full people map", () => {
    const core = fixture([
      person("person:daily", "daily"),
      person("person:weekly", "weekly"),
    ]);
    const noFullScan = () => {
      throw new Error("Full people scan is forbidden by this fixture.");
    };
    vi.spyOn(core.people, "values").mockImplementation(noFullScan);
    vi.spyOn(core.people, "entries").mockImplementation(noFullScan);
    vi.spyOn(core.people, "forEach").mockImplementation(noFullScan);
    vi.spyOn(core.people, Symbol.iterator).mockImplementation(noFullScan);
    for (const key of [
      "durableLog",
      "actCounters",
      "pendingCallbacks",
      "knowledgeByPerson",
    ] as const) {
      Object.defineProperty(core, key, {
        get: () => {
          throw new Error(`History access is forbidden: ${key}`);
        },
      });
    }
    expect(duePeople(core, "2021-01-08")).toEqual([
      { personId: "person:daily", days: p("daysPerWeek") },
      { personId: "person:weekly", days: p("daysPerWeek") },
    ]);
    expect(catchUpPerson(core, "person:weekly", "2021-01-08")).toEqual({
      personId: "person:weekly",
      days: p("daysPerWeek"),
    });
    advanceDate(core, "2021-01-08");
    expect(core.date).toBe("2021-01-08");
  });
});

describe("calendar admission and explicit catch-up", () => {
  it("advances only the current date monotonically, including an idempotent advance", () => {
    const core = fixture([person("person:daily", "daily")], {
      calendarDates: ["2021-01-04"],
    });
    const before = snapshot(core);
    advanceDate(core, "2021-01-01");
    expect(snapshot(core)).toEqual(before);
    advanceDate(core, "2021-01-04");
    expect(snapshot(core)).toEqual({ ...before, date: "2021-01-04" });
    expect(duePeople(core, core.date)).toEqual([
      { personId: "person:daily", days: 3 },
    ]);
  });

  it.each([
    "2020-12-31",
    "2021-02-29",
    "2021-04-31",
    "2021-01-1",
    "2021-01-02T00:00:00Z",
    "not-a-date",
  ])("rejects invalid or backward date %s atomically", (date) => {
    const core = fixture([person("person:daily", "daily")]);
    const before = snapshot(core);
    expect(() => advanceDate(core, date)).toThrow();
    expect(() => duePeople(core, date)).toThrow();
    expect(() => catchUpPerson(core, "person:daily", date)).toThrow();
    expect(snapshot(core)).toEqual(before);
  });

  it("rejects backward queries after the date has already advanced", () => {
    const core = fixture([person("person:weekly", "weekly")]);
    advanceDate(core, "2021-01-08");
    const before = snapshot(core);
    expect(() => duePeople(core, "2021-01-07")).toThrow(/backward/i);
    expect(() => catchUpPerson(core, "person:weekly", "2021-01-07")).toThrow(
      /backward/i,
    );
    expect(() => advanceDate(core, "2021-01-07")).toThrow(/backward/i);
    expect(snapshot(core)).toEqual(before);
  });

  it("returns honest inactive-person elapsed days without promoting, acting, or learning", () => {
    const core = fixture([person("person:inactive", "husk")]);
    const before = snapshot(core);
    expect(catchUpPerson(core, "person:inactive", "2021-01-01")).toEqual({
      personId: "person:inactive",
      days: p("zero"),
    });
    expect(catchUpPerson(core, "person:inactive", "2021-03-01")).toEqual({
      personId: "person:inactive",
      days: 59,
    });
    expect(snapshot(core)).toEqual(before);
  });

  it("requires an existing full person for explicit catch-up", () => {
    const core = fixture([]);
    core.husks.set("person:retained", {
      id: "person:retained",
      givenName: "Recorded",
      familyName: "Face",
      placeId: home,
      looks: {},
      said: [],
      source,
    });
    const before = snapshot(core);
    expect(() => catchUpPerson(core, "person:missing", "2021-01-02")).toThrow(
      /absent/i,
    );
    expect(() => catchUpPerson(core, "person:retained", "2021-01-02")).toThrow(
      /absent/i,
    );
    expect(core.husks.has("person:retained")).toBe(true);
    expect(snapshot(core)).toEqual(before);
  });

  it.each(["2021-01-03", "2021-02-29"])(
    "rejects a future or invalid last act date %s without changing state",
    (lastActDate) => {
      const core = fixture([person("person:daily", "daily")]);
      core.people.get("person:daily")!.lastActDate = lastActDate;
      const before = snapshot(core);
      expect(() => duePeople(core, "2021-01-02")).toThrow();
      expect(() => catchUpPerson(core, "person:daily", "2021-01-02")).toThrow();
      expect(snapshot(core)).toEqual(before);
    },
  );

  it.each([
    p("zero"),
    p("negativeOne"),
    0.5,
    Number.MAX_SAFE_INTEGER + p("one"),
  ])("rejects invalid interval %s from a data row", (value) => {
    const tier = "fixture:invalid-interval";
    const data = extendData(DEFAULT_DATA, {
      tiers: [
        { id: tier, cadence: "days", intervalParameter: "fixtureInterval" },
      ],
      parameters: {
        fixtureInterval: {
          value,
          tag: "SOURCED",
          citation: "Deliberately invalid technical fixture interval.",
        },
      },
    });
    const core = fixture([person("person:invalid", tier)], { data });
    const before = snapshot(core);
    expect(() => duePeople(core, "2021-01-02")).toThrow(/interval/i);
    expect(snapshot(core)).toEqual(before);
  });

  it.each(["missing-operation", "toString"])(
    "rejects an unregistered cadence %s without an invented wake",
    (cadence) => {
      const tier = "fixture:unregistered-cadence";
      const data = extendData(DEFAULT_DATA, { tiers: [{ id: tier, cadence }] });
      const core = fixture([person("person:invalid", tier)], { data });
      const before = snapshot(core);
      expect(() => duePeople(core, "2021-01-02")).toThrow(/cadence/i);
      expect(snapshot(core)).toEqual(before);
    },
  );

  it("rejects a corrupt tier index rather than silently losing an actor", () => {
    const core = fixture([person("person:daily", "daily")]);
    core.peopleByTier.get("weekly")!.add("person:daily");
    const before = snapshot(core);
    expect(() => duePeople(core, "2021-01-02")).toThrow(/index/i);
    expect(snapshot(core)).toEqual(before);
  });
});
