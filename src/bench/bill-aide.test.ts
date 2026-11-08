import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { learnStake, memberKey, members } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { seatAct, seatView } from "./legislature";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// Before the vote the player sees what colleagues told them and their aide's estimate, in words and marked as
// able to be wrong: it reads only what members told the player, and members who have not said are the margin.
const seed =
  process.env.AIDE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the aide's estimate on the paper (seed ${seed})`, () => {
  it("is drawn from what members told the player and leaves the rest as the margin", () => {
    const tried: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "aide-estimate");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
      const council = (
        api
          .moduleState("core2-offices-v1")
          .table("offices")
          .rows() as unknown as { id: string; kind: string }[]
      ).find((o) =>
        ["council", "township-board", "county-board"].includes(o.kind),
      );
      const seated = council ? members(api, council.id) : [];
      if (!council || seated.length < 4) {
        tried.push(`${where}: no body of four`);
        continue;
      }
      const sponsor = memberKey(seated[0]!);
      // The sponsor is the player: the game keeps what colleagues tell the player and who they deal with.
      if (!world.core.people.has(sponsor)) {
        tried.push(`${where}: the sponsor is a counted member`);
        continue;
      }
      const player = new BenchPlayer(world.core, world.director);
      player.select(sponsor);
      const first = world.core.date;
      for (let guard = 0; guard < 50 && world.core.date <= first; guard++) {
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      const wage = seatView(world.core, sponsor).amounts.find(
        (a) => a.series === "minimum-wage",
      );
      const bill = seatAct(world.core, sponsor, {
        kind: "draft",
        officeId: council.id,
        series: "minimum-wage",
        value: (wage?.current ?? 0) + 200,
      }) as { id: string; status: string };
      if (bill.status !== "drafted") continue;
      // No one has told the sponsor anything: no estimate to show.
      expect(billStage(world.core, bill.id, sponsor).aide?.heard, where).toBe(
        0,
      );
      // Two colleagues tell them where they stand; the rest are the margin.
      for (const member of seated.slice(1, -1))
        learnStake(api, bill.id, memberKey(member), "conversation");
      const stage = billStage(world.core, bill.id, sponsor);
      const aide = stage.aide!;
      // Members who said nothing either way leave nothing to estimate: try another place.
      if (aide.heard === 0) {
        tried.push(`${where}: no one told the sponsor a side`);
        continue;
      }
      const yes = stage.told.filter((t) => t.side === "for").length;
      const no = stage.told.filter((t) => t.side === "against").length;
      const unsaid = aide.members - yes - no;
      expect(aide.heard, where).toBe(yes + no);
      expect(aide.members, where).toBe(seated.length);
      expect(aide.outlook, where).toBe(
        yes > no + unsaid ? "pass" : no > yes + unsaid ? "fail" : "close",
      );
      console.log(
        `aide: ${where}, ${seated.length} members, ${yes} for and ${no} against told, outlook ${aide.outlook}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a body of four (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
