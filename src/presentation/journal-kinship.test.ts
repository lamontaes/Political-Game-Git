import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { kinshipRelationshipsAt } from "../simulation";
import { composeChapters } from "./journal-chapters";
import { createOpeningLifeController } from "./opening-life";
import { explicitNewGameSetup } from "./new-game-geography";
import { projectWorld39Journal } from "./world39-journal";

/**
 * A family record keeps its two people in no set order (`canonicalPair` sorts
 * them), so the journal reads which one is the parent from their birth dates,
 * as the family statistics do (`family-shape.ts`).
 */

// A seed whose drawn life has parent records stored child first, the case
// the journal used to get wrong; the test first checks the case is present.
const SEED = "journal-kinship-oct8-1";
const PLACE = drawRandomPlace(SEED);

describe("family in the dated journal", () => {
  it(`names each parent as a parent and each child as a child (${PLACE.displayName}, seed ${SEED})`, () => {
    const setup = explicitNewGameSetup({
      placeKey: PLACE.key,
      seed: SEED,
      startAge: 42 as never,
      depth: "summarize-earlier-life",
    });
    const game = createOpeningLifeController(setup).finishTransition().game!;
    const { world, playerPersonId: personId } = game;
    const person = world.people[personId]!;
    const entries = projectWorld39Journal(world, personId).entries;
    const lineal = kinshipRelationshipsAt(world, personId).filter(
      (kinship) => kinship.kind === "lineal:parent-child",
    );
    expect(lineal.length).toBeGreaterThan(0);
    expect(
      lineal.some(
        (kinship) =>
          kinship.personIds[0] === personId &&
          world.people[kinship.personIds[1]]!.birthDate < person.birthDate,
      ),
    ).toBe(true);
    let parents = 0;
    for (const kinship of lineal) {
      const otherId = kinship.personIds.find((id) => id !== personId)!;
      const older = world.people[otherId]!.birthDate < person.birthDate;
      if (older) parents += 1;
      expect(
        entries.find((entry) => entry.id === `kinship:${kinship.id}`)?.text,
      ).toMatch(older ? /is your parent\.$/ : /is your child\.$/);
    }
    expect(parents).toBeGreaterThan(0);
    // The chapter's first mention of each relative reads the same way.
    const kin = composeChapters(world, personId, world.currentDate).flatMap(
      (chapter) => chapter.firstMentionKin,
    );
    let mentioned = 0;
    for (const kinship of lineal) {
      const otherId = kinship.personIds.find((id) => id !== personId)!;
      const mention = kin.find((row) => row.personId === otherId);
      if (!mention) continue;
      mentioned += 1;
      const older = world.people[otherId]!.birthDate < person.birthDate;
      expect(mention.relation).toMatch(
        older ? /^(?:mother|father|parent)$/ : /^(?:daughter|son|child)$/,
      );
    }
    expect(mentioned).toBeGreaterThan(0);
  });
});
