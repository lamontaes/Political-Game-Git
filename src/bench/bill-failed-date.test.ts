import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  castMemberVote,
  holdVote,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billPaper, seatAct, seatView } from "./legislature";

// A bill the body votes down has a day it was decided, like one that passed: the paper says when.
// A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.FAILED_DATE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the day a bill failed (seed ${seed})`, () => {
  it("is on the paper when a vote ends the bill", () => {
    const tried: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "failed-date");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const council = (
        api
          .moduleState("core2-offices-v1")
          .table("offices")
          .rows() as unknown as { id: string; kind: string }[]
      ).find((o) =>
        ["council", "township-board", "county-board"].includes(o.kind),
      );
      if (!council) {
        tried.push(`${draw.name}: no council`);
        continue;
      }
      const seated = members(api, council.id);
      if (seated.length < 3) {
        tried.push(`${draw.name}: ${seated.length} seated`);
        continue;
      }
      const sponsor = memberKey(seated[0]!);
      const wage = seatView(world.core, sponsor).amounts.find(
        (a) => a.series === "minimum-wage",
      );
      let bill: { id: string; status: string };
      try {
        bill = seatAct(world.core, sponsor, {
          kind: "draft",
          officeId: council.id,
          series: "minimum-wage",
          value: (wage?.current ?? 0) + 200,
        }) as { id: string; status: string };
      } catch (error) {
        tried.push(`${draw.name}: ${(error as Error).message}`);
        continue;
      }
      if (bill.status !== "drafted") {
        tried.push(`${draw.name}: ${bill.status}`);
        continue;
      }
      for (const member of seated)
        castMemberVote(api, bill.id, memberKey(member), "no");
      holdVote(api, bill.id);
      const paper = billPaper(world.core, bill.id);
      expect(paper.decision?.status, draw.name).toBe("failed");
      expect(paper.decision?.decidedOn, `${draw.name}: the day it failed`).toBe(
        world.core.date,
      );
      console.log(
        `failed-date: ${draw.name} (${draw.key}, seed ${draw.seed}) ${paper.number} failed on ${paper.decision?.decidedOn}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a council to vote in (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 600_000);
});
