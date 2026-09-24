import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { governmentUnit, governmentUnitsForPlace } from "./government-units";
import { requireLifePlace } from "./life-places";
import {
  LOCAL_FISCAL_GAME_AUTHORITY_VERSION,
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
  localFiscalGameAuthorityKey,
} from "./local-ordinance-game-profile";
import {
  admitLocalFiscalMeasure,
  localFiscalAuthorityFor,
} from "./local-fiscal-authority";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { ensureMunicipalCouncilOpening } from "./municipal-council-opening";
import {
  introduceMunicipalOrdinance,
  municipalSeats,
} from "./municipal-public-work";
import { placeMunicipalOrdinanceOnAgenda } from "./municipal-ordinance-procedure";
import { deserializeWorld, serializeWorld } from "./serialization";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;

function openedWorld(seed: string) {
  let world = createScenarioWorld(seed, place.context, { peopleCount: 8 });
  world = ensureMunicipalCouncilOpening(world, city.id);
  const sponsorPersonId = municipalSeats(world, city.id)[0]!.personId;
  return {
    world: {
      ...world,
      control: { kind: "person" as const, personId: sponsorPersonId },
    },
    sponsorPersonId,
  };
}

describe("local fiscal game authority", () => {
  it("binds only a matched city or county to its exact versioned pack and jurisdiction", () => {
    const county = governmentUnit("gus2025:100001")!;
    const township = governmentUnit("gus2025:101703")!;
    for (const unit of [city, county]) {
      const packId = `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
      const resolved = localFiscalGameAuthorityForRulePackId(packId);
      expect(resolved?.unit.id).toBe(unit.id);
      expect(resolved?.authority.rulePackId).toBe(packId);
      expect(resolved?.authority.authorityKey).toBe(
        `${unit.id}:${LOCAL_FISCAL_GAME_AUTHORITY_VERSION}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      );
      expect(resolved?.jurisdictionId).not.toBeNull();
    }
    expect(localFiscalGameAuthorityKey(township)).toBeNull();
    expect(
      localFiscalGameAuthorityForRulePackId(
        `${township.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      ),
    ).toBeNull();
    expect(
      localFiscalGameAuthorityForRulePackId("us-va-charlottesville-council-v1"),
    ).toBeNull();
  });

  it("keeps an opened council closed to a proposition absent from the saved world", () => {
    const { world } = openedWorld("local-fiscal-missing-proposition");
    const before = serializeWorld(world);
    const result = localFiscalAuthorityFor(
      world,
      city.id,
      "us-policy-positions:transportation-infrastructure.fix-it-first",
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "This world has no saved proposition under that exact key.",
    });
    expect(serializeWorld(world)).toBe(before);
  });

  it("refuses a fiscal measure without an exact saved proposition at agenda and reading admission", () => {
    const { world, sponsorPersonId } = openedWorld(
      "local-fiscal-measure-without-proposition",
    );
    const packId = `${city.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
    const filed = introduceMeasure(world, {
      stableKey: "local-fiscal:unmapped",
      jurisdictionId: place.context.jurisdiction.id,
      rulePackId: packId,
      designation: "ORD 1",
      shortTitle: "Unmapped appropriation",
      summary: "A proposed appropriation without an exact saved question.",
      origin: "member-introduction",
      subjectClass: "appropriation",
      originChamberKey: "council",
      sponsorPersonId,
    });
    const measure = filed.history.legislativeMeasures?.at(-1)!;
    expect(admitLocalFiscalMeasure(filed, city.id, measure.id).ok).toBe(false);
    const placed = placeMunicipalOrdinanceOnAgenda(filed, {
      governmentKey: city.id,
      measureId: measure.id,
    });
    expect(placed.ok).toBe(false);
    expect(placed.world).toBe(filed);
    expect(
      deserializeWorld(serializeWorld(filed)).history.legislativeMeasures?.at(
        -1,
      )?.id,
    ).toBe(measure.id);
  });

  it("does not let a general-policy label carry an amount-provided clause past the fiscal gate", () => {
    const { world } = openedWorld("local-fiscal-general-label");
    const filed = introduceMunicipalOrdinance(world, {
      governmentKey: city.id,
      designation: "ORD 2",
      shortTitle: "Mislabeled provision",
      summary: "A general label with a fiscal clause.",
    });
    expect(filed.ok).toBe(true);
    if (!filed.ok) throw new Error(filed.reason);
    const measure = filed.world.history.legislativeMeasures?.at(-1)!;
    const withClause = recordFiledProvision(filed.world, {
      stableKey: `${measure.stableKey}:amount-provided`,
      measureId: measure.id,
      provisionKey: "amount-provided",
      sectionNumber: 1,
      heading: "Amount provided",
      text: "A proposed amount is stated for testing the admission boundary.",
      beneficiary: { kind: "general-application", appliesToLabel: "the city" },
      applicationScope: {
        jurisdictionId: place.context.jurisdiction.id,
        segmentKey: null,
      },
      fiscalExposureLabel: "Amount provided",
      fiscalExposureMinorUnits: 100,
    });
    const result = placeMunicipalOrdinanceOnAgenda(withClause, {
      governmentKey: city.id,
      measureId: measure.id,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "A fiscal clause needs the local fiscal authority route.",
    });
    expect(result.world).toBe(withClause);
  });
});
