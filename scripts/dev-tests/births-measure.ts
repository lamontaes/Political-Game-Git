// Full births in a played year against the CDC age-band rates, in drawn places: tsx births-measure.ts <placeKey|draw> <seed>
// One year of buildBenchWorld; full women by 5-year band at the start, person-birth records by the
// mother's band at the birth, the CDC rate beside the town's (a report, never a target).
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import natality from "../../data/research/renewal/natality-2024.json";

setBookkeeping(false);
const [arg = "draw", seed = "births-a"] = process.argv.slice(2);
const place =
  arg === "draw"
    ? drawPlace(seed, "births-measure")
    : { key: arg, name: arg, seed, state: "" };
const where = `${(place as { name: string }).name} [${place.key}], seed ${place.seed}`;
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const rates = (
  natality as unknown as {
    areas: Record<string, { ageRates: Record<string, number> }>;
  }
).areas["United States"]!.ageRates;
const bands = Object.keys(rates).filter((b) => Number(b.split("-")[0]) >= 15);
const bandOf = (age: number) =>
  bands.find((b) => {
    const [lo, hi] = b.split("-").map(Number);
    return age >= lo! && age <= hi!;
  });
const start = core.date;
const women = new Map<string, number>();
for (const p of core.people.values())
  if (p.alive && p.looks?.gender === "female" && p.tier !== "husk") {
    const b = bandOf(ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(start)));
    if (b) women.set(b, (women.get(b) ?? 0) + 1);
  }
advanceCore(core, addDays(makeIsoDate(start), 365));
const births = new Map<string, string[]>();
for (const row of core.durableLog.values()) {
  const r = row as unknown as {
    kind: string;
    id: string;
    date: string;
    facts?: { motherId?: string };
  };
  if (r.kind !== "person-birth" || r.date <= start) continue;
  const mother = core.people.get(r.facts?.motherId ?? "");
  if (!mother) continue;
  const b = bandOf(
    ageOnDate(makeIsoDate(mother.birthDate), makeIsoDate(r.date)),
  );
  if (b) births.set(b, [...(births.get(b) ?? []), r.id]);
}
let total = 0,
  expected = 0;
const lines: string[] = [];
for (const b of bands) {
  const w = women.get(b) ?? 0,
    n = births.get(b)?.length ?? 0;
  const e = (w * rates[b]!) / 1000;
  total += n;
  expected += e;
  lines.push(
    `${b}: ${w} full women, ${n} births (${w ? ((1000 * n) / w).toFixed(1) : "-"} per 1000), CDC ${rates[b]} per 1000 -> ${e.toFixed(1)} expected`,
  );
}
console.log(
  `${where}\n${lines.join("\n")}\nfull births ${total}, expected at CDC rates ${expected.toFixed(1)}; ids e.g. ${[...births.values()].flat().slice(0, 3).join(", ")}`,
);
