/** The people pass of the pre-start run: a full person's own dated past, read by record id. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { worldGameOptions } from "./modules/world";
import { preStartHistory } from "./pre-start";
import { newGame } from "./saves";

it("lists a full person's birth or dated past before the start, by record id", () => {
  const place = drawPlace(randomBytes(32).toString("hex"), "pre-start-people");
  const label = `${place.key} seed ${place.seed}`;
  const game = newGame(
    {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      preStart: { from: "2000-01-01" },
    },
    worldGameOptions(),
  );
  const core = game.core;
  const rows = preStartHistory(core).filter((row) =>
    row.id.startsWith("person-history:"),
  );
  expect(rows.length, label).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.date < core.startedAt, row.id).toBe(true);
    const person = core.people.get(row.personIds![0]!);
    expect(person, row.id).toBeDefined();
    expect(person!.tier, row.id).not.toBe("husk");
  }
  const first = rows[0]!;
  expect(
    preStartHistory(core, { personId: first.personIds![0]! }),
    label,
  ).toContain(first);
}, 600_000);
