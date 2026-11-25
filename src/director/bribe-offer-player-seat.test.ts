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
import { coreAPI, fillInPerson } from "../core2/state";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { bodyOf, draftBill, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { purposeScene } from "./purpose-scene";
import { townResidentsByCash } from "../core2/resident-adults-test-kit";

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
// A bribe is offered on a bill the body has before it, so the place needs a
// lawmaking body of its own (a village with none has no bill to offer on): the
// next drawn place stands in, and each place passed over is named.
const passedOver: string[] = [];
function openWorld() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "bribe-player-seat");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const seat = townSeats(api).find(
      (row) =>
        row.holder?.personId &&
        ["city", "county"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    );
    if (seat) return { ...world, place, where, seat };
    passedOver.push(`${where}: no lawmaking body held by a person`);
  }
  throw new Error(
    `no drawn place had a lawmaking body: ${passedOver.join("; ")}`,
  );
}
const { core, director, where, seat } = openWorld();
// The player's seat is a seat on the body the bill is before: an official with
// no say over a bill cannot be bribed for it (`bribeRefusal`), so the player
// is the member who holds the seat.
const playerId = seat.holder!.personId!;
core.playerId = playerId as typeof core.playerId;
fillInPerson(core, playerId);
if (passedOver.length)
  process.stdout.write(
    `bribe-offer-player-seat: passed over ${passedOver.join("; ")}\n`,
  );
const api = coreAPI(core);

describe("a bribe offered to the player's seat", () => {
  it("is not decided by the player's traits: it waits for the player's answer, and only taking it moves the money", () => {
    if (!director.ledger.people.has(playerId!)) director.watch(core, playerId!);
    const player = core.people.get(playerId!)!;
    const offerers = townResidentsByCash(core, coreAPI(core)).filter(
      (row) =>
        row.id !== playerId &&
        row.alive &&
        row.placeId === player.placeId &&
        row.liquidMinor > 0,
    );
    // The bill the offer is on: a real one the town's body has before it.
    const policy = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: seat.holder!.personId!,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    let crimeId: string | undefined;
    let offererId: string | undefined;
    for (const offerer of offerers.slice(0, 40)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: playerId!,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId: bill.id,
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
    // The player answers in the scene: handing it back moves nothing. A
    // member's own pay and bills moved their money in the day that passed, so
    // the answer is measured from what they held when they gave it.
    const heldBeforeAnswer = core.people.get(playerId!)!.liquidMinor;
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
    expect(core.people.get(playerId!)!.liquidMinor, where).toBe(
      heldBeforeAnswer,
    );
  }, 240_000);

  it("pays the offerer's money to the player only when the player takes it", () => {
    const player = core.people.get(playerId!)!;
    const offerers = townResidentsByCash(core, coreAPI(core)).filter(
      (row) =>
        row.id !== playerId &&
        row.alive &&
        row.placeId === player.placeId &&
        row.liquidMinor > 0,
    );
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
      // What the money was for and why the player took it stay on the record:
      // the subject, the offerer's own reasons and the player's take (their
      // choice beside what the engine weighs).
      expect(taken.subjectId, where).toBe(`contract:${where}`);
      expect(Object.keys(taken.reasons.offer ?? {}), where).toContain("stake");
      expect(taken.reasons.take?.picked, where).toBe(1);
      expect(Object.keys(taken.reasons.take ?? {}), where).toEqual(
        expect.arrayContaining(["need", "pressure", "tie", "temperament"]),
      );
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
