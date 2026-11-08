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
  draftBill,
  scheduleVote,
  authorityFor,
  type Provision,
} from "../core2/modules/legislature";
import { lawInForce } from "../core2/modules/laws";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { floorDecide, floorView } from "./office";
import { stateFloorHolds } from "../core2/office-day-state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.OFFICE_DESK_SEED ||
  process.env.GOLDEN_PATH_SEED ||
  randomBytes(8).toString("hex");

describe(`a state floor vote the player is held for (seed ${seed})`, () => {
  it("holds the player the evening before and counts the vote they cast", () => {
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
        try {
          scheduleVote(api, draft.id);
        } catch {
          continue;
        }
        bill = draft;
        break;
      }
      if (!bill) {
        tried.push(`${where}: no sitting to schedule a vote`);
        continue;
      }
      // Advance a day at a time: the floor day's evening holds the player for the bill.
      let held = false;
      for (let guard = 0; guard < 120 && !held; guard++) {
        if (player.pollingPlace) player.leavePolls();
        const packet = player.packet;
        if (stateFloorHolds(api).length > 0) {
          // The floor day of whichever bill the chamber takes up (the weekly agenda), not only the one drafted here.
          const heldBill = stateFloorHolds(api)[0]!;
          held = true;
          expect(
            floorView(core).map((item) => item.billId),
            where,
          ).toContain(heldBill);
          floorDecide(core, heldBill, "no");
          expect(stateFloorHolds(api), where).not.toContain(heldBill);
          const chosen = api
            .moduleState("core2-legislature-v1")
            .table("choices")
            .get(`${heldBill}|${legislator}`) as { vote: string } | undefined;
          expect(chosen?.vote, where).toBe("no");
          break;
        }
        if (packet?.kind === "stop") {
          for (const key of heldFederal(api)) releaseFederal(api, key);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      if (!held) {
        tried.push(`${where}: the bill's floor day did not hold the player`);
        continue;
      }
      console.log(`state floor hold: ${where}, seed ${place.seed}`);
      return;
    }
    throw new Error(
      `no drawn place held the player for a state floor vote (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
