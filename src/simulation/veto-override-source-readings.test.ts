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

function packFor(stateUsps: string) {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === `US-${stateUsps}`,
    ) ?? null
  );
}

/** The reading that governs an ordinary bill, which is what a pack states. */
function ordinaryOverride(stateUsps: string) {
  const reading = vetoOverrideReadingFor(stateUsps)!;
  const action = reading.actions[0]!;
  return action.thresholds[0]!;
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
    const played = VETO_OVERRIDE_SOURCE_READINGS.filter(
      (reading) => packFor(reading.stateUsps) !== null,
    );
    expect(played.map((reading) => reading.stateUsps).sort()).toEqual([
      "AK",
      "IL",
      "MD",
      "NE",
    ]);
    for (const reading of played) {
      const pack = packFor(reading.stateUsps)!;
      const threshold = requireOverrideThreshold(pack.executive.override);
      const read = ordinaryOverride(reading.stateUsps);
      expect({
        state: reading.stateUsps,
        numerator: threshold.numerator,
        denominatorParts: threshold.denominatorParts,
        countedAgainst: threshold.countedAgainst,
      }).toEqual({
        state: reading.stateUsps,
        numerator: read.numerator,
        denominatorParts: read.denominatorParts,
        countedAgainst: read.countedAgainst,
      });
    }
  });

  it("does not pretend a read jurisdiction is a playable legislature", () => {
    const readOnly = VETO_OVERRIDE_SOURCE_READINGS.filter(
      (reading) => packFor(reading.stateUsps) === null,
    ).map((reading) => reading.stateUsps);
    // Reading a veto clause does not make a legislature. Each of these needs a
    // rule pack before anything can be presented, vetoed or overridden there.
    // The day one gains a pack, the assertion above starts checking it, and
    // this list is the reminder that it should.
    expect(readOnly.sort()).toEqual(["DC", "NC", "TN", "VA", "WV"]);
  });
});
