import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  openWeeklyListings,
  PUBLIC_BODY_ROLE_PLACEHOLDER,
  townEmployerRoles,
} from "./job-market";
import { createWorkRelationship, recordWorkStatus } from "./life";
import { organizationProfileAt, workStatusAt } from "./life-queries";
import { lifePlaceStateIdentities } from "./life-places";
import { stateMedianAnnualWage } from "./living-world/town-pay";
import {
  ensureHomeLocalGovernments,
  homeLocalGovernmentUnits,
  localGovernmentOrganizationKey,
} from "./nationwide-world/local-governments";
import { createWorkCompensation, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { pickDistinct, SeededRng } from "./rng";
import type { EntityId, World } from "./types";

const SEED = "a41-sourced-vacant-public-offer-all56";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const role = PUBLIC_BODY_ROLE_PLACEHOLDER;
const offeredHours =
  (role.weeklyHours.minimumHours + role.weeklyHours.maximumHours) / 2;
const provenance = {
  kind: "authored" as const,
  note: "A41 authored actual public-employer work/pay control, not observed government wages or a natural hire.",
};

function fixture(place: string) {
  const game = smallWorld({
    place,
    date: "2026-01-20",
    seed: `${SEED}:${place}`,
  });
  const world = ensureHomeLocalGovernments(game.world, game.personId);
  const units = homeLocalGovernmentUnits(world, game.personId);
  const keys = new Set(
    [...units.municipal, ...units.counties].map(localGovernmentOrganizationKey),
  );
  const ids = new Set(
    world.history.organizations
      .filter((organization) => keys.has(organization.stableKey))
      .map((organization) => organization.id),
  );
  return { ...game, world, ids };
}

function publicRoles(world: World, personId: EntityId, ids: Set<EntityId>) {
  return townEmployerRoles(world, personId).filter((offer) =>
    ids.has(offer.organizationId),
  );
}

describe("A41 sourced vacant public-body offers", () => {
  it.each(places)(
    "records the actual sourced median or no unsupported employer in $jurisdictionKey",
    (place) => {
      const game = fixture(place.jurisdictionKey);
      const before = serializeWorld(game.world);
      const offers = publicRoles(game.world, game.personId, game.ids);
      const expected = [...game.ids].filter((id) => {
        const profile = organizationProfileAt(game.world, id);
        return (
          profile?.locationJurisdictionId &&
          stateMedianAnnualWage(
            role.occupationClassification,
            profile.locationJurisdictionId,
          ) !== null
        );
      });
      expect(offers.map((offer) => offer.organizationId).sort()).toEqual(
        expected.sort(),
      );
      for (const offer of offers) {
        const median = stateMedianAnnualWage(
          role.occupationClassification,
          offer.jurisdictionId,
        );
        expect(median).not.toBeNull();
        expect(offer.annualMinor).toBe(
          Math.round((median! * 100 * offeredHours) / 40),
        );
        expect(offer.source).toBe("public-body-profile");
        expect(offer.weeklyHours).toEqual(role.weeklyHours);
        expect(offer.title).toBe(role.title);
        expect(offer.occupationClassification).toBe(
          role.occupationClassification,
        );
      }
      // Querying creates no offer, pay, worker or employer facts.
      expect(serializeWorld(game.world)).toBe(before);
      const opened = openWeeklyListings(game.world, game.personId);
      const recorded = (opened.history.jobOpenings ?? []).filter((opening) =>
        game.ids.has(opening.organizationId),
      );
      expect(recorded).toHaveLength(offers.length);
      for (const opening of recorded) {
        expect(opening.pay.basis).toBe("hourly");
        expect(opening.pay.amount.minorUnits).toBeGreaterThan(0);
        expect(opening.provenance).toMatchObject({ kind: "authored" });
        if (opening.provenance.kind !== "authored")
          throw new Error("The estimate must retain its recorded note");
        expect(opening.provenance.note).toContain("ESTIMATE FROM SOURCE");
        expect(opening.provenance.note).toContain("BLS May 2025 OEWS");
        expect(opening.provenance.note).toContain("https://www.bls.gov/oes/");
        expect(opening.provenance.note).toContain(opening.jurisdictionId);
        expect(opening.provenance.note).toContain(
          "not an observed employer pay scale",
        );
      }
      expect(opened.history.resourceTransferOutcomes).toEqual(
        game.world.history.resourceTransferOutcomes,
      );
      expect(serializeWorld(openWeeklyListings(opened, game.personId))).toBe(
        serializeWorld(opened),
      );
      const resumed = deserializeWorld(serializeWorld(opened));
      expect(serializeWorld(openWeeklyListings(resumed, game.personId))).toBe(
        serializeWorld(opened),
      );
    },
  );

  it.each(places.slice(0, 5))(
    "prefers saved employer pay and retains earlier openings in $jurisdictionKey",
    (place) => {
      const game = fixture(place.jurisdictionKey);
      const offer = publicRoles(game.world, game.personId, game.ids)[0];
      if (!offer) {
        expect(game.ids.size).toBe(0);
        expect(publicRoles(game.world, game.personId, game.ids)).toEqual([]);
        return; // Actual missing government binding, not invented employer evidence.
      }
      const opened = openWeeklyListings(game.world, game.personId);
      let world = createWorkRelationship(opened, {
        stableKey: `${SEED}:actual-public-staff`,
        personId: game.personId,
        organizationId: offer.organizationId,
        startedAt: opened.currentDate,
        kind: "employment:civil-service",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: role.title,
          occupationClassification: role.occupationClassification,
          locationJurisdictionId: offer.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "rigid",
            interruptibility: "limited",
            locationJurisdictionId: offer.jurisdictionId,
          },
        },
      });
      const work = world.history.workRelationships.at(-1)!;
      // An authored $35/hour actual agreement, not a researched employer rate.
      world = createWorkCompensation(world, {
        stableKey: `${SEED}:actual-public-pay`,
        workRelationshipId: work.id,
        startsAt: world.currentDate,
        amount: money(140_000, "USD"),
        cadenceKind: "schedule:weekly",
        restrictionKind: null,
        jurisdictionId: offer.jurisdictionId,
        provenance,
      });
      const revised = publicRoles(world, game.personId, game.ids).find(
        (candidate) => candidate.organizationId === offer.organizationId,
      )!;
      expect(revised.annualMinor).toBe(3500 * 52 * offeredHours);
      expect(revised.source).toBe("staff-pay");
      expect(world.history.jobOpenings).toEqual(opened.history.jobOpenings);
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(publicRoles(reloaded, game.personId, game.ids)).toEqual(
        publicRoles(world, game.personId, game.ids),
      );
      const status = workStatusAt(world, work.id)!;
      const ended = recordWorkStatus(world, {
        stableKey: `${SEED}:actual-public-staff-ended`,
        workRelationshipId: work.id,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: "Authored ended-work reader control",
        provenance,
        supersedesStatusId: status.id,
      });
      expect(publicRoles(ended, game.personId, game.ids)).toEqual(
        publicRoles(opened, game.personId, game.ids),
      );
    },
  );

  it.todo(
    "Your Money: natural application, hire and first payday from an estimated public opening",
  );
});
