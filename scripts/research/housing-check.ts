/**
 * Checks the housing research read Oct 23, 2026 against the tables the
 * housing engines read, and exits 1 on any mismatch:
 *
 * - eviction steps: every field read from a place's statute text
 *   (data/research/world/eviction-statute-reads-2026.json) is the value in
 *   the place's row of src/core2/data/housing/housing.json, and a row is
 *   "high" confidence exactly when all four of its steps were read.
 *
 * Run: node --import tsx scripts/research/housing-check.ts
 */
import housing from "../../src/core2/data/housing/housing.json" with { type: "json" };
import evictionReads from "../../data/research/world/eviction-statute-reads-2026.json" with { type: "json" };

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

interface EvictionRead {
  readonly field: string;
  readonly value: number | boolean;
  readonly statute: string;
  readonly sourceUrl: string;
  readonly quote: string;
}
interface EvictionPlace {
  readonly readOct12: readonly string[];
  readonly readOct23: readonly EvictionRead[];
  readonly secondary: Readonly<Record<string, string>>;
  readonly allRead: boolean;
}

function checkEviction(): void {
  const rows = housing.eviction as unknown as Record<
    string,
    Record<string, unknown> & { confidence: string; estimatedFields: string[] }
  >;
  const places = evictionReads.places as unknown as Record<
    string,
    EvictionPlace
  >;
  const counts = Object.fromEntries(
    evictionReads.fields.map((field) => [field, 0]),
  );
  for (const [usps, place] of Object.entries(places)) {
    const row = rows[usps];
    if (!row) {
      fail(`eviction: ${usps} has no row in housing.json`);
      continue;
    }
    for (const read of place.readOct23) {
      if (!read.quote || !read.sourceUrl || !read.statute)
        fail(`eviction: ${usps} ${read.field} lacks a quote, URL or statute`);
      if (row[read.field] !== read.value)
        fail(
          `eviction: ${usps} ${read.field} is ${String(row[read.field])} in housing.json, read ${String(read.value)}`,
        );
      if (row.estimatedFields.includes(read.field))
        fail(`eviction: ${usps} ${read.field} read but still estimated`);
    }
    const read = new Set([
      ...place.readOct12,
      ...place.readOct23.map((r) => r.field),
    ]);
    for (const field of evictionReads.fields) {
      if (read.has(field)) counts[field]! += 1;
      else if (!place.secondary[field])
        fail(`eviction: ${usps} ${field} is neither read nor explained`);
    }
    const allRead = evictionReads.fields.every((field) => read.has(field));
    if (allRead !== place.allRead)
      fail(`eviction: ${usps} allRead is ${place.allRead}, fields say ${allRead}`);
    if ((row.confidence === "high") !== allRead)
      fail(
        `eviction: ${usps} confidence ${row.confidence} but allRead ${allRead}`,
      );
  }
  if (Object.keys(places).length !== Object.keys(rows).length)
    fail("eviction: the reads and housing.json cover different places");
  const all = Object.values(places).filter((p) => p.allRead).length;
  console.log(
    `eviction steps read from statute text, of ${Object.keys(places).length} places: ${evictionReads.fields
      .map((field) => `${field} ${counts[field]}`)
      .join(", ")}; all four in ${all}.`,
  );
}

checkEviction();
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log("housing research matches the engine tables.");
