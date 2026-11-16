/**
 * The player asks the chair of the committee that held their bill for a hearing
 * (pool item gov-player-asks-chair-for-hearing). The chair answers from the
 * committee's own record of why it held the bill (`chairReasons`: their position,
 * their temper and the cosponsors' pull) and what a favor to the player is worth to
 * them; the answer reopens the hearing or leaves the hold. Played at Texas (place
 * 4846968, world seed 8647-mason), the player a state senator who drafts one bill and
 * plays the days by the game's own presses; the seats and questions were found by a
 * script outside the test (every seat draws one question and the holds' chair leans and
 * favor are listed after Mar 20).
 */
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { makeIsoDate } from "../core2/kernel/dates";
import {
  billOf,
  committeeRecords,
  favorWorth,
  memberKey,
  members,
  obligationsOwedBetween,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advanceCore } from "../core2/life";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI, fillInPerson } from "../core2/state";
import reasonTermsFile from "./data/bargain-reasons.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";

const play = (
  core: Parameters<typeof advancePlayerV1>[0],
  player: string,
  through: string,
) => {
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: player as never,
      through: { date: makeIsoDate(through), minuteOfDay: 0 },
    },
  );
  for (let n = 0; packet && packet.kind !== "complete" && n < 600; n += 1)
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
};

/** The player in seat `seatNo` drafts the body's `question`th question and plays to Mar 20. */
const world = (seatNo: number, question: number, placeKey = "4846968") => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      members(api, r.office.id).length >= 3 &&
      members(api, r.office.id).every((t) => t.personId),
  )!;
  const ids = members(api, seat.office.id).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  const player = ids[seatNo]!;
  core.playerId = player as never;
  for (const id of ids) director.watch(core, id as never);
  const bill = seatAct(core, player, {
    kind: "draft",
    officeId: seat.office.id,
    question: seatView(core, player).questions[question]!,
  }) as unknown as { id: string; number: string };
  play(core, player, "2025-01-23");
  play(core, player, "2025-03-20");
  const hold = [...core.durableLog.values()].find(
    (row) =>
      row.kind === "bill-held-in-committee" && row.facts?.billId === bill.id,
  );
  expect(hold, "the chair held the bill").toBeTruthy();
  const entry = director.ledger.people
    .get(player as never)!
    .schedule.find((row) => row.momentId.includes(hold!.id))!;
  const composed = purposeScene(core, director, player as never, entry, {
    typeKey: "hold-chair-sought",
  });
  expect(composed?.kind).toBe("composed");
  if (composed?.kind !== "composed") throw new Error("not composed");
  const record = committeeRecords(api, bill.id).find((c) => !c.heard)!;
  const r = record.chairReasons;
  return {
    core,
    director,
    api,
    player,
    bill,
    hold: hold!,
    entry,
    scene: composed.scene,
    chair: String(record.chairId),
    lean: r.position.total + r.hearingTrait + (r.cosponsorPull ?? 0),
    record,
  };
};

it("a chair whose stand is against it but whom a favor carries stalls, then hears the bill after a plea, and the hearing is a debt (seat 007)", () => {
  const w = world(6, 7);
  const { scene, chair, api, player, bill, core } = w;
  expect(w.entry.outcome, "met as a scene, not a journal line").toBe(
    "scene-now",
  );
  expect(scene.playerAsks).toBe(true);
  expect(scene.talk.state.speakerId).toBe(player);
  const favor = favorWorth(api, chair, player);
  expect(w.lean).toBeLessThan(0);
  expect(w.lean + favor).toBeGreaterThan(0);
  const first = scene.talk.tree.lines[0]!;
  // The setup is the sponsor's walk to the chair, not the chair coming to the sponsor.
  expect(scene.talk.narration[0]!.text).not.toMatch(/doorway|read the agenda/);
  expect(scene.talk.narration[0]!.text).toContain(
    core.people.get(chair as never)!.givenName,
  );
  expect(first.speakerId).toBe(chair);
  expect(first.move).toBe("stall");
  const plea = scene.talk.tree.replies.findIndex((r) => r.line.move === "plea");
  const relent = scene.talk.tree.replies[plea]!.next?.lines.find(
    (l) => l.speakerId === chair,
  );
  expect(relent?.move).toBe("relent");
  // The chair says the debt when the record is written.
  expect([
    "Alright. I'll put it on the calendar. You owe me for this.",
    "It goes on the calendar. I'll remember that I did this for you.",
  ]).toContain(relent?.text);
  const press = scene.talk.tree.replies.find((r) => r.line.move === "press")!;
  expect(press.line.text).toBe('A yes or a no. Not "later."');
  const accept = scene.talk.tree.replies.find((r) => r.line.move === "accept");
  expect(accept?.line.text).toBe("Alright. I had to ask.");
  expect(billOf(api, bill.id).status).toBe("failed");
  const replyId = replyInScene(
    w.core,
    w.director,
    player as never,
    w.entry,
    [plea],
    {
      typeKey: "hold-chair-sought",
    },
  )!;
  expect(replyId).toBeTruthy();
  // The hearing is back on the calendar and the favor is owed to the chair.
  const heard = committeeRecords(api, bill.id).find(
    (c) => c.chamber === w.record.chamber,
  )!;
  expect(heard.heard, "the committee heard it").toBe(true);
  expect(heard.chairReasons.agreedReplyId).toBe(replyId);
  expect(
    obligationsOwedBetween(api, player, chair).map((o) => [
      o.billId,
      o.replyId,
      o.settled,
    ]),
  ).toEqual([[bill.id, replyId, false]]);
  expect(favorWorth(api, chair, player)).toBe(0);
}, 70_000);

it("a chair the favor cannot carry says no, and the no gives the reason the committee record holds (seat 016)", () => {
  const w = world(15, 3);
  const { scene, chair, api, player, bill } = w;
  expect(w.entry.outcome).toBe("scene-now");
  const favor = favorWorth(api, chair, player);
  expect(w.lean + favor).toBeLessThan(0);
  const first = scene.talk.tree.lines[0]!;
  expect(first.speakerId).toBe(chair);
  expect(first.move).toBe("refuse");
  // Asking again changes nothing: no plea is answered with a yes.
  for (const reply of scene.talk.tree.replies)
    expect(
      ["agree", "relent"],
      `${reply.line.move} was answered with a yes`,
    ).not.toContain(reply.next?.lines.find((l) => l.speakerId === chair)?.move);
  // The reason the chair gives is the strongest term against the bill in the
  // committee's own record (each term of their position, the cosponsors' pull on the
  // sponsor's and their temper on the trait), said in the bargaining reasons' words.
  const r = w.record.chairReasons;
  const terms: Record<string, number> = {
    ...(r.position as unknown as Record<string, number>),
  };
  terms.sponsor = (Number(terms.sponsor) || 0) + (r.cosponsorPull ?? 0);
  terms.trait = (Number(terms.trait) || 0) + r.hearingTrait;
  const words = reasonTermsFile.reasonTerms as Record<string, string>;
  const strongest = Object.keys(words)
    .map((term) => [term, Number(terms[term]) || 0] as const)
    .filter(([, value]) => value < 0)
    .sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]))[0]!;
  expect(
    scene.facts.filter((f) => f.key.startsWith("reason-")).map((f) => f.key),
  ).toEqual([`reason-${words[strongest[0]]}`]);
  // The chair says that reason, in the words the Words lead wrote for it, every time.
  const said: Record<string, string> = {
    "own-view": "I think it's a bad bill. I won't give it a hearing.",
    district: "People in my district don't want it. I won't put it up.",
    sponsor:
      "I'll be plain. I don't trust you with this, so it gets no hearing.",
    group: "People I count on are against it. I'm not putting it up.",
    party: "My party doesn't want it heard. I'm going with them.",
    "next-election":
      "I have a race coming. I can't have this in my committee before it.",
    "last-vote":
      "I voted against this the last time it came up. I'm not hearing it again.",
    temper: "I don't like being pushed on this. It stays where it is.",
  };
  expect(first.text).toBe(said[words[strongest[0]]!]);
  // Once the reason is said, a plea or a press gets a short hold and the talk ends;
  // the chair never says the reason a second time, and "a yes or a no, not later"
  // (an answer to a stall) is not offered after a flat no.
  const held = [
    "I've given you my answer.",
    "You have my answer. It hasn't changed.",
  ];
  for (const reply of scene.talk.tree.replies) {
    const answer = reply.next?.lines.find((l) => l.speakerId === chair);
    if (["plea", "press"].includes(reply.line.move)) {
      expect(
        held,
        `${reply.line.move} was answered with the reason again`,
      ).toContain(answer?.text);
      expect(reply.next?.replies ?? [], "the talk ends on the hold").toEqual(
        [],
      );
    }
    if (reply.line.move === "press")
      expect(reply.line.text).not.toBe('A yes or a no. Not "later."');
    if (reply.line.move === "accept")
      expect(reply.line.text).toBe("Alright. I had to ask.");
  }
  expect(billOf(api, bill.id).status).toBe("failed");
}, 70_000);

it("a hold in the bill's second chamber is not offered as an ask: a yes there reopens nothing (sponsor upper 004)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
  });
  const sponsor = "official:term:seat:US-TX:upper:004:0:2025-01-20";
  director.watch(core, sponsor as never);
  advanceCore(core, makeIsoDate("2025-02-20"));
  const hold = [...core.durableLog.values()].find(
    (row) =>
      row.kind === "bill-held-in-committee" &&
      row.facts?.sponsorId === sponsor &&
      row.facts?.level === "state",
  );
  expect(hold, "a state hold of the sponsor's bill").toBeTruthy();
  expect(hold!.facts?.firstChamber).toBe("no");
  const entry = director.ledger.people
    .get(sponsor as never)!
    .schedule.find((row) => row.momentId.includes(hold!.id));
  expect(
    entry?.bindings.map((b) => b.typeKey) ?? [],
    "the sponsor is not offered an ask the chair's yes cannot act on",
  ).not.toContain("hold-chair-sought");
}, 70_000);

const REASON_LINES: Record<string, string> = {
  district: "People in my district don't want it. I won't put it up.",
  "last-vote":
    "I voted against this the last time it came up. I'm not hearing it again.",
};

// Each reason the chair gives, said by the player's own presses. Texas and (for the last vote) place 4864268, seed 8647-mason; the seats and questions were found by a script outside
// the test over eight places (temper, sponsor, group and next-election were not reached). Where the chair stalls, the press draws the reason; where
// the chair has already said no, the reason is the first answer.
it.each([
  ["district", "4846968", 0, 21],
  ["last-vote", "4864268", 0, 20],
] as const)(
  "the chair's reason %s is said when the player presses (place %s, seat %i, question %i)",
  (reason, placeKey, seatNo, question) => {
    const w = world(seatNo, question, placeKey);
    const { scene, chair } = w;
    const first = scene.talk.tree.lines[0]!;
    expect(first.speakerId).toBe(chair);
    const line = REASON_LINES[reason]!;
    if (first.move === "stall") {
      const press = scene.talk.tree.replies.find(
        (r) => r.line.move === "press",
      )!;
      const said = press.next?.lines.find((l) => l.speakerId === chair);
      expect(said?.text).toBe(line);
    } else expect(first.text).toBe(line);
  },
  70_000,
);
