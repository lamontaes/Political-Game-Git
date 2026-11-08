import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { appointmentsIn, statePostsToFill } from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { memberKey } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { nameHeadPick, officeView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// A governor the player plays names the person for an open cabinet post from the candidates the
// office panel shows; the state chamber's confirmation is on the appointment. A post opens when its
// holder dies (the one hand-set fact here; the rest is the engine's). A place drawn from all 56 on a
// seed nobody chose.
const seed =
  process.env.NOMINATION_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the governor names a cabinet post (seed ${seed})`, () => {
  it("shows the open post with its candidates and seats the one the player names", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "nomination");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      const state = lawChain(api).stateKey;
      const held = appointmentsIn(api, state).find((row) => row.confirmation);
      if (!governor?.personId || !core.people.has(governor.personId) || !held) {
        tried.push(`${where}: no governor to play or no confirmed post`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor.personId);
      const first = core.date;
      for (let guard = 0; guard < 50 && core.date <= first; guard++) {
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      const id = memberKey(governor);
      // The holder of one confirmed post dies; the post stands open.
      api.updatePerson(held.holderId, { alive: false });
      expect(
        statePostsToFill(api, id).map((p) => p.key),
        where,
      ).toContain(held.post);
      const head = officeView(core, governor.personId).heads.find(
        (h) => h.post === held.post,
      );
      expect(head?.candidates.length, where).toBeGreaterThan(0);
      const nominee = head!.candidates[0]!;
      nameHeadPick(core, governor.personId, held.post, nominee.id);
      const seated = appointmentsIn(api, state).find(
        (row) => row.post === held.post,
      );
      expect(seated?.holderId, where).toBe(nominee.id);
      expect(seated?.appointedBy, where).toBe(id);
      expect(seated?.confirmation, where).toBeTruthy();
      expect(
        statePostsToFill(api, id).map((p) => p.key),
        where,
      ).not.toContain(held.post);
      console.log(
        `nomination: ${where}, ${held.post} to ${nominee.name}, confirmation ${JSON.stringify(seated!.confirmation)}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a governor with a confirmed post (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
