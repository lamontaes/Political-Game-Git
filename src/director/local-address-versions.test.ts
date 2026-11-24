import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { composeLocalAddress, type LocalLevel } from "./local-address";
import { addressSentences } from "./address-sentences";

/**
 * A governor's and a town head's address say their own world, not a stock
 * sentence every world shares (the lead, Nov 12: "I am here to report on the
 * work of our local government and to put specific proposals before the
 * board." in St. David and in Little Elbow, word for word). Ten worlds are
 * drawn from all 56 places on a seed nobody chose (replay with
 * LOCAL_VERSIONS_SEED), each built as the player gets it, and both addresses
 * composed as they are given: no whole sentence is said in more than two of
 * the ten worlds. A greeting or a close that carries no fact of its world
 * repeats by the luck of small pools; one that names the body, the place or
 * the ask does not.
 */
const base = process.env.LOCAL_VERSIONS_SEED || randomBytes(8).toString("hex");
const WORLDS = 10;
const MOST_WORLDS_PER_SENTENCE = 2;
const LEVELS: readonly LocalLevel[] = ["state", "town"];

// One splitter for both versions tests: a question of three words or fewer
// ("Why?") is read with the sentence after it (the words lead's ruling of
// Nov 12; owner, Nov 11, call 12: "Replies of one to three words and action
// names stay"). The bound is unchanged.
const sentencesOf = addressSentences;

it(`a governor's and a town's addresses say no sentence in more than two of ten drawn worlds (seed ${base})`, () => {
  const was = setBookkeeping(false);
  try {
    const inWorlds = new Map<string, string[]>();
    let given = 0;
    for (let at = 0; at < WORLDS; at += 1) {
      const seed = createHash("sha256").update(`${base}:${at}`).digest("hex");
      const place = drawPlace(seed, "local-address-versions");
      const where = `${place.name} (${place.key}), seed ${base}:${at}`;
      const world = buildBenchWorld(place.seed, "2025-01-20", {
        twoLevel: true,
        placeKey: place.key,
      });
      const said = new Set<string>();
      for (const level of LEVELS) {
        const story = composeLocalAddress(world.core, level);
        // A place that seats no one to give it, or whose speaker has nothing
        // to ask, gives no address: named, never failed.
        if (!story) {
          console.log(
            `local-address-versions: no ${level} address in ${where}`,
          );
          continue;
        }
        given += 1;
        for (const sentence of sentencesOf(story.text)) said.add(sentence);
      }
      for (const sentence of said)
        inWorlds.set(sentence, [...(inWorlds.get(sentence) ?? []), where]);
    }
    const shared = [...inWorlds]
      .filter(([, wheres]) => wheres.length > MOST_WORLDS_PER_SENTENCE)
      .map(([sentence, wheres]) => `"${sentence}" in ${wheres.join("; ")}`);
    expect(
      given,
      `seed ${base}: no address given in ten worlds`,
    ).toBeGreaterThan(0);
    expect(shared, `seed ${base}`).toEqual([]);
  } finally {
    setBookkeeping(was);
  }
}, 1_800_000);
