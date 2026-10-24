/**
 * The money family in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first
 * two months. Two people who faced about the same case for a money decision,
 * one leaning toward it and one away, decided differently; the test names
 * both (residents of the town), and the borrowing application the
 * borrower's yes wrote.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { testPlace } from "./money-traits-kit";
import { coreAPI } from "./state";
import {
  describePair,
  livesIn,
  opposedPairs,
  playWeighing,
} from "./trait-pairs";

const place = testPlace("money-played");
const label = `${place.name} (${place.key}), seed ${place.seed.slice(0, 12)}`;

/** The money decisions a played window weighs for named actors, with the chooser's yes option. */
const MONEY = {
  "credit.borrow": null,
  "jobs.counted-apply": null,
  "jobs.counted-accept": null,
  "jobs.start-looking": "jobs-look",
  "jobs.apply": "jobs-apply",
  "jobs.accept-offer": "jobs-accept",
  "business.found": "business-found",
  "housing.buy-home": "housing-buy",
} as const;

describe(`money decisions in a played window, ${label}`, () => {
  it("two people in the same case who lean opposite ways decide differently, by record", () => {
    const start = gameStartDate();
    const world = buildBenchWorld(place.seed, start, {
      twoLevel: true,
      placeKey: place.key,
    });
    const calls = playWeighing(world.core, addDays(start, 62), MONEY);
    const pairs = opposedPairs(calls, {
      among: livesIn(world.core, world.placeId),
    });
    const applications = coreAPI(world.core).moduleState("credit").snapshot()
      .tables.applications as unknown as {
      id: string;
      borrowerId: string;
      date: string;
    }[];
    const lines = pairs.map((pair) =>
      describePair(
        pair,
        pair.decisionId === "credit.borrow"
          ? applications.find(
              (r) =>
                r.borrowerId === pair.yes.actorId && r.date === pair.yes.date,
            )?.id
          : undefined,
      ),
    );
    console.log(
      `money pairs at ${label}, ${calls.length} weighed calls:\n${lines.join("\n")}`,
    );
    expect(
      pairs.length,
      `${calls.length} money calls at ${label}`,
    ).toBeGreaterThan(0);
    const borrow = pairs.find((p) => p.decisionId === "credit.borrow");
    if (borrow)
      expect(
        applications.some(
          (r) =>
            r.borrowerId === borrow.yes.actorId && r.date === borrow.yes.date,
        ),
        `the borrower's application at ${label}`,
      ).toBe(true);
  }, 600_000);
});
