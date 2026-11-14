// @vitest-environment node
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { officeActsOf } from "../core2/modules/office-day";
import { OFFICE_DAY_STATE_MODULE_ID } from "../core2/office-day-state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

// The country's addresses are one engine's: a world governor's State of the
// State comes on its calendar day through the state kit, and the President's
// joint address through the federal one, as the played office-holder's
// character gives them (pool item gov-world-governors-and-president-never-give-their-address).
const PINNED = [
  { at: "mayor-acts-1:1", name: "Edmore" },
  { at: "mayor-acts-1:3", name: "Odessa" },
];

describe.each(PINNED)(
  "world governors and the President give their address ($name)",
  ({ at, name }) => {
    it("on its day, by the state and federal acts", () => {
      setBookkeeping(false);
      const place = drawPlace(at, "mayor-acts");
      expect(place.name).toContain(name);
      const w = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(w.core, makeIsoDate("2026-02-01"));
      const api = coreAPI(w.core);
      const results = api
        .moduleState(OFFICE_DAY_STATE_MODULE_ID)
        .table("results")
        .rows() as unknown as {
        kind: string;
        holderId: string;
        date: string;
      }[];
      const governors = results.filter((r) => r.kind === "state-of-the-state");
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
        ? officeActsOf(api, president).filter((a) => a.kind === "joint-address")
        : [];
      if (process.env.ACTS_OUT)
        appendFileSync(
          process.env.ACTS_OUT,
          `${place.name} ${w.core.date} governors ${JSON.stringify(governors.map((g) => [g.holderId.slice(-6), g.date]))} joint ${JSON.stringify(joint.map((j) => j.date))}\n`,
        );
      // The sessions of January 2025 convened before the world's first day
      // (the opening lacks last year's address: pool item
      // gov-opening-lacks-last-years-address), so the first governors' addresses
      // are the next January's, one per governor, each on its own state's day.
      expect(governors.length, place.name).toBeGreaterThan(20);
      expect(new Set(governors.map((g) => g.holderId)).size, place.name).toBe(
        governors.length,
      );
      expect(
        governors.every((g) => g.date.startsWith("2026-01")),
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
    }, 300_000);
  },
);
