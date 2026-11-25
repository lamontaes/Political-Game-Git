// @vitest-environment node
/**
 * Congress's national data privacy law reaches the town's employing businesses
 * over the statute's size test through the business engine's monthly cost
 * review, once. Pinned to Pierre, South Dakota, whose wholesaler and stores
 * sell over the test. Where the history from 1925 opens the state with a
 * privacy law of its own, the state repeals it first, so the case is a state
 * with none. Until Nov 16, 2026
 * it drew up to six places at run time and expected an employer bound in one;
 * the statute's size test binds none in most small towns, so that premise no
 * longer holds.
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
  // 85 to 89 s alone and beside the other privacy tests (Nov 16, 2026); about twice that.
  { timeout: 180_000 },
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
        const levels = lawChain(api).levels;
        const federal = levels.find((l) => l.level === "federal")!;
        // The history from 1925 may open the state with a privacy law of its
        // own (Pierre's did on Nov 19, 2026). The state repeals it first, by
        // the game's own enactment, so the case is a state with none.
        const stateRepealed = lawInForce(api, STATE).value === 1;
        if (stateRepealed) {
          const state = levels.find((l) => l.level === "state")!;
          enactLaw(api, {
            jurisdiction: state.jurisdiction,
            level: "state",
            series: STATE,
            value: 0,
            effectiveDate: world.core.date,
            measureId: "test:state-privacy:0",
            citation: "Controlled law case in a generated year.",
          });
          advanceCore(world.core, addDays(makeIsoDate(world.core.date), 35));
          expect(lawInForce(api, STATE).value, `${where}: state repeal`).toBe(
            0,
          );
        }
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
          `FEDERAL-PRIVACY ${where}: ${bound.length} employing businesses bound at ${(100 * Number(bound[0]!.share)).toFixed(1)}% of other costs, ${payments.length} monthly payments on the journal, repeal ended it${stateRepealed ? " (the state's own privacy law from its history repealed first)" : ""}. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(`No place showed it: ${passed.join("; ")}`);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
