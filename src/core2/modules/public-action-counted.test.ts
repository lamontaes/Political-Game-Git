import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { ageOnDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { TERM_MEASURES } from "../term-read";
import { actionsOf, areaRule, joinCase } from "./public-action";
import { residentsRuntime } from "./residents";

// Who joins a strike, protest or rally (owner, Oct 14: one model, two tiers).
// The named and the counted adults of a town are each asked by the same
// decision: how far their own view of the area's question sides with the
// action, whether the area is their own group's, and what going costs them in
// the week they are awake. So a bad term does not put a whole town in the
// street: the share of the town's adults is small, it differs by issue and by
// who is touched, and counted people are in it by their record's count. Two
// places pinned by name and seed (drawn from `pa-seed-9320`), a bad term
// staged the way the outcome web writes it.

function playTerm(label: string, name: string) {
  setBookkeeping(false);
  const place = drawPlace("pa-seed-9320", label);
  expect(place.name).toBe(name);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const change: Record<string, number> = {
    "housing.rent": 0.3,
    "labor.unemployment": 0.4,
    "health.": -0.2,
  };
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${world.placeId}:${month}`,
      placeId: world.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
  advanceCore(world.core, "2025-07-06");
  const core = world.core;
  let adults = 0;
  for (const p of core.people.values())
    if (
      p.alive &&
      p.placeId === world.placeId &&
      ageOnDate(p.birthDate, core.date) >= 18
    )
      adults += 1;
  const store = residentsRuntime(core)!.store;
  for (const group of store.groups) {
    if (group.placeId !== world.placeId || group.tenure === "group") continue;
    for (const index of group.households) {
      const h = store.households[index]!;
      if (h.gone) continue;
      for (const member of store.countedMembers(h))
        if (ageOnDate(store.factsOf(member).birthDate, core.date) >= 18)
          adults += store.weightOf(h);
    }
  }
  return { actions: actionsOf(api, world.placeId), adults, world, api };
}

const share = (
  row: { participantIds: readonly string[]; countedParticipants: number },
  adults: number,
) => (row.participantIds.length + row.countedParticipants) / adults;

it("Port O'Connor, Texas: a bad term draws a few of the adults, counted people alone make a protest, and issues differ", () => {
  const { actions, adults } = playTerm("pa-a", "Port O'Connor, Texas");
  const by = (area: string) => actions.find((row) => row.area === area);
  // No action holds a tenth of the town, named and counted together.
  for (const row of actions) expect(share(row, adults)).toBeLessThan(0.1);
  // The renters who are counted, none named, make the rent protest.
  expect(by("rent")?.participantIds.length).toBe(0);
  expect(by("rent")?.countedParticipants).toBeGreaterThan(0);
  // A protest over jobs holds named and counted people.
  expect(by("jobs")?.participantIds.length).toBeGreaterThan(0);
  expect(by("jobs")?.countedParticipants).toBeGreaterThan(0);
}, 180_000);

it("Lincoln, Vermont: the issues that touch the town draw people and the ones that do not do not", () => {
  const { actions, adults } = playTerm("pa-b", "Lincoln, Vermont");
  const by = (area: string) => actions.find((row) => row.area === area);
  // The rent protest is the renters' own issue: about a tenth of Lincoln's adults
  // (27 of 249 at this head), the renters it touches and not the town. No
  // action holds a fifth of the adults.
  for (const row of actions) expect(share(row, adults)).toBeLessThan(0.2);

  // Rent and jobs are protested by named and counted people together.
  for (const area of ["rent", "jobs"]) {
    expect(by(area)?.kind).toBe("protest");
    expect(by(area)?.participantIds.length).toBeGreaterThan(0);
    expect(by(area)?.countedParticipants).toBeGreaterThan(0);
  }
  // The town's view of health did not carry a rally.
  expect(by("health")).toBeUndefined();
}, 180_000);

it("Lincoln, Vermont: the same issue costs a person who works more of the week more to go to", () => {
  const { world, api } = playTerm("pa-b", "Lincoln, Vermont");
  const core = world.core;
  const rule = areaRule("health");
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === world.placeId &&
        ageOnDate(p.birthDate, core.date) >= 18,
    )
    .map((person) => ({
      person,
      ask: joinCase(api, core, rule, "grievance", 0.5, { person }),
    }));
  const working = adults.filter((row) => row.ask.cost > 0);
  const free = adults.filter((row) => row.ask.cost === 0);
  expect(working.length).toBeGreaterThan(0);
  expect(free.length).toBeGreaterThan(0);
  // The cost slides with the hours: nobody who works more costs less.
  for (const row of working) expect(row.ask.cost).toBeLessThanOrEqual(1);
  const most = working.reduce((a, b) => (b.ask.cost > a.ask.cost ? b : a));
  expect(most.ask.cost).toBeGreaterThan(free[0]!.ask.cost);
}, 180_000);

// A scene says how a turnout looks and never the figure (owner's rule, Words
// lead's ruling for #9418): the record keeps the size and one fact, read at
// one scale (its share of the town's adults) for named and counted alike.
it("Port O'Connor and Lincoln: each protest's record says how its turnout looks, by its share of the adults", () => {
  const looks = (label: string, name: string) => {
    const { world, adults } = playTerm(label, name);
    const records = [...world.core.durableLog.values()].filter(
      (row) => row.kind === "civic.protest",
    );
    // The record is written when the action forms, so its own size is read.
    return records.map((rec) => ({
      area: rec.facts!.area,
      share: Number(rec.facts!.size) / adults,
      turnout: rec.facts!.turnout,
    }));
  };
  const a = looks("pa-a", "Port O'Connor, Texas");
  const b = looks("pa-b", "Lincoln, Vermont");
  for (const row of [...a, ...b]) {
    expect(row.turnout, row.area).toBe(
      row.share < 0.015 ? "few" : row.share >= 0.08 ? "crowd" : "group",
    );
  }
  // The scale is used both ways: a few at one place, a group at the other. The
  // record is written when the action forms, so a protest that later grows
  // is told by its size at the start (a crowd looks only at a big first turnout).
  expect(a.some((row) => row.turnout === "few")).toBe(true);
  expect(b.some((row) => row.turnout === "group")).toBe(true);
}, 240_000);
