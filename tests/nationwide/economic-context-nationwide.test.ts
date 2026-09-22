import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  economicContextBindingForPlace,
  economicContextUnavailableReason,
  LEXINGTON_ECONOMIC_BINDING,
} from "../../src/presentation/economic-context-bindings";
import { NATIONAL_PLACES_ROWS } from "../../src/simulation/national-places.generated";

/**
 * Whether a derived binding actually reaches the figures this build ships.
 *
 * A binding that names a geography the corpus does not carry is not a bug the
 * provider reports — it yields no rows and the panel says "unavailable", which
 * is exactly how a broad but useless registry would look from the outside. So
 * these assertions go against the real shipped manifest index rather than a
 * fixture: the question is not whether a code was produced, it is whether the
 * code opens a shard.
 */
const manifest = JSON.parse(
  readFileSync("public/data/economic-context/v1/manifest.json", "utf8"),
) as {
  indexes: {
    bea: Record<string, string>;
    hud: Record<string, string>;
    laus: Record<string, string>;
  };
};

describe("economic context reaches the whole country", () => {
  it("keeps the reviewed crosswalk ahead of a derived one", () => {
    const lexington = economicContextBindingForPlace("lexington-fayette");
    expect(lexington).toBe(LEXINGTON_ECONOMIC_BINDING);
    // The reviewed row says Lexington IS its county, which is true of a
    // consolidated city-county and of almost nowhere else.
    expect(
      lexington?.beaAreas.find((area) => area.geographyLevel === "county")
        ?.relationship,
    ).toBe("same-jurisdiction");
  });

  it("does not tell an ordinary town that it is its county", () => {
    // New Canaan sits inside Fairfield County and is not Fairfield County.
    // (Connecticut's towns are minor civil divisions; only some of them are
    // also Census places, which is a separate gap — see the township finding.)
    const newCanaan = economicContextBindingForPlace("0950576");
    expect(newCanaan).not.toBeNull();
    const counties = newCanaan?.beaAreas.filter(
      (area) => area.geographyLevel === "county",
    );
    expect(counties?.length).toBeGreaterThan(0);
    for (const area of counties ?? []) {
      expect(area.relationship).toBe("containing-county");
    }
    for (const area of newCanaan?.hudFipsCodes ?? []) {
      expect(area.relationship).toBe("containing-hud-area");
    }
  });

  it("opens real shards for a broad sample of towns, not just codes", () => {
    const rows = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
    // Every 250th place: ~130 towns spread across every state, chosen by
    // position rather than by name so the sample cannot be a flattering one.
    const sample = rows.filter((_, index) => index % 250 === 0);
    expect(sample.length).toBeGreaterThan(100);

    let bound = 0;
    let beaResolves = 0;
    let hudResolves = 0;
    let lausResolves = 0;
    for (const [geoid] of sample) {
      const binding = economicContextBindingForPlace(geoid);
      if (!binding) continue;
      bound++;
      if (
        binding.beaAreas.some(
          (area) =>
            manifest.indexes.bea[`${area.geographyLevel}:${area.geoFips}`],
        )
      )
        beaResolves++;
      if (
        binding.hudFipsCodes.some(
          (area) => manifest.indexes.hud[area.hudFipsCode],
        )
      )
        hudResolves++;
      if (
        binding.lausAreaCodes.some(
          (area) => manifest.indexes.laus[area.areaCode],
        )
      )
        lausResolves++;
    }

    // Measured, not approximated. Every sampled place binds, every one opens
    // a real LAUS shard, and BEA covers all but one.
    expect(bound).toBe(sample.length);
    expect(lausResolves).toBe(sample.length);

    // The single BEA miss is Palmas del Mar, Puerto Rico, and it is the
    // island's standing gap rather than this binding's: the Census
    // place-to-county relation carries no county for any PR place, so there is
    // no county code to look up and no PR state row in the BEA corpus either.
    // Asserted exactly so that if the country's coverage slips anywhere else,
    // this fails instead of absorbing it.
    expect(beaResolves).toBe(sample.length - 1);

    // HUD does not file every county separately — New England is published by
    // metropolitan area rather than by county, so a county-suffixed code finds
    // nothing there. The provider reports that product unavailable and the
    // other two still answer, which is the fail-soft behavior we want.
    expect(hudResolves).toBe(119);
  });

  it("says why when it cannot, instead of rendering nothing", () => {
    // A whole state is not somewhere a person lives.
    expect(economicContextBindingForPlace("kentucky")).toBeNull();
    expect(economicContextUnavailableReason("kentucky")).toContain(
      "whole state",
    );
    expect(economicContextUnavailableReason("no-such-place")).toContain(
      "no record of this place",
    );
  });
});
