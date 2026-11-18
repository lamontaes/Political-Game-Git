// @vitest-environment node
/** Congress can pass a bill that moves a federal budget line, from the bill paper's own menu, by real votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetInForce, governments } from "./modules/budgets";
import {
  draftBill,
  executiveDecision,
  FEDERAL_HOUSE,
  holdEveryChamber,
  memberKey,
  members,
} from "./modules/legislature";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINE = "nationalDefense";
const TRIES = 8;

it(
  `Congress raises the national defense line from the bill paper, by its own vote: replay ${replay}`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      for (let attempt = 0; attempt < TRIES; attempt += 1) {
        const place = drawPlace(replay, `congress-budget-line-bill:${attempt}`);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        const menu = billCatalog(api, "federal", "US").flatMap((s) =>
          s.topics.flatMap((t) => t.policies),
        );
        expect(
          menu.find((p) => p.id === `budget:federal:${LINE}`),
          "the federal menu lists the line",
        ).toBeDefined();
        const us = governments(api).find((g) => g.level === "federal")!;
        const before = budgetInForce(api, us.id)!.spendingMinor[LINE]!;
        const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
        const bill = draftBill(api, {
          bodyOfficeId: FEDERAL_HOUSE,
          sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
          provisions: [
            provisionFor({
              policyId: `budget:federal:${LINE}`,
              operation: "expand",
              amount: Math.round(before * 0.02),
              effectiveDate,
            }),
          ],
        });
        let result = holdEveryChamber(api, bill.id);
        if (result.status === "awaiting-signature")
          result = executiveDecision(api, bill.id, true);
        tried.push(
          `${place.name} (${place.key}, seed ${place.seed}): ${result.status}`,
        );
        if (result.status !== "enacted") continue;
        advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 40));
        expect(budgetInForce(api, us.id)!.spendingMinor[LINE]!).toBeGreaterThan(
          before,
        );
        process.stdout.write(
          `CONGRESS-BUDGET enacted ${bill.id}; ${tried.join("; ")}\n`,
        );
        return;
      }
      throw new Error(
        `No vote enacted in ${TRIES} places: ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(true);
    }
  },
);
