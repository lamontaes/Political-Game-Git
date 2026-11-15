import { describe, expect, it } from "vitest";
import {
  leaveHoldsToCharacter,
  ordersDecide,
  ordersView,
} from "../bench/office";
import { wordPrintedStory } from "../bench/archive-words";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  appointmentsIn,
  EMERGENCY_LAPSED,
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
import type { ScheduleEntry } from "./scheduling";
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
  it("is staged for the player governor with the lead department's head, and the player's answer declares", () => {
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
    // Who is in the room: the people who speak, the player and the lead department's head (the map's first post with a holder); the other heads wait on a room that seats more than one speaker.
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
    expect(
      inRoom.filter((id) => id !== playerId),
      where,
    ).toEqual([holders[0]]);
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

  // Longer than a minute for the game's own 30 played days of a governor's state (the window closes on its own date).
  it("leaves an offer the governor never answers theirs for 30 days, meets them again, then lapses with nothing declared", () => {
    const { world, core, api, player, governor, hazardId, hazard } =
      worldAtDisaster(true, "4860");
    const governorId = memberKey(governor);
    const playerId = player.personId!;
    const closes = addDays(makeIsoDate(hazard.date), 30);
    if (!world.director.ledger.people.has(playerId))
      world.director.watch(core, playerId);
    // The governor leaves it undecided: the first meeting's question, a return meeting's "not yet" (no reply that settles), so the scene closes and the offer is still theirs.
    const leave = (entry: ScheduleEntry): boolean => {
      const scene = purposeScene(core, world.director, playerId, entry, {
        typeKey: "emergency-briefing",
      });
      if (scene?.kind !== "composed") return false;
      const replies = scene.scene.talk.tree.replies;
      const ask = replies.findIndex(
        (reply) => reply.line.move === "ask" || reply.line.move === "leave",
      );
      expect(
        ask,
        `${where}: no way to leave it undecided`,
      ).toBeGreaterThanOrEqual(0);
      // A return meeting has no question to ask (it was answered the first time).
      expect(
        replies.some((reply) => reply.line.move === "ask") &&
          entry.momentId.includes("~again~"),
        `${where}: a return meeting offers the question again`,
      ).toBe(false);
      return !!replyInScene(core, world.director, playerId, entry, [ask], {
        typeKey: "emergency-briefing",
      });
    };
    for (
      let guard = 0;
      guard < 400 &&
      core.date <= closes &&
      !core.durableLog.get(`emergency-lapsed:${hazardId}`);
      guard += 1
    ) {
      const packet = player.packet;
      const waiting = world.director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (row) =>
            row.stop &&
            !row.answered?.includes("emergency-briefing") &&
            row.bindings.some((bind) => bind.typeKey === "emergency-briefing"),
        );
      if (waiting && packet?.kind === "stop") {
        expect(leave(waiting), where).toBe(true);
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (player.pollingPlace) player.leavePolls();
      else if (packet?.kind === "stop") {
        for (const item of ordersView(core))
          ordersDecide(core, item.entryId, "decline");
        leaveHoldsToCharacter(core);
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    // It met them again twice while it was theirs, each time its own record: once at the midpoint of the window, once on the last day a meeting can still be held.
    const offered = [...(core.logByKind.get(EMERGENCY_OFFERED) ?? [])]
      .filter((id) => id.startsWith(`emergency-offered:${hazardId}`))
      .map((id) => core.durableLog.get(id)!)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const offers = offered.map((row) => row.date);
    expect(
      offered.map((row) => row.facts?.returnWhen),
      `${where}: offers on ${offers.join(", ")}`,
    ).toEqual([undefined, "midway", "last"]);
    expect(offers[1], where).toBe(addDays(makeIsoDate(hazard.date), 15));
    expect(offers[2], where).toBe(addDays(closes, -2));
    // Every offer before the lapse, the last included, was staged as a meeting the player was in (the season cap never swallows an open decision).
    const staged = (world.director.ledger.people.get(playerId)?.schedule ?? [])
      .filter(
        (entry) =>
          entry.momentId.includes(hazardId) &&
          entry.outcome === "scene-now" &&
          entry.bindings.some((row) => row.typeKey === "emergency-briefing"),
      )
      .map((entry) => entry.date)
      .sort();
    expect(staged, `${where}: staged on ${staged.join(", ")}`).toEqual(offers);
    expect(
      offers.every((date) => date <= closes),
      where,
    ).toBe(true);
    // It lapsed on the window's last day: a public record, nothing declared, no aid asked for.
    const lapsed = core.durableLog.get(`emergency-lapsed:${hazardId}`);
    expect(lapsed?.kind, where).toBe(EMERGENCY_LAPSED);
    expect(lapsed?.date, where).toBe(closes);
    expect(lapsed?.publicRecord, where).toBe(true);
    expect(lapsed?.personIds, where).toEqual(
      governor.personId ? [governor.personId] : [],
    );
    // The paper's words for it report the act not taken and do not say why. The press's own
    // choice to print a record is its reporters' (not staged here); this words the real record.
    const worded = wordPrintedStory(core, {
      id: `story:${lapsed!.id}`,
      kind: "press.printed",
      date: lapsed!.date,
      facts: { sourceRecordId: lapsed!.id },
    } as never);
    const headline = worded?.headline ?? "";
    console.log(
      `emergency-briefing: printed "${headline}" / "${worded?.lede ?? ""}"`,
    );
    expect(headline, where).toMatch(/no emergency (declared )?over the /i);
    // No headline alone: the story also prints its lede.
    expect(worded?.lede ?? "", where).toMatch(/no emergency/i);
    expect(
      api.moduleState(EXECUTIVE_MODULE_ID).table("emergencies").rows().length,
      where,
    ).toBe(0);
    expect(
      pendingEmergencyOffers(api, governorId).map((row) => row.id),
      where,
    ).not.toContain(`emergency-offer:${hazardId}`);
  }, 300_000);
});
