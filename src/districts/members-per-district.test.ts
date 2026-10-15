import { describe, expect, it } from "vitest";

import { stateCandidacyPack } from "../simulation";
import { planStateChambers } from "../simulation/nationwide-world/state-legislature-opening";
import { districtIdentityCatalog } from "./catalog";
import { membersInDistrict } from "./members-per-district";
import counts from "./members-per-district.json" with { type: "json" };
import { listDistrictIdentities } from "./query";
import type { DistrictChamber } from "./types";

const catalog = districtIdentityCatalog();
const districtsOf = (stateUsps: string, chamber: DistrictChamber) =>
  listDistrictIdentities(catalog, { stateUsps, chamber });
const seatsOf = (stateUsps: string, chamber: DistrictChamber) =>
  districtsOf(stateUsps, chamber).reduce(
    (sum, district) =>
      sum + membersInDistrict(stateUsps, chamber, district.districtCode),
    0,
  );

describe("members per district", () => {
  it("adds up to each multi-member chamber's size in law", () => {
    // Seats as the state's law sets them for the districts, the check on each count (Puerto Rico's Senate also seats eleven at large).
    const lawSize: Record<string, number> = {
      "AZ:state-lower": 60,
      "ID:state-lower": 70,
      "NJ:state-lower": 80,
      "WA:state-lower": 98,
      "ND:state-lower": 94,
      "SD:state-lower": 70,
      "MD:state-lower": 141,
      "VT:state-lower": 150,
      "VT:state-upper": 30,
      "WV:state-upper": 34,
      "PR:state-upper": 16,
    };
    const listed = Object.entries(counts.states).flatMap(([usps, chambers]) =>
      Object.keys(chambers).map((chamber) => `${usps}:${chamber}`),
    );
    expect(listed.sort()).toEqual(Object.keys(lawSize).sort());
    for (const [key, size] of Object.entries(lawSize)) {
      const [usps, chamber] = key.split(":") as [string, DistrictChamber];
      expect(seatsOf(usps, chamber)).toBe(size);
    }
  });

  it("names only districts the Census holds for that chamber", () => {
    for (const [usps, chambers] of Object.entries(counts.states))
      for (const [chamber, entry] of Object.entries(chambers)) {
        const known = new Set(
          districtsOf(usps, chamber as DistrictChamber).map(
            (district) => district.districtCode,
          ),
        );
        for (const code of Object.keys(
          (entry as { districts?: Record<string, number> }).districts ?? {},
        ))
          expect(known.has(code)).toBe(true);
      }
  });

  it("gives Windsor three senators and a single-member district one", () => {
    const windsor = districtsOf("VT", "state-upper").find((district) =>
      /^Windsor/.test(district.sourceName ?? ""),
    )!;
    expect(membersInDistrict("VT", "state-upper", windsor.districtCode)).toBe(
      3,
    );
    expect(membersInDistrict("VT", "state-upper", "CAL")).toBe(1);
    expect(membersInDistrict("KY", "state-lower", "001")).toBe(1);
  });
});

describe("a seated chamber gives every district the members it elects", () => {
  const usps = [
    ...new Set(districtIdentityCatalog().map((identity) => identity.stateUsps)),
  ].filter((entry) => stateCandidacyPack(`US-${entry}`));

  it("in every state with a candidacy pack", () => {
    let multiMember = 0;
    for (const state of usps) {
      const pack = stateCandidacyPack(`US-${state}`)!;
      for (const chamber of planStateChambers(pack).chambers) {
        const bound = chamber.districts.filter((entry) => entry !== null);
        const perDistrict = new Map<string, number>();
        for (const district of bound)
          perDistrict.set(
            district!.districtCode,
            (perDistrict.get(district!.districtCode) ?? 0) + 1,
          );
        const gazetteer =
          chamber.chamberKey === "house" ? "state-lower" : "state-upper";
        for (const [code, seated] of perDistrict) {
          const elected = membersInDistrict(state, gazetteer, code);
          if (elected > 1) multiMember += 1;
          expect(
            { state, chamber: chamber.chamberKey, code, seated },
            `${state} ${chamber.chamberKey} ${code}`,
          ).toEqual({
            state,
            chamber: chamber.chamberKey,
            code,
            seated: elected,
          });
        }
      }
    }
    expect(multiMember).toBeGreaterThan(0);
  });

  it("seats Vermont's Windsor Senatorial District with three senators", () => {
    const senate = planStateChambers(
      stateCandidacyPack("US-VT")!,
    ).chambers.find((chamber) => chamber.chamberKey === "senate")!;
    expect(senate.size).toBe(30);
    const windsor = senate.districts.filter((district) =>
      /^Windsor/.test(district?.sourceName ?? ""),
    );
    expect(windsor).toHaveLength(3);
  });

  it("seats North Dakota's House two to a district, and Maryland's 141 delegates", () => {
    const house = (state: string) =>
      planStateChambers(stateCandidacyPack(`US-${state}`)!).chambers.find(
        (chamber) => chamber.chamberKey === "house",
      )!;
    expect(house("ND").size).toBe(94);
    const district19 = house("ND").districts.filter(
      (district) => district?.districtCode === "019",
    );
    expect(district19).toHaveLength(2);
    expect(house("MD").size).toBe(141);
    expect(house("MD").districts.every((district) => district !== null)).toBe(
      true,
    );
  });
});
