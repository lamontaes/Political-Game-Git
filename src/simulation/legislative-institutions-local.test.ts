import { describe, expect, it } from "vitest";

import { createHash } from "node:crypto";
import {
  governmentUnit,
  governmentUnitsForPlace,
  governmentUnitsForState,
} from "./government-units";
import { draftingSupportsScenario } from "./legislation-drafting";
import {
  legislativeInstitutionContext,
  legislativePackForWorkKey,
} from "./legislative-institutions";
import { lifePlaceByKey } from "./life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { townCouncilProfilePack } from "./town-council-profile";

const profileSeed = "a77-town-profile-admission-20261001";
const profileCases = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(
  governmentUnitsForState,
)
  .flatMap((unit) => {
    const place = unit.placeGeoid ? lifePlaceByKey(unit.placeGeoid) : null;
    const pack = townCouncilProfilePack(unit);
    return place && pack && unit.functionalActive
      ? [{ unit, place, pack }]
      : [];
  })
  .sort((a, b) =>
    createHash("sha256")
      .update(`${profileSeed}:${a.unit.id}`)
      .digest("hex")
      .localeCompare(
        createHash("sha256")
          .update(`${profileSeed}:${b.unit.id}`)
          .digest("hex"),
      ),
  )
  .slice(0, 5);
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "./local-ordinance-game-profile";

describe("local institution drafting", () => {
  it.each(profileCases)(
    "admits the saved town profile with its own place clock in $place.key",
    ({ place, pack, unit }) => {
      const key = `institution:${pack.packId}`;
      const admitted = legislativePackForWorkKey(key);
      expect(admitted).toEqual(pack);
      expect(draftingSupportsScenario(key)).toBe(true);
      const context = legislativeInstitutionContext(admitted!);
      expect(context.jurisdiction.id).toBe(place.context.jurisdiction.id);
      expect(context.initialMoment).toEqual(place.context.initialMoment);
      expect(legislativeInstitutionContext(admitted!)).toEqual(context);
      expect(
        legislativePackForWorkKey(key.replace(unit.id, "missing-unit")),
      ).toBeNull();
    },
  );
  it("samples five actual profile councils from the nationwide frame", () => {
    expect(profileCases).toHaveLength(5);
  });
  it("resolves only an admitted city or county game pack through the shared draft work key", () => {
    const city = governmentUnitsForPlace("0162328").find(
      (unit) => unit.unitType === "municipality" && unit.functionalActive,
    );
    const county = governmentUnit("gus2025:100001");
    expect(city).toBeDefined();
    expect(county).toBeDefined();
    for (const unit of [city!, county!]) {
      const packId = `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
      const scenarioKey = `institution:${packId}`;
      expect(localFiscalGameAuthorityForRulePackId(packId)).not.toBeNull();
      expect(legislativePackForWorkKey(scenarioKey)?.packId).toBe(packId);
      expect(draftingSupportsScenario(scenarioKey)).toBe(true);
    }

    const township = governmentUnit("gus2025:101703");
    expect(township).toBeDefined();
    const townshipPackId = `${township!.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
    const townshipKey = `institution:${townshipPackId}`;
    expect(localFiscalGameAuthorityForRulePackId(townshipPackId)).toBeNull();
    expect(legislativePackForWorkKey(townshipKey)).toBeNull();
    expect(draftingSupportsScenario(townshipKey)).toBe(false);
  });
});
