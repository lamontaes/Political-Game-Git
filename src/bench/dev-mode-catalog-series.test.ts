// @vitest-environment node
/** Dev mode knows every series and question the bill paper offers at any level, from the one catalog. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import catalog from "../core2/data/legislature/bill-catalog.json";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { lawSeriesCatalog } from "./dev-mode";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "dev-mode-catalog-series");

it(
  `every law-amount series and policy question in the bill catalog is a known series: ${place.name}, replay ${replay}`,
  { timeout: 600_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const known = new Set(lawSeriesCatalog(coreAPI(world.core)));
      const missing: string[] = [];
      let checked = 0;
      for (const subject of catalog.subjects)
        for (const topic of subject.topics)
          for (const policy of topic.policies as {
            id: string;
            kind: string;
            series?: string;
            question?: string;
          }[]) {
            const key =
              policy.kind === "law-amount"
                ? policy.series
                : policy.kind === "policy-question"
                  ? policy.question
                  : undefined;
            if (!key) continue;
            checked += 1;
            if (!known.has(key)) missing.push(`${policy.id} (${key})`);
          }
      expect(missing, "catalog policies dev mode does not know").toEqual([]);
      expect(checked).toBeGreaterThan(100);
      // The case Dev Mode's tester hit: a state's grant or bar on a town's power.
      expect(
        known.has(
          "local-power:us-policy-positions:housing-land-use.rent-stabilization",
        ),
      ).toBe(true);
      process.stdout.write(
        `DEV-CATALOG ${place.name} (${place.key}, seed ${place.seed}): ${checked} catalog series and questions, all known to dev mode\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
