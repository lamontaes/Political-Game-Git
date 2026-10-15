import { storyPeople, storyPerson } from "./story-people-store";
import {
  materializeSettledTownHousehold,
  townHouseholdPeople,
  townResidentId,
  townResidentKey,
} from "./living-world/town-residents";
import type { EntityId, StoryPersonRecord, World } from "./types";

/**
 * HUSK PEOPLE (owner direction, October 8, 2026, recorded by the CTO on
 * #3813): most people a player meets are story-only. They have a name, a look
 * and what they said, and no family, household or daily simulation. They
 * become full records only when they start to matter: met again, joining
 * something, or entering a story thread.
 *
 * A story person is one of a town's roster residents named without being
 * written out. Their id is the one `townResidentId` gives them, so writing
 * them out later (`writeOutStoryPerson`) makes the same person, with the
 * same name and birthday, and everything recorded with them stays theirs.
 * Their look is `derivePersonAppearance(id)`, which needs only the id. The
 * row also keeps where the player met them and what they said, as speech acts
 * the English engine words. `writeOutStoryPerson` is the one hook that makes
 * them a full record, for a repeat meeting or a story thread.
 */

export { storyPeople, storyPerson } from "./story-people-store";

/** A roster resident to name in the story, and the record naming them. */
export interface StoryPersonInput {
  readonly town: EntityId;
  readonly household: number;
  readonly member: number;
  readonly sourceStore: string;
  readonly sourceRecordId: EntityId;
  readonly whereMet: StoryPersonRecord["whereMet"];
  readonly lines: StoryPersonRecord["lines"];
}

/**
 * Name roster residents in the story without writing them out. A resident
 * already written out, or already named, is passed over. Their name and
 * birthday are the ones `townHouseholdPeople` gives that household, the same
 * the writer would use.
 */
export function nameStoryPeople(
  world: World,
  inputs: readonly StoryPersonInput[],
): World {
  let sequence = world.history.nextSequence;
  const added: StoryPersonRecord[] = [];
  const seen = new Set<EntityId>();
  for (const input of inputs) {
    const id = townResidentId(world, input.town, input.household, input.member);
    if (world.people[id] || storyPerson(world, id) || seen.has(id)) continue;
    const person = townHouseholdPeople(world, input.town, input.household)[
      input.member
    ];
    if (!person) continue;
    seen.add(id);
    added.push({
      id,
      stableKey: townResidentKey(input.town, input.household, input.member),
      sequence,
      namedAt: world.currentDate,
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      identity: person.identity ?? null,
      origin: {
        kind: "town-roster",
        town: input.town,
        household: input.household,
        member: input.member,
      },
      sourceStore: input.sourceStore,
      sourceRecordId: input.sourceRecordId,
      whereMet: input.whereMet,
      lines: input.lines,
    });
    sequence += 1;
  }
  if (added.length === 0) return world;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      storyPeople: [...storyPeople(world), ...added],
    },
  };
}

/**
 * Write a story person out as a full resident: their roster household, with
 * its people, jobs and home, the way a town writes out anyone it draws. The
 * person keeps the id they were named under. A person already written out is
 * returned unchanged.
 */
export function writeOutStoryPerson(world: World, id: EntityId): World {
  const record = storyPerson(world, id);
  if (!record || world.people[id]) return world;
  const next = materializeSettledTownHousehold(
    world,
    record.origin.town,
    record.origin.household,
  );
  if (!next.people[id])
    throw new Error(`Writing out ${record.stableKey} made somebody else.`);
  return next;
}
