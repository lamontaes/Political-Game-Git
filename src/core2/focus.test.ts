import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { duePeople } from "./calendar";
import { coreAPI } from "./state";
import type { CoreInput, PersonInput, Source } from "./types";

const home = "place:focus-fixture";
const county = "county:focus-fixture";
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation: "Controlled scheduling and visibility contract input.",
  estimatedFrom:
    "Authored links and jobs for boundary checks; no realism claim.",
};

function input(): CoreInput {
  const people: PersonInput[] = [
    "player",
    "household",
    "family",
    "contact",
    "coworker",
    "town",
    "state",
    "body",
    "inactive",
  ].map((id) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: home,
    countyId: county,
    householdId: `household:${id}`,
    tier:
      id === "state"
        ? "monthly"
        : id === "body"
          ? "calendar"
          : id === "inactive"
            ? "husk"
            : "weekly",
    traits: {},
    liquidMinor: 0,
    livingCostDailyMinor: 0,
    source,
    familyIds: id === "player" ? ["family"] : [],
    knownIds: id === "player" ? ["contact"] : [],
    jobId: id === "player" || id === "coworker" ? `job:${id}` : undefined,
  }));
  people.find((row) => row.id === "household")!.householdId =
    "household:player";
  return {
    seed: "p8-normal-tier-contract",
    startedAt: "2021-01-01",
    people,
    households: people
      .filter((row) => row.id !== "household")
      .map((row) => ({
        id: row.householdId,
        placeId: home,
        memberIds: row.id === "player" ? ["player", "household"] : [row.id],
        source,
      })),
    jobs: ["player", "coworker"].map((id) => ({
      id: `job:${id}`,
      personId: id,
      organizationId: "employer",
      title: "Fixture worker",
      wageDailyMinor: 100,
      hoursDaily: 8,
      source,
    })),
    organizations: [
      {
        id: "employer",
        placeId: home,
        name: "Fixture employer",
        kind: "business",
        liquidMinor: 10000,
        source,
      },
    ],
    playerId: "player",
    focusPersonIds: [],
    focusPlaceIds: [],
    visiblePlaceIds: [home, county],
    calendarDates: ["2021-01-02"],
    gaps: [],
  };
}

describe("normal play circle and tier scope", () => {
  it("keeps household, family, contacts, and actual coworkers daily without inventing knowledge", () => {
    const core = createLifeCore(input());
    expect([...core.focusPersonIds].sort()).toEqual([
      "contact",
      "coworker",
      "family",
      "household",
      "player",
    ]);
    expect(
      coreAPI(core).knows("player", "person:coworker:name"),
    ).toBeUndefined();
    expect(
      duePeople(core, "2021-01-02")
        .map((row) => row.personId)
        .sort(),
    ).toEqual(["body", "contact", "coworker", "family", "household", "player"]);
    advanceCore(core, "2021-01-08");
    for (const id of core.focusPersonIds)
      expect(core.people.get(id)!.actCount).toBe(7);
    expect(core.people.get("town")!.actCount).toBe(1);
    expect(core.people.get("state")!.actCount).toBe(0);
    expect(core.people.get("body")!.actCount).toBe(1);
    expect(core.people.get("inactive")!.actCount).toBe(0);
    expect(
      [...core.durableLog.values()]
        .filter((row) => row.kind === "person.acted")
        .every((row) => core.focusPersonIds.has(row.actorId!)),
    ).toBe(true);
    advanceCore(core, "2021-02-01");
    expect(core.people.get("state")!.actCount).toBe(1);
  });

  it("matches circle choices and results against a full-county daily run", () => {
    const prepared = input();
    const normal = createLifeCore(prepared);
    const detailed = createLifeCore({ ...prepared, focusPlaceIds: [county] });
    advanceCore(normal, "2021-01-08");
    advanceCore(detailed, "2021-01-08");
    for (const id of normal.focusPersonIds) {
      expect(normal.people.get(id)).toEqual(detailed.people.get(id));
      const records = (core: typeof normal) =>
        [...core.durableLog.values()].filter((row) => row.actorId === id);
      expect(records(normal)).toEqual(records(detailed));
    }
  });

  it("retains visible town/county public records while keeping residents weekly", () => {
    const core = createLifeCore(input());
    const api = coreAPI(core);
    api.emit({
      id: "event:public",
      date: core.date,
      kind: "public.notice",
      placeId: county,
      personIds: ["town"],
      source,
      publicRecord: true,
    });
    expect(core.durableLog.get("event:public")?.visibility).toBe("public");
    expect(api.knows("player", "event:event:public")).toBeUndefined();
    expect(
      duePeople(core, "2021-01-02").some((row) => row.personId === "town"),
    ).toBe(false);
  });

  it("admits a newly recorded player relationship to daily detail", () => {
    const core = createLifeCore(input());
    coreAPI(core).relationship("town", "player", "contact", 0.1);
    expect(
      duePeople(core, "2021-01-02").some((row) => row.personId === "town"),
    ).toBe(true);
  });

  it("retains the explicit county-daily and watched-world exceptions", () => {
    const detailed = createLifeCore({ ...input(), focusPlaceIds: [county] });
    const watched = createLifeCore(input(), { observer: true });
    for (const core of [detailed, watched]) {
      expect(duePeople(core, "2021-01-02")).toHaveLength(9);
      advanceCore(core, "2021-01-02");
      for (const person of core.people.values())
        expect(person.actCount).toBe(1);
    }
  });
});
