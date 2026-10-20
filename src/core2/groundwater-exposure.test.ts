/**
 * A groundwater-withdrawal law cuts a farm's pumping by the statutory share
 * of the groundwater its county irrigates with (USGS water use, 2015), so a
 * county that irrigates from rivers loses nothing and one that irrigates from
 * wells loses the whole cut. Place and seed from GOLDEN_PATH_SEED (random when
 * unset), printed.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { groundwaterExposure } from "./groundwater-exposure";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import resourceParameters from "./data/laws/reach-group-b-parameters.json" with { type: "json" };
import { coreAPI } from "./state";

const question =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";

it("names a county's groundwater share of irrigation from the USGS file, and an estimate for one it lacks", () => {
  // Cheyenne County, Kansas irrigates mostly from wells; Autauga County, Alabama irrigates little; a made-up county is estimated.
  expect(groundwaterExposure("20023").tag).toBe("SOURCED");
  expect(groundwaterExposure("20023").share).toBeGreaterThan(0.5);
  expect(groundwaterExposure("0500000US20023").share).toBe(
    groundwaterExposure("20023").share,
  );
  const unknown = groundwaterExposure("99999");
  expect(unknown.tag).toBe("ESTIMATED");
  expect(unknown.share).toBeGreaterThan(0.3);
  expect(unknown.share).toBeLessThan(0.7);
});

it("limits a town's farms by the statutory cut times its county's groundwater share, and not at all where no groundwater irrigates", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
  const cut =
    1 - resourceParameters.parameters.groundwaterWithdrawalShare.value;
  const seen: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "groundwater-exposure");
    const where = `seed ${seed}:${attempt}, ${place.name} (${place.key})`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const farms = [...core.finance.businesses.keys()].filter(
      (id) =>
        core.organizations.get(id)?.classification === "enterprise:agriculture",
    );
    if (!farms.length) {
      seen.push(`${where}: no farm`);
      continue;
    }
    const exposure = groundwaterExposure(lawChain(api).countyGeoids[0]);
    console.log(
      `groundwater-exposure: ${where}, county ${lawChain(api).countyGeoids[0]}, share ${exposure.share.toFixed(3)} (${exposure.tag}), ${farms.length} farm(s)`,
    );
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series: question,
        value: 1,
        effectiveDate: core.date,
        measureId: "fixture:groundwater-exposure",
        citation: "Controlled law case for the groundwater exposure test.",
      });
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const rules = api
      .moduleState("business")
      .table("operating")
      .rows()
      .filter((row) => String(row.cause).startsWith(`law:${question}:`));
    if (process.env.GROUNDWATER_PROOF)
      writeFileSync(
        process.env.GROUNDWATER_PROOF,
        JSON.stringify({
          where,
          county: lawChain(api).countyGeoids[0],
          exposure,
          rules: rules.map((r) => ({
            id: r.id,
            share: r.share,
            cause: r.cause,
          })),
        }),
      );
    if (exposure.share === 0) expect(rules, where).toEqual([]);
    else {
      expect(rules.length, where).toBeGreaterThan(0);
      for (const rule of rules)
        expect(Number(rule.share), `${where}: ${rule.id}`).toBeCloseTo(
          cut * exposure.share,
          10,
        );
    }
    return;
  }
  throw new Error(`no drawn town has a farm: ${seen.join("; ")}`);
}, 1_800_000);
