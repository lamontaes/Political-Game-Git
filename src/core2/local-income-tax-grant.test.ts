/** Law levels: a town's income tax stands only while its state's grant does. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "income-tax-grant");

it(`the town's income tax is set aside the day its state takes the power away: ${place.name} (${place.key}), replay ${replay}`, () => {
  const chain = lawChainForPlace(place.key);
  const row = (
    id: string,
    level: string,
    jurisdiction: string,
    series: string,
    value: number,
    effectiveDate: string,
  ): LawRowInput => ({
    id,
    jurisdiction,
    level,
    series,
    tier: "general",
    value,
    effectiveDate,
    endDate: null,
    source: "Test-only input",
    retrieved: "2026-01-01",
    estimate: true,
    unit: "percent",
  });
  const town = chain.levels.at(-1)!;
  const rows = [
    row("t:state", "state", chain.stateKey, "income-tax", 4, "2026-01-01"),
    row("t:town", town.level, town.jurisdiction, "income-tax", 1, "2026-01-01"),
  ];
  const answer = (grant: LawRowInput | null) =>
    resolveLawInForce({
      series: "income-tax",
      chain,
      date: "2027-06-01",
      rows,
      localTaxGrant: grant,
    });
  const grants = row(
    "t:grant",
    "state",
    chain.stateKey,
    "local-income-tax-authority",
    1,
    "2026-01-01",
  );
  const withdraws = { ...grants, id: "t:withdrawn", value: 0 };
  expect(answer(grants).value).toBe(5);
  expect(answer(withdraws).value).toBe(4);
  expect(
    answer(withdraws).levels.find((l) => l.row?.id === "t:town")?.setAside,
  ).toBeTruthy();
});
