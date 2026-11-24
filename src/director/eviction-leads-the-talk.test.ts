/**
 * Hard news of a person's own life leads their talk (Words lead, Nov 14,
 * 2026: "a relative put out that day who opens on consumer loan interest or
 * defense spending"). A relative put out of their home opens the talk with
 * it, whatever else the day's news weighs for them. Played in the places the
 * fault was found, drawn from one seed: Kings, Illinois (draw 1) and Baltic,
 * Connecticut (draw 2), plus Faleasao, American Samoa (draw 0) where it
 * already led.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { familyFactsOf } from "../core2/modules/people";
import { drawPlace } from "../../scripts/core2-year/place";
import { openConversation } from "./conversation";

const SEED = "447c806a-1dcc-4172-b521-dd58499dcd08";
const PLACES = [
  { draw: 0, name: "Faleasao, American Samoa" },
  { draw: 1, name: "Kings, Illinois" },
  { draw: 2, name: "Baltic, Connecticut" },
];

describe("hard news leads the talk", () => {
  for (const { draw, name } of PLACES)
    it(
      `a relative put out of their home tells it first in ${name}`,
      { timeout: 300_000 },
      () => {
        setBookkeeping(false);
        const place = drawPlace(`${SEED}:${draw}`, "eviction-talk");
        expect(place.name).toBe(name);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const { core, director } = world;
        const playerId = world.playerId!;
        const checked: string[] = [];
        for (let day = 0; day < 120 && !checked.length; day += 1) {
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
          const cases = coreAPI(core).moduleState("housing").table("cases");
          for (const row of cases.rows() as unknown as {
            id: string;
            stage?: string;
            householdId: string;
          }[]) {
            if (row.stage !== "removed") continue;
            const household = core.households.get(row.householdId);
            const adult = household?.memberIds.find((id) => {
              const person = core.people.get(id);
              return (
                !!person?.alive &&
                id !== playerId &&
                ageOnDate(
                  makeIsoDate(person.birthDate),
                  makeIsoDate(core.date),
                ) >= 18 &&
                // A relative of the player (the household of someone they know).
                !!familyFactsOf(core.people.get(playerId)!).get(id)
              );
            });
            if (!adult || checked.includes(adult)) continue;
            checked.push(adult);
            const talk = openConversation(core, playerId, adult, { director });
            expect(
              talk.lines.some((line) => line.kind === "eviction"),
              `${name}: ${adult} on ${core.date} opened ${talk.lines.map((line) => line.text).join(" / ")}`,
            ).toBe(true);
          }
        }
        expect(checked.length).toBeGreaterThan(0);
      },
    );
});
