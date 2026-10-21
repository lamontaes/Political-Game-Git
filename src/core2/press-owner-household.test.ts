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
import { checkEligibility, ELECTIONS_MODULE_ID } from "./modules/elections";

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

// Press owners and staff may stand for office like anyone (gov-press-ban-withdrawn):
// the owners now hold the most cash in town, so they are the likeliest
// candidates, and filing must treat them as it treats any resident.
it(`files an outlet's owner and staff like any other resident in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const outlets = outletsHere(api);
  const press = outlets.flatMap((o) => [o.ownerId, o.headId, ...o.reporterIds]);
  const inPress = new Set(press.filter((id): id is string => !!id));
  expect(inPress.size, `${where}: press people`).toBeGreaterThan(0);
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as { id: string }[];
  expect(contests.length, `${where}: contests`).toBeGreaterThan(0);
  const control = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        !inPress.has(p.id) &&
        p.placeId === core.people.get([...inPress][0]!)!.placeId,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  expect(control, `${where}: a resident outside the press`).toBeDefined();
  for (const contest of contests.slice(0, 5))
    for (const id of inPress) {
      const checks = checkEligibility(api, id, contest.id);
      // No rule bars them for their press work.
      for (const check of checks)
        expect(check.rule, `${where}: ${id} on ${contest.id}`).not.toMatch(
          /press/i,
        );
      // The rules they fail are the ones any resident of their town and age fails.
      const same = checkEligibility(api, control!.id, contest.id);
      expect(
        checks.map((c) => c.rule),
        where,
      ).toEqual(same.map((c) => c.rule));
    }
}, 300_000);
