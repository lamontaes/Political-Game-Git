import { describe, expect, it } from "vitest";

import { municipalWorkspaceFor } from "../presentation/municipal-workspace";
import { createScenarioWorld } from "./demo";
import { governmentUnitsForPlace } from "./government-units";
import { requireLifePlace } from "./life-places";
import { ensureMunicipalCouncilOpening } from "./municipal-council-opening";
import {
  installMunicipalGovernment,
  introduceMunicipalOrdinance,
  municipalOrganizationFor,
  municipalOrganizationKey,
  municipalRecognitionEventId,
  municipalSeats,
} from "./municipal-public-work";
import {
  ensureHomeLocalGovernments,
  ensureLocalGovernmentOrganization,
  homeLocalGovernmentStatus,
  localGovernmentOrganizationKey,
} from "./nationwide-world/local-governments";
import { deserializeWorld, serializeWorld } from "./serialization";

const place = requireLifePlace("0162328");
const unit = governmentUnitsForPlace(place.sourceGeoid!).find(
  (entry) => entry.unitType === "municipality" && entry.functionalActive,
)!;

function worldFor(seed: string) {
  return createScenarioWorld(seed, place.context, { peopleCount: 8 });
}

describe("matched catalog municipality organization identity", () => {
  it("opens one municipal organization and a council roster", () => {
    let world = worldFor("catalog-municipal-one-organization");
    world = ensureHomeLocalGovernments(world, world.personOrder[0]!);
    expect(
      world.history.organizations.some(
        (entry) => entry.stableKey === localGovernmentOrganizationKey(unit),
      ),
    ).toBe(false);
    world = ensureMunicipalCouncilOpening(world, unit.id);
    expect(
      world.history.organizations.filter(
        (entry) => entry.stableKey === municipalOrganizationKey(unit.id),
      ),
    ).toHaveLength(1);
    expect(municipalSeats(world, unit.id)).toHaveLength(5);
    expect(
      homeLocalGovernmentStatus(world, world.personOrder[0]!).governments.find(
        (entry) => entry.unitId === unit.id,
      )?.organizationId,
    ).toBe(municipalOrganizationFor(world, unit.id)?.id);
  });

  it("reuses a legacy local organization through council opening, ordinance and reload", () => {
    let world = worldFor("legacy-catalog-municipal-organization");
    world = ensureLocalGovernmentOrganization(world, unit);
    const legacy = world.history.organizations.find(
      (entry) => entry.stableKey === localGovernmentOrganizationKey(unit),
    )!;
    world = deserializeWorld(serializeWorld(world));
    world = ensureMunicipalCouncilOpening(world, unit.id);
    expect(municipalOrganizationFor(world, unit.id)?.id).toBe(legacy.id);
    expect(municipalRecognitionEventId(world, unit.id)).not.toBeNull();
    expect(
      world.history.organizations.some(
        (entry) => entry.stableKey === municipalOrganizationKey(unit.id),
      ),
    ).toBe(false);
    const seats = municipalSeats(world, unit.id);
    expect(seats).toHaveLength(5);
    const actor = seats[0]!.personId;
    world = { ...world, control: { kind: "person", personId: actor } };
    const filing = introduceMunicipalOrdinance(world, {
      governmentKey: unit.id,
      designation: "Ord. Legacy 1",
      shortTitle: "Public path",
      summary: "A board member proposes a public path rule.",
    });
    expect(filing.ok).toBe(true);
    if (!filing.ok) throw new Error(filing.reason);
    const restored = deserializeWorld(serializeWorld(filing.world));
    expect(municipalOrganizationFor(restored, unit.id)?.id).toBe(legacy.id);
    expect(
      homeLocalGovernmentStatus(
        restored,
        restored.personOrder[0]!,
      ).governments.find((entry) => entry.unitId === unit.id)?.organizationId,
    ).toBe(legacy.id);
    expect(municipalSeats(restored, unit.id)).toEqual(seats);
    expect(municipalWorkspaceFor(restored)?.government.key).toBe(unit.id);
    expect(restored.history.legislativeMeasures?.at(-1)?.rulePackId).toBe(
      `${unit.id}:local-ordinance-game/v1`,
    );
  });

  it("prefers the municipal identity in saves that already contain both", () => {
    let world = worldFor("legacy-dual-municipal-organizations");
    world = installMunicipalGovernment(world, {
      governmentKey: unit.id,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    const municipal = municipalOrganizationFor(world, unit.id)!;
    world = ensureLocalGovernmentOrganization(world, unit);
    expect(
      world.history.organizations.some(
        (entry) => entry.stableKey === localGovernmentOrganizationKey(unit),
      ),
    ).toBe(true);
    const restored = deserializeWorld(serializeWorld(world));
    expect(municipalOrganizationFor(restored, unit.id)?.id).toBe(municipal.id);
  });
});
