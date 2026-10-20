/**
 * A law's reach rows chosen by age follow the records as they change, in the
 * world the owner plays: the bench world, a place and seed nobody chose, every
 * module installed. A person who turns of age gains the row on the first of
 * the next month, and the open set matches the people as they are.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  endRows,
  openReach,
  reachParameter,
  townPeople,
} from "./law-reach/group-a-records";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const KEY = "us-policy-positions:business-commerce.legalize-cannabis-sales";
const seed = process.env.REACH_AGING_SEED || randomBytes(8).toString("hex");
// Someone in town comes of age in the eight months the test watches, so the
// row a birthday opens can be named.
const comesOfAge = (w: { core: { date: string } }, birth: string) => {
  const age = reachParameter("cannabisAge");
  const day = `${Number(birth.slice(0, 4)) + age}${birth.slice(4)}`;
  const from = addDays(makeIsoDate(w.core.date), 3);
  const to = addDays(makeIsoDate(w.core.date), 200);
  return day > from && day < to;
};
const { world, place } = worldWith(seed, "reach-aging", (w) => {
  const api = coreAPI(w.core);
  return (
    lawChain(api).levels.length > 0 &&
    townPeople(api).some((p) => comesOfAge(w, p.birthDate))
  );
});
console.log(`reach-aging: ${place.name} (${place.key}), seed ${seed}`);
const core = world.core;
const api = coreAPI(core);

describe(`age-chosen reach rows (${place.name}, seed ${seed})`, () => {
  it("opens the row for a person who turns of age after the law took effect", () => {
    const level = lawChain(api).levels[0]!;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: KEY,
      value: 1,
      effectiveDate: addDays(makeIsoDate(core.date), 1),
      measureId: `test:${KEY}`,
      citation: "Test measure for adult-use cannabis sales",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const age = reachParameter("cannabisAge");
    const held = () =>
      new Set(
        openReach(api, KEY)
          .filter((r) => r.spec === "adults" && core.people.has(r.targetId))
          .map((r) => r.targetId),
      );
    const before = held();
    // The first of a month eight months on: the refresh has run on that day.
    const start = new Date(`${core.date}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() + 8, 1);
    const later = makeIsoDate(start.toISOString().slice(0, 10));
    advanceCore(core, later);
    const ageOf = (birth: string) =>
      Number(later.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (later.slice(5) < birth.slice(5) ? 1 : 0);
    const expected = new Set(
      townPeople(api)
        .filter((p) => ageOf(p.birthDate) >= age)
        .map((p) => p.id),
    );
    const after = held();
    const gained = [...after].filter((id) => !before.has(id));
    const named = openReach(api, KEY).find(
      (r) => r.spec === "adults" && r.targetId === gained[0],
    );
    console.log(
      `reach-aging: after eight months ${gained.length} people gained the row, e.g. ${named?.id}`,
    );
    expect(before.size).toBeGreaterThan(0);
    // A birthday opened a named row for someone who came of age.
    expect(named?.id, "a row opened by a birthday").toBeTruthy();
    // Every adult of the town holds the row, and nobody under the age does; a
    // person filled in from a counted group carries the group's row too.
    expect([...expected].filter((id) => !after.has(id))).toEqual([]);
    expect(
      [...after].filter((id) => ageOf(core.people.get(id)!.birthDate) < age),
    ).toEqual([]);
  }, 900_000);

  it("keeps refreshing a law that reaches nobody, and opens rows when people fit again", () => {
    // The law is in force from the test above. End every row it holds, as a
    // town where nobody fits would leave it.
    for (const spec of ["adults", "retailers"])
      endRows(api, KEY, spec, new Set());
    expect(openReach(api, KEY)).toEqual([]);
    // The next refresh, on the first of a month, reads the law, not the rows.
    const start = new Date(`${core.date}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() + 1, 1);
    advanceCore(
      core,
      addDays(makeIsoDate(start.toISOString().slice(0, 10)), 1),
    );
    const age = reachParameter("cannabisAge");
    const today = makeIsoDate(core.date);
    const ageOf = (birth: string) =>
      Number(today.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (today.slice(5) < birth.slice(5) ? 1 : 0);
    const adults = townPeople(api)
      .filter((p) => ageOf(p.birthDate) >= age)
      .map((p) => p.id);
    expect(adults.length).toBeGreaterThan(0);
    const reopened = new Set(
      openReach(api, KEY)
        .filter((r) => r.spec === "adults")
        .map((r) => r.targetId),
    );
    expect(adults.filter((id) => !reopened.has(id))).toEqual([]);
  }, 900_000);
});
