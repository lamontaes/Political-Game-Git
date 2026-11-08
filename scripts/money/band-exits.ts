import { macroCoreData } from "../../src/core2/modules/macro";
import {
  checkBands,
  historyMonths,
  publishedMonths,
  stepMacroMonth,
} from "../../src/core2/macro-model";
import { parameter } from "../../src/core2/parameters";
const data = macroCoreData();
const over = JSON.parse(process.env.OVER ?? "{}") as Record<string, number>;
const p = (k: string) => over[k] ?? parameter(k, data.parameters);
const sets: [string, any[]][] = [
  ...["2021-01-01", "2026-10-01", "2008-10-01"].map(
    (s) => [s, publishedMonths(s, p)] as [string, any[]],
  ),
  ...["world-a", "world-b", "world-c", "world-d"].map(
    (s) => [s, historyMonths("2025-01-20", s, p)] as [string, any[]],
  ),
];
for (const [name, months] of sets) {
  for (let i = 0; i < 24; i++)
    months.push(
      stepMacroMonth(months.at(-1)!, months.at(-1)!.policyRatePct, 0, 0, p),
    );
  const bad = checkBands(months, p).filter(
    (r) => !r.baseIsHistory && !r.inside,
  );
  console.log(
    name,
    bad
      .map(
        (r) => `${r.measure}@${r.at}=${r.value.toFixed(2)}[${r.low},${r.high}]`,
      )
      .join(" ") || "ok",
  );
}
