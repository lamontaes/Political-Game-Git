import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { stateNameForUsps } from "./state-name";
import type { LifePlace } from "../simulation/life-places";
import {
  isProgramBookkeepingPublication,
  projectPublicInformationDigest,
  publishPublicEvent,
} from "../simulation/public-information";
import { eventIsNewsCandidate } from "../simulation/press/desk";
import { PUBLIC_PROGRAM_EVENT_PREFIX } from "../simulation/public-program-integrity";
import type { World } from "../simulation/types";
import { projectWorldOrientation } from "./living-world-orientation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOpeningYear } from "./opening-story";
import { openOrdinaryLife } from "./ordinary-life";
import { projectOrientationView } from "./world-orientation";

/**
 * A public program's note to the books ("$X may be committed for
 * transit:bus-service ...") reached "In the news" word for word, program key
 * and all. Watched on real openings in two places drawn at random from all 56;
 * each test names the place and seed it ran in.
 */
function open(place: LifePlace, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      depth: "summarize-earlier-life",
    }),
  ).game!;
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  return { world, personId: game.playerPersonId, place, seed };
}

const SEEDS = ["ow8-news-a", "ow8-news-b"] as const;
const OPENINGS = SEEDS.map((seed) => open(drawRandomPlace(seed), seed));
const ELIGIBLE = OPENINGS[0]!;

function programEvents(world: World) {
  return world.history.events.filter(
    (event) =>
      event.type.startsWith(PUBLIC_PROGRAM_EVENT_PREFIX) &&
      event.visibility === "public",
  );
}

function openingHeadlines(opening: ReturnType<typeof open>) {
  return projectOpeningYear(
    opening.world,
    opening.personId,
    projectOrientationView(
      projectWorldOrientation(opening.world, opening.personId),
      stateNameForUsps,
    ),
  ).publications.map((publication) => publication.headline);
}

describe("a program's note to the books is not news", () => {
  it.each(OPENINGS)(
    "opens with public program notes that are never published ($place.displayName, seed $seed)",
    (opening) => {
      const notes = programEvents(opening.world);
      console.info(
        `${opening.place.displayName} (${opening.place.stateJurisdictionKey}), seed ${opening.seed}, ${opening.world.currentDate}: ${notes.length} program notes, ${(opening.world.history.publications ?? []).length} publications; first: ${notes[0]?.summary}`,
      );
      expect(notes.length).toBeGreaterThan(0);
      const published = new Set(
        (opening.world.history.publications ?? []).map((p) => p.sourceEventId),
      );
      for (const note of notes) {
        expect(published.has(note.id)).toBe(false);
        expect(eventIsNewsCandidate(opening.world, note)).toBe(false);
      }
      for (const headline of openingHeadlines(opening)) {
        expect(headline).not.toMatch(/may be committed|Authority to spend/);
        expect(headline).not.toMatch(/[a-z]+(?:-[a-z]+)*:[a-z0-9._-]+ from /);
      }
    },
  );

  it("keeps every other publication in the same world", () => {
    const publications = (ELIGIBLE.world.history.publications ?? []).filter(
      (p) => p.correctsPublicationId === null,
    );
    const digest = projectPublicInformationDigest(ELIGIBLE.world);
    expect(digest.items.length).toBe(publications.length);
  });

  it("an older save that already printed the note no longer shows it", () => {
    const note = programEvents(ELIGIBLE.world)[0]!;
    const older = publishPublicEvent(ELIGIBLE.world, {
      stableKey: "ow8-older-save",
      sourceEventId: note.id,
    });
    const printed = older.history.publications.find(
      (p) => p.sourceEventId === note.id,
    )!;
    // The older shape: the recorded sentence, program key and all.
    console.info(`older save printed: ${printed.headline}`);
    expect(isProgramBookkeepingPublication(older, printed)).toBe(true);
    const digest = projectPublicInformationDigest(older);
    expect(digest.items.some((item) => item.sourceEventId === note.id)).toBe(
      false,
    );
    const headlines = projectOpeningYear(
      older,
      ELIGIBLE.personId,
      projectOrientationView(
        projectWorldOrientation(older, ELIGIBLE.personId),
        stateNameForUsps,
      ),
    ).publications.map((publication) => publication.headline);
    expect(headlines).not.toContain(printed.headline);
  });
});
