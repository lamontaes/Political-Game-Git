/**
 * A mayor sends the council the budget (office play, the budget season): in
 * the weeks after the executive's proposal and before the council's vote, the
 * act is theirs; the council's vote then reads what they set. The bench
 * world, a place and seed nobody chose, every module installed, advanced to
 * the season.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { townSeats } from "./modules/offices";
import {
  OFFICE_DAY_MODULE,
  officeActsOf,
  prepareAct,
} from "./modules/office-day";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { baseBudget, budgetPriorities, governments } from "./modules/budgets";

const seed = process.env.SEND_BUDGET_SEED || randomBytes(8).toString("hex");
const mayorOf = (api: ReturnType<typeof coreAPI>) =>
  townSeats(api).find((s) => s.office.kind === "mayor" && s.holder?.personId)
    ?.holder?.personId;
const { world, place } = worldWith(seed, "send-budget", (w) => {
  const api = coreAPI(w.core);
  return !!mayorOf(api) && governments(api).some((g) => g.level === "city");
});
const core = world.core;
const api = coreAPI(core);

describe(`sending the budget (${place.name}, seed ${seed})`, () => {
  it("sets the council's priorities from the mayor's own budget in the season", () => {
    const mayor = mayorOf(api)!;
    const gov = governments(api).find((g) => g.level === "city")!;
    const proposals = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("budgetProposals");
    for (
      let days = 0;
      days < 420 &&
      !proposals.rows().some((r) => r.id.startsWith(`${gov.id}:`));
      days += 15
    )
      advanceCore(core, addDays(makeIsoDate(core.date), 15));
    const proposal = proposals
      .rows()
      .find((r) => r.id.startsWith(`${gov.id}:`));
    expect(
      proposal,
      `${place.name}: the proposal was sent in the season`,
    ).toBeTruthy();
    const fy = Number(proposal!.id.slice(gov.id.length + 1));
    const line = Object.keys(baseBudget(api, gov, fy).spendingMinor).sort()[0]!;
    prepareAct(api, mayor, "send-budget", { budget: { [line]: 12_345 } });
    (
      OFFICE_DAY_MODULE.effectHandlers as unknown as Record<
        string,
        (api: unknown, actorId: string) => void
      >
    )["send-budget"]!(api, mayor);
    expect(budgetPriorities(api, gov.id)).toEqual({
      setBy: mayor,
      changes: { [line]: 12_345 },
    });
    const act = officeActsOf(api, mayor).find((a) => a.kind === "send-budget")!;
    expect(act.how).toBe("did");
    expect(act.recordId).toBe(`priorities:${gov.id}`);
  }, 1_800_000);
});
