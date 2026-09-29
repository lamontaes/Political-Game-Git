import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { makeIsoDate, searchLifePlaces } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { placeOutcomesForMonth } from "../simulation/outcome-web/place-outcomes";
import type { World } from "../simulation";
import { World39News } from "./World39News";

/*
 * The News overview says what the laws in force changed where the player
 * lives, and says nothing before they changed anything. Markup proof, in the
 * style of PlayerSurfaceProvenance.test.tsx.
 */

function nevadaLife(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-NV",
    scope: "locality",
  })[0]!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
}

/**
 * The opening month's records, with the SNAP work requirement's part written
 * into Nevada's own record: the federal law has been in force since November
 * 2025, so it answers the question on the world's real date, and its link
 * (`snap-work-requirement-to-participation`) is the one that acts on it.
 */
function withRecords(world: World, snapCause: boolean): World {
  const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
  const records = placeOutcomesForMonth(world, month).map((record) =>
    snapCause &&
    record.measure === "program.snap-receipt" &&
    record.placeKey === "US-NV"
      ? {
          ...record,
          structural: record.base,
          multiplier: 0.97,
          value: Math.round(record.base * 0.97 * 10) / 10,
          causes: [
            { key: "snap-work-requirement-to-participation", factor: 0.97 },
          ],
        }
      : record,
  );
  return { ...world, placeOutcomes: { months: [{ month, records }] } };
}

function markupFor(
  world: World,
  personId: Parameters<typeof World39News>[0]["personId"],
) {
  return renderToStaticMarkup(
    <World39News world={world} personId={personId} onOpenPerson={() => {}} />,
  );
}

describe("News says what the laws changed", () => {
  it("shows the section once a law has moved a condition, with both values", () => {
    const { world, playerPersonId } = nevadaLife("news-law-effects");
    const markup = markupFor(withRecords(world, true), playerPersonId);
    expect(markup).toContain('data-testid="world39-laws"');
    expect(markup).toContain("What the laws changed");
    expect(markup).toContain("because of a change in the law");
    expect(markup).toContain("Without that change it would stand at");
  });

  it("shows no section before any law differs from where the place began", () => {
    const { world, playerPersonId } = nevadaLife("news-law-effects");
    const markup = markupFor(withRecords(world, false), playerPersonId);
    expect(markup).not.toContain("What the laws changed");
  });
});
