import { describe, expect, it } from "vitest";
import {
  addDays,
  availableMeasureSteps,
  createLegislativeScenario,
  measurePosition,
} from "../simulation";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import { ensureWorldStartingConditions } from "../simulation/world-setup/conditions";
import { stateTaxServiceProfileForJurisdictionKey } from "../simulation/world-setup/state-tax-service-profiles";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { openAppropriationsFor } from "../simulation/governing/program-governing";
import {
  programCapacity,
  programPosition,
} from "../simulation/governing/public-program";
import { applyLegislativeStep } from "./legislation-session";
import { fileDraft } from "./legislation-docket";
import { publishLegislativeTransition } from "./publish-legislative-transition";

const USD = money(0, "USD").currency;

describe("enacted saved service profiles", () => {
  it("writes only the matched appropriation and starting capacity, without seeding cash", () => {
    const scenario = createLegislativeScenario("kentucky");
    const opened = ensureWorldStartingConditions(scenario.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const profile = stateTaxServiceProfileForJurisdictionKey(opened, "US-KY");
    expect(profile).not.toBeNull();
    if (!profile) throw new Error("Begin did not save the Kentucky profile.");
    expect(profile.capacity.basis.note).toContain("not a named school");
    expect(profile.capacity.basis.note).toContain("resident outcome");

    const jurisdictionId =
      opened.history.legislativeMeasures![0]!.jurisdictionId;
    const filed = fileDraft(opened, {
      scenarioKey: "kentucky",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId,
      familyKey: profile.appropriation.familyKey,
      variantKey: profile.appropriation.variantKey,
      authorityKey: profile.appropriation.authorityKey,
      parameterValues: {
        appropriation: {
          kind: "money",
          minorUnits: profile.appropriation.amountMinorUnits,
          currency: profile.capacity.currency,
        },
        "availability-term": { kind: "duration-years", years: 1 },
        "reporting-duty": {
          kind: "enumerated",
          value: "quarterly-statement",
        },
      },
    });
    const measureId = filed.bill.measureId;
    const context = { ...scenario, world: opened, measureId };
    let world = filed.world;
    for (
      let guard = 0;
      guard < 40 && measurePosition(world, measureId).phase !== "enacted";
      guard += 1
    ) {
      const step = availableMeasureSteps(world, measureId).find(
        (candidate) => candidate !== "offer-amendment",
      );
      if (!step) throw new Error("The authored bill has no next legal step.");
      world = publishLegislativeTransition(
        world,
        applyLegislativeStep(context, world, step).world,
      );
    }

    expect(measurePosition(world, measureId).outcome).toBe("enacted");
    const appropriation = openAppropriationsFor(world, jurisdictionId).find(
      (record) => record.sourceMeasureId === measureId,
    );
    expect(appropriation?.amount.minorUnits).toBe(
      profile.appropriation.amountMinorUnits,
    );
    expect(appropriation?.availableThrough).toBe(
      addDays(
        appropriation!.availableFrom,
        profile.appropriation.availabilityDays - 1,
      ),
    );

    const capacity = programCapacity(world, profile.appropriation.programKey);
    expect(capacity).toMatchObject({
      jurisdictionId,
      programKey: profile.appropriation.programKey,
      serviceLabel: profile.capacity.serviceLabel,
      unitLabel: profile.capacity.unitLabel,
      unitsTotal: profile.capacity.unitsTotal,
      unitsOperational: profile.capacity.unitsOperational,
      completedPermille: profile.capacity.completedPermille,
      basis: profile.capacity.basis,
    });
    expect(
      programPosition(world, profile.appropriation.programKey).uncommitted
        .minorUnits,
    ).toBe(profile.appropriation.amountMinorUnits);

    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    expect(account).not.toBeNull();
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: account!.organizationId },
        USD,
      )?.liquidBalance.minorUnits,
    ).toBe(0);
    expect(
      world.history.publicProgramRecords?.filter(
        (record) =>
          record.kind === "capacity" &&
          record.programKey === profile.appropriation.programKey,
      ),
    ).toHaveLength(1);
  });
});
