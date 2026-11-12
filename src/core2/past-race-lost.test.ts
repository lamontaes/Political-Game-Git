/**
 * A race lost before the game began is remembered by the person who lost it
 * (pool item core-life-record-part-8-a-race-lost-before-the-start-is-told).
 * The simulated past names its challenger from the town's own people where
 * one fits (src/core2/past-elections.ts, `pastChallenger`): of age and living
 * in town by the race's day, on the challenger's side of the lean, the most
 * engaged first. The loser's own past holds the race, the life record tells
 * it, and their card says it with the race's year. Places are drawn from all
 * 56 until one has a named past challenger (up to five per case); every place
 * passed over is named. Replay with PAST_RACE_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lifeOf } from "./modules/people";
import { preStartHistory } from "./past";
import { PAST_RACE_LOST } from "./past-elections";
import type { PersonId } from "./types";

setBookkeeping(false);

const base = process.env.PAST_RACE_SEED ?? randomBytes(8).toString("hex");

describe.each(["a", "b"])("a past race's loser (case %s)", (draw) => {
  it("is a person of the town whose life and card tell the race they lost", () => {
    const passed: string[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seed = `${base}:${draw}:${attempt}`;
      const place = drawPlace(seed, "past-race-lost");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const lost = preStartHistory(core, { kind: PAST_RACE_LOST });
      if (!lost.length) {
        passed.push(`${where}: no past race has a challenger from the town`);
        continue;
      }
      for (const row of lost) {
        const loserId = row.personIds[0] as PersonId;
        const loser = core.people.get(loserId);
        expect(loser, `${where}: ${row.id} names no person`).toBeDefined();
        expect(row.date < core.startedAt, `${where}: ${row.id}`).toBe(true);
        expect(String(row.facts.winnerId), `${where}: ${row.id}`).not.toBe(
          loserId,
        );
        const told = lifeOf(core, loserId).find((event) => event.id === row.id);
        expect(
          told?.life,
          `${where}: ${loserId}'s life does not hold ${row.id}`,
        ).toBe("politics");
        expect(told?.what, `${where}: ${row.id}`).toBe("lost");
      }
      // The card of the first loser tells the race, dated its year, and the
      // sentence opens the race's record.
      const first = lost[0]!;
      const card = knownCard(core, playerId!, first.personIds[0]!);
      const line = card.history.find((entry) =>
        entry.records.includes(first.id),
      );
      expect(
        line,
        `${where}: ${first.personIds[0]}'s card does not tell ${first.id} (${card.history.map((entry) => entry.text).join(" | ")})`,
      ).toBeDefined();
      expect(line!.kind, `${where}: ${line!.text}`).toBe("office");
      expect(line!.date.slice(0, 4), `${where}: ${line!.text}`).toBe(
        first.date.slice(0, 4),
      );
      expect(line!.text, `${where}`).toMatch(/lost the race for/);
      appendFileSync(
        process.env.PAST_RACE_LOG ?? "/dev/null",
        "\n" +
          `past-race-lost: ${where}; ${lost.length} named losers, e.g. ${first.id}; passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a named past challenger: ${passed.join("; ")}`,
    );
  }, 1_800_000);
});
