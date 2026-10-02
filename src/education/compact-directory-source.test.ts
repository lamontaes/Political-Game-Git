import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactInstitution, expandInstitution } from "./compact";
import { ipedsDirectorySource } from "../source/domains/education";
import {
  openProductionArtifacts,
  readZipMember,
  parseDelimited,
} from "../source/core";
import type { ArtifactLock } from "../source/core";
import type { EducationInstitution } from "./types";
import { educationInstitutionLocation } from "./study-provider";
import { lifePlaceByKey } from "../simulation/life-places";

const lock = JSON.parse(
  readFileSync("data/source/education/artifact-lock.json", "utf8"),
) as ArtifactLock;
function sourceRows() {
  const opened = openProductionArtifacts("education", lock, {
    hd: "HD2025",
    ic: "IC2025",
  }).artifacts;
  const parse = (key: "hd" | "ic", member: string) => {
    const csv = parseDelimited(readZipMember(opened[key]!.bytes, member), {
      delimiter: ",",
      hasHeaderRow: true,
      trimFields: true,
    });
    return csv.rows.map((row) => ({
      line: row.line,
      data: Object.fromEntries(
        csv.header!.map((field, i) => [field, row.fields[i] ?? ""]),
      ),
    }));
  };
  const hd = parse("hd", "hd2025.csv");
  const ic = new Map(
    parse("ic", "ic2025.csv").map((row) => [row.data.UNITID, row]),
  );
  return { hd, ic, opened };
}
const sources = sourceRows();
const hd = sources.hd.find(
  (row) =>
    sources.ic.get(row.data.UNITID)?.data.PUBPRIME === "2" &&
    /^\d{5}$/.test(row.data.COUNTYCD ?? ""),
)!;
const ic = sources.ic.get(hd.data.UNITID)!;
const institution: EducationInstitution = {
  id: `ipeds-unit:${hd.data.UNITID}`,
  officialId: hd.data.UNITID!,
  kind: "postsecondary",
  name: hd.data.INSTNM!,
  city: hd.data.CITY!,
  state: hd.data.STABBR!,
  stateFips: hd.data.FIPS!,
  countyGeoid: hd.data.COUNTYCD!,
  parentDistrictId: null,
  sourceYear: "2025-26",
  release: "HD2025/IC2025 provisional",
  statusCode: hd.data.ACT!,
  statusLabel: "Active",
  statusEffectiveDate: null,
  foundingDate: null,
  capabilities: [],
  openAdmissionPolicy: "unknown",
  directorySource: ipedsDirectorySource(hd.data, ic.data),
  evidence: [
    ["hd", "hd2025.csv", hd.line],
    ["ic", "ic2025.csv", ic.line],
  ].map(([key, member, row]) => ({
    artifactId: sources.opened[key as "hd" | "ic"]!.artifact.artifactId,
    sha256: sources.opened[key as "hd" | "ic"]!.artifact.bytes.sha256,
    member: String(member),
    row: Number(row),
  })),
};
const dictionary = {
  capabilities: {},
  hashes: Object.fromEntries(
    institution.evidence.map((e) => [e.artifactId, e.sha256]),
  ),
};
describe("A21 directory source projection", () => {
  it("the exported production directory retains the compiler's source projection", () => {
    const manifest = JSON.parse(
      readFileSync("public/education/manifest.json", "utf8"),
    ) as { chunks: { kind: string; path: string }[] };
    const chunk = manifest.chunks.find((row) => row.kind === "postsecondary")!;
    const payload = JSON.parse(
      readFileSync(`public/education/${chunk.path}`, "utf8"),
    ) as {
      records: ReturnType<typeof compactInstitution>[];
      dictionary: typeof dictionary;
    };
    const row = payload.records.find(
      (row) => row[0] === institution.id && row[14] === institution.sourceYear,
    )!;
    expect(row).toBeDefined();
    const decoded = expandInstitution(row, payload.dictionary);
    expect(decoded.directorySource).toEqual(institution.directorySource);
    expect(decoded.evidence).toEqual(institution.evidence);
    expect(decoded.countyGeoid).toBe(institution.countyGeoid);
  });

  it("round-trips actual joined source fields, coordinates, identity and evidence", () => {
    const decoded = expandInstitution(
      compactInstitution(institution),
      dictionary,
    );
    expect(decoded).toEqual(institution);
    expect(decoded.directorySource).toMatchObject({
      control: hd.data.CONTROL,
      primaryPublicControl: ic.data.PUBPRIME,
      secondaryPublicControl: ic.data.PUBSECON,
      calendarSystem: ic.data.CALSYS,
      controllingSystemName: hd.data.F1SYSNAM,
      controllingSystemId: hd.data.F1SYSCOD,
      latitude: Number(hd.data.LATITUDE),
      longitude: Number(hd.data.LONGITUD),
    });
    expect(decoded.directorySource).not.toHaveProperty(
      "publicGovernmentIdentity",
    );
  });
  it("loads legacy 15-column rows without inventing missing fields", () => {
    const legacy = compactInstitution(institution).slice(
      0,
      15,
    ) as unknown as ReturnType<typeof compactInstitution>;
    const old = { ...institution };
    delete old.directorySource;
    expect(expandInstitution(legacy, dictionary)).toEqual(old);
    expect(expandInstitution(legacy, dictionary)).not.toHaveProperty(
      "directorySource",
    );
  });
  it("retains absent source columns and coordinates without a guessed owner", () => {
    expect(ipedsDirectorySource({}, undefined)).toEqual({
      control: "",
      controlAffiliation: "",
      primaryPublicControl: "",
      secondaryPublicControl: "",
      calendarSystem: "",
      controllingSystemName: "",
      controllingSystemId: "",
      latitude: null,
      longitude: null,
    });
  });
  it("uses a source county only when that actual jurisdiction is saved", () => {
    const place = lifePlaceByKey(`county:${institution.countyGeoid}`)!;
    expect(place).not.toBeNull();
    expect(
      educationInstitutionLocation({ jurisdictions: {} }, institution),
    ).toBeNull();
    const jurisdiction = place.context.jurisdiction;
    expect(
      educationInstitutionLocation(
        { jurisdictions: { [jurisdiction.id]: jurisdiction } },
        institution,
      ),
    ).toBe(jurisdiction.id);
    expect(
      educationInstitutionLocation(
        { jurisdictions: { [jurisdiction.id]: jurisdiction } },
        { ...institution, countyGeoid: null },
      ),
    ).toBeNull();
  });
});
