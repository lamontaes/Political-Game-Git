import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import { personName } from "../simulation";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { projectGovernmentBrowser } from "./politics-government";

describe("the people who govern a home are named", () => {
  it("names the seated state legislators for the home and on the state screen, and the President who signs a bill", () => {
    const { world, personId } = adultLifeIn("AK", "named-holders");
    const members = stateLegislators(
      world,
      stateCandidacyPack("US-AK")!.packId,
    );
    expect(members.length).toBeGreaterThan(0);

    const view = projectGovernmentBrowser(world, personId);
    for (const row of view.representedBy!.filter((entry) =>
      entry.key.startsWith("state:"),
    )) {
      // Where the home's district is recorded, the member seated in it is
      // named; nobody is named for a district that is not.
      if (row.district === null) expect(row.holders).toHaveLength(0);
      else {
        expect(row.holders.length).toBeGreaterThan(0);
        expect(row.note).toBeNull();
        for (const holder of row.holders)
          expect(members.map((member) => member.personId)).toContain(
            holder.personId,
          );
      }
    }

    const state = projectGovernmentBrowser(world, personId, {
      scope: "state",
    });
    const chambers = state.branches
      .find((branch) => branch.branch === "legislative")!
      .entries.filter((entry) => entry.key.startsWith("chamber:"));
    expect(chambers.length).toBe(2);
    expect(
      chambers.reduce((sum, entry) => sum + (entry.roster?.length ?? 0), 0),
    ).toBe(members.length);

    // A bill the President signs names the President who signed it.
    const later = passUntil(world, "2027-06-01");
    const signed = later.history.events.filter(
      (event) =>
        event.type === "legislation.measure-signed" &&
        event.summary.startsWith("President "),
    );
    expect(signed.length).toBeGreaterThan(0);
    for (const event of signed) {
      const signer = event.participants[0]?.personId;
      expect(signer).toBeDefined();
      expect(event.summary).toContain(personName(later.people[signer!]!));
    }
    const president = currentPublicOfficeholders(later).find(
      (record) => record.officeKey === "us-president",
    );
    expect(president).toBeDefined();
  }, 900_000);
});
