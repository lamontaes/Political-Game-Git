/**
 * A committee or caucus meeting is a sitting of a smaller room (lying thread,
 * Nov 15; pool: legislature-vote-asks-never-written-in-drawn-places, cause C).
 * Before this, every meeting gave the player the whole meeting's hours with
 * each colleague in the room, so by May a Texas senator was close to every
 * member of their caucus and no vote on their own bill was ever short on the
 * eve. Now the room is shared by the sitting's own rule
 * (sitting-closeness.ts `roomTime`): the meeting's hours times the contact
 * share, split among the `knownAmong(room - 1)` colleagues whose service
 * began nearest the player's.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason): the player is the
 * senate's first member by id, the same seat the lying thread's played files
 * use. The caucus meeting is done through the office day's own `actOn`, the
 * call the morning makes when the player leaves it to the character.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { knownAmong } from "./encounters";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { pairKey } from "./kernel/ids";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { actOn, stateDay, stateOfficeOf } from "./office-day-state";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

it("a caucus meeting shares its hours among the colleagues one knows there, by the sitting's rule", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3 &&
      members(api, r.office.id).every((t) => t.personId),
  )!;
  const ids = members(api, seat.office.id).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  const player = ids[0]!;
  core.playerId = player as PersonId;
  const office = stateOfficeOf(api, player)!;
  expect(office.officeId).toBe(seat.office.id);

  // The first caucus day of the session, played up to its eve.
  let date = makeIsoDate(gameStartDate());
  let caucus = stateDay(api, office, date).find((e) => e.kind === "caucus");
  for (let d = 0; !caucus && d < 60; d++) {
    date = addDays(date, 1);
    caucus = stateDay(api, office, date).find((e) => e.kind === "caucus");
  }
  expect(caucus, "a caucus day in the session's first two months").toBeTruthy();
  advanceCore(core, caucus!.date);

  const party = members(api, office.officeId).filter(
    (t) => t.party === office.party,
  );
  const others = party.map(memberKey).filter((id) => id !== player);
  const result = actOn(api, caucus!, { kind: "attend", attend: true });

  const count = knownAmong(api, others.length);
  const share = (2 * api.parameter("sittingContactShare")) / Math.max(1, count);
  const touched = others.filter((id) =>
    result.recordIds.includes(pairKey(player, id)),
  );
  // What the meeting wrote on each tie it touched: its own change, read
  // straight after the meeting, before anything else that day.
  const written = touched.map((id) => {
    const change = core.relationships.get(pairKey(player, id))?.latestChange;
    return {
      cause: (change?.reason as { cause?: string } | undefined)?.cause,
      hours: change?.requestedChange ?? 0,
    };
  });
  // The caucus is bigger than the colleagues one comes to know in it.
  expect(others.length).toBeGreaterThan(count);
  expect(touched.length).toBe(count);
  expect(written.every((w) => w.cause === "office-day-state.meeting")).toBe(
    true,
  );
  expect(Math.max(...written.map((w) => w.hours))).toBeCloseTo(share, 9);
}, 60_000);
