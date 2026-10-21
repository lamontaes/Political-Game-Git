/**
 * The licensed share by occupation (pool item
 * research-occupational-licensing-shares): read for a place drawn from all 56
 * on a seed nobody chose (LICENSING_SEED pins one), every row sits between
 * zero and one and the all-worker share sits inside the state spread.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import shares from "../../data/research/jobs/occupational-licensing-shares.json" with { type: "json" };
import { licensedShare, licensedShareSpread } from "./occupational-licensing";

const seed = process.env.LICENSING_SEED ?? randomBytes(8).toString("hex");

it("licensed shares by occupation are sourced rows inside the state spread", () => {
  const place = drawPlace(seed, "licensing");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const used = shares.nationalByOccupation.map((r) =>
    licensedShare(r.occupation),
  );
  expect(used.length, where).toBeGreaterThan(20);
  for (const row of used) {
    expect(row.share, `${where}: ${row.occupation}`).toBeGreaterThan(0);
    expect(row.share, `${where}: ${row.occupation}`).toBeLessThan(1);
    expect(row.tag).toBe("SOURCED");
  }
  const all = licensedShare("Total, 16 years and over").share;
  const spread = licensedShareSpread();
  expect(all, where).toBeGreaterThanOrEqual(spread.low);
  expect(all, where).toBeLessThanOrEqual(spread.high);
  expect(licensedShare("No such group").tag, where).toBe("ESTIMATED");
});
