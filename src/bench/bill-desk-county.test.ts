import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { lawInForce } from "../core2/modules/laws";
import {
  castMemberVote,
  draftBill,
  executiveLean,
  holdVote,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { deskWaiting } from "../core2/modules/office-day";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { deskDecide } from "./office";
import { BenchPlayer } from "./player";

// The county executive's desk in the stage view (the county level of the Legislation mocks): the
// player takes the county executive, a bill the county board passed waits on their desk, the stage
// view says so with the lean, and once they sign or veto it names them and the reasons. Places are
// drawn in turn until one has a county executive the player can take; a seed nobody chose.
const seed =
  process.env.COUNTY_DESK_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the county executive's desk in the stage view (seed ${seed})`, () => {
  it("shows the waiting bill, then who signed or vetoed it and why", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "county-desk");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const seats = townSeats(api);
      const executive = seats.find(
        (s) => s.office.kind === "county-executive" && s.holder?.personId,
      )?.holder?.personId;
      const board = seats.find((s) => s.office.kind === "county-board");
      if (!executive || !board) {
        tried.push(`${where}: no county executive and board`);
        continue;
      }
      const seated = members(api, board.office.id);
      if (seated.length < 3) {
        tried.push(`${where}: board too small`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(executive);
      const start = core.date;
      for (let guard = 0; guard < 50 && core.date <= start; guard += 1) {
        const packet = player.packet;
        if (packet?.kind === "stop") {
          for (const key of heldFederal(api)) releaseFederal(api, key);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      const wage = lawInForce(api, "minimum-wage").value ?? 0;
      const provision: Provision = {
        kind: "law-amount",
        series: "minimum-wage",
        value: wage + 100,
        unit: "minor/hour",
      };
      const draft = draftBill(api, {
        bodyOfficeId: board.office.id,
        sponsorId: memberKey(seated[0]!),
        provisions: [provision],
      });
      if (draft.status === "blocked") {
        tried.push(`${where}: the board may not draft it`);
        continue;
      }
      for (const m of seated)
        castMemberVote(api, draft.id, memberKey(m), "yes");
      holdVote(api, draft.id);
      if (!deskWaiting(api).some((b) => b.id === draft.id)) {
        tried.push(`${where}: the bill did not reach the desk`);
        continue;
      }
      const waiting = billStage(core, draft.id, executive);
      expect(waiting.desk.waiting, where).toBe(true);
      expect(waiting.desk.lean, where).toBeTruthy();
      expect(waiting.desk.decided, where).toEqual([]);
      const how =
        executiveLean(api, draft.id, executive).lean >= 0 ? "sign" : "veto";
      deskDecide(core, draft.id, how);
      const done = billStage(core, draft.id, executive);
      expect(done.desk.waiting, where).toBe(false);
      expect(done.desk.decided.length, where).toBe(1);
      expect(done.desk.decided[0]!.vote, where).toBe(how);
      expect(done.desk.decided[0]!.name.length, where).toBeGreaterThan(0);
      console.log(
        `county desk: ${where}, ${draft.id} ${how}, reasons ${done.desk.decided[0]!.reasons.map((r) => `${r.reason}:${r.side}`).join(",")}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a county executive's desk to show (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
