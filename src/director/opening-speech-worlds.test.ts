import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "../core2/state";
import { officialsIn } from "../core2/modules/officials";
import { ownStance } from "../core2/officials-roster";

// The opening address is composed per world (owner, Oct 24: "every world is
// different", so the speeches should be different, by the person, their
// personality and the world): two played worlds on fresh seeds and places
// drawn from all 56 give two addresses, Congress hears what each President
// wants from their own record, and every line names the records of every
// fact it says.
const date = process.env.OPENING_STORY_DATE ?? "2025-01-20";
const worlds = [0, 1].map(() => {
  const seed = randomBytes(8).toString("hex");
  const place = drawPlace(seed, "opening-speech-worlds");
  console.log(`opening speech: seed ${seed}, ${place.name} (${place.key})`);
  const world = buildBenchWorld(place.seed, date, {
    twoLevel: true,
    placeKey: place.key,
  });
  return { where: `${place.name} (${place.key}), seed ${seed}`, world };
});

describe("the opening address in two worlds", () => {
  it("differs between the worlds", () => {
    const [a, b] = worlds.map(({ world }) => world.director.ledger.opening!);
    expect(a, worlds[0]!.where).toBeTruthy();
    expect(b, worlds[1]!.where).toBeTruthy();
    expect(a!.address.text).not.toBe(b!.address.text);
  });

  it("asks Congress for what the President wants, each line citing its records", () => {
    for (const { where, world } of worlds) {
      const told = world.director.ledger.opening!;
      const official = officialsIn(coreAPI(world.core), "US:president")[0]!;
      const goals = told.address.sentences.filter((row) =>
        row.facts.includes("goal"),
      );
      expect(goals.length, `${where}: ${told.address.text}`).toBeGreaterThan(0);
      for (const sentence of goals) {
        const question = sentence.sourceRecordIds
          .find((id) => id.startsWith("question:"))
          ?.slice("question:".length);
        expect(question, `${where}: ${sentence.text}`).toBeTruthy();
        expect(sentence.sourceRecordIds).toContain(official.id);
        expect(
          ownStance(official.ideal, official.signature, question!),
          `${where}: ${sentence.text}`,
        ).toBeGreaterThan(0);
      }
      // A line that says a fact names the record it came from, beside the President.
      for (const sentence of told.address.sentences.filter(
        (row) => row.facts.length,
      ))
        expect(
          sentence.sourceRecordIds.length,
          `${where}: ${sentence.text}`,
        ).toBeGreaterThan(1);
    }
  });
});
