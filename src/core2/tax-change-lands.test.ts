// @vitest-environment node
/** A tax a law adds to someone's pay lands on them as a felt change, by record id, and only the law's change counts. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const CASES: readonly (readonly [string, string, string])[] = [
  [
    "Prairie Village, Kansas",
    "2057575",
    "8aadc4eadb2fce04f3477fe846529b657c108aa220a4db232645bdb8486b87b8",
  ],
  ["a drawn city", "", ""],
];

for (const [label, key, seed] of CASES)
  it(
    `${label}: a city income tax lands on named workers as a felt change (replay ${replay})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      let shown = false;
      try {
        for (let attempt = 0; attempt < (key ? 1 : 5); attempt += 1) {
          const place = key
            ? { name: label, key, seed }
            : drawPlace(replay, `tax-change-lands:${attempt}`, (k) => {
                try {
                  return lawChainForPlace(k).incorporated;
                } catch {
                  return false;
                }
              });
          const world = buildBenchWorld(place.seed, gameStartDate(), {
            placeKey: place.key,
            twoLevel: true,
          });
          const api = coreAPI(world.core);
          const chain = lawChain(api);
          const city = chain.levels.find((l) => l.level === "city")!;
          const state = chain.levels.find((l) => l.level === "state")!;
          // A month of pay passes under the old law before the tax begins.
          advanceCore(world.core, addDays(makeIsoDate(api.state.date), 35));
          const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
          enactLaw(api, {
            jurisdiction: state.jurisdiction,
            level: "state",
            series: "local-income-tax-authority",
            value: 1,
            effectiveDate,
            measureId: "tax-lands-grant",
            citation: "Test: the state grants local income tax authority",
          });
          const income = enactLaw(api, {
            jurisdiction: city.jurisdiction,
            level: "city",
            series: "income-tax",
            value: 1,
            unit: "percent-flat",
            effectiveDate,
            measureId: "tax-lands-income",
            citation: "Test: the city's income tax",
          });
          advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 60));
          const landed = [...world.core.durableLog.values()].filter(
            (row) =>
              row.kind === "law.effect-landed" &&
              row.facts?.lawId === income.id,
          );
          process.stdout.write(
            `TAX-LANDS ${place.name} (${place.key}, seed ${place.seed}): income row ${income.id}: ${landed.length} workers felt it, e.g. ${landed[0]?.id} for ${landed[0]?.personIds?.[0]} (mood ${Number(landed[0]?.moodImpulse).toFixed(4)})\n`,
          );
          if (!landed.length) {
            passed.push(`${place.name}: no kept pay record changed`);
            continue;
          }
          for (const row of landed)
            expect(Number(row.moodImpulse), `${row.id} is a loss`).toBeLessThan(
              0,
            );
          shown = true;
          break;
        }
        expect(
          shown,
          `a worker felt the new tax; passed over ${passed.join("; ")}`,
        ).toBe(true);
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
