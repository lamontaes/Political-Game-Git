/**
 * The president's approval on day one is the share of the vote the race that seated them
 * recorded (src/core2/past-elections.ts keeps it on their term); the game opens on Inauguration
 * Day, so the first row is that share and later months move it by what happens. Pinned: Shubert,
 * Nebraska (3145225), the seed player-age.test.ts names, built without New Game's warm-up
 * (dev-opening.test.ts builds Ridgeville AL with it).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import {
  type ApprovalRow,
  NATIONAL_OPINION_MODULE_ID,
  latestApproval,
  opinionParameter,
  presidentElection,
} from "./national-opinion";

const PLACE = {
  name: "Shubert, Nebraska",
  key: "3145225",
  seed: "4f084788fb52adfd1e9edfff00040a02e8e8447e725934bd60a26d12fa07322f",
};

it(`opens the president's approval at their recorded 2024 share (${PLACE.name})`, () => {
  setBookkeeping(false);
  const where = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}`;
  const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(world.core);
  const election = presidentElection(api);
  expect(
    election,
    `${where}: the race that seated the president`,
  ).toBeDefined();
  // The November 2024 general election, whose winner took office on January 20, 2025.
  expect(election!.date, where).toBe("2024-11-05");
  expect(election!.inauguration, where).toBe("2025-01-20");
  // A two-party share the winner won with.
  expect(election!.share, where).toBeGreaterThan(0.5);
  expect(election!.share, where).toBeLessThan(0.6);
  // Day one runs: the engine opens and writes its first row.
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const first = latestApproval(api);
  expect(first?.id, where).toBe("approval:2025-01");
  expect(first!.basePct, where).toBeCloseTo(
    election!.share * opinionParameter("percentPerShare"),
    9,
  );
  expect(first!.economyPull, where).toBeCloseTo(0, 12);
  expect(first!.sourceRecordIds[0], where).toBe(election!.termId);
  const rows = api
    .moduleState(NATIONAL_OPINION_MODULE_ID)
    .table("approval")
    .rows() as unknown as ApprovalRow[];
  expect(rows.length, `${where}: one row on day one`).toBe(1);
}, 30_000);
