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
    // Jobs establish coworker identity; this fixture supplies no attendance terms.
    workCommitments: [],
    workPayrollCalendars: [],
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
    // P15 part 2b: an activation can fill the free hours with several acts,
    // so the cadence is counted in activations, one chooser call each.
    const activations = new Map<string, number>();
    const count = (decision: { actorId: string }) => {
      activations.set(
        decision.actorId,
        (activations.get(decision.actorId) ?? 0) + 1,
      );
      return undefined;
    };
    advanceCore(core, "2021-01-08", { controller: count });
    for (const id of core.focusPersonIds) expect(activations.get(id)).toBe(7);
    expect(activations.get("town")).toBe(1);
    expect(activations.get("state")).toBeUndefined();
    expect(activations.get("body")).toBe(1);
    expect(activations.get("inactive")).toBeUndefined();
    expect(
      [...core.durableLog.values()]
        .filter((row) => row.kind === "person.acted")
        .every((row) => core.focusPersonIds.has(row.actorId!)),
    ).toBe(true);
    advanceCore(core, "2021-02-01", { controller: count });
    expect(activations.get("state")).toBe(1);
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
      // A husk (inactive tier) is never due, under any focus.
      expect(duePeople(core, "2021-01-02")).toHaveLength(8);
      const activations = new Map<string, number>();
      advanceCore(core, "2021-01-02", {
        controller: (decision) => {
          activations.set(
            decision.actorId,
            (activations.get(decision.actorId) ?? 0) + 1,
          );
          return undefined;
        },
      });
      for (const person of core.people.values())
        expect(activations.get(person.id)).toBe(
          person.id === "inactive" ? undefined : 1,
        );
    }
  });
});

// SOURCE-ONLY additive proposal; UNEXECUTED by the author.
describe("focus fixture attendance scope", () => {
  it("preserves coworker links while distinguishing empty work terms from default enrollment", () => {
    const supplied = input();
    const omitted = { ...supplied };
    delete omitted.workCommitments;
    delete omitted.workPayrollCalendars;
    const scoped = createLifeCore(supplied);
    const ordinary = createLifeCore(omitted);
    expect([...scoped.focusPersonIds].sort()).toEqual(
      [...ordinary.focusPersonIds].sort(),
    );
    expect(scoped.jobs.get("job:player")?.personId).toBe("player");
    expect(scoped.jobs.get("job:coworker")?.personId).toBe("coworker");
    expect(scoped.work.commitments.size).toBe(0);
    expect(scoped.work.payrollCalendars.size).toBe(0);
    expect(ordinary.work.commitments.size).toBe(2);
    // P15 part 2b: an activation can fill the free hours with several acts,
    // so the cadence is counted in activations and work in work days.
    const activations = new Map<
      ReturnType<typeof createLifeCore>,
      Map<string, number>
    >();
    for (const core of [scoped, ordinary]) {
      const counts = new Map<string, number>();
      activations.set(core, counts);
      advanceCore(core, "2021-01-08", {
        controller: (decision) => {
          counts.set(decision.actorId, (counts.get(decision.actorId) ?? 0) + 1);
          return undefined;
        },
      });
    }
    for (const id of ["player", "coworker"]) {
      expect(activations.get(scoped)!.get(id)).toBe(7);
      expect(activations.get(ordinary)!.get(id)).toBe(7);
      expect(scoped.people.get(id)!.actCount).toBeGreaterThanOrEqual(7);
      // At least one act per activation. Extra acts fill only free hours:
      // a worker who goes to every shift and knows nobody has none to fill.
      expect(ordinary.people.get(id)!.actCount).toBeGreaterThanOrEqual(7);
      expect(
        ordinary.work.totalsByJob.get(`job:${id}`)!.workedDays +
          ordinary.work.totalsByJob.get(`job:${id}`)!.missedDays,
      ).toBe(5);
    }
  });
});
