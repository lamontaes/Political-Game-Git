import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  NATIONAL_REPORTED_VOTING_2024,
  estimatedStatePopulation,
} from "../presentation/opening-state-estimates";
import { OpeningStatePopulation } from "./OpeningStatePopulation";
import { OpeningStateVoting } from "./OpeningStateVoting";

/** All 56 jurisdictions, from the same list the watched runs draw from. */
const ALL_56 = Object.keys(
  (nominationRules as { places: Record<string, unknown> }).places,
)
  .map((key) => key.replace(/^US-/, ""))
  .sort();

describe("the opening's state card is never blank or stuck loading", () => {
  it("covers all 56 jurisdictions", () => {
    expect(ALL_56).toHaveLength(56);
  });

  it("shows the internal population fallback without research labels in every jurisdiction", () => {
    for (const usps of ALL_56) {
      const html = renderToStaticMarkup(
        <OpeningStatePopulation stateUsps={usps} asOf="2026-01-05" />,
      );
      expect(html, usps).not.toContain("Loading");
      expect(html, usps).not.toMatch(/estimate|average|source|2024/i);
      expect(html, usps).toContain(
        estimatedStatePopulation(usps).toLocaleString("en-US"),
      );
      expect(estimatedStatePopulation(usps), usps).toBeGreaterThan(0);
    }
  });

  it("shows the internal voting fallback without research labels in every state", () => {
    for (const usps of ALL_56) {
      const html = renderToStaticMarkup(
        <OpeningStateVoting stateUsps={usps} asOf="2026-01-05" />,
      );
      expect(html, usps).not.toContain("Loading");
      expect(html, usps).not.toMatch(
        /estimated|national average|survey for this state/i,
      );
      expect(html, usps).toContain(
        `${Math.round(NATIONAL_REPORTED_VOTING_2024.votedPercent)}%`,
      );
    }
  });

  it("estimates a bigger state from more House seats", () => {
    expect(estimatedStatePopulation("CA")).toBeGreaterThan(
      estimatedStatePopulation("MO"),
    );
    expect(estimatedStatePopulation("MO")).toBeGreaterThan(
      estimatedStatePopulation("WY"),
    );
  });
});
