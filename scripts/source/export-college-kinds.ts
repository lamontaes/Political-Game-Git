import { readFileSync, writeFileSync } from "node:fs";

type SourceRow = readonly unknown[];
interface Overrides {
  readonly ivyLeague: readonly string[];
  readonly flagships: readonly string[];
}
const sourceRows = JSON.parse(
  readFileSync("data/source/education/corpus.json", "utf8"),
) as readonly SourceRow[];
const overrides = JSON.parse(
  readFileSync("data/research/places/college-kind-overrides.json", "utf8"),
) as Overrides;
const ivy = new Set(overrides.ivyLeague);
const flagship = new Set(overrides.flagships);
const fireSelection = JSON.parse(
  readFileSync(
    "data/research/places/political-hotbed-sources/fire-2025-bottom-quartile.json",
    "utf8",
  ),
) as {
  readonly sourceId: string;
  readonly published: string;
  readonly retrieved: string;
  readonly url: string;
  readonly rankUniverseSize: number;
  readonly selectionRule: string;
  readonly measure: string;
  readonly membershipStatus: string;
  readonly campuses: readonly {
    readonly rank: number;
    readonly name: string;
    readonly ipedsUnitId: string;
    readonly ipedsDirectoryName: string;
    readonly score: number;
    readonly speechClimate: string;
    readonly spotlightRating: string;
  }[];
};
const chronicleSelection = JSON.parse(
  readFileSync(
    "data/research/places/political-hotbed-sources/chronicle-2024-encampment-campuses.json",
    "utf8",
  ),
) as {
  readonly sourceId: string;
  readonly published: string;
  readonly retrieved: string;
  readonly url: string;
  readonly scope: string;
  readonly membershipStatus: string;
  readonly campuses: readonly {
    readonly ipedsUnitId: string;
    readonly name: string;
  }[];
};
const expectedFireRanks = Array.from({ length: 63 }, (_, index) => index + 189);
if (
  fireSelection.rankUniverseSize !== 251 ||
  JSON.stringify(fireSelection.campuses.map((row) => row.rank)) !==
    JSON.stringify(expectedFireRanks)
) {
  throw new Error("FIRE lower-quartile source must include each rank 189–251.");
}
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
const hotbedEvidence = new Map<
  string,
  {
    id: string;
    name: string;
    evidence: {
      sourceId: string;
      status: "reported" | "estimated";
      rank?: number;
      score?: number;
      speechClimate?: string;
      spotlightRating?: string;
    }[];
  }
>();
for (const row of fireSelection.campuses) {
  const unit = latest.get(row.ipedsUnitId);
  if (!unit || String(unit[2]) !== row.ipedsDirectoryName) {
    throw new Error(
      `FIRE campus ${row.rank} (${row.name}) does not resolve to the recorded IPEDS UNITID ${row.ipedsUnitId}.`,
    );
  }
  hotbedEvidence.set(row.ipedsUnitId, {
    id: row.ipedsUnitId,
    name: row.name,
    evidence: [
      {
        sourceId: fireSelection.sourceId,
        status: "estimated",
        rank: row.rank,
        score: row.score,
        speechClimate: row.speechClimate,
        spotlightRating: row.spotlightRating,
      },
    ],
  });
}
for (const row of chronicleSelection.campuses) {
  const unit = latest.get(row.ipedsUnitId);
  if (!unit) {
    throw new Error(
      `Chronicle campus ${row.name} does not resolve to IPEDS UNITID ${row.ipedsUnitId}.`,
    );
  }
  const existing = hotbedEvidence.get(row.ipedsUnitId);
  if (existing) {
    existing.evidence.push({
      sourceId: chronicleSelection.sourceId,
      status: "reported",
    });
  } else {
    hotbedEvidence.set(row.ipedsUnitId, {
      id: row.ipedsUnitId,
      name: row.name,
      evidence: [{ sourceId: chronicleSelection.sourceId, status: "reported" }],
    });
  }
}
const hotbeds = {
  schemaVersion: 2,
  reviewedAt: "2026-10-06",
  classificationStatus: "estimated",
  methodology:
    "A campus is tagged political-hotbed when it appears in either the lower quartile of FIRE's 2025 ordered free-speech rankings (ranks 189–251 of 251) or the Chronicle's named 2024 encampment-campus set. This is a proxy-based estimate of campus political salience, not a measured activism rate, political viewpoint, or chapter-existence claim. FIRE scores and ranks are reported measures; Chronicle event inclusion is reported; hotbed classification is estimated from those sources.",
  sources: [
    {
      id: fireSelection.sourceId,
      title: "2025 College Free Speech Rankings",
      publisher: "Foundation for Individual Rights and Expression",
      published: fireSelection.published,
      retrieved: fireSelection.retrieved,
      url: fireSelection.url,
      coverage: `${fireSelection.campuses.length} campuses, every ordered FIRE rank 189–251; ${fireSelection.measure}`,
    },
    {
      id: chronicleSelection.sourceId,
      title: "How Colleges Have Responded to Student Encampments",
      publisher: "The Chronicle of Higher Education",
      published: chronicleSelection.published,
      retrieved: chronicleSelection.retrieved,
      url: chronicleSelection.url,
      coverage: chronicleSelection.scope,
    },
  ],
  campuses: [...hotbedEvidence.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  ),
};
writeFileSync(
  "data/research/places/political-hotbeds.json",
  `${JSON.stringify(hotbeds, null, 2)}\n`,
);
const hotbed = new Set(hotbedEvidence.keys());
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
  politicalHotbedClassification: {
    status: "estimated",
    reviewedAt: hotbeds.reviewedAt,
    sources: hotbeds.sources.map(({ id, published, url }) => ({
      id,
      published,
      url,
    })),
  },
  institutions,
};
writeFileSync(
  "data/research/places/college-kinds.json",
  `${JSON.stringify(output, null, 2)}\n`,
);
