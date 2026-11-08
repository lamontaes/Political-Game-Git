// @vitest-environment node
/** A city sales tax and a city income tax enacted in play reach a named shopper and a named worker and the town treasury, by record id. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { purchaseTaxes } from "./modules/purchase-tax";
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
    `${label}: a city sales tax and a city income tax reach a named shopper, a named worker and the treasury (replay ${replay})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const place = key
          ? { name: label, key, seed }
          : drawPlace(replay, "city-tax-reach", (k) => {
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
        const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
        // The state grants its towns the power to tax income; the city then taxes sales and income.
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: "local-income-tax-authority",
          value: 1,
          effectiveDate,
          measureId: "city-tax-grant",
          citation: "Test: the state grants local income tax authority",
        });
        const sales = enactLaw(api, {
          jurisdiction: city.jurisdiction,
          level: "city",
          series: "sales-tax",
          value: 3.5,
          unit: "percent",
          effectiveDate,
          measureId: "city-sales-tax",
          citation: "Test: the city's sales tax",
        });
        const income = enactLaw(api, {
          jurisdiction: city.jurisdiction,
          level: "city",
          series: "income-tax",
          value: 1,
          unit: "percent-flat",
          effectiveDate,
          measureId: "city-income-tax",
          citation: "Test: the city's income tax",
        });
        advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 45));
        // The law reads as in force at the city's level.
        expect(
          lawInForce(api, "sales-tax").levels.find((l) => l.level === "city")
            ?.row?.id,
        ).toBe(sales.id);
        // Sales: a named shopper paid it, and the city's treasury received it.
        const shoppers = appliedOn(api, "sales-tax").filter(
          (r) =>
            r.lawId === sales.id &&
            r.target === "person" &&
            r.what === "sales-tax-paid" &&
            r.amountMinor > 0,
        );
        const tax = [...purchaseTaxes(world.core).values()].find((t) =>
          t.laws?.some((l) => l.lawId === sales.id),
        );
        expect(tax, "the city's sales tax is collected").toBeDefined();
        expect(tax!.collectedMinor, "the treasury received it").toBeGreaterThan(
          0,
        );
        // Income: a named worker had it withheld and sent to the city's treasury.
        let worker: { personId: string; id: string; minor: number } | null =
          null;
        for (const person of world.core.people.values()) {
          for (const record of withholdingOf(api, person.id)) {
            const line = record.lines.find(
              (l) => l.level === "city" && l.tax === "income" && l.minor > 0,
            );
            if (line && line.lawId === income.id) {
              worker = {
                personId: person.id,
                id: record.id,
                minor: line.minor,
              };
              break;
            }
          }
          if (worker) break;
        }
        process.stdout.write(
          `CITY-TAX ${place.name} (${place.key}, seed ${place.seed}): sales row ${sales.id}: ${shoppers.length} named shoppers paid it, e.g. ${shoppers[0]?.targetId} ${shoppers[0]?.amountMinor}; treasury collected ${tax?.collectedMinor} through ${tax?.id}; income row ${income.id}: ${worker ? `${worker.personId} had ${worker.minor} withheld in ${worker.id}` : "no worker's withholding names it"}\n`,
        );
        expect(
          shoppers.length,
          "a named shopper paid the city sales tax",
        ).toBeGreaterThan(0);
        expect(
          worker,
          "a named worker had the city income tax withheld",
        ).not.toBeNull();
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
