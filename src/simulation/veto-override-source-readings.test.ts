import { describe, expect, it } from "vitest";

import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { requireOverrideThreshold } from "./legislature-rules";
import {
  VETO_OVERRIDE_SOURCE_READINGS,
  vetoOverrideReadingFor,
} from "./veto-override-source-readings";

/**
 * A rule pack and the instrument it was read from must not drift apart.
 *
 * Four of the nine jurisdictions read from their own constitutions are also
 * played: Alaska, Illinois, Maryland and Nebraska. Their packs state an
 * override threshold and so do their constitutions, and the two agreeing is
 * not something anyone should have to re-verify by hand. An edit to a pack's
 * override that drifts from the instrument fails here rather than changing
 * the law quietly.
 *
 * The other five are read but not played, because a veto reading is not a
 * legislature: it says nothing about chambers, seats, committees, sessions or
 * enactment, and a pack needs all of those. That is a gap in the packs, and
 * the test below states it as one rather than leaving it to be discovered.
 */

/** The four read states whose instrument names a denominator this game has. */
const CLEANLY_MAPPED = ["AK", "IL", "MD", "NE"] as const;

function packFor(stateUsps: string) {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === `US-${stateUsps}`,
    ) ?? null
  );
}

/**
 * The reading a compiled pack states, for the four that map cleanly.
 *
 * Alaska, Illinois, Maryland and Nebraska each state one override rule against
 * a basis this project names, so their pack and their constitution can be held
 * to exact identity. The read jurisdictions that do not map that cleanly are
 * checked by the looser property below instead, which is not a weaker test of
 * the thing that matters: it still refuses any fraction the instrument does
 * not contain.
 */
function cleanlyMappedOverride(stateUsps: string) {
  const reading = vetoOverrideReadingFor(stateUsps)!;
  const action = reading.actions[0]!;
  return action.thresholds[0]!;
}

/** Every fraction the reading states for an override, in any of its actions. */
function statedOverrideFractions(stateUsps: string) {
  const reading = vetoOverrideReadingFor(stateUsps)!;
  return reading.actions
    .filter((action) => /override|restore/i.test(action.operation))
    .flatMap((action) => action.thresholds)
    .map((threshold) => `${threshold.numerator}/${threshold.denominatorParts}`);
}

describe("veto override readings against the packs that are played", () => {
  it("keeps every reading's fraction and citation legible", () => {
    expect(VETO_OVERRIDE_SOURCE_READINGS.length).toBe(9);
    for (const reading of VETO_OVERRIDE_SOURCE_READINGS) {
      expect(/^[A-Z]{2}$/.test(reading.stateUsps)).toBe(true);
      expect(reading.url.startsWith("https://")).toBe(true);
      expect(reading.actions.length).toBeGreaterThan(0);
      for (const action of reading.actions) {
        for (const threshold of action.thresholds) {
          expect(threshold.numerator).toBeGreaterThan(0);
          expect(threshold.denominatorParts).toBeGreaterThan(
            threshold.numerator - 1,
          );
          // An unmapped basis keeps the instrument's own words rather than
          // borrowing the nearest denominator the project happens to have.
          expect(threshold.readBasis.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("agrees with the pack wherever a state is both read and played", () => {
    for (const stateUsps of CLEANLY_MAPPED) {
      expect(packFor(stateUsps)).not.toBeNull();
    }
    for (const stateUsps of CLEANLY_MAPPED) {
      const pack = packFor(stateUsps)!;
      const threshold = requireOverrideThreshold(pack.executive.override);
      const read = cleanlyMappedOverride(stateUsps);
      expect({
        state: stateUsps,
        numerator: threshold.numerator,
        denominatorParts: threshold.denominatorParts,
        countedAgainst: threshold.countedAgainst,
      }).toEqual({
        state: stateUsps,
        numerator: read.numerator,
        denominatorParts: read.denominatorParts,
        countedAgainst: read.countedAgainst,
      });
    }
  });

  it("never lets a read state's override come from a drawn value", () => {
    // Scope, stated rather than implied: `LEGISLATIVE_RULE_PACKS` holds the
    // compiled packs only, so today this covers the same four the test above
    // does. It is written over every reading on purpose, so that the day a
    // read state's pack arrives in that list it is checked without anyone
    // remembering to add it.
    //
    // What it asserts is the regression that would matter: a state whose
    // instrument has been read going back to a drawn threshold. A drawn value
    // carries a `game-profile` source; a read one carries the instrument.
    // Comparing a generated pack's fraction back to the reading would prove
    // nothing, because such a pack is built from the reading — break the
    // reading and both sides move together — which is why the source, not the
    // fraction alone, is the thing worth pinning.
    for (const reading of VETO_OVERRIDE_SOURCE_READINGS) {
      const pack = packFor(reading.stateUsps);
      if (pack === null) continue;
      if (pack.executive.override.kind === "not-applicable") continue;
      const threshold = requireOverrideThreshold(pack.executive.override);
      expect({
        state: reading.stateUsps,
        authority: threshold.source.authority,
        fraction: `${threshold.numerator}/${threshold.denominatorParts}`,
      }).toEqual({
        state: reading.stateUsps,
        authority: expect.not.stringMatching(/game-profile/),
        fraction: expect.stringMatching(
          new RegExp(
            `^(${statedOverrideFractions(reading.stateUsps).join("|")})$`,
          ),
        ),
      });
    }
  });

  it("reads nine jurisdictions and plays only the ones that have a pack", () => {
    // Reading a veto clause does not make a legislature: a pack also needs
    // chambers, seats, sessions and enactment. So a read state is playable
    // only once something supplies those. This deliberately does not name
    // which five are unplayed today — that list stops being true the moment
    // a state gains a legislature from somewhere else, while still passing,
    // which is the worst way for an assertion to age.
    const readOnly = VETO_OVERRIDE_SOURCE_READINGS.filter(
      (reading) => packFor(reading.stateUsps) === null,
    ).map((reading) => reading.stateUsps);
    const played = VETO_OVERRIDE_SOURCE_READINGS.filter(
      (reading) => packFor(reading.stateUsps) !== null,
    ).map((reading) => reading.stateUsps);
    expect([...readOnly, ...played].sort()).toEqual([
      "AK",
      "DC",
      "IL",
      "MD",
      "NC",
      "NE",
      "TN",
      "VA",
      "WV",
    ]);
  });
});
