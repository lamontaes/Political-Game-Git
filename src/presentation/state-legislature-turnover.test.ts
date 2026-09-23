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

describe("STATE LEGISLATIVE CONTINUITY: seats are refilled at each regular election", () => {
  it("decides every Nevada seat on election day and seats the new members when the term begins", () => {
    const { world } = adultLifeIn("NV", "state-legislative-turnover");
    const packId = stateCandidacyPack("US-NV")!.packId;
    const opening = stateLegislativeSeats(world, packId);
    expect(opening.length).toBe(63);

    // The day after the 2026 general election: results are recorded, but
    // nobody has changed seats yet.
    const counted = passUntil(world, "2026-11-04");
    const results = counted.history.events.filter(
      (event) => event.type === STATE_LEGISLATIVE_RESULTS_EVENT,
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.occurredAt).toBe("2026-11-03");
    expect(results[0]!.participants).toHaveLength(63);
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
  }, 900_000);
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
    const recorded = recordedDistrictForOffice(world, personId, officeKey);
    expect(recorded).not.toBeNull();
    const filed = fileForOffice(world, personId, recorded!.binding, officeKey);
    const contest = filed.history.electionContests!.at(-1)!;
    expect(contest.electionDate).toBe("2026-11-03");
    const [seat] = stateSeatsInDistrict(
      pack.packId,
      officeKey,
      recorded!.binding.recordId,
    );
    expect(seat).toBeDefined();
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
