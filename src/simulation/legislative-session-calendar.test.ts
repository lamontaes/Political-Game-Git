import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { LEGISLATIVE_SESSION_CALENDARS } from "./legislative-session-calendar-data";
import {
  nextSessionCalendarDate,
  type SittingCalendar,
} from "./legislative-session-calendar";
import { scheduleCongressSitting } from "./governing/congress-chambers";
import { scheduleDcCouncilSitting } from "./dc-council-sittings";
import { scheduleGoverningSeasons } from "./governing/governing-calendar";
import { ensureLocalCouncilMeetings } from "./living-world/local-council-meetings";
import { municipalGovernmentByKey } from "./municipal-government";
import { DC_GOVERNMENT_KEY } from "./nationwide-world/district-of-columbia-council-opening";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { lifePlaceByKey, stateJurisdictionForKey } from "./life-places";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createWorld } from "./world";
import type { EntityId } from "./types";

describe("one legislative session timetable", () => {
  it("schedules the DC body's existing fourteen-day row once without inventing a vote", () => {
    const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
    const place = lifePlaceByKey(government.placeGeoid!)!;
    const world = createWorld({
      seed: "a11-existing-district-body-calendar",
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [place.context.jurisdiction],
      people: [],
    });
    const scheduled = scheduleDcCouncilSitting(world);
    expect(scheduled.history.futureDueItems).toHaveLength(1);
    expect(scheduled.history.futureDueItems[0]!.dueAt).toBe("2026-01-19");
    expect(scheduleDcCouncilSitting(scheduled)).toEqual(scheduled);
    expect(scheduled.history.legislativeVotes ?? []).toHaveLength(0);
  });

  it("creates no council meeting when no player or seated council exists", () => {
    const seed = "a11-no-seated-council";
    const index =
      createHash("sha256").update(seed).digest().readUInt32BE(0) %
      CHIEF_EXECUTIVE_JURISDICTIONS.length;
    const placeKey = CHIEF_EXECUTIVE_JURISDICTIONS[index]!;
    const jurisdiction = stateJurisdictionForKey(`US-${placeKey}`)!;
    const world = createWorld({
      seed,
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    expect(
      ensureLocalCouncilMeetings(world, "test:absent-person" as EntityId),
    ).toBe(world);
    expect(world.history.futureDueItems).toHaveLength(0);
  });
  it("reads the retained Congress weekdays across a weekend and year boundary", () => {
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.congress,
        makeIsoDate("2026-12-31"),
      ),
    ).toBe("2027-01-05");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.congress,
        makeIsoDate("2026-01-02"),
      ),
    ).toBe("2026-01-06");
  });

  it("keeps distinct hearing and sitting tasks in the body's one row", () => {
    const after = makeIsoDate("2026-01-05");
    expect(
      nextSessionCalendarDate(LEGISLATIVE_SESSION_CALENDARS.state, after),
    ).toBe("2026-01-08");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.state,
        after,
        "hearing",
      ),
    ).toBe("2026-01-12");
    expect(
      nextSessionCalendarDate(LEGISLATIVE_SESSION_CALENDARS.council, after),
    ).toBe("2026-01-19");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.council,
        after,
        "sitting",
        {
          notBefore: makeIsoDate("2026-01-20"),
        },
      ),
    ).toBe("2026-02-02");
  });

  it("keeps the compiled legal reading minimum instead of replacing it with a timetable", () => {
    const after = makeIsoDate("2026-01-05");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.council,
        after,
        "reading",
        { notBefore: makeIsoDate("2026-01-20") },
      ),
    ).toBe("2026-01-20");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.council,
        after,
        "reading",
      ),
    ).toBe("2026-01-06");
  });

  it("selects annual intake tasks strictly after the current day, including rollover", () => {
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.council,
        makeIsoDate("2026-04-01"),
        "agenda",
      ),
    ).toBe("2026-07-01");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.council,
        makeIsoDate("2026-12-31"),
        "agenda",
      ),
    ).toBe("2027-01-01");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.state,
        makeIsoDate("2026-12-01"),
        "budget",
      ),
    ).toBe("2027-12-01");
  });

  it("preserves saved biennial year admission without restricting annual budget work", () => {
    const after = makeIsoDate("2026-05-01");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.state,
        after,
        "bill",
        { eligibleYear: (year) => year % 2 === 0 },
      ),
    ).toBe("2028-02-15");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.state,
        after,
        "resume",
        { eligibleYear: (year) => year % 2 === 0 },
      ),
    ).toBe("2028-02-15");
    expect(
      nextSessionCalendarDate(
        LEGISLATIVE_SESSION_CALENDARS.state,
        after,
        "budget",
      ),
    ).toBe("2026-12-01");
  });

  it("uses a replacement row without branching on a government's identity", () => {
    const calendar: SittingCalendar = {
      id: "test:recorded-body-timetable",
      basis: "game-profile",
      note: "Fixture only, not a researched legal rule.",
      sitting: { kind: "weekdays", weekdays: [1, 5] },
      tasks: { hearing: { kind: "interval", days: 2 } },
    };
    expect(nextSessionCalendarDate(calendar, makeIsoDate("2026-01-05"))).toBe(
      "2026-01-09",
    );
    expect(
      nextSessionCalendarDate(calendar, makeIsoDate("2026-01-05"), "hearing"),
    ).toBe("2026-01-07");
    expect(
      nextSessionCalendarDate(calendar, makeIsoDate("2026-01-05"), "sitting", {
        notBefore: makeIsoDate("2026-01-10"),
      }),
    ).toBe("2026-01-12");
  });

  it("refuses missing tasks and invalid recurrence rows rather than inventing dates", () => {
    const calendar = LEGISLATIVE_SESSION_CALENDARS.congress;
    expect(() =>
      nextSessionCalendarDate(calendar, makeIsoDate("2026-01-05"), "budget"),
    ).toThrow(/no 'budget' task/);
    expect(() =>
      nextSessionCalendarDate(
        { ...calendar, sitting: { kind: "interval", days: 0 } },
        makeIsoDate("2026-01-05"),
      ),
    ).toThrow(/invalid interval/);
    expect(() =>
      nextSessionCalendarDate(
        { ...calendar, sitting: { kind: "weekdays", weekdays: [] } },
        makeIsoDate("2026-01-05"),
      ),
    ).toThrow(/invalid weekdays/);
  });

  it("saves actual due records and adds no duplicate on Continue in a place sampled from all 56", () => {
    const seed = "a11-one-session-calendar-20261001";
    const index =
      createHash("sha256").update(seed).digest().readUInt32BE(0) %
      CHIEF_EXECUTIVE_JURISDICTIONS.length;
    const placeKey = CHIEF_EXECUTIVE_JURISDICTIONS[index]!;
    const jurisdiction = stateJurisdictionForKey(`US-${placeKey}`)!;
    expect(jurisdiction).toBeDefined();
    const world = createWorld({
      seed,
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const officeKey = "test:calendar-records-only";
    const scheduled = scheduleCongressSitting(
      scheduleGoverningSeasons(world, officeKey, jurisdiction.id),
    );
    const due = scheduled.history.futureDueItems.filter(
      (row) =>
        row.stableKey.includes(officeKey) ||
        row.stableKey.startsWith("congress-sitting/v1:"),
    );
    expect(due.map((row) => row.dueAt)).toEqual([
      "2026-12-01",
      "2026-02-15",
      "2026-01-06",
    ]);
    const continued = deserializeWorld(serializeWorld(scheduled));
    const repeated = scheduleCongressSitting(
      scheduleGoverningSeasons(continued, officeKey, jurisdiction.id),
    );
    expect(repeated.history.futureDueItems).toEqual(
      continued.history.futureDueItems,
    );
    expect(continued.history.futureDueItems).toEqual(
      scheduled.history.futureDueItems,
    );
    console.log("A11 calendar records", {
      seed,
      placeKey,
      dueIds: due.map((row) => row.id),
      dates: due.map((row) => row.dueAt),
    });
  });
});
