import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { buildProductionWorld } from "../presentation/production-world";
import { requireLifePlace } from "./index";
import { ensureLivingWorldOpening } from "./living-world/opening";
import { GIVEN_NAME_GENERATION_POOLS_V1 } from "./names-data";
import type { GenderIdentityKey, Person } from "./types";

/**
 * A generated person's given name has to agree with the gender the world gave
 * them.
 *
 * The owner met a man the game called "your dad" and named Maria, and said it
 * was persistent rather than a one-off. It was: measured on this branch before
 * the repair, an adult start in Lexington gave 29 of 72 generated people a
 * name from the opposite pool, and the seated Congress in one world gave 237
 * of 516.
 *
 * The cause was never a bad pool. `drawCanonicalNameForGender` has existed
 * since OCD-UI-003 and draws correctly; sixteen routes were drawing a name on
 * one stream and an identity on another and never introducing them. So this
 * file guards both halves — that no route pairs them apart again, and that a
 * generated population actually comes out agreeing.
 *
 * The direction stays OCD-UI-003's. Gender is the input to name generation and
 * a name is never read backwards to decide a gender, so nothing below asserts
 * anything about a person the world has not been told a gender for.
 */

const SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function productionSources(): string[] {
  const found: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith(".ts")) continue;
      if (entry.name.endsWith(".test.ts")) continue;
      found.push(path);
    }
  };
  walk(SOURCE_ROOT);
  return found;
}

const male = new Set(GIVEN_NAME_GENERATION_POOLS_V1.male);
const female = new Set(GIVEN_NAME_GENERATION_POOLS_V1.female);

function poolOf(givenName: string): "male" | "female" | "neutral" {
  if (male.has(givenName)) return "male";
  if (female.has(givenName)) return "female";
  return "neutral";
}

function disagreements(people: readonly Person[]): string[] {
  const wrong: string[] = [];
  for (const person of people) {
    const gender: GenderIdentityKey | undefined = person.identity?.gender;
    if (gender !== "male" && gender !== "female") continue;
    const pool = poolOf(person.givenName);
    if (pool === "neutral" || pool === gender) continue;
    wrong.push(
      `${person.givenName} ${person.familyName} is recorded ${gender} and carries a ${pool} given name`,
    );
  }
  return wrong;
}

describe("no route draws a name apart from the identity it belongs to", () => {
  /*
   * The structural half. A behavioural check can only cover the routes a test
   * happens to walk, and the routes that produced this defect were reached on
   * the second day of an ordinary life rather than by any suite. The shape is
   * mechanical and was mechanical in all sixteen places: an ungendered
   * `drawCanonicalName` spread into the same object literal that then draws an
   * `identity`. `drawCanonicalNamedIdentity` exists so the pairing is one call.
   */
  it("keeps the unrestricted draw off the module's surface", () => {
    /*
     * The class, not the instance. Correcting sixteen callers while the loose
     * draw stayed exported only waited for the seventeenth: a writer that
     * wants a name reaches for the function that asks for nothing. So
     * `drawUnrestrictedName` is module-private and `drawCanonicalNameForGender`
     * requires its gender — a route that genuinely knows nothing says
     * "unstated" and gets the same draw, as a declaration rather than an
     * omission.
     */
    const people = readFileSync(
      join(SOURCE_ROOT, "simulation/people.ts"),
      "utf8",
    );
    expect(people).toContain("function drawUnrestrictedName(");
    expect(people).not.toContain("export function drawUnrestrictedName(");
    const elsewhere = productionSources()
      .filter((path) => !path.endsWith(join("simulation", "people.ts")))
      .filter((path) =>
        readFileSync(path, "utf8").includes("drawUnrestrictedName"),
      );
    expect(elsewhere.map((path) => relative(SOURCE_ROOT, path))).toStrictEqual(
      [],
    );
  });

  it("keeps the legacy replay escape hatch to its allowed callers", () => {
    /*
     * `drawCanonicalName` is the loose draw under a name, kept so a save
     * written before the repair still replays byte-for-byte: the living-world
     * opening picks it only when the save says `memberNameVersion` is not
     * "identity-v1", and the earlier-life generator only when the save's
     * `givenNameGenerationVersion` is the legacy one. That is a real
     * obligation, not a loophole, so the allowlist is these two files and this
     * test is what stops it becoming three.
     */
    const callers = productionSources()
      .filter((path) => !path.endsWith(join("simulation", "people.ts")))
      .filter((path) =>
        readFileSync(path, "utf8").includes("drawCanonicalName("),
      )
      .map((path) => relative(SOURCE_ROOT, path));
    expect([...callers].sort()).toStrictEqual(
      [
        join("simulation", "character-history.ts"),
        join("simulation", "living-world", "opening.ts"),
      ].sort(),
    );
  });

  function splitDraws(source: string): boolean {
    const lines = source.split("\n");
    return lines.some((line, index) => {
      if (!line.includes("...drawCanonicalName(")) return false;
      // The name draw may wrap over several lines; the identity is the first
      // thing that follows it in the same literal either way.
      for (
        let ahead = index;
        ahead < Math.min(index + 6, lines.length);
        ahead += 1
      ) {
        if (lines[ahead]!.includes("identity: generatePersonIdentity")) {
          return true;
        }
      }
      return false;
    });
  }

  it("pairs the two draws wherever a generated person gets both", () => {
    const sources = productionSources();
    // A guard that reaches no files passes without measuring anything.
    expect(sources.length).toBeGreaterThan(200);
    const offenders = sources.filter((path) =>
      splitDraws(readFileSync(path, "utf8")),
    );
    expect(offenders.map((path) => relative(SOURCE_ROOT, path))).toStrictEqual(
      [],
    );
  });

  it("still finds the shape it is looking for, so the check is not dead", () => {
    // The literal that produced "Maria Whitlow, your dad", as it stood.
    expect(
      splitDraws(
        [
          "      stableKey: key,",
          '      ...drawCanonicalName(rng.fork("name")),',
          '      identity: generatePersonIdentity(rng.fork("identity")),',
        ].join("\n"),
      ),
    ).toBe(true);
    expect(
      splitDraws('  const name = drawCanonicalName(rng.fork("name"));'),
    ).toBe(false);
  });
});

describe("a generated population's names agree with its genders", () => {
  function adultStart(seed: string) {
    return buildProductionWorld({
      seed,
      place: requireLifePlace("lexington-fayette"),
      age: 22,
      givenName: null,
      familyName: null,
      // The ordinary adult start: the route the owner was playing when a man
      // came out named Maria.
      startingLife: "ordinary-life",
      depth: "summarize-earlier-life",
      household: "lives-alone",
      identity: { gender: "male", pronouns: "he-him" },
      // What a new game declares. The legacy version still draws the two
      // halves apart, on purpose, so a pre-repair save rebuilds byte-for-byte.
      givenNameGenerationVersion:
        DEFAULT_NEW_GAME_SETUP.givenNameGenerationVersion,
    });
  }

  it("agrees for everybody an ordinary adult start generates", () => {
    const wrong: string[] = [];
    let counted = 0;
    for (let index = 0; index < 24; index += 1) {
      const built = adultStart(`gendered-names-${index}`);
      const people = Object.values(built.world.people).filter(
        (person) => person.id !== built.playerPersonId,
      );
      counted += people.length;
      wrong.push(...disagreements(people));
    }
    // 72 before the repair, of which 29 disagreed.
    expect(counted).toBeGreaterThanOrEqual(72);
    expect(wrong).toStrictEqual([]);
  });

  it("agrees across the seated Congress", () => {
    const built = adultStart("gendered-names-congress");
    // A new game's own policy, not a value this test picked: the legacy
    // branch below it is reachable only by a save recorded before the repair,
    // and it has to stay reachable for those saves to replay.
    expect(DEFAULT_NEW_GAME_SETUP.livingWorldMemberNameVersion).toBe(
      "identity-v1",
    );
    const seated = ensureLivingWorldOpening(
      built.world,
      built.playerPersonId,
      DEFAULT_NEW_GAME_SETUP.livingWorldMemberNameVersion,
    );
    const people = Object.values(seated.people);
    // 538 people before the repair, of which 237 disagreed.
    expect(people.length).toBeGreaterThan(500);
    expect(disagreements(people)).toStrictEqual([]);
  });
});
