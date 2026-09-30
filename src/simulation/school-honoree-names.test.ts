import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SeededRng } from "./rng";
import {
  generateSchoolNames,
  SCHOOL_NAMES_V1,
  SCHOOL_NAMES_V3_VERSION,
} from "./school-names";
import { lifePlaceStateIdentities } from "./life-places";
import { observerSetup } from "../presentation/observer-world";
import {
  encodeReplayDescriptor,
  decodeReplayDescriptor,
} from "../presentation/new-game-identity";
import {
  prepareOpeningLife,
  generateOpeningLife,
} from "../presentation/opening-life";
import { educationEnrollmentHistoryForPerson, organizationProfileAt } from ".";

describe("school honorees are historical naming patterns, not generated people", () => {
  it("uses only place, direction, landscape or historical figures in every supported state", () => {
    const stems = new Set([
      "Dexter",
      ...SCHOOL_NAMES_V1.figures,
      ...SCHOOL_NAMES_V1.features,
      ...SCHOOL_NAMES_V1.directions.map((d) => `${d} Dexter`),
    ]);
    for (const state of lifePlaceStateIdentities())
      for (let n = 0; n < 100; n++) {
        const names = generateSchoolNames(
          new SeededRng(`honoree:${state.jurisdictionKey}:${n}`),
          "Dexter",
          SCHOOL_NAMES_V3_VERSION,
          { state: state.jurisdictionKey.slice(3) },
        );
        for (const name of Object.values(names))
          expect(
            stems.has(name.replace(/ (Elementary|Middle|High) School$/, "")),
          ).toBe(true);
      }
  });
  it("preserves the captured v1/v2 replay streams", () => {
    for (const [version, digest] of [
      [
        "school-names-v1",
        "e8a2950a36b53ddd4b6fa6b471becf0ca3524d096d1c0e3b07448b1c59ae906f",
      ],
      [
        "school-names-v2",
        "8f4abdebacf7c0a5e10ae764e2aba701d2499f44d93b4b929dc7546a72837fb4",
      ],
    ]) {
      const rows = Array.from({ length: 100 }, (_, n) =>
        generateSchoolNames(
          new SeededRng(`honoree-legacy:${n}`),
          "Dexter",
          version,
          { state: "ME" },
        ),
      );
      expect(
        createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
      ).toBe(digest);
    }
  });
  for (const [seed, placeKey] of [
    ["team8-opening-1-a", "2464475"],
    ["team8-opening-1-b", "1669130"],
    ["team8-opening-1-c", "1874780"],
  ])
    it(
      `new saved childhood and replay select v3: ${placeKey}`,
      { timeout: 120_000 },
      () => {
        const setup = observerSetup(seed!, placeKey!);
        expect(setup.schoolNameVersion).toBe(SCHOOL_NAMES_V3_VERSION);
        const decoded = decodeReplayDescriptor(encodeReplayDescriptor(setup));
        expect(decoded?.schoolNameVersion).toBe(SCHOOL_NAMES_V3_VERSION);
        const game = generateOpeningLife(prepareOpeningLife(setup)).game!;
        const names = educationEnrollmentHistoryForPerson(
          game.world,
          game.playerPersonId,
        ).map(
          (record) =>
            organizationProfileAt(game.world, record.organizationId)?.name,
        );
        expect(names.length).toBeGreaterThan(1);
        expect(
          names.every((name) => !!name && !name.startsWith("Jade Cruz ")),
        ).toBe(true);
        for (const version of ["school-names-v2", undefined] as const) {
          const old = { ...setup, schoolNameVersion: version };
          expect(
            decodeReplayDescriptor(encodeReplayDescriptor(old))
              ?.schoolNameVersion,
          ).toBe(version);
        }
      },
    );
});
