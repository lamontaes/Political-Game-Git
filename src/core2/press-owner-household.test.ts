/**
 * A press outlet's owner has a household (world-press-outlet-owners-no-household):
 * the press ruling has wealthy owners, and an owner on no payroll was filled in
 * with no cash and no living cost, so nothing about them cost or paid anything.
 * Each owner now holds the bank balance and living cost of a household at the
 * owner income in the press parameters, and spends that cost out of their cash
 * each week. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { outletsHere } from "./modules/press";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "press-owner-household");

it(`gives each outlet owner cash and a living cost in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const owners = outletsHere(api).flatMap((outlet) =>
    outlet.ownerId ? [{ outlet: outlet.id, id: outlet.ownerId }] : [],
  );
  expect(owners.length, `${where}: outlet owners`).toBeGreaterThan(0);
  const debited = (id: string) =>
    core.cashJournal.totalsByOwner.get(id)?.grossDebitMinor ?? 0;
  const start = new Map<string, number>();
  for (const { outlet, id } of owners) {
    const person = core.people.get(id)!;
    expect(
      person.livingCostDailyMinor,
      `${where}: ${outlet} owner ${id} cost`,
    ).toBeGreaterThan(0);
    expect(
      person.liquidMinor,
      `${where}: ${outlet} owner ${id} cash`,
    ).toBeGreaterThan(0);
    start.set(id, debited(id));
  }
  const days = 84;
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  for (const { outlet, id } of owners) {
    const person = core.people.get(id)!;
    if (!person.alive) continue;
    const spent = debited(id) - start.get(id)!;
    // They spend their cost out of what they hold, a week at a time (the
    // last partial week not yet spent); the outlet's draws pay in besides.
    expect(
      spent,
      `${where}: ${outlet} owner ${id} spent living`,
    ).toBeGreaterThan(person.livingCostDailyMinor * (days - 14) * 0.5);
  }
}, 300_000);
