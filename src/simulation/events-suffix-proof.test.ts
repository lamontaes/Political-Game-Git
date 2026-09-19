import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId } from "./types";
import {
  EVENT_PROOF_MONOTONE_CHECKS,
  EVENT_PROOF_MONOTONE_CHECKS_COMPOSED,
  assertWorldIntegrity,
} from "./world";

const WORLD_SOURCE = join(dirname(fileURLToPath(import.meta.url)), "world.ts");

/** The body of the per-event loop, taken from the source by brace matching. */
function eventLoopBody(): string {
  const source = readFileSync(WORLD_SOURCE, "utf8");
  const lines = source.split("\n");
  const start = lines.findIndex(
    (line) => line === "  for (const event of history.events) {",
  );
  if (start < 0) {
    throw new Error(
      "The per-event loop was renamed. The suffix proof's soundness depends on what that loop calls, so this guard has to be pointed at the new one deliberately rather than quietly passing.",
    );
  }
  let depth = 0;
  for (let index = start; index < lines.length; index += 1) {
    depth += (lines[index]!.match(/\{/g) ?? []).length;
    depth -= (lines[index]!.match(/\}/g) ?? []).length;
    if (index > start && depth <= 0)
      return lines.slice(start, index + 1).join("\n");
  }
  throw new Error("The per-event loop does not close.");
}

/** Identifiers called as functions, less language and constructor noise. */
function callsIn(body: string): readonly string[] {
  const ignored = new Set([
    "Error",
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "return",
    "throw",
    "typeof",
    "match",
  ]);
  const calls = new Set<string>();
  for (const match of body.matchAll(/(?:^|[^.\w])([A-Za-z_]\w*)\s*\(/g)) {
    const name = match[1]!;
    if (!ignored.has(name)) calls.add(name);
  }
  return [...calls].sort();
}

describe("Q47-006: the events suffix proof cannot go quietly unsound", () => {
  /*
   * The suffix proof skips re-validating events it has already proved. That is
   * sound only while every check in the loop is monotone in the safe direction
   * — an event that passed can never start failing. That is a property of the
   * checks as they stand, not of the design, so a check added later could make
   * the memo wrong with no other test failing. This is the test that fails.
   */
  it("calls nothing outside the declared monotone list", () => {
    const declared = new Set([
      ...EVENT_PROOF_MONOTONE_CHECKS,
      ...EVENT_PROOF_MONOTONE_CHECKS_COMPOSED,
    ]);
    const undeclared = callsIn(eventLoopBody()).filter(
      (name) => !declared.has(name),
    );
    expect(
      undeclared,
      `The per-event validation loop calls ${undeclared.join(", ")}, which the events suffix proof has not been told is monotone. A check whose answer can change from passing to failing makes the proof unsound: an event proved earlier would never be re-checked. Decide whether each new call is monotone in the safe direction — frozen event fields, existence against append-only history, or a comparison that only gets more true as the world moves — then add it to EVENT_PROOF_MONOTONE_CHECKS. Do not add it to silence this.`,
    ).toEqual([]);
  });

  it("declares nothing the loop does not actually call", () => {
    // Keeps the list honest in the other direction: a stale entry would let a
    // future check through under a name nothing uses any more.
    const called = new Set(callsIn(eventLoopBody()));
    const unused = EVENT_PROOF_MONOTONE_CHECKS.filter(
      (name) => !called.has(name),
    );
    expect(unused).toEqual([]);
  });

  /*
   * "The list is complete" is itself a head-relative claim, and that is how the
   * gap got in: the monotone argument was written on a tree with no PRESS and
   * no CRISIS, so it was true here and incomplete on the head that ships.
   *
   * A composed name is therefore allowed to be absent from this loop ONLY
   * while the module it comes from is absent from this tree. Compose that lane
   * in and the call appears, and the check above covers it; take the call away
   * for real and this fails rather than leaving a stale name that would wave
   * some future check through.
   */
  it("keeps each cross-lane entry tied to the module it comes from", () => {
    const called = new Set(callsIn(eventLoopBody()));
    const sources: Readonly<Record<string, string>> = {
      pressEntityExists: "press/integrity.ts",
      pressEntityAvailableAt: "press/integrity.ts",
      crisisEntityExists: "crisis/records.ts",
    };
    const here = dirname(fileURLToPath(import.meta.url));
    for (const name of EVENT_PROOF_MONOTONE_CHECKS_COMPOSED) {
      const source = sources[name];
      expect(source, `${name} declares no source module`).toBeTruthy();
      const present = existsSync(join(here, source!));
      expect(
        called.has(name) || !present,
        `${name} is declared for composed heads, but ${source} IS in this tree and the loop does not call it. Either the call was removed — in which case drop the entry — or this tree composes that lane differently than the declaration assumes.`,
      ).toBe(true);
    }
  });

  /*
   * A memo that survived a save would be the worst version of this bug: a
   * corrupt event restored from disk would be skipped as "already proved" and
   * never looked at. The memo is a WeakSet of event OBJECTS, and a loaded world
   * has fresh ones, so the walk reaches index 0 and proves everything. This
   * test is what makes that a fact rather than an intention.
   */
  it("proves a loaded world in full, so no memo survives a save", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "events-suffix-reload",
        startAge: 40,
      }),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    // Validated here, so every event is marked proved in this process.
    assertWorldIntegrity(world);
    expect(world.history.events.length).toBeGreaterThan(50);

    const saved = JSON.parse(serializeWorld(world)) as {
      world: { history: { events: { summary: string }[] } };
    };
    // Corrupt an EARLY event — one the proof above definitely covered.
    saved.world.history.events[3]!.summary = "";
    expect(() =>
      assertWorldIntegrity(deserializeWorld(JSON.stringify(saved))),
    ).toThrow();
  }, 600_000);

  /*
   * An earlier version of this memo remembered a proved prefix LENGTH against
   * the last event and trusted position. That was unsound, and this is the case
   * that showed it: same length, same last event, a different object earlier
   * in the array. Marking each event individually is what makes it caught.
   */
  it("does not accept a record it did not itself prove", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "events-suffix-prefix",
        startAge: 40,
      }),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    assertWorldIntegrity(world);

    // Same length, same last event object, one earlier entry replaced.
    const events = [...world.history.events];
    events[2] = { ...events[2]!, summary: "" };
    expect(() =>
      assertWorldIntegrity({
        ...world,
        history: { ...world.history, events },
      }),
    ).toThrow();
  }, 600_000);

  it("still checks what was appended after a proof", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "events-suffix-append",
        startAge: 40,
      }),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    assertWorldIntegrity(world);

    // A new event appended after the proof is not covered by it.
    const last = world.history.events[world.history.events.length - 1]!;
    const bad = {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 1,
        events: [
          ...world.history.events,
          {
            ...last,
            // Branded: a template literal is a plain string, which widens the
            // element type and stops the whole World matching.
            id: `${last.id}-copy` as EntityId,
            sequence: last.sequence + 1,
          },
        ],
      },
    };
    expect(() => assertWorldIntegrity(bad)).toThrow();
  }, 600_000);
});
