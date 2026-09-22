import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { currentGoverningOffices } from "./governing/state-governing";
import { searchLifePlaces } from "./index";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "./macro-economy/readers";
import {
  recordInOffice,
  startingSupportAdjustment,
  UNRESEARCHED_RECORD_IN_OFFICE,
} from "./record-in-office";
import type { World } from "./types";

const SLOW = 900_000;
let opening: World;
let later: World;

// A Michigan life; the governors judged are every state's, none singled out.
beforeAll(() => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-MI",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "record-in-office",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped" as const,
    }),
  ).game!;
  opening = game.world;
  later = passOrdinaryDays(opening, 400);
}, SLOW);

describe("a governor's record on the economy", { timeout: SLOW }, () => {
  it("is judged on unemployment from the start of the term to now", () => {
    const office = currentGoverningOffices(later).find(
      (candidate) => candidate.termStartedAt !== null,
    );
    expect(office).toBeDefined();
    const record = recordInOffice(later, office!.holderPersonId)!;
    expect(record).not.toBeNull();
    const now =
      macroConditionsAt(
        later,
        macroScopeForJurisdiction(office!.jurisdictionId),
        later.currentDate,
      ) ?? macroConditionsAt(later, "national", later.currentDate)!;
    expect(record.unemploymentNowPct).toBe(now.unemploymentPct);
    const expected = Math.max(
      -UNRESEARCHED_RECORD_IN_OFFICE.maxAbsoluteWeight,
      Math.min(
        UNRESEARCHED_RECORD_IN_OFFICE.maxAbsoluteWeight,
        Math.round(
          (record.unemploymentAtStartPct - record.unemploymentNowPct) *
            UNRESEARCHED_RECORD_IN_OFFICE.weightPerUnemploymentPoint,
        ),
      ),
    );
    expect(record.weight).toBe(expected);
    // Nothing else on this person's record, so that is the whole adjustment.
    expect(
      startingSupportAdjustment(
        later,
        office!.holderPersonId,
        later.currentDate,
      ),
    ).toBe(expected);
  });

  it("means nothing for somebody who holds no such office", () => {
    const player =
      later.control.kind === "person" ? later.control.personId : null;
    expect(player).not.toBeNull();
    expect(recordInOffice(later, player!)).toBeNull();
    expect(startingSupportAdjustment(later, player!, later.currentDate)).toBe(
      0,
    );
  });

  it("reads records only and writes nothing", () => {
    const before = JSON.stringify(later.history.events.length);
    for (const office of currentGoverningOffices(later))
      recordInOffice(later, office.holderPersonId);
    expect(JSON.stringify(later.history.events.length)).toBe(before);
  });
});
