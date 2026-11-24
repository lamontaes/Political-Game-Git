/**
 * When the player's character dies, the game goes on: the card offers the
 * living people connected to them, choosing one continues the clock with that
 * person, and their own journal is told from their own records. The death is
 * the engine's own call (`updatePerson`, as the health module makes it). A
 * random place from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { composeJournal } from "../director/journal";
import { personCard } from "./card";
import { BenchPlayer } from "./player";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`death-handoff:${Date.now()}`).digest("hex");

it("offers the living people connected to a character who died, and plays on as the one chosen", () => {
  const place = drawPlace(runSeed, "death-handoff");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const player = new BenchPlayer(core, director);
  const dying = world.playerId!;
  player.select(dying);
  player.advance("week");
  expect(core.people.get(dying)!.alive, where).toBe(true);

  // The character dies in the year.
  coreAPI(core).updatePerson(dying, { alive: false });
  const card = personCard(core, dying);
  expect(card.alive, where).toBe(false);
  const connected = [
    ...(card.home?.members ?? []).map((m) => ({
      id: m.personId,
      alive: m.alive,
    })),
    ...card.ties.map((t) => ({ id: t.personId, alive: t.alive })),
  ].filter((p) => p.alive !== false && core.people.get(p.id)?.alive);
  expect(
    connected.length,
    `someone connected is alive: ${where}`,
  ).toBeGreaterThan(0);

  // Choosing one hands the clock over: no throw, and time goes on as them.
  const chosen = connected[0]!.id;
  const before = core.date;
  player.select(chosen);
  expect(player.personId, where).toBe(chosen);
  const next = player.advance("day").packet;
  expect(next.controlledPersonId, where).toBe(chosen);
  expect(core.date > before, where).toBe(true);
  expect(core.people.get(dying)!.alive, where).toBe(false);

  // Their journal is told from their own records, not the dead character's.
  const journal = composeJournal(core, director, chosen);
  expect(
    journal.flatMap((chapter) => chapter.lines).length,
    `the new character's journal: ${where}`,
  ).toBeGreaterThan(0);
}, 900_000);
