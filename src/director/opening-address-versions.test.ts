import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import * as worldLegislating from "../core2/modules/world-legislating";
import {
  OPENING_SPEECH_BANK,
  partValues,
} from "../english/english-opening-speech";
import { addressSentences } from "./address-sentences";

/**
 * The President's address is the first thing a new player hears, and it
 * introduces them to their world (owner, Nov 11, 2026: "There needs to be a
 * ton of different speech versions a ton of different inserts ... this is a
 * demonstration of the game"). Ten worlds are drawn from all 56 places on a
 * seed nobody chose (replay with OPENING_VERSIONS_SEED), each built as the
 * player gets it, and the address read as the talk box plays it:
 *  - no whole sentence is said in more than two of the ten addresses, where
 *    the bank holds at least three versions a voice of every core it is
 *    joined from; a sentence from a thinner group is passed over and named
 *    with its group, never failed or passed by the luck of the draw (Fable B,
 *    Nov 11: the policy kind, the address a new life opens on, is at three a
 *    voice; the other kinds wait on their own pool item);
 *  - every address names at least two things from its own world (the Vice
 *    President, the Speaker, the President's home state or last office, what
 *    the President asks Congress for);
 *  - it speaks like a person (the words lead's read, Nov 11): at most one
 *    sentence has a colon in its first eight words, no lead-in is said twice,
 *    no subject's movement is told in two sentences, no person or state is
 *    named more than twice, and a policy point is named in one sentence;
 *  - between them the addresses name at least three different policy points,
 *    once Congress files on the research list's questions (pull request 8380,
 *    which adds `federalQuestionAdmitted`); before that the test says how many
 *    it found and does not fail on the count.
 */
const base =
  process.env.OPENING_VERSIONS_SEED || randomBytes(8).toString("hex");
const WORLDS = 10;
const MOST_ADDRESSES_PER_SENTENCE = 2;
const LEAST_WORLD_NAMES = 2;
const LEAST_POLICY_POINTS = 3;
const MOST_NAMED = 2;
/** The fewest versions a voice a core's group holds for its repeats to be held to the bar. */
const LEAST_VERSIONS = 3;
const MOST_SUBJECT_WORDS = 3;
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

/**
 * A core's group: its move, address kind, topic and the facts it requires.
 * Its size is the fewest versions any of its voices holds.
 */
const PARTS = OPENING_SPEECH_BANK.parts;
const listOf = (value: string | readonly string[] | undefined) =>
  value === undefined ? [""] : typeof value === "string" ? [value] : [...value];
const groupOf = (part: (typeof PARTS)[number], voice: string) =>
  [
    part.move,
    part.addressKind ?? "",
    voice,
    listOf(part.topic).join("|"),
    [...(part.uses[0]?.requiresFacts ?? [])].sort().join("+"),
  ].join(" ");
const groupSizes = new Map<string, number>();
for (const part of PARTS)
  if (part.piece?.part === "core")
    for (const voice of listOf(part.voice))
      groupSizes.set(
        groupOf(part, voice),
        (groupSizes.get(groupOf(part, voice)) ?? 0) + 1,
      );
const byKey = new Map(PARTS.map((part) => [part.key, part]));
/** The thin groups a sentence's cores come from, or none. */
const thinGroupsOf = (pieces: readonly string[]) =>
  pieces.flatMap((key) => {
    const part = byKey.get(key);
    if (part?.piece?.part !== "core") return [];
    return listOf(part.voice)
      .map((voice) => groupOf(part, voice))
      .filter((group) => (groupSizes.get(group) ?? 0) < LEAST_VERSIONS);
  });

// One splitter for both versions tests: a question of three words or fewer
// ("Why?") is read with the sentence after it (the words lead's ruling of
// Nov 12; owner, Nov 11, call 12: "Replies of one to three words and action
// names stay"). The bound is unchanged.
const sentencesOf = addressSentences;

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
    const thinOf = new Map<string, string[]>();
    for (const { where, address } of addresses) {
      const said = new Set<string>();
      for (const row of address.sentences)
        for (const sentence of sentencesOf(row.text)) {
          const thin = thinGroupsOf(row.pieces);
          if (thin.length)
            thinOf.set(sentence, [
              ...new Set([...(thinOf.get(sentence) ?? []), ...thin]),
            ]);
          if (said.has(sentence)) continue;
          said.add(sentence);
          inAddresses.set(sentence, [
            ...(inAddresses.get(sentence) ?? []),
            where,
          ]);
        }
    }
    const repeated = [...inAddresses].filter(
      ([, wheres]) => wheres.length > MOST_ADDRESSES_PER_SENTENCE,
    );
    const shared = repeated
      .filter(([sentence]) => !thinOf.has(sentence))
      .map(([sentence, wheres]) => `"${sentence}" in ${wheres.join("; ")}`);
    // What the bar passed over: a repeat from a group under three versions a
    // voice, named with its group (pool item
    // words-opening-address-thin-groups-by-kind).
    for (const [sentence, wheres] of repeated.filter(([sentence]) =>
      thinOf.has(sentence),
    ))
      console.log(
        `opening-address-versions: passed over "${sentence}" in ${wheres.length} addresses, from thin group ${thinOf.get(sentence)!.join("; ")}`,
      );
    expect(shared, `seed ${base}`).toEqual([]);

    // It speaks like a person: few colon lead-ins, none twice, each fact once.
    const leadIns = OPENING_SPEECH_BANK.parts
      .filter((part) => part.piece?.part === "opener")
      .map((part) => part.text.toLowerCase());
    for (const { where, address } of addresses) {
      const said = address.sentences.map((row) => row.text);
      const colons = said.filter((text) =>
        text.split(/\s+/).slice(0, 8).join(" ").includes(":"),
      );
      expect(
        colons.length,
        `${where}: ${colons.join(" | ")}`,
      ).toBeLessThanOrEqual(1);
      const opened = said.flatMap((text) =>
        leadIns
          .filter((lead) => text.toLowerCase().startsWith(lead))
          .sort((a, b) => b.length - a.length)
          .slice(0, 1),
      );
      expect(
        opened.filter((lead, at) => opened.indexOf(lead) !== at),
        `${where} says a lead-in twice`,
      ).toEqual([]);
      const moved = address.sentences.flatMap((row) =>
        row.facts.filter((key) => key.startsWith("change-")),
      );
      expect(
        moved.filter((key, at) => moved.indexOf(key) !== at),
        `${where} tells a subject's movement twice`,
      ).toEqual([]);
      const names = new Set(
        address.sentences.flatMap((row) =>
          ["vice-president", "speaker", "home-state"]
            .map((key) => row.values[key])
            // A pronoun or a role (said-as: "he", "the Vice President") is
            // not the name; only a name is counted (W-E, Nov 12).
            .filter(
              (value): value is string =>
                !!value &&
                /^[A-Z]\S* [A-Z]/.test(value) &&
                !/^The /.test(value),
            ),
        ),
      );
      for (const name of names)
        expect(
          address.text.split(name).length - 1,
          `${where} names ${name} too often`,
        ).toBeLessThanOrEqual(MOST_NAMED);
      const points = address.sentences.flatMap((row) =>
        row.values.about ? [row.values.about] : [],
      );
      expect(
        points.filter((point, at) => points.indexOf(point) !== at),
        `${where} names a policy point in two sentences`,
      ).toEqual([]);
    }

    // An insert fits where it is put (the words lead's second read): a
    // subject's words at most three times, a time named once in a sentence,
    // hard news worded as a problem and good news as good.
    const subjectWords = (end: string) =>
      new Set(
        OPENING_SPEECH_BANK.parts
          .filter(
            (part) =>
              part.move === "subject" &&
              partValues(part.topic).some((topic) => topic.endsWith(end)),
          )
          .map((part) => part.text.toLowerCase()),
      );
    const hardWords = subjectWords(":hard");
    const goodWords = subjectWords(":good");
    const sayWords = subjectWords(":say");
    for (const { where, address } of addresses) {
      const said = new Map<string, number>();
      for (const row of address.sentences)
        for (const [key, value] of Object.entries(row.values)) {
          if (!["hardest", "best"].includes(key) && !key.startsWith("say-"))
            continue;
          said.set(value, (said.get(value) ?? 0) + 1);
          const words =
            key === "best"
              ? goodWords
              : key === "hardest"
                ? hardWords
                : sayWords;
          expect(
            words.has(value.toLowerCase()),
            `${where}: ${key} said as "${value}"`,
          ).toBe(true);
        }
      for (const [value, times] of said)
        expect(
          times,
          `${where} says "${value}" ${times} times`,
        ).toBeLessThanOrEqual(MOST_SUBJECT_WORDS);
      for (const row of address.sentences) {
        const lead = leadIns
          .filter((text) => row.text.toLowerCase().startsWith(text))
          .sort((a, b) => b.length - a.length)[0];
        if (!lead) continue;
        const rest = row.text.slice(lead.length);
        for (const word of ["year", "term", "today", "tonight"])
          expect(
            new RegExp(`\\b${word}\\b`, "i").test(lead) &&
              new RegExp(`\\b${word}\\b`, "i").test(rest),
            `${where}: "${row.text}" names the ${word} twice`,
          ).toBe(false);
      }
    }

    // The Vice President is not praised twice in the same words: two
    // sentences that name them share no run of four words.
    const runs = (text: string) => {
      const words = text
        .toLowerCase()
        .replace(/[^a-z' ]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      return new Set(
        words.slice(0, -3).map((_, at) => words.slice(at, at + 4).join(" ")),
      );
    };
    for (const { where, address } of addresses) {
      const vp = address.sentences.filter(
        (row) => row.values["vice-president"],
      );
      for (const [at, one] of vp.entries())
        for (const other of vp.slice(at + 1)) {
          const name = one.values["vice-president"]!.toLowerCase();
          const shared = [...runs(one.text)].filter(
            (run) =>
              !run.includes(name.split(" ")[0]!) &&
              !run.includes(name.split(" ").at(-1)!) &&
              runs(other.text).has(run),
          );
          expect(shared, `${where}: "${one.text}" and "${other.text}"`).toEqual(
            [],
          );
        }
    }

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
