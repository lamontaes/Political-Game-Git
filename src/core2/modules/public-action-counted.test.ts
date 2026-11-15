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
// lead's ruling for #9418): one fact, read from the action's own record as it
// stands when the scene is composed, from its headcount and its share of the
// town's adults, named and counted people alike. A look is true of both: two
// or three people are never a group, however small the town, and a handful
// is never a crowd, so the paper's "2 residents protested" and a scene's
// "a group has gathered" can never disagree.
it("Port O'Connor and Lincoln: each protest is told by how its turnout looks now, from its headcount and its share of the adults", () => {
  const looks = (label: string, name: string) => {
    const { actions, adults } = playTerm(label, name);
    return actions.map((row) => ({
      area: row.area,
      people: row.people,
      share: share(row, adults),
      turnout: row.turnout,
    }));
  };
  // The paper prints the headcount its record kept when the action formed; the
  // scene reads the row's own headcount for the month. They are one number in
  // the month the action forms, so a group is never told over two people.
  const played = playTerm("pa-a", "Port O'Connor, Texas");
  for (const row of played.actions) {
    const record = [...played.world.core.durableLog.values()].find(
      (entry) => entry.facts?.actionId === row.id,
    );
    if (row.months === 1)
      expect(Number(record?.facts?.size), row.id).toBe(row.people);
  }
  const a = looks("pa-a", "Port O'Connor, Texas");
  const b = looks("pa-b", "Lincoln, Vermont");
  for (const row of [...a, ...b]) {
    const want =
      row.share < 0.015 || row.people < 5
        ? "few"
        : row.share >= 0.08 && row.people >= 10
          ? "crowd"
          : "group";
    expect(row.turnout, `${row.area}: ${row.people} people`).toBe(want);
    // Never a group of two or three, never a crowd of a handful.
    if (row.people < 5) expect(row.turnout).toBe("few");
    if (row.turnout === "crowd") expect(row.people).toBeGreaterThanOrEqual(10);
  }
  // The scale is used by headcount too: at these two small places the
  // jobs protests of two and three people are a few, the rent protest of a
  // dozen at Lincoln is a crowd.
  expect(a.some((row) => row.turnout === "few")).toBe(true);
  expect(b.some((row) => row.turnout === "crowd")).toBe(true);
  expect(
    [...a, ...b].filter((row) => row.people < 5).map((row) => row.turnout),
  ).not.toContain("group");
}, 240_000);
