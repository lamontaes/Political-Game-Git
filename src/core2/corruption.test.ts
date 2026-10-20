import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  considerBribe,
  corruptionModule,
  crimesKnownTo,
  scandalsOf,
  settleBribes,
  type CrimeRecord,
} from "./modules/corruption";
import { buildPopulation } from "./population";
import { currentCloseness } from "./closeness";
import { coreAPI } from "./state";
import { decisionLean } from "./trait-decisions";

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
    // A bribe where one of the two leans toward telling over keeping quiet:
    // someone who leans hard the other way keeps it even after a falling-out.
    const leansToTell = (id: string) =>
      decisionLean(
        core,
        core.people.get(id)!,
        "corruption.tell",
        "corruption-tell-yes",
        "corruption-tell-no",
      ) > 0;
    const crime = records.find(
      (row) =>
        row.taken &&
        (leansToTell(row.offererId) || leansToTell(row.officialId)),
    );
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
    // Whoever learned it decided whether to take it to the press; a report
    // is a public record the official and the reporter both hold, and the
    // scandal reaches voters only through it.
    for (const id of scandalsOf(api, crime!.officialId, core.date)) {
      expect(
        api.knows(crime!.officialId, `event:${id}:experienced`),
      ).toBeTruthy();
      expect(
        learned.some((row) => api.knows(row.id, `event:${id}:experienced`)),
      ).toBe(true);
    }
    expect(scandalsOf(api, crime!.officialId, "2000-01-01")).toEqual([]);
  });

  it("settles a taken bribe by the vote: delivered keeps the tie, a cheated payer loses closeness", () => {
    const takenOn = records.filter((row) => row.taken);
    expect(takenOn.length).toBeGreaterThanOrEqual(2);
    const [cheated, kept] = takenOn;
    const level = (a: string, b: string) => {
      const row = core.relationships.get([a, b].sort().join(":"));
      return row ? currentCloseness(core, row) : 0;
    };
    for (const crime of [cheated!, kept!])
      api.relationship(crime.offererId, crime.officialId, "contact", 400);
    const before = {
      cheated: level(cheated!.offererId, cheated!.officialId),
      kept: level(kept!.offererId, kept!.officialId),
    };
    // The payers are those who lose money, so the favor is a "no".
    settleBribes(api, cheated!.subjectId, (id) =>
      id === cheated!.officialId ? "yes" : undefined,
    );
    settleBribes(api, kept!.subjectId, (id) =>
      id === kept!.officialId ? "no" : undefined,
    );
    const settled = (crime: CrimeRecord) =>
      api
        .moduleState("corruption")
        .table("settled")
        .get(`settled:${crime.id}`) as unknown as
        { delivered: boolean; vote: string } | undefined;
    expect(settled(cheated!)).toMatchObject({ delivered: false, vote: "yes" });
    expect(settled(kept!)).toMatchObject({ delivered: true, vote: "no" });
    expect(level(cheated!.offererId, cheated!.officialId)).toBeLessThan(
      before.cheated,
    );
    expect(level(kept!.offererId, kept!.officialId)).toBeCloseTo(
      before.kept,
      5,
    );
    // Each bribe settles once.
    const after = level(cheated!.offererId, cheated!.officialId);
    settleBribes(api, cheated!.subjectId, () => "yes");
    expect(level(cheated!.offererId, cheated!.officialId)).toBe(after);
  });

  it("draws more offers to an official the offerer has learned took a bribe, and no more for one nobody has heard of", () => {
    const taken = records.find((row) => row.taken)!;
    const outsider = adults
      .filter(
        (row) =>
          row.id !== taken.offererId &&
          row.id !== taken.officialId &&
          !crimesKnownTo(api, row.id).length,
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor)[0]!;
    const ask = (officialId: string, subjectId: string) =>
      considerBribe(api, {
        offererId: outsider.id,
        officialId,
        stakeMinor: 50000000,
        subjectId,
      })!;
    const unheard = ask(taken.officialId, "reputation-before");
    expect(unheard.reasons.offer!.reputation, `${seed}`).toBe(0);
    expect(unheard.heardOf).toBeUndefined();
    // The outsider hears of it from the offerer; the decision reads that record.
    api.observe(outsider.id, {
      key: `crime:${taken.id}`,
      value: "bribe-taken",
      learnedAt: api.state.date,
      sourceId: taken.id,
      access: "told",
    });
    const heard = ask(taken.officialId, "reputation-after");
    expect(heard.heardOf).toEqual([taken.id]);
    expect(heard.reasons.offer!.reputation).toBeGreaterThan(0);
    // The same offerer's request of someone they heard nothing about is unchanged.
    const other = adults.find(
      (row) =>
        row.id !== outsider.id &&
        row.id !== taken.officialId &&
        row.id !== taken.offererId &&
        !crimesKnownTo(api, outsider.id).some((c) => c.officialId === row.id),
    )!;
    expect(ask(other.id, "reputation-other").reasons.offer!.reputation).toBe(0);
  });
});
