/**
 * An outlet's endorsement (SG-PEOPLE-press-endorsements), in the played
 * world, a place drawn from all 56: in the final weeks of a contest the
 * outlet's head and owner weigh their regard for the candidates, the outlet
 * backs the one they hold highest and prints it, and its followers' view of
 * that candidate moves toward them through a cause row naming the outlet's
 * story. Seed and place are named in every failure message; set
 * GOLDEN_PATH_SEED to reproduce.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  endorsementsOf,
  followersOf,
  outletsHere,
  storiesPrinted,
} from "./modules/press";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("an outlet endorses the candidate its head and owner hold highest, and its readers move", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "press-endorsements");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `${draw.key} (${core.placeMetadata.placeName}), seed ${draw.seed}`;
    const calls = new Map<string, ReturnType<typeof endorsementsOf>[number]>();
    for (let week = 0; week < 100; week++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      const contests = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as { id: string }[];
      for (const c of contests)
        for (const row of endorsementsOf(api, c.id)) calls.set(row.id, row);
    }
    const rows = [...calls.values()];
    const backed = rows.filter((r) => r.candidateId);
    if (process.env.ENDORSEMENTS_PROOF)
      writeFileSync(
        process.env.ENDORSEMENTS_PROOF,
        JSON.stringify({ where, rows }, null, 1),
      );
    console.log(
      `press-endorsements: ${where}: ${rows.length} calls, ${backed.length} backed`,
    );
    expect(rows.length, where).toBeGreaterThan(0);
    for (const call of backed) {
      const regard = call.regard;
      // The paper backs the highest-held candidate, and holds them above zero.
      expect(call.score, call.id).toBeGreaterThan(0);
      expect(regard[call.candidateId!], call.id).toBe(
        Math.max(...Object.values(regard)),
      );
      // It printed the endorsement, and the story is on the outlet's record.
      const outlet = outletsHere(api).find((o) => o.id === call.outletId)!;
      const story = storiesPrinted(api, outlet.id).find(
        (s) => s.id === call.storyId,
      );
      expect(story?.kind, call.id).toBe("endorsement");
      expect(story?.subjectIds, call.id).toEqual([call.candidateId]);
      // A reader's view of the candidate moved because of it: the voter's
      // impression of them is warmer and counts the contact (the cause rows
      // themselves are kept only for the player's circle).
      const impressions = api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("impressions")
        .rows() as unknown as {
        voterId: string;
        candidateId: string;
        heardOf: boolean;
        warmth: number;
        causes: number;
      }[];
      const followers = new Set(followersOf(api, outlet.id));
      expect(
        impressions.some(
          (i) =>
            i.candidateId === call.candidateId &&
            followers.has(i.voterId) &&
            i.heardOf &&
            i.warmth > 0 &&
            i.causes > 0,
        ),
        `${call.id}: no follower's view moved`,
      ).toBe(true);
    }
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
