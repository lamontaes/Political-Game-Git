import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createWorld, advanceWorld } from "./world";
import { createOrganization, recordOrganizationProfile } from "./life";
import { currentLifeCutoff, organizationProfileAt } from "./life-queries";
import { stateJurisdictionForKey, lifePlaceByKey } from "./life-places";
import { STATES } from "./state-reference";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "./government-units";
import { municipalGovernments } from "./municipal-government";
import { publicGovernmentOrganizationKey } from "./public-government-identity";
import {
  publicTaxAccountForIdentity,
  publicTaxAccountForJurisdiction,
  publicTaxAccountEvidenceForIdentity,
} from "./tax-policy";
import { serializeWorld, deserializeWorld } from "./serialization";
import type { EntityId, PublicGovernmentIdentity, World } from "./types";

const date = makeIsoDate("2026-01-05");
const provenance = {
  kind: "authored" as const,
  note: "Controlled dated account evidence; no legal tax power inferred.",
};

function account(world: World, identity: PublicGovernmentIdentity) {
  const next = createOrganization(world, {
    stableKey: publicGovernmentOrganizationKey(identity),
    formedAt: date,
    provenance,
    initialProfile: {
      name: "Controlled public account",
      classification: "sector:government",
      locationJurisdictionId: identity.jurisdictionId,
    },
  });
  return {
    world: next,
    organizationId: next.history.organizations.at(-1)!.id,
    profile: next.history.organizationProfiles.at(-1)!,
  };
}

function reclassify(world: World, organizationId: EntityId) {
  const previous = organizationProfileAt(world, organizationId)!;
  return recordOrganizationProfile(world, {
    stableKey: `fixture:reclassified:${organizationId}`,
    organizationId,
    effectiveAt: world.currentDate,
    name: previous.name,
    classification: "sector:business",
    locationJurisdictionId: previous.locationJurisdictionId,
    provenance,
    supersedesProfileId: previous.id,
  });
}

describe("public accounts read saved ownership at an explicit historical cutoff", () => {
  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "preserves prior same-day profile and recipient identity in %s",
    (key) => {
      const jurisdiction = stateJurisdictionForKey(key)!;
      const identity = {
        kind: "jurisdiction" as const,
        jurisdictionId: jurisdiction.id,
      };
      const base = createWorld({
        seed: `dated-account:${key}`,
        currentDate: date,
        jurisdictions: [jurisdiction],
        people: [],
      });
      const beforeAccount = currentLifeCutoff(base);
      const saved = account(base, identity);
      const cutoff = currentLifeCutoff(saved.world);
      expect(publicTaxAccountForIdentity(saved.world, identity)).toEqual({
        organizationId: saved.organizationId,
      });
      expect(
        publicTaxAccountForJurisdiction(saved.world, jurisdiction.id),
      ).toEqual({
        organizationId: saved.organizationId,
      });
      const changed = reclassify(saved.world, saved.organizationId);
      const bytes = serializeWorld(changed);
      expect(publicTaxAccountForIdentity(changed, identity)).toBeNull();
      expect(
        publicTaxAccountForIdentity(changed, identity, beforeAccount),
      ).toBeNull();
      expect(publicTaxAccountForIdentity(changed, identity, cutoff)).toEqual({
        organizationId: saved.organizationId,
      });
      expect(
        publicTaxAccountForJurisdiction(changed, jurisdiction.id, cutoff),
      ).toEqual({ organizationId: saved.organizationId });
      expect(
        publicTaxAccountEvidenceForIdentity(changed, identity, cutoff),
      ).toEqual({
        organizationId: saved.organizationId,
        profileId: saved.profile.id,
        sourceRecordIds: [saved.organizationId, saved.profile.id],
      });
      expect(serializeWorld(changed)).toBe(bytes);
      const reloaded = deserializeWorld(bytes);
      expect(publicTaxAccountForIdentity(reloaded, identity, cutoff)).toEqual({
        organizationId: saved.organizationId,
      });
      expect(serializeWorld(reloaded)).toBe(bytes);
    },
  );

  it.each(
    Object.keys(STATES).filter((usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`);
      const executive = chiefExecutiveJurisdiction(usps);
      return state && executive && state.id !== executive.id;
    }),
  )(
    "refuses a later duplicate alias but keeps the earlier account cutoff in %s",
    (usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`)!;
      const executive = chiefExecutiveJurisdiction(usps)!;
      const identity = {
        kind: "jurisdiction" as const,
        jurisdictionId: state.id,
      };
      const saved = account(
        createWorld({
          seed: `dated-account:duplicate-alias:${usps}`,
          currentDate: date,
          jurisdictions: [state, executive],
          people: [],
        }),
        identity,
      );
      const cutoff = currentLifeCutoff(saved.world);
      const duplicated = account(saved.world, {
        kind: "jurisdiction",
        jurisdictionId: executive.id,
      }).world;
      expect(publicTaxAccountForIdentity(duplicated, identity)).toBeNull();
      expect(publicTaxAccountForIdentity(duplicated, identity, cutoff)).toEqual(
        {
          organizationId: saved.organizationId,
        },
      );
      const bytes = serializeWorld(duplicated);
      const reloaded = deserializeWorld(bytes);
      expect(publicTaxAccountForIdentity(reloaded, identity)).toBeNull();
      expect(publicTaxAccountForIdentity(reloaded, identity, cutoff)).toEqual({
        organizationId: saved.organizationId,
      });
      expect(serializeWorld(reloaded)).toBe(bytes);
    },
  );

  it("uses the saved date as well as sequence without rewriting a frozen recipient", () => {
    const jurisdiction = stateJurisdictionForKey("US-CT")!;
    const identity = {
      kind: "jurisdiction" as const,
      jurisdictionId: jurisdiction.id,
    };
    const saved = account(
      createWorld({
        seed: "dated-account:next-day",
        currentDate: date,
        jurisdictions: [jurisdiction],
        people: [],
      }),
      identity,
    );
    const later = reclassify(
      advanceWorld(saved.world, 1),
      saved.organizationId,
    );
    const cutoff = {
      asOfDate: date,
      historySequenceExclusive: later.history.nextSequence,
    };
    expect(publicTaxAccountForIdentity(later, identity, cutoff)).toEqual({
      organizationId: saved.organizationId,
    });
    expect(publicTaxAccountForIdentity(later, identity)).toBeNull();
  });

  it("returns unsupported for a missing account rather than creating an alias", () => {
    const jurisdiction = stateJurisdictionForKey("US-AK")!;
    const world = createWorld({
      seed: "dated-account:missing",
      currentDate: date,
      jurisdictions: [jurisdiction],
      people: [],
    });
    const bytes = serializeWorld(world);
    expect(
      publicTaxAccountForJurisdiction(
        world,
        jurisdiction.id,
        currentLifeCutoff(world),
      ),
    ).toBeNull();
    expect(serializeWorld(world)).toBe(bytes);
  });

  it("retains the explicit compiled local key rather than a state account", () => {
    const unit = allGovernmentUnits().find(
      (row) =>
        row.functionalActive &&
        row.unitType === "municipality" &&
        row.placeGeoid &&
        lifePlaceByKey(row.placeGeoid)?.context.jurisdiction.id ===
          governmentUnitJurisdictionId(row),
    )!;
    const jurisdiction = lifePlaceByKey(unit.placeGeoid!)!.context.jurisdiction;
    const state = stateJurisdictionForKey(`US-${unit.stateUsps}`)!;
    const identity = {
      kind: "local-government" as const,
      governmentKey: unit.id,
      jurisdictionId: jurisdiction.id,
    };
    const saved = account(
      createWorld({
        seed: "dated-account:local",
        currentDate: date,
        jurisdictions: [state, jurisdiction],
        people: [],
      }),
      identity,
    );
    const cutoff = currentLifeCutoff(saved.world);
    const changed = reclassify(saved.world, saved.organizationId);
    expect(publicTaxAccountForIdentity(changed, identity, cutoff)).toEqual({
      organizationId: saved.organizationId,
    });
    expect(
      publicTaxAccountForJurisdiction(changed, state.id, cutoff),
    ).toBeNull();
  });

  it("uses earlier municipal identity and account profiles at the same cutoff", () => {
    const government = municipalGovernments().find(
      (row) =>
        !row.key.startsWith("gus2025:") &&
        row.placeGeoid &&
        lifePlaceByKey(row.placeGeoid),
    )!;
    expect(government).toBeDefined();
    const jurisdiction = lifePlaceByKey(government.placeGeoid!)!.context
      .jurisdiction;
    const other = stateJurisdictionForKey("US-NJ")!;
    const identity = {
      kind: "local-government" as const,
      governmentKey: government.key,
      jurisdictionId: jurisdiction.id,
    };
    let world = createOrganization(
      createWorld({
        seed: "dated-account:shared-boundary",
        currentDate: date,
        jurisdictions: [jurisdiction, other],
        people: [],
      }),
      {
        stableKey: `municipal-government:${government.key}`,
        formedAt: date,
        provenance,
        initialProfile: {
          name: government.key,
          classification: "sector:government",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    );
    const municipalId = world.history.organizations.at(-1)!.id;
    const saved = account(world, identity);
    const cutoff = currentLifeCutoff(saved.world);
    const previous = organizationProfileAt(saved.world, municipalId)!;
    world = recordOrganizationProfile(saved.world, {
      stableKey: "fixture:later-municipal-location",
      organizationId: municipalId,
      effectiveAt: date,
      name: previous.name,
      classification: previous.classification,
      locationJurisdictionId: other.id,
      provenance,
      supersedesProfileId: previous.id,
    });
    expect(organizationProfileAt(world, saved.organizationId, cutoff)!.id).toBe(
      saved.profile.id,
    );
    expect(publicTaxAccountForIdentity(world, identity, cutoff)).toEqual({
      organizationId: saved.organizationId,
    });
    expect(publicTaxAccountForIdentity(world, identity)).toBeNull();
    const bytes = serializeWorld(world);
    expect(
      publicTaxAccountForIdentity(deserializeWorld(bytes), identity, cutoff),
    ).toEqual({
      organizationId: saved.organizationId,
    });
    expect(serializeWorld(world)).toBe(bytes);
  });
});
