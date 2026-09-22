import { describe, expect, it } from "vitest";
import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import { candidacyPackForJurisdiction, searchLifePlaces } from "../simulation";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A decided race ends that race, not the life's politics. Measured in a
 * browser in Ely, Minnesota: once a council race was won, Campaigns never
 * offered a filing again, so a council member could never run for the
 * legislature.
 */
describe("after a decided race", () => {
  it("still offers the next filing, and speaks of the candidate as they are", () => {
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
    expect(projectCampaign(filed, personId).canFileAgain).toBe(false);
    const decided = campaignUntilDecided(filed, personId);
    const view = projectCampaign(decided, personId);
    expect(["won", "lost"]).toContain(view.phase);
    // The finished race is still shown, and a new filing is open beside it.
    expect(view.tallies.length).toBeGreaterThan(0);
    expect(view.canFileAgain).toBe(true);
    expect(view.afterword).not.toMatch(/\btheirs\b|\bthem\b/);
    expect(view.afterword).toMatch(/\bhis\b|\bhim\b/);
  }, 300_000);
});
