/** Controlled opening-record fixtures; annual-world acceptance is checked separately. */
import { describe, expect, it } from "vitest";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "../simulation/government-units";
import { createStableId } from "../simulation/ids";
import { lifePlaceByKey } from "../simulation/life-places";
import { governmentUnitRecordedName } from "../simulation/nationwide-world/government-unit-names";
import {
  DEFAULT_OPENING_PUBLIC_OWNER_DATA,
  openingHistoricalCountyOwnerFacts,
  openingHistoricalCountyPurchaseCoverage,
  type OpeningCountyOwnerProjectionInput,
  type HistoricalCountyOwnerData,
} from "./opening-public-owner";
import { parameter as p } from "./parameters";
import type { CoreInput, OrganizationInput, Source } from "./types";

const at = "2021-01-01";
const fixtureSource: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Controlled historical county identity/coverage fixture; no observed cash, fiscal appropriation, service delivery or ordinary generated-world result.",
};
function projectionInput(date = at): OpeningCountyOwnerProjectionInput {
  const unit = governmentUnit("gus2025:194116")!;
  const worldId = createStableId(
    "world",
    "bounded-historical-public-owner-fixture",
  );
  const organizationStableKey = `local-government:${unit.id}`;
  return {
    organizationId: createStableId(
      "organization",
      `${worldId}:${organizationStableKey}`,
    ),
    organizationStableKey,
    worldId,
    name: governmentUnitRecordedName(unit),
    classification: "service:county-government",
    placeId: governmentUnitJurisdictionId(unit),
    startedAt: date,
  };
}
function fixture(date = at) {
  const request = projectionInput(date);
  const owner = openingHistoricalCountyOwnerFacts(request);
  const organization: OrganizationInput = {
    id: request.organizationId,
    name: request.name,
    classification: request.classification,
    placeId: request.placeId,
    kind: "employer",
    governmentFacts: owner.governmentFacts,
    liquidMinor: p("minorPerDollar"),
    source: { ...fixtureSource, asOf: date },
  };
  const locality = lifePlaceByKey("4840342")!;
  const input: CoreInput = {
    seed: "bounded-historical-public-owner-fixture",
    startedAt: date,
    people: [
      {
        id: "fixture-person",
        givenName: "Morgan",
        familyName: "Bennett",
        birthDate: "1980-01-01",
        placeId: locality.context.jurisdiction.id,
        countyId: organization.placeId,
        householdId: "fixture-household",
        tier: "weekly",
        traits: {},
        liquidMinor: p("minorPerDollar"),
        livingCostDailyMinor: p("zero"),
        source: { ...fixtureSource, asOf: date },
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      {
        id: "fixture-household",
        placeId: locality.context.jurisdiction.id,
        memberIds: ["fixture-person"],
        source: { ...fixtureSource, asOf: date },
      },
    ],
    jobs: [],
    organizations: [organization],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  return { request, organization, input, locality };
}

describe("actual observed county identity projected once at opening", () => {
  it("retains the exact 2017 GID/PID/county/date source on the existing account", () => {
    const request = projectionInput();
    const before = structuredClone(request);
    const result = openingHistoricalCountyOwnerFacts(request);
    expect(result.governmentFacts?.governmentKey).toBe("gus2025:194116");
    expect(result.governmentFacts?.governmentJurisdictionId).toBe(
      "jurisdiction_d7c59c46f6a28e90",
    );
    expect(
      result.governmentFacts?.["openingPublicOwner.censusGovernmentId"],
    ).toBe("44110810800000");
    expect(result.governmentFacts?.["openingPublicOwner.recordedName"]).toBe(
      "COUNTY OF HIDALGO",
    );
    expect(result.identitySource?.tag).toBe("SOURCED");
    expect(result.identitySource?.asOf).toBe("2017-06-30");
    expect(
      JSON.parse(
        result.governmentFacts!["openingPublicOwner.projectionSource"]!,
      ).tag,
    ).toBe("ESTIMATED");
    expect(
      JSON.parse(
        result.governmentFacts!["openingPublicOwner.projectionSource"]!,
      ).asOf,
    ).toBe(at);
    expect(request).toEqual(before);
  });

  it("does not infer ownership of the separate authored public-works employer", () => {
    const request = projectionInput();
    const result = openingHistoricalCountyOwnerFacts({
      ...request,
      organizationId: "authored-public-works",
      organizationStableKey:
        "town-employment-v1:fixture:employer:public-works:0",
      classification: "sector:local-government-office",
      name: "La Homa Public Works Department",
    });
    expect(result.governmentFacts).toBeUndefined();
  });

  it("rejects an account ID copied onto another employer", () => {
    const result = openingHistoricalCountyOwnerFacts({
      ...projectionInput(),
      organizationId: "authored-public-works",
    });
    expect(result.governmentFacts).toBeUndefined();
    expect(result.gaps).toContain(
      "opening-public-owner:county-account-id-does-not-match-record:authored-public-works",
    );
  });

  it("keeps a missing historical identity unsupported", () => {
    const result = openingHistoricalCountyOwnerFacts(projectionInput(), {
      ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
      recordsByPublisherPid6: {},
    });
    expect(result.governmentFacts).toBeUndefined();
    expect(
      result.gaps.some((gap) =>
        gap.includes("historical-county-identity-source-missing"),
      ),
    ).toBe(true);
  });

  it("does not backdate a source observed after the opening", () => {
    const result = openingHistoricalCountyOwnerFacts(
      projectionInput("2016-01-01"),
    );
    expect(result.governmentFacts).toBeUndefined();
    expect(
      result.gaps.some((gap) =>
        gap.includes("historical-identity-source-after-opening"),
      ),
    ).toBe(true);
  });

  it.each(["name", "stateUsps", "countyGeoid"] as const)(
    "rejects a mismatched historical %s",
    (field) => {
      const data: HistoricalCountyOwnerData = {
        ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
        recordsByPublisherPid6: {
          ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.recordsByPublisherPid6,
          "194116": {
            ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.recordsByPublisherPid6[
              "194116"
            ]!,
            [field]: "wrong-record",
          },
        },
      };
      expect(
        openingHistoricalCountyOwnerFacts(projectionInput(), data)
          .governmentFacts,
      ).toBeUndefined();
    },
  );

  it("rejects a blank citation rather than supplying an unqualified identity", () => {
    const data = {
      ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
      source: { ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.source, citation: "  " },
    };
    expect(
      openingHistoricalCountyOwnerFacts(projectionInput(), data)
        .governmentFacts,
    ).toBeUndefined();
  });

  it("rejects mismatched source dates and a missing raw-source hash", () => {
    expect(
      openingHistoricalCountyOwnerFacts(projectionInput(), {
        ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
        source: { ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.source, asOf: at },
      }).governmentFacts,
    ).toBeUndefined();
    expect(
      openingHistoricalCountyOwnerFacts(projectionInput(), {
        ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
        provenance: {
          ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.provenance,
          archiveSha256: "",
        },
      }).governmentFacts,
    ).toBeUndefined();
  });

  it("keeps a known national name discrepancy unsupported rather than silently normalizing punctuation", () => {
    const unit = governmentUnit("gus2025:211245")!;
    const base = projectionInput();
    const organizationStableKey = `local-government:${unit.id}`;
    const result = openingHistoricalCountyOwnerFacts({
      ...base,
      organizationStableKey,
      organizationId: createStableId(
        "organization",
        `${base.worldId}:${organizationStableKey}`,
      ),
      name: governmentUnitRecordedName(unit),
      placeId: governmentUnitJurisdictionId(unit),
    });
    expect(result.governmentFacts).toBeUndefined();
    expect(
      result.gaps.some((gap) =>
        gap.includes("historical-county-identity-record-mismatch"),
      ),
    ).toBe(true);
  });

  it("rejects a wrong canonical jurisdiction and a renamed workplace", () => {
    const locality = lifePlaceByKey("4840342")!;
    expect(
      openingHistoricalCountyOwnerFacts({
        ...projectionInput(),
        placeId: locality.context.jurisdiction.id,
      }).governmentFacts,
    ).toBeUndefined();
    expect(
      openingHistoricalCountyOwnerFacts({
        ...projectionInput(),
        name: "Invented local public office",
      }).governmentFacts,
    ).toBeUndefined();
  });
});

describe("represented county-to-place purchase coverage", () => {
  it("uses recorded county IDs and the actual county/CDP relation without relabeling the owner", () => {
    const { organization, input, locality } = fixture();
    const before = structuredClone(input);
    const result = openingHistoricalCountyPurchaseCoverage(organization, input);
    expect(result.rows).toHaveLength(p("one"));
    expect(result.rows[p("zero")]!.placeId).toBe(
      locality.context.jurisdiction.id,
    );
    expect(result.rows[p("zero")]!.representedResidentCount).toBe(p("one"));
    expect(result.rows[p("zero")]!.basisRecordIds).toContain(
      "census-2020-place-county:4840342:48215",
    );
    expect(result.rows[p("zero")]!.identitySource.asOf).toBe("2017-06-30");
    expect(result.rows[p("zero")]!.coverageSource.tag).toBe("ESTIMATED");
    expect(result.rows[p("zero")]!.coverageSource.citation).toContain(
      "publication 2021-08-12",
    );
    expect(result.rows[p("zero")]!.coverageSource.estimatedFrom).toContain(
      "retrospective generation prior",
    );
    expect(organization.placeId).toBe("jurisdiction_d7c59c46f6a28e90");
    expect(input).toEqual(before);
  });

  it("does not cover a person with unrecorded county membership", () => {
    const { organization, input } = fixture();
    const result = openingHistoricalCountyPurchaseCoverage(organization, {
      ...input,
      people: input.people.map((person) => ({
        ...person,
        countyId: undefined,
      })),
    });
    expect(result.rows).toEqual([]);
  });

  it("rejects a countyId whose purported home place is outside the recorded county relation", () => {
    const { organization, input } = fixture();
    const outside = lifePlaceByKey("3200500")!;
    const result = openingHistoricalCountyPurchaseCoverage(organization, {
      ...input,
      people: input.people.map((person) => ({
        ...person,
        placeId: outside.context.jurisdiction.id,
      })),
    });
    expect(result.rows).toEqual([]);
    expect(
      result.gaps.some((gap) =>
        gap.includes("county-to-place-membership-unverified"),
      ),
    ).toBe(true);
  });

  it("keeps a future geographic observation out of an earlier CDP opening", () => {
    const { organization, input } = fixture("2019-01-01");
    expect(
      openingHistoricalCountyPurchaseCoverage(organization, input).rows,
    ).toEqual([]);
  });

  it("rejects unpinned geographic provenance before reaching a CDP", () => {
    const { organization, input } = fixture();
    const result = openingHistoricalCountyPurchaseCoverage(
      organization,
      input,
      {
        ...DEFAULT_OPENING_PUBLIC_OWNER_DATA,
        purchaseCoverageGeography: {
          ...DEFAULT_OPENING_PUBLIC_OWNER_DATA.purchaseCoverageGeography,
          corpusSha256: "wrong-corpus",
        },
      },
    );
    expect(result.rows).toEqual([]);
    expect(
      result.gaps.some((gap) =>
        gap.includes("county-to-place-membership-unverified"),
      ),
    ).toBe(true);
  });

  it("rejects altered stored date/provenance before binding purchases", () => {
    const { organization, input } = fixture();
    const result = openingHistoricalCountyPurchaseCoverage(
      {
        ...organization,
        governmentFacts: {
          ...organization.governmentFacts,
          "openingPublicOwner.observedAt": "2025-06-30",
        },
      },
      input,
    );
    expect(result.rows).toEqual([]);
    expect(
      result.gaps.some((gap) =>
        gap.includes("county-purchase-identity-unverified"),
      ),
    ).toBe(true);
  });
});
