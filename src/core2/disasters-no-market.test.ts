import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { disasterRepairsPaid, townDisasters } from "./modules/disasters";
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

const hasOutsideMarket = (core: CoreState): boolean => {
  const town = core.people.get(core.playerId ?? "")?.placeId;
  try {
    outsideMarketFor(core, residentsRuntime(core)!, town!);
    return true;
  } catch {
    return false;
  }
};

/** The year's declared disasters, the repairs paid for them, and the ledger. */
function check(core: CoreState, where: string): number {
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const declared = [...core.durableLog.values()].filter(
    (row) => row.kind === "hazard.disaster",
  );
  expect(declared.length, `${where}: a disaster was declared`).toBeGreaterThan(
    0,
  );
  const repaired = new Set(disasterRepairsPaid(api).map((r) => r.disaster));
  const damaged = declared.filter((row) => row.facts?.damagedHomes);
  for (const row of damaged) {
    // Households that lost homes paid a recorded payee, or no payee is
    // recorded for the town and nothing moved.
    const number = Number(row.facts?.disasterNumber);
    expect(
      repaired.has(number) || !hasOutsideMarket(core),
      `${where}: disaster ${number} (${row.id}, damaged homes ${row.facts?.damagedHomes}) has a payee or no outside market`,
    ).toBe(true);
  }
  console.log(
    `${where}: ${declared.length} declared, ${damaged.length} with damaged homes, ${repaired.size} repaired`,
  );
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  return declared.length;
}

it(`plays a year through a disaster with no one to pay for repairs (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${seed}`;
    check(core, where);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);

it("a place drawn from all 56 with a first-year disaster plays through it with the ledger balanced", () => {
  const drawSeed =
    process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
  setBookkeeping(false);
  try {
    for (let draw = 0; draw < 12; draw++) {
      const drawn = drawPlace(`${drawSeed}:${draw}`, "disasters-no-market");
      const core = createLifeCore(
        generatedOpening(drawn, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      const end = addDays(makeIsoDate(core.date), 365);
      const due = townDisasters(coreAPI(core)).filter(
        (row) => row.begins > core.date && row.begins <= end,
      );
      if (!due.length) continue;
      check(core, `${drawn.name} (${drawn.key}), seed ${drawSeed}:${draw}`);
      return;
    }
    throw new Error(`no first-year disaster in 12 draws (seed ${drawSeed})`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
