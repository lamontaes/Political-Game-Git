import { describe, expect, it } from "vitest";

import { CONGRESS_RESULTS_EVENT } from "../simulation";
import type { HistoricalEvent, World } from "../simulation";
import {
  NOMINATION_EVENT,
  NOMINATION_RUNOFF_EVENT,
} from "../simulation/nominations/party-nominations";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { drawRandomPlace } from "../../tests/support/random-place";

const SEED = "careers-nominations";
/** The life's home, drawn at random; every state's seats are in its record. */
const PLACE = drawRandomPlace(SEED);

function openLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: PLACE.key,
      startAge: 40,
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

const tag = (event: HistoricalEvent, prefix: string) =>
  event.tags.find((row) => row.startsWith(prefix))?.slice(prefix.length);

const seatOf = (event: HistoricalEvent) => tag(event, "seat:")!;

describe(`Congress candidates win their party's nomination first (home: ${PLACE.displayName}, seed ${SEED})`, () => {
  it("holds each state's 2026 primary on its date, with runoffs, and sends only nominees to November", () => {
    const world = monthsUntil(openLife(SEED), "2026-11-10");
    const events = world.history.events;
    const slates = events.filter(
      (event) => event.type === "election.congress-candidate-slate",
    );
    const primaries = new Map(
      events
        .filter((event) => event.type === NOMINATION_EVENT)
        .map((event) => [seatOf(event), event]),
    );
    const runoffs = new Map(
      events
        .filter((event) => event.type === NOMINATION_RUNOFF_EVENT)
        .map((event) => [seatOf(event), event]),
    );

    // Every field that filed ahead of a known primary had it on that date.
    const scheduled = slates.filter((slate) => tag(slate, "primary-date:"));
    expect(scheduled.length).toBeGreaterThan(400);
    for (const slate of scheduled) {
      const primary = primaries.get(seatOf(slate));
      expect(primary?.occurredAt, seatOf(slate)).toBe(
        tag(slate, "primary-date:"),
      );
      expect(tag(slate, "intake-date:")! < primary!.occurredAt).toBe(true);
    }
    // Texas's real filing deadline, December 8, 2025, fell before the game
    // opened, so its fields start already filed on that day (decision D-9).
    const texasSlates = slates.filter((slate) =>
      seatOf(slate).startsWith("us-house:TX-"),
    );
    expect(texasSlates).toHaveLength(38);
    expect(
      texasSlates.every((slate) => tag(slate, "intake-date:") === "2025-12-08"),
    ).toBe(true);
    // Texas votes first, on March 3, 2026; Louisiana's House seats do not
    // hold one, because their primary falls on the general election day.
    const texas = [...primaries.values()].filter((event) =>
      seatOf(event).startsWith("us-house:TX-"),
    );
    expect(texas.length).toBeGreaterThan(0);
    expect(texas.every((event) => event.occurredAt === "2026-03-03")).toBe(
      true,
    );
    expect(
      slates
        .filter((slate) => seatOf(slate).startsWith("us-house:LA-"))
        .every((slate) => slate.tags.includes("nomination:not-held")),
    ).toBe(true);
    // California and Washington send the top two on, whatever their party.
    const topTwo = [...primaries.values()].filter((event) =>
      event.tags.includes("method:top-two"),
    );
    expect(topTwo.length).toBeGreaterThan(0);
    expect(
      topTwo.every(
        (event) =>
          event.participants.filter((row) =>
            /\|(advanced|unopposed)$/.test(row.detail ?? ""),
          ).length <= 2,
      ),
    ).toBe(true);

    // Open seats draw contested primaries: some party has two or more in its
    // own primary.
    const partyPrimary = (event: HistoricalEvent) =>
      event.tags.includes("method:party-primary");
    const contested = [...primaries.values()].filter((event) => {
      const byParty = new Map<string, number>();
      if (!partyPrimary(event)) return false;
      for (const row of event.participants) {
        const party = (row.detail ?? "").split("|")[0]!;
        byParty.set(party, (byParty.get(party) ?? 0) + 1);
      }
      return [...byParty.values()].some((count) => count >= 2);
    });
    expect(contested.length).toBeGreaterThan(0);
    // Shares within a party's own primary add up to about 1,000 per mille.
    for (const event of contested) {
      const shares = new Map<string, number>();
      for (const row of event.participants) {
        const [party, permille] = (row.detail ?? "").split("|");
        shares.set(party!, (shares.get(party!) ?? 0) + Number(permille));
      }
      for (const total of shares.values())
        expect(Math.abs(total - 1000)).toBeLessThanOrEqual(2);
    }
    // A primary every party shares (top two or four, Nebraska's nonpartisan
    // legislature) splits one 1,000 among all of its candidates.
    const shared = [...primaries.values()].filter(
      (event) => !partyPrimary(event) && event.participants.length >= 2,
    );
    expect(shared.length).toBeGreaterThan(0);
    for (const event of shared) {
      const total = event.participants.reduce(
        (sum, row) => sum + Number((row.detail ?? "").split("|")[1]),
        0,
      );
      expect(Math.abs(total - 1000), seatOf(event)).toBeLessThanOrEqual(3);
    }

    // A runoff is held on its own date, only where the primary left one open.
    for (const [seatKey, runoff] of runoffs) {
      const primary = primaries.get(seatKey)!;
      expect(runoff.occurredAt).toBe(tag(primary, "runoff-date:"));
      expect(runoff.occurredAt > primary.occurredAt).toBe(true);
    }

    // Every November winner came through the nomination stage where one ran.
    const results = events.find(
      (event) => event.type === CONGRESS_RESULTS_EVENT,
    )!;
    for (const winner of results.participants) {
      const seatKey = (winner.detail ?? "").split("|")[0]!;
      const primary = primaries.get(seatKey);
      if (!primary) continue;
      const nominated = [
        ...primary.participants,
        ...(runoffs.get(seatKey)?.participants ?? []),
      ].filter((row) =>
        /\|(unopposed|nominated|advanced)$/.test(row.detail ?? ""),
      );
      expect(
        nominated.some((row) => row.personId === winner.personId),
        `${seatKey}: the winner was not nominated`,
      ).toBe(true);
    }
  }, 900_000);
});
