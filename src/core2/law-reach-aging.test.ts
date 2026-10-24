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
  ageReachedOn,
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
// Someone in town turns 18 and, later, someone turns 21, both inside the eight
// months the test watches, so the rows each birthday opens can be named.
const firstBirthday = (
  w: { core: { date: string } },
  births: readonly string[],
  age: number,
) => {
  const from = addDays(makeIsoDate(w.core.date), 3);
  const to = addDays(makeIsoDate(w.core.date), 200);
  return births
    .map((birth) => ageReachedOn(birth, age))
    .filter((day) => day > from && day < to)
    .sort()[0];
};
const { world, place } = worldWith(seed, "reach-aging", (w) => {
  const api = coreAPI(w.core);
  return (
    lawChain(api).levels.length > 0 &&
    (() => {
      const births = townPeople(api).map((p) => p.birthDate);
      const at18 = firstBirthday(w, births, reachParameter("adultAge"));
      const at21 = firstBirthday(w, births, reachParameter("cannabisAge"));
      return !!at18 && !!at21 && at18 < at21;
    })()
  );
});
console.log(`reach-aging: ${place.name} (${place.key}), seed ${seed}`);
const core = world.core;
const api = coreAPI(core);

describe(`age-chosen reach rows (${place.name}, seed ${seed})`, () => {
  it.each([
    {
      key: "us-policy-positions:technology-privacy.consumer-data-privacy-law",
      spec: "consumers",
      ageName: "adultAge",
    },
    { key: KEY, spec: "adults", ageName: "cannabisAge" },
  ])(
    "opens the $spec row on the birthday of a person who turns $ageName after the law took effect",
    ({ key, spec, ageName }) => {
      const level = lawChain(api).levels[0]!;
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: key,
        value: 1,
        effectiveDate: addDays(makeIsoDate(core.date), 1),
        measureId: `test:${key}`,
        citation: "Test measure for an age-gated law",
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const age = reachParameter(ageName);
      const held = () =>
        new Map(
          openReach(api, key)
            .filter((r) => r.spec === spec && core.people.has(r.targetId))
            .map((r) => [r.targetId, r.id]),
        );
      // The next birthday that changes who the law reaches: the schedule's own
      // date, and the people it names.
      const day = nextAgeChange(api, key);
      expect(day, "a birthday that changes who the law reaches").toBeTruthy();
      // Who turns of age that day, by the date rule the schedule itself uses
      // (a leap-day birth turns it on March 1 in a common year).
      const turning = townPeople(api).filter(
        (p) => ageReachedOn(p.birthDate, age) === day,
      );
      expect(
        turning.length,
        `someone turns ${age} on ${day}, the day the schedule names`,
      ).toBeGreaterThan(0);
      // The day before, nobody who turns of age on that day holds the row.
      advanceCore(core, addDays(makeIsoDate(day!), -1));
      const before = held();
      for (const person of turning)
        expect(before.has(person.id), `${person.id} before the birthday`).toBe(
          false,
        );
      // On the birthday itself each holds a named row.
      advanceCore(core, makeIsoDate(day!));
      const after = held();
      for (const person of turning)
        expect(
          after.get(person.id),
          `${person.id} on the birthday ${day}`,
        ).toBeTruthy();
      console.log(
        `reach-aging: ${turning.length} turned ${age} on ${day} under ${key}; rows ${turning.map((p) => after.get(p.id)).join(", ")}`,
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
    },
    900_000,
  );

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

  it("a birth reads the law, not its rows: a law in force with no rows gains them the day a household changes", () => {
    // The consumer-data-privacy law is in force from the tests above. End every row it
    // holds, as a town where nobody fits would leave it.
    const key =
      "us-policy-positions:technology-privacy.consumer-data-privacy-law";
    for (const spec of new Set(openReach(api, key).map((r) => r.spec)))
      endRows(api, key, spec, new Set());
    expect(openReach(api, key)).toEqual([]);
    // A birth in town is the cause that refreshes the rows, the same day.
    const [mother] = townPeople(api);
    api.emit({
      id: `test:birth:${core.date}`,
      date: core.date,
      kind: "person-birth",
      personIds: [mother!.id],
      placeId: mother!.placeId,
      source: {
        tag: "SOURCED",
        asOf: core.date,
        citation: "A birth in town, for the household-change refresh",
      },
      publicRecord: true,
      facts: { childId: "test-child", motherId: mother!.id },
    });
    const age = reachParameter("adultAge");
    const today = makeIsoDate(core.date);
    const adults = townPeople(api)
      .filter((p) => ageReachedOn(p.birthDate, age) <= today)
      .map((p) => p.id);
    expect(adults.length).toBeGreaterThan(0);
    const reopened = new Set(
      openReach(api, key)
        .filter((r) => r.spec === "consumers")
        .map((r) => r.targetId),
    );
    expect(adults.filter((id) => !reopened.has(id))).toEqual([]);
  }, 900_000);
});
