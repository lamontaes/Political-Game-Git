// @vitest-environment node
/**
 * A decided race's gifts, endorsements, polls and stepped-up rows go at the
 * race-close step, and a contest the player filed in keeps every one (governing
 * lead, Nov 1): in a played world in a place drawn from all 56, rows planted
 * for two contests (the player filed in one) are read after `closeRace`.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { CAMPAIGNS_MODULE_ID, closeRace } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`closeRace drops a rival-only race's four tables and keeps the player's (replay ${replay})`, () => {
  setBookkeeping(false);
  const draw = drawPlace(replay, "race-close-rows");
  const where = `${draw.name} (${draw.key}), place seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const contests = elections.table("contests").rows() as unknown as {
    id: string;
  }[];
  expect(contests.length, `${where}: fewer than two contests`).toBeGreaterThan(
    1,
  );
  const [others, mine] = [contests[0]!.id, contests[1]!.id];
  const me = (core as CoreState).playerId ?? [...core.people.keys()][0]!;
  (core as CoreState).playerId = me;
  const filings = elections.table("filings");
  const filing = (contestId: string, personId: string) => {
    const id = `filing:${contestId}:${personId}`;
    filings.put({
      id,
      contestId,
      personId,
      status: "on-ballot",
      filedOn: core.date,
    } as never);
    return id;
  };
  const rival = [...core.people.keys()].find((id) => id !== me)!;
  const fOthers = filing(others, rival);
  const fMine = filing(mine, me);
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  const plant = (contestId: string, filingId: string) => {
    campaigns.table("gifts").put({
      id: `${filingId}|donor`,
      campaignId: filingId,
      donorId: "donor",
    } as never);
    campaigns
      .table("endorsements")
      .put({ id: `endorsement:${filingId}:x`, filingId, contestId } as never);
    campaigns.table("polls").put({
      id: `poll:${filingId}`,
      campaignId: filingId,
      contestId,
    } as never);
    campaigns
      .table("steppedUp")
      .put({ id: `${filingId}:src`, filingId, contestId } as never);
  };
  plant(others, fOthers);
  plant(mine, fMine);
  closeRace(api, others);
  closeRace(api, mine);
  for (const name of ["gifts", "endorsements", "polls", "steppedUp"]) {
    const rows = campaigns.table(name).rows() as unknown as { id: string }[];
    expect(
      rows.filter((r) => r.id.includes(fOthers)),
      `${where}: ${name} of the decided race stayed`,
    ).toHaveLength(0);
    expect(
      rows.filter((r) => r.id.includes(fMine)),
      `${where}: ${name} of the player's contest went`,
    ).toHaveLength(1);
  }
}, 300_000);
