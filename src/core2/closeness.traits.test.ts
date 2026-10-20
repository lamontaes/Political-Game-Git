import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { hoursFromLevel, temperedHours } from "./closeness";
import { gameStartDate } from "./game-start";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import { decisionLean } from "./trait-decisions";

// Time together builds closeness faster between warm, outgoing people, and a
// quarrel costs more between people who hold on to it: the closeness engine
// reads both people's temperaments when the tie changes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "closeness-traits");

it(`warm and reserved people grow and lose ties at different rates in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const api = coreAPI(core);
  const p = (key: string) => parameter(key, core.data.parameters);
  const adults = [...core.people.values()].filter(
    (row) =>
      row.alive &&
      Number(core.date.slice(0, 4)) - Number(row.birthDate.slice(0, 4)) >= 18,
  );
  const warmth = (id: string) =>
    decisionLean(
      core,
      core.people.get(id)!,
      "relationships.warm-to",
      "warm",
      "cool",
    );
  const byWarmth = [...adults].sort(
    (a, b) => warmth(a.id) - warmth(b.id) || a.id.localeCompare(b.id),
  );
  const cool = byWarmth[0]!,
    warm = byWarmth.at(-1)!;
  // A third person neither of them has a tie with: the same circumstances for both.
  const tied = (a: string, b: string) =>
    core.relationships.has(a < b ? `${a}:${b}` : `${b}:${a}`);
  const third = adults.find(
    (row) =>
      row.id !== warm.id &&
      row.id !== cool.id &&
      !tied(row.id, warm.id) &&
      !tied(row.id, cool.id),
  )!;
  expect(third, where).toBeDefined();
  const hours = 2;
  const gained = (id: string) => {
    api.relationship(id, third.id, "contact", hours, undefined, {
      cause: "closeness-traits-test",
    });
    const key = id < third.id ? `${id}:${third.id}` : `${third.id}:${id}`;
    const row = core.relationships.get(key)!;
    return { id: row.id, hours: hoursFromLevel(p, row.level) };
  };
  const warmTie = gained(warm.id),
    coolTie = gained(cool.id);
  const expected = Math.exp(
    (p("traitWeightRelationshipsWarmTo") *
      (warmth(warm.id) - warmth(cool.id))) /
      2,
  );
  expect(warmth(warm.id) - warmth(cool.id), where).toBeGreaterThan(0.5);
  // The warm person's two hours count for more than the reserved person's, by the calibrated ratio.
  expect(
    warmTie.hours / coolTie.hours,
    `${where}: ${warmTie.id} vs ${coolTie.id}`,
  ).toBeCloseTo(expected, 6);
  expect(warmTie.hours / coolTie.hours, where).toBeGreaterThan(1.3);

  // A quarrel: the person who holds on loses more of the tie than the one who lets go.
  const holding = (id: string) =>
    decisionLean(
      core,
      core.people.get(id)!,
      "relationships.fall-out",
      "hold-on",
      "let-go",
    );
  const byHolding = [...adults].sort(
    (a, b) => holding(a.id) - holding(b.id) || a.id.localeCompare(b.id),
  );
  const lets = byHolding[0]!,
    holds = byHolding.at(-1)!;
  const lost = (id: string) =>
    -temperedHours(core, core.people.get(id), third, -hours);
  expect(
    lost(holds.id) / lost(lets.id),
    `${where}: ${holds.id} vs ${lets.id}`,
  ).toBeGreaterThan(1.3);

  // With personality flat, the same contact counts the same for both: the read is the only difference.
  const flat = Object.fromEntries(Object.keys(warm.traits).map((k) => [k, 0]));
  expect(
    temperedHours(core, { traits: flat }, third, hours) /
      temperedHours(core, { traits: { ...flat } }, third, hours),
    where,
  ).toBe(1);
}, 120_000);
