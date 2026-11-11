/**
 * Kin are an optional step of the opening: leaving them out leaves no husks,
 * family links or family facts; naming every household gives the opening the
 * default build produces, byte for byte. Places are drawn from all 56 on a
 * seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { stableHash } from "./kernel/ids";
import { buildPopulation } from "./population";

const seed = process.env.KIN_OPTIONAL_SEED ?? randomBytes(10).toString("hex");

describe("opening kin are optional", () => {
  for (const attempt of [0, 1]) {
    it(`no kin means no husks or family links; every household named is the default opening (seed ${seed}, draw ${attempt})`, () => {
      const place = drawPlace(seed, `kin-optional:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const options = {
        seed: place.seed,
        placeKey: place.key,
        startedAt: "2026-01-01",
      };
      const full = buildPopulation(options);
      const keys = new Set(full.households.map((home) => home.id));
      const named = buildPopulation({ ...options, kinHouseholdIds: keys });
      expect(stableHash(JSON.stringify(named)), where).toBe(
        stableHash(JSON.stringify(full)),
      );
      expect(
        full.husks?.length ?? 0,
        `${where}: default has kin`,
      ).toBeGreaterThan(0);
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
      expect(toKin.length, `${where}: family facts naming absent kin`).toBe(0);
    }, 600_000);
  }
});
