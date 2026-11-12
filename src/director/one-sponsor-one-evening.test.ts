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
 * one), the player a member of their state's legislature. The case is built,
 * not waited for (pool item words-one-sponsor-one-evening-setup): a sponsor
 * puts two bills on one floor day, each reported by its committee, and the
 * engine's own evening-before count asks the player about each.
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
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import {
  billOf,
  castMemberVote,
  draftBill,
  holdCommittee,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on an evening with two asks by one sponsor. */
const DRAWS = 4;
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
    // The case is built from the legislature's own records, not waited for: a
    // sponsor (not the player) puts two bills on one floor day that the
    // engine's own evening-before count finds one vote short, so it asks the
    // player about each. A committee that holds a bill takes
    // it off the agenda, so such a place is passed over by name.
    const sponsor = seated.find((id) => id !== player)!;
    const policies = billCatalog(api, "state")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed);
    if (policies.length < 2) {
      tried.push(`${where}: fewer than two policies the state may enact`);
      continue;
    }
    const drafted = policies.slice(0, 2).map((policy) =>
      draftBill(api, {
        bodyOfficeId: body.id,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      }),
    );
    let floorDay: string;
    try {
      floorDay = scheduleVote(api, drafted[0]!.id);
      scheduleVote(api, drafted[1]!.id);
    } catch (error) {
      tried.push(`${where}: no sitting to put the bills on: ${String(error)}`);
      continue;
    }
    // Each bill goes before its committee on a day of its own, as a scheduled
    // bill does; one the committee holds leaves the agenda, so the place is
    // passed over. Only after both are reported do the members choose.
    const reported = drafted.map((bill) => {
      const record = holdCommittee(api, bill.id);
      return !record || record.reported;
    });
    if (
      reported.some((ok) => !ok) ||
      drafted.some((bill) => billOf(api, bill.id).status !== "drafted")
    ) {
      tried.push(`${where}: a committee held one of the two bills`);
      continue;
    }
    // The stand-in (test files only): the members other than the sponsor and
    // the player have chosen so the sponsor's side is one short, and the
    // player's yes alone would carry it: the engine's own count the evening
    // before then asks the player about each bill.
    const others = seated.filter((id) => id !== player && id !== sponsor);
    const voters = others.length % 2 === 0 ? others.slice(1) : others;
    const yes = (voters.length - 1) / 2;
    for (const bill of drafted) {
      castMemberVote(api, bill.id, sponsor, "yes");
      if (others.length % 2 === 0)
        castMemberVote(api, bill.id, others[0]!, "abstain");
      voters.forEach((id, i) =>
        castMemberVote(api, bill.id, id, i < yes ? "yes" : "no"),
      );
    }
    for (let day = 1; day <= MOST_DAYS && core.date < floorDay; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      // An evening's asks by one sponsor about two bills or more.
      const evening = new Map<string, CoreEventInput[]>();
      for (const ask of asks.filter(
        (e) =>
          e.date === core.date &&
          drafted.some((bill) => bill.id === e.facts?.billId),
      ))
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
    const committeeRows = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees")
        .rows() as unknown as { id: string; reported?: boolean }[]
    ).filter((row) => drafted.some((bill) => row.id.includes(bill.id)));
    tried.push(
      `${where}: no evening with two asks by one sponsor before the floor day ${floorDay} (on ${core.date}: ${drafted.map((bill) => `${bill.number} ${billOf(api, bill.id).status}`).join(", ")}; committees ${committeeRows.map((row) => `${row.id.slice(-30)} reported=${String(row.reported)}`).join(", ") || "none"}; asks ${asks.length})`,
    );
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
