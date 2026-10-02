import { describe, expect, it } from "vitest";
import type { EducationInstitution } from "../education/types";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate } from "./dates";
import { createOrganization, recordOrganizationProfile } from "./life";
import { currentLifeCutoff, organizationProfileAt } from "./life-queries";
import { pickDistinct, SeededRng } from "./rng";
import { STATES } from "./state-reference";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import { recordSchoolEmployerGovernment } from "./school-employer-government";

const SEED = "a50-controlled-school-employer-government";
const places = pickDistinct(new SeededRng(SEED), Object.keys(STATES), 5);

// CONTROLLED fictional directory and employer evidence, not an acquired NCES
// row or a claim that this government actually employs school workers.
function fixture(place: string, associated = true) {
  const f = smallWorld({
    place,
    seed: `${SEED}:${place}`,
    date: "2026-01-05",
    people: 3,
  });
  const institution: EducationInstitution = {
    id: `fixture:school:${place}`,
    officialId: `fixture:${place}`,
    kind: "school",
    name: "Controlled directory school",
    city: "Controlled fixture city",
    state: place,
    stateFips: null,
    countyGeoid: null,
    parentDistrictId: "fixture:directory-parent-is-not-employer-evidence",
    sourceYear: "2025-26",
    release: "CONTROLLED fictional fixture",
    statusCode: "1",
    statusLabel: "Controlled open fixture",
    statusEffectiveDate: null,
    foundingDate: null,
    capabilities: [],
    openAdmissionPolicy: "unknown",
    evidence: [
      {
        artifactId: "fixture:directory",
        sha256: "a".repeat(64),
        member: "fixture.csv",
        row: 1,
      },
    ],
  };
  const world = createOrganization(f.world, {
    stableKey: associated
      ? `edu-path7:institution:${institution.id}`
      : `fixture:generated-school:${place}`,
    formedAt: "2026-01-04",
    provenance: {
      kind: "authored",
      note: "CONTROLLED fictional saved organization, not real employer evidence.",
    },
    initialProfile: {
      name: "Saved profile name",
      classification: "service:school",
      locationJurisdictionId: f.stateJurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const input = {
    stableKey: `fixture:employer-binding:${place}`,
    organizationId,
    institution,
    publicGovernmentIdentity: {
      kind: "jurisdiction" as const,
      jurisdictionId: f.stateJurisdictionId,
    },
    effectiveAt: makeIsoDate("2026-01-05"),
    provenance: {
      kind: "source-record" as const,
      reference: "fixture:independent-employer-evidence",
      asOf: makeIsoDate("2026-01-04"),
    },
  };
  return { world, input };
}

describe("controlled source-backed school employer profile binding", () => {
  it.each(places)(
    `preserves dated profiles and replay in %s (seed ${SEED})`,
    (place) => {
      const { world, input } = fixture(place);
      const before = organizationProfileAt(world, input.organizationId)!;
      const cutoff = currentLifeCutoff(world);
      const next = recordSchoolEmployerGovernment(world, input);
      expect(organizationProfileAt(next, input.organizationId)).toMatchObject({
        name: before.name,
        classification: before.classification,
        locationJurisdictionId: before.locationJurisdictionId,
        publicGovernmentIdentity: input.publicGovernmentIdentity,
        provenance: input.provenance,
        supersedesProfileId: before.id,
      });
      expect(organizationProfileAt(next, input.organizationId, cutoff)).toEqual(
        before,
      );
      expect(
        organizationProfileAt(next, input.organizationId, {
          asOfDate: makeIsoDate("2026-01-04"),
          historySequenceExclusive: next.history.nextSequence,
        }),
      ).toEqual(before);
      expect(next.history.organizationProfiles).toHaveLength(
        world.history.organizationProfiles.length + 1,
      );
      expect(next.history.resourcePositions).toEqual(
        world.history.resourcePositions,
      );
      expect(next.history.resourceFlows).toEqual(world.history.resourceFlows);
      expect(next.history.resourceObligations).toEqual(
        world.history.resourceObligations,
      );
      expect(next.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(recordSchoolEmployerGovernment(next, input)).toBe(next);
      const continued = deserializeWorld(serializeWorldPayload(next));
      expect(recordSchoolEmployerGovernment(continued, input)).toBe(continued);
      expect(continued.history.organizationProfiles).toEqual(
        next.history.organizationProfiles,
      );
      const binding = organizationProfileAt(continued, input.organizationId)!;
      const unavailable = recordOrganizationProfile(continued, {
        stableKey: `${input.stableKey}:employer-no-longer-recorded`,
        organizationId: input.organizationId,
        effectiveAt: input.effectiveAt,
        name: binding.name,
        classification: binding.classification,
        locationJurisdictionId: binding.locationJurisdictionId,
        provenance: {
          kind: "authored",
          note: "Controlled later profile without a recorded government employer.",
        },
        supersedesProfileId: binding.id,
      });
      expect(
        organizationProfileAt(unavailable, input.organizationId)
          ?.publicGovernmentIdentity,
      ).toBeUndefined();
      expect(recordSchoolEmployerGovernment(unavailable, input)).toBe(
        unavailable,
      );
      expect(
        organizationProfileAt(unavailable, input.organizationId)
          ?.publicGovernmentIdentity,
      ).toBeUndefined();
    },
  );

  it("refuses a generated school without the exact saved directory association", () => {
    const { world, input } = fixture(places[0]!, false);
    expect(() => recordSchoolEmployerGovernment(world, input)).toThrow();
  });

  it("refuses missing directory evidence, unsupported institution kind, and future directory vintage", () => {
    const { world, input } = fixture(places[0]!);
    for (const institution of [
      { ...input.institution, evidence: [] },
      { ...input.institution, kind: "postsecondary" as const },
      { ...input.institution, sourceYear: "2027-28" },
    ])
      expect(() =>
        recordSchoolEmployerGovernment(world, { ...input, institution }),
      ).toThrow();
  });

  it("refuses future source dates, nonexistent government identity, and reuse of a key for different evidence", () => {
    const { world, input } = fixture(places[0]!);
    expect(() =>
      recordSchoolEmployerGovernment(world, {
        ...input,
        provenance: { ...input.provenance, asOf: makeIsoDate("2026-01-06") },
      }),
    ).toThrow();
    expect(() =>
      recordSchoolEmployerGovernment(world, {
        ...input,
        publicGovernmentIdentity: {
          kind: "local-government",
          jurisdictionId: input.publicGovernmentIdentity.jurisdictionId,
          governmentKey: "fixture:uncompiled-schooldistrict",
        },
      }),
    ).toThrow();
    const next = recordSchoolEmployerGovernment(world, input);
    expect(() =>
      recordSchoolEmployerGovernment(next, {
        ...input,
        provenance: {
          ...input.provenance,
          reference: "fixture:different-employer-evidence",
        },
      }),
    ).toThrow();
  });

  it.todo(
    "binds a real school employer from the independent O2 source packet; directory parent alone supplies no employer authority",
  );
});
