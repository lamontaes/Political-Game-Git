/** Law levels: the higher floor governs, and a town's wage counts only above both (federal over state, state over town). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "wage-floor-levels");

it(`a state wage below the federal floor never applies, and a town's counts only above both: ${place.name} (${place.key}), replay ${replay}`, () => {
  const chain = lawChainForPlace(place.key);
  const town = chain.levels.at(-1)!;
  const row = (
    id: string,
    level: string,
    jurisdiction: string,
    value: number,
  ): LawRowInput => ({
    id,
    jurisdiction,
    level,
    series: "minimum-wage",
    tier: "general",
    value,
    effectiveDate: "2026-01-01",
    endDate: null,
    source: "Test-only input",
    retrieved: "2026-01-01",
    estimate: false,
    unit: "usd",
  });
  const governing = (state: number, local: number | null) =>
    resolveLawInForce({
      series: "minimum-wage",
      chain,
      date: "2027-01-01",
      rows: [
        row("t:fed", "federal", "US", 725),
        row("t:state", "state", chain.stateKey, state),
        ...(local === null
          ? []
          : [row("t:town", town.level, town.jurisdiction, local)]),
      ],
      authorityRows: [
        {
          ...row("t:grant", "state", chain.stateKey, 1),
          series: "local-minimum-wage-authority",
        },
      ],
    }).governing?.id;
  expect(governing(500, null)).toBe("t:fed");
  expect(governing(900, null)).toBe("t:state");
  expect(governing(900, 800)).toBe("t:state");
  expect(governing(500, 1200)).toBe("t:town");
});
