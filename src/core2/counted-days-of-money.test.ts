/**
 * Who looks for work follows a household's real cushion. A counted
 * household's money is its share of its group's fund, the same number for a
 * household that was here at the opening and one that moved in since. The
 * monthly review once read each member's own cash, which a newcomer does not
 * carry, so every newcomer read zero days of money and all its free members
 * looked for work.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedDaysOfMoney, JOBS_MODULE_ID } from "./modules/jobs";
import { householdCashReader, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const PLAYED_DAYS = 300;
const ATTEMPTS = 3;

it(`a household that moved in reads its money as one that was always here does (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "counted-days-of-money");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const rt = residentsRuntime(core)!;
    const store = rt.store;
    const opening = new Set<string>();
    for (const h of store.liveHouseholds()) opening.add(h.id);
    advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_DAYS));
    const cashOf = householdCashReader(rt);
    const jobs = coreAPI(core).moduleState(JOBS_MODULE_ID);
    const atWorkOrLooking = new Set<string>();
    for (const table of ["regional", "countedSeekers"])
      for (const row of jobs.table(table).rows() as unknown as {
        personId: string;
      }[])
        atWorkOrLooking.add(row.personId);
    const tally = () => ({ homes: 0, members: 0, busy: 0, zeroDays: 0 });
    const newer = tally(),
      older = tally();
    const wrong: string[] = [];
    for (const h of store.liveHouseholds()) {
      if (h.quarters) continue;
      const cost = store
        .factsOfHousehold(h)
        .reduce((n, member) => n + member.livingCostDailyMinor, 0);
      if (!(cost > 0)) continue;
      const days = countedDaysOfMoney(rt, h, cashOf);
      const at = opening.has(h.id) ? older : newer;
      at.homes += 1;
      if (!(days > 0)) at.zeroDays += 1;
      for (const m of store.countedMembers(h)) {
        at.members += 1;
        if (atWorkOrLooking.has(store.ids[m]!)) at.busy += 1;
      }
      // The rule itself: the days are the household's share of its group's
      // fund over its costs, whoever it is and whenever it came.
      const share = cashOf(h);
      if (Math.abs(days - share / cost) > 1e-9)
        wrong.push(
          `${h.id}: ${days} days, its share of the fund ${share} over costs ${cost}`,
        );
      if (share > 0 && !(days > 0))
        wrong.push(`${h.id}: money in its group's fund and zero days`);
    }
    process.stdout.write(
      `COUNTED DAYS OF MONEY ${where}, after ${PLAYED_DAYS} days: households here at the opening ${older.homes} (${older.zeroDays} read no money; ${older.busy} of ${older.members} members in regional work or looking); moved in since ${newer.homes} (${newer.zeroDays} read no money; ${newer.busy} of ${newer.members} members in regional work or looking)\n`,
    );
    expect(wrong.slice(0, 5), `${wrong.length} households (${where})`).toEqual(
      [],
    );
    if (!newer.homes) {
      tried.push(`${where}: no household with living costs moved in`);
      continue;
    }
    // A newcomer reads no money only where its group's fund is empty.
    expect(
      newer.zeroDays,
      `${newer.zeroDays} of ${newer.homes} households that moved in read no money (${where})`,
    ).toBeLessThan(newer.homes);
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 1_800_000);
