import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import { personName, recordPersonDeath } from "../simulation";
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

  it("seats Puerto Rico's Legislative Assembly at 51 and 27, with its districts and at-large members", () => {
    const { world, personId } = adultLifeIn("PR", "puerto-rico-assembly");
    const members = stateLegislators(
      world,
      stateCandidacyPack("US-PR")!.packId,
    );
    const count = (pattern: RegExp) =>
      members.filter((member) => pattern.test(member.title)).length;
    expect(count(/House of Representatives, District /)).toBe(40);
    expect(count(/House of Representatives, At Large$/)).toBe(11);
    expect(count(/Senate, District /)).toBe(16);
    expect(count(/Senate, At Large$/)).toBe(11);

    const rows = projectGovernmentBrowser(world, personId).representedBy!;
    const house = rows.find((row) => row.key === "state:house");
    const senate = rows.find((row) => row.key === "state:senate");
    for (const [row, district] of [
      [house, 1],
      [senate, 2],
    ] as const) {
      if (!row || row.district === null) continue;
      // The home's district members, then the eleven elected at large.
      expect(row.holders).toHaveLength(district + 11);
      expect(row.note).toMatch(/^11 of them are elected at large/);
    }
  }, 900_000);

  it("keeps a dead member's seat on the chamber roster as vacant, so the chamber keeps its size", () => {
    const { world, personId } = adultLifeIn("NV", "vacant-state-seat");
    const packId = stateCandidacyPack("US-NV")!.packId;
    const members = stateLegislators(world, packId);
    const roster = (state: typeof world) =>
      projectGovernmentBrowser(state, personId, { scope: "state" })
        .branches.find((branch) => branch.branch === "legislative")!
        .entries.flatMap((entry) => entry.roster ?? []);
    const before = roster(world);
    expect(before).toHaveLength(members.length);
    const gone = members[0]!;
    const after = recordPersonDeath(world, {
      stableKey: `test-death:${gone.personId}`,
      personId: gone.personId,
      diedAt: world.currentDate,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Vacant-seat fixture." },
    });
    const rows = roster(after);
    expect(rows).toHaveLength(before.length);
    const seat = rows.find((row) => row.seatLabel === gone.title)!;
    expect(seat.status).toBe("vacancy");
    expect(seat.holderPersonId).toBeNull();
    expect(seat.note).toMatch(/^Vacant since .*, when the member died\./);
    expect(stateLegislators(after, packId)).toHaveLength(members.length - 1);
  }, 900_000);
});
