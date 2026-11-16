// @vitest-environment node
/**
 * In a town with one paper, its race result stories do not all take the first
 * wording (the acting CTO's fault 6 on the Train, Nov 15; Words lead rule 37
 * gives each of several outlets its own wording, and a lone outlet has no
 * other to differ from). Excursion Inlet, Alaska (concession-reported draw
 * de4ef0f8ff6efdfb:agree:19) has one outlet printing seven race stories, five
 * of them for an unopposed seat: before the fix those five read the same
 * headline and lede shape; now they do not.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { playTownRace } from "../core2/campaign-race-test-kit";
import { gameStartDate } from "../core2/game-start";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

it("a one-paper town's unopposed race stories take different wordings", () => {
  const draw = "de4ef0f8ff6efdfb:agree:19";
  const place = drawPlace(draw, "concession-reported");
  expect(place.name).toContain("Excursion Inlet");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const played = playTownRace(core, place.name, 10);
  const races = played.printed.filter((s) =>
    String(s.facts.sourceRecordId).startsWith("election-result:"),
  );
  const outlets = new Set(
    races.map((s) => s.id.split(":").slice(1, 4).join(":")),
  );
  expect(outlets.size, `${place.name}: the town has one paper`).toBe(1);
  const unopposed = races
    .map((s) => wordPrintedStory(core, s)!)
    .filter((w) =>
      /no opposition|unopposed|no one ran|No challenger/i.test(
        `${w.headline} ${w.lede}`,
      ),
    );
  expect(
    unopposed.length,
    `${place.name}: unopposed race stories`,
  ).toBeGreaterThan(2);
  const shapes = new Set(
    unopposed.map(
      (w) =>
        /faced no opposition|without opposition|ran unopposed|no one ran against|unopposed on the ballot/i.exec(
          w.lede ?? "",
        )?.[0],
    ),
  );
  expect(
    shapes.size,
    `${place.name}: ${unopposed.length} unopposed stories, one lede shape`,
  ).toBeGreaterThan(1);
}, 90_000);
