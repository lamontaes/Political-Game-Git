import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { type BillRow } from "../core2/modules/legislature";
import { coreAPI, type CoreState } from "../core2/state";

// A session already sitting when the world opens has its early bills on the record on day one,
// each dated the day it was filed (before the opening), the same bills for the same seed. Places
// are drawn from all 56 on a seed nobody chose.
const seed =
  process.env.OPENING_BILLS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

const billsOf = (core: CoreState) =>
  (
    coreAPI(core)
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((b) => b.bodyOfficeId.startsWith("office:US-"))
    .map((b) => `${b.number}|${b.introduced}|${b.bodyOfficeId}|${b.sponsorId}`)
    .sort();

describe(`bills on day one (seed ${seed})`, () => {
  it("files the sitting session's early bills at the opening, dated as filed, the same each build", () => {
    const lines: string[] = [];
    let proved = false;
    for (let i = 0; i < 10 && !proved; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bills-at-opening");
      const build = () =>
        buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        });
      const first = build();
      const bills = billsOf(first.core);
      lines.push(
        `${draw.name} (${draw.key}): ${bills.length} state bills on day one`,
      );
      if (!bills.length) continue;
      const opening = first.core.date;
      const earlier = bills.filter((b) => b.split("|")[1]! < opening);
      expect(
        earlier.length,
        `${draw.name}: bills dated before the opening`,
      ).toBeGreaterThan(0);
      expect(
        bills.every((b) => b.split("|")[1]! <= opening),
        draw.name,
      ).toBe(true);
      // The same seed, the same bills.
      expect(
        billsOf(build().core),
        `${draw.name}: the same each build`,
      ).toEqual(bills);
      proved = true;
      console.log(
        `bills-at-opening: ${draw.name} (${draw.key}, seed ${draw.seed}): ${bills.length} bills on day one, ${earlier.length} dated before the opening ${opening}; first ${bills[0]}`,
      );
    }
    expect(proved, lines.join("; ")).toBe(true);
  }, 1_800_000);
});
