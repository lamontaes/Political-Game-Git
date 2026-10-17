/**
 * Does a state's home price move the way FHFA says it moved? For every state,
 * the engine's price ratio (`homePriceRatio`, from the compiled quarterly
 * index) from the second quarter of 2025 to the second quarter of 2026,
 * against the published one-year growth in FHFA's 2026 second-quarter state
 * summary (purchase-only, seasonally adjusted; the engine's index is
 * all-transactions, not seasonally adjusted, so a small gap is expected).
 *
 * Reads: data/research/housing/roadmap-r4-fhfa-state-2026q2.json.
 * Run: node --import tsx scripts/core2-year/fhfa-growth-check.ts
 */
import { readFileSync } from "node:fs";
import { homePriceRatio } from "../../src/core2/housing-prices";
import { corePlaceStateIdentities } from "../../src/core2/place-lookup";

const summary = JSON.parse(
  readFileSync(
    "data/research/housing/roadmap-r4-fhfa-state-2026q2.json",
    "utf8",
  ),
) as { rows: { value: { State: string; "1 Year": number } }[] };
const usps = new Map(
  corePlaceStateIdentities().map((row) => [row.name, row.usps]),
);
let worst = { state: "", gap: 0 };
let sum = 0;
let n = 0;
for (const row of summary.rows) {
  const code = usps.get(row.value.State);
  if (!code) {
    console.log(`${row.value.State}: no state in the place identities`);
    continue;
  }
  const engine = (homePriceRatio(code, "2025-05-15", "2026-05-15") - 1) * 100;
  const gap = engine - row.value["1 Year"];
  sum += Math.abs(gap);
  n += 1;
  if (Math.abs(gap) > Math.abs(worst.gap)) worst = { state: code, gap };
  if (Math.abs(gap) > 2)
    console.log(
      `${code}: engine ${engine.toFixed(1)}% a year, FHFA ${row.value["1 Year"]}% (${gap.toFixed(1)} points)`,
    );
}
console.log(
  `${n} states: mean gap ${(sum / n).toFixed(2)} points, worst ${worst.state} ${worst.gap.toFixed(1)}`,
);
