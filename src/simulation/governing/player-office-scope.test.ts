import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { stateJurisdictionForKey } from "../life-places";
import { playerOfficeScope } from "./office-consequence";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { projectCongress } from "../living-world/congress";

describe("playerOfficeScope", () => {
  it("returns jurisdiction and level for seated state and federal offices", () => {
    const small = smallWorld({
      place: DEFAULT_NEW_GAME_SETUP.placeKey,
      seed: "player-office-scope",
      offices: ["congress", "governor"],
    });
    const world = openOrdinaryLife(small.world, small.personId);
    const governor = currentStateExecutiveHolders(world)[0]!;
    const congress = projectCongress(world)!;
    const member = [...congress.house.seats, ...congress.senate.seats].find(
      (seat) => seat.occupant.kind === "member",
    )!;
    const stateScope = playerOfficeScope(world, governor.personId);
    const congressScope = playerOfficeScope(
      world,
      member.occupant.kind === "member"
        ? member.occupant.member.personId
        : small.personId,
    );
    expect(stateScope.some((entry) => entry.level === "state-executive")).toBe(
      true,
    );
    expect(congressScope.some((entry) => entry.level === "congress")).toBe(
      true,
    );
    for (const entry of [...stateScope, ...congressScope]) {
      expect(entry.jurisdictionId).toBeTruthy();
      expect(entry.officeKey).toBeTruthy();
      expect(entry.title).toBeTruthy();
    }
  });

  it("resolves each state and territory key without changing federal scope", () => {
    const stateKeys = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
      "DC",
      "AS",
      "GU",
      "MP",
      "PR",
      "VI",
    ];
    const ids = stateKeys.map(
      (key) => stateJurisdictionForKey(`US-${key}`)?.id,
    );
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NATIONAL_ELECTION_JURISDICTION.id).not.toBe(ids[0]);
  });
});
