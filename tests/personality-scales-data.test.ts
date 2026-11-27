import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import scalesData from "../src/core2/data/personality-scales.json" with { type: "json" };

/**
 * The personality catalog's scales are a data file, and this is its lock: the
 * received answer is hashed, and every scale is derived from it again and must
 * match the file field for field. A revision of the received text belongs in a
 * new pack version, not a rewrite of `personality-v1`: the save check compares
 * a stored definition with the pack's field for field.
 *
 * The answer is ChatGPT's DEPTH2 answer A01: all 121 researched catalog ids
 * resolved into scales, some with two ends and the rest one-sided. Four of the
 * two-ended scales are exactly the build's own deliberation, reliability,
 * conflict and risk; the answer says to bind those to the existing definitions
 * rather than declare them twice, so they are left out of the data file.
 */

const SOURCE = scalesData.source;

/** The received scales that are the build's own five under their own names. */
const BOUND_TO_THE_FIVE = [
  "deliberation",
  "reliability",
  "conflict",
  "risk",
] as const;

/** Qualities retired by Lamontae's September 26 personality decision. */
const RETIRED_QUALITIES = [
  "social-contact-preference",
  "ownership-of-duties",
  "facet-reserved",
  "facet-cheeky",
  "facet-distractible",
  "facet-even-tempered",
] as const;

const ABSORBED_MEANINGS: Readonly<Record<string, string>> = {
  "facet-calm":
    "Shows relatively measured immediate reactions and returns from ordinary irritation without prolonged escalation.",
  "facet-mischievous":
    "Looks for playful disruption, a low-stakes trick, or a playful test of small social boundaries.",
  "facet-daydreaming":
    "Attention sometimes turns inward to possibilities or shifts away from the current task.",
};

interface ReceivedEnd {
  readonly catalogue_id: string | null;
  readonly label: string;
  readonly meaning: string;
}

interface ReceivedScale {
  readonly key: string;
  readonly kind: "bipolar" | "one-sided-facet";
  readonly meaning: string;
  readonly low: ReceivedEnd;
  readonly high: ReceivedEnd;
  readonly tuning_profile: string;
}

interface ReceivedAssignment {
  readonly id: string;
  readonly family: string;
  readonly scale: string | null;
}

interface Received {
  readonly source_catalogue_sha256: string;
  readonly scales: readonly ReceivedScale[];
  readonly catalogue_assignments: readonly ReceivedAssignment[];
}

function derivedScales(text: string) {
  const received = JSON.parse(text) as Received;
  const familyOf = new Map<string, string>();
  for (const assignment of received.catalogue_assignments) {
    if (assignment.scale && !familyOf.has(assignment.scale)) {
      familyOf.set(assignment.scale, assignment.family);
    }
  }
  const bound = new Set<string>([...BOUND_TO_THE_FIVE, ...RETIRED_QUALITIES]);
  return received.scales
    .filter((scale) => !bound.has(scale.key))
    .map((scale) => ({
      key: scale.key,
      sides: scale.kind === "bipolar" ? "two" : "one",
      family: familyOf.get(scale.key) ?? "Unassigned",
      profile: scale.tuning_profile,
      meaning: ABSORBED_MEANINGS[scale.key] ?? scale.meaning,
      low: { label: scale.low.label, meaning: scale.low.meaning },
      high: { label: scale.high.label, meaning: scale.high.meaning },
    }));
}

describe("the personality catalog's data file", () => {
  const bytes = readFileSync(SOURCE);

  it("is locked to the received answer it was derived from", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      scalesData.sourceFileSha256,
    );
    expect(
      (JSON.parse(bytes.toString("utf8")) as Received).source_catalogue_sha256,
    ).toBe(scalesData.sourceCatalogueSha256);
  });

  it("holds exactly the scales the received answer derives", () => {
    const derived = derivedScales(bytes.toString("utf8"));
    // Proves the comparison has something to compare.
    expect(derived.length).toBeGreaterThan(50);
    expect(scalesData.scales).toEqual(derived);
  });
});
