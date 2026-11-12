/**
 * Kin are an optional step of the opening: leaving them out leaves no husks,
 * family links or family facts; naming every household gives the opening the
 * default build produces, record for record. Places are drawn from all 56 on a
 * seed nobody chose; a draw whose default opening has no kin is passed over
 * and named, and the test fails when the tries run out.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { stableHash } from "./kernel/ids";
import { buildPopulation } from "./population";

const seed = process.env.KIN_OPTIONAL_SEED ?? randomBytes(10).toString("hex");
const TRIES = 12;

/** One short digest per top-level field, folding each record in turn, so a
 * large place never builds one string for the whole opening. */
function digest(population: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(population)) {
    if (Array.isArray(value)) {
      let folded = "";
      for (const item of value)
        folded = stableHash(`${folded}${JSON.stringify(item)}`);
      out[key] = `${value.length}:${folded}`;
    } else out[key] = stableHash(JSON.stringify(value) ?? "");
  }
  return out;
}

describe("opening kin are optional", () => {
  for (const attempt of [0, 1]) {
    it(`no kin means no husks or family links; every household named is the default opening (seed ${seed}, draw ${attempt})`, () => {
      const passedOver: string[] = [];
      for (let tryIndex = 0; tryIndex < TRIES; tryIndex++) {
        const place = drawPlace(seed, `kin-optional:${attempt}:${tryIndex}`);
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const options = {
          seed: place.seed,
          placeKey: place.key,
          startedAt: "2026-01-01",
        };
        const full = buildPopulation(options);
        if ((full.husks?.length ?? 0) === 0) {
          passedOver.push(`${where}: the default opening has no kin`);
          continue;
        }
        const keys = new Set(full.households.map((home) => home.id));
        const named = buildPopulation({ ...options, kinHouseholdIds: keys });
        expect(digest(named), where).toEqual(digest(full));
        const none = buildPopulation({
          ...options,
          kinHouseholdIds: new Set(),
        });
        expect(none.husks?.length ?? 0, where).toBe(0);
        expect(none.familyLinks.length, where).toBeLessThan(
          full.familyLinks.length,
        );
        const present = new Set(none.people.map((person) => person.id));
        const toKin = none.people.flatMap((person) =>
          (person.pastFacts ?? []).filter(
            (fact) =>
              String(fact.kind).startsWith("family:") &&
              !present.has(String(fact.facts?.otherPersonId)),
          ),
        );
        expect(toKin.length, `${where}: family facts naming absent kin`).toBe(
          0,
        );
        return;
      }
      expect.fail(
        `no drawn place had kin in ${TRIES} tries; passed over: ${passedOver.join("; ")}`,
      );
    }, 1_200_000);
  }
});
