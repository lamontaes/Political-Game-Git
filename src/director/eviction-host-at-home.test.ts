/**
 * A relative put out who moves in with the player is not "my sister's" or
 * "Dad's" to the player who lives there (Words lead, Nov 14, 2026): the
 * telling's host is said as "you" or "you all" (`host-here`), in every reply.
 * Pinned to two drawn places: Chalan Pago-Ordot, Guam (seed 447c806a-1dcc-
 * 4172-b521-dd58499dcd08, draw 3), and Churubusco, Indiana (seed
 * 53188eee-6f04-46f1-8af7-e35783331996, draw 0), where a sibling put out
 * goes "to Dad's" and Dad's is the player's own home.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { openConversation, say } from "./conversation";

const PLACES = [
  {
    seed: "447c806a-1dcc-4172-b521-dd58499dcd08",
    draw: 3,
    name: "Chalan Pago-Ordot, Guam",
  },
  {
    seed: "53188eee-6f04-46f1-8af7-e35783331996",
    draw: 0,
    name: "Churubusco, Indiana",
  },
];

describe("a relative put out who moves in with the player", () => {
  for (const { seed, draw, name } of PLACES)
    it(
      `says the player's home as "you" in every answer in ${name}`,
      { timeout: 300_000 },
      () => {
        setBookkeeping(false);
        const place = drawPlace(`${seed}:${draw}`, "eviction-talk");
        expect(place.name).toBe(name);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const { core, director } = world;
        const playerId = world.playerId!;
        const mine = core.people.get(playerId)!.householdId;
        let checked = 0;
        for (let day = 0; day < 200 && !checked; day += 1) {
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
          const housing = coreAPI(core).moduleState("housing");
          for (const row of housing.table("cases").rows() as unknown as {
            stage?: string;
            householdId: string;
          }[]) {
            if (row.stage !== "removed" || checked) continue;
            const status = housing.table("statuses").get(row.householdId) as
              { status: string; hostHouseholdId?: string } | undefined;
            if (
              status?.status !== "doubled-up" ||
              status.hostHouseholdId !== mine
            )
              continue;
            const adult = core.households
              .get(row.householdId)
              ?.memberIds.find((id) => {
                const person = core.people.get(id);
                return (
                  !!person?.alive &&
                  ageOnDate(
                    makeIsoDate(person.birthDate),
                    makeIsoDate(core.date),
                  ) >= 18
                );
              });
            if (!adult) continue;
            checked += 1;
            const talk = openConversation(core, playerId, adult, { director });
            expect(talk.lines.some((line) => line.kind === "eviction")).toBe(
              true,
            );
            for (const choice of talk.choices) {
              const copy = Object.fromEntries(
                Object.entries(talk).map(([key, value]) => [
                  key,
                  Array.isArray(value) ? [...value] : value,
                ]),
              ) as typeof talk;
              const from = copy.lines.length;
              say(core, copy, choice.key);
              const back = copy.lines
                .slice(from)
                .filter((line) => line.speakerId !== playerId);
              const facts = back.flatMap((line) => line.wording?.facts ?? []);
              expect(
                facts.includes("host"),
                `${name}: "${choice.text}" answered ${back.map((line) => line.text).join(" / ")}`,
              ).toBe(false);
              expect(
                back.every(
                  (line) =>
                    !/\bmy [a-z]+'s\b|\bDad's\b|\bMom's\b/.test(line.text),
                ),
                back.map((line) => line.text).join(" / "),
              ).toBe(true);
            }
          }
        }
        expect(checked).toBe(1);
      },
    );
});
