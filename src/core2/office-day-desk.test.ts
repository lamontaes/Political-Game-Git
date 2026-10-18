/**
 * The desk in the world the owner plays: the bench world, a place and seed
 * nobody chose, every module installed. The player takes the state's
 * governor and a passed bill reaches their desk. Left to the character, it
 * signs or vetoes by the legislature engine's own executive lean (the one
 * rule every executive follows), and the bill ends as that lean says.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import {
  billOf,
  castMemberVote,
  draftBill,
  executiveLean,
  authorityFor,
  type Provision,
  holdVote,
} from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import {
  deskWaiting,
  leaveDeskToCharacter,
  officeActsOf,
} from "./modules/office-day";
import { heldFederal, releaseFederal } from "./office-day-federal";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.OFFICE_DESK_SEED || randomBytes(8).toString("hex");

describe(`the governor's desk (seed ${seed})`, () => {
  it("signs or vetoes a passed bill by the legislature's own executive lean", () => {
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
        holdVote(api, draft.id);
        if (!deskWaiting(api).some((b) => b.id === draft.id)) continue;
        bill = draft;
        break;
      }
      if (!bill) {
        tried.push(`${where}: no candidate bill reached the desk`);
        continue;
      }
      const expected = executiveLean(api, bill.id, governor);
      leaveDeskToCharacter(api, bill.id);
      const act = officeActsOf(api, governor).find(
        (a) => a.recordId === bill.id && a.how === "own-choice",
      )!;
      expect(act.kind, where).toBe(expected.lean >= 0 ? "sign" : "veto");
      expect(act.position, where).toBe(expected.lean);
      const ended = billOf(api, bill.id).status;
      if (expected.lean >= 0)
        expect(["signed", "enacted"], where).toContain(ended);
      else expect(["vetoed", "overridden"], where).toContain(ended);
      return;
    }
    throw new Error(
      `no drawn place put a bill on a governor's desk (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
