import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { TownBusinessesPanel } from "../player/TownBusinessesPanel";
import { TOWN_BUSINESS_CLOSING_REASONS } from "../simulation/living-world/town-businesses";
import { closeBusinessWithNobodyLeft } from "../simulation/living-world/town-finances";
import type { EntityId, World } from "../simulation/types";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { proseDate } from "./prose-dates";
import { projectTownBusinesses } from "./town-businesses-view";

/**
 * SEE-IT, Town: a business that closed stays on the town's list, struck
 * through, with the day it closed. The place is drawn from all 56 by the seed,
 * and the test names it.
 */
const SEED = "see-it-town-1";
const place = drawRandomPlace(SEED);
const townId = place.context.jurisdiction.id as EntityId;

let world: World;

beforeAll(() => {
  world = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!.world;
}, 240_000);

describe(`a closed business stays on the town's list (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("lists every open business with no closing", () => {
    const lines = projectTownBusinesses(world, townId);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.closed === null)).toBe(true);
    const html = renderToStaticMarkup(
      createElement(TownBusinessesPanel, { world, jurisdictionId: townId }),
    );
    expect(html).not.toContain("data-closed");
    expect(html).not.toContain("<del>");
  });

  it("marks the business that closed with its day and its recorded reason", () => {
    const [business, other] = projectTownBusinesses(world, townId);
    expect(business, "the town lists a business").toBeDefined();
    const closed = closeBusinessWithNobodyLeft(
      world,
      townId,
      business!.organizationId,
      "see-it-town:",
      TOWN_BUSINESS_CLOSING_REASONS,
    );
    const lines = projectTownBusinesses(closed, townId);
    const gone = lines.find(
      (line) => line.organizationId === business!.organizationId,
    )!;
    expect(gone.closed).toEqual({
      on: closed.currentDate,
      reason: expect.stringMatching(/^business:/),
    });
    expect(gone.otherStaff).toBe(0);
    expect(gone.ownerLine).toBeNull();
    // Another business in the same town is still open.
    if (other)
      expect(
        lines.find((line) => line.organizationId === other.organizationId)!
          .closed,
      ).toBeNull();
    const html = renderToStaticMarkup(
      createElement(TownBusinessesPanel, {
        world: closed,
        jurisdictionId: townId,
      }),
    );
    expect(html).toContain(`<del>${escapeHtml(gone.name)}</del>`);
    expect(html).toContain(
      `<time dateTime="${closed.currentDate}">${proseDate(closed.currentDate)}</time>`,
    );
    expect(html).not.toContain(`<strong>${escapeHtml(gone.name)}</strong>`);
    expect(html).toContain('data-closed="true"');
  });

  it("reads without writing anything", () => {
    const before = world.history.events.length;
    projectTownBusinesses(world, townId);
    expect(world.history.events).toHaveLength(before);
  });
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;");
}
