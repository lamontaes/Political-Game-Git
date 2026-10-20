/**
 * A town's campaign-staff firm (political consulting) is a business like any
 * other: it opens with a cash buffer sized to its payroll, the business
 * engine keeps its books, its staff are paid, and it is the seller a
 * campaign's polls and mail are bought from. In the world the owner plays,
 * in a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { seller } from "./modules/campaigns";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const FIRM = "enterprise:political-consulting";
const seed = process.env.CAMPAIGN_FIRM_SEED || randomBytes(8).toString("hex");

it("opens funded, pays its staff, and sells a campaign its polls and mail", () => {
  // A place whose opening has a campaign-staff firm: draws go on until one does.
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-firm");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const firm = [...core.organizations.values()].find(
      (org) => org.classification === FIRM,
    );
    if (!firm) continue;
    // A business's opening buffer, not the unfunded zero of an institution.
    expect(firm.liquidMinor, `${where}: opening cash`).toBeGreaterThan(0);
    expect(core.finance.businesses.has(firm.id), `${where}: books`).toBe(true);
    const api = coreAPI(core);
    expect(seller(api, "poll"), `${where}: poll seller`).toBe(firm.id);
    expect(seller(api, "mail"), `${where}: mail seller`).toBe(firm.id);
    // Its staff are paid on the paydays of the first months.
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const flows = [...residentsRuntime(core)!.flows.values()].filter(
      (flow) =>
        flow.kind === "wages" && flow.payerId === firm.id && !flow.endedAt,
    );
    for (const flow of flows)
      expect(
        flow.lastPaidMinor ?? 0,
        `${where}: ${flow.id} last payday`,
      ).toBeGreaterThan(0);
    return;
  }
  throw new Error(`no campaign-staff firm in eight drawn places, seed ${seed}`);
}, 1_800_000);
