import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectPersonDossier } from "./person-dossier";
import { PRIOR_SERVICE_EVENT } from "./opening-prior-service";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-10: the president, vice president and chief justice arrive with the
 * office that led them there, and their card reads it from the record.
 */
describe("opening officeholders' careers", { timeout: 180_000 }, () => {
  const seed = "ow10-careers-2026-10-06";
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;

  it(`gives each federal officeholder a prior office (${place.displayName}, seed ${seed})`, () => {
    const tenures = world.history.events.filter(
      (event) =>
        event.type === "world.office-tenure" &&
        /^office:us-(president|vice-president|chief-justice)$/.test(
          event.tags.find((tag) => tag.startsWith("office:")) ?? "",
        ),
    );
    expect(tenures.length).toBe(3);
    for (const tenure of tenures) {
      const holder = tenure.participants[0]!.personId!;
      const prior = world.history.events.find(
        (event) =>
          event.type === PRIOR_SERVICE_EVENT &&
          event.involvedEntityIds.includes(holder),
      );
      expect(prior, tenure.tags.join(" ")).toBeDefined();
      expect(prior!.occurredAt < tenure.occurredAt).toBe(true);
      expect(prior!.tags).toContain(`ended-at:${tenure.occurredAt}`);
      const dossier = projectPersonDossier(world, game.playerPersonId, holder);
      const lines = dossier.publicCareer.map((entry) => entry.summary);
      expect(lines.length, lines.join(" / ")).toBeGreaterThanOrEqual(2);
      expect(lines).toContain(
        `Took office as ${prior!.participants[0]!.detail}.`,
      );
      console.info("OW10_CAREER", holder, lines);
    }
  });
});
