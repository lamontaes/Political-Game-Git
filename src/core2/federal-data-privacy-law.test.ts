// @vitest-environment node
/**
 * Congress's national data privacy law reaches the town's employing businesses
 * over the statute's size test through the business engine's monthly cost
 * review, once. Pinned to Pierre, South Dakota, a state with no privacy law of
 * its own, whose wholesaler and stores sell over the test.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const FEDERAL =
  "us-federal-positions:science-communications.national-data-privacy";
const STATE =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";
const PLACES = [
  { name: "Pierre, South Dakota", key: "4649600", seed: "ilt-pierre" },
];

it(
  `a federal privacy law charges businesses where the state has none, and ends on repeal (${PLACES.map((p) => p.name).join(", ")})`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (const place of PLACES) {
        const where = `${place.name} (${place.key}, seed ${place.seed})`;
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        if (lawInForce(api, STATE).value === 1) {
          passed.push(`${where}: its state already has a privacy law`);
          continue;
        }
        const federal = lawChain(api).levels.find(
          (l) => l.level === "federal",
        )!;
        const rules = () =>
          api
            .moduleState("business")
            .table("operating")
            .rows()
            .filter((r) => String(r.cause).startsWith(`law:${FEDERAL}`));
        const change = (value: number) => {
          enactLaw(api, {
            jurisdiction: federal.jurisdiction,
            level: "federal",
            series: FEDERAL,
            value,
            effectiveDate: world.core.date,
            measureId: `test:federal-privacy:${value}`,
            citation: "Controlled law case in a generated year.",
          });
          advanceCore(world.core, addDays(makeIsoDate(world.core.date), 35));
        };
        expect(rules(), `${where}: none before the law`).toHaveLength(0);
        change(1);
        const bound = rules();
        if (!bound.length) {
          passed.push(`${where}: no employing business to bind`);
          continue;
        }
        for (const row of bound)
          expect(Number(row.share)).toBe(
            api.parameter("businessDataPrivacyShareOfCosts"),
          );
        const payments = api
          .moduleState("business")
          .table("compliance")
          .rows()
          .filter((r) => String(r.cause).startsWith(`law:${FEDERAL}`));
        expect(payments.length, `${where}: nothing paid`).toBeGreaterThan(0);
        expect(payments.some((r) => Number(r.paidMinor) > 0)).toBe(true);
        change(0);
        expect(rules(), `${where}: repeal ends the cost`).toHaveLength(0);
        process.stdout.write(
          `FEDERAL-PRIVACY ${where}: ${bound.length} employing businesses bound at ${(100 * Number(bound[0]!.share)).toFixed(1)}% of other costs, ${payments.length} monthly payments on the journal, repeal ended it. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(`No place showed it: ${passed.join("; ")}`);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
