import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { OFFICIALS_MODULE_ID, officialsIn } from "../core2/modules/officials";
import {
  OPENING_SPEECH_BANK,
  openingMove,
  type OpeningSpeechKind,
  type SpeechVoice,
  partHolds,
} from "../english/english-opening-speech";
import { composeAddress } from "../english/english-composition";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import { composeOpeningStory } from "./opening-story";
import { ADDRESS_KINDS, type AddressKind } from "./address-kind";
import kindData from "./data/address-kinds.json" with { type: "json" };

// The shared parts of an address (greeting, occasion, oath, creed, unity) are
// said in the kind's own pieces (owner, Nov 8: "I just hate the way the speech
// looks, which is the English engine's fault"; the playtest check, P9: "every
// address opens alike"). One world is drawn from all 56 places on a seed the
// builder did not choose; the President's recorded traits and the outcome
// web's rows for the town are set so each kind of address is the one the
// director's own chooser picks (chooseAddressKind), and the address is composed
// by the director's one path (composeOpeningStory) in each kind, as the
// inaugural and as the State of the Union.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "address-openers-by-kind");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
const official = officialsIn(api, "US:president")[0]!;
const president = core.people.get(official.id)!;
const FACETS = kindData.kinds as unknown as Record<
  AddressKind,
  { pull: string[] }
>;

/** The web's rows for the town as it writes them, every measure of an area moved by `change`. */
function writeTerm(change: Record<string, number>) {
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${world.placeId}:${month}`,
      placeId: world.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

/** The President leans toward one kind and away from the rest. */
function lean(kind: AddressKind) {
  const traits = president.traits as Record<string, number>;
  for (const other of ADDRESS_KINDS)
    for (const facet of FACETS[other].pull)
      traits[facet] = other === kind ? 1 : -1;
}

const BAD = { "school.": -0.15, "crime.": 0.2, "health.": 0.1 };
const GOOD = { "school.": 0.15, "crime.": -0.2, "health.": -0.1 };
const FLAT = {};

/** What the world gives each kind to say. */
function setWorld(kind: AddressKind) {
  writeTerm(
    kind === "crisis" || kind === "combative"
      ? BAD
      : kind === "victory"
        ? GOOD
        : FLAT,
  );
  if (kind === "mourning" && !core.logByKind.get("hazard.disaster")?.length)
    applyCoreEvent(core, {
      id: `hazard:disaster:test:${core.date}`,
      date: core.date as never,
      kind: "hazard.disaster",
      personIds: [],
      witnessIds: [],
      placeId: world.placeId,
      source: {
        tag: "SOURCED",
        citation: "A test disaster for the opening of an address.",
        asOf: core.date as never,
      },
      publicRecord: true,
      news: true,
      facts: { severity: 1 },
    } as never);
}

interface Said {
  readonly speech: OpeningSpeechKind;
  readonly kind: AddressKind;
  readonly wanted: AddressKind;
  readonly parts: string[];
  readonly sentences: string[];
}

function said(wanted: AddressKind, speech: OpeningSpeechKind): Said {
  lean(wanted);
  setWorld(wanted);
  // A President a year or more in office may take a lap (a second inaugural, or a later address).
  api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .put({
      ...official,
      serviceStart: wanted === "victory" ? "2021-01-20" : official.serviceStart,
    } as never);
  core.eventIds.delete(`inauguration:${core.date}`);
  if (speech === "inaugural") core.eventIds.add(`inauguration:${core.date}`);
  const story = composeOpeningStory(core, world.playerId!)!;
  return {
    speech: story.speechKind,
    kind: story.addressKind,
    wanted,
    parts: story.address.parts,
    sentences: story.address.sentences.map((row) => row.text),
  };
}

/** The roles the greeting, occasion, oath, creed and unity are said in. */
const SHARED_ROLES = ["salutation", "occasion", "oath", "creed", "unity"];
const VOICES: SpeechVoice[] = ["polished", "plain"];
const SUBJECTS: OpeningSpeechKind[] = [
  "inaugural",
  "state-of-the-union",
  "state-of-the-state",
  "town-address",
];

/** The shared roles a sentence of an address was said in, by the bank piece whose text it is. */
const patterns = OPENING_SPEECH_BANK.parts
  .filter((part) => part.uses.some((use) => SHARED_ROLES.includes(use.role)))
  .map((part) => ({
    part,
    // A sentence is an opener and a core, so a core ends the sentence.
    pattern: new RegExp(
      `(?:^|\\s)${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{[\w-]+\}/g, ".+")}$`,
      "i",
    ),
  }));
const sharedPiecesOf = (text: string) =>
  patterns.filter((row) => row.pattern.test(text)).map((row) => row.part);

describe("the shared parts of an address are the kind's own", () => {
  const rows: Said[] = [];
  for (const speech of ["inaugural", "state-of-the-union"] as const)
    for (const kind of ADDRESS_KINDS) rows.push(said(kind, speech));

  it("opens each kind of address in the words of its own kind", () => {
    for (const row of rows)
      process.stdout.write(
        `OPENS ${where} ${row.speech} wanted ${row.wanted} got ${row.kind}: ${row.parts[0]}\n`,
      );
    for (const row of rows) {
      // Every greeting is a piece of the kind the address took.
      const greeting = sharedPiecesOf(row.sentences[0]!).filter(
        (part) => part.move === "salutation",
      );
      expect(greeting.length, `${where} ${row.kind} greeting`).toBeGreaterThan(
        0,
      );
      expect(
        greeting.some((part) => part.addressKind === row.kind),
        `${where} ${row.speech} ${row.kind} greeting ${row.sentences[0]}`,
      ).toBe(true);
    }
  });

  it("reaches at least three different kinds in the played world, each in the director's own path", () => {
    for (const speech of ["inaugural", "state-of-the-union"] as const) {
      const kinds = new Set(
        rows.filter((row) => row.speech === speech).map((row) => row.kind),
      );
      expect(kinds.size, `${where} ${speech}: ${[...kinds]}`).toBeGreaterThan(
        2,
      );
    }
  });

  it("shares no greeting, occasion, oath, creed or unity between two kinds", () => {
    for (const speech of ["inaugural", "state-of-the-union"] as const) {
      const byKind = new Map<AddressKind, Set<string>>();
      for (const row of rows.filter((item) => item.speech === speech)) {
        const used = byKind.get(row.kind) ?? new Set<string>();
        for (const text of row.sentences) {
          const pieces = sharedPiecesOf(text);
          // The pieces the shared roles' own kinds wrote; a sentence of the story is none of them.
          if (pieces.some((part) => part.addressKind === row.kind))
            used.add(text);
        }
        byKind.set(row.kind, used);
      }
      const kinds = [...byKind.keys()];
      expect(kinds.length, where).toBeGreaterThan(2);
      for (const kind of kinds) {
        // The kind's greeting, occasion, creed and the rest are said in its own pieces.
        // At least one sentence of its own (was two before the speech
        // outline, Nov 12, which leaves out pieces that carry nothing).
        expect(
          byKind.get(kind)!.size,
          `${where} ${speech} ${kind}`,
        ).toBeGreaterThan(0);
        for (const other of kinds.filter((name) => name > kind))
          for (const text of byKind.get(kind)!)
            expect(
              byKind.get(other)!.has(text),
              `${where} ${speech}: ${kind} and ${other} both say "${text}"`,
            ).toBe(false);
      }
    }
  });

  it("opens two kinds of the same address in different first paragraphs", () => {
    for (const speech of ["inaugural", "state-of-the-union"] as const) {
      const firsts = rows
        .filter((row) => row.speech === speech)
        .map((row) => row.parts[0]);
      expect(new Set(firsts).size, where).toBeGreaterThan(2);
    }
  });
});

/** The world's names and subjects every part of an address may say (planAddress, worldFacts). */
const WORLD_TEXT: Record<string, string> = {
  "vice-president": "Dana Ruiz",
  speaker: "Alan Moore",
  // Each person's cases, as the address composer fills them from the one
  // fact (withCases, src/director/opening-story.ts): a piece that names a
  // person in a case requires that case by name.
  "vice-president-object": "Dana Ruiz",
  "vice-president-addressed": "Vice President Dana Ruiz",
  "speaker-object": "Alan Moore",
  "speaker-addressed": "Speaker Alan Moore",
  "home-state": "a home state",
  hardest: "finding work",
  best: "take-home pay",
  // A governor's or a local head's place, theme, body and office (speech
  // outline, Nov 12: the opening names the place and the theme; a local
  // address speaks to the body the records seat).
  "realm-name": "Riverton",
  "theme-name": "our schools",
  body: "the council",
  // The body by its recorded name, as a local speaker carries it (localSpeaker).
  "body-name": "the Riverton City Council",
  "office-title": "mayor",
};
const WORLD = Object.fromEntries(
  Object.entries(WORLD_TEXT).map(([key, text]) => [
    key,
    { text, sourceRecordIds: [`record:${key}`] },
  ]),
);

const roleExists = (subject: OpeningSpeechKind, role: string) =>
  OPENING_SPEECH_BANK.parts.some(
    (part) =>
      !part.addressKind &&
      part.uses.some((use) => use.subject === subject && use.role === role),
  );

describe("the bank holds each kind's own greeting, occasion, oath, creed and unity", () => {
  it("has at least three pieces, in both voices, for every kind, subject and role the speech has", () => {
    for (const subject of SUBJECTS)
      for (const role of SHARED_ROLES) {
        if (!roleExists(subject, role)) continue;
        // A greeting is a list of people and belongs to every kind (speech
        // outline, Nov 12): it is counted with the general pieces, not here.
        if (role === "salutation") continue;
        // A governor's or a town's occasion carries the year's record or goes
        // straight to the theme (owner, Nov 12, through the words lead): the
        // 64 kind-own occasion lines that carried no record were deleted on
        // purpose, so an occasion piece that belongs to every kind counts
        // toward each kind here, as a greeting does. The President's
        // occasion keeps the kind-own rule.
        const shared =
          role === "occasion" &&
          !["inaugural", "state-of-the-union"].includes(subject);
        for (const kind of ADDRESS_KINDS)
          for (const voice of VOICES) {
            const own = OPENING_SPEECH_BANK.parts.filter(
              (part) =>
                (part.addressKind === kind || (shared && !part.addressKind)) &&
                partHolds(part.voice, voice) &&
                part.uses.some(
                  (use) => use.subject === subject && use.role === role,
                ),
            );
            // The creed is said in the party's own terms: three for each.
            const groups =
              role === "creed"
                ? ["republican", "democratic", "other"].map((party) =>
                    own.filter((part) =>
                      part.uses.some((use) =>
                        use.requiresFacts?.includes(`party-${party}`),
                      ),
                    ),
                  )
                : // Every core names a slot from the world (owner, Nov 11); the
                  // world facts the composer test below supplies say them all.
                  [own.filter((part) => part.piece?.part !== "opener")];
            // The owner graded one mayor's combative greeting bad (Nov 11:
            // "Lines he graded bad leave the bank in the same change"); the
            // mayor's and governor's greetings are rewritten with their own
            // inserts on their own item, so two of theirs stand until then.
            const least = ["inaugural", "state-of-the-union"].includes(subject)
              ? 2
              : 1;
            for (const group of groups)
              expect(
                new Set(group.map((part) => part.text)).size,
                `${subject} ${role} ${kind} ${voice}`,
              ).toBeGreaterThan(least);
          }
      }
  });

  it("says each role of a kind in that kind's pieces only, and no two kinds share a wording", () => {
    for (const subject of SUBJECTS)
      for (const role of SHARED_ROLES) {
        if (!roleExists(subject, role)) continue;
        for (const voice of VOICES) {
          const seen = new Map<string, AddressKind>();
          for (const kind of ADDRESS_KINDS) {
            const move = openingMove(subject, voice, role, {
              addressKind: kind,
            });
            // A role whose pieces carry no fact and no stand is not offered
            // (speech outline, Nov 12).
            if (!move) continue;
            // A greeting belongs to every kind (speech outline, Nov 12).
            if (role === "salutation") continue;
            for (const variant of move.bank.parts.core!.variants) {
              const part = OPENING_SPEECH_BANK.parts.find(
                (row) => row.key === variant.pieceKey,
              )!;
              // A piece that names the place and the theme from the records
              // serves every kind that has no wording of its own left (speech
              // outline, Nov 12).
              if (!part.addressKind) continue;
              expect(part.addressKind, variant.key).toBe(kind);
              const other = seen.get(part.text);
              // A greeting is its list of people (speech outline, Nov 12), and
              // two kinds may greet the same people in the same words.
              if (role === "salutation") continue;
              expect(
                other === undefined || other === kind,
                `${subject} ${role} ${voice}: ${kind} and ${other} share "${part.text}"`,
              ).toBe(true);
              seen.set(part.text, kind);
            }
          }
        }
      }
  });

  it("greets the House in every kind under either Speaker, so a required greeting is never lost", () => {
    const packet = (stage: string): GroundedEnglishPacket =>
      ({
        surface: "dialogue",
        momentKey: "greeting-test",
        worldSeed: "greeting-test",
        bankVersion: "words-opening-speech-v1",
        stage,
        sourceRecordIds: ["record:speech"],
        facts: WORLD,
        speaker: { personId: "president", traits: {} },
        knowledge: Object.entries(WORLD).map(([factKey, fact]) => ({
          personId: "president",
          factKey,
          sourceRecordIds: fact.sourceRecordIds,
        })),
      }) as unknown as GroundedEnglishPacket;
    for (const kind of ADDRESS_KINDS)
      for (const voice of VOICES)
        for (const stage of ["chair-male", "chair-female"])
          for (const subject of SUBJECTS) {
            const move = openingMove(subject, voice, "salutation", {
              required: true,
              addressKind: kind,
            })!;
            const result = composeAddress(packet(stage), "election-night", [
              move,
            ]);
            expect(result.kind, `${subject} ${kind} ${voice} ${stage}`).toBe(
              "rendered",
            );
            // The Speaker is addressed by office and name through said-as
            // ("Speaker {name}"): "Mr." and "Madam" guessed a person's sex
            // from nothing on record and are gone (the words lead, Nov 12).
            if (subject === "state-of-the-union")
              expect(result.kind === "rendered" && result.text).toMatch(
                /^Speaker [A-Z]/,
              );
          }
  });

  it("says every shared role in every kind, the creed in each party's terms, through the engine's composer", () => {
    const withFacts = (
      stage: string,
      facts: Record<string, string>,
    ): GroundedEnglishPacket => {
      const grounded = Object.fromEntries(
        Object.entries(facts).map(([key, text]) => [
          key,
          { text, sourceRecordIds: [`record:${key}`] },
        ]),
      );
      return {
        surface: "dialogue",
        momentKey: "shared-roles-test",
        worldSeed: "shared-roles-test",
        bankVersion: "words-opening-speech-v1",
        stage,
        sourceRecordIds: ["record:speech"],
        facts: grounded,
        speaker: { personId: "president", traits: {} },
        knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
          personId: "president",
          factKey,
          sourceRecordIds: fact.sourceRecordIds,
        })),
      } as unknown as GroundedEnglishPacket;
    };
    for (const kind of ADDRESS_KINDS)
      for (const voice of VOICES)
        for (const subject of SUBJECTS)
          for (const role of SHARED_ROLES) {
            if (!roleExists(subject, role)) continue;
            const parties =
              role === "creed" ? ["republican", "democratic", "other"] : [""];
            for (const party of parties) {
              const move = openingMove(subject, voice, role, {
                addressKind: kind,
              });
              // A role whose pieces carry no fact and no stand is not offered
              // (speech outline, Nov 12: "This is a working speech.").
              if (!move) continue;
              const result = composeAddress(
                withFacts("chair-female", {
                  ...WORLD_TEXT,
                  ...(party ? { [`party-${party}`]: "yes" } : {}),
                }),
                "election-night",
                [move],
              );
              expect(
                result.kind,
                `${subject} ${kind} ${voice} ${role} ${party}`,
              ).toBe("rendered");
            }
          }
  });
});
