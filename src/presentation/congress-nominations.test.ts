import { describe, expect, it, vi } from "vitest";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  congressSeats,
  seatTermWindow,
} from "../simulation/living-world/congress-seats";
import type * as CongressSeatModule from "../simulation/living-world/congress-seats";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { congressNominationPlan } from "../simulation/living-world/congress-candidates";
import { makeIsoDate } from "../simulation/dates";
const votingStates = new Set<string>(US_STATE_USPS);
const scope = vi.hoisted(() => ({ state: "" }));
// Scope the fixture's real seat catalog before opening and clock processing;
// filtering assertions after a national run would not reduce simulation work.
vi.mock("../simulation/living-world/congress-seats", async (original) => {
  const actual = await original<typeof CongressSeatModule>();
  return {
    ...actual,
    congressSeats: () =>
      actual.congressSeats().filter((seat) => seat.stateUsps === scope.state),
  };
});

import { CONGRESS_RESULTS_EVENT } from "../simulation";
import type { HistoricalEvent, World } from "../simulation";
import {
  NOMINATION_EVENT,
  NOMINATION_RUNOFF_EVENT,
} from "../simulation/nominations/party-nominations";
import { passOrdinaryDays } from "./ordinary-life";
import { drawRandomPlace } from "../../tests/support/random-place";

const SEED = "careers-nominations";
/** One jurisdiction drawn from all56; voting seats require a state. */
const PLACE = drawRandomPlace(SEED, (place) =>
  votingStates.has(place.stateJurisdictionKey?.slice(3) ?? ""),
);
scope.state = PLACE.stateJurisdictionKey!.slice(3);
function openLife(seed: string, place = PLACE) {
  scope.state = place.stateJurisdictionKey!.slice(3);
  return smallWorld({ place: place.key, seed, offices: ["congress"] }).world;
}

function monthsUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 120 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(next, 30);
  return next;
}

const EARLY_SEED = "overflow8-preopening-filing";
const EARLY_PLACE = drawRandomPlace(EARLY_SEED, (place) => {
  const source = (
    nominationRules.places as unknown as Record<
      string,
      { filing?: { deadlines2026: Record<string, string | null> } }
    >
  )[place.stateJurisdictionKey!];
  const deadline =
    source?.filing?.deadlines2026["us-house"] ??
    source?.filing?.deadlines2026.all;
  return (
    votingStates.has(place.stateJurisdictionKey?.slice(3) ?? "") &&
    Boolean(deadline && deadline < "2026-01-05")
  );
});

const tag = (event: HistoricalEvent, prefix: string) =>
  event.tags.find((row) => row.startsWith(prefix))?.slice(prefix.length);

const seatOf = (event: HistoricalEvent) => tag(event, "seat:")!;

describe(`Congress candidates win their party's nomination first (home: ${PLACE.displayName}, seed ${SEED})`, () => {
  it("holds the drawn state's 2026 primaries on their dates and sends only nominees to November", () => {
    const opening = openLife(SEED);
    const dueSeats = congressSeats().filter(
      (seat) =>
        seatTermWindow(seat, makeIsoDate("2026-11-03")).endExclusive ===
        "2027-01-03",
    );
    const expectedPrimaries = dueSeats.filter(
      (seat) => congressNominationPlan(opening, seat, 2026).known,
    );
    const world = monthsUntil(opening, "2026-11-10");
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
    expect(slates).toHaveLength(dueSeats.length);
    expect(scheduled).toHaveLength(expectedPrimaries.length);
    expect(scheduled.length).toBeGreaterThan(0);
    expect(
      slates.every((slate) =>
        dueSeats.some((seat) => seat.seatKey === seatOf(slate)),
      ),
    ).toBe(true);
    for (const slate of scheduled) {
      const primary = primaries.get(seatOf(slate));
      expect(primary?.occurredAt, seatOf(slate)).toBe(
        tag(slate, "primary-date:"),
      );
      expect(tag(slate, "intake-date:")! < primary!.occurredAt).toBe(true);
    }
    // Every-method advancement and pre-opening filing assertions now live in
    // bounded writer fixtures; nationwide calendar facts live in the data test.
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
    // The bounded party fixture separately requires a contested primary.
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
    // The bounded shared-primary fixture separately requires this branch.
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
    expect(results).toBeDefined();
    expect(results.participants.length).toBeGreaterThan(0);
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
  it(`records a filing deadline before opening for ${EARLY_PLACE.displayName}, place seed ${EARLY_SEED}, world seed ${SEED}`, () => {
    const opening = openLife(SEED, EARLY_PLACE);
    const houseSeats = congressSeats().filter(
      (seat) => seat.chamberKey === "us-house",
    );
    const world = passOrdinaryDays(opening, 1);
    const slates = world.history.events.filter(
      (event) =>
        event.type === "election.congress-candidate-slate" &&
        houseSeats.some((seat) => seat.seatKey === seatOf(event)),
    );
    expect(slates).toHaveLength(houseSeats.length);
    expect(slates.length).toBeGreaterThan(0);
    for (const slate of slates) {
      const seat = houseSeats.find((row) => row.seatKey === seatOf(slate))!;
      const plan = congressNominationPlan(opening, seat, 2026);
      expect(plan.known).toBe(true);
      if (!plan.known) throw new Error("The dated filing row has no primary.");
      expect(plan.filingDeadline < opening.currentDate).toBe(true);
      expect(tag(slate, "intake-date:")).toBe(plan.filingDeadline);
    }
  }, 900_000);
});
