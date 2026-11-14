/**
 * The player asks colleagues to sign on to a bill they drafted (brief V,
 * stage 2). Drafting writes one ask per colleague the player knows
 * (legislature.ts askToSignOn); the director stages each as the player's own
 * ask; the colleague answers from where they stand on the bill and what a
 * favor to the player is worth to them, a no says the reason the record
 * holds, and a yes puts their name on the bill, which the committee chair
 * weighs in deciding to hear it (chairHears). Pinned to two drawn places and
 * their world seeds: Ciales, Puerto Rico and White Island Shores,
 * Massachusetts (drawn with `drawPlace` from "bill-stages-state" draws 0 and 1).
 */
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  billOf,
  chairHears,
  declinedAsks,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

const PLACES = [
  {
    name: "Ciales, Puerto Rico",
    key: "7217773",
    seed: "e3c490e23b33ec056ae75db27ab47d4194d4f3b110e76c01364bb79113891a0c",
  },
  {
    name: "White Island Shores, Massachusetts",
    key: "2579390",
    seed: "60a7412dd46a80c4966b1f47f3908d4fa4dbf72a73c25c7337b79edffac0365a",
  },
] as const;
const BILLS = 3;
const TYPE = "bill-sign-on";

for (const place of PLACES)
  it(`the player asks colleagues to sign on, and a yes is a name the chair weighs (${place.name})`, () => {
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    const body = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              row.office.level === "state" &&
              row.office.kind.startsWith("legislature-") &&
              full(row.office.id).length > 2,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
    expect(body, `${where}: a state chamber`).toBeTruthy();
    const player = full(body!.id)[0]! as PersonId;
    core.playerId = player;
    director.watch(core, player);
    const billIds: string[] = [];
    for (const question of seatView(core, player).questions) {
      if (billIds.length >= BILLS) break;
      const drafted = seatAct(core, player, {
        kind: "draft",
        officeId: body!.id,
        question,
        value: 1,
      }) as { id: string };
      if (billOf(api, drafted.id)?.authority.some((row) => !row.allowed))
        continue;
      billIds.push(drafted.id);
    }
    // The bill starts with no names: each is an ask on the record.
    for (const id of billIds)
      expect(billOf(api, id)?.cosponsors ?? [], where).toEqual([]);
    const asks = [...core.durableLog.values()].filter(
      (row) => row.kind === "sign-on-asked",
    );
    expect(asks.length, `${where}: asks on the record`).toBeGreaterThan(0);
    let packet: ReturnType<typeof advancePlayerV1> | undefined =
      advancePlayerV1(core, {
        controlledPersonId: player,
        through: { date: addDays(makeIsoDate(core.date), 2), minuteOfDay: 0 },
      });
    while (packet && packet.kind !== "complete")
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: packet.offers[0]!.offerId,
            });

    const book = director.ledger.people.get(player)!;
    const entries = book.schedule.filter((row) =>
      row.bindings.some((binding) => binding.typeKey === TYPE),
    );
    expect(entries.length, `${where}: the asks are staged`).toBeGreaterThan(0);
    const firsts = new Set<string>();
    let signed = 0;
    let pleaded = 0;
    const refused: { billId: string; colleague: string }[] = [];
    // One sitting with a colleague takes in each bill asked of them that day:
    // each is its own exchange, about its own record.
    const units = entries.flatMap((entry) => {
      const moment = book.momentsById.get(entry.momentId)!;
      const binding = entry.bindings.find((row) => row.typeKey === TYPE)!;
      return [
        { entry, unit: TYPE, causeId: moment.causeId, date: moment.date },
        ...(binding.joined ?? []).map((row) => ({
          entry,
          unit: `${TYPE}|${row.causeId}`,
          causeId: row.causeId,
          date: moment.date,
        })),
      ];
    });
    for (const { entry, unit, causeId } of units) {
      const moment = { causeId };
      const cause = core.durableLog.get(causeId)!;
      const result = purposeScene(core, director, player, entry, {
        typeKey: unit,
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const talk = result.scene.talk;
      const colleague = cause.facts!.askedId!;
      expect(talk.askerId, where).toBe(colleague);
      const said: string[] = [talk.state.text];
      const walk = (node: typeof talk.tree | null) => {
        if (!node) return;
        for (const line of node.lines) said.push(line.text);
        for (const reply of node.replies) {
          said.push(reply.line.text);
          walk(reply.next);
        }
      };
      walk(talk.tree);
      // Said as it feels, never a figure.
      for (const text of said)
        expect(text, `${where}: no figure`).not.toMatch(/\d/);
      const first = talk.tree.lines[0]!;
      firsts.add(first.move);
      process.stdout.write(
        `SIGN-ON ${where} ${unit}: ${[...talk.narration, talk.state].map((line) => line.text).join(" / ")} / ${first.move}: ${first.text} / choices: ${talk.tree.replies.map((reply) => `${reply.line.move}: ${reply.line.text} -> ${reply.next?.lines.map((line) => `${line.move}: ${line.text}`).join(" ")}`).join(" | ")}\n`,
      );
      const bill = billOf(api, cause.facts!.billId!)!;
      // Every path ends where the colleague's last answer says.
      const thanked = talk.tree.replies.findIndex(
        (reply) => reply.line.move === "thank",
      );
      const plea = talk.tree.replies.findIndex(
        (reply) => reply.line.move === "plea",
      );
      const press = talk.tree.replies.findIndex(
        (reply) => reply.line.move === "press",
      );
      // A yes is thanked; the first not-yet is pleaded, the next pressed.
      const pick =
        thanked >= 0
          ? thanked
          : plea >= 0 && (pleaded === 0 || press < 0)
            ? plea
            : press >= 0
              ? press
              : 0;
      if (pick === plea) pleaded += 1;
      const last =
        talk.tree.replies[pick]!.next?.lines.at(-1)?.move ?? first.move;
      const replyId = replyInScene(core, director, player, entry, [pick], {
        typeKey: unit,
      });
      expect(replyId, `${where}: the reply is recorded`).toBeTruthy();
      const after = billOf(api, bill.id)!;
      if (["agree", "relent", "accept"].includes(last)) {
        expect(after.cosponsors, where).toContain(colleague);
        signed += 1;
      } else if (last === "refuse") {
        refused.push({ billId: bill.id, colleague });
        expect(after.cosponsors ?? [], where).not.toContain(colleague);
        expect(
          declinedAsks(api, player, colleague, bill.bodyOfficeId, "sign-on")
            .length,
          `${where}: the no is kept with its reason`,
        ).toBeGreaterThan(0);
      } else expect(after.cosponsors ?? [], where).not.toContain(colleague);
    }
    process.stdout.write(
      `SIGN-ON ${where}: first answers ${[...firsts].join(", ")}; signed ${signed}; refused ${refused.length}\n`,
    );
    // Asked again on the same question after a no, the colleague knows it:
    // the record of the no is a fact of the new ask.
    for (const { billId, colleague } of refused.slice(0, 1)) {
      const question = billOf(api, billId)!.provisions[0]!.question!;
      const again = seatAct(core, player, {
        kind: "draft",
        officeId: body!.id,
        question,
        value: 1,
      }) as { id: string };
      const id = `sign-on:${again.id}:${colleague}`;
      expect(core.durableLog.get(id)?.kind, `${where}: asked again`).toBe(
        "sign-on-asked",
      );
      packet = advancePlayerV1(core, {
        controlledPersonId: player,
        through: { date: addDays(makeIsoDate(core.date), 2), minuteOfDay: 0 },
      });
      while (packet && packet.kind !== "complete")
        packet =
          packet.kind === "stop"
            ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
            : resumePlayerV1(core, {
                kind: "choice",
                pauseId: packet.pauseId,
                offerId: packet.offers[0]!.offerId,
              });
      const entry = book.schedule.find(
        (row) =>
          book.momentsById.get(row.momentId)?.causeId === id ||
          row.bindings.some((binding) =>
            binding.joined?.some((joined) => joined.causeId === id),
          ),
      );
      expect(entry, `${where}: the second ask is staged`).toBeTruthy();
      const unit =
        book.momentsById.get(entry!.momentId)?.causeId === id
          ? TYPE
          : `${TYPE}|${id}`;
      const result = purposeScene(core, director, player, entry!, {
        typeKey: unit,
      });
      expect(result?.kind, where).toBe("composed");
      if (result?.kind === "composed")
        expect(
          result.scene.facts.some((row) => row.key === "asked-before"),
          `${where}: the earlier no is known`,
        ).toBe(true);
    }
    // The chair reads the names: what they weigh is on the decision.
    for (const id of billIds) {
      const bill = billOf(api, id)!;
      if (!bill.cosponsors?.length) continue;
      const chamber = bill.bodyOfficeId;
      const read = chairHears(api, bill, chamber);
      process.stdout.write(
        `SIGN-ON ${where} chair on ${bill.number}: names ${bill.cosponsors.join(",")} pull ${read.cosponsorPull.toFixed(3)} heard ${read.heard}, without the names ${read.chairPosition.total + read.hearingTrait >= 0}\n`,
      );
      // A name the chair is close to weighs for a hearing, never against.
      expect(read.cosponsorPull, where).toBeGreaterThanOrEqual(0);
    }
  }, 240_000);
