import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { lawInForce } from "../core2/modules/laws";
import {
  castMemberVote,
  draftBill,
  executiveDecision,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  holdEveryChamber,
  memberKey,
  members,
  overridePending,
  votesOn,
  type Provision,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billStage, callOverrideVote, chooseOverrideVote } from "./bill-stage";
import { BenchPlayer } from "./player";

// The override of a presidential veto at the federal level: the player is a member of the House, the
// president (not the player) vetoes a bill Congress passed, the override waits for the player's own
// vote, and counts it when the body takes it up. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.OVERRIDE_FEDERAL_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a presidential veto the player may override (seed ${seed})`, () => {
  it("waits for the player's own vote and counts it", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "override-federal");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const house = members(api, FEDERAL_HOUSE);
      const sponsor = house[0];
      if (!sponsor) {
        tried.push(`${where}: no House`);
        continue;
      }
      const member = memberKey(house[1] ?? sponsor);
      const player = new BenchPlayer(core, world.director);
      player.select(member);
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
      ];
      const everyone = [FEDERAL_HOUSE, FEDERAL_SENATE].flatMap((body) =>
        members(api, body).map(memberKey),
      );
      for (const provision of candidates) {
        const draft = draftBill(api, {
          bodyOfficeId: FEDERAL_HOUSE,
          sponsorId: memberKey(sponsor),
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        for (const id of everyone)
          if (id !== member) castMemberVote(api, draft.id, id, "yes");
        // The president's own choice is a veto; Congress passes the bill, the veto lands.
        executiveDecision(api, draft.id, false);
        const after = holdEveryChamber(api, draft.id);
        if (after.status !== "vetoed" && after.status !== "overridden")
          continue;
        const stage = billStage(core, draft.id, member);
        if (!stage.yours.overridePending) continue;
        expect(overridePending(api, draft.id), where).toBe(true);
        chooseOverrideVote(core, draft.id, "yes", member);
        callOverrideVote(core, draft.id, member);
        expect(overridePending(api, draft.id), where).toBe(false);
        const mine = votesOn(api, draft.id).find(
          (v) =>
            v.memberId === member && (v as { override?: boolean }).override,
        );
        expect(mine?.vote, where).toBe("yes");
        console.log(
          `override-federal: ${where}, ${draft.id}, the player voted yes on the override; bill now ${billStage(core, draft.id, member).status}`,
        );
        return;
      }
      tried.push(`${where}: no vetoed bill waited on the player`);
    }
    throw new Error(
      `no drawn place vetoed a bill the player could override (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
