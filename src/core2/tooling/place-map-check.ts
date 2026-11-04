/**
 * One check over every row of the place map: each place has its parents, law
 * chain, budget, offices and election calendar. Prints every gap by name and
 * writes the list to docs/reports/place-map-gaps.md. A gap is reported, never
 * filled with a national number. `--strict` exits 1 when any gap is left.
 */
import { writeFileSync } from "node:fs";
import { allPlaces, placeChain, placeSlots } from "../place-map";

const gaps = new Map<string, string[]>();
const note = (slot: string, name: string) => {
  const list = gaps.get(slot);
  if (list) list.push(name);
  else gaps.set(slot, [name]);
};
const rows = allPlaces();
// A jurisdiction whose map holds no county areas at all (the island territories) has no county to miss.
const statesWithCounties = new Set(
  rows.filter((r) => r.level === "county").map((r) => r.parentId),
);
for (const row of rows) {
  const label = `${row.name} (${row.id})`;
  const chain = placeChain(row.id);
  if (chain[chain.length - 1]?.id !== "US") note("parents", label);
  if (
    row.level === "town" &&
    row.parentId !== null &&
    statesWithCounties.has(row.parentId)
  )
    note("county area", label);
  const slots = placeSlots(row.id)!;
  if (!slots.budget) note("budget", label);
  if (!slots.offices) note("offices", label);
  if (!slots.calendar) note("calendar", label);
}
const lines = [
  "# Place map gaps",
  "",
  `${rows.length} places checked. A gap is a slot the existing files do not hold; none is filled with a national number. Regenerate with \`npm run place-map:check\`.`,
  "",
];
for (const [slot, names] of [...gaps].sort()) {
  const states = new Map<string, number>();
  for (const label of names) {
    const row = rows.find((r) => label.endsWith(`(${r.id})`))!;
    const st = placeChain(row.id).find((r) => r.level === "state")?.id ?? "US";
    states.set(st, (states.get(st) ?? 0) + 1);
  }
  lines.push(
    `## ${slot}: ${names.length} places`,
    "",
    `By jurisdiction: ${[...states]
      .sort()
      .map(([s, n]) => `${s} ${n}`)
      .join(", ")}.`,
    "",
    ...names.slice(0, 40).map((n) => `- ${n}`),
    ...(names.length > 40 ? [`- and ${names.length - 40} more`] : []),
    "",
  );
}
if (gaps.size === 0) lines.push("No gaps.", "");
writeFileSync(
  new URL("../../../docs/reports/place-map-gaps.md", import.meta.url),
  lines.join("\n"),
);
console.log(
  `${rows.length} places; gaps: ${[...gaps].map(([s, n]) => `${s} ${n.length}`).join(", ") || "none"}`,
);
if (process.argv.includes("--strict") && gaps.size > 0) process.exit(1);
