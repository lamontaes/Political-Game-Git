/**
 * BOARD item 6: the federal budget failed at Senate cloture in every game.
 * Congress votes the president's budget on October 1. Where the Senate can't
 * reach cloture, its leaders drop the changes the opponents object to most
 * until 60 agree, as appropriations pass in practice, and what passed is
 * what's spent.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "../../../src/core2/gov-test-report";
import { buildPopulation } from "../../../src/core2/population";
import { advanceCore, createLifeCore } from "../../../src/core2/life";
import { coreAPI } from "../../../src/core2/state";
import { collapseToTwoLevels } from "../../../src/core2/residents";
import { openLaws } from "../../../src/core2/modules/laws";
import { openOffices } from "../../../src/core2/modules/offices";
import { openElections } from "../../../src/core2/modules/elections";
import { openCampaigns } from "../../../src/core2/modules/campaigns";
import { openRecord } from "../../../src/core2/modules/record";
import { openLegislature } from "../../../src/core2/modules/legislature";
import { budgetsOf, governments, openBudgets } from "../../../src/core2/modules/budgets";
import { searchCorePlaces, corePlaceStateIdentities } from "../../../src/core2/place-lookup";

const START = "2026-09-24";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`federal-budget:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("the federal budget", () => {
  it("Congress adopts a budget on October 1, negotiated down where the Senate can't reach cloture", () => {
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
      minimumPeople: 150,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed, core.date);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openBudgets(core);
    const api = coreAPI(core);
    const us = governments(api).find((g) => g.level === "federal")!;
    advanceCore(core, "2026-10-03");
    const budget = budgetsOf(api, us.id).find(
      (b) => b.startsOn === "2026-10-01",
    );
    expect(budget, where).toBeTruthy();
    expect(["rule", "carried"], where).not.toContain(budget!.adoptedBy.kind);
    govReport(
      "federal-budget",
      JSON.stringify({ where, adoptedBy: budget!.adoptedBy }),
    );
  }, 300_000);
});
