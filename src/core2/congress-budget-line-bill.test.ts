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
const PLACES = 4;

/**
 * Whether Congress passes a bill that moves one federal budget line is up to
 * its members' own positions, so no one line passes in every world (a defense
 * raise passed in about one world in eight, and in none of three drawn
 * seeds once the opening worlds moved). The claim is that a line the bill
 * paper offers can be moved by real votes: in each drawn world every
 * budget-line policy the federal menu offers is drafted in turn, both ways
 * the paper allows, and put to the chambers; the first bill they enact must
 * move its line the way it says once its day comes. Lines whose chambers
 * said no are named, not skipped silently.
 */
it(
  `Congress moves a federal budget line from the bill paper, by its own vote: replay ${replay}`,
  { timeout: 1_800_000 },
  () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      for (let attempt = 0; attempt < PLACES; attempt += 1) {
        const place = drawPlace(replay, `congress-budget-line-bill:${attempt}`);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        const policies = billCatalog(api, "federal", "US")
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .filter((p) => p.id.startsWith("budget:federal:"));
        expect(
          policies.length,
          "the federal menu lists budget lines",
        ).toBeGreaterThan(0);
        const us = governments(api).find((g) => g.level === "federal")!;
        const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
        let said = 0;
        for (const policy of policies) {
          const line = policy.line!;
          const before = budgetInForce(api, us.id)!.spendingMinor[line] ?? 0;
          if (before <= 0) continue;
          for (const operation of ["expand", "restrict"] as const) {
            if (!policy.operations.includes(operation)) continue;
            const bill = draftBill(api, {
              bodyOfficeId: FEDERAL_HOUSE,
              sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
              provisions: [
                provisionFor({
                  policyId: policy.id,
                  operation,
                  amount: Math.round(before * 0.02),
                  effectiveDate,
                }),
              ],
            });
            let result = holdEveryChamber(api, bill.id);
            if (result.status === "awaiting-signature")
              result = executiveDecision(api, bill.id, true);
            if (result.status !== "enacted") {
              said += 1;
              continue;
            }
            advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 40));
            const after = budgetInForce(api, us.id)!.spendingMinor[line]!;
            if (operation === "expand") expect(after).toBeGreaterThan(before);
            else expect(after).toBeLessThan(before);
            process.stdout.write(
              `CONGRESS-BUDGET enacted ${bill.id} (${operation} ${line}) at ${place.name} (${place.key}, seed ${place.seed}) after ${said} bills the chambers refused; ${tried.join("; ")}\n`,
            );
            return;
          }
        }
        tried.push(
          `${place.name} (${place.key}, seed ${place.seed}): ${said} line bills refused, none enacted`,
        );
      }
      throw new Error(
        `No budget-line bill enacted in ${PLACES} places: ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(true);
    }
  },
);
