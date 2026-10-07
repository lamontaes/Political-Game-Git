import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { makeIsoDate } from "../dates";
import { regularSessionYearForWorld } from "../legislative-procedure-world";
import type * as LegislativeProcedureWorld from "../legislative-procedure-world";
import { stateJurisdictionForKey } from "../life-places";
import { createWorld } from "../world";
import { scheduleGoverningSeasons } from "./governing-calendar";
import { recordOfficeConsequence } from "./office-consequence";
import {
  currentGoverningOffices,
  governingSeasonHandler,
} from "./state-governing";

vi.mock("../legislative-procedure-world", async (importOriginal) => ({
  ...(await importOriginal<typeof LegislativeProcedureWorld>()),
  regularSessionYearForWorld: vi.fn(),
}));

const regularYear = vi.mocked(regularSessionYearForWorld);

beforeEach(() => {
  regularYear.mockReset();
  regularYear.mockReturnValue(true);
});

describe("governing bill dates follow the saved session cadence", () => {
  it("uses the recorded 2026 convene date and repeats weekly while in session", () => {
    const jurisdiction = stateJurisdictionForKey("US-CA")!;
    const world = createWorld({
      seed: "governing-calendar-weekly",
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const scheduled = scheduleGoverningSeasons(
      world,
      "governor-weekly-calendar-fixture",
      jurisdiction.id,
    );
    const first = scheduled.history.futureDueItems.find(
      (due) =>
        due.stableKey.includes("governor-weekly-calendar-fixture") &&
        due.stableKey.includes(":bill:"),
    )!;
    expect(first.dueAt).toBe("2026-01-12");

    const onFirstDate = {
      ...scheduled,
      currentDate: first.dueAt,
      currentMoment: { ...scheduled.currentMoment, date: first.dueAt },
    };
    const next = scheduleGoverningSeasons(
      onFirstDate,
      "governor-weekly-calendar-fixture",
      jurisdiction.id,
    );
    expect(
      next.history.futureDueItems.find(
        (due) =>
          due.stableKey.includes("governor-weekly-calendar-fixture") &&
          due.stableKey.includes(":bill:") &&
          due.dueAt > first.dueAt,
      )?.dueAt,
    ).toBe("2026-01-19");
  });

  it("does not schedule a 2026 regular bill intake where no session is recorded", () => {
    const jurisdiction = stateJurisdictionForKey("US-TX")!;
    const world = createWorld({
      seed: "governing-calendar-off-year",
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const scheduled = scheduleGoverningSeasons(
      world,
      "governor-off-year-calendar-fixture",
      jurisdiction.id,
    );
    const bills = scheduled.history.futureDueItems.filter(
      (due) =>
        due.stableKey.includes("governor-off-year-calendar-fixture") &&
        due.stableKey.includes(":bill:"),
    );
    expect(bills.every((due) => due.dueAt >= "2027-01-01")).toBe(true);
  });

  it("looks beyond next year for a bill day but keeps the annual budget date", () => {
    const jurisdiction = stateJurisdictionForKey("US-NV")!;
    const world = createWorld({
      seed: "governing-calendar-cadence",
      currentDate: makeIsoDate("2026-05-01"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    regularYear.mockImplementation(
      (_world, _jurisdictionId, year) => year % 2 === 0,
    );

    const scheduled = scheduleGoverningSeasons(
      world,
      "governor-calendar-fixture",
      jurisdiction.id,
    );
    const dates = scheduled.history.futureDueItems
      .filter((due) => due.stableKey.includes("governor-calendar-fixture"))
      .map((due) => due.dueAt);
    expect(dates).toEqual(["2026-12-01", "2028-02-15"]);
  });

  it("discards an already saved off-cycle bill item before either bill filer", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "governing-offcycle-saved-due",
        startAge: 40,
      }),
    ).game!;
    const opened = openOrdinaryLife(game.world, game.playerPersonId);
    const office = currentGoverningOffices(opened)[0]!;
    expect(office).toBeDefined();
    // The due item was written before this world's procedure was available.
    regularYear.mockReturnValue(true);
    const scheduled = scheduleGoverningSeasons(
      opened,
      office.officeKey,
      office.jurisdictionId,
    );
    const oldBillDue = scheduled.history.futureDueItems.find((due) =>
      due.stableKey.includes(`:${office.officeKey}:bill:`),
    )!;
    expect(oldBillDue).toBeDefined();
    regularYear.mockImplementation(
      (_world, _jurisdictionId, year) =>
        year > Number(oldBillDue.dueAt.slice(0, 4)),
    );

    const before = scheduled.history.legislativeMeasures?.length ?? 0;
    const result = governingSeasonHandler(scheduled, oldBillDue);
    expect(result.context).toMatch(/off-cycle bill date was skipped/);
    expect(result.world.history.legislativeMeasures?.length ?? 0).toBe(before);
    expect(
      result.world.history.futureDueItems.some(
        (due) =>
          due.stableKey.includes(`:${office.officeKey}:bill:`) &&
          due.dueAt > scheduled.currentDate,
      ),
    ).toBe(true);
    expect(
      result.world.history.futureDueItems.some((due) =>
        due.stableKey.includes(`:${office.officeKey}:budget:`),
      ),
    ).toBe(true);
  }, 600_000);

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
