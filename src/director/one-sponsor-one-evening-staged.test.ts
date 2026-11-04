/**
 * One sponsor asking the player about two bills on one evening, staged
 * through the legislature's own records (Words, Nov 2, option three, for
 * legislature-ask-skips-bills-the-committee-will-hold). A played year rarely
 * holds the evening (src/director/one-sponsor-one-evening.test.ts keeps that
 * case for when it does), so here the sponsor files two real bills, the
 * engine schedules both for the same sitting, and the other members' choices
 * are set so the count stands even with the player undecided: the stand-in
 * (ruling 4, test files only). The engine itself writes the asks the evening
 * before (askBeforeTheRoll); no record or line is written by hand. The stop
 * is played as the story screen plays it, each bill answered on its own
 * record, and each bill's roll call reads the answer given about it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { storyReply, storyScene } from "../bench/story";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  castMemberVote,
  draftBill,
  memberKey,
  members,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;
const MOST_TURNS = 12;

it(`a sponsor's two asks on one evening, written by the engine, play in one stop and reach their roll calls (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(
      `${seed}:${draw}`,
      "one-sponsor-one-evening-staged",
    );
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The town's own lawmaking body, three members or more, every seat held.
    const seat = townSeats(api).find(
      (row) =>
        row.office.level === "city" &&
        bodyOf(api, row.office.id) &&
        members(api, row.office.id).length >= 3 &&
        members(api, row.office.id).every((term) => term.personId),
    );
    if (!seat) {
      tried.push(`${where}: no town body of three held seats`);
      continue;
    }
    const body = seat.office.id;
    const ids = members(api, body).map(memberKey).sort();
    for (const id of ids) fillInPerson(core, id);
    const [player, sponsor, ...others] = ids as [string, string, ...string[]];
    core.playerId = player as PersonId;
    for (const id of ids) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const policies = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed);
    if (policies.length < 2) {
      tried.push(`${where}: fewer than two policies the town may enact`);
      continue;
    }
    const bills = policies.slice(0, 2).map((policy) =>
      draftBill(api, {
        bodyOfficeId: body,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      }),
    );
    let sitting: string | null = null;
    try {
      const dates = bills.map((bill) => scheduleVote(api, bill.id));
      sitting = dates[0] === dates[1] ? dates[0]! : null;
    } catch (error) {
      tried.push(`${where}: ${String(error)}`);
      continue;
    }
    if (!sitting || sitting <= addDays(makeIsoDate(core.date), 1)) {
      tried.push(
        `${where}: the two bills do not share a sitting after tomorrow`,
      );
      continue;
    }
    // The stand-in: the others choose so the count stands even, the sponsor
    // for, and the player undecided.
    const voters = [sponsor, ...others];
    for (const bill of bills)
      voters.forEach((id, i) =>
        castMemberVote(
          api,
          bill.id,
          id,
          voters.length % 2 === 1 && i === voters.length - 1
            ? "abstain"
            : i % 2 === 0
              ? "yes"
              : "no",
        ),
      );
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("one-evening-staged", ["vote-ahead"], (_, e) => {
      if (e.facts?.askedId === player) asks.push(e);
    });
    const eve = addDays(makeIsoDate(sitting), -1);
    advanceCore(core, eve);
    const list = asks.filter(
      (e) => e.date === eve && e.facts?.askerId === sponsor,
    );
    expect(
      list.map((e) => String(e.facts?.billId)).sort(),
      `${where}: the sponsor's asks the evening of ${eve}`,
    ).toEqual(bills.map((b) => b.id).sort());
    const book = director.ledger.people.get(player as PersonId)!;
    const entry = book.schedule.find(
      (row) =>
        row.outcome !== "journal-line" &&
        list.some((ask) => row.momentId.includes(ask.id)),
    );
    expect(entry, `${where}: no stop for the asks on ${eve}`).toBeTruthy();
    const played: { unit: string; causeId: string; replyId: string }[] = [];
    for (let turn = 0; turn < MOST_TURNS; turn += 1) {
      const shown = storyScene(
        core,
        director,
        player as PersonId,
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
        player as PersonId,
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
    // One stop, each bill answered on its own record.
    expect(
      played.map((row) => row.causeId).sort(),
      `${where}: ${played.map((row) => row.unit).join(", ")}`,
    ).toEqual(list.map((ask) => ask.id).sort());
    // Each bill's roll call reads the answer given about it.
    advanceCore(core, sitting);
    const rolls: string[] = [];
    for (const ask of list) {
      const billId = String(ask.facts!.billId);
      const vote = votesOn(api, billId).find(
        (v) => v.memberId === player && !(v as { override?: boolean }).override,
      );
      expect(
        vote,
        `${where}: ${billId} has no roll call for the player`,
      ).toBeTruthy();
      const reply = played.find((row) => row.causeId === ask.id)!;
      const move = String(core.durableLog.get(reply.replyId)!.facts?.move);
      if (move === "agree") {
        expect(vote!.vote, `${where}: ${billId}`).toBe("yes");
        expect(vote!.position.replyIds, `${where}: ${billId}`).toContain(
          reply.replyId,
        );
      }
      rolls.push(
        `${billId}: answered ${move} (${reply.replyId}), at the roll ${vote!.vote}`,
      );
    }
    process.stdout.write(
      `ONE EVENING STAGED ${where}\n  ${eve}: ${sponsor} asks ${player} about ${list.length} bills in one stop ${entry!.momentId}\n  played ${played.map((row) => row.unit).join(" then ")}\n  ${rolls.join("\n  ")}${tried.length ? `\n  passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 1_800_000);
