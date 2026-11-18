import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { daysBetweenText } from "./kernel/dates";
import { buildPopulation } from "./population";
import { parameter as p } from "./parameters";
import { RENEWAL_PARAMETERS } from "./births-parameters";

// CTO, Nov 17 (comment 6958274786): the playtest found no two siblings born
// less than about two years apart in 24 drawn places. The opening spaced
// children at a fixed interval; spacing is now a drawn gap above the next
// child's gestation, so closer siblings exist and none is closer than a pregnancy.
const seed = process.env.KIN_SPACING_SEED ?? randomBytes(8).toString("hex");

it(`siblings in a drawn town are born less than two years apart in some families, never closer than a pregnancy (seed ${seed})`, () => {
  const place = drawPlace(seed, "opening-kin-spacing");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const opening = buildPopulation({
    seed: place.seed,
    startedAt: "2021-01-01",
    placeKey: place.key,
    minimumPeople: p("populationTestIncrement"),
  });
  const born = new Map(
    opening.people.map((person) => [person.id, person.birthDate]),
  );
  // Siblings are the children of one parent: sort each parent's children by
  // birth and read the gap between each neighbor and the next.
  const children = new Map<string, string[]>();
  for (const link of opening.familyLinks ?? []) {
    if (link.kind !== "parent-child") continue;
    const [parent, child] = link.personIds as readonly string[];
    if (!parent || !child) continue;
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const gaps: number[] = [];
  for (const kids of children.values()) {
    const dates = kids
      .map((id) => born.get(id as never))
      .filter((date): date is NonNullable<typeof date> => !!date)
      .sort();
    for (let i = 1; i < dates.length; i += 1)
      gaps.push(daysBetweenText(dates[i - 1]!, dates[i]!));
  }
  expect(gaps.length, `${where}: sibling pairs`).toBeGreaterThan(0);
  const floor = RENEWAL_PARAMETERS.renewalGestationDays!.value;
  const years = gaps.map((days) => days / p("daysPerMeanYear"));
  console.log(
    `SIBLING GAPS ${where}: ${gaps.length} pairs, closest ${Math.min(...years).toFixed(2)} years, ${years.filter((y) => y < 2).length} under two years`,
  );
  for (const days of gaps)
    expect(days, where).toBeGreaterThanOrEqual(floor - 1);
  expect(Math.min(...years), where).toBeLessThan(2);
}, 600_000);
