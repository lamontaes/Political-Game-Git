/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/**
 * The 12-month bands test on module worlds that open on published and drawn
 * months and run two years under the country tier. Development tooling:
 *   npx tsx scripts/money/band-exits.ts
 */
import { advanceCore } from "../../src/core2/life";
import { checkBands } from "../../src/core2/macro-model";
import {
  MACRO_MODULE,
  macroCoreData,
  withCentralBank,
} from "../../src/core2/modules/macro";
import { parameter } from "../../src/core2/parameters";
import { coreAPI, createCore } from "../../src/core2/state";
const data = macroCoreData();
const over = JSON.parse(process.env.OVER ?? "{}") as Record<string, number>;
const p = (k: string) => over[k] ?? parameter(k, data.parameters);
const source = {
  tag: "ESTIMATED" as const,
  asOf: "2000-01-01",
  citation: "Band-exit tooling.",
  estimatedFrom: "Tooling only.",
};
const worlds: [string, string][] = [
  ["2021-01-01", "band-published"],
  ["2026-10-01", "band-published"],
  ["2008-10-01", "band-published"],
  ...["world-a", "world-b", "world-c", "world-d"].map(
    (seed) => ["2025-01-20", seed] as [string, string],
  ),
];
for (const [start, seed] of worlds) {
  const core = createCore(
    withCentralBank({
      seed,
      startedAt: start,
      people: [],
      households: [],
      jobs: [],
      organizations: [
        {
          id: "organization:band",
          name: "band",
          placeId: "place:band",
          kind: "employer",
          liquidMinor: 0,
          source,
        },
      ],
      finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    }),
    { data, modules: [MACRO_MODULE] },
  );
  advanceCore(core, `${Number(start.slice(0, 4)) + 2}${start.slice(4)}`);
  const months = [
    ...coreAPI(core).moduleState("macro").table("months").rows(),
  ].sort((a: any, b: any) =>
    String(a.month).localeCompare(String(b.month)),
  ) as any[];
  const bad = checkBands(months, p).filter(
    (r) => !r.baseIsHistory && !r.inside,
  );
  console.log(
    `${start} ${seed}`,
    bad
      .map(
        (r) => `${r.measure}@${r.at}=${r.value.toFixed(2)}[${r.low},${r.high}]`,
      )
      .join(" ") || "ok",
  );
}
