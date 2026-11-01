import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../../core2/bookkeeping";
import { gameStartDate } from "../../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../core2/kernel/dates";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import { applyCoreEvent } from "../../core2/state";
import { bringItUp } from "../../director/bring-it-up";
import { createDirector } from "../../director/ledger";
import { composeScene } from "../../director/scene";
import {
  BRING_BANK,
  bringWordsFromBank,
  SCENE_BANK,
  sceneWordsFromBank,
} from "./scene-bank";

/**
 * The scene and bring-it-up banks through the director's own `composeScene`
 * and `bringItUp`: every line is a bank sentence filled from records, and
 * each cites them. The narration is read in the played world (every module,
 * a drawn place); the closure brought up is a fixture's edge case.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "words-scenes";
const base = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 600,
  }),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 18 &&
    age(person.birthDate) <= 30,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-02-15");

/** A bank sentence as a pattern, its slots filled by anything. */
const sentence = (text: string) =>
  text
    .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
    .replace(/\{host\}/g, ".+'s")
    .replace(/\{\w+\}/g, ".+");
const mined = (bank: { parts: { text: string }[] }) =>
  bank.parts.map((part) => new RegExp(`^${sentence(part.text)}$`, "i"));

const WEEKS = 26;
const DAYS_A_WEEK = 7;

describe(`mined scenes and bring-it-up in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("narrates staged scenes from bank sentences in a played world, each traced to records", () => {
    setBookkeeping(false);
    const run = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(run, "scene-bank");
    const where = `${place.name} (${place.key}), seed ${place.seed}, run seed ${run}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The director watches the character the player plays and their
    // household, as the bench does when a character is picked.
    const playerId = world.core.playerId!;
    const household = world.core.households.get(
      world.core.people.get(playerId)!.householdId,
    );
    for (const id of new Set([playerId, ...(household?.memberIds ?? [])]))
      if (world.core.people.get(id)?.alive)
        world.director.watch(world.core, id);
    const words = sceneWordsFromBank();
    const banked = new Map(
      SCENE_BANK.parts.map((part) => [part.key, part.text]),
    );
    const read: string[] = [];
    let lines = 0;
    // The town's weeks go by until a staged scene narrates.
    for (let week = 0; week < WEEKS && !lines; week += 1) {
      advanceCore(
        world.core,
        addDays(makeIsoDate(world.core.date), DAYS_A_WEEK),
      );
      for (const book of world.director.ledger.people.values())
        for (const entry of book.schedule) {
          if (!entry.bindings.length) continue;
          const scene = composeScene(
            world.core,
            world.director,
            book.personId,
            entry,
            words,
          );
          for (const line of scene?.narration ?? []) {
            // The narrator's paragraph is its sentences in order, each a
            // bank sentence (a phone scene's setting and its lead: "The phone
            // rings. Someone is calling about your application.", Hotevilla-
            // Bacavi, Arizona, run seed chk2-b).
            const texts = (line.parts ?? []).map((key) => banked.get(key));
            expect(texts.length, `${where}: ${line.text}`).toBeGreaterThan(0);
            expect(
              texts.every((text) => text !== undefined) &&
                new RegExp(
                  `^${texts.map((text) => sentence(text!)).join(" ")}$`,
                  "i",
                ).test(line.text),
              `${where}: ${line.text} (${(line.parts ?? []).join(", ")})`,
            ).toBe(true);
            expect(line.sourceRecordIds.length, line.text).toBeGreaterThan(0);
            read.push(
              `${entry.momentId}: ${line.text} [${line.sourceRecordIds.join(", ")}]`,
            );
            lines += 1;
          }
        }
    }
    expect(lines, `${where}: no staged scene narrated`).toBeGreaterThan(0);
    process.stdout.write(
      `SCENE BANK ${where}, ${world.core.date}\n${read.slice(0, 6).join("\n")}\n`,
    );
  }, 900_000);

  it("brings up a closure in mined sentences", () => {
    const worker = [...core.people.values()].find(
      (row) =>
        row.tier !== "husk" && row.alive && row.jobId && row.knownIds.size > 2,
    )!;
    const org = core.jobs.get(worker.jobId!)!.organizationId;
    applyCoreEvent(core, {
      id: `organization.closed:${org}:${core.date}`,
      date: core.date,
      kind: "organization.closed",
      personIds: [worker.id],
      placeId: worker.placeId,
      publicRecord: true,
      source: {
        tag: "SOURCED",
        citation: "Closure as the finance writer records it.",
        asOf: core.date,
      },
      facts: { [`organization:${org}:status`]: "closed" },
    });
    const listener = [...worker.knownIds][0]!;
    const said = bringItUp(core, worker.id, listener, {
      words: bringWordsFromBank(),
    });
    expect(said).not.toBeNull();
    const patterns = mined(BRING_BANK);
    expect(said!.lines.length).toBeGreaterThan(0);
    for (const line of said!.lines) {
      expect(
        patterns.some((pattern) => pattern.test(line.text)),
        line.text,
      ).toBe(true);
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
    }
  }, 120_000);
});
