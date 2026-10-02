import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { makeIsoDate } from "../dates";
import { startingLawTerms, type LawInForce } from "./law-in-force";
import type { EntityId } from "../types";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { stateJurisdictionForKey } from "../life-places";
import { lawInForce } from "./law-in-force";
import { serializeWorld, deserializeWorld } from "../serialization";

const questionKey = "us-policy-positions:labor-workforce.paid-family-leave";
const law = (operativeAt: string, place = "US-NJ"): LawInForce => ({
  answer: "yes",
  origin: "in-force-at-start",
  measureId: `starting-law:${place}:${questionKey}` as EntityId,
  operativeAt: makeIsoDate(operativeAt),
  operativeBasis: "enacted-date",
  level: "state-statute",
});

describe("sourced annual family-leave terms", () => {
  it("retains sourced legal amounts in a random ordinary opening and reload", () => {
    const seed = "labor-sourced-phase-opening-20261002";
    const supported = new Set([
      "US-CA",
      "US-CT",
      "US-DE",
      "US-NJ",
      "US-NY",
      "US-OR",
    ]);
    const place = drawRandomPlace(
      seed,
      (candidate) =>
        candidate.stateJurisdictionKey !== null &&
        supported.has(candidate.stateJurisdictionKey),
    );
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    expect(game).not.toBeNull();
    const world = game!.world;
    const stateKey = place.stateJurisdictionKey;
    if (!stateKey)
      throw new Error("The sourced opening needs its recorded state key.");
    const jurisdiction = stateJurisdictionForKey(stateKey)!;
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === questionKey,
    )!;
    const read = (current: typeof world) => {
      const operative = lawInForce(
        current,
        jurisdiction.id,
        proposition.id,
        current.currentDate,
      )!;
      return startingLawTerms(operative, questionKey, current.currentDate);
    };
    const before = JSON.stringify(world);
    const terms = read(world);
    expect(terms.length).toBeGreaterThan(0);
    expect(JSON.stringify(world)).toBe(before);
    expect(read(deserializeWorld(serializeWorld(world)))).toEqual(terms);
    stdout.write(
      JSON.stringify({
        seed,
        place: place.key,
        date: world.currentDate,
        legalAmounts: terms.map(({ key, value, unit }) => ({
          key,
          value,
          unit,
        })),
      }) + "\n",
    );
  });
  it.each<[string, [string, number, string][]]>([
    ["US-CA", [["rate", 130, "basis-points"]]],
    [
      "US-CT",
      [
        ["rate", 50, "basis-points"],
        ["cap", 184500, "dollars/year"],
      ],
    ],
    [
      "US-OR",
      [
        ["rate", 60, "basis-points"],
        ["cap", 184500, "dollars/year"],
      ],
    ],
    [
      "US-NY",
      [
        ["rate", 43.2, "basis-points"],
        ["replacement", 0.67, "ratio"],
      ],
    ],
    ["US-DE", [["replacement", 0.8, "ratio"]]],
  ])("reads only supported 2026 monetary fields for %s", (place, fields) => {
    const terms = startingLawTerms(
      law("2026-01-01", place),
      questionKey,
      makeIsoDate("2026-06-01"),
    );
    expect(terms.map(({ key, value, unit }) => [key, value, unit])).toEqual(
      fields,
    );
    expect(terms.some(({ key }) => key === "duration")).toBe(false);
  });

  it("distinguishes sourced employer-only funding from an unknown employee rate", () => {
    expect(
      startingLawTerms(
        law("2026-10-01", "US-DC"),
        questionKey,
        makeIsoDate("2026-10-01"),
      ),
    ).toEqual([{ questionKey, key: "rate", value: 0, unit: "basis-points" }]);
  });
  it("keeps 2026 employee contributions distinct from total or disability premiums", () => {
    expect(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2026-01-01"),
      ),
    ).toEqual([
      { questionKey, key: "rate", value: 23, unit: "basis-points" },
      { questionKey, key: "cap", value: 171100, unit: "dollars/year" },
      { questionKey, key: "replacement", value: 0.85, unit: "ratio" },
    ]);
  });

  it("does not backdate annual terms to the categorical reader default", () => {
    expect(
      startingLawTerms(
        law("2000-01-01"),
        questionKey,
        makeIsoDate("2025-12-31"),
      ),
    ).toEqual([]);
  });

  it("does not treat a research coverage boundary as a legal expiry", () => {
    expect(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2026-12-31"),
      ),
    ).toHaveLength(3);
    expect(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2027-01-01"),
      ),
    ).toEqual(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2026-12-31"),
      ),
    );
  });
});
