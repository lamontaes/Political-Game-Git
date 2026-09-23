import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import { deserializeWorld, serializeWorld } from "../simulation";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import {
  stateLegislativeSeats,
  stateLegislators,
} from "../simulation/nationwide-world/state-legislature-opening";
import { STATE_LEGISLATIVE_RESULTS_EVENT } from "../simulation/nationwide-world/state-legislature-turnover";

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
