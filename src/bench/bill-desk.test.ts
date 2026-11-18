/**
 * The bill's desk view at a state legislature (the state level of the Legislation mocks):
 * the player takes the governor, a bill the state chamber passed waits on their desk, the
 * stage view says so with the lean, and once they sign or veto it names them and the reasons.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import {
  castMemberVote,
  draftBill,
  executiveLean,
  authorityFor,
  type Provision,
  holdEveryChamber,
} from "../core2/modules/legislature";
import { lawInForce } from "../core2/modules/laws";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { deskWaiting } from "../core2/modules/office-day";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { billStage } from "./bill-stage";
import { deskDecide } from "./office";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.OFFICE_DESK_SEED ||
  process.env.GOLDEN_PATH_SEED ||
  randomBytes(8).toString("hex");

describe(`the governor's desk in the stage view (seed ${seed})`, () => {
  it("shows the waiting bill, then who signed or vetoed it and why", () => {
    // Some territorial office data has no state chamber or governor to play,
    // and some states' chairs hear no candidate bill: places are drawn in
    // turn until a bill reaches the governor's desk.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(
        attempt ? `${seed}:${attempt}` : seed,
        "office-desk",
      );
      console.log(
        `office-day-desk: ${place.name} (${place.key}), seed ${seed}`,
      );
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const player = new BenchPlayer(core, world.director);
      const start = core.date;
      const seats = townSeats(api);
      const governor = seats.find((s) => s.office.kind === "governor")?.holder
        ?.personId;
      const chamber = seats.find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      const where = `${place.name} (${place.key})`;
      if (!governor || !chamber) {
        tried.push(`${where}: no governor or state chamber`);
        continue;
      }
      player.select(governor);
      // Control binds when the clock next advances.
      for (let guard = 0; guard < 50 && core.date <= start; guard++) {
        if (player.pollingPlace) player.leavePolls();
        const packet = player.packet;
        if (packet?.kind === "stop") {
          for (const key of heldFederal(api)) releaseFederal(api, key);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      // A raise in the minimum wage, else a policy question the state may answer.
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
      // Every member of the state's chambers votes yes; a bill a committee
      // chair will not hear never reaches the desk, so the next one is tried.
      const members = seats.filter(
        (s) => s.office.kind.startsWith("legislature-") && s.holder?.personId,
      );
      let bill: ReturnType<typeof draftBill> | undefined;
      for (const provision of candidates.filter(
        (p) => authorityFor(api, p).allowed,
      )) {
        const draft = draftBill(api, {
          bodyOfficeId: chamber.office.id,
          sponsorId: chamber.holder!.personId!,
          provisions: [provision],
        });
        if (draft.status === "blocked") continue;
        for (const seat of members)
          castMemberVote(api, draft.id, seat.holder!.personId!, "yes");
        holdEveryChamber(api, draft.id);
        if (!deskWaiting(api).some((b) => b.id === draft.id)) continue;
        bill = draft;
        break;
      }
      if (!bill) {
        tried.push(`${where}: no candidate bill reached the desk`);
        continue;
      }
      const waiting = billStage(core, bill.id, governor);
      // A state bill went through its chamber's committee first: the record names the chair,
      // who testified and each member's vote.
      console.log(
        `committee: ${where} ${JSON.stringify(waiting.committees.map((c) => ({ committee: c.committee, chair: c.chair, heard: c.heard, witnesses: c.witnesses.length, votes: c.votes.length })))} floor ${waiting.floor.map((f) => f.result).join(" / ")}`,
      );
      expect(waiting.desk.waiting, where).toBe(true);
      expect(waiting.desk.lean, where).toBeTruthy();
      expect(waiting.desk.decided, where).toEqual([]);
      const how =
        executiveLean(api, bill.id, governor).lean >= 0 ? "sign" : "veto";
      deskDecide(core, bill.id, how);
      const done = billStage(core, bill.id, governor);
      expect(done.desk.waiting, where).toBe(false);
      expect(done.desk.decided.length, where).toBe(1);
      expect(done.desk.decided[0]!.vote, where).toBe(how);
      expect(done.desk.decided[0]!.name.length, where).toBeGreaterThan(0);
      console.log(
        `desk: ${where}, seed ${place.seed}, ${bill.id} ${how}, reasons ${done.desk.decided[0]!.reasons.map((r) => `${r.reason}:${r.side}`).join(",")}`,
      );
      return;
    }
    throw new Error(
      `no drawn place put a bill on a governor's desk (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
