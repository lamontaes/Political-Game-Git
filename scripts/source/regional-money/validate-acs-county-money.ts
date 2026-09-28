/** Verify locked ACS county inputs and source cells without assigning game rules. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const prefix = "data/source/acs-county-housing-commute";
const manifest = JSON.parse(
  readFileSync(`${prefix}/regional-corpus-manifest.json`, "utf8"),
);
const lock = JSON.parse(
  readFileSync(`${prefix}/regional-artifact-lock.json`, "utf8"),
);
const canonical = gunzipSync(readFileSync(manifest.corpusPath));
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
if (sha256(canonical) !== manifest.canonicalSha256)
  throw new Error("ACS county corpus checksum mismatch");
for (const input of manifest.inputs) {
  const artifact = lock.artifacts.find(
    (entry: { localPath: string }) => entry.localPath === input.localPath,
  );
  const bytes = readFileSync(input.localPath);
  if (
    !artifact ||
    artifact.sha256 !== input.sha256 ||
    artifact.length !== bytes.length ||
    sha256(bytes) !== artifact.sha256
  )
    throw new Error(`ACS county source mismatch: ${input.localPath}`);
}
const corpus = JSON.parse(canonical.toString("utf8"));
type Value = { raw: string; value: number | null };
type County = {
  countyFips: string;
  geoId: string;
  medianOwnerOccupiedHomeValue: { estimate: Value; marginOfError: Value };
  medianGrossRent: { estimate: Value; marginOfError: Value };
  commuteTimeToWork: {
    bins: Array<{
      code: string;
      label: string;
      estimate: Value;
      marginOfError: Value;
    }>;
  };
};
const rows: County[] = corpus.rows;
const codes = rows.map((row) => row.countyFips);
if (
  rows.length !== 3222 ||
  new Set(codes).size !== 3222 ||
  codes.some((id) => !/^\d{5}$/.test(id))
)
  throw new Error("Unexpected ACS county coverage");
if (
  new Set(codes.map((id) => id.slice(0, 2))).size !== 52 ||
  !codes.some((id) => id.startsWith("72"))
)
  throw new Error("Expected 50 states, DC, and Puerto Rico county equivalents");
const regional = JSON.parse(
  gunzipSync(
    readFileSync("data/source/cbsa-delineations/regional-corpus.json.gz"),
  ).toString("utf8"),
);
if (
  codes.slice().sort().join(",") !==
  regional.rows
    .map((row: { countyFips: string }) => row.countyFips)
    .sort()
    .join(",")
)
  throw new Error("ACS/BLS county ID sets differ");
const anchors = [
  ["28011", "130000", "685", "9963", "353"],
  ["39049", "288400", "1302", "554131", "15399"],
  ["06075", "1394500", "2476", "321804", "32887"],
  ["72001", "94300", "425", "4657", "295"],
] as const;
for (const [id, home, rent, commuters, longCommute] of anchors) {
  const row = rows.find((entry) => entry.countyFips === id);
  if (
    !row ||
    row.geoId !== `0500000US${id}` ||
    row.medianOwnerOccupiedHomeValue.estimate.raw !== home ||
    row.medianGrossRent.estimate.raw !== rent ||
    row.commuteTimeToWork.bins[0]?.estimate.raw !== commuters ||
    row.commuteTimeToWork.bins[10]?.estimate.raw !== longCommute
  )
    throw new Error(`ACS source-cell anchor mismatch: ${id}`);
}
const jams = new Map<string, number>();
for (const row of rows) {
  const bins = row.commuteTimeToWork.bins;
  if (
    bins.length !== 13 ||
    bins[0]?.code !== "B08303_001" ||
    bins[10]?.label !== "45 to 59 minutes" ||
    bins.some(
      (bin, index) =>
        bin.code !== `B08303_${String(index + 1).padStart(3, "0")}`,
    )
  )
    throw new Error(`Unexpected commute headings: ${row.countyFips}`);
  const total = bins[0]!.estimate.value;
  if (
    total === null ||
    bins.slice(1).some((bin) => bin.estimate.value === null) ||
    bins.slice(1).reduce((sum, bin) => sum + bin.estimate.value!, 0) !== total
  )
    throw new Error(
      `Commute bins do not match published total: ${row.countyFips}`,
    );
  for (const cell of [
    row.medianOwnerOccupiedHomeValue,
    row.medianGrossRent,
    ...bins,
  ])
    for (const observation of [cell.estimate, cell.marginOfError])
      if (observation.value === null)
        jams.set(observation.raw, (jams.get(observation.raw) ?? 0) + 1);
}
if (
  jams.size !== 2 ||
  jams.get("-666666666") !== 12 ||
  jams.get("-222222222") !== 12
)
  throw new Error("ACS missing-value marks changed");
console.log(
  JSON.stringify(
    {
      result: "PASS",
      counties: rows.length,
      statesAndTerritories: 52,
      commuteBinsIncludingTotal: 13,
      jamMarks: Object.fromEntries(jams),
      anchors: anchors.length,
    },
    null,
    2,
  ),
);
