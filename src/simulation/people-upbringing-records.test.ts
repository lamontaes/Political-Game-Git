import { writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../presentation/new-game-geography";
import { createOpeningLifeController } from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { ageOnDate } from "./dates";
import { lifePersonalityFromUpbringing } from "./life-personality";
import {
  upbringingCoreValueFrom,
  upbringingFor,
  type PersonUpbringing,
} from "./people-upbringing";

/**
 * Summarized earlier lives read their upbringing from the household records
 * (siblings, congregation, pay, caregivers per child, moves, a parent's
 * death), so sociability, conflict, risk and the opening goal vary from one
 * person to the next. Three places drawn at random from all 56; the evidence
 * file is written when UPBRINGING_EVIDENCE_OUT is set.
 */
const SEEDS = ["records-a", "records-b", "records-c"];
const TRAITS = ["sociability", "conflict", "risk"] as const;

function spread(values: readonly number[]) {
  const out: Record<string, number> = {
    "-2": 0,
    "-1": 0,
    "0": 0,
    "1": 0,
    "2": 0,
  };
  for (const v of values) out[String(v)] = (out[String(v)] ?? 0) + 1;
  return out;
}

describe("records-based upbringing for summarized lives", () => {
  const evidence: unknown[] = [];
  for (const seed of SEEDS) {
    const place = drawRandomPlace(seed);
    it(`spreads traits and goals in ${place.displayName} (seed ${seed})`, () => {
      const game = createOpeningLifeController(
        explicitNewGameSetup({
          placeKey: place.key,
          seed,
          startAge: 30 as never,
          depth: "summarize-earlier-life",
        }),
      ).finishTransition().game!;
      const world = game.world;
      const adults = world.personOrder.filter(
        (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
      );
      const before = (u: PersonUpbringing) => ({
        ...u,
        recordedLean: undefined,
      });
      const rows = adults.map((id) => {
        const up = upbringingFor(world, id);
        return {
          after: TRAITS.map((t) => upbringingCoreValueFrom(up, t)),
          before: TRAITS.map((t) => upbringingCoreValueFrom(before(up), t)),
          goalAfter: lifePersonalityFromUpbringing(up).goal,
          goalBefore: lifePersonalityFromUpbringing(before(up)).goal,
        };
      });
      const entry: Record<string, unknown> = {
        seed,
        place: place.displayName,
        placeKey: place.key,
        people: adults.length,
        goalBefore: {},
        goalAfter: {},
      };
      for (const key of ["goalBefore", "goalAfter"] as const) {
        const tally: Record<string, number> = {};
        for (const r of rows) tally[r[key]] = (tally[r[key]] ?? 0) + 1;
        entry[key] = tally;
      }
      TRAITS.forEach((t, i) => {
        entry[t] = {
          before: spread(rows.map((r) => r.before[i]!)),
          after: spread(rows.map((r) => r.after[i]!)),
        };
      });
      evidence.push(entry);
      if (process.env.UPBRINGING_EVIDENCE_OUT)
        writeFileSync(
          process.env.UPBRINGING_EVIDENCE_OUT,
          JSON.stringify(evidence, null, 2),
        );
      expect(Object.keys(entry.goalAfter as object).length).toBeGreaterThan(1);
      for (const t of TRAITS) {
        const after = (entry[t] as { after: Record<string, number> }).after;
        expect(
          Object.values(after).filter((n) => n > 0).length,
        ).toBeGreaterThan(1);
      }
    }, 600_000);
  }
});
