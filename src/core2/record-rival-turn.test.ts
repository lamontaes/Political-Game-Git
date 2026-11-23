/**
 * M4-06, in the calibration lane: the rival's own campaign turn, played in the
 * race's last four weeks, buys an attack ad that names the incumbent's real
 * vote, and a ballot it reached cites that vote. Each draw plays about 240
 * days of a world, so it runs with `npm run test:calibration`, not in the
 * hosted run (CTO, Nov 17, 21:53Z).
 */
import { afterAll, beforeAll, describe, it } from "vitest";
import { setKeepEveryonesWhy } from "./why-kept";
import { scenario } from "./record-test-kit";

describe("M4-06 the record follows you, the rival's own turn", () => {
  let keptBefore = false;
  beforeAll(() => {
    keptBefore = setKeepEveryonesWhy(true);
  });
  afterAll(() => {
    setKeepEveryonesWhy(keptBefore);
  });

  it("the rival's own campaign turn buys an attack ad that names a real vote, and a ballot it reached cites that vote", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < 8; draw += 1) {
      const result = scenario(draw, true);
      if (result.skipped) {
        tried.push(`${result.where}: ${result.skipped}`);
        continue;
      }
      return;
    }
    throw new Error(`No rival's turn ran an attack ad: ${tried.join("; ")}`);
  }, 1_800_000);
});
