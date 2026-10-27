import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";

// Buyers outside the town spend with the nation's prices and real output and
// the region's demand (macro.ts reads them into every place's outside sales
// each month). One played year: the outside-sales flows move together with the
// place's factor, by flow id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "outside-sales-macro");

it(`outside sales follow the nation and region over a played year, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 31));
  const rt = residentsRuntime(core)!;
  const first = new Map<string, number>();
  for (const flow of rt.flows.values())
    if (flow.kind === "outside-sales" && !flow.endedAt)
      first.set(flow.id, flow.amountMinor);
  expect(first.size, "outside-sales flows in the town").toBeGreaterThan(0);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const ratios: { id: string; ratio: number }[] = [];
  for (const [id, before] of first) {
    const flow = rt.flows.get(id);
    if (flow && !flow.endedAt && before > 0)
      ratios.push({ id, ratio: flow.amountMinor / before });
  }
  expect(ratios.length).toBeGreaterThan(0);
  const sorted = ratios.map((r) => r.ratio).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  console.log(
    `OUTSIDE ${place.name} ${seed} flows ${ratios.length} median ratio ${median.toFixed(4)} e.g. ${ratios[0]!.id}`,
  );
  // A year of prices and output moves what outsiders spend.
  expect(Math.abs(median - 1)).toBeGreaterThan(0.001);
  // Firms move together with the place's factor: most flows sit near the median.
  const near = sorted.filter((r) => Math.abs(r / median - 1) < 0.02).length;
  expect(near / sorted.length).toBeGreaterThan(0.6);
}, 900_000);
