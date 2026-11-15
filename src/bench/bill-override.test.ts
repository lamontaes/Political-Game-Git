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
  executiveDecision,
  overridePending,
  votesOn,
  authorityFor,
  type Provision,
  holdEveryChamber,
} from "../core2/modules/legislature";
import { lawInForce } from "../core2/modules/laws";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { billStage, callOverrideVote, chooseOverrideVote } from "./bill-stage";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.OFFICE_DESK_SEED ||
  process.env.GOLDEN_PATH_SEED ||
  randomBytes(8).toString("hex");

describe(`a veto the player may override (seed ${seed})`, () => {
  it("waits for the player's own vote and counts it when the body takes it up", () => {
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
      // The player is a member of the state's first chamber who is not the governor.
      const legislator = seats.find(
        (s) =>
          s.office.kind.startsWith("legislature-") &&
          s.holder?.personId &&
          s.holder.personId !== governor,
      )?.holder?.personId;
      const chamber = seats.find((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      const where = `${place.name} (${place.key})`;
      if (!governor || !chamber || !legislator) {
        tried.push(`${where}: no governor or state chamber`);
        continue;
      }
      player.select(legislator);
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
        // The governor's own choice is a veto; the floor passes it, the veto lands.
        executiveDecision(api, draft.id, false);
        const after = holdEveryChamber(api, draft.id);
        if (after.status !== "vetoed" && after.status !== "overridden")
          continue;
        bill = draft;
        break;
      }
      if (!bill) {
        tried.push(`${where}: no candidate bill reached the desk`);
        continue;
      }
      // The governor vetoes (their own choice is the dev control's: executiveDecision), the
      // player sits in the chamber, so the override waits for their vote.
      const id = bill.id;
      const state = billStage(core, id, legislator);
      console.log(
        `override: ${where} ${id} ${state.status} pending ${state.yours.overridePending}`,
      );
      expect(["vetoed", "overridden", "signed"], where).toContain(state.status);
      if (!state.yours.overridePending) continue;
      expect(overridePending(api, id), where).toBe(true);
      chooseOverrideVote(core, id, "yes", legislator);
      callOverrideVote(core, id, legislator);
      expect(overridePending(api, id), where).toBe(false);
      const mine = votesOn(api, id).find(
        (v) =>
          v.memberId === legislator && (v as { override?: boolean }).override,
      );
      expect(mine?.vote, where).toBe("yes");
      return;
    }
    throw new Error(
      `no drawn place vetoed a bill the player could override (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
