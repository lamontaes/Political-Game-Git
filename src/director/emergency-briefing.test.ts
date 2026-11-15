import { describe, expect, it } from "vitest";
import { ordersDecide, ordersView } from "../bench/office";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  appointmentsIn,
  EMERGENCY_OFFERED,
  EXECUTIVE_MODULE_ID,
  emergencyBriefingPosts,
  pendingEmergencyOffers,
} from "../core2/modules/executive";
import { advanceCore } from "../core2/life";
import { lawChain } from "../core2/modules/laws";
import { memberKey } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// The governor's briefing room (owner, Oct 14: the engine never declares for the player; Nov 15
// build-out step 8). A disaster record lands in the state of a governor the player plays: the
// executive engine keeps the offer and writes the emergency-offered record, the director stages the
// emergency-briefing scene from it with the heads of the departments the disaster touches in the
// room, and the player's answer in the scene is read by the executive engine (the same declaration
// the engine writes for any other governor). Pinned: Frankfort, Kentucky (a governor, the emergency
// power and FEMA disaster 4860, the February 24, 2025 storms, with federal aid on record), seed below.
// The disaster is the disasters engine's own record, reached by playing the days to it.
const PLACE = "2128900";
const SEED = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9";
const where = `Frankfort, Kentucky (${PLACE}), seed ${SEED}`;

/**
 * The world played to the day the disasters engine records disaster `number` (a February 2025 storm), with or without the player
 * governing: the game's own path, nothing inserted.
 */
function worldAtDisaster(playerIsGovernor: boolean, number: string) {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  expect(governor, `${where}: no governor`).toBeTruthy();
  const hazards = () =>
    [...(core.logByKind.get("hazard.disaster") ?? [])].filter(
      (id) => core.durableLog.get(id)?.facts?.disasterNumber === number,
    );
  const player = new BenchPlayer(core, world.director);
  if (playerIsGovernor) {
    // The governor is the player; control binds when the clock next advances.
    player.select(memberKey(governor!));
    for (let guard = 0; guard < 400 && !hazards().length; guard += 1) {
      const packet = player.packet;
      if (player.pollingPlace) player.leavePolls();
      else if (packet?.kind === "stop") {
        // The governor's desk: orders and posts the player sets aside, as a player who is not
        // answering today would.
        for (const item of ordersView(core))
          ordersDecide(core, item.entryId, "decline");
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
  } else {
    advanceCore(core, addDays(makeIsoDate(core.date), 28));
  }
  const hazardId = hazards()[0];
  expect(
    hazardId,
    `${where}: no disaster recorded by ${core.date}`,
  ).toBeTruthy();
  const hazard = core.durableLog.get(hazardId!)!;
  return {
    world,
    core,
    api,
    player,
    governor: governor!,
    hazardId: hazardId!,
    hazard,
  };
}

describe(`the governor's briefing room (${where})`, () => {
  it("is staged for the player governor with the department heads the disaster touches, and the player's answer declares", () => {
    const { world, core, api, player, governor, hazardId, hazard } =
      worldAtDisaster(true, "4860");
    const governorId = memberKey(governor);
    // The offer waits on the governor and its record names them; nothing is declared for them.
    const offerId = `emergency-offer:${hazardId}`;
    expect(
      pendingEmergencyOffers(api, governorId).map((row) => row.id),
      where,
    ).toContain(offerId);
    const offered = core.durableLog.get(`emergency-offered:${hazardId}`);
    expect(offered?.kind, where).toBe(EMERGENCY_OFFERED);
    expect(offered?.personIds, where).toEqual([governorId]);
    expect(
      api.moduleState(EXECUTIVE_MODULE_ID).table("emergencies").rows().length,
      where,
    ).toBe(0);
    // The scene plays the day it is offered.
    const playerId = player.personId!;
    if (!world.director.ledger.people.has(playerId))
      world.director.watch(core, playerId);
    const stop = addDays(makeIsoDate(core.date), 3);
    let entry;
    for (let day = 0; day < 4 && !entry && core.date <= stop; day += 1) {
      entry = world.director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (row) =>
            row.momentId.includes(offered!.id) &&
            row.bindings.some((bind) => bind.typeKey === "emergency-briefing"),
        );
      if (!entry) {
        const packet = player.packet;
        if (packet?.kind === "stop") break;
        player.advance("day");
      }
    }
    expect(entry, `${where}: no emergency-briefing scene`).toBeTruthy();
    const binding = entry!.bindings.find(
      (row) => row.typeKey === "emergency-briefing",
    )!;
    // Who is in the room: the holders of the map's posts for this disaster, lead department first.
    const state = lawChain(api).stateKey;
    const posts = emergencyBriefingPosts(String(hazard.facts?.incidentType));
    const holders = posts.flatMap((post) =>
      appointmentsIn(api, state)
        .filter((row) => row.post === post)
        .map((row) => row.holderId),
    );
    expect(
      holders.length,
      `${where}: no cabinet head in the room`,
    ).toBeGreaterThan(0);
    const inRoom = binding.roles.flatMap((row) => row.personIds);
    expect(inRoom.filter((id) => id !== playerId).sort(), where).toEqual(
      [...holders].sort(),
    );
    expect(
      binding.roles.find((row) => row.role === "briefer")?.personIds,
      where,
    ).toEqual([holders[0]]);
    const scene = purposeScene(core, world.director, playerId, entry!, {
      typeKey: "emergency-briefing",
    });
    expect(JSON.stringify(scene), where).toContain("composed");
    if (scene?.kind !== "composed") return;
    // The player declares in the scene: the same declaration and budget line the engine writes for any governor.
    const yes = scene.scene.talk.tree.replies.findIndex(
      (reply) => reply.line.move === "agree",
    );
    expect(yes, where).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(
      core,
      world.director,
      playerId,
      entry!,
      [yes],
      {
        typeKey: "emergency-briefing",
      },
    );
    expect(replyId, where).toBeTruthy();
    const declared = api
      .moduleState(EXECUTIVE_MODULE_ID)
      .table("emergencies")
      .rows() as unknown as {
      id: string;
      executiveId: string;
      hazardRecordId: string;
      deltaMinor: number;
    }[];
    expect(
      declared.map((row) => row.hazardRecordId),
      where,
    ).toEqual([hazardId]);
    expect(declared[0]!.executiveId, where).toBe(governorId);
    expect(declared[0]!.deltaMinor, where).toBeGreaterThan(0);
    expect(
      core.durableLog.get(`emergency-declared:${declared[0]!.id}`),
      where,
    ).toBeTruthy();
    expect(
      pendingEmergencyOffers(api, governorId).map((row) => row.id),
      where,
    ).not.toContain(offerId);
  }, 120_000);

  it("is not staged where the player is not the governor: the engine declares as before", () => {
    const { core, api, hazardId } = worldAtDisaster(false, "3624");
    expect(
      core.durableLog.get(`emergency-offered:${hazardId}`),
      where,
    ).toBeUndefined();
    const declared = api
      .moduleState(EXECUTIVE_MODULE_ID)
      .table("emergencies")
      .rows() as unknown as { hazardRecordId: string }[];
    expect(
      declared.map((row) => row.hazardRecordId),
      where,
    ).toContain(hazardId);
  }, 120_000);
});
