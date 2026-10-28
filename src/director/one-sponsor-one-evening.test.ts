/**
 * One sponsor asking the player about several bills on one evening (pool item
 * scene-vote-asks-one-sponsor-one-evening). The evening before a floor day,
 * a sponsor whose bills would fail asks the player about each (one
 * `vote-ahead` record a bill). The day's first ask is the sitting and takes
 * the others in; played as the story screen plays it (`storyScene`, then
 * `storyReply` until no new exchange comes), the player answers about each
 * bill in turn, each answer a reply on that bill's own record, and each
 * bill's roll call reads the answer given about it. Played in the bench world
 * in places drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins
 * one), the player a member of their state's legislature.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { storyReply, storyScene } from "../bench/story";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  memberKey,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on an evening with two asks by one sponsor. */
const DRAWS = 6;
/** Days played in each place at most, one at a time so the evening is caught. */
const MOST_DAYS = 150;
/** Exchanges played in one stop at most. */
const MOST_TURNS = 12;

it(`a sponsor's asks about several bills on one evening play in one stop, each answered on its own bill (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "one-sponsor-one-evening");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
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
    const bodies = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              row.office.level === "state" && full(row.office.id).length > 1,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ];
    const body =
      bodies.find((o) => o.id.endsWith("-lower")) ?? bodies[0] ?? undefined;
    if (!body) {
      tried.push(`${where}: no state chamber with two full-person members`);
      continue;
    }
    const seated = full(body.id);
    core.playerId = seated[0]! as PersonId;
    const player = core.playerId;
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("one-evening-test", ["vote-ahead"], (_, e) => {
      if (e.facts?.askedId === player) asks.push(e);
    });
    for (let day = 1; day <= MOST_DAYS; day += 1) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      // An evening's asks by one sponsor about two bills or more.
      const evening = new Map<string, CoreEventInput[]>();
      for (const ask of asks.filter((e) => e.date === core.date))
        evening.set(String(ask.facts!.askerId), [
          ...(evening.get(String(ask.facts!.askerId)) ?? []),
          ask,
        ]);
      const [sponsorId, list] =
        [...evening].find(([, rows]) => rows.length > 1) ?? [];
      if (!sponsorId || !list) continue;
      const book = director.ledger.people.get(player)!;
      const entry = book.schedule.find(
        (row) =>
          row.outcome !== "journal-line" &&
          list.some((ask) => row.momentId.includes(ask.id)),
      );
      expect(
        entry,
        `${where}: ${core.date}: no stop for the asks`,
      ).toBeTruthy();
      // Played as the story screen plays it: each exchange, then the next.
      const played: { unit: string; causeId: string; replyId: string }[] = [];
      for (let turn = 0; turn < MOST_TURNS; turn += 1) {
        const shown = storyScene(
          core,
          director,
          player,
          entry!.momentId,
          20 * 60,
        );
        const unit = shown.talk?.typeKey;
        if (!unit || played.some((row) => row.unit === unit)) break;
        const agree = shown.talk!.tree.replies.findIndex(
          (reply: { line: { move: string } }) => reply.line.move === "agree",
        );
        const kept = storyReply(
          core,
          director,
          player,
          entry!.momentId,
          [Math.max(0, agree)],
          { typeKey: unit },
        );
        const record = core.durableLog.get(kept.recordId)!;
        played.push({
          unit,
          causeId: String(record.facts?.causeId),
          replyId: kept.recordId,
        });
      }
      // Each bill asked about has its own exchange, cited to its own record.
      const askIds = [...new Set(list.map((ask) => ask.id))].sort();
      expect(
        played.map((row) => row.causeId).sort(),
        `${where}: ${core.date}: ${played.map((row) => row.unit).join(", ")}`,
      ).toEqual(askIds);
      // Each bill's roll call reads the answer given about it.
      const rolls: string[] = [];
      let reached = 0;
      for (const ask of list) {
        const floor = String(ask.facts!.floorDate);
        if (core.date < floor) advanceCore(core, floor);
        const billId = String(ask.facts!.billId);
        const vote = votesOn(api, billId).find(
          (v) =>
            v.memberId === player && !(v as { override?: boolean }).override,
        );
        const reply = played.find((row) => row.causeId === ask.id)!;
        if (!vote) {
          rolls.push(
            `${billOf(api, billId).number}: no roll call (${billOf(api, billId).status})`,
          );
          continue;
        }
        const move = String(core.durableLog.get(reply.replyId)!.facts?.move);
        if (move === "agree") {
          expect(vote.vote, `${where}: ${billId}`).toBe("yes");
          expect(vote.position.replyIds, `${where}: ${billId}`).toContain(
            reply.replyId,
          );
        }
        reached += 1;
        rolls.push(
          `${billOf(api, billId).number}: answered ${move} (${reply.replyId}), at the roll ${vote.vote}`,
        );
      }
      // Every bill ended before its roll call: the next such evening is taken.
      if (!reached) {
        tried.push(`${where}: ${core.date}: ${rolls.join("; ")}`);
        continue;
      }
      process.stdout.write(
        `ONE EVENING ${where} (GOLDEN_PATH_SEED=${seed})\n  ${core.date}: ${sponsorId} asks the player ${player} about ${askIds.length} bills, in one stop ${entry!.momentId}\n  played ${played.map((row) => row.unit).join(" then ")}\n  ${rolls.join("\n  ")}\n`,
      );
      return;
    }
    tried.push(
      `${where}: no evening with two asks by one sponsor in ${MOST_DAYS} days`,
    );
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
