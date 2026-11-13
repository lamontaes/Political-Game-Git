/**
 * The life record, part 5: a relative who grew up in the player's household
 * and now lives elsewhere (husk tier) has, once opened, their school years in
 * the household's town and the day they left it, by the moves engine's own
 * rule, the same every time and in a world built again from the same seed.
 * A relative in the player's starting circle is opened at the opening, and
 * opening them again changes nothing. Played in a bench world drawn from all 56; the draw goes on until a
 * player's relative elsewhere has a parent in the town, naming each place it
 * passed over.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { lifeOf, openWholePast } from "./modules/people";
import type { CoreState, PersonId, PersonState } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

const build = (worldSeed: string, key: string) =>
  buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });

/** The player's relatives elsewhere who have a parent living in the town. */
function raisedHere(core: CoreState, player: PersonState): PersonState[] {
  return [...player.familyIds]
    .map((id) => core.people.get(id as PersonId))
    .filter((p): p is PersonState => Boolean(p && p.tier === "husk"))
    .filter((p) =>
      (p.pastFacts ?? []).some(
        (fact) =>
          fact.kind === "family:parent" &&
          core.people.get(fact.facts?.otherPersonId as PersonId)?.placeId ===
            player.placeId,
      ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

const told = (core: CoreState, id: PersonId) =>
  lifeOf(core, id)
    .filter((event) => event.life === "school" || event.life === "move")
    .map((event) => `${event.id}|${event.date}|${event.placeId ?? ""}`);

it("a relative elsewhere has school years in the household's town and the day they left", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(seed, `kin-elsewhere:${draw}`);
    const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}`;
    const built = build(place.seed, place.key);
    const core = built.core;
    const player = built.playerId
      ? core.people.get(built.playerId as PersonId)
      : undefined;
    const relatives = player ? raisedHere(core, player) : [];
    if (!player || !relatives.length) {
      passed.push(`${where}: no relative elsewhere raised in the town`);
      continue;
    }
    const town = player.placeId;
    for (const relative of relatives) {
      const label = `${relative.id} (born ${relative.birthDate}), in ${where}`;
      openWholePast(core, relative.id);
      const life = lifeOf(core, relative.id);
      const schools = life.filter(
        (e) => e.life === "school" && e.what === "started",
      );
      const left = life.find((e) => e.life === "move");
      expect(schools.length, `${label}: school years`).toBeGreaterThan(0);
      expect(left, `${label}: the day they left`).toBeTruthy();
      expect(left!.facts?.fromPlaceId, `${label}: left the town`).toBe(town);
      for (const school of schools.filter((s) => s.date < left!.date))
        expect(school.placeId, `${label}: school in the town`).toBe(town);
      // Opened again, nothing changes.
      const once = told(core, relative.id);
      openWholePast(core, relative.id);
      expect(told(core, relative.id), `${label}: opened twice`).toEqual(once);
    }
    // The same relative in the same world built again tells the same years.
    const again = build(place.seed, place.key).core;
    const first = relatives[0]!;
    openWholePast(again, first.id);
    expect(
      told(again, first.id),
      `${first.id} in a rebuilt world, ${where}`,
    ).toEqual(told(core, first.id));
    process.stderr.write(
      `${[...passed, `${where}: ${relatives.length} relatives elsewhere, e.g. ${first.id}: ${told(core, first.id).join("; ")}`].join("\n")}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a relative elsewhere raised in the town:\n${passed.join("\n")}`,
  );
}, 1_800_000);
