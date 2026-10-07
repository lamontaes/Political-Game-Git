import { describe, expect, it } from "vitest";

import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  localGovernmentSeatsKey,
  recordLocalGovernmentSeatGap,
} from "../simulation/living-world/local-government-seats";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { residentIn } from "../../tests/fixtures/state-executive-entry";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorld39Journal } from "./world39-journal";
import { projectWorld39News } from "./world39-news";

describe("a local government with no eligible roster member", () => {
  it("keeps a county or state coverage reason across generated localities", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    for (const usps of CHIEF_EXECUTIVE_JURISDICTIONS) {
      const { world, personId } = residentIn(
        usps,
        `local-government-coverage-${usps}`,
      );
      const local = homeLocalGovernmentUnits(world, personId);
      const hasLocalOrCountyGovernment =
        local.municipal.length > 0 ||
        local.townships.length > 0 ||
        local.counties.length > 0;
      expect(
        hasLocalOrCountyGovernment || local.countyReason,
        `local-government coverage for ${usps}`,
      ).toBeTruthy();
    }
  });

  it("records a private, retryable state/county trace without player text", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "local-government-seat-gap",
        placeKey: "2743000",
        startAge: 34,
      }),
    ).game!;
    const town = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    const unit = homeLocalGovernmentUnits(game.world, game.playerPersonId)
      .municipal[0]!;

    const unavailable = recordLocalGovernmentSeatGap(game.world, unit, town);
    const event = unavailable.history.events.at(-1)!;
    expect(event).toMatchObject({
      type: "information.local-government-seat-gap",
      visibility: "private",
      participants: [],
      involvedEntityIds: [town],
    });
    expect(event.tags).toEqual(
      expect.arrayContaining([
        "reason:eligible-roster-exhausted",
        `unit:${unit.id}`,
        `state:${unit.stateUsps}`,
        ...(unit.countyGeoid ? [`county-area:${unit.countyGeoid}`] : []),
      ]),
    );
    expect(localGovernmentSeatsKey(unit.id)).not.toBe(event.stableKey);
    expect(
      unavailable.history.events.filter(
        (row) => row.stableKey === event.stableKey,
      ),
    ).toHaveLength(1);

    expect(recordLocalGovernmentSeatGap(unavailable, unit, town)).toBe(
      unavailable,
    );
    expect(
      projectWorld39Journal(unavailable, game.playerPersonId).entries.some(
        (entry) => entry.sourceId === event.id,
      ),
    ).toBe(false);
    expect(
      projectWorld39News(unavailable, game.playerPersonId).publicEvents.some(
        (entry) => entry.id === event.id,
      ),
    ).toBe(false);
    expect(
      deserializeWorld(serializeWorld(unavailable)).history.events.some(
        (row) => row.stableKey === event.stableKey,
      ),
    ).toBe(true);
  });
});
