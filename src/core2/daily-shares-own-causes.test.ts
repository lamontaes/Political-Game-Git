import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { findRecord } from "../bench/dev-trace";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { openingClosenessHours } from "./closeness";
import { reserveHours } from "./free-block";
import { willOf } from "./estates";
import type { CoreInput, CoreState, PersonInput } from "./types";

// Pins family 31 (CTO, "LIFT THE PINS", #9747): the day's small shares come
// from each person's own home, job, savings and family, never from a
// published share. Each check below fails on main's code, where the reserve
// is ATUS hours by age, home time a fixed 243 or 43 minutes a day, a will an
// age midpoint of 50, and counted giving a fixed 49.6%.

const fact = (personId: string, relation: string, otherId: string) => ({
  id: `${personId}:past:${otherId}`,
  date: "2000-01-01",
  kind: `family:${relation}`,
  summary: "Recorded relation.",
  source: piecesSource,
  facts: { otherPersonId: otherId },
});

function person(
  id: string,
  householdId: string,
  birthDate: string,
  relations: Record<string, string> = {},
  extra: Partial<PersonInput> = {},
): PersonInput {
  const base = piecesInput().people[0]!;
  return {
    ...base,
    id,
    householdId,
    birthDate,
    familyIds: Object.keys(relations),
    pastFacts: Object.entries(relations).map(([otherId, relation]) =>
      fact(id, relation, otherId),
    ),
    ...extra,
  };
}

function world(people: PersonInput[]): CoreState {
  const homes = new Map<string, string[]>();
  for (const row of people)
    homes.set(row.householdId, [...(homes.get(row.householdId) ?? []), row.id]);
  const input: CoreInput = {
    ...piecesInput(),
    people,
    households: [...homes].map(([id, memberIds]) => ({
      id,
      placeId: "place",
      memberIds,
      source: piecesSource,
    })),
  };
  return createLifeCore(input);
}

/** A job schedule of `weeklyMinutes`, as the work engine keeps one. */
function employ(core: CoreState, personId: string, weeklyMinutes: number) {
  const jobId = `job:${personId}`;
  core.people.get(personId)!.jobId = jobId;
  const id = `commitment:${personId}`;
  core.work.commitments.set(id, {
    id,
    jobId,
    personId,
    organizationId: "employer",
    startsAt: "2020-01-01",
    anchorDate: "2020-01-01",
    periodDays: 7,
    slots: [],
    expectedWeeklyMinutes: weeklyMinutes,
    hourlyMinor: 0,
    scheduleSource: piecesSource,
    paySource: piecesSource,
  } as never);
  core.work.commitmentsByPerson.set(personId, new Set([id]));
}

describe("the day's small shares come from each person's own life", () => {
  it("an adult's reserved hours follow the people their home keeps, not their age", () => {
    const core = world([
      person("alone", "a", "1980-01-01"),
      person("parent", "b", "1980-01-01", {
        k1: "child",
        k2: "child",
        k3: "child",
      }),
      person("k1", "b", "2016-01-01", { parent: "parent" }),
      person("k2", "b", "2018-01-01", { parent: "parent" }),
      person("k3", "b", "2020-01-01", { parent: "parent" }),
      person("young", "c", "2004-01-01"),
      person("old", "d", "1950-01-01"),
    ]);
    const api = coreAPI(core);
    const reserve = (id: string) => reserveHours(api, core.people.get(id)!);
    // A parent alone with three children keeps four people's home.
    expect(reserve("parent")).toBeGreaterThan(reserve("alone"));
    // On main the reserve is ATUS's hours for the age group.
    expect(reserve("young")).toBeCloseTo(reserve("old"), 9);
    expect(reserve("alone")).toBeCloseTo(reserve("old"), 9);
  });

  it("housemates' time together follows their own work weeks", () => {
    const core = world([
      person("p1", "home1", "1960-01-01", { p2: "partner" }),
      person("p2", "home1", "1960-01-01", { p1: "partner" }),
      person("w1", "home2", "1990-01-01", { w2: "partner" }),
      person("w2", "home2", "1990-01-01", { w1: "partner" }),
    ]);
    // Both of the second couple work 60 hours a week.
    employ(core, "w1", 3600);
    employ(core, "w2", 3600);
    const retired = openingClosenessHours(core, "p1", "p2");
    const working = openingClosenessHours(core, "w1", "w2");
    expect(retired).toBeGreaterThan(working);
    // One long week is enough: the pair is home together only as long as
    // the one who works more is home.
    employ(core, "w2", 0);
    expect(openingClosenessHours(core, "w1", "w2")).toBeCloseTo(working, 6);
  });

  it("a will follows what a person has to leave and who they leave it to, not their age", () => {
    const core = world([
      person(
        "old",
        "a",
        "1935-01-01",
        { oc: "child" },
        { liquidMinor: 0, livingCostDailyMinor: 3000 },
      ),
      person("oc", "b", "1965-01-01", { old: "parent" }),
      person(
        "saver",
        "c",
        "1986-01-01",
        { s1: "child", s2: "child", sp: "partner" },
        // About three years of living cost saved.
        { liquidMinor: 3_300_000, livingCostDailyMinor: 3000 },
      ),
      person("s1", "c", "2015-01-01", { saver: "parent" }),
      person("s2", "c", "2017-01-01", { saver: "parent" }),
      person("sp", "c", "1986-01-01", { saver: "partner" }),
    ]);
    const api = coreAPI(core);
    api.relationship("old", "oc", "family", 500);
    for (const id of ["s1", "s2", "sp"])
      api.relationship("saver", id, "family", 500);
    // A 91-year-old with nothing saved: no will (main: the age midpoint gives one).
    expect(willOf(api, core.people.get("old")!)).toBeNull();
    // A 40-year-old with years saved, a partner and two children: a will (main: none before 50).
    expect(
      willOf(api, core.people.get("saver")!)?.map((row) => row.id),
    ).toEqual(["s1", "s2", "sp"]);
  });
});

// The counted adults who share a cause give as its full members did: in a
// played year at a drawn place, every month's counted gift is the full
// givers' mean gift times as many counted adults as the full adults' givers,
// with no fixed share of givers in between.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`counted giving and home time are each world's own over a played year, seed ${seed}`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(seed, `daily-shares-own-causes:${draw}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const api = coreAPI(core);
    const homes = api
      .moduleState("core2-people-p15-v1")
      .table("home-time")
      .rows() as unknown as {
      pairs: {
        family: boolean;
        homeA: number;
        homeB: number;
        minutesPerDay: number;
      }[];
    }[];
    const pairs = homes.flatMap((row) => row.pairs);
    // Dev mode's Trace box opens what a household's time at home was made of.
    const traced = findRecord(core, (homes[0] as unknown as { id: string }).id);
    expect(traced?.engine, `${place.name}: home-time trace`).toBe(
      "core2-people-p15-v1.home-time",
    );
    expect(pairs.length, `${place.name}: home-time pairs`).toBeGreaterThan(0);
    // Pairs' shared minutes differ with their weeks, not one fixed figure.
    expect(
      new Set(
        pairs.filter((p) => p.family).map((p) => p.minutesPerDay.toFixed(3)),
      ).size,
      `${place.name}: family pairs' minutes`,
    ).toBeGreaterThan(1);
    const gifts = api
      .moduleState("core2-drives-p10-v1")
      .table("counted-giving")
      .rows() as unknown as {
      id: string;
      fullAdults: number;
      fullMembers: number;
      fullGivers: number;
      fullGiftsMinor: number;
      countedAdults: number;
      countedGivers: number;
      amountMinor: number;
    }[];
    if (!gifts.length) {
      passed.push(
        `${place.name} (${place.key}): no cause group raised from its counted adults in a year`,
      );
      continue;
    }
    expect(findRecord(core, gifts[0]!.id)?.engine).toBe(
      "core2-drives-p10-v1.counted-giving",
    );
    for (const row of gifts) {
      expect(row.countedGivers, `${place.name} ${row.id}`).toBe(
        Math.floor(
          row.countedAdults *
            (row.fullMembers / row.fullAdults) *
            (row.fullGivers / row.fullMembers),
        ),
      );
      expect(row.amountMinor, `${place.name} ${row.id}`).toBeLessThanOrEqual(
        Math.floor((row.fullGiftsMinor / row.fullGivers) * row.countedGivers),
      );
    }
    process.stdout.write(
      `DAILY-SHARES ${place.name} (${place.key}) seed ${seed}: ${pairs.length} home pairs, ${gifts.length} counted gifts, e.g. ${gifts[0]!.id}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(`No drawn place raised counted gifts: ${passed.join("; ")}`);
}, 900_000);
