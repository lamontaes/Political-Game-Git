import { describe, expect, it, vi } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  LEGISLATIVE_TERM_EXPIRY,
  legacyLegislativeSeat,
  legislativeTermDates,
  migrateLegacyLegislativeSeats,
  requireElectionContest,
  campaignForCandidate,
  workRelationshipHistoryForPerson,
  workStatusAt,
  workStatusHistory,
  type EntityId,
  type World,
} from "../simulation";
import type * as LegislativeOfficeTerms from "../simulation/legislative-office-terms";
import { passOrdinaryDays } from "./ordinary-life";
import { projectWorkRole } from "./day-overview";

/*
 * An older save, written the way the game wrote it before every state's
 * legislative terms were dated: outside the sourced rule's states, a won seat
 * was active from the result date with no term entry or expiry. The mock
 * reproduces that writer (only the sourced rule gave dates) and can hold the
 * migration back, so a save can sit unmigrated for years like one on disk.
 */
const flags = vi.hoisted(() => ({ legacyWriter: false, migrate: true }));
vi.mock("../simulation/legislative-office-terms", async (importOriginal) => {
  const original = await importOriginal<typeof LegislativeOfficeTerms>();
  return {
    ...original,
    legislativeTermDates: (
      ...args: Parameters<typeof original.legislativeTermDates>
    ) =>
      flags.legacyWriter
        ? original.supportedLegislativeTermDates(...args)
        : original.legislativeTermDates(...args),
    migrateLegacyLegislativeSeats: (world: World) =>
      flags.migrate ? original.migrateLegacyLegislativeSeats(world) : world,
  };
});

function legacySeatWorld(seed: string) {
  const { world, personId } = adultLifeIn("NV", seed);
  flags.legacyWriter = true;
  flags.migrate = false;
  try {
    const won = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const seat = workRelationshipHistoryForPerson(won, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    const contest = requireElectionContest(
      won,
      campaignForCandidate(won, personId)!.contestId,
    );
    return { world: won, personId, seat, contest };
  } finally {
    flags.legacyWriter = false;
  }
}

function expiries(world: World, seatId: EntityId) {
  return world.history.futureDueItems.filter(
    (due) =>
      due.transitionKey === LEGISLATIVE_TERM_EXPIRY &&
      due.entityIds.includes(seatId),
  );
}

describe("a Nevada Assembly seat from an older save, with no dated term", () => {
  it("is given its term's end and leaves office on that date", () => {
    const { world, personId, seat, contest } = legacySeatWorld(
      "seat-terms-nv-legacy-future",
    );
    // The legacy shape: held from the result date, nothing to end it.
    expect(workStatusAt(world, seat.id)?.status).toBe("active");
    expect(expiries(world, seat.id)).toEqual([]);
    const endsAt = legislativeTermDates(
      contest.office.officeKey,
      contest.electionDate,
    )!.endsAt;
    expect(legacyLegislativeSeat(world, seat.id)?.endsAt).toBe(endsAt);

    flags.migrate = true;
    const migrated = migrateLegacyLegislativeSeats(world);
    expect(expiries(migrated, seat.id).map((due) => due.dueAt)).toEqual([
      endsAt,
    ]);
    // Append-only and idempotent: nothing already recorded changes.
    expect(migrateLegacyLegislativeSeats(migrated)).toBe(migrated);
    expect(migrated.history.workStatuses).toEqual(world.history.workStatuses);

    // Ordinary days carry the migration themselves.
    const before = passUntil(
      world,
      contest.electionDate.slice(0, 4) + "-12-31",
    );
    expect(expiries(before, seat.id)).toHaveLength(1);
    expect(workStatusAt(before, seat.id)?.status).toBe("active");
    const after = passUntil(before, endsAt);
    expect(workStatusAt(after, seat.id)?.status).toBe("ended");
    expect(workStatusAt(after, seat.id)?.effectiveAt).toBe(endsAt);
    expect(projectWorkRole(after, personId).roles).not.toContain(
      contest.office.title,
    );
  }, 600_000);

  it("ends today, not on a rewritten past date, when its term has already run out", () => {
    const { world, personId, seat, contest } = legacySeatWorld(
      "seat-terms-nv-legacy-passed",
    );
    const endsAt = legislativeTermDates(
      contest.office.officeKey,
      contest.electionDate,
    )!.endsAt;
    // Years go by in a save the fix has not seen: the seat is still held.
    const stale = passUntil(world, endsAt.slice(0, 4) + "-03-01");
    expect(stale.currentDate > endsAt).toBe(true);
    expect(workStatusAt(stale, seat.id)?.status).toBe("active");

    flags.migrate = true;
    const history = workStatusHistory(stale, seat.id);
    const migrated = migrateLegacyLegislativeSeats(stale);
    const ended = workStatusAt(migrated, seat.id)!;
    expect(ended.status).toBe("ended");
    expect(ended.effectiveAt).toBe(stale.currentDate);
    expect(ended.reason).toMatch(/term .* had already run out/);
    expect(workStatusHistory(migrated, seat.id).slice(0, -1)).toEqual(history);
    expect(expiries(migrated, seat.id)).toEqual([]);
    expect(migrateLegacyLegislativeSeats(migrated)).toBe(migrated);
    expect(projectWorkRole(migrated, personId).roles).not.toContain(
      contest.office.title,
    );
    // And the ordinary route does the same on the next day passed.
    const passed = passOrdinaryDays(stale, 1);
    expect(workStatusAt(passed, seat.id)?.status).toBe("ended");
  }, 600_000);
});
