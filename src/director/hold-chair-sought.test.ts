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
  committeeRecords,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI, fillInPerson } from "../core2/state";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import reasonTermsFile from "./data/bargain-reasons.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";

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

it("the reasons the chair can give are exactly the ones the bank has a line for", () => {
  const bank = (
    sceneTalk as unknown as {
      parts: {
        uses: {
          purpose?: string;
          step?: string;
          move?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts;
  const said = new Set<string>();
  for (const part of bank)
    for (const use of part.uses)
      if (
        use.purpose === "hearing-ask" &&
        use.step === "reply" &&
        use.move === "refuse"
      )
        for (const fact of use.requiresFacts ?? [])
          if (fact.startsWith("reason-") && fact !== "reason-none")
            said.add(fact.slice("reason-".length));
  expect([...said].sort()).toEqual([...reasonTermsFile.heldReasonsSaid].sort());
});
