import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { createOrganization, recordOrganizationProfile } from "./life";
import { organizationProfileAt } from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  STATES,
  isTerritoryUsps,
  isFederalDistrictUsps,
} from "./state-reference";
import { createWorld, assertWorldIntegrityFully } from "./world";
import type {
  LifeRecordProvenance,
  PublicGovernmentIdentity,
  World,
} from "./types";

const JAN_3 = makeIsoDate("2026-01-03");
const JAN_4 = makeIsoDate("2026-01-04");
const JAN_5 = makeIsoDate("2026-01-05");
const JAN_6 = makeIsoDate("2026-01-06");

// These references are controlled fictional test fixtures, not government evidence.
const SOURCE: LifeRecordProvenance = {
  kind: "source-record",
  reference: "https://example.invalid/a50/fictional-employer-binding",
  asOf: JAN_4,
};
const AUTHORED: LifeRecordProvenance = {
  kind: "authored",
  note: "Fictional A50 profile fixture; no government authority.",
};
const REGIONS = Object.keys(STATES).sort();

function fixture(usps: string): World {
  const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
  if (!jurisdiction)
    throw new Error(`Missing canonical jurisdiction for ${usps}`);
  return createWorld({
    seed: `a50-profile-${usps}`,
    currentDate: JAN_5,
    jurisdictions: [jurisdiction],
    people: [],
  });
}

function organization(
  world: World,
  provenance = SOURCE,
  identity?: PublicGovernmentIdentity,
) {
  return createOrganization(world, {
    stableKey: "fixture:employer",
    formedAt: JAN_4,
    provenance,
    initialProfile: {
      name: "Fictional public employer",
      classification: "sector:government",
      locationJurisdictionId: world.jurisdictionOrder[0]!,
      ...(identity ? { publicGovernmentIdentity: identity } : {}),
    },
  });
}

function later(
  world: World,
  provenance = SOURCE,
  identity?: PublicGovernmentIdentity,
) {
  const prior = world.history.organizationProfiles.at(-1)!;
  return recordOrganizationProfile(world, {
    stableKey: "fixture:employer:later",
    organizationId: prior.organizationId,
    effectiveAt: JAN_5,
    name: "Fictional later employer profile",
    classification: "sector:government",
    locationJurisdictionId: prior.locationJurisdictionId,
    provenance,
    supersedesProfileId: prior.id,
    ...(identity ? { publicGovernmentIdentity: identity } : {}),
  });
}

describe("source-backed optional public employer profile identity", () => {
  it("covers all fifty states, DC, and five inhabited territories", () => {
    expect(REGIONS).toHaveLength(56);
    expect(REGIONS.filter(isTerritoryUsps)).toHaveLength(5);
    expect(REGIONS.filter(isFederalDistrictUsps)).toEqual(["DC"]);
    expect(
      REGIONS.filter(
        (code) => !isTerritoryUsps(code) && !isFederalDistrictUsps(code),
      ),
    ).toHaveLength(50);
  });

  it.each(REGIONS)(
    "%s keeps omitted identities absent without inferring from classification or location",
    (usps) => {
      const world = organization(fixture(usps), AUTHORED);
      const profile = world.history.organizationProfiles[0]!;
      const before = serializeWorld(world);
      expect(Object.hasOwn(profile, "publicGovernmentIdentity")).toBe(false);
      expect(
        organizationProfileAt(world, profile.organizationId)
          ?.publicGovernmentIdentity,
      ).toBeUndefined();
      expect(serializeWorld(world)).toBe(before);
      const restored = deserializeWorld(before);
      expect(
        Object.hasOwn(
          restored.history.organizationProfiles[0]!,
          "publicGovernmentIdentity",
        ),
      ).toBe(false);
      expect(serializeWorld(restored)).toBe(before);
    },
  );

  it.each(REGIONS)(
    "%s stores a cloned source-backed jurisdiction identity",
    (usps) => {
      const base = fixture(usps);
      const identity = {
        kind: "jurisdiction" as const,
        jurisdictionId: base.jurisdictionOrder[0]!,
      };
      const world = organization(base, SOURCE, identity);
      const profile = world.history.organizationProfiles[0]!;
      expect(profile.publicGovernmentIdentity).toEqual(identity);
      expect(profile.publicGovernmentIdentity).not.toBe(identity);
      identity.jurisdictionId = createStableId(
        "jurisdiction",
        "a50-fixture:mutated-after-write",
      );
      expect(profile.publicGovernmentIdentity?.jurisdictionId).toBe(
        base.jurisdictionOrder[0],
      );
      expect(() => assertWorldIntegrityFully(world)).not.toThrow();

      const replacement = {
        kind: "jurisdiction" as const,
        jurisdictionId: base.jurisdictionOrder[0]!,
      };
      const updated = later(world, SOURCE, replacement);
      expect(
        updated.history.organizationProfiles[1]!.publicGovernmentIdentity,
      ).toEqual(replacement);
      expect(
        updated.history.organizationProfiles[1]!.publicGovernmentIdentity,
      ).not.toBe(replacement);
      replacement.jurisdictionId = createStableId(
        "jurisdiction",
        "a50-fixture:mutated-later-input",
      );
      expect(
        updated.history.organizationProfiles[1]!.publicGovernmentIdentity
          ?.jurisdictionId,
      ).toBe(base.jurisdictionOrder[0]);
    },
  );

  it.each(REGIONS)(
    "%s uses profile date and exclusive append sequence and clears omitted later bindings",
    (usps) => {
      const base = fixture(usps);
      const identity: PublicGovernmentIdentity = {
        kind: "jurisdiction",
        jurisdictionId: base.jurisdictionOrder[0]!,
      };
      const initial = organization(base, SOURCE, identity);
      const first = initial.history.organizationProfiles[0]!;
      const updated = later(initial);
      const second = updated.history.organizationProfiles[1]!;
      const id = first.organizationId;
      expect(
        organizationProfileAt(updated, id, {
          asOfDate: JAN_3,
          historySequenceExclusive: updated.history.nextSequence,
        }),
      ).toBeUndefined();
      expect(
        organizationProfileAt(updated, id, {
          asOfDate: JAN_4,
          historySequenceExclusive: updated.history.nextSequence,
        })?.id,
      ).toBe(first.id);
      expect(
        organizationProfileAt(updated, id, {
          asOfDate: JAN_5,
          historySequenceExclusive: first.sequence,
        }),
      ).toBeUndefined();
      expect(
        organizationProfileAt(updated, id, {
          asOfDate: JAN_5,
          historySequenceExclusive: second.sequence,
        })?.publicGovernmentIdentity,
      ).toEqual(identity);
      expect(
        organizationProfileAt(updated, id, {
          asOfDate: JAN_5,
          historySequenceExclusive: second.sequence + 1,
        })?.id,
      ).toBe(second.id);
      expect(Object.hasOwn(second, "publicGovernmentIdentity")).toBe(false);
      expect(
        organizationProfileAt(updated, id)?.publicGovernmentIdentity,
      ).toBeUndefined();
      const restored = deserializeWorld(serializeWorld(updated));
      expect(
        organizationProfileAt(restored, id)?.publicGovernmentIdentity,
      ).toBeUndefined();
      expect(
        organizationProfileAt(restored, id, {
          asOfDate: JAN_4,
          historySequenceExclusive: restored.history.nextSequence,
        })?.publicGovernmentIdentity,
      ).toEqual(identity);
    },
  );

  it.each(REGIONS)(
    "%s rejects unsupported identity authority in both writers",
    (usps) => {
      const base = fixture(usps);
      const identity: PublicGovernmentIdentity = {
        kind: "jurisdiction",
        jurisdictionId: base.jurisdictionOrder[0]!,
      };
      expect(() => organization(base, AUTHORED, identity)).toThrow();
      expect(() =>
        organization(base, { ...SOURCE, asOf: JAN_5 }, identity),
      ).toThrow();
      const valid = organization(base, SOURCE, identity);
      expect(() => later(valid, AUTHORED, identity)).toThrow();
      expect(() =>
        later(valid, { ...SOURCE, asOf: JAN_6 }, identity),
      ).toThrow();
      const invalid: PublicGovernmentIdentity = {
        kind: "local-government",
        jurisdictionId: base.jurisdictionOrder[0]!,
        governmentKey: "fixture:a50:nonexistent-government",
      };
      expect(() => organization(base, SOURCE, invalid)).toThrow();
      expect(() => later(valid, SOURCE, invalid)).toThrow();
      const missing: PublicGovernmentIdentity = {
        kind: "jurisdiction",
        jurisdictionId: createStableId(
          "jurisdiction",
          "a50-fixture:missing-jurisdiction",
        ),
      };
      expect(() => organization(base, SOURCE, missing)).toThrow();
      expect(() => later(valid, SOURCE, missing)).toThrow();
    },
  );

  it.each(REGIONS)(
    "%s fully checks forged profile provenance independently of writer validation",
    (usps) => {
      const base = fixture(usps);
      const identity: PublicGovernmentIdentity = {
        kind: "jurisdiction",
        jurisdictionId: base.jurisdictionOrder[0]!,
      };
      const valid = organization(base, SOURCE, identity);
      for (const provenance of [AUTHORED, { ...SOURCE, asOf: JAN_5 }]) {
        const forged: World = {
          ...valid,
          history: {
            ...valid.history,
            organizationProfiles: valid.history.organizationProfiles.map(
              (profile) => ({ ...profile, provenance }),
            ),
          },
        };
        expect(() => assertWorldIntegrityFully(forged)).toThrow();
      }
    },
  );
});
