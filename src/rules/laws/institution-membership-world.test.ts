import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { projectCongress } from "../../simulation/living-world/congress";
import { canInstitutionAct as native } from "../../simulation/governing/institution-authority";
import {
  ethicsInstitutionKey,
  STATE_LEGISLATIVE_ETHICS_BODIES,
} from "../../simulation/press/state-ethics-bodies";
import {
  canInstitutionAct,
  congressChamberOf,
  type InstitutionFacts,
} from "./institution-membership";
describe("laws: private chamber gate through the own and native public authority callers", () => {
  it.each(Object.keys(STATES))(
    "matches seated House, Senate and nonmember authority in %s",
    (usps) => {
      const base = smallWorld({
        place: "US-" + usps,
        offices: ["congress"],
        seed: "rules2-law-institution:" + usps,
      });
      const world = base.world;
      const congress = projectCongress(world)!;
      const facts: InstitutionFacts = {
        onDate: world.currentDate,
        people: world.people,
        congress,
        ethicsBodies: STATE_LEGISLATIVE_ETHICS_BODIES.map((body) => ({
          ...body,
          institutionKey: ethicsInstitutionKey(body),
        })),
      };
      const ids = [
        base.personId,
        ...[congress.house, congress.senate].map((c) => {
          const seat = c.seats.find((s) => s.occupant.kind === "member")!;
          if (seat.occupant.kind !== "member")
            throw Error("No native seated member.");
          return seat.occupant.member.personId;
        }),
      ];
      for (const subjectPersonId of ids)
        for (const institution of [
          "us-house-ethics",
          "us-senate-ethics",
          "chamber-floor",
        ] as const)
          for (const action of [
            "receive-complaint",
            "censure",
            "expel",
            "remove-from-office",
            "audit-agency",
          ] as const) {
            const input = {
              institution,
              action,
              subjectPersonId,
              onDate: world.currentDate,
            };
            expect(canInstitutionAct(facts, input)).toEqual(
              native(world, input),
            );
          }
      expect(congressChamberOf(facts, ids[0]!)).toBeNull();
      expect(congressChamberOf(facts, ids[1]!)).toBe("us-house");
      expect(congressChamberOf(facts, ids[2]!)).toBe("us-senate");
    },
  );
});
