import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import { personName, recordPersonDeath } from "../simulation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import { presidentDesk } from "../simulation/governing/congress-lawmaking";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  requireMeasure,
  referMeasure,
  takeFloorVote,
  transmitMeasure,
} from "../simulation/legislation";
import {
  committeeMembers,
  dispositionsFromCounts,
} from "../simulation/legislation-scenarios";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { projectGovernmentBrowser } from "./politics-government";

describe("the people who govern a home are named", () => {
  it("gives every generated officeholder a stated gender, so name and body agree", () => {
    const { world } = adultLifeIn("AK", "named-holders");
    const holders = currentPublicOfficeholders(world);
    expect(holders.length).toBeGreaterThan(1);
    for (const holder of holders) {
      const gender = world.people[holder.personId]?.identity?.gender;
      // A generated person's identity is drawn first and the name follows
      // it; "unstated" would let the body be drawn for another gender.
      expect(gender, holder.title).toBeDefined();
      expect(gender, holder.title).not.toBe("unstated");
    }
  });

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

    // Authored procedure fixture: this checks signer naming, not whether
    // autonomous Congress produces a bill during seventeen months of play.
    // Keep the generated President and all public legislative writers.
    const presidentBefore = currentPublicOfficeholders(world).find(
      (record) => record.officeKey === "us-president",
    );
    expect(presidentBefore).toBeDefined();
    const provenance = {
      method: "authored-fixture" as const,
      note: "Authored votes for signer-name coverage; not a forecast or law proof.",
      sourceEntityIds: [world.id],
    };
    let later = introduceMeasure(world, {
      stableKey: "named-holders:signature-fixture",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      designation: "H.R. named-holder fixture",
      shortTitle: "Signer-name fixture",
      summary: "Authored measure for the generated President's recorded name.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
    });
    const measureId = later.history.legislativeMeasures!.at(-1)!.id;
    for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
      const body = seatedCongressChamber(later, chamber.chamberKey)!.body;
      const committee = chamber.committees[0]!;
      const prefix = `named-holders:${chamber.chamberKey}`;
      later = referMeasure(later, {
        stableKey: `${prefix}:referral`,
        measureId,
        committeeKey: committee.committeeKey,
      });
      later = recordCommitteeDisposition(later, {
        stableKey: `${prefix}:committee`,
        measureId,
        recommendation: "favorable",
        dispositions: dispositionsFromCounts(
          committeeMembers(body, committee.appointedMembers),
          { yea: committee.appointedMembers },
        ),
        rationale: "Authored committee votes for the signer-name fixture.",
        provenance,
      });
      later = placeMeasureOnCalendar(later, {
        stableKey: `${prefix}:calendar`,
        measureId,
      });
      for (const stage of chamber.floorStages) {
        later = takeFloorVote(later, {
          stableKey: `${prefix}:${stage.stageKey}`,
          measureId,
          dispositions: dispositionsFromCounts(body.members, {
            yea: body.members.length,
          }),
          presentMembers: body.members.length,
          electedMembers: body.members.length,
          provenance,
        });
      }
      if (chamber.chamberKey === "house")
        later = transmitMeasure(later, {
          stableKey: "named-holders:transmit",
          measureId,
        });
    }
    later = enrollMeasure(later, {
      stableKey: "named-holders:enroll",
      measureId,
    });
    later = presentMeasureToExecutive(later, {
      stableKey: "named-holders:present",
      measureId,
    });
    expect(measurePosition(later, measureId).phase).toBe("awaiting-executive");
    // The real executive seam selects the seated President, decides, and
    // supplies the actor to the signature writer. Do not pass an actor here:
    // that would miss a regression where the production caller lost the name.
    later = presidentDesk(later, requireMeasure(later, measureId));
    expect(later.currentDate).toBe(world.currentDate);
    expect(later.personOrder).toEqual(world.personOrder);
    const signed = later.history.events.filter(
      (event) =>
        event.type === "legislation.measure-signed" &&
        event.summary.startsWith("President "),
    );
    expect(signed.length).toBeGreaterThan(0);
    for (const event of signed) {
      const signer = event.participants[0]?.personId;
      expect(signer).toBeDefined();
      expect(signer).toBe(presidentBefore!.personId);
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
    expect(seat.note).toMatch(
      /The seat is filled at the regular election on November \d+, 20\d\d\.$/,
    );
    expect(stateLegislators(after, packId)).toHaveLength(members.length - 1);
  }, 900_000);
});
