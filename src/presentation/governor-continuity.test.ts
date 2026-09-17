import { describe, expect, it } from "vitest";

import {
  currentGoverningOffices,
  currentStateExecutiveHolders,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
} from "../simulation";
import type { World } from "../simulation";
import { stateExecutiveOfficeCalendar } from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function lifeIn(usps: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

function monthsUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 120 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(next, 30);
  return next;
}

const governor = (world: World, officeKey: string) =>
  currentStateExecutiveHolders(world).find(
    (holder) => holder.officeKey === officeKey,
  );

describe("GOVERNING 3: a governorship continues without the player", () => {
  it("holds the regular election, seats the winner and repeats four years later", () => {
    const world = lifeIn("CO", "governing-governor-continuity");
    const officeKey = stateExecutiveIdentity("CO")!.officeKey;
    const opening = governor(world, officeKey)!;
    // The opening governor's term is dated by the office calendar.
    expect(opening.endExclusive).toBe("2027-01-04");

    // The field closes 60 days before election day; filing after that
    // stands in the next cycle.
    const autumn = monthsUntil(world, "2026-09-10");
    const contests = (autumn.history.electionContests ?? []).filter(
      (contest) => contest.office.officeKey === officeKey,
    );
    expect(contests).toHaveLength(1);
    expect(contests[0]!.electionDate).toBe("2026-11-03");
    expect(stateExecutiveOfficeCalendar(autumn, "CO")!.nextElection).toBe(
      "2030-11-05",
    );

    // First boundary: someone holds the office from the new term's start.
    const seated = monthsUntil(autumn, "2027-02-01");
    const first = governor(seated, officeKey)!;
    expect(first).toBeDefined();
    expect(first.origin).toBe("elected-term");
    expect(first.startedAt).toBe("2027-01-04");
    expect(first.endExclusive).toBe("2031-01-06");
    const office = currentGoverningOffices(seated).find(
      (o) => o.officeKey === officeKey,
    )!;
    expect(office.holderPersonId).toBe(first.personId);
    expect(office.controlledByPlayer).toBe(false);

    const reopened = deserializeWorld(serializeWorld(seated));
    expect(governor(reopened, officeKey)).toEqual(first);

    // Second boundary through one explicit long skip; the due items stop the
    // clock at each field closing and election in order.
    const later = passOrdinaryDays(reopened, 1500);
    expect(later.currentDate >= "2031-01-06").toBe(true);
    const second = governor(later, officeKey)!;
    expect(second).toBeDefined();
    expect(second.startedAt).toBe("2031-01-06");
    expect(
      (later.history.electionContests ?? []).filter(
        (contest) => contest.office.officeKey === officeKey,
      ),
    ).toHaveLength(2);
  }, 900_000);
});
