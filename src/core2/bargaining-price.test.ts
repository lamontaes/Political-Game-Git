/**
 * Bargaining over a bill (brief O, Nov 14 2026; owner's card 06:43Z: a
 * colleague asks in return only what the game can do now). Played in the
 * bench world at Brewton, Alabama, drawn as drawPlace("bargain-e",
 * "bargaining-report"): the player sits on the town council and drafts two
 * budget cuts every other member stands against (the council can decide
 * almost none of the platform questions there), presses Yes on both, and the
 * world runs to the evening before the floor vote. Then:
 * - a colleague with their own bill waiting has a price on record
 *   (`askPrice`: the player's vote on it), and taking it up in the ask's
 *   reply makes the deal (back-their-item, naming their bill) and an
 *   obligation the roll call and the campaigns read;
 * - a colleague a favor carries only halfway (`absenceCarries`) who agrees
 *   to stay out of the room is recorded absent at the roll;
 * - a yes given as a favor is a debt in `obligations`;
 * - the bill-carry scene's ending answers a carry ask held for the player.
 * The replies are the scene's own record (`scene.reply`, as `replyInScene`
 * writes it), applied where the bank's lines for the new branches wait on
 * the Words lead's ruling (bargaining/lines-to-add.md).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  LEGISLATURE_MODULE_ID,
  absenceCarries,
  askPrice,
  askToCarry,
  billOf,
  castMemberVote,
  carryAsksAwaiting,
  memberKey,
  memberPosition,
  members,
  obligationsOwedTo,
  votesOn,
} from "./modules/legislature";
import { applyCoreEvent, coreAPI } from "./state";
import type { CoreEventInput, PersonId } from "./types";

const SEED = "bargain-e";
const BODY = "office:gus2025:122535:council";

it(`a colleague's price, staying out and a favor are paid by real acts at Brewton, AL (drawPlace("${SEED}"))`, () => {
  setBookkeeping(false);
  const place = drawPlace(SEED, "bargaining-report");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  expect(place.key, where).toBe("0109208");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const seated = members(api, BODY)
    .map(memberKey)
    .filter((id) => core.people.get(id as PersonId)?.alive)
    .sort();
  core.playerId = seated[0]! as PersonId;
  const player = core.playerId;
  // Two budget cuts every other member stands against.
  const items = seatView(core, player)
    .bodies.filter((b) => b.officeId === BODY)
    .flatMap((b) => b.menus.flatMap((m) => m.items));
  const cut = (line: string) => {
    const item = items.find((row) => row.line === line)!;
    const bill = seatAct(core, player, {
      kind: "draft",
      officeId: BODY,
      line,
      value: Math.round(Number(item.inForce) * 0.6),
    });
    castMemberVote(api, bill.id, player, "yes");
    return bill.id;
  };
  const roads = cut("highways");
  const police = cut("police");
  const asks: CoreEventInput[] = [];
  api.subscribeEvents("bargaining-price-test", ["vote-ahead"], (_, e) => {
    if (e.facts?.askerId === player) asks.push(e);
  });
  const start = makeIsoDate(gameStartDate());
  for (let day = 1; day <= 40 && asks.length === 0; day += 1)
    advanceCore(core, addDays(start, day));
  expect(asks.length, `${where}: no ask by the player`).toBeGreaterThan(0);
  const askOf = (billId: string, memberId?: string) =>
    asks.find(
      (e) =>
        e.facts?.billId === billId &&
        (!memberId || e.personIds[0] === memberId),
    );
  const reply = (
    ask: CoreEventInput,
    asked: string,
    move: string,
    ending?: { id: string; keeps: string },
  ) =>
    applyCoreEvent(core, {
      id: `scene-reply:test:${ask.id}:${asked}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [ask.personIds[0]!, player],
      placeId: core.people.get(player)!.placeId,
      facts: {
        typeKey: "vote-sought",
        causeId: ask.id,
        move,
        asked,
        ...(ending ? { ending: ending.id, keeps: ending.keeps } : {}),
      },
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
    });

  // A price: a colleague whose own bill waits, asked on the roads cut.
  const priced = asks
    .filter((e) => e.facts?.billId === roads)
    .map((e) => ({
      e,
      price: askPrice(api, roads, String(e.personIds[0]), player),
    }))
    .find((row) => row.price?.kind === "their-bill");
  expect(
    priced,
    `${where}: no colleague with a price on the roads cut`,
  ).toBeTruthy();
  const colleague = String(priced!.e.personIds[0]);
  const before = memberPosition(api, roads, colleague).total;
  expect(before).toBeLessThanOrEqual(0);
  reply(priced!.e, "bargain", "accept", {
    id: "price-taken",
    keeps: "promise",
  });
  const deal = billOf(api, roads).deals.find((d) => d.memberId === colleague);
  expect(deal?.kind, where).toBe("back-their-item");
  expect(deal?.status).toBe("accepted");
  const owed = obligationsOwedTo(api, colleague).find(
    (o) => o.owedBy === player && o.billId === roads,
  );
  expect(owed?.itemBillId, where).toBe(
    priced!.price!.kind === "their-bill" ? priced!.price!.billId : "",
  );
  expect(memberPosition(api, roads, colleague).total).toBeGreaterThan(0);

  // Staying out: a colleague asked on the police cut whom a favor carries halfway.
  const out = asks.find(
    (e) =>
      e.facts?.billId === police &&
      absenceCarries(api, police, String(e.personIds[0]), player),
  );
  expect(
    out,
    `${where}: no colleague a favor carries halfway on the police cut`,
  ).toBeTruthy();
  {
    const out_ = out!;
    reply(out_, "request", "decline", { id: "soft-no", keeps: "none" });
    const choice = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("choices")
      .get(`${police}|${out_.personIds[0]}`) as unknown as { vote?: string };
    expect(choice?.vote, where).toBe("absent");
  }

  // A favor: another colleague on the roads cut gives a yes for the player.
  const favor = asks.find(
    (e) => e.facts?.billId === roads && String(e.personIds[0]) !== colleague,
  );
  expect(
    favor,
    `${where}: no second colleague asked on the roads cut`,
  ).toBeTruthy();
  {
    reply(favor!, "plea", "relent", { id: "vote-given", keeps: "favor-owed" });
    expect(
      obligationsOwedTo(api, String(favor!.personIds[0])).find(
        (o) => o.owedBy === player && o.billId === roads,
      )?.kind,
      where,
    ).toBe("favor");
  }

  // The roll call reads the deal, and the one who stayed out is absent.
  const floor = String(priced!.e.facts!.floorDate);
  advanceCore(core, floor);
  const roll = votesOn(api, roads).filter(
    (v) => !(v as { override?: boolean }).override,
  );
  const theirVote = roll.find((v) => v.memberId === colleague);
  expect(theirVote?.vote, where).toBe("yes");
  expect(theirVote?.position.deal).toBeGreaterThan(0);
  expect(
    votesOn(api, police).find((v) => v.memberId === out!.personIds[0])?.vote,
    where,
  ).toBe("absent");
  expect(askOf(roads)).toBeTruthy();

  // A carry ask held for the player is answered by the scene's ending.
  const asker = seated.find((id) => id !== player)!;
  const held = askToCarry(api, {
    askerId: asker,
    memberId: player,
    bodyOfficeId: BODY,
    provisions: billOf(api, roads).provisions.slice(0, 1),
  });
  expect(carryAsksAwaiting(api).some((r) => r.id === held.id)).toBe(true);
  applyCoreEvent(core, {
    id: `scene-reply:test:carry:${held.id}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [player, asker as PersonId],
    placeId: core.people.get(player)!.placeId,
    facts: {
      typeKey: "bill-carry",
      causeId: `carry-asked:${held.id}`,
      move: "agree",
      ending: "carrying",
      keeps: "promise",
    },
    source: { tag: "SOURCED", citation: "test", asOf: core.date },
  });
  expect(
    carryAsksAwaiting(api).some((r) => r.id === held.id),
    where,
  ).toBe(false);
  process.stdout.write(
    `BARGAIN ${where}: ${colleague} took ${JSON.stringify(priced!.price)} (deal ${deal?.terms}, obligation ${owed?.id}); stood ${before.toFixed(3)}, voted ${theirVote?.vote}; absent ${String(out!.personIds[0])}, favor ${String(favor!.personIds[0])}; carry ask ${held.id} answered\n`,
  );
}, 300_000);
