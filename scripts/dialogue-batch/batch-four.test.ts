import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readMapPieces } from "./grade-map";

// Batch 4 is scenes played from the game, as trees (owner, Nov 9): the JSON
// must keep its shape, every line must be numbered so he can say it aloud, and
// every key must be a bank piece that exists.
interface Choice {
  id: string;
  label: string;
  tests: string;
  key: string;
  text: string;
  next: string | null;
  cut?: true;
}
interface Node {
  id: string;
  speaker: string;
  key: string;
  text: string;
  next?: string;
  choices: Choice[];
}
interface Scene {
  id: string;
  kind: string;
  setup: {
    narration: string[];
    narrationKeys: string[];
    when: string;
    where: string;
    who: string[];
  };
  nodes: Node[];
}
const batch = JSON.parse(
  readFileSync("docs/coordination/batches/2026-11-09-batch-4.json", "utf8"),
) as {
  id: string;
  made: string;
  place: string;
  seed: string;
  scenes: Scene[];
};
const pieces = readMapPieces({});
/** Text the game builds from several parts or from an engine, not from one bank piece. */
const ENGINE_KEYS = new Set(["", "address", "speech-builder"]);
const keysOf = (key: string) => key.split(" + ").filter(Boolean);

describe("batch 4 is a tree of scenes the game played", () => {
  it("names its world and holds about twenty scenes of mixed kinds", () => {
    expect(batch.id).toBe("batch-4");
    expect(batch.place.length).toBeGreaterThan(3);
    expect(batch.seed.length).toBeGreaterThan(3);
    expect(batch.scenes.length).toBeGreaterThanOrEqual(15);
    expect(batch.scenes.length).toBeLessThanOrEqual(25);
    expect(
      new Set(batch.scenes.map((scene) => scene.kind)).size,
    ).toBeGreaterThan(4);
  });

  it("never plays three scenes of one kind in a row", () => {
    for (let at = 2; at < batch.scenes.length; at += 1)
      expect(
        batch.scenes[at]!.kind === batch.scenes[at - 1]!.kind &&
          batch.scenes[at - 1]!.kind === batch.scenes[at - 2]!.kind,
        `scenes ${at - 1} to ${at + 1}`,
      ).toBe(false);
  });

  it("numbers every scene, line and option so each can be said aloud", () => {
    batch.scenes.forEach((scene, at) => {
      expect(scene.id).toBe(String(at + 1));
      expect(scene.setup.when.length).toBeGreaterThan(3);
      expect(scene.setup.where.length).toBeGreaterThan(3);
      expect(scene.setup.who.length).toBeGreaterThan(0);
      expect(scene.nodes.length).toBeGreaterThan(2);
      const ids = new Set(scene.nodes.map((node) => node.id));
      scene.nodes.forEach((node, line) => {
        expect(node.id).toBe(`${scene.id}.${line + 1}`);
        expect(node.text.length, node.id).toBeGreaterThan(0);
        if (node.next) expect(ids.has(node.next), `${node.id} next`).toBe(true);
        node.choices.forEach((choice, option) => {
          expect(choice.id).toBe(
            `${node.id}.${String.fromCharCode(97 + option)}`,
          );
          expect(choice.label.length, choice.id).toBeGreaterThan(0);
          expect(choice.tests.length, choice.id).toBeGreaterThan(0);
          if (choice.next)
            expect(ids.has(choice.next), `${choice.id} next`).toBe(true);
        });
      });
    });
  });

  it("fills every placeholder: no brace is left in a line", () => {
    for (const scene of batch.scenes)
      for (const node of scene.nodes) {
        expect(node.text, node.id).not.toMatch(/[{}]/);
        for (const choice of node.choices)
          expect(choice.text, choice.id).not.toMatch(/[{}]/);
      }
  });

  it("says every line with a bank piece that exists", () => {
    for (const scene of batch.scenes) {
      expect(scene.setup.narrationKeys.length, scene.id).toBe(
        scene.setup.narration.length,
      );
      for (const key of scene.setup.narrationKeys.flatMap(keysOf))
        expect(pieces.has(key), `scene ${scene.id} narration: ${key}`).toBe(
          true,
        );
    }
    for (const scene of batch.scenes)
      for (const node of scene.nodes) {
        if (!ENGINE_KEYS.has(node.key))
          for (const key of keysOf(node.key))
            expect(pieces.has(key), `${node.id}: ${key}`).toBe(true);
        for (const choice of node.choices)
          if (!ENGINE_KEYS.has(choice.key))
            for (const key of keysOf(choice.key))
              expect(pieces.has(key), `${choice.id}: ${key}`).toBe(true);
      }
  });
});
