/**
 * A bill the committee chair holds without a hearing is a line in its sponsor's Journal
 * (Account lead, Nov 15; the held bill had a `journal-line` row on the sponsor's schedule
 * and no row in journal-rows.json, so the Journal left it out). Pinned at Texas (4846968),
 * seed 8647-mason, a state senator (seat 016) whose far-off paid family leave bill the
 * Senate labor chair holds on Feb 9, played by the game's own days.
 */
import { expect, it } from "vitest";
import { seatAct } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { makeIsoDate } from "../core2/kernel/dates";
import { memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI, fillInPerson } from "../core2/state";
import { composeJournal } from "./journal";

const QUESTION = "us-policy-positions:labor-workforce.paid-family-leave";

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

it("tells the sponsor in their Journal that the chair held their bill", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
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
  const player = ids[15]!;
  core.playerId = player as never;
  for (const id of ids) director.watch(core, id as never);
  const bill = seatAct(core, player, {
    kind: "draft",
    officeId: seat.office.id,
    question: QUESTION,
  }) as unknown as { id: string; number: string };
  play(core, player, "2025-01-23");
  play(core, player, "2025-02-13");
  const hold = [...core.durableLog.values()].find(
    (row) =>
      row.kind === "bill-held-in-committee" && row.facts?.billId === bill.id,
  );
  expect(hold, "the chair held the bill").toBeTruthy();
  expect(hold!.personIds).toContain(player);
  const told = JSON.stringify(composeJournal(core, director, player as never))
    .match(/"([^"]{12,})"/g)!
    .map((text) => text.slice(1, -1))
    .filter((text) => text.includes(bill.number) && !text.includes(":"));
  // Beside the line that says it was introduced, one says the chair held it.
  const heldLine = told.filter((text) =>
    /hearing|held|sat in committee/.test(text),
  );
  expect(heldLine.length, told.join(" | ")).toBeGreaterThanOrEqual(1);
  expect(heldLine.join(" "), "a held bill is not called dead").not.toMatch(
    /died|failed|killed/,
  );
  // The line is the sponsor's own: the chair and the other members, whom the
  // record also names, do not tell it.
  const others = ids
    .filter((id) => id !== player)
    .flatMap((id) =>
      (
        JSON.stringify(composeJournal(core, director, id as never)).match(
          /"([^"]{12,})"/g,
        ) ?? []
      )
        .map((text) => text.slice(1, -1))
        .filter(
          (text) =>
            text.includes(bill.number) && /hearing|sat in committee/.test(text),
        ),
    );
  expect(others, "only the sponsor tells it").toEqual([]);
  // No look-back claims what the chair would do next: the record holds no later act.
  expect(heldLine.join(" "), "no look-back on the hold").not.toMatch(
    /Little did I know/,
  );
}, 240_000);
