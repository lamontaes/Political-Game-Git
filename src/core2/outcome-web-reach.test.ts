/**
 * The web's moderators: every researched `varies` row is sourced and quoted,
 * and its weights average to one over the national population, so the
 * population-average effect stays the researched size while the people a
 * cause lands on hardest move most.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { WEB_LINKS } from "./outcome-web-model";
import {
  nationalMeanWeight,
  subjectWeight,
  webReach,
} from "./outcome-web-reach";
import { coreAPI } from "./state";

const seed = process.env.WEB_REACH_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-reach");

const varied = WEB_LINKS.filter((link) => link.varies?.length);

describe("the outcome web's moderators", () => {
  it("exist", () => {
    expect(varied.length).toBeGreaterThan(0);
  });

  it("cite their source and the words the weights stand on", () => {
    for (const link of varied)
      for (const row of link.varies!) {
        expect(row.source.length, link.key).toBeGreaterThan(10);
        expect(row.quote.length, link.key).toBeGreaterThan(10);
        if (row.tag === "ESTIMATED")
          expect(row.estimatedFrom?.length, link.key).toBeGreaterThan(10);
        const shares = row.bands.reduce((n, band) => n + band.share, 0);
        expect(shares, link.key).toBeGreaterThan(0);
        expect(shares, link.key).toBeLessThanOrEqual(1 + 1e-9);
        for (const band of row.bands) {
          expect(band.weight, link.key).toBeGreaterThanOrEqual(0);
          expect(
            band.is !== undefined ||
              band.min !== undefined ||
              band.max !== undefined,
            link.key,
          ).toBe(true);
        }
      }
  });

  it("keep the national average effect at the researched size", () => {
    for (const link of varied)
      expect(nationalMeanWeight(link.key), link.key).toBeCloseTo(1, 9);
  });

  it("land differently on the bands they name, and at the average on anyone unknown", () => {
    for (const link of varied) {
      expect(subjectWeight(link.key)).toBe(1);
      expect(subjectWeight(link.key, {})).toBe(1);
      for (const row of link.varies!) {
        const weights = row.bands.map((band) =>
          subjectWeight(link.key, {
            [row.by]: band.is ?? band.min ?? (band.max ?? 1) - 1,
          }),
        );
        expect(
          Math.max(...weights) - Math.min(...weights),
          link.key,
        ).toBeGreaterThan(0);
      }
    }
    expect(subjectWeight("no-such-link", { age: 30 })).toBe(1);
  });
});

describe(`a recession lands on each woman by her age, in a played town (${place.name}, ${place.state}, seed ${seed})`, () => {
  it("counted women's birth factors spread by age around the place's average", () => {
    const opening = gameStartDate();
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(opening), 40));
    const api = coreAPI(world.core);
    const counts = api
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as {
      placeId: string;
      month: string;
      webRecordId: string | null;
    }[];
    // The latest month that read the web: the factor stands on today's web row.
    const read = counts
      .filter((row) => row.webRecordId)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    expect(read, "a counts row that read the web").toBeTruthy();
    const town = read!.placeId;
    const average = webReach(api, town, "births.rate");
    const part = average.parts.find((p) => p.link === "unemployment-to-births");
    // The town's unemployment sits off the 4% the birth rates were set at.
    expect(part, "the unemployment link moves the town's births").toBeTruthy();
    expect(average.recordId).toBe(read!.webRecordId);
    const at = (age: number) =>
      webReach(api, town, "births.rate", { age, sex: "female" });
    const young = at(22),
      mid = at(32),
      older = at(42);
    for (const reach of [young, mid, older])
      expect(reach.recordId).toBe(average.recordId);
    const effect = (reach: ReturnType<typeof at>) =>
      reach.parts.find((p) => p.link === "unemployment-to-births")!;
    expect(effect(young).weight).toBeGreaterThan(2);
    expect(effect(older).weight).toBe(0);
    expect(effect(mid).weight).toBeGreaterThan(0);
    expect(effect(mid).weight).toBeLessThan(1);
    // Same sign as the place's move, bigger for the young, none at 42.
    const move = part!.effect;
    expect(Math.sign(young.factor - older.factor)).toBe(Math.sign(move));
    expect(Math.abs(young.factor - older.factor)).toBeGreaterThan(
      Math.abs(mid.factor - older.factor),
    );
  }, 600_000);
});
