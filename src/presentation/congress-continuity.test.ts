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
import { seatStartingCondition } from "../simulation/world-setup/conditions";
import { SEAT_VACANCY_EVENT } from "../simulation/living-world/opening";

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
    const slates = autumn.history.events.filter(
      (event) => event.type === "election.congress-candidate-slate",
    );
    expect(slates).toHaveLength(468);
    expect(slates.every((slate) => slate.participants.length > 0)).toBe(true);
    expect(
      slates.every((slate) =>
        slate.participants.every((candidate) =>
          Boolean(autumn.people[candidate.personId]),
        ),
      ),
    ).toBe(true);
    expect(slates.every((slate) => slate.occurredAt < "2026-11-03")).toBe(true);
    const prospectChoices = new Set(
      autumn.history.decisionTraces
        .filter(
          (trace) =>
            trace.context.decisionType === "election.consider-congress-run",
        )
        .map((trace) => trace.context.actorPersonId),
    );
    expect(
      autumn.history.decisionTraces.some(
        (trace) =>
          trace.context.decisionType === "election.consider-congress-run" &&
          trace.selectedOptionKey === "decline",
      ),
    ).toBe(true);
    expect(
      slates.every((slate) =>
        slate.participants.every(
          (candidate) =>
            candidate.detail?.endsWith("|incumbent") ||
            prospectChoices.has(candidate.personId),
        ),
      ),
    ).toBe(true);
    expect(
      deserializeWorld(before).history.events.filter(
        (event) => event.type === "election.congress-candidate-slate",
      ),
    ).toEqual(slates);

    // Election day: one public results record; nobody is seated early.
    const counted = monthsUntil(autumn, "2026-11-10");
    const results = counted.history.events.filter(
      (e) => e.type === CONGRESS_RESULTS_EVENT,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.visibility).toBe("public");
    expect(results[0]!.occurredAt).toBe("2026-11-03");
    const slatesBySeat = new Map(
      slates.map((slate) => [
        slate.tags.find((tag) => tag.startsWith("seat:"))?.slice(5),
        slate,
      ]),
    );
    // 435 House seats and 33 Senate seats end. A slate with no living
    // candidate remains unfilled and becomes a dated vacancy at term start.
    const unfilledKeys = results[0]!.tags
      .filter((tag) => tag.startsWith("unfilled:"))
      .map((tag) => tag.slice("unfilled:".length));
    expect(results[0]!.participants.length + unfilledKeys.length).toBe(468);
    expect(
      unfilledKeys.every((seatKey) =>
        slatesBySeat
          .get(seatKey)
          ?.participants.every((candidate) =>
            counted.history.personDeaths.some(
              (death) =>
                death.personId === candidate.personId &&
                death.diedAt <= results[0]!.occurredAt,
            ),
          ),
      ),
    ).toBe(true);
    expect(
      results[0]!.participants.every((winner) => {
        const seatKey = (winner.detail ?? "").split("|")[0];
        return slatesBySeat
          .get(seatKey)
          ?.participants.some(
            (candidate) => candidate.personId === winner.personId,
          );
      }),
    ).toBe(true);
    const clearLeanWinners = results[0]!.participants.flatMap((winner) => {
      const [seatKey, party] = (winner.detail ?? "").split("|");
      const share = seatStartingCondition(world, seatKey!)?.generatedShare;
      if (share === null || share === undefined) return [];
      if (share >= 0.6)
        return [{ seatKey, party, expected: "democratic", share }];
      if (share <= 0.4)
        return [{ seatKey, party, expected: "republican", share }];
      return [];
    });
    const eligibleClearLeans = clearLeanWinners.filter((row) =>
      slatesBySeat
        .get(row.seatKey)
        ?.participants.some(
          (candidate) =>
            candidate.detail?.startsWith(`${row.expected}|`) &&
            !counted.history.personDeaths.some(
              (death) =>
                death.personId === candidate.personId &&
                death.diedAt <= results[0]!.occurredAt,
            ),
        ),
    );
    expect(eligibleClearLeans.length).toBeGreaterThan(0);
    expect(
      eligibleClearLeans.filter((row) => row.party !== row.expected),
    ).toEqual([]);
    expect(projectCongress(counted)!.house).toEqual(
      projectCongress(autumn)!.house,
    );

    // First boundary: every seat has a member or an actual vacancy.
    const seated = monthsUntil(counted, "2027-02-01");
    const first = projectCongress(seated)!;
    expect(count(first.house, "no-current-record")).toBe(0);
    expect(count(first.senate, "no-current-record")).toBe(0);
    // Every one of the 435 seats has a member or a dated vacancy. Members and
    // candidates can die before or after January 3, so the roll must preserve
    // the cause rather than silently extend an old tenure.
    const TERM_BEGAN = "2027-01-03";
    const vacancies = first.house.seats.filter(
      (seat) => seat.occupant.kind === "vacancy",
    );
    expect(count(first.house, "member") + vacancies.length).toBe(435);
    for (const seat of vacancies) {
      const occupant = seat.occupant;
      if (occupant.kind !== "vacancy") throw new Error("filtered above");
      expect(
        occupant.since >= TERM_BEGAN,
        `${seat.seatKey} was vacant from ${occupant.since}, before the term began on ${TERM_BEGAN} — the election did not fill it`,
      ).toBe(true);
      // A vacancy names the event that caused it, so it can be explained.
      expect(occupant.eventId).toBeTruthy();
    }
    expect(
      unfilledKeys.every((seatKey) =>
        seated.history.events.some(
          (event) =>
            event.type === SEAT_VACANCY_EVENT &&
            event.tags.includes(`seat:${seatKey}`) &&
            event.tags.includes("vacancy-cause:no-living-candidate"),
        ),
      ),
    ).toBe(true);
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
