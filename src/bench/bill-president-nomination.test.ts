import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { heldFederal } from "../core2/office-day-federal";
import { cabinetOf, NOMINATIONS } from "../core2/office-day-federal-president";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { nominationDecide, nominationsView } from "./office";
import { addDays } from "../core2/office-day-federal-calendar";
import { leavePostOpen } from "../core2/office-day-federal-president";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The president the player plays is held on a vacant cabinet post and names someone from the people the
// post could go to; the Senate's vote is set for a later sitting day. A place drawn from all 56 on a
// seed nobody chose.
const seed =
  process.env.PRESIDENT_NOMINATION_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the president names a cabinet secretary (seed ${seed})`, () => {
  it("holds the president on the post, shows the candidates and sends the one they name to the Senate", () => {
    const place = drawPlace(seed, "president-nomination");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId;
    expect(president, where).toBeTruthy();
    const player = new BenchPlayer(core, world.director);
    player.select(president!);
    for (let guard = 0; guard < 60; guard++) {
      const packet = player.packet;
      if (packet?.kind === "stop") {
        if (heldFederal(api).includes(NOMINATIONS)) {
          const view = nominationsView(core);
          expect(view.length, where).toBeGreaterThan(0);
          const post = view[0]!;
          expect(post.candidates.length, where).toBeGreaterThan(0);
          const nominee = post.candidates[0]!;
          nominationDecide(core, post.post, nominee.id);
          const row = cabinetOf(api).find((c) => c.postId === post.post)!;
          expect(row.status, where).toBe("nominated");
          expect(row.nomineeId, where).toBe(nominee.id);
          expect(row.voteOn! > core.date, where).toBe(true);
          console.log(
            `president nomination: ${where}, ${post.title} to ${nominee.name}, Senate vote ${row.voteOn}`,
          );
          return;
        }
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    throw new Error(`the president was never held on a cabinet post: ${where}`);
  }, 900_000);

  it("lets the president leave every post open: the hold clears and the day goes on", () => {
    const place = drawPlace(seed, "president-leave-open");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId;
    const player = new BenchPlayer(core, world.director);
    player.select(president!);
    for (let guard = 0; guard < 60; guard++) {
      const packet = player.packet;
      if (packet?.kind === "stop") {
        if (heldFederal(api).includes(NOMINATIONS)) {
          const posts = nominationsView(core);
          expect(posts.length, where).toBeGreaterThan(0);
          for (const post of posts) leavePostOpen(api, president!, post.post);
          expect(heldFederal(api), where).not.toContain(NOMINATIONS);
          expect(
            cabinetOf(api).every((c) => c.status === "acting"),
            where,
          ).toBe(true);
          expect(nominationsView(core), where).toEqual([]);
          // An acting head serves 210 days (5 U.S.C. 3346(a)(1)); the post is the president's to fill again after.
          expect(
            cabinetOf(api).every(
              (c) => c.actingUntil === addDays(core.date, 210),
            ),
            where,
          ).toBe(true);
          console.log(
            `left open: ${where}, ${posts.length} posts left open, hold cleared on ${core.date}`,
          );
          return;
        }
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    throw new Error(`the president was never held on a cabinet post: ${where}`);
  }, 900_000);
});
