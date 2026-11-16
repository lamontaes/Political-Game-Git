// @vitest-environment node
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { officeActsOf } from "../core2/modules/office-day";
import { sessionYear } from "../core2/state-session-calendar";
import {
  OFFICE_DAY_STATE_MODULE_ID,
  stateDay,
  stateDayParameter,
  type StateOffice,
} from "../core2/office-day-state";
import { lawChain } from "../core2/modules/laws";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

// The country's addresses are one engine's: a world governor's State of the
// State comes on its calendar day through the state kit, and the President's
// joint address through the federal one, as the played office-holder's
// character gives them (pool item gov-world-governors-and-president-never-give-their-address).
// Each place's limit is about twice its case's time: Edmore 66 s and Odessa 116 s alone here, and
// Edmore 75 s in the lead's run (Nov 16, Train 2ef89906).
const PINNED = [
  { at: "mayor-acts-1:1", name: "Edmore", limit: 150_000 },
  { at: "mayor-acts-1:3", name: "Odessa", limit: 240_000 },
];

describe.each(PINNED)(
  "world governors and the President give their address ($name)",
  ({ at, name, limit }) => {
    it(
      "on its day, by the state and federal acts",
      () => {
        setBookkeeping(false);
        const place = drawPlace(at, "mayor-acts");
        expect(place.name).toContain(name);
        const w = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        advanceCore(w.core, makeIsoDate("2026-05-01"));
        const api = coreAPI(w.core);
        const results = api
          .moduleState(OFFICE_DAY_STATE_MODULE_ID)
          .table("results")
          .rows() as unknown as {
          kind: string;
          holderId: string;
          date: string;
        }[];
        const governors = results.filter(
          (r) => r.kind === "state-of-the-state",
        );
        const terms = api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .rows() as unknown as {
          seatId?: string;
          personId?: string;
          status: string;
        }[];
        const president = terms.find(
          (t) => t.seatId === "seat:US:president" && t.status === "serving",
        )?.personId;
        const joint = president
          ? officeActsOf(api, president).filter(
              (a) => a.kind === "joint-address",
            )
          : [];
        if (process.env.ACTS_OUT)
          appendFileSync(
            process.env.ACTS_OUT,
            `${place.name} ${w.core.date} governors ${JSON.stringify(governors.map((g) => [g.holderId.slice(-6), g.date]))} joint ${JSON.stringify(joint.map((j) => j.date))}\n`,
          );
        // The sessions of January 2025 convened before the world's first day
        // (the opening lacks last year's address: pool item
        // gov-opening-lacks-last-years-address), so the first governors'
        // addresses are 2026's, one per governor, each on its own state's day.
        expect(new Set(governors.map((g) => g.holderId)).size, place.name).toBe(
          governors.length,
        );
        // Every state's governor is accounted for by the world's own record:
        // the governor gave it, or the session calendar table says the state's
        // legislature does not meet in 2026.
        const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
        const jurisdictionOf = (officeId: string) =>
          (offices.get(officeId) as unknown as { jurisdiction: string })
            .jurisdiction;
        const servingGovernors = terms.filter(
          (t) =>
            t.status === "serving" &&
            (offices.get(t.officeId) as unknown as { kind?: string })?.kind ===
              "governor",
        );
        const gaveStates = new Set(
          governors.map((g) =>
            jurisdictionOf(
              terms.find((t) => t.personId === g.holderId)!.officeId,
            ),
          ),
        );
        const states = new Set(
          servingGovernors.map((t) => jurisdictionOf(t.officeId)),
        );
        const silent = [...states].filter((k) => !gaveStates.has(k));
        const noSession = silent.filter((k) => !sessionYear(k, 2026)?.meets);
        // A session the table says convened before 2026 (Indiana's started
        // 2025-12-01, the Marianas' legislature has sat continuously since
        // 2025-01-13) had its address in 2025, before that year's window.
        const earlier = silent.filter(
          (k) =>
            !noSession.includes(k) &&
            !sessionYear(k, 2026)!.windows.some((w) =>
              w.conveneAt.startsWith("2026-"),
            ),
        );
        const other = silent.filter(
          (k) => !noSession.includes(k) && !earlier.includes(k),
        );
        if (process.env.ACTS_OUT)
          appendFileSync(
            process.env.ACTS_OUT,
            `${place.name} states ${states.size} gave ${gaveStates.size} noSession ${JSON.stringify(noSession)} earlier ${JSON.stringify(earlier)} other ${JSON.stringify(other)}\n`,
          );
        // The address is the seat's, read on its day: whoever gave it held that
        // state's governor seat on that date, so a governor who left between the
        // first of the month and the day (Arkansas's, April 3, 2026, at this place)
        // is replaced by a successor who gives it, and no state goes without.
        for (const g of governors) {
          const held = (
            terms as unknown as {
              personId?: string;
              seatId?: string;
              startDate: string;
              endDate: string | null;
              status: string;
            }[]
          ).filter((t) => t.personId === g.holderId);
          expect(
            held.some(
              (t) =>
                t.startDate <= g.date &&
                (t.endDate === null || t.endDate >= g.date),
            ),
            `${place.name}: ${g.holderId.slice(-6)} held the seat on ${g.date}`,
          ).toBe(true);
        }
        expect(gaveStates.size, place.name).toBeGreaterThan(40);
        expect(other, place.name).toEqual([]);
        expect(
          governors.every((g) => g.date >= "2026-01"),
          place.name,
        ).toBe(true);
        expect(
          new Set(governors.map((g) => g.date)).size,
          place.name,
        ).toBeGreaterThan(3);
        expect(
          joint.map((j) => j.date),
          place.name,
        ).toContain("2025-03-04");
      },
      limit,
    );
  },
);

// Another state's governor keeps only the result of the yearly address (owner,
// Nov 5, 12:49 p.m. Eastern, OWNER-DECISIONS.md lines 205 to 213): the result
// row stands and no speech is delivered to a full audience. The player's own
// state's governor speaks to its legislators and to the followers of the
// town's outlets. Before this, every state's address went to the town's
// outlet followers, so a town's readers heard 49 other governors a year.
describe("another state's governor keeps only the result of the address", () => {
  it("delivers no speech outside the player's state and still delivers inside it", () => {
    setBookkeeping(false);
    const place = drawPlace("mayor-acts-1:3", "mayor-acts");
    expect(place.name).toContain("Odessa");
    const w = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(w.core, makeIsoDate("2026-05-01"));
    const api = coreAPI(w.core);
    const results = api
      .moduleState(OFFICE_DAY_STATE_MODULE_ID)
      .table("results")
      .rows() as unknown as {
      kind: string;
      holderId: string;
      recordIds: string[];
      choice: { kind: string };
    }[];
    const governors = results.filter((r) => r.kind === "state-of-the-state");
    const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as { personId?: string; officeId: string }[];
    const ownState = lawChain(api).stateKey;
    const stateOf = (holderId: string) =>
      (
        offices.get(
          terms.find((t) => t.personId === holderId)!.officeId,
        ) as unknown as { jurisdiction: string }
      ).jurisdiction;
    const outside = governors.filter((g) => stateOf(g.holderId) !== ownState);
    const inside = governors.filter((g) => stateOf(g.holderId) === ownState);
    expect(outside.length, place.name).toBeGreaterThan(30);
    // The result row is kept, with what the governor said, and no speech.
    for (const g of outside) {
      expect(g.choice.kind, place.name).toBe("address");
      expect(g.recordIds, place.name).toEqual([]);
    }
    // The player's own state's governor speaks, as before.
    for (const g of inside)
      expect(g.recordIds.length, place.name).toBeGreaterThan(0);
    if (process.env.ACTS_OUT)
      appendFileSync(
        process.env.ACTS_OUT,
        `${place.name} outside ${outside.length} inside ${inside.length}\n`,
      );
  }, 300_000);
});

// The played governor's own day reads the same date rule the world's
// governors use (`firstWindow`: the first session window that convenes in the
// year), pinned at Edmore ND: Washington's 2026 address is its January
// convening plus the kit's days, and Indiana's session that convened
// 2025-12-01 puts its address in 2025, not 2026.
it("gives a played governor's State of the State on the session's own date (Edmore)", () => {
  setBookkeeping(false);
  const place = drawPlace("mayor-acts-1:1", "mayor-acts");
  expect(place.name).toContain("Edmore");
  const w = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(w.core);
  const governor = (stateKey: string): StateOffice => ({
    personId: "pinned-governor",
    role: "governor",
    stateKey,
    officeId: "office:pinned",
    seatId: "seat:pinned",
    termId: "term:pinned",
    party: null,
  });
  const addressDays = (stateKey: string, year: number) => {
    const days: string[] = [];
    for (let n = 0; n < 366; n++) {
      const date = addDays(makeIsoDate(`${year}-01-01`), n);
      if (!date.startsWith(`${year}-`)) break;
      if (
        stateDay(api, governor(stateKey), date).some(
          (e) => e.kind === "state-of-the-state",
        )
      )
        days.push(date);
    }
    return days;
  };
  const after = stateDayParameter("stateOfTheStateDaysAfterConvening");
  const washington = sessionYear("US-WA", 2026)!.windows[0]!.conveneAt;
  expect(addressDays("US-WA", 2026)).toEqual([
    addDays(makeIsoDate(washington), after),
  ]);
  expect(addressDays("US-IN", 2026)).toEqual([]);
}, 240_000);
