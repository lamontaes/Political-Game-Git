/**
 * A county body's catalog reads the county's own laws and budget, not the
 * town's: its amounts in force and their records come from the county's
 * jurisdiction in the law chain. Places are drawn from all 56 until one has a
 * county in its chain; every place passed over is named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog } from "./bill-catalog";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.COUNTY_CATALOG_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 20;
const WANT = 3;

it("a county catalog reads the county's own budget lines, not the town's", () => {
  const passed: string[] = [];
  const proven: string[] = [];
  for (let draw = 0; draw < DRAWS && proven.length < WANT; draw += 1) {
    const place = drawPlace(seed, `bill-catalog-county:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const chain = lawChain(api);
    const county = chain.levels.find((l) => l.level === "county");
    const city = chain.levels.find((l) => l.level === "city");
    if (!county || !city) {
      passed.push(`${where}: no county and town in the chain`);
      continue;
    }
    const flat = (level: "county" | "city") =>
      new Map(
        billCatalog(api, level)
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .filter((p) => p.kind === "budget-line")
          .map((p) => [p.id, p.inForceRecordId] as const),
      );
    const countyRows = flat("county");
    const cityRows = flat("city");
    // The default is the county's own jurisdiction.
    expect(
      JSON.stringify(billCatalog(api, "county")),
      `${where}: default county jurisdiction`,
    ).toBe(JSON.stringify(billCatalog(api, "county", county.jurisdiction)));
    const differing = [...countyRows].filter(
      ([id, record]) =>
        record !== null &&
        cityRows.get(id) !== undefined &&
        cityRows.get(id) !== null &&
        cityRows.get(id) !== record,
    );
    if (!differing.length) {
      passed.push(`${where}: no budget line both governments carry`);
      continue;
    }
    proven.push(
      `${where}: ${differing.length} lines, e.g. ${differing[0]![0]} county ${differing[0]![1]} against town ${cityRows.get(differing[0]![0])}`,
    );
  }
  process.stdout.write(
    `COUNTY-CATALOG (COUNTY_CATALOG_SEED=${seed}) ${proven.join(" | ")}. Passed over: ${passed.join("; ") || "none"}\n`,
  );
  expect(proven.length, `proven nowhere: ${passed.join("; ")}`).toBe(WANT);
}, 1_800_000);
