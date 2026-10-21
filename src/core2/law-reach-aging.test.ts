/**
 * A law's reach rows chosen by age follow the records as they change, in the
 * world the owner plays: the bench world, a place and seed nobody chose, every
 * module installed. A person who turns of age gains the row on their birthday,
 * and the open set matches the people as they are.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  endRows,
  nextAgeChange,
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
  it("opens the row on the birthday of a person who turns of age after the law took effect", () => {
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
      new Map(
        openReach(api, KEY)
          .filter((r) => r.spec === "adults" && core.people.has(r.targetId))
          .map((r) => [r.targetId, r.id]),
      );
    // The next birthday that changes who the law reaches: the schedule's own
    // date, and the person it names.
    const day = nextAgeChange(api, KEY)!;
    const turning = townPeople(api).filter(
      (p) =>
        `${Number(p.birthDate.slice(0, 4)) + age}${p.birthDate.slice(4)}` ===
        day,
    );
    expect(day, "a birthday that changes who the law reaches").toBeTruthy();
    // The day before, nobody who turns of age on that day holds the row.
    advanceCore(core, addDays(makeIsoDate(day), -1));
    const before = held();
    for (const person of turning)
      expect(before.has(person.id), `${person.id} before the birthday`).toBe(
        false,
      );
    // On the birthday itself each holds a named row.
    advanceCore(core, makeIsoDate(day));
    const after = held();
    for (const person of turning)
      expect(
        after.get(person.id),
        `${person.id} on the birthday ${day}`,
      ).toBeTruthy();
    console.log(
      `reach-aging: ${turning.length} turned ${age} on ${day}; rows ${turning.map((p) => after.get(p.id)).join(", ")}`,
    );
    // The open set matches the people: nobody under the age holds the row.
    expect(
      [...after.keys()].filter((id) => {
        const birth = core.people.get(id)!.birthDate;
        const today = core.date;
        return (
          Number(today.slice(0, 4)) -
            Number(birth.slice(0, 4)) -
            (today.slice(5) < birth.slice(5) ? 1 : 0) <
          age
        );
      }),
    ).toEqual([]);
  }, 900_000);

  it("keeps a law that reaches nobody, and opens rows on the next birthday that makes someone fit", () => {
    // The law is in force from the test above. End every row it holds, as a
    // town where nobody fits would leave it.
    for (const spec of ["adults", "retailers"])
      endRows(api, KEY, spec, new Set());
    expect(openReach(api, KEY)).toEqual([]);
    // The next birthday that changes the law's reach reads the law, not the rows.
    const day = nextAgeChange(api, KEY);
    expect(
      day,
      "another birthday that changes who the law reaches",
    ).toBeTruthy();
    advanceCore(core, makeIsoDate(day!));
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
