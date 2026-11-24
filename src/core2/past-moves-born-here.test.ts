/**
 * A child whose other parent already lived in the town the day they were born
 * was born here: one parent's later move into the county does not bring them
 * (gap sheet, Nov 23, 2026, C5: a one-year-old "relocated" in 2012 though the
 * family arrived in 2008). Places are drawn from all 56 until one carries a
 * child with a parent's move, and the ones passed over are named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { PERSON_MOVED_IN } from "./past-module";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("a child born after a parent was already here is not carried in by the other parent's move", () => {
  const passed: string[] = [];
  let carried = 0;
  for (let draw = 0; draw < 6 && carried === 0; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "past-moves-born-here");
    const label = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const rows = preStartHistory(core, { kind: PERSON_MOVED_IN });
    const arrival = new Map(
      rows.map((row) => [String(row.facts.personId), row.date]),
    );
    for (const row of rows)
      for (const id of (row.personIds ?? []).slice(1)) {
        const child = core.people.get(id as PersonId);
        if (!child) continue;
        carried += 1;
        for (const fact of child.pastFacts ?? []) {
          if (!["family:parent", "family:other-parent"].includes(fact.kind))
            continue;
          const parent = core.people.get(fact.facts?.otherPersonId as PersonId);
          if (
            !parent ||
            parent.id === row.facts.personId ||
            !parent.alive ||
            parent.placeId !== child.placeId
          )
            continue;
          const on = arrival.get(parent.id);
          expect(
            on !== undefined && on >= child.birthDate,
            `${label}: ${child.id} (born ${child.birthDate}) came ${row.date} with ${String(row.facts.personId)}, though ${parent.id} was here ${on ?? "always"}`,
          ).toBe(true);
        }
      }
    if (carried === 0) passed.push(label);
  }
  expect(
    carried,
    `a child carried by a move in one of six drawn places; passed over: ${passed.join("; ")}`,
  ).toBeGreaterThan(0);
}, 1_800_000);
