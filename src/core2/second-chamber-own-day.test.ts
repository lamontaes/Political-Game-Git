/**
 * The second chamber takes a passed bill on its own sitting (pool item
 * laws-second-chamber-takes-the-bill-on-its-own-day). Played in the bench
 * world at Ciales, Puerto Rico (drawPlace("bill-stages-state:0",
 * "bill-stages"), pinned): the player sits in the House and drafts four bills;
 * the chairs are set to hear them and every senator to vote for them, as dev
 * mode may cast. A bill the House
 * carries waits for the Senate's own sitting a week on: no Senate vote falls on
 * the House's day, the bill card names the Senate, and the Senate's committee
 * and roll come on their own later days. A bill the House turns down never
 * reaches the Senate.
 */
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { billPageView } from "../bench/bill-stage";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  billEnding,
  billOf,
  castChairHearing,
  castMemberVote,
  committeeRecords,
  memberKey,
  members,
  votesOn,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

it("a bill the House passes waits for the Senate's own sitting, at Ciales, Puerto Rico", () => {
  setBookkeeping(false);
  const place = drawPlace("bill-stages-state:0", "bill-stages");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const house = townSeats(api).find(
    (r) => r.office.kind === "legislature-lower",
  )!.office.id;
  const senate = townSeats(api).find(
    (r) => r.office.kind === "legislature-upper",
  )!.office.id;
  const seated = members(api, house)
    .map(memberKey)
    .filter((k) => core.people.get(k as PersonId)?.alive)
    .sort();
  core.playerId = seated[0]! as PersonId;
  const ids: string[] = [];
  for (const question of seatView(core, core.playerId).questions.slice(0, 4)) {
    const bill = seatAct(core, core.playerId, {
      kind: "draft",
      officeId: house,
      question,
      value: 1,
    }) as { id: string };
    ids.push(bill.id);
    castChairHearing(api, bill.id, house, true);
    castChairHearing(api, bill.id, senate, true);
  }
  // The Senate is for every bill (each senator's vote cast as a dev may), so the bill reaches
  // the Senate floor; the House votes its own positions.
  for (const id of ids)
    for (const term of members(api, senate))
      castMemberVote(api, id, memberKey(term), "yes", false);
  // Each bill's roll days by chamber, from the legislative-vote records.
  const rolls = new Map<string, Map<string, string>>();
  api.subscribeEvents("second-chamber-test", ["legislative-vote"], (_, e) => {
    const facts = e.facts as { billId?: string; chamber?: string };
    if (!facts.billId || !ids.includes(facts.billId)) return;
    const days = rolls.get(facts.billId) ?? new Map<string, string>();
    days.set(String(facts.chamber), e.date);
    rolls.set(facts.billId, days);
  });
  let waited: { id: string; crossed: string; booked: string } | undefined;
  for (let day = 1; day <= 45; day += 1) {
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
    for (const id of ids) {
      const bill = billOf(api, id);
      if (waited || bill.status !== "drafted" || !bill.chambersPassed?.length)
        continue;
      waited = {
        id,
        crossed: bill.chambersPassed[0]!.on,
        booked: bill.nextChamberOn!,
      };
      // The day the House carried it: no Senate roll, the card names the Senate.
      expect(bill.chambersPassed[0]!.chamber).toBe(house);
      expect(waited.booked > waited.crossed, JSON.stringify(waited)).toBe(true);
      expect(
        (votesOn(api, id) as unknown as { chamber?: string }[]).some(
          (v) => v.chamber === senate,
        ),
      ).toBe(false);
      const ending = billEnding(api, id);
      expect(ending).toEqual({
        how: "pending",
        waitingIn: { chamber: senate, on: waited.booked },
      });
      expect(billPageView(core, id).where.bodyTitle).toBe("Senate");
    }
    if (waited && core.date > waited.booked) break;
  }
  expect(waited, "a bill the House carried").toBeTruthy();
  const { id, crossed, booked } = waited!;
  const days = rolls.get(id)!;
  expect(days.get(house)).toBe(crossed);
  // The Senate's committee sat after the House's day, and its roll (if the
  // committee reported it) came on the sitting it was booked on.
  const senateCommittee = committeeRecords(api, id).find(
    (c) => c.chamber === senate,
  );
  expect(senateCommittee, "the Senate's committee met on the bill").toBeTruthy();
  expect(senateCommittee!.date > crossed).toBe(true);
  expect(senateCommittee!.reported).toBe(true);
  expect(days.get(senate)).toBe(booked);
  // Only after the Senate's roll does it reach the governor's desk.
  const ended = billOf(api, id);
  expect(ended.status).not.toBe("drafted");
  expect(ended.passedOn).toBe(booked);
  console.log(
    `${place.name} (${place.key}): ${billOf(api, id).number} House ${crossed}, Senate committee ${senateCommittee!.date}, Senate sitting ${booked}, ended ${billOf(api, id).status}`,
  );
  // A bill the House turned down never reached the Senate.
  for (const other of ids) {
    const bill = billOf(api, other);
    if (bill.status !== "failed" || bill.chambersPassed?.length) continue;
    expect(
      committeeRecords(api, other).some((c) => c.chamber === senate),
      other,
    ).toBe(false);
    expect(rolls.get(other)?.has(senate) ?? false, other).toBe(false);
  }
}, 240_000);
