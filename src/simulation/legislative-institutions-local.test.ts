import { describe, expect, it } from "vitest";

import { governmentUnit, governmentUnitsForPlace } from "./government-units";
import { draftingSupportsScenario } from "./legislation-drafting";
import { legislativePackForWorkKey } from "./legislative-institutions";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "./local-ordinance-game-profile";

describe("local institution drafting", () => {
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
