import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import {
  authorityFor,
  draftBill,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The bill the player sponsors carries the members who signed on beside them: for the bill and close to
// the sponsor, by name on the paper. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.COSPONSORS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`cosponsors on the player's bill (seed ${seed})`, () => {
  it("names the members who signed on beside the player", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "cosponsors");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const seat = townSeats(api).find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      const member = seat?.holder?.personId;
      if (!seat || !member || !core.people.has(member)) {
        tried.push(`${where}: no member to play`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(member);
      const first = core.date;
      for (let guard = 0; guard < 50 && core.date <= first; guard++) {
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      for (const question of PLATFORM_QUESTIONS) {
        const provision: Provision = {
          kind: "policy-question",
          question,
          value: 1,
        };
        if (!authorityFor(api, provision).allowed) continue;
        const draft = draftBill(api, {
          bodyOfficeId: seat.office.id,
          sponsorId: member,
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        const stage = billStage(core, draft.id, member);
        if (stage.cosponsors.length) {
          expect(
            stage.cosponsors.every((c) => c.name.length > 0),
            where,
          ).toBe(true);
          expect(draft.sponsorId, where).toBe(member);
          console.log(
            `cosponsors: ${where}, ${draft.number} signed by ${stage.cosponsors.map((c) => c.name).join(", ")}`,
          );
          return;
        }
      }
      tried.push(`${where}: no bill drew a cosponsor`);
    }
    throw new Error(
      `no drawn place gave the player's bill a cosponsor (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_500_000);
});
