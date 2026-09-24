import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  COVERAGE_AS_OF,
  COVERAGE_PATH,
  renderCoverageDocument,
} from "../../scripts/civic-service/coverage";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { makeIsoDate } from "../simulation/dates";
import { TRANSIT_PROGRAM_KEY } from "../simulation/legislation-transit-families";
import {
  drawStateTaxServiceStartingConditions,
  stateTaxServiceProfileForJurisdictionKey,
} from "../simulation/world-setup/state-tax-service-profiles";
import { ensureWorldStartingConditions } from "../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import {
  RULES_CAPABILITY_VERSION,
  resolveCapability,
} from "../simulation/rule-capability-resolver";
import {
  FUNDED_SERVICE_FIELDS,
  fundedServiceRefusal,
  nationwideFundedServiceCoverage,
  resolveStateFundedServiceCapability,
} from "./funded-service-capability";
import { transitOffice } from "./transit-work";

const ON = makeIsoDate("2027-02-01");
const TEST_PROFILES = drawStateTaxServiceStartingConditions({
  seed: "funded-service-capability-test",
}).profiles;
const profileFor = (key: string) =>
  TEST_PROFILES.find((profile) => profile.jurisdictionKey === key) ?? null;

describe("funded civic service capability across the registry", () => {
  it("admits every field for Alaska, taking its institution from rules-capability/v1", () => {
    const alaska = resolveStateFundedServiceCapability("US-AK", ON);
    expect(alaska.supported).toBe(true);
    expect(alaska.readings.map((row) => row.field)).toEqual([
      ...FUNDED_SERVICE_FIELDS,
    ]);
    expect(alaska.missing).toEqual([]);
    expect(
      alaska.readings.find((row) => row.field === "legislative-procedure")!
        .basis,
    ).toContain(`${RULES_CAPABILITY_VERSION} institution.form`);
  });

  it("does not treat a saved service profile as an admitted member-vote route", () => {
    for (const key of ["US-NV", "US-WY"]) {
      const rules = resolveCapability({
        scope: { kind: "state", stateUsps: key.slice(3) },
        action: "inspect",
        onDate: ON,
      }).fields.find((entry) => entry.field === "institution.form")!;
      const capability = resolveStateFundedServiceCapability(
        key,
        ON,
        undefined,
        profileFor(key),
      );
      expect(capability.missing.includes("legislative-procedure")).toBe(
        rules.state !== "ADMITTED",
      );
      if (key === "US-NV") {
        expect(capability.supported).toBe(false);
        expect(capability.missing).toEqual(
          expect.arrayContaining([
            "appropriation-decision",
            "revenue-decision",
          ]),
        );
      } else {
        expect(capability.supported).toBe(false);
      }
    }
    const missingSavedProfile = resolveStateFundedServiceCapability(
      "US-KY",
      ON,
    );
    expect(missingSavedProfile.missing).toEqual(
      expect.arrayContaining([
        "tax-power",
        "funding-effective-date",
        "service-program",
      ]),
    );
    const nevada = resolveStateFundedServiceCapability(
      "US-NV",
      ON,
      undefined,
      profileFor("US-NV"),
    );
    expect(
      nevada.readings.find((row) => row.field === "tax-power")?.basis,
    ).toContain("explicit fictional tax assumptions");
    const wyoming = resolveStateFundedServiceCapability("US-WY", ON);
    expect(wyoming.missing).toContain("legislative-procedure");
    expect(fundedServiceRefusal(wyoming)).toMatch(
      /^Funded public service is not yet playable for Wyoming\. Missing: a compiled legislative institution;/,
    );
  });

  it("covers all 50 states and every loaded local government, claiming none it cannot run", () => {
    const coverage = nationwideFundedServiceCoverage(ON);
    expect(coverage.states.map((row) => row.jurisdictionKey)).toEqual([
      ...ARTICLE_V_STATE_KEYS,
    ]);
    expect(
      coverage.states
        .filter((row) => row.supported)
        .map((row) => row.jurisdictionKey),
    ).toEqual(["US-AK"]);
    expect(coverage.local.governments).toBeGreaterThan(0);
    expect(coverage.local.supported).toBe(0);
  });

  it("uses the same resolution at the player's office gate on the world's date", () => {
    const suppliedKentucky = suppliedLegislativeSeat("US-KY", "house");
    const kentucky = {
      ...suppliedKentucky,
      world: ensureWorldStartingConditions(suppliedKentucky.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      }),
    };
    const savedKentuckyProfile = stateTaxServiceProfileForJurisdictionKey(
      kentucky.world,
      "US-KY",
    );
    expect(savedKentuckyProfile).not.toBeNull();
    expect(
      resolveStateFundedServiceCapability(
        "US-KY",
        kentucky.world.currentDate,
        undefined,
        savedKentuckyProfile,
      ).supported,
    ).toBe(false);
    expect(transitOffice(kentucky.world, kentucky.personId)).toEqual({
      kind: "unavailable",
      reason: fundedServiceRefusal(
        resolveStateFundedServiceCapability(
          "US-KY",
          kentucky.world.currentDate,
          TRANSIT_PROGRAM_KEY,
          savedKentuckyProfile,
        ),
      ),
    });
    const alaska = suppliedLegislativeSeat("US-AK", "house");
    expect(transitOffice(alaska.world, alaska.personId).kind).toBe("available");
  });

  it("keeps the generated coverage document current on its declared date", async () => {
    expect(COVERAGE_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readFileSync(COVERAGE_PATH, "utf8")).toBe(
      await renderCoverageDocument(),
    );
  });
});
