/**
 * A town's electric utility is paid by the households that use it (Consumer
 * Expenditure Survey electricity spending, by region and household size), so
 * it opens with a business's cash buffer and its books, receives households'
 * bills, and pays its staff. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { drawPlace } from "../../scripts/core2-year/place";

const UTILITY = "enterprise:utility";
const seed = process.env.UTILITY_SEED || randomBytes(8).toString("hex");

it("a utility is paid by households and pays its staff", () => {
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "utility-staff");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const utility = [...core.organizations.values()].find(
      (org) => org.classification === UTILITY,
    );
    if (!utility) continue;
    expect(core.finance.businesses.has(utility.id), `${where}: books`).toBe(
      true,
    );
    const rt = residentsRuntime(core)!;
    const bills = () =>
      [...rt.flows.values()].filter(
        (flow) =>
          flow.payeeId === utility.id &&
          flow.financeKind === "household.customer.residential-electricity",
      );
    expect(bills().length, `${where}: household bills`).toBeGreaterThan(0);
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const staff = [...rt.flows.values()].filter(
      (flow) =>
        flow.kind === "wages" && flow.payerId === utility.id && !flow.endedAt,
    );
    for (const flow of staff)
      expect(
        flow.lastPaidMinor ?? 0,
        `${where}: ${flow.id} last payday`,
      ).toBeGreaterThan(0);
    return;
  }
  throw new Error(`no utility in eight drawn places, seed ${seed}`);
}, 1_800_000);
