import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../../districts/catalog";
import { stateCandidacyPack } from "../candidacy-packs";
import { legislativeTermDates } from "../legislative-office-terms";
import type { World } from "../types";
import {
  isStateLegislativeSeatDue,
  nextStateLegislativeElection,
} from "./state-legislative-election-calendar";
import {
  planStateChambers,
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
  stateLegislativeSeatIdentity,
} from "./state-legislature-opening";

describe("measured state legislature seat cycles", () => {
  it("seats the settled chamber totals and binds multi-member districts", () => {
    const sizes = new Map([
      ["AZ", [60, 30]],
      ["ID", [70, 35]],
      ["NJ", [80, 40]],
      ["ND", [94, 47]],
      ["SD", [70, 35]],
      ["VT", [150, 30]],
      ["WA", [98, 49]],
      ["WV", [100, 34]],
    ]);
    for (const [state, [lowerSize, upperSize]] of sizes) {
      const pack = stateCandidacyPack(`US-${state}`)!;
      const plans = planStateChambers(pack).chambers;
      const lower = plans.find((plan) => plan.chamberKey === "house")!;
      const upper = plans.find((plan) => plan.chamberKey === "senate")!;
      expect([lower.size, upper.size]).toEqual([lowerSize, upperSize]);
      expect(lower.districts).toHaveLength(lowerSize);
      expect(upper.districts).toHaveLength(upperSize);
    }

    const plan = (state: string, chamber: "house" | "senate") =>
      planStateChambers(stateCandidacyPack(`US-${state}`)!).chambers.find(
        (entry) => entry.chamberKey === chamber,
      )!;
    const districtCount = (
      entries: readonly ({ districtCode: string } | null)[],
      code: string,
    ) => entries.filter((entry) => entry?.districtCode === code).length;

    expect(districtCount(plan("AZ", "house").districts, "001")).toBe(2);
    expect(districtCount(plan("WV", "senate").districts, "001")).toBe(2);
    expect(districtCount(plan("ND", "house").districts, "04A")).toBe(1);
    expect(districtCount(plan("ND", "house").districts, "001")).toBe(2);
    expect(districtCount(plan("SD", "house").districts, "26A")).toBe(1);
    expect(districtCount(plan("SD", "house").districts, "026")).toBe(2);
    expect(districtCount(plan("VT", "house").districts, "A-1")).toBe(2);
    expect(districtCount(plan("VT", "house").districts, "A-2")).toBe(1);
    expect(districtCount(plan("VT", "senate").districts, "CHC")).toBe(3);
  });

  it("reads seat identity from the opening record rather than a changed current plan", () => {
    const pack = stateCandidacyPack("US-WV")!;
    const officeKey = pack.offices.find((office) =>
      office.officeKey.endsWith(":senate"),
    )!.officeKey;
    const identity = districtIdentityCatalog().find(
      (district) =>
        district.stateUsps === "WV" &&
        district.chamber === "state-upper" &&
        district.districtCode === "001",
    )!;
    const tags = [
      STATE_LEGISLATURE_OPENING_VERSION,
      `pack:${pack.packId}`,
      "chamber:senate:34:rule-pack",
      `seat-plan:${encodeURIComponent(officeKey)}|1|${encodeURIComponent(identity.recordId)}|1`,
      `seat-plan:${encodeURIComponent(officeKey)}|2|${encodeURIComponent(identity.recordId)}|2`,
    ];
    const world = {
      history: {
        events: [
          { stableKey: STATE_LEGISLATURE_KEYS.opening(pack.packId), tags },
        ],
      },
    } as unknown as World;

    expect(
      stateLegislativeSeatIdentity(world, pack.packId, officeKey, 1),
    ).toEqual({
      districtCode: "001",
      slotWithinDistrict: 1,
    });
    expect(
      stateLegislativeSeatIdentity(world, pack.packId, officeKey, 2),
    ).toEqual({
      districtCode: "001",
      slotWithinDistrict: 2,
    });
    expect(
      stateLegislativeSeatIdentity(world, pack.packId, officeKey, 35),
    ).toEqual({
      districtCode: null,
      slotWithinDistrict: null,
    });
  });

  it("keeps an older opening's chamber size when the current plan is larger", () => {
    const pack = stateCandidacyPack("US-ND")!;
    const officeKey = pack.offices.find((office) =>
      office.officeKey.endsWith(":house"),
    )!.officeKey;
    const world = {
      history: {
        events: [
          {
            stableKey: STATE_LEGISLATURE_KEYS.opening(pack.packId),
            tags: [
              STATE_LEGISLATURE_OPENING_VERSION,
              `pack:${pack.packId}`,
              "chamber:house:48:one-member-per-district",
            ],
          },
        ],
      },
    } as unknown as World;

    expect(
      stateLegislativeSeatIdentity(world, pack.packId, officeKey, 48)
        .districtCode,
    ).not.toBeNull();
    expect(
      stateLegislativeSeatIdentity(world, pack.packId, officeKey, 49),
    ).toEqual({
      districtCode: null,
      slotWithinDistrict: null,
    });
  });

  it("keeps the recorded biennial game ballot for an older West Virginia opening", () => {
    const pack = stateCandidacyPack("US-WV")!;
    const officeKey = pack.offices.find((office) =>
      office.officeKey.endsWith(":senate"),
    )!.officeKey;
    const world = {
      history: {
        events: [
          {
            stableKey: STATE_LEGISLATURE_KEYS.opening(pack.packId),
            tags: [
              STATE_LEGISLATURE_OPENING_VERSION,
              `pack:${pack.packId}`,
              "chamber:senate:17:one-member-per-district",
            ],
          },
        ],
      },
    } as unknown as World;
    const identity = stateLegislativeSeatIdentity(
      world,
      pack.packId,
      officeKey,
      1,
    );

    expect(identity.legacyElectionProfile).toBe(true);
    expect(isStateLegislativeSeatDue("WV", officeKey, 1, 2028, identity)).toBe(
      true,
    );
    expect(
      nextStateLegislativeElection("WV", "2028-01-01", {
        officeKey,
        ordinal: 1,
        ...identity,
      }).electionDate,
    ).toBe("2028-11-07");
    expect(legislativeTermDates(officeKey, "2028-11-07", identity)?.basis).toBe(
      "blanket",
    );
  });
});
