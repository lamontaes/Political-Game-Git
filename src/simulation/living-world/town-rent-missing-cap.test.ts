import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../state-reference";
import { SeededRng } from "../rng";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { createHousehold, startHouseholdMembership } from "../life";
import { createDwelling, createHousingTenure } from "../resources";
import { resourceFlowTermsAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import * as laws from "../governing/law-in-force";
import * as housing from "./housing-market";
import {
  RENT_LAW_KEYS,
  renewTownLeases,
  startTownLeases,
  townLeases,
} from "./town-rent";

const seed = "team4-a57-missing-numeric-cap";
const places = Object.keys(STATES);
const place = new SeededRng(seed).pick(places);
const provenance = {
  kind: "authored" as const,
  note: "Controlled small-world lease fixture; no actual statutory eligibility claimed.",
};
afterEach(() => vi.restoreAllMocks());

function leaseWorld(restricted: boolean) {
  expect(places).toHaveLength(56);
  const small = smallWorld({
    place,
    seed,
    date: "2026-01-01",
    laws: [RENT_LAW_KEYS.rentStabilization],
  });
  // Controlled law input deliberately has no numeric term. The original reader
  // must refuse it; a yes answer never establishes a rate or CPI window.
  vi.spyOn(laws, "lawInForce").mockImplementation(
    (_world, _town, propositionId) =>
      restricted &&
      propositionId === small.propositionIds[RENT_LAW_KEYS.rentStabilization]
        ? {
            answer: "yes",
            origin: "in-force-at-start",
            measureId:
              `starting-law:US-${place}:${RENT_LAW_KEYS.rentStabilization}` as typeof small.personId,
            level: "state-statute",
            operativeAt: makeIsoDate("2026-01-01"),
            operativeBasis: "enacted-date",
          }
        : null,
  );
  vi.spyOn(housing, "homePriceLevel").mockImplementation(
    (_world, _town, day) => (day >= "2027-01-01" ? 1.4 : 1),
  );
  let world = createHousehold(small.world, {
    stableKey: "fixture:tenant-household",
    formedAt: small.world.currentDate,
    label: "Recorded tenant household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "fixture:tenant-membership",
    householdId,
    personId: small.personId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: "fixture:leased-home",
    establishedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: "Recorded rental home",
    classification: "residential:house",
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: "fixture:home-owner",
    dwellingId,
    holder: { kind: "person", personId: world.personOrder[2]! },
    startedAt: world.currentDate,
    kind: "ownership:owned",
    context: null,
    provenance,
  });
  world = createHousingTenure(world, {
    stableKey: "fixture:home-tenant",
    dwellingId,
    holder: { kind: "household", householdId },
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance,
  });
  world = startTownLeases(world, world.currentDate);
  const lease = townLeases(world).find((row) => row.dwellingId === dwellingId)!;
  expect(lease, `${place} seed=${seed}`).toBeDefined();
  expect(lease.flow.recipient).toEqual({
    kind: "person",
    personId: world.personOrder[2],
  });
  const day = makeIsoDate("2027-01-01");
  world = {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
  return { world, lease, day };
}

describe("a rent restriction without its numeric term", () => {
  it("preserves saved rent, landlord, transfers and renewal identity across repeat and canonical reload", () => {
    const { world, lease, day } = leaseWorld(true);
    const before = resourceFlowTermsAt(world, lease.flow.id)!;
    const changed = renewTownLeases(world, day);
    expect(changed).toBe(world);
    expect(resourceFlowTermsAt(changed, lease.flow.id)).toEqual(before);
    expect(changed.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(
      changed.history.resourceFlowTerms.some(
        (row) => row.stableKey === `${lease.flow.stableKey}:renewal:1`,
      ),
    ).toBe(false);
    expect(renewTownLeases(changed, day)).toBe(changed);
    const reopened = deserializeWorld(serializeWorld(changed));
    expect(renewTownLeases(reopened, day)).toBe(reopened);
    expect(townLeases(reopened)[0]!.flow.recipient).toEqual(
      lease.flow.recipient,
    );
    console.info(
      `A57 unresolved cap: place=${place}, seed=${seed}, rentMinor=${before.amount.minorUnits}; no renewal or transfer written.`,
    );
  });

  it("still renews an unrestricted lease at its saved market level, once", () => {
    const { world, lease, day } = leaseWorld(false);
    const old = resourceFlowTermsAt(world, lease.flow.id)!;
    const changed = renewTownLeases(world, day);
    expect(resourceFlowTermsAt(changed, lease.flow.id)!.amount.minorUnits).toBe(
      Math.round((old.amount.minorUnits * 1.4) / 100) * 100,
    );
    expect(
      changed.history.resourceFlowTerms.filter(
        (row) => row.stableKey === `${lease.flow.stableKey}:renewal:1`,
      ),
    ).toHaveLength(1);
    expect(renewTownLeases(changed, day)).toBe(changed);
    expect(changed.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    const reopened = deserializeWorld(serializeWorld(changed));
    expect(renewTownLeases(reopened, day)).toBe(reopened);
  });
});
