import { readFileSync, writeFileSync } from "node:fs";

type SourceRow = readonly unknown[];
interface Overrides {
  readonly ivyLeague: readonly string[];
  readonly flagships: readonly string[];
  readonly politicalHotbeds: readonly string[];
}
const sourceRows = JSON.parse(
  readFileSync("data/source/education/corpus.json", "utf8"),
) as readonly SourceRow[];
const overrides = JSON.parse(
  readFileSync("data/research/places/college-kind-overrides.json", "utf8"),
) as Overrides;
const ivy = new Set(overrides.ivyLeague);
const flagship = new Set(overrides.flagships);
const hotbed = new Set(overrides.politicalHotbeds);
const latest = new Map<string, SourceRow>();
for (const row of sourceRows) {
  if (
    row[1] !== "postsecondary" ||
    row[14] !== "2025-26" ||
    !["A", "N", "R"].includes(String(row[8]))
  )
    continue;
  const id = String(row[0]).replace(/^ipeds-unit:/, "");
  if (!latest.has(id)) latest.set(id, row);
}
const institutions = [...latest.entries()]
  .map(([id, row]) => {
    const levels = new Map(
      (row[12] as readonly (readonly string[])[]).map(([k, v]) => [k, v]),
    );
    const control = String(
      (row[15] as { control?: string } | undefined)?.control ?? "",
    );
    const kind = ivy.has(id)
      ? "ivy-league"
      : flagship.has(id)
        ? "flagship"
        : hotbed.has(id)
          ? "political-hotbed"
          : control === "1" &&
              levels.get("LEVEL5") !== "1" &&
              levels.get("LEVEL3") === "1"
            ? "community"
            : control === "1"
              ? "regional-public"
              : "private";
    return {
      id: `ipeds-unit:${id}`,
      state: String(row[4]),
      kind,
      sourceYear: "2025-26",
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
const output = {
  schemaVersion: 1,
  source: {
    name: "U.S. Department of Education, National Center for Education Statistics, IPEDS 2025-26 directory corpus",
    path: "data/source/education/corpus.json",
    method:
      "Public/private control and reported award levels determine broad fallback categories; reviewed identity overrides designate Ivy League, state/territory flagships and political hotbeds.",
  },
  institutions,
};
writeFileSync(
  "data/research/places/college-kinds.json",
  `${JSON.stringify(output, null, 2)}\n`,
);
