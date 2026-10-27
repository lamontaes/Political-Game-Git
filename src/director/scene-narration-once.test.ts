import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { corePlaceByKey } from "../core2/place-lookup";
import type { PersonId } from "../core2/types";
import { relationPhrase } from "../english/journal-words";
import { SCENE_WORDS } from "../english/scene-words";
import { composeScene } from "./scene";

// A scene's narration says who came and why once. When its lead names the
// one who opens the scene ("Your mother has news for you."), the opening
// sentence ("Your mother has something to tell you.") is not said as well.
// In a drawn town, the player's household and the people the player knows
// are watched as play watches them, and every scene the director stages for
// them over six months is checked.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// A place to replay first, as the golden-path runner binds one.
const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
const MONTHS = 6;
// The people the player knows who are watched, as a bound on the run's cost.
const KNOWN = 80;
const noLeads = { ...SCENE_WORDS, leads: [] };
const noOpenings = { ...SCENE_WORDS, openings: {} };
const sentencesOf = (scene: ReturnType<typeof composeScene>) =>
  (scene?.narration ?? [])
    .flatMap((line) => line.text.split(/(?<=[.!?])\s+/))
    .filter(Boolean);

it(`a scene's narration names the one who opens it once, seed ${seed}`, () => {
  setBookkeeping(false);
  const named: string[] = [];
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4 && !named.length; attempt += 1) {
      const place =
        attempt === 0 && pinned
          ? {
              key: pinned,
              seed,
              name: corePlaceByKey(pinned)?.displayName ?? pinned,
            }
          : drawPlace(seed, `scene-narration-once:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const player = core.people.get(core.playerId!)!;
      const watched = [
        player.id,
        ...(core.households.get(player.householdId)?.memberIds ?? []),
        ...[...player.knownIds].sort().slice(0, KNOWN),
      ].filter((id, at, all) => all.indexOf(id) === at);
      for (const id of watched)
        if (core.people.get(id)?.alive) director.watch(core, id);
      const seen = new Set<string>();
      let checked = 0;
      for (let month = 1; month <= MONTHS; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const book of director.ledger.people.values())
          for (const entry of book.schedule) {
            const binding = entry.bindings[0];
            if (
              !binding?.opening ||
              seen.has(`${book.personId}|${entry.momentId}`)
            )
              continue;
            seen.add(`${book.personId}|${entry.momentId}`);
            const viewer = core.people.get(book.personId)!;
            const openerId = binding.roles
              .find((row) => row.role === binding.opener)
              ?.personIds.find((id) => id !== book.personId);
            const opener = openerId ? core.people.get(openerId) : undefined;
            if (!opener) continue;
            // The opener as the viewer knows them: by relation, else by name.
            const kin = (viewer.pastFacts ?? []).find(
              (fact) =>
                fact.kind.startsWith("family:") &&
                fact.facts?.otherPersonId === opener.id,
            );
            const phrase = (
              kin
                ? relationPhrase(
                    kin.kind.slice("family:".length),
                    opener.looks?.gender ?? "other",
                    "scene",
                  )
                : opener.givenName
            )?.toLowerCase();
            if (!phrase) continue;
            const scene = composeScene(core, director, book.personId, entry);
            if (!scene) continue;
            checked += 1;
            const full = sentencesOf(scene);
            const leadless = new Set(
              sentencesOf(
                composeScene(core, director, book.personId, entry, noLeads),
              ),
            );
            const openingless = new Set(
              sentencesOf(
                composeScene(core, director, book.personId, entry, noOpenings),
              ),
            );
            const lead = full.filter((line) => !leadless.has(line));
            const opening = full.filter((line) => !openingless.has(line));
            const leadNames = lead.some((line) =>
              line.toLowerCase().includes(phrase),
            );
            if (!leadNames) continue;
            const said = `${where}: ${book.personId as PersonId} ${entry.momentId} (${binding.typeKey}, opened by ${opener.id}): "${full.join(" ")}"`;
            expect(opening, said).toEqual([]);
            named.push(said);
          }
      }
      if (!named.length)
        tried.push(
          `${where}: ${checked} scenes with an opener, none whose lead names them`,
        );
    }
    expect(named.length, tried.join("; ")).toBeGreaterThan(0);
    console.log(`SCENE NARRATION ONCE\n${named.join("\n")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
