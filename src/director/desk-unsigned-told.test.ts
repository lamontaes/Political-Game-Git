/**
 * A bill left on the player's desk past its deadline becomes law unsigned,
 * and the record says so (owner's card, Nov 14 2026, 06:08Z: "It becomes law
 * unsigned ... and the Journal says so"). The lapse writes the same
 * executive-action record a signature or a veto writes, with action
 * "unsigned"; the press reads it, the reporter's question is bound to it, and
 * the Journal tells it in the executive's own words.
 *
 * Pinned: Gates, Tennessee, drawn by the label "desk-c:0" for
 * "desk-report-mayor" (the desk report's draw, /mnt/project-files/words-lead/desk/report-1.md);
 * the state's law gives its mayor a veto and its council has five seats.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  authorityFor,
  billOf,
  castMemberVote,
  chambersOf,
  draftBill,
  holdVote,
  mayorVeto,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { seatWinner, townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";
import { wordPrintedStory } from "../bench/archive-words";

it("a bill left on the mayor's desk past its deadline becomes law, and the record and the Journal say it was never signed", () => {
  const place = drawPlace("desk-c:0", "desk-report-mayor");
  const where = `${place.name} (${place.key})`;
  expect(place.key, "the pinned draw moved").toBe("4728740");
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  expect(mayorVeto(api).veto, where).toBe(true);
  const seats = townSeats(api);
  const seat = seats.find((row) => row.office.kind === "mayor")!;
  const council = seats.filter(
    (row) =>
      row.office.kind === "council" &&
      core.people.get(row.holder?.personId as PersonId)?.alive,
  );
  const playerId = core.playerId! as PersonId;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  // Seated the way a count seats a winner.
  seatWinner(api, {
    seatId: seat.seat.id,
    officeId: seat.office.id,
    personId: playerId,
    identity: {
      givenName: player.givenName,
      familyName: player.familyName,
      gender: "recorded",
      birthDate: player.birthDate,
      homeState: place.state,
    },
    party: null,
    endDate: null,
    reached: `elected ${core.date}`,
    resultId: `desk-unsigned-test:${seat.seat.id}`,
    title: seat.office.title,
    winnerId: playerId,
    news: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));

  // A council member's ordinance, passed by the whole council.
  const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
    kind: "policy-question",
    question,
    value: 1,
  })).find((row) => authorityFor(api, row).allowed)!;
  const sponsor = council[0]!.holder!.personId as PersonId;
  const bill = draftBill(api, {
    bodyOfficeId: council[0]!.office.id,
    sponsorId: sponsor,
    provisions: [provision],
  });
  for (const chamber of chambersOf(api, bill))
    for (const term of members(api, chamber))
      castMemberVote(api, bill.id, memberKey(term), "yes");
  expect(holdVote(api, bill.id).status, where).toBe("awaiting-signature");
  const signBy = (billOf(api, bill.id) as unknown as { signBy: string }).signBy;

  // The player never answers the desk; the deadline passes.
  while (core.date <= signBy)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(billOf(api, bill.id).status, where).toBe("enacted");

  const record = core.durableLog.get(`executive-action:${bill.id}`);
  expect(record?.kind, `${where}: no executive-action for the lapse`).toBe(
    "executive-action",
  );
  expect(record!.facts?.action, where).toBe("unsigned");
  expect(record!.facts?.executiveId, where).toBe(playerId);
  expect(record!.personIds, where).toEqual([playerId, sponsor]);
  expect(record!.publicRecord, where).toBe(true);
  // The calendar acts on the deadline day itself, when it closes.
  expect(record!.date, where).toBe(signBy);

  // The director read it for the player: a moment on that record.
  const book = director.ledger.people.get(playerId)!;
  const moment = book.moments.find((row) => row.causeId === record!.id);
  expect(
    moment,
    `${where}: the player has no moment for the lapse`,
  ).toBeTruthy();

  // Where the press prints the act (it weighs an ordinary bill's act by who
  // it involves, so a week's bigger stories may outrank it), the paper words
  // it as a law without the signature, from that record, never as a signing.
  const worded = wordPrintedStory(core, {
    id: `press.printed:desk-unsigned-test:${record!.id}`,
    kind: "press.printed",
    date: record!.date,
    facts: { sourceRecordId: record!.id },
  } as unknown as Parameters<typeof wordPrintedStory>[1]);
  process.stdout.write(
    `DESK-UNSIGNED paper ${where}: ${JSON.stringify([worded?.headline, worded?.lede])}\n`,
  );
  expect(worded?.headline, where).toMatch(/without|unsigned/);
  expect(worded?.headline, where).not.toMatch(/\bsigns\b|\bvetoes\b/);
  expect(`${worded?.lede ?? ""}`, where).toMatch(/without/);

  // Nothing tells it as a signature: the Journal's signed lines and the
  // paper's signed pieces need the "signed" stage, which a lapse never is.
  // (The Journal's own unsigned lines come with the Journal's bank, #9119.)
  const lines = composeJournal(core, director, playerId).flatMap((chapter) =>
    chapter.lines.map((line) => line.text),
  );
  process.stdout.write(
    `DESK-UNSIGNED ${where}: ${bill.number} lapsed on ${record!.date}; Journal ends ${JSON.stringify(lines.slice(-3))}\n`,
  );
  expect(
    lines.filter(
      (line) =>
        line.includes(bill.number) &&
        /\bsigned\b/.test(line) &&
        !/never signed/.test(line),
    ),
    where,
  ).toEqual([]);
}, 240_000);
