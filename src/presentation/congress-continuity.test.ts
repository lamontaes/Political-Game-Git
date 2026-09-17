import { describe, expect, it } from "vitest";

import {
  CONGRESS_RESULTS_EVENT,
  deserializeWorld,
  projectCongress,
  serializeWorld,
} from "../simulation";
import type { ChamberView, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function openLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

function monthsUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 120 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(next, 30);
  return next;
}

const count = (chamber: ChamberView, kind: string) =>
  chamber.seats.filter((seat) => seat.occupant.kind === kind).length;

const memberId = (chamber: ChamberView, seatKey: string) => {
  const occupant = chamber.seats.find((s) => s.seatKey === seatKey)!.occupant;
  return occupant.kind === "member" ? occupant.member.personId : null;
};

describe("GOVERNING 3: Congress continues across term boundaries", () => {
  it("holds the 2026 and 2028 elections on the clock and seats the winners", () => {
    const world = openLife("governing-congress");
    const opening = projectCongress(world)!;

    // Before election day nothing has changed, and reading writes nothing.
    const autumn = monthsUntil(world, "2026-10-15");
    const before = serializeWorld(autumn);
    projectCongress(autumn);
    expect(serializeWorld(autumn)).toBe(before);
    expect(
      autumn.history.events.some((e) => e.type === CONGRESS_RESULTS_EVENT),
    ).toBe(false);

    // Election day: one public results record; nobody is seated early.
    const counted = monthsUntil(autumn, "2026-11-10");
    const results = counted.history.events.filter(
      (e) => e.type === CONGRESS_RESULTS_EVENT,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.visibility).toBe("public");
    expect(results[0]!.occurredAt).toBe("2026-11-03");
    // 435 House seats and the 33 Senate seats whose terms end.
    expect(results[0]!.participants).toHaveLength(468);
    expect(projectCongress(counted)!.house).toEqual(
      projectCongress(autumn)!.house,
    );

    // First boundary: every seat has a member or an actual vacancy.
    const seated = monthsUntil(counted, "2027-02-01");
    const first = projectCongress(seated)!;
    expect(count(first.house, "no-current-record")).toBe(0);
    expect(count(first.senate, "no-current-record")).toBe(0);
    expect(count(first.house, "member")).toBe(435);
    // Some seats change hands and some members return; nobody is extended
    // without an election.
    const changed = first.house.seats.filter(
      (seat) =>
        memberId(first.house, seat.seatKey) !==
        memberId(opening.house, seat.seatKey),
    ).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(435);

    // Save/Continue keeps the same roll.
    const reopened = deserializeWorld(serializeWorld(seated));
    expect(projectCongress(reopened)).toEqual(first);

    // Second boundary, reached in one explicit long skip.
    const skipped = passOrdinaryDays(reopened, 730);
    expect(skipped.currentDate >= "2029-01-03").toBe(true);
    const second = projectCongress(skipped)!;
    expect(
      skipped.history.events.filter((e) => e.type === CONGRESS_RESULTS_EVENT),
    ).toHaveLength(2);
    expect(count(second.house, "no-current-record")).toBe(0);
    expect(count(second.senate, "no-current-record")).toBe(0);
    expect(new Set(skipped.history.events.map((e) => e.stableKey)).size).toBe(
      skipped.history.events.length,
    );
  }, 900_000);
});
