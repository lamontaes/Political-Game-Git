/**
 * Asking a member for their vote before the roll call can change it (pool
 * item legislature-ask-before-the-roll-moves-the-vote). The evening before a
 * floor vote in a chamber where the player sits, a sponsor whose bill would
 * fail asks the members it needs (a `vote-ahead` record naming the bill, the
 * member and the sponsor); the director stages the ask from that record; the
 * member's answer, written by the scene's own writer (`replyInScene`), is a
 * pull their position reads at the roll, and their recorded vote cites it.
 * The player sits in their state's legislature (the lower chamber where there
 * are two), or the town's largest body where the state's has no full-person
 * member. Played in the bench world in places drawn from all 56 on a seed
 * nobody chose (GOLDEN_PATH_SEED pins one), until a sponsor asks a member who
 * is not the player and the bill reaches its roll call.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  memberKey,
  memberPosition,
  members,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput } from "../core2/types";
import { billTitleOf, spokenDesignation } from "../english/bill-names";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on an ask the evening before a vote. */
const DRAWS = 6;
/** Days played in each place at most, one at a time so the evening before a vote is caught. */
const MOST_DAYS = 240;

it(`a member asked the evening before a floor vote answers in a scene, and the roll call reads the answer (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ask-before-the-roll");
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
          .filter((row) => full(row.office.id).length > 1)
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ];
    const body =
      bodies.find((o) => o.level === "state" && o.id.endsWith("-lower")) ??
      bodies.find((o) => o.level === "state") ??
      bodies
        .filter((o) => ["city", "county", "township"].includes(o.level))
        .sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) {
      tried.push(`${where}: no body with two full-person members`);
      continue;
    }
    // The player sits on the body and knows its members: each is in the
    // player's circle (whose records the world keeps) and watched, so an
    // ask to any of them is staged.
    const seated = full(body.id);
    core.playerId = seated[0]!;
    for (const id of seated) {
      core.focusPersonIds.add(id as never);
      director.watch(core, id as never);
    }
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("ask-before-the-roll-test", ["vote-ahead"], (_, e) => {
      asks.push(e);
    });
    const passedOver: string[] = [];
    const checked = new Set<string>();
    // An ask of a member who is not the player, its bill still waiting.
    const open = () =>
      asks.find(
        (e) =>
          !checked.has(e.id) &&
          e.personIds[0] !== core.playerId &&
          String(e.facts?.floorDate) > core.date &&
          billOf(api, String(e.facts?.billId)).status === "drafted",
      );
    for (let day = 1; day <= MOST_DAYS; day += 1) {
      if (core.date < addDays(makeIsoDate(gameStartDate()), day))
        advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      const ask = open();
      if (!ask) continue;
      checked.add(ask.id);
      const [memberId, sponsorId] = ask.personIds as [string, string];
      const billId = String(ask.facts!.billId);
      const bill = billOf(api, billId);
      // The record names the bill, the member and the sponsor.
      expect(ask.facts?.askedId, `${where}: ${ask.id}`).toBe(memberId);
      expect(ask.facts?.askerId, `${where}: ${ask.id}`).toBe(bill.sponsorId);
      expect(sponsorId).toBe(bill.sponsorId);
      // The director stages the ask from the record: the sponsor asks the member.
      const book = director.ledger.people.get(memberId as never)!;
      const entry = book.schedule.find((row) => row.momentId.includes(ask.id));
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "vote-asked",
      );
      expect(binding, `${where}: ${ask.id}: no vote ask staged`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "colleague")!.personIds,
      ).toEqual([sponsorId]);
      const composed = purposeScene(core, director, memberId as never, entry!);
      expect(composed?.kind, `${where}: ${ask.id}`).toBe("composed");
      if (composed?.kind !== "composed") return;
      const said = spokenDesignation(bill.number, bill.form.kind);
      const fact = composed.scene.facts.find((row) => row.key === "bill");
      expect(fact?.text, `${where}: ${ask.id}`).toBe(said);
      expect(fact?.recordIds).toContain(ask.id);
      expect(composed.scene.cause.id).toBe(ask.id);
      // The day words follow the record's floor date: "tomorrow" only the day
      // before the vote and "today" only on it (the governing walk, Oct 29:
      // "tomorrow" was said on the vote day).
      const floor = String(ask.facts!.floorDate);
      const marked = new Set(composed.scene.facts.map((row) => row.key));
      expect(marked.has("vote-tomorrow"), `${where}: ${ask.id}`).toBe(
        addDays(makeIsoDate(core.date), 1) === floor,
      );
      expect(marked.has("vote-today"), `${where}: ${ask.id}`).toBe(
        floor === core.date,
      );
      const spoken = [
        ...composed.scene.talk.narration,
        ...composed.scene.talk.lines,
      ].map((line) => line.text);
      if (!marked.has("vote-tomorrow"))
        expect(spoken.join(" "), `${where}: ${ask.id}`).not.toMatch(
          /\b(?:tomorrow|evening before)\b/i,
        );
      // Where the member stands before they answer, and the answer: they agree.
      const before = memberPosition(api, billId, memberId);
      const path = composed.scene.talk.tree.replies.findIndex(
        (reply) => reply.line.move === "agree",
      );
      expect(path, `${where}: no agree reply offered`).toBeGreaterThanOrEqual(
        0,
      );
      const replyId = replyInScene(core, director, memberId as never, entry!, [
        path,
      ]);
      expect(replyId, `${where}: ${ask.id}`).toBeTruthy();
      const after = memberPosition(api, billId, memberId);
      expect(after.replyIds, `${where}: ${memberId}`).toContain(replyId);
      expect(after.reply!, `${where}: ${memberId}`).toBeGreaterThan(0);
      // The roll call: the member's recorded vote reads the answer in its
      // reasons, and it changes where the answer outweighs where they stood.
      advanceCore(core, String(ask.facts!.floorDate));
      const vote = votesOn(api, billId).find(
        (v) =>
          v.memberId === memberId &&
          !(v as { override?: boolean }).override &&
          (v as { chamber?: string }).chamber === ask.facts!.chamber,
      );
      if (!vote) {
        // The bill ended before its roll call (blocked, or its text found
        // wanting): no vote to read. Named, and the next ask taken.
        passedOver.push(
          `${ask.id}: ${bill.number} ${billOf(api, billId).status} with no roll call`,
        );
        continue;
      }
      expect(vote.position.replyIds, `${where}: ${memberId}`).toContain(
        replyId,
      );
      // Asked because they stood against the bill or undecided that evening;
      // with the answer counted they vote as their position now says.
      expect(
        before.total,
        `${where}: ${memberId} was asked though already for the bill`,
      ).toBeLessThanOrEqual(0);
      if (vote.position.total > 0)
        expect(["yes", "absent"], `${where}: ${memberId}`).toContain(vote.vote);
      // The member's journal names the bill as the ask did, by its number,
      // with its title, so the two read as one bill.
      const told = ["yes", "no"].includes(vote.vote)
        ? composeJournal(core, director, memberId as never)
            .flatMap((chapter) => chapter.lines)
            .find((line) =>
              line.sourceRecordIds.includes(
                `office.voted:${billId}:${memberId}`,
              ),
            )
        : undefined;
      if (["yes", "no"].includes(vote.vote)) {
        expect(told?.text, `${where}: ${memberId}'s journal`).toContain(said);
        expect(told!.text).toContain(billTitleOf(bill)!.title);
      }
      process.stdout.write(
        `JOURNAL ${where}: the ask said "${said}"; the journal says "${told?.text ?? "(no yes or no vote)"}"\n`,
      );
      process.stdout.write(
        `ASK BEFORE THE ROLL ${where} (GOLDEN_PATH_SEED=${seed})${passedOver.length ? `\n  passed over: ${passedOver.join("; ")}` : ""}\n  player ${core.playerId} in ${body.id}\n  ${ask.id} (${ask.date}): ${sponsorId} asks ${memberId} about ${bill.number}, vote on ${ask.facts!.floorDate}; asked ${ask.facts!.asked}\n  ${memberId} stood at ${before.total.toFixed(3)}; answered ${replyId}; at the roll ${vote.vote} with ${vote.position.total.toFixed(3)} (reply ${vote.position.reply!.toFixed(3)}); bill ${billOf(api, billId).status}\n`,
      );
      return;
    }
    tried.push(
      `${where}: ${asks.length} asks in ${MOST_DAYS} days, none of a member but the player that reached a roll call${passedOver.length ? ` (${passedOver.join("; ")})` : ""}`,
    );
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
