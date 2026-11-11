import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import * as worldLegislating from "../core2/modules/world-legislating";

/**
 * The President's address is the first thing a new player hears, and it
 * introduces them to their world (owner, Nov 11, 2026: "There needs to be a
 * ton of different speech versions a ton of different inserts ... this is a
 * demonstration of the game"). Ten worlds are drawn from all 56 places on a
 * seed nobody chose (replay with OPENING_VERSIONS_SEED), each built as the
 * player gets it, and the address read as the talk box plays it:
 *  - no whole sentence is said in more than two of the ten addresses;
 *  - every address names at least two things from its own world (the Vice
 *    President, the Speaker, the President's home state or last office, what
 *    the President asks Congress for);
 *  - between them the addresses name at least three different policy points,
 *    once Congress files on the research list's questions (pull request 8380,
 *    which adds `federalQuestionAdmitted`); before that the test says how many
 *    it found and does not fail on the count.
 */
const base =
  process.env.OPENING_VERSIONS_SEED ?? randomBytes(8).toString("hex");
const WORLDS = 10;
const MOST_ADDRESSES_PER_SENTENCE = 2;
const LEAST_WORLD_NAMES = 2;
const LEAST_POLICY_POINTS = 3;
/** The facts that name something from the world, not a subject in words. */
const NAMES = new Set([
  "vice-president",
  "speaker",
  "home-state",
  "prior-office",
  "first-about",
  "first-to",
  "about",
  "to",
  "place",
  "name",
]);

const sentencesOf = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);

it(`the President's address says different sentences, with its own world's names, in ten drawn worlds (seed ${base})`, () => {
  const was = setBookkeeping(false);
  try {
    const addresses = Array.from({ length: WORLDS }, (_, at) => {
      const seed = createHash("sha256").update(`${base}:${at}`).digest("hex");
      const place = drawPlace(seed, "opening-address-versions");
      const where = `${place.name} (${place.key}), seed ${base}:${at}`;
      const world = buildBenchWorld(place.seed, "2025-01-20", {
        twoLevel: true,
        placeKey: place.key,
      });
      const story = world.director.ledger.opening;
      expect(story, `${where}: no opening story`).toBeTruthy();
      return { where, address: story!.address };
    });

    // No whole sentence in more than two addresses.
    const inAddresses = new Map<string, string[]>();
    for (const { where, address } of addresses)
      for (const sentence of new Set(sentencesOf(address.text)))
        inAddresses.set(sentence, [
          ...(inAddresses.get(sentence) ?? []),
          where,
        ]);
    const shared = [...inAddresses]
      .filter(([, wheres]) => wheres.length > MOST_ADDRESSES_PER_SENTENCE)
      .map(([sentence, wheres]) => `"${sentence}" in ${wheres.join("; ")}`);
    expect(shared, `seed ${base}`).toEqual([]);

    // At least two names from each world.
    for (const { where, address } of addresses) {
      const named = new Set(
        address.sentences.flatMap((row) =>
          row.facts.filter((key) => NAMES.has(key)),
        ),
      );
      expect(
        named.size,
        `${where} names only ${[...named].join(", ") || "nothing"} from its world`,
      ).toBeGreaterThanOrEqual(LEAST_WORLD_NAMES);
    }

    // The policy points between them.
    const points = new Set(
      addresses.flatMap(({ address }) =>
        address.sentences.flatMap((row) =>
          [row.values.about, row.values["first-about"]].filter(
            (value): value is string => !!value,
          ),
        ),
      ),
    );
    console.log(
      `opening-address-versions: seed ${base}; ${points.size} policy points across ${WORLDS} addresses (${[...points].join(", ")}); ${inAddresses.size} different sentences; places ${addresses.map((row) => row.where).join(" | ")}`,
    );
    if ("federalQuestionAdmitted" in worldLegislating)
      expect(points.size, `seed ${base}`).toBeGreaterThanOrEqual(
        LEAST_POLICY_POINTS,
      );
  } finally {
    setBookkeeping(was);
  }
}, 3_600_000);
