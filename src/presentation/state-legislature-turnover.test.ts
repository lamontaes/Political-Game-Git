import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  daysBetween,
  passUntil,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  deserializeWorld,
  recordPersonDeath,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import {
  campaignSeatHolders,
  stateLegislativeSeats,
  stateLegislators,
  stateSeatsInDistrict,
} from "../simulation/nationwide-world/state-legislature-opening";
import { fileForOffice } from "./campaign-projection";
import { recordedDistrictForOffice } from "./district-selection";
import { passOrdinaryDays } from "./ordinary-life";
import {
  STATE_LEGISLATIVE_RESULTS_EVENT,
  nextStateSeatFilling,
} from "../simulation/nationwide-world/state-legislature-turnover";
import {
  stateCandidateSeatKey,
  stateCandidateSlate,
  stateSeatDemocraticShare,
} from "../simulation/nationwide-world/state-legislature-candidates";
import { stateResidenceSince } from "../simulation/nationwide-world/residence-duration";
import { districtResidenceIntervals } from "../simulation/district-residence";

describe("STATE LEGISLATIVE CONTINUITY: seats are refilled at each regular election", () => {
  it("decides every Nevada seat on election day and seats the new members when the term begins", () => {
    const { world } = adultLifeIn("NV", "state-legislative-turnover");
    const packId = stateCandidacyPack("US-NV")!.packId;
    const opening = stateLegislativeSeats(world, packId);
    expect(opening.length).toBe(63);

    // The day after the 2026 general election: results are recorded, but
    // nobody has changed seats yet.
    const spring = passUntil(world, "2026-03-10");
    const slates = spring.history.events.filter(
      (event) => event.type === "election.state-legislative-candidate-slate",
    );
    expect(slates).toHaveLength(63);
    expect(
      slates.some((slate) =>
        slate.tags.includes("incumbent-qualification:provisional-game-profile"),
      ),
    ).toBe(true);
    expect(slates.every((slate) => slate.occurredAt < "2026-11-03")).toBe(true);
    expect(
      slates.every((slate) =>
        slate.participants.every((candidate) =>
          Boolean(spring.people[candidate.personId]),
        ),
      ),
    ).toBe(true);
    expect(
      spring.history.decisionTraces.some(
        (trace) =>
          trace.context.decisionType ===
          "election.consider-state-legislative-run",
      ),
    ).toBe(true);
    const newCandidate = slates
      .flatMap((slate) => slate.participants)
      .find(
        (candidate) =>
          candidate.detail?.endsWith("|new") &&
          districtResidenceIntervals(spring).some(
            (interval) =>
              interval.personId === candidate.personId &&
              interval.startedOn < "2026-01-01",
          ),
      )!;
    expect(newCandidate).toBeDefined();
    expect(
      (stateResidenceSince(spring, newCandidate.personId, "US-NV") ?? "") <
        "2026-01-01",
    ).toBe(true);
    expect(
      districtResidenceIntervals(spring).some(
        (interval) =>
          interval.personId === newCandidate.personId &&
          interval.startedOn < "2026-01-01" &&
          interval.provenance.method === "simulated-event",
      ),
    ).toBe(true);
    const openingSeat = opening[0]!;
    expect(
      stateSeatDemocraticShare(
        spring,
        packId,
        openingSeat.officeKey,
        openingSeat.ordinal,
      ),
    ).not.toBeNull();
    const slate = stateCandidateSlate(
      spring,
      stateCandidateSeatKey(packId, openingSeat.officeKey, openingSeat.ordinal),
      2026,
    );
    expect(slate).not.toBeNull();
    expect(deserializeWorld(serializeWorld(spring)).history.events).toEqual(
      spring.history.events,
    );

    const counted = passUntil(spring, "2026-11-04");
    const results = counted.history.events.filter(
      (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.occurredAt).toBe("2026-11-03");
    expect(results[0]!.participants).toHaveLength(63);
    const slatedIds = new Set(
      slates.flatMap((slate) =>
        slate.participants.map((candidate) => candidate.personId),
      ),
    );
    expect(
      results[0]!.participants.every((winner) =>
        slatedIds.has(winner.personId),
      ),
    ).toBe(true);
    const newcomers = results[0]!.participants.filter(
      (participant) => participant.detail?.split("|")[3] === "new",
    );
    expect(newcomers.length).toBeGreaterThan(0);
    expect(newcomers.length).toBeLessThan(63);
    for (const newcomer of newcomers)
      expect(
        stateLegislators(counted, packId).some(
          (member) => member.personId === newcomer.personId,
        ),
      ).toBe(false);

    // After the term begins every newcomer holds their seat, the departing
    // members do not, and the chamber keeps all 63 seats.
    const seated = passUntil(counted, "2027-01-03");
    const members = stateLegislators(seated, packId);
    for (const newcomer of newcomers) {
      const died = seated.history.personDeaths.some(
        (death) => death.personId === newcomer.personId,
      );
      if (died) continue;
      const member = members.find(
        (candidate) => candidate.personId === newcomer.personId,
      );
      expect(member).toBeDefined();
      // The new member carries their own party, not the seat's last holder's.
      const party = newcomer.detail!.split("|")[2];
      expect(member!.party).toBe(party === "none" ? null : party);
    }
    for (const newcomer of newcomers) {
      const leaving = newcomer.detail?.split("|")[4];
      if (leaving)
        expect(members.some((member) => member.personId === leaving)).toBe(
          false,
        );
    }
    const seats = stateLegislativeSeats(seated, packId);
    expect(seats).toHaveLength(63);
    // Nobody holds two seats, and every seat keeps its own title.
    expect(new Set(members.map((member) => member.personId)).size).toBe(
      members.length,
    );
    expect(seats.map((seat) => seat.title).sort()).toEqual(
      opening.map((seat) => seat.title).sort(),
    );

    const reopened = deserializeWorld(serializeWorld(seated));
    expect(stateLegislators(reopened, packId)).toEqual(members);

    const countedAgain = passUntil(reopened, "2028-11-10");
    const laterResults = countedAgain.history.events.filter(
      (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
    );
    expect(laterResults).toHaveLength(2);
    const laterSlates = countedAgain.history.events.filter(
      (event) =>
        event.type === "election.state-legislative-candidate-slate" &&
        event.occurredAt.startsWith("2028-"),
    );
    expect(laterSlates).toHaveLength(63);
    const laterCandidateIds = new Set(
      laterSlates.flatMap((slate) =>
        slate.participants.map((candidate) => candidate.personId),
      ),
    );
    expect(
      laterResults[1]!.participants.every((winner) =>
        laterCandidateIds.has(winner.personId),
      ),
    ).toBe(true);
    expect(
      deserializeWorld(serializeWorld(countedAgain)).history.events.filter(
        (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
      ),
    ).toEqual(laterResults);
  }, 900_000);

  it("keeps a seat vacant when every recorded candidate dies before voting", () => {
    const { world } = adultLifeIn("NV", "state-legislative-unfilled-slate");
    const packId = stateCandidacyPack("US-NV")!.packId;
    const spring = passUntil(world, "2026-03-10");
    const seat = stateLegislativeSeats(spring, packId)[0]!;
    const slate = stateCandidateSlate(
      spring,
      stateCandidateSeatKey(packId, seat.officeKey, seat.ordinal),
      2026,
    )!;
    expect(slate.participants.length).toBeGreaterThan(0);
    let withoutCandidates = spring;
    for (const candidate of slate.participants)
      withoutCandidates = recordPersonDeath(withoutCandidates, {
        stableKey: `test-candidate-death:${candidate.personId}`,
        personId: candidate.personId,
        diedAt: spring.currentDate,
        causeKey: "cause:people-fixture",
        sourceEntityIds: [spring.id],
        summary: "Died; the cause is not recorded.",
        provenance: { kind: "authored", note: "Unfilled slate fixture." },
      });
    const counted = passUntil(withoutCandidates, "2026-11-04");
    const result = counted.history.events.find(
      (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
    )!;
    expect(
      result.tags.some((tag) =>
        tag.startsWith(`unfilled:${seat.officeKey}|${seat.ordinal}|`),
      ),
    ).toBe(true);
    expect(
      result.participants.some((participant) =>
        participant.detail?.startsWith(`${seat.officeKey}|${seat.ordinal}|`),
      ),
    ).toBe(false);
    const seated = passUntil(counted, "2027-01-03");
    expect(
      seated.history.events.some(
        (event) =>
          event.type === "election.state-legislative-seat-vacancy" &&
          event.tags.includes(`seat:${seat.officeKey}|${seat.ordinal}`) &&
          event.tags.includes("vacancy-cause:no-living-candidate"),
      ),
    ).toBe(true);
    expect(
      stateLegislativeSeats(seated, packId).find(
        (row) =>
          row.officeKey === seat.officeKey && row.ordinal === seat.ordinal,
      )?.member,
    ).toBeNull();
    expect(
      nextStateSeatFilling(seated, packId, seat.officeKey, seat.ordinal),
    ).toEqual({ electedOn: "2028-11-07", takesOfficeOn: null });
  }, 900_000);

  it("uses the same intake for an odd-year state and nonpartisan Puerto Rico seats", () => {
    const nj = adultLifeIn("NJ", "state-candidate-odd-year").world;
    const njPack = stateCandidacyPack("US-NJ")!.packId;
    const nj2026 = passUntil(nj, "2026-03-10");
    expect(
      nj2026.history.events.filter(
        (event) => event.type === "election.state-legislative-candidate-slate",
      ),
    ).toHaveLength(0);
    const nj2027 = passUntil(nj2026, "2027-03-10");
    const njSlates = nj2027.history.events.filter(
      (event) => event.type === "election.state-legislative-candidate-slate",
    );
    expect(njSlates).toHaveLength(stateLegislativeSeats(nj2027, njPack).length);
    expect(njSlates.every((slate) => slate.occurredAt < "2027-11-02")).toBe(
      true,
    );

    const pr = adultLifeIn("PR", "state-candidate-nonpartisan").world;
    const prPack = stateCandidacyPack("US-PR")!.packId;
    const prSpring = passUntil(pr, "2026-03-10");
    const prSlates = prSpring.history.events.filter(
      (event) => event.type === "election.state-legislative-candidate-slate",
    );
    expect(prSlates).toHaveLength(
      stateLegislativeSeats(prSpring, prPack).length,
    );
    expect(prSlates.length).toBeGreaterThan(0);
    expect(
      prSlates.every((slate) =>
        slate.participants.every((candidate) =>
          candidate.detail?.startsWith("none|"),
        ),
      ),
    ).toBe(true);
  }, 900_000);
});

describe("reviewed regular legislative seat cohorts", () => {
  const slatesIn = (world: World, year: string) =>
    world.history.events.filter(
      (event) =>
        event.type === "election.state-legislative-candidate-slate" &&
        event.occurredAt.startsWith(`${year}-`),
    );
  const resultIn = (world: World, year: string) =>
    world.history.events.find(
      (event) =>
        event.type === STATE_LEGISLATIVE_RESULTS_EVENT &&
        event.occurredAt.startsWith(`${year}-`),
    );
  const slateOffice = (event: World["history"]["events"][number]) =>
    event.tags.find((tag) => tag.startsWith("seat:"))?.split("|")[1];
  const slateOrdinal = (event: World["history"]["events"][number]) =>
    Number(event.tags.find((tag) => tag.startsWith("seat:"))?.split("|")[2]);

  it("elects Kansas House in 2026, keeps the Senate cohort seated, then offers the Senate in 2028", () => {
    const opening = adultLifeIn("KS", "ks-reviewed-regular-seats").world;
    const packId = stateCandidacyPack("US-KS")!.packId;
    const house = "us-ks-legislature-profile-v1:house";
    const senate = "us-ks-legislature-profile-v1:senate";
    const openingSenators = stateLegislativeSeats(opening, packId).filter(
      (seat) => seat.officeKey === senate,
    );
    expect(openingSenators).toHaveLength(40);

    const spring = passUntil(opening, "2026-03-10");
    expect(
      slatesIn(spring, "2026").filter((event) => slateOffice(event) === house),
    ).toHaveLength(125);
    expect(
      slatesIn(spring, "2026").filter((event) => slateOffice(event) === senate),
    ).toHaveLength(0);

    const counted = passUntil(spring, "2026-11-04");
    const result = resultIn(counted, "2026")!;
    expect(result).toBeDefined();
    expect(result.tags).toContain("term-start:2027-01-11");
    expect(
      result.participants.every((row) => row.detail?.startsWith(`${house}|`)),
    ).toBe(true);
    expect(
      result.participants.length +
        result.tags.filter((tag) => tag.startsWith("unfilled:")).length,
    ).toBe(125);

    const seated = passUntil(counted, "2027-01-12");
    const senators = stateLegislativeSeats(seated, packId).filter(
      (seat) => seat.officeKey === senate,
    );
    for (const original of openingSenators) {
      const personId = original.member?.personId;
      if (
        !personId ||
        seated.history.personDeaths.some((row) => row.personId === personId)
      )
        continue;
      expect(
        senators.find((seat) => seat.ordinal === original.ordinal)?.member
          ?.personId,
      ).toBe(personId);
    }
    expect(
      seated.history.events.some(
        (event) =>
          event.type === "election.state-legislative-seat-vacancy" &&
          event.tags.some((tag) => tag.includes(`${senate}|`)),
      ),
    ).toBe(false);
    expect(nextStateSeatFilling(seated, packId, senate, 39)).toEqual({
      electedOn: "2028-11-07",
      takesOfficeOn: null,
    });
    const saved = serializeWorld(seated);
    const reopened = deserializeWorld(saved);
    expect(serializeWorld(reopened)).toBe(saved);

    const later = passUntil(reopened, "2028-11-08");
    expect(
      slatesIn(later, "2028").filter((event) => slateOffice(event) === house),
    ).toHaveLength(125);
    expect(
      slatesIn(later, "2028").filter((event) => slateOffice(event) === senate),
    ).toHaveLength(40);
    expect(
      resultIn(later, "2028")?.participants.some((row) =>
        row.detail?.startsWith(`${senate}|`),
      ),
    ).toBe(true);
  }, 300_000);

  it("alternates Nebraska's 24 even and 25 odd districts without replacing non-due members", () => {
    const opening = adultLifeIn("NE", "ne-reviewed-regular-seats").world;
    const packId = stateCandidacyPack("US-NE")!.packId;
    const officeKey = "us-ne-legislature-v1:legislature";
    const openingOdd = stateLegislativeSeats(opening, packId).filter(
      (seat) => seat.ordinal % 2 === 1,
    );
    expect(openingOdd).toHaveLength(25);

    const spring = passUntil(opening, "2026-03-10");
    expect(slatesIn(spring, "2026")).toHaveLength(24);
    expect(
      slatesIn(spring, "2026").every((event) => slateOrdinal(event) % 2 === 0),
    ).toBe(true);
    const counted = passUntil(spring, "2026-11-04");
    const result = resultIn(counted, "2026")!;
    expect(result).toBeDefined();
    expect(result.tags).toContain("term-start:2027-01-07");
    expect(
      result.participants.every(
        (row) => Number(row.detail?.split("|")[1]) % 2 === 0,
      ),
    ).toBe(true);
    expect(
      result.participants.length +
        result.tags.filter((tag) => tag.startsWith("unfilled:")).length,
    ).toBe(24);

    const seated = passUntil(counted, "2027-01-08");
    const oddSeats = stateLegislativeSeats(seated, packId).filter(
      (seat) => seat.ordinal % 2 === 1,
    );
    for (const original of openingOdd) {
      const personId = original.member?.personId;
      if (
        !personId ||
        seated.history.personDeaths.some((row) => row.personId === personId)
      )
        continue;
      expect(
        oddSeats.find((seat) => seat.ordinal === original.ordinal)?.member
          ?.personId,
      ).toBe(personId);
    }
    expect(nextStateSeatFilling(seated, packId, officeKey, 41)).toEqual({
      electedOn: "2028-11-07",
      takesOfficeOn: null,
    });
    const saved = serializeWorld(seated);
    const reopened = deserializeWorld(saved);
    expect(serializeWorld(reopened)).toBe(saved);

    const later = passUntil(reopened, "2028-11-08");
    expect(slatesIn(later, "2028")).toHaveLength(25);
    expect(
      slatesIn(later, "2028").every((event) => slateOrdinal(event) % 2 === 1),
    ).toBe(true);
    expect(
      resultIn(later, "2028")?.participants.every(
        (row) => Number(row.detail?.split("|")[1]) % 2 === 1,
      ),
    ).toBe(true);
  }, 300_000);

  it("keeps Georgia's disclosed whole-chamber 2026 game profile", () => {
    const opening = adultLifeIn("GA", "ga-existing-regular-seats").world;
    const packId = stateCandidacyPack("US-GA")!.packId;
    const spring = passUntil(opening, "2026-03-10");
    expect(slatesIn(spring, "2026")).toHaveLength(236);
    const counted = passUntil(spring, "2026-11-04");
    const result = resultIn(counted, "2026")!;
    expect(result).toBeDefined();
    expect(
      result.participants.length +
        result.tags.filter((tag) => tag.startsWith("unfilled:")).length,
    ).toBe(stateLegislativeSeats(counted, packId).length);
  }, 300_000);
});

/** Passes time with the player's own race decided in their favor. */
function passWinning(world: World, personId: EntityId, date: string): World {
  const handlers = suppliedWin(personId);
  let next = world;
  for (let step = 0; step < 200 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(
      next,
      Math.max(1, Math.min(30, daysBetween(next.currentDate, date))),
      { handlers },
    );
  return next;
}

describe("STATE LEGISLATIVE CONTINUITY: a player's campaign decides their own district's seat", () => {
  it("draws no one for the player's seat, and the player replaces the sitting member", () => {
    const { world, personId } = adultLifeIn(
      "NV",
      "state-legislative-player-seat",
    );
    const pack = stateCandidacyPack("US-NV")!;
    const officeKey = pack.offices.find((office) =>
      office.officeKey.endsWith(":assembly"),
    )!.officeKey;
    const spring = passUntil(world, "2026-03-10");
    const recorded = recordedDistrictForOffice(spring, personId, officeKey);
    expect(recorded).not.toBeNull();
    const filed = fileForOffice(spring, personId, recorded!.binding, officeKey);
    const contest = filed.history.electionContests!.at(-1)!;
    expect(contest.electionDate).toBe("2026-11-03");
    const [seat] = stateSeatsInDistrict(
      pack.packId,
      officeKey,
      recorded!.binding.recordId,
    );
    expect(seat).toBeDefined();
    expect(
      stateCandidateSlate(
        spring,
        stateCandidateSeatKey(pack.packId, officeKey, seat!.ordinal),
        2026,
      ),
    ).not.toBeNull();
    const sitting = stateLegislativeSeats(filed, pack.packId).find(
      (row) => row.officeKey === officeKey && row.ordinal === seat!.ordinal,
    )!.member;
    expect(sitting).not.toBeNull();

    const counted = passWinning(filed, personId, "2026-11-04");
    const results = counted.history.events.find(
      (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
    )!;
    // The seat is the campaign's: nobody is drawn for it.
    expect(results.participants).toHaveLength(62);
    expect(
      results.participants.some((participant) =>
        participant.detail?.startsWith(`${officeKey}|${seat!.ordinal}|`),
      ),
    ).toBe(false);
    expect(
      results.tags.some((tag) =>
        tag.startsWith(
          `campaign-seat:${officeKey}|${seat!.ordinal}|${contest.id}|`,
        ),
      ),
    ).toBe(true);

    const seated = passWinning(counted, personId, "2027-01-10");
    const holders = stateLegislators(seated, pack.packId).filter(
      (member) =>
        member.officeKey === officeKey && member.ordinal === seat!.ordinal,
    );
    expect(holders).toHaveLength(1);
    expect(holders[0]!.personId).toBe(personId);
    expect(holders[0]!.byCampaign).toBe(true);
    expect(holders[0]!.title).toBe(seat!.title);
    expect(
      stateLegislators(seated, pack.packId).some(
        (member) => member.personId === sitting!.personId,
      ),
    ).toBe(false);
    const row = stateLegislativeSeats(seated, pack.packId).find(
      (candidate) =>
        candidate.officeKey === officeKey &&
        candidate.ordinal === seat!.ordinal,
    )!;
    expect(row.member?.personId).toBe(personId);
    expect(stateLegislativeSeats(seated, pack.packId)).toHaveLength(63);

    const reopened = deserializeWorld(serializeWorld(seated));
    expect(stateLegislators(reopened, pack.packId)).toEqual(
      stateLegislators(seated, pack.packId),
    );

    // A winner who dies holds the seat no longer, so the next regular
    // election fills it rather than waiting out their term.
    const died = recordPersonDeath(seated, {
      stableKey: `test-death:${personId}`,
      personId,
      diedAt: seated.currentDate,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [seated.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Campaign-seat fixture." },
    });
    expect(campaignSeatHolders(died, pack.packId)).toHaveLength(0);
    expect(
      nextStateSeatFilling(died, pack.packId, officeKey, seat!.ordinal),
    ).toEqual({ electedOn: "2028-11-07", takesOfficeOn: null });
  }, 900_000);
});
