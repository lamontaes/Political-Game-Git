/**
 * The Social Security claim-age laws reach their research links: each link
 * starts from the age law an engine reads at the moment it decides (the
 * claim engine reads the full retirement age, the jobs engine the earliest
 * claim age), not from a policy question no bill files. The law table finds
 * a law's links by its own key (`webLinksOf`, scripts/law-wiring/catalog.ts).
 */
import { describe, expect, it } from "vitest";
import billCatalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import { WEB_LINKS } from "./outcome-web-model";

const filed = new Set(
  (
    billCatalog as unknown as {
      subjects: { topics: { policies: { series?: string }[] }[] }[];
    }
  ).subjects.flatMap((s) =>
    s.topics.flatMap((t) =>
      t.policies.flatMap((p) => (p.series ? [p.series] : [])),
    ),
  ),
);

describe("the claim-age laws' research links", () => {
  it.each([
    [
      "social-security-full-retirement-age",
      "retirement-age-to-poverty",
      /retirement-claims\.ts/,
    ],
    [
      "social-security-earliest-claim-age",
      "earliest-claim-age-to-older-work",
      /jobs\.ts: retirementOnsetYears/,
    ],
  ])(
    "%s starts %s, carried by the engine that reads it",
    (series, key, engine) => {
      expect(filed.has(series), `${series} is a law a bill files`).toBe(true);
      const link = WEB_LINKS.find((l) => l.key === key);
      expect(link?.from).toBe(`law:${series}`);
      expect(link?.carriedBy).toMatch(engine);
    },
  );
});
