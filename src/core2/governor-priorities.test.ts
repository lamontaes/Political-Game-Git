/**
 * M5-02, governor play, in a random state: the governor sets a budget
 * priority (more for highways), the legislature votes the budget at the
 * state's fiscal year start, and an adopted priority changes real spending
 * and reaches the people that line serves. A rejected budget carries the old
 * one forward and changes nothing.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { openLawReach } from "./law-reach/host";
import {
  budgetsOf,
  governments,
  openBudgets,
  setBudgetPriorities,
} from "./modules/budgets";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`m5-02:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();

describe("M5-02 the governor's budget priorities", () => {
  it("an adopted priority changes the state's spending and reaches the people the line serves", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 250,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openBudgets(core);
    openLawReach(core);
    const api = coreAPI(core);
    const gov = governments(api).find((g) => g.level === "state")!;
    const current = budgetsOf(api, gov.id).at(-1)!;
    const delta = Math.round((current.spendingMinor.highways ?? 0) * 0.1);
    expect(delta, where).toBeGreaterThan(0);
    setBudgetPriorities(api, {
      governmentId: gov.id,
      setBy: "governor",
      changes: { highways: delta },
    });
    const start = `${current.fiscalYear + 1}-${gov.fiscalYearStart}`;
    advanceCore(
      core,
      new Date(Date.parse(`${start}T00:00:00Z`) + 2 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const next = budgetsOf(api, gov.id).find(
      (b) => b.fiscalYear === current.fiscalYear + 1,
    )!;
    const adopted = !/carried forward|continued|rejected/i.test(next.adoptedBy);
    const reached = core.modules.has(REACH_B_MODULE_ID)
      ? (
          api
            .moduleState(REACH_B_MODULE_ID)
            .table("groups")
            .rows() as unknown as { key: string }[]
        ).filter((r) => r.key === "budget-line:highways").length +
        (
          api
            .moduleState(REACH_B_MODULE_ID)
            .table("people")
            .rows() as unknown as { key: string }[]
        ).filter((r) => r.key === "budget-line:highways").length
      : 0;
    if (adopted) {
      // The priority is in the spending, and the line's service reached people.
      expect(next.spendingMinor.highways, where).toBeGreaterThan(
        (current.spendingMinor.highways ?? 0) + delta / 2,
      );
      expect(
        reached,
        `${where}: no one served by the added highways money`,
      ).toBeGreaterThan(0);
    }
    govReport(
      "governor-priorities",
      JSON.stringify({
        where,
        adoptedBy: next.adoptedBy,
        highways: [current.spendingMinor.highways, next.spendingMinor.highways],
        delta,
        reached,
      }),
    );
  }, 600_000);
});
