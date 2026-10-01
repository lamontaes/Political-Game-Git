import { expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import {
  BUSINESS_WAGES_BASIS,
  BUSINESS_REVENUE_BASIS,
  OWNER_DRAW_BASIS,
  seatLocalBusinesses,
} from "./local-economy";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createProductionPolicyCatalog } from "./production-catalog";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity, createWorld } from "./world";

// The unchanged A37 five-place sample drawn from all 56 jurisdictions.
it.each(["1150000", "2836000", "5363000", "2938000", "3451000"])(
  "A37 binds %s's newly seated wages to the exact saved work, preserving other flows and dates",
  (placeKey) => {
    const place = requireLifePlace(placeKey);
    const seed = `a37-local-work-binding:${placeKey}`;
    const identities = createScenarioWorld(seed, place.context, {
      peopleCount: 3,
    });
    const before = createWorld({
      seed,
      currentDate: identities.currentDate,
      currentMoment: identities.currentMoment,
      people: Object.values(identities.people),
      jurisdictions: [
        place.context.jurisdiction,
        stateJurisdictionForKey(place.stateJurisdictionKey!)!,
        NATIONAL_ELECTION_JURISDICTION,
      ],
      policyCatalog: createProductionPolicyCatalog(),
    });
    const seated = seatLocalBusinesses(before, place.context.jurisdiction.id);
    const wages = seated.history.resourceFlows.filter(
      (flow) => flow.basisKind === BUSINESS_WAGES_BASIS,
    );
    expect(wages.length).toBeGreaterThan(0);
    const boundWorkIds = new Set<string>();
    for (const flow of wages) {
      expect(flow.basisReference.kind).toBe("work");
      if (flow.basisReference.kind !== "work")
        throw new Error("Missing actual saved worker binding");
      const workId = flow.basisReference.workRelationshipId;
      const work = seated.history.workRelationships.find(
        (row) => row.id === workId,
      )!;
      expect(work).toBeDefined();
      // This key was supplied by the same seating plan, not inferred from a title/person match.
      expect(work.stableKey).toBe(
        `${flow.stableKey.slice(0, -"wages".length)}work`,
      );
      expect(flow.source).toEqual({
        kind: "organization",
        organizationId: work.organizationId,
      });
      expect(flow.recipient).toEqual({
        kind: "person",
        personId: work.personId,
      });
      expect(work.sequence).toBeLessThan(flow.sequence);
      expect(work.startedAt <= flow.startsAt).toBe(true);
      expect(flow.startsAt).toBe(before.currentDate);
      const terms = seated.history.resourceFlowTerms.find(
        (row) => row.resourceFlowId === flow.id,
      )!;
      expect(terms.cadenceKind).toBe("schedule:monthly");
      expect(terms.effectiveAt).toBe(before.currentDate);
      expect(terms.amount.minorUnits).toBeGreaterThan(0);
      expect(boundWorkIds.has(work.id)).toBe(false);
      boundWorkIds.add(work.id);
    }
    for (const flow of seated.history.resourceFlows.filter(
      (row) =>
        row.basisKind === BUSINESS_REVENUE_BASIS ||
        row.basisKind === OWNER_DRAW_BASIS,
    )) {
      expect(flow.basisReference).toEqual({ kind: "general" });
      expect(flow.startsAt).toBe(before.currentDate);
      expect(
        seated.history.resourceFlowTerms.find(
          (row) => row.resourceFlowId === flow.id,
        )!.cadenceKind,
      ).toBe("schedule:monthly");
    }
    expect(seated.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    expect(seated.history.resourcePositions).toEqual(
      before.history.resourcePositions,
    );
    expect(seated.history.statutoryTaxLiabilities).toEqual(
      before.history.statutoryTaxLiabilities,
    );
    expect(seated.history.statutoryTaxPayments).toEqual(
      before.history.statutoryTaxPayments,
    );
    expect(seatLocalBusinesses(seated, place.context.jurisdiction.id)).toBe(
      seated,
    );
    assertWorldIntegrity(seated);
    const reopened = deserializeWorld(serializeWorld(seated));
    expect(
      serializeWorld(
        seatLocalBusinesses(reopened, place.context.jurisdiction.id),
      ),
    ).toBe(serializeWorld(seated));
  },
);
