import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import {
  disasterRepairsPaid,
  townDisasters,
  townDisastersWithDamage,
} from "./modules/disasters";
import { outsideMarketFor, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

// A disaster declared in a town with no builder and no recorded outside
// market stopped the game: "No outside market recorded for jurisdiction_b0f9"
// (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, drawn
// with the salt "stories-from-engines"). The repairs now wait where there is no
// one to pay, and the year plays through.
const seed = "35f504a41ec4764f52666b6c5ccd1992aa077e83";
const place = drawPlace(seed, "stories-from-engines");

const BUILDER_CLASSIFICATION = "enterprise:construction";

/** A town's open builders: the payees the repairs go to first. */
const openBuilders = (core: CoreState, placeId: string) =>
  [...core.organizations.values()].filter(
    (org) =>
      org.classification === BUILDER_CLASSIFICATION &&
      org.placeId === placeId &&
      !core.finance.closures.has(org.id),
  );

const marketAt = (core: CoreState, placeId: string): boolean => {
  try {
    outsideMarketFor(core, residentsRuntime(core)!, placeId);
    return true;
  } catch {
    return false;
  }
};

/** Who could be paid for repairs the day before a disaster is declared. */
interface Payees {
  readonly builders: number;
  readonly market: boolean;
}

/**
 * Plays a year, stopping the day before each disaster is declared to note the
 * town's payees as they stand then, and returns the disasters that damaged
 * homes with the payees noted.
 */
function playYear(core: CoreState) {
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), 365);
  const payees = new Map<number, Payees>();
  const declaredInYear = townDisasters(api)
    .filter((d) => d.declared > core.date && d.declared <= end)
    .sort((a, b) => a.declared.localeCompare(b.declared));
  for (const disaster of declaredInYear) {
    const eve = addDays(makeIsoDate(disaster.declared), -1);
    if (core.date < eve) advanceCore(core, eve);
    // The player may have moved: the repairs are paid where they live on the day.
    const town = core.people.get(core.playerId ?? "")!.placeId;
    payees.set(disaster.number, {
      builders: openBuilders(core, town).length,
      market: marketAt(core, town),
    });
  }
  advanceCore(core, end);
  return [...core.durableLog.values()]
    .filter((row) => row.kind === "hazard.disaster")
    .map((row) => ({
      row,
      number: Number(row.facts?.disasterNumber),
      damagedHomes: Number(row.facts?.damagedHomes ?? 0),
      payees: payees.get(Number(row.facts?.disasterNumber)),
    }))
    .filter((d) => d.damagedHomes > 0);
}

/** The ledger balances and the declared disasters were declared. */
function checkLedger(core: CoreState, where: string): void {
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
}

it(`plays a year through a disaster with no one to pay for repairs (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const api = coreAPI(core);
    const damaged = playYear(core);
    // The repro: homes were damaged, and the town has no open builder and no
    // outside market to pay, so the households paid nothing for repairs.
    expect(
      damaged.length,
      `${where}: a disaster damaged homes`,
    ).toBeGreaterThan(0);
    const repaired = disasterRepairsPaid(api);
    for (const { row, number, damagedHomes, payees } of damaged) {
      const at = `${where}: disaster ${number} (${row.id}, ${damagedHomes} damaged homes)`;
      expect(payees, `${at} payees noted`).toBeDefined();
      expect(payees!.builders, `${at} builders`).toBe(0);
      expect(payees!.market, `${at} outside market`).toBe(false);
      expect(
        repaired.filter((r) => r.disaster === number),
        `${at} repairs`,
      ).toEqual([]);
    }
    checkLedger(core, where);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);

it("a place drawn from all 56 where a disaster damaged homes pays repairs to a recorded payee, or to none where none is recorded", () => {
  const drawSeed =
    process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
  setBookkeeping(false);
  try {
    let played = 0;
    for (let draw = 0; draw < 24 && played < 6; draw++) {
      const drawn = drawPlace(`${drawSeed}:${draw}`, "disasters-no-market");
      const core = createLifeCore(
        generatedOpening(drawn, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      const end = addDays(makeIsoDate(core.date), 365);
      const due = townDisastersWithDamage(coreAPI(core)).filter(
        (row) => row.declared > core.date && row.declared <= end,
      );
      if (!due.length) continue;
      played += 1;
      const where = `${drawn.name} (${drawn.key}), seed ${drawSeed}:${draw}`;
      const damaged = playYear(core);
      if (!damaged.length) continue;
      const repaired = new Set(
        disasterRepairsPaid(coreAPI(core)).map((r) => r.disaster),
      );
      for (const { row, number, damagedHomes, payees } of damaged) {
        const at = `${where}: disaster ${number} (${row.id}, ${damagedHomes} damaged homes)`;
        expect(payees, `${at} payees noted`).toBeDefined();
        const payee = payees!.builders > 0 || payees!.market;
        // A payee is recorded and was paid, or none is and nothing moved.
        expect(repaired.has(number), at).toBe(payee);
      }
      checkLedger(core, where);
      return;
    }
    throw new Error(
      `no disaster damaged homes in ${played} played places (seed ${drawSeed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
