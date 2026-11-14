/**
 * A person's civic roles are read from the records that name them, never a
 * stored list (Account lead, Nov 14, cluster 29): a party's chair, and a seat
 * at its committee meetings in the last year. The candidacy engine reads them
 * as a reason to run (owner, Nov 8: civic roles make people run).
 *
 * Pinned: Edgar, Wisconsin (5522550), seed civic-roles-1, two months in so
 * the parties have met twice.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { candidacyReasons, civicRolesOf } from "./modules/candidacy";
import { partiesHere, partyMeetings } from "./modules/parties";
import { coreAPI } from "./state";

const contest = {
  contestId: "fixture-contest:civic-roles",
  officeName: "City council",
  filingDeadline: "2026-03-01",
  sourceIds: ["fixture-contest:civic-roles"],
};

describe("civic roles come from the records that name them", () => {
  it("Edgar, Wisconsin: each party's chair and the people at its meetings hold a role, and it pulls them toward running", () => {
    const { core } = buildBenchWorld("civic-roles-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "5522550",
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 65));
    const parties = partiesHere(api).filter((p) => p.leaderId);
    expect(parties.length, "parties with a chair").toBeGreaterThan(0);
    const holders = new Set<string>();
    for (const party of parties) {
      expect(civicRolesOf(api, party.leaderId!)).toBeGreaterThanOrEqual(1);
      holders.add(party.leaderId!);
      const meetings = partyMeetings(api, party.id);
      expect(meetings.length, `${party.name} met`).toBeGreaterThan(0);
      for (const meeting of meetings)
        for (const id of meeting.attendeeIds) {
          expect(
            civicRolesOf(api, id),
            `${id} at ${meeting.id}`,
          ).toBeGreaterThanOrEqual(1);
          holders.add(id);
        }
    }
    // Someone no record names holds none.
    const adults = [...core.people.values()].filter(
      (p) =>
        p.alive &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) > 25,
    );
    const without = adults.find((p) => !holders.has(p.id));
    expect(without, "an adult with no civic role").toBeTruthy();
    expect(civicRolesOf(api, without!.id)).toBe(0);
    expect(candidacyReasons(api, without!, contest).civicRole).toBe(0);
    // The chair's role is a pull toward running.
    const chair = core.people.get(parties[0]!.leaderId!)!;
    expect(candidacyReasons(api, chair, contest).civicRole).toBeGreaterThan(0);
  }, 180_000);
});
