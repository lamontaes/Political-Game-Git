import { describe, expect, it } from "vitest";
import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import { candidacyPackForJurisdiction, searchLifePlaces } from "../simulation";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Measured in a browser in Ely, Minnesota: a man's result read "The seat is
 * theirs". The result speaks of the candidate with their own pronouns.
 */
describe("after a decided race", () => {
  it("speaks of the candidate with their own pronouns", () => {
    const place = searchLifePlaces("Ely", 1, {
      stateJurisdictionKey: "US-MN",
      scope: "locality",
    })[0]!;
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "file-again-ely",
      startAge: 40,
      placeKey: place.key,
      gender: "male",
      pronouns: "he-him",
      questionnaire: "skipped",
    });
    const personId = built.playerPersonId;
    // The Senate: Minnesota's House rows cannot yet be placed this early.
    const senate = candidacyPackForJurisdiction(
      built.world.people[personId]!.homeJurisdictionId,
    )!.offices.find((office) => office.officeKey.endsWith(":senate"))!;
    const filed = fileForOffice(
      openOrdinaryLife(built.world, personId),
      personId,
      null,
      senate.officeKey,
    );
    const decided = campaignUntilDecided(filed, personId);
    const view = projectCampaign(decided, personId);
    expect(["won", "lost"]).toContain(view.phase);
    expect(view.tallies.length).toBeGreaterThan(0);
    expect(view.afterword).not.toMatch(/\btheirs\b|\bthem\b/);
    expect(view.afterword).toMatch(/\bhis\b|\bhim\b/);
  }, 300_000);
});
