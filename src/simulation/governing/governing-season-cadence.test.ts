import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { scheduleGoverningSeasons } from "./governing-calendar";
import { recordOfficeConsequence } from "./office-consequence";
import {
  currentGoverningOffices,
  governingSeasonHandler,
} from "./state-governing";

describe("governing bill dates", () => {
  it("keeps a seated legislature's bill date after its governor resigns", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "governing-bill-through-vacancy",
        startAge: 40,
      }),
    ).game!;
    const opened = openOrdinaryLife(game.world, game.playerPersonId);
    const office = currentGoverningOffices(opened).find(
      (row) => row.stateUsps === "KY",
    )!;
    const scheduled = scheduleGoverningSeasons(
      opened,
      office.officeKey,
      office.jurisdictionId,
    );
    const billDue = scheduled.history.futureDueItems.find((due) =>
      due.stableKey.includes(`:${office.officeKey}:bill:`),
    )!;
    const resignation = recordOfficeConsequence(scheduled, {
      stableKey: "governing-bill-through-vacancy:resignation",
      kind: "resignation",
      officeKey: office.officeKey,
      subjectPersonId: office.holderPersonId,
      effectiveAt: scheduled.currentDate,
      evidenceEventIds: [],
      statedReason: "I am standing down today.",
    });
    expect(resignation.outcome.changed).toBe(true);
    expect(
      currentGoverningOffices(resignation.world).some(
        (row) => row.officeKey === office.officeKey,
      ),
    ).toBe(false);

    const before = resignation.world.history.legislativeMeasures?.length ?? 0;
    const result = governingSeasonHandler(resignation.world, billDue);
    expect(
      result.world.history.legislativeMeasures?.length ?? 0,
    ).toBeGreaterThan(before);
  }, 600_000);
});
