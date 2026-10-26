/**
 * Counted women follow the outcome web's birth-rate factor for their place
 * (owner, Oct 14: one model, two tiers). Full couples decide from their own
 * work, income and room, so a town losing jobs already has fewer of those
 * births; the counted women use the same state rate, times how far the web
 * has moved the place's birth rate from its own unemployment and home
 * prices. Played in the bench world, in a place drawn from all 56 on a seed
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { webReach } from "./outcome-web-reach";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.WEB_BIRTHS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-births");

interface Counts {
  id: string;
  placeId: string;
  month: string;
  webBirths: number;
  webRecordId: string | null;
  expected: { births: number };
}

const countsOf = (core: ReturnType<typeof buildBenchWorld>["core"]) =>
  coreAPI(core)
    .moduleState(RENEWAL_MODULE_ID)
    .table("counts")
    .rows() as unknown as Counts[];

describe(`counted births and the outcome web (${place.name}, seed ${seed})`, () => {
  it("reads the web's factor for the place, by its month record", () => {
    const opening = gameStartDate();
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(opening), 450));
    const api = coreAPI(world.core);
    const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const read = countsOf(world.core).filter((row) => row.webRecordId);
    expect(read.length).toBeGreaterThan(6);
    for (const row of read) {
      const web = months.get(row.webRecordId!) as unknown as {
        values: Record<string, number>;
        bases: Record<string, number>;
      };
      expect(row.webBirths).toBeCloseTo(
        web.values["births.rate"]! / web.bases["births.rate"]!,
        12,
      );
    }
    // The place's conditions moved the rate by the end of the run, and the
    // counts' expected births moved with it.
    const moved = read.filter((row) => Math.abs(row.webBirths - 1) > 0.001);
    console.log(
      `web births: ${place.name}, seed ${seed}: factors ${read.map((r) => r.webBirths.toFixed(3)).join(" ")}; first moved month ${moved[0]?.month} (${moved[0]?.webRecordId})`,
    );
    expect(new Set(read.map((row) => row.webBirths)).size).toBeGreaterThan(1);
    // A year after the opening, the town's home prices have moved from where
    // they began: owners' births rise and renters' fall, from one cause.
    const town = read.at(-1)!.placeId;
    const reach = (tenure: "rent" | "own") =>
      webReach(api, town, "births.rate", { age: 30, sex: "female", tenure });
    const owner = reach("own"),
      renter = reach("rent"),
      average = webReach(api, town, "births.rate");
    const part = (r: typeof owner, key: string) =>
      r.parts.find((p) => p.link === key);
    const ownerLink = part(average, "home-prices-to-owner-births"),
      renterLink = part(average, "home-prices-to-renter-births");
    expect(ownerLink, "home prices moved the owners' link").toBeTruthy();
    expect(renterLink, "home prices moved the renters' link").toBeTruthy();
    const web = months.get(average.recordId!) as unknown as {
      values: Record<string, number>;
      bases: Record<string, number>;
    };
    const priceMove =
      web.values["housing.home-prices"]! - web.bases["housing.home-prices"]!;
    console.log(
      `web births by tenure: ${place.name}, seed ${seed}: home prices moved ${(priceMove * 10_000).toFixed(0)} dollars (record ${average.recordId}); owner factor ${owner.factor.toFixed(5)}, renter ${renter.factor.toFixed(5)}, town ${average.factor.toFixed(5)}`,
    );
    // Owners carry the whole owners' link and none of the renters', and the
    // other way round: the two move apart in the direction prices went.
    expect(part(owner, "home-prices-to-renter-births")!.weight).toBe(0);
    expect(part(renter, "home-prices-to-owner-births")!.weight).toBe(0);
    expect(Math.sign(owner.factor - renter.factor)).toBe(
      Math.sign(ownerLink!.effect),
    );
  }, 900_000);
});
