import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { lawInForce } from "../core2/modules/laws";
import {
  castMemberVote,
  draftBill,
  executiveLean,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  holdEveryChamber,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { deskWaiting } from "../core2/modules/office-day";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { deskDecide } from "./office";
import { BenchPlayer } from "./player";

// The president's desk in the stage view (the federal level of the Legislation mocks): the player
// takes the presidency, a bill both chambers of Congress passed waits on their desk, the stage view
// says so with the lean, and once they sign or veto it names them and the reasons. A place drawn
// from all 56 on a seed nobody chose.
const seed =
  process.env.PRESIDENT_DESK_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the president's desk in the stage view (seed ${seed})`, () => {
  it("shows the waiting bill, then who signed or vetoed it and why", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "president-desk");
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
      const floor = lawInForce(api, "minimum-wage").value ?? 0;
      const candidates: Provision[] = [
        {
          kind: "law-amount",
          series: "minimum-wage",
          value: floor + 100,
          unit: "minor/hour",
        },
        ...PLATFORM_QUESTIONS.map((question): Provision => ({
          kind: "policy-question",
          question,
          value: 1,
        })),
      ];
      const sponsor = members(api, FEDERAL_HOUSE)[0];
      expect(sponsor, where).toBeTruthy();
      const everyone = [FEDERAL_HOUSE, FEDERAL_SENATE].flatMap((body) =>
        members(api, body).map(memberKey),
      );
      let reached = 0;
      // The authority check is the body's own (a blocked draft is skipped), not the town's.
      for (const provision of candidates) {
        const draft = draftBill(api, {
          bodyOfficeId: FEDERAL_HOUSE,
          sponsorId: memberKey(sponsor!),
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        for (const id of everyone) castMemberVote(api, draft.id, id, "yes");
        holdEveryChamber(api, draft.id);
        if (!deskWaiting(api).some((b) => b.id === draft.id)) continue;
        reached += 1;
        const waiting = billStage(core, draft.id, president!);
        expect(waiting.desk.waiting, where).toBe(true);
        expect(waiting.desk.lean, where).toBeTruthy();
        expect(waiting.desk.decided, where).toEqual([]);
        const how =
          executiveLean(api, draft.id, president!).lean >= 0 ? "sign" : "veto";
        deskDecide(core, draft.id, how);
        const done = billStage(core, draft.id, president!);
        expect(done.desk.waiting, where).toBe(false);
        expect(done.desk.decided.length, where).toBe(1);
        expect(done.desk.decided[0]!.vote, where).toBe(how);
        expect(done.desk.decided[0]!.name.length, where).toBeGreaterThan(0);
        console.log(
          `president desk: ${where}, ${draft.id} ${how}, reasons ${done.desk.decided[0]!.reasons.map((r) => `${r.reason}:${r.side}`).join(",")}`,
        );
        break;
      }
      if (reached > 0) return;
      tried.push(`${where}: no Congress bill reached the desk`);
    }
    throw new Error(
      `no drawn place sent a Congress bill to the president (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
