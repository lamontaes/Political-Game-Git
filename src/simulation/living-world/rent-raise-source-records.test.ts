import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { addDays } from "../dates";
import {
  createDwelling,
  createHousingTenure,
  money,
  recordResourceFlowTerms,
  recordResourceObligationState,
} from "../resources";
import { withWorldIntegrityDeferred } from "../world";
import type { World } from "../types";
import { startTownLeases, townLeases, rentRaiseRecordsFor } from "./town-rent";

const seed = "overflow6-recorded-rent-renewal";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
const provenance = {
  kind: "authored",
  note: "Controlled lease record fixture; no market rate or political effect is assumed.",
} as const;

describe(`saved rent renewal records (${place.jurisdictionKey}, seed ${seed})`, () => {
  it("reads the saved raised renewal, excludes other terms, and retains the loss after the obligation ends and records are restored", () => {
    expect(places).toHaveLength(56);
    const fixture = smallWorld({ place: place.jurisdictionKey, seed });
    const membership = fixture.world.history.householdMemberships.find(
      (row) => row.personId === fixture.personId,
    )!;
    expect(membership).toBeDefined();
    // The existing rent producer supplies the actual opening amount/landlord.
    const leased = withWorldIntegrityDeferred(() => {
      let world = createDwelling(fixture.world, {
        stableKey: "rent-source-fixture:home",
        establishedAt: fixture.world.currentDate,
        jurisdictionId: fixture.jurisdictionId,
        locationLabel: "Source-reader fixture home",
        classification: "residential:apartment",
        provenance,
      });
      world = createHousingTenure(world, {
        stableKey: "rent-source-fixture:tenure",
        holder: { kind: "household", householdId: membership.householdId },
        dwellingId: world.history.dwellings.at(-1)!.id,
        startedAt: world.currentDate,
        kind: "lease:rented",
        context: "Controlled saved lease for reader boundaries.",
        provenance,
      });
      return startTownLeases(world, world.currentDate);
    });
    const lease = townLeases(leased).find(
      (row) => row.householdId === membership.householdId,
    )!;
    // No fabricated fallback if this place has no producer-supported HUD row.
    expect(
      lease,
      `${place.jurisdictionKey}: actual rent producer must supply a lease`,
    ).toBeDefined();
    const initial = leased.history.resourceFlowTerms.find(
      (row) => row.resourceFlowId === lease.flow.id,
    )!;
    expect(rentRaiseRecordsFor(leased, lease.leaseholderId)).toEqual([]);
    const on = addDays(leased.currentDate, 1);
    const raised = withWorldIntegrityDeferred(() =>
      recordResourceFlowTerms(
        { ...leased, currentDate: on },
        {
          stableKey: `${lease.flow.stableKey}:renewal:1`,
          resourceFlowId: lease.flow.id,
          effectiveAt: on,
          status: "active",
          // One cent is an authored saved-term boundary, never a market rate.
          amount: money(initial.amount.minorUnits + 1, initial.amount.currency),
          cadenceKind: initial.cadenceKind,
          reason: "Authored renewal-term reader boundary.",
          provenance,
          supersedesTermsId: initial.id,
        },
      ),
    );
    const renewal = raised.history.resourceFlowTerms.at(-1)!;
    expect(rentRaiseRecordsFor(raised, lease.leaseholderId)).toEqual([
      { renewal, prior: initial },
    ]);
    expect(
      rentRaiseRecordsFor(raised, lease.leaseholderId, leased.currentDate),
    ).toEqual([]);
    const otherId = raised.personOrder.find(
      (id) => id !== lease.leaseholderId,
    )!;
    expect(rentRaiseRecordsFor(raised, otherId)).toEqual([]);
    const nonRenewal = withWorldIntegrityDeferred(() =>
      recordResourceFlowTerms(raised, {
        stableKey: `${lease.flow.stableKey}:correction`,
        resourceFlowId: lease.flow.id,
        effectiveAt: on,
        status: "active",
        amount: money(renewal.amount.minorUnits + 1, initial.amount.currency),
        cadenceKind: initial.cadenceKind,
        reason: "Authored non-renewal correction.",
        provenance,
        supersedesTermsId: renewal.id,
      }),
    );
    const corrected = nonRenewal.history.resourceFlowTerms.at(-1)!;
    const decreased = withWorldIntegrityDeferred(() =>
      recordResourceFlowTerms(nonRenewal, {
        stableKey: `${lease.flow.stableKey}:renewal:2`,
        resourceFlowId: lease.flow.id,
        effectiveAt: on,
        status: "active",
        amount: initial.amount,
        cadenceKind: initial.cadenceKind,
        reason: "Authored renewal decrease.",
        provenance,
        supersedesTermsId: corrected.id,
      }),
    );
    const obligation = decreased.history.resourceObligationStates.find(
      (row) => row.resourceObligationId === lease.obligationId,
    )!;
    const ended = withWorldIntegrityDeferred(() =>
      recordResourceObligationState(decreased, {
        stableKey: "rent-source-fixture:ended",
        resourceObligationId: lease.obligationId,
        effectiveAt: on,
        status: "ended",
        reason: "Lease ended after the recorded renewal.",
        provenance,
        supersedesStateId: obligation.id,
      }),
    );
    const saved = JSON.parse(JSON.stringify(ended)) as World;
    const before = JSON.stringify(saved);
    expect(rentRaiseRecordsFor(saved, lease.leaseholderId)).toEqual([
      { renewal, prior: initial },
    ]);
    expect(JSON.stringify(saved)).toBe(before);
  });

  it.todo(
    "actual renewTownLeases anniversary → raised terms when recorded market/law inputs cause a raise; no assumed rate",
  );
  it.todo(
    "raised terms → admitted existing scheduler → saved belief/vote/talk after Continue; missing sizes/responsibility decisions",
  );
});
