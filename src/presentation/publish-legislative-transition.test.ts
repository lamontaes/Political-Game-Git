import { availableDraftOptions, fileDraft } from "./legislation-docket";
import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { openLegislativeWork } from "./legislation-world";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { projectDynamicSurfaces } from "./surface-projection";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";

describe("normal legislative publication composition", () => {
  it("publishes a real completed action once and preserves read/save purity", () => {
    const game = createNewGameWorld({
      seed: "ui-news-transition",
      placeKey: "kentucky",
      startAge: 38,
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      household: "shares-a-home",
      givenName: null,
      familyName: null,
    });
    const capabilities = resolvePlayerCapabilities(game.world);
    const opened = openLegislativeWork(game.world, {
      scenarioKey: capabilities.legislativeScenarioKey!,
      playerPersonId: game.playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });
    // Existing setup/history is not silently published when the screen opens.
    expect(publishLegislativeTransition(opened.world, opened.world)).toBe(
      opened.world,
    );
    expect(projectPublicInformationPanel(opened.world).items).toHaveLength(0);
    const option = availableDraftOptions(
      capabilities.legislativeScenarioKey!,
    )[0]!;
    const acted = fileDraft(opened.world, {
      scenarioKey: capabilities.legislativeScenarioKey!,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
      playerPersonId: game.playerPersonId,
      familyKey: option.familyKey,
      variantKey: option.variantKey,
    }).world;
    const published = publishLegislativeTransition(opened.world, acted);
    const model = projectPublicInformationPanel(published);
    expect(model.items.length).toBeGreaterThan(0);
    expect(model.outlets).toEqual([
      {
        outletKey: "civic-ledger",
        outletName: "Civic Ledger",
        storyCount: model.items.length,
      },
    ]);
    expect(
      model.items.every((item) =>
        acted.history.legislativeActions?.some(
          (action) => action.eventId === item.sourceEventId,
        ),
      ),
    ).toBe(true);
    expect(model.items.some((item) => item.people.length > 0)).toBe(true);
    expect(published.currentDate).toBe(acted.currentDate);
    expect(published.currentMoment).toEqual(acted.currentMoment);
    expect(publishLegislativeTransition(opened.world, published)).toBe(
      published,
    );
    const bytes = serializeWorld(published);
    projectPublicInformationPanel(published);
    projectDynamicSurfaces(published, {
      jurisdictionId: capabilities.legislativeJurisdictionId!,
      measureId: opened.assignment.measureId,
    });
    expect(serializeWorld(published)).toBe(bytes);
    expect(projectPublicInformationPanel(deserializeWorld(bytes))).toEqual(
      model,
    );
  });
});
