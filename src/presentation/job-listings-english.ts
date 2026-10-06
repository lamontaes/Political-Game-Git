import { speakerTraits } from "./speaker-traits";
import { openJobListings } from "../simulation/job-market";
import type { EntityId, World } from "../simulation/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";

/** A menu status, not dialogue or a claim about every employer in town. */
export const EMPTY_JOB_LISTINGS_BANK: AuthoredEnglishBank = {
  key: "jobs-empty-listings",
  version: "1",
  surface: "menu",
  variants: [
    {
      key: "no-listed-openings",
      kind: "template",
      stages: ["empty"],
      requiresFacts: ["empty-listings"],
      text: "No job openings are listed here right now.",
    },
  ],
};

/**
 * The same canonical listing reader used by the Jobs projection supplies the
 * absence fact. The saved world and the person's home record establish its
 * time and search area. Reading public listings is the menu's knowledge basis;
 * this neither grants simulated knowledge nor writes an event or advances time.
 */
export function emptyJobListingsPacket(
  world: World,
  personId: EntityId,
): GroundedEnglishPacket | null {
  const person = world.people[personId];
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !person ||
    !world.jurisdictions[person.homeJurisdictionId] ||
    openJobListings(world, personId).length !== 0
  )
    return null;
  const sourceRecordIds = [world.id, person.id, person.homeJurisdictionId];
  return {
    surface: "menu",
    worldSeed: world.seed,
    momentKey: `jobs:${personId}:${world.currentDate}:${world.history.nextSequence}`,
    bankVersion: EMPTY_JOB_LISTINGS_BANK.version,
    stage: "empty",
    sourceRecordIds,
    facts: {
      "empty-listings": {
        text: "No current listings in the person's job search area.",
        sourceRecordIds,
      },
    },
    viewer: { personId, traits: speakerTraits(world, personId) },
    knowledge: [{ personId, factKey: "empty-listings", sourceRecordIds }],
  };
}

/** Missing support omits the line; it never falls back to handwritten copy. */
export function emptyJobListingsLine(
  world: World,
  personId: EntityId,
): string | null {
  const packet = emptyJobListingsPacket(world, personId);
  if (!packet) return null;
  const result = renderGroundedEnglish(packet, EMPTY_JOB_LISTINGS_BANK);
  return result.kind === "rendered" ? result.text : null;
}
