import { describe, expect, it } from "vitest";
import {
  US_STATE_USPS,
  createCharacterHistoryContextPerson,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateResidenceSince,
} from "../simulation";
import { stateExecutiveCandidacyForPerson } from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

function adultLifeIn(usps: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: firstLocality(usps).key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("NATIONWIDE residence duration from recorded homes", () => {
  it.each([...US_STATE_USPS])(
    "%s: an adult's recorded childhood home counts, no later than today, through reopen",
    (usps) => {
      const { world, personId } = adultLifeIn(usps, `residence-${usps}`);
      const person = world.people[personId]!;
      const since = stateResidenceSince(world, personId, `US-${usps}`);
      // The quick history records a family home in this place from birth.
      expect(since).toBe(person.birthDate);
      expect(since! <= world.currentDate).toBe(true);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(stateResidenceSince(reopened, personId, `US-${usps}`)).toBe(since);
      // A different state is not where they live.
      const elsewhere = usps === "KY" ? "US-TN" : "US-KY";
      expect(stateResidenceSince(world, personId, elsewhere)).toBeNull();
    },
    60_000,
  );

  it("a person with no recorded homes has lived there only since their residence fact", () => {
    const { world, personId } = adultLifeIn("NV", "residence-context");
    const home = world.people[personId]!.homeJurisdictionId;
    const next = createCharacterHistoryContextPerson(world, {
      stableKey: "residence-control:newcomer",
      givenName: "Test",
      familyName: "Newcomer",
      birthDate: "1980-01-01",
      homeJurisdictionId: home,
    });
    const newcomer = next.personOrder.find((id) => !world.people[id])!;
    expect(stateResidenceSince(next, newcomer, "US-NV")).toBe(next.currentDate);
  });

  it("Missouri no longer refuses a lifelong resident on its residency years", () => {
    const { world, personId } = adultLifeIn("MO", "nationwide-evidence-MO");
    const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
    expect(
      candidacy.blocks.some((block) =>
        /Not resident long enough/.test(block.reason),
      ),
    ).toBe(false);
  });
});
