import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  activeCampaignForCandidate,
  candidacyPackForJurisdiction,
} from "../simulation";
import {
  bindingForDistrict,
  offeredDistricts,
  recordDesiredDistrict,
  recordedDistrictForOffice,
  townDistrictsForOffice,
} from "./district-selection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * A new life at 34 files for its state legislature's first seat, naming the
 * district the way the race screen does: the one the world records them living
 * in, or, in a town split across districts, one of the town's own.
 *
 * Columbus, Ohio was refused outright: every Ohio office asks for a qualified
 * elector, and nothing decided it. Lincoln, Nebraska and Juneau, Alaska stand
 * beside it as places whose earlier refusals came from a test starting a life
 * with no town.
 */

function fileInPlace(placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `state-legislature-filing-${placeKey}`,
      startAge: 34,
      placeKey,
    }),
  ).game!;
  let world = game.world;
  const personId = game.playerPersonId;
  const home = world.people[personId]!.homeJurisdictionId;
  const officeKey = candidacyPackForJurisdiction(home)!.offices[0]!.officeKey;
  let binding = recordedDistrictForOffice(world, personId, officeKey)?.binding;
  if (!binding) {
    const town = townDistrictsForOffice(world, personId, officeKey);
    const identity = offeredDistricts(world, home, officeKey).find((entry) =>
      town.includes(entry.recordId),
    )!;
    binding = bindingForDistrict(identity);
    world = recordDesiredDistrict(world, personId, binding);
  }
  world = fileForOffice(world, personId, binding);
  return { world, personId };
}

describe(
  "Filing for the state legislature from a new life",
  { timeout: 120_000 },
  () => {
    it.each([
      ["Columbus, Ohio", "3918000"],
      ["Lincoln, Nebraska", "3128000"],
      ["Juneau, Alaska", "0236400"],
    ])("files in %s", (_name, placeKey) => {
      const { world, personId } = fileInPlace(placeKey);
      expect(activeCampaignForCandidate(world, personId)).not.toBeNull();
    });
  },
);
