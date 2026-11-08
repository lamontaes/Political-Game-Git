import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  BRIBE_OFFERED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

// A bribe offered to the player's seat is the player's to answer (owner, Nov
// 8: "the player gets the choice wherever the world offers them something;
// a trait decides only for people the player isn't"). One world drawn from
// all 56 places on a seed the builder did not choose; a resident with money
// offers the player a bribe on a bill through the game's own `considerBribe`:
// nothing is decided for the player, the offer is a record the director
// stages as the bribe-offer scene, and only the player's answer in it moves
// the money.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "bribe-player-seat");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const { core, director, playerId } = buildBenchWorld(
  place.seed,
  gameStartDate(),
  { twoLevel: true, placeKey: place.key },
);
const api = coreAPI(core);

describe("a bribe offered to the player's seat", () => {
  it("is not decided by the player's traits: it waits for the player's answer, and only taking it moves the money", () => {
    if (!director.ledger.people.has(playerId!)) director.watch(core, playerId!);
    const player = core.people.get(playerId!)!;
    const offerers = [...core.people.values()]
      .filter(
        (row) =>
          row.id !== playerId &&
          row.alive &&
          row.placeId === player.placeId &&
          row.liquidMinor > 0,
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor);
    let crimeId: string | undefined;
    let offererId: string | undefined;
    for (const offerer of offerers.slice(0, 40)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: playerId!,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId: `bill:${where}`,
      });
      if (record?.offered) {
        crimeId = record.id;
        offererId = offerer.id;
        break;
      }
    }
    expect(crimeId, `${where}: no resident offered`).toBeTruthy();
    const before = {
      offerer: core.people.get(offererId!)!.liquidMinor,
      player: core.people.get(playerId!)!.liquidMinor,
    };
    const record = crimeRecord(api, crimeId!)!;
    // Nothing decided and nothing paid.
    expect(record.pending, where).toBe(true);
    expect(record.taken, where).toBe(false);
    expect(core.people.get(offererId!)!.liquidMinor, where).toBe(
      before.offerer,
    );
    // The offer is a record the player is named in.
    const event = core.durableLog.get(`${BRIBE_OFFERED}:${crimeId}`);
    expect(event, where).toBeTruthy();
    expect(event!.witnessIds, where).toContain(playerId);
    expect(event!.personIds, where).toEqual([offererId]);
    // The director stages the scene from it.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const book = director.ledger.people.get(playerId!)!;
    const entry = book.schedule.find((row) => row.momentId.includes(event!.id));
    const binding = entry?.bindings.find(
      (row) => row.typeKey === "bribe-offer",
    );
    expect(binding, `${where}: no bribe-offer scene`).toBeTruthy();
    const scene = purposeScene(core, director, playerId!, entry!, {
      typeKey: "bribe-offer",
    });
    expect(scene?.kind, where).toBe("composed");
    process.stdout.write(
      `BRIBE OFFER ${where}\n  ${scene?.kind === "composed" ? scene.scene.talk.state.text : ""}\n`,
    );
    // The player answers in the scene: handing it back moves nothing.
    api.emit({
      id: `scene.reply:test-refuse:${crimeId}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [playerId!, offererId!],
      placeId: player.placeId,
      facts: {
        typeKey: "bribe-offer",
        causeId: event!.id,
        ending: "handed-back",
      },
      source: { tag: "SOURCED", asOf: core.date, citation: "test" },
    });
    expect(crimeRecord(api, crimeId!)!.pending, where).toBeUndefined();
    expect(crimeRecord(api, crimeId!)!.taken, where).toBe(false);
    expect(core.people.get(playerId!)!.liquidMinor, where).toBe(before.player);
  }, 240_000);

  it("pays the offerer's money to the player only when the player takes it", () => {
    const player = core.people.get(playerId!)!;
    const offerers = [...core.people.values()]
      .filter(
        (row) =>
          row.id !== playerId &&
          row.alive &&
          row.placeId === player.placeId &&
          row.liquidMinor > 0,
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor);
    for (const offerer of offerers.slice(0, 40)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: playerId!,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId: `contract:${where}`,
      });
      if (!record?.offered) continue;
      const before = {
        offerer: offerer.liquidMinor,
        player: core.people.get(playerId!)!.liquidMinor,
      };
      api.emit({
        id: `scene.reply:test-take:${record.id}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [playerId!, offerer.id],
        placeId: player.placeId,
        facts: {
          typeKey: "bribe-offer",
          causeId: `${BRIBE_OFFERED}:${record.id}`,
          ending: "took-it",
        },
        source: { tag: "SOURCED", asOf: core.date, citation: "test" },
      });
      const taken = crimeRecord(api, record.id)!;
      expect(taken.taken, where).toBe(true);
      expect(taken.pending, where).toBeUndefined();
      expect(taken.amountMinor, where).toBeGreaterThan(0);
      expect(core.people.get(offerer.id)!.liquidMinor, where).toBe(
        before.offerer - taken.amountMinor,
      );
      expect(core.people.get(playerId!)!.liquidMinor, where).toBe(
        before.player + taken.amountMinor,
      );
      return;
    }
    throw new Error(`${where}: no resident offered`);
  }, 240_000);
});
