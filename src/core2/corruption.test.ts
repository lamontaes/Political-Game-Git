import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  considerBribe,
  corruptionModule,
  crimesKnownTo,
  type CrimeRecord,
} from "./modules/corruption";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// M3-09: a corrupt act happens only where the people's own traits and money
// support it, leaves a record, and is learned by others only through a real
// route.
const seed = process.env.GOLDEN_PATH_SEED ?? "corruption-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
const core = createLifeCore(input, { modules: [corruptionModule] });
const api = coreAPI(core);
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    row.alive &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 21,
);
const cashBefore = new Map(adults.map((row) => [row.id, row.liquidMinor]));
// People with money and a large stake ask people under money strain.
const byCash = [...adults].sort((a, b) => b.liquidMinor - a.liquidMinor);
const offerers = byCash.slice(0, 20);
const strained = [...adults]
  .sort(
    (a, b) =>
      a.liquidMinor / (a.livingCostDailyMinor + 1) -
      b.liquidMinor / (b.livingCostDailyMinor + 1),
  )
  .slice(0, 10);
const records: CrimeRecord[] = [];
for (const offerer of offerers)
  for (const target of strained) {
    if (target.id === offerer.id) continue;
    const record = considerBribe(api, {
      offererId: offerer.id,
      officialId: target.id,
      stakeMinor: 50000000,
      subjectId: `fixture-contract:${offerer.id}:${target.id}`,
    });
    if (record) records.push(record);
  }

const sum = (values: Readonly<Record<string, number>>) =>
  Object.values(values).reduce((a, b) => a + b, 0);

describe(`basic corruption in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("offers and takes only where traits and money support it, some and not all", () => {
    const offered = records.filter((row) => row.offered);
    const taken = records.filter((row) => row.taken);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.length).toBeLessThan(records.length);
    expect(taken.length).toBeLessThanOrEqual(offered.length);
    const mean = (list: CrimeRecord[]) =>
      list.reduce((s, row) => s + sum(row.reasons.offer!), 0) /
      Math.max(1, list.length);
    expect(mean(offered)).toBeGreaterThan(
      mean(records.filter((row) => !row.offered)),
    );
  });

  it("moves money through the books, balanced to the dollar", () => {
    let total = 0;
    for (const row of adults)
      total += core.people.get(row.id)!.liquidMinor - cashBefore.get(row.id)!;
    expect(total).toBe(0);
    for (const row of records.filter((r) => r.taken).slice(0, 5))
      expect(
        core.people.get(row.officialId)!.liquidMinor,
      ).toBeGreaterThanOrEqual(
        cashBefore.get(row.officialId)! + row.amountMinor,
      );
  });

  it("is known only to the two people, until one falls out with the other and tells someone", () => {
    const crime = records.find((row) => row.taken);
    expect(crime).toBeDefined();
    const others = adults.filter(
      (row) => row.id !== crime!.offererId && row.id !== crime!.officialId,
    );
    for (const row of others.slice(0, 50))
      expect(crimesKnownTo(api, row.id).map((r) => r.id)).not.toContain(
        crime!.id,
      );
    // A falling-out between the two.
    api.relationship(crime!.offererId, crime!.officialId, "contact", 200);
    api.relationship(
      crime!.offererId,
      crime!.officialId,
      "contact",
      -150,
      undefined,
      {
        cause: "fixture-falling-out",
      },
    );
    // Whoever they told: anyone but the two, a relative elsewhere included.
    const learned = [...core.people.values()].filter(
      (row) =>
        row.id !== crime!.offererId &&
        row.id !== crime!.officialId &&
        crimesKnownTo(api, row.id).some((r) => r.id === crime!.id),
    );
    expect(learned.length).toBeGreaterThan(0);
    expect(learned.length).toBeLessThanOrEqual(2);
  });
});
