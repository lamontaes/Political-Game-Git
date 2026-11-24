/** Law levels: a federal mandate in force governs; a state's "no" or repeal, or a town's rule, cannot override it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-mandate");
const QUESTION =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

it(`a federal mandate governs over the state's no and a town's rule from its date: ${place.name} (${place.key}), replay ${replay}`, () => {
  const chain = lawChainForPlace(place.key);
  const town = chain.levels.at(-1)!;
  const row = (
    id: string,
    level: string,
    jurisdiction: string,
    value: number,
    effectiveDate: string,
    mandate = false,
  ): LawRowInput => ({
    id,
    jurisdiction,
    level,
    series: QUESTION,
    tier: "general",
    value,
    effectiveDate,
    endDate: null,
    source: "Test-only input",
    retrieved: "2026-01-01",
    estimate: false,
    unit: "answer",
    ...(mandate ? { terms: { mandate: true } } : {}),
  });
  const rows = [
    row("t:fed", "federal", "US", 1, "2027-01-01", true),
    row("t:state", "state", chain.stateKey, 0, "2025-01-01"),
    row("t:town", town.level, town.jurisdiction, 0, "2025-01-01"),
  ];
  const at = (date: string) =>
    resolveLawInForce({ series: QUESTION, chain, date, rows }).governing?.id;
  expect(at("2026-06-01"), "before the mandate").not.toBe("t:fed");
  expect(at("2027-01-01"), "the day it takes effect").toBe("t:fed");
  expect(at("2028-06-01"), "after").toBe("t:fed");
});
