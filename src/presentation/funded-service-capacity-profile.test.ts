import { describe, expect, it } from "vitest";
import {
  availableMeasureSteps,
  createLegislativeScenario,
  measurePosition,
} from "../simulation";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
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
import { addDays } from "../simulation/dates";
import { addYears } from "../simulation/legislation-drafting";
import type { PublicProgramAppropriationRecord } from "../simulation/types";

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
    // The law takes effect on its own saved date, not the day it passes, so
    // the money is on the record from enactment and open to an office only
    // once that date arrives.
    const enactment = world.history.legislativeEnactments!.find(
      (record) => record.measureId === measureId,
    )!;
    const appropriation = (world.history.publicProgramRecords ?? []).find(
      (record): record is PublicProgramAppropriationRecord =>
        record.kind === "appropriation" && record.sourceMeasureId === measureId,
    );
    expect(appropriation?.amount.minorUnits).toBe(
      profile.appropriation.amountMinorUnits,
    );
    expect(enactment.effectiveAt).toBeTruthy();
    expect(appropriation?.availableFrom).toBe(enactment.effectiveAt);
    expect(enactment.effectiveAt! > world.currentDate).toBe(true);
    expect(
      openAppropriationsFor(world, jurisdictionId).some(
        (record) => record.sourceMeasureId === measureId,
      ),
    ).toBe(false);
    // The bill's own stated term (one year) runs from the day the money
    // opens, its effective date, not from the day the bill was filed.
    expect(appropriation?.availableThrough).toBe(
      addDays(addYears(enactment.effectiveAt!, 1), -1),
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

    // The account holds the opening's fictional state cash and nothing else:
    // the enacted law itself adds no cash to it.
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    expect(account).not.toBeNull();
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: account!.organizationId },
        USD,
      )?.liquidBalance.minorUnits,
    ).toBe(
      worldOpeningRecord(opened)?.publicCashOpening?.stateByJurisdictionId[
        jurisdictionId
      ],
    );
    expect(
      world.history.publicProgramRecords?.filter(
        (record) =>
          record.kind === "capacity" &&
          record.programKey === profile.appropriation.programKey,
      ),
    ).toHaveLength(1);
  });
});
