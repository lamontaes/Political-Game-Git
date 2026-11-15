// @vitest-environment node
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { officeActsOf, OFFICE_DAY_MODULE } from "../core2/modules/office-day";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import type { TermRow } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { leaveHoldsToCharacter } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// A world opens with its office-holders mid-cycle (pool item
// gov-opening-lacks-last-years-address; skill day-one-in-motion): the last
// office hours and town hall were some days ago, spread over the custom's
// interval, and each executive gave last year's address. Pinned to named
// places and fixed draws (skill pinned-tests).
const PINNED = [
  { at: "mayor-acts-1:1", name: "Edmore", kind: "mayor" },
  { at: "mayor-acts-1:3", name: "Odessa", kind: "mayor" },
  // A town with a county executive as well, so both kinds of address show.
  { at: "ce-probe:2", name: "Maynardville", kind: "county-executive" },
];

describe.each(PINNED)(
  "the opening's office acts ($name)",
  ({ at, name, kind }) => {
    it("holds each holder's last office hours and town hall inside the interval, and last year's address", () => {
      setBookkeeping(false);
      const place = drawPlace(at, "mayor-acts");
      expect(place.name).toContain(name);
      const w = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(w.core);
      const year = Number(w.core.date.slice(0, 4));
      const terms = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .rows() as unknown as TermRow[]
      ).filter((t) => t.status === "serving" && t.personId);
      const holders = [...new Set(terms.map((t) => t.personId!))].filter(
        (id) => api.state.people.has(id) && officeActsOf(api, id).length > 0,
      );
      expect(
        holders.length,
        `${place.name}: holders with acts`,
      ).toBeGreaterThan(2);
      const ages = new Map<string, number[]>();
      for (const id of holders)
        for (const row of officeActsOf(api, id)) {
          if (row.kind !== "office-hours" && row.kind !== "town-hall") continue;
          const ago = daysBetween(
            makeIsoDate(row.date),
            makeIsoDate(w.core.date),
          );
          ages.set(row.kind, [...(ages.get(row.kind) ?? []), ago]);
          expect(ago, `${row.kind} of ${id}`).toBeGreaterThanOrEqual(0);
          expect(ago, `${row.kind} of ${id}`).toBeLessThan(
            api.parameter(
              row.kind === "town-hall"
                ? "townHallIntervalDays"
                : "officeHoursIntervalDays",
            ),
          );
        }
      // Spread over the interval, not all on one day.
      for (const [kind, list] of ages)
        expect(new Set(list).size, `${kind} spread`).toBeGreaterThan(1);
      // The town's executives gave last year's address, in the season.
      const mayors = townSeats(api).filter(
        (row) =>
          (row.office.kind === "mayor" ||
            row.office.kind === "county-executive") &&
          row.holder?.personId &&
          api.state.people.has(row.holder.personId),
      );
      expect(mayors.length).toBeGreaterThan(0);
      // Each gave it only when they held the seat by then: a holder whose term
      // began after last year's address season did not give it.
      let gave = 0;
      for (const row of mayors) {
        const last = officeActsOf(api, row.holder!.personId!).filter(
          (a) => a.kind === "state-of-the-city",
        );
        const began = row.holder!.serviceStart ?? row.holder!.startDate;
        if (last.length === 0) {
          expect(
            began > `${year - 1}-01-15`,
            `${place.name}: ${row.holder!.id}`,
          ).toBe(true);
          continue;
        }
        gave += 1;
        expect(last.map((a) => a.date.slice(0, 4))).toEqual([`${year - 1}`]);
        expect(began <= last[0]!.date, `${place.name}: began ${began}`).toBe(
          true,
        );
        expect(Number(last[0]!.date.slice(5, 7))).toBeLessThanOrEqual(
          api.parameter("stateOfCityLastMonth"),
        );
      }
      expect(
        gave,
        `${place.name}: executives who gave last year's address`,
      ).toBeGreaterThan(0);
      // The duty of the seat is partly come due on day one, not all of it.
      const lead = mayors.find((row) => row.office.kind === kind);
      expect(lead, `${place.name}: a ${kind}`).toBeDefined();
      const mayor = lead!.holder!.personId!;
      const duty = OFFICE_DAY_MODULE.needEvaluators!["office-duty"]!(
        api,
        api.state.people.get(mayor)!,
      );
      expect(duty, `${place.name}: the mayor's duty on day one`).toBeLessThan(
        1,
      );
      // Played from day one for four weeks, the acts come round on the
      // schedule (the same route the bench player takes).
      const player = new BenchPlayer(w.core, w.director);
      player.select(mayor);
      let r: ReturnType<typeof player.advance> = player.advance("week");
      for (let g = 0, weeks = 1; weeks < 4 && g < 3000; g++) {
        if (player.pollingPlace) player.leavePolls();
        if (r.packet.kind === "complete") {
          r = player.advance("week");
          weeks++;
          continue;
        }
        leaveHoldsToCharacter(w.core, r.packet.controlledPersonId);
        r = {
          ...r,
          ...player.resume({ kind: "stop", pauseId: r.packet.pauseId }),
        };
      }
      const taken = officeActsOf(api, mayor).filter(
        (a) => a.detail !== "before the start",
      );
      const kinds = new Map<string, number>();
      for (const a of taken) kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1);
      const note = `${place.name}: duty ${duty.toFixed(2)}; four weeks ${JSON.stringify([...kinds])}`;
      if (process.env.ACTS_OUT)
        appendFileSync(process.env.ACTS_OUT, `${note}\n`);
      expect(taken.length, note).toBeGreaterThan(0);
    }, 120_000);
  },
);
