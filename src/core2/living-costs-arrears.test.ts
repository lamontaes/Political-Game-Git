/**
 * A household that cannot pay its outside living cost on the 1st pays it when
 * money arrives. Played world in a place drawn from all 56; the place and seed
 * are named in every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("pays at least 90 percent of the living costs asked over 90 days, and the books balance", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "living-costs-arrears");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    const living = core.finance.totalsByKind.get(
      "household.outside-living-costs",
    );
    expect(living, where).toBeDefined();
    expect(living!.requestedMinor, where).toBeGreaterThan(0);
    expect(
      living!.paidMinor / living!.requestedMinor,
      `${where}: paid ${living!.paidMinor} of ${living!.requestedMinor}`,
    ).toBeGreaterThanOrEqual(0.9);
    // What is unfunded is what was asked and not yet paid, never more.
    expect(living!.unfundedMinor, where).toBeLessThanOrEqual(
      living!.requestedMinor - living!.paidMinor + 1,
    );
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
