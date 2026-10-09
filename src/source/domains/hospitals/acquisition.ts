import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

/** CMS Hospital General Information: every Medicare-certified hospital, one row each. */
export const HOSPITAL_GENERAL_ARTIFACT = "cms-hospital-general-information";
/** CMS Provider of Services file, 2026 Q2 quarter: certified beds and county FIPS by CCN. */
export const HOSPITAL_POS_ARTIFACT = "cms-provider-of-services-2026-q2";
/** The committed slice of it: the rows of the hospitals in the General Information file. */
export const HOSPITAL_POS_SLICE_ARTIFACT =
  "cms-provider-of-services-2026-q2-hospital-slice";
export const HOSPITAL_POS_SLICE_PREDICATE =
  "The header row of the Provider of Services file followed by every row whose provider category is 01 (hospital) and whose provider number is a Facility ID in the Hospital General Information artifact, in published file order, each row byte-for-byte, with a trailing newline.";
/** The Hospital General Information release the rows are dated by. */
export const HOSPITALS_AS_OF = "2026-07-22";

const RIGHTS = {
  status: "public-domain-us-government",
  declaredLicense:
    "Centers for Medicare & Medicaid Services open data; provider-level facility facts, no patient records.",
  attributionRequired: false,
} as const;

const generalInformation: AcquisitionRequest = {
  artifactId: HOSPITAL_GENERAL_ARTIFACT,
  provider: "Centers for Medicare & Medicaid Services, Provider Data Catalog",
  url: "https://data.cms.gov/provider-data/sites/default/files/resources/893c372430d9d71a1c52737d01239d47_1785189955/Hospital_General_Information.csv",
  method: "GET",
  mediaType: "text/csv",
  publisher: {
    statedVintage: "Hospital General Information, modified 2026-07-22",
    releaseDate: HOSPITALS_AS_OF,
    schemaVersion: null,
    documentationUrl: "https://data.cms.gov/provider-data/dataset/xubh-q36u",
  },
  rights: RIGHTS,
  storage: "committed",
  localPath: "data/source/hospitals/raw/Hospital_General_Information.csv",
};

/** 30 MB and 44,707 rows across every provider category: cached, not committed. */
const providerOfServices: AcquisitionRequest = {
  artifactId: HOSPITAL_POS_ARTIFACT,
  provider: "Centers for Medicare & Medicaid Services, Data.CMS.gov",
  url: "https://data.cms.gov/sites/default/files/2026-07/7780b4e3-4c4b-4811-8884-65ca23b7a4e8/Hospital_and_other.DATA.Q2_2026.csv",
  method: "GET",
  mediaType: "text/csv",
  publisher: {
    statedVintage:
      "Provider of Services File, Quality Improvement and Evaluation System, 2026-04-01 to 2026-06-30",
    releaseDate: null,
    schemaVersion: null,
    documentationUrl:
      "https://data.cms.gov/provider-characteristics/hospitals-and-other-facilities/provider-of-services-file-quality-improvement-and-evaluation-system",
  },
  rights: RIGHTS,
  storage: "cached-not-committed",
  localPath: null,
  cachePath: `.source-cache/hospitals/${HOSPITAL_POS_ARTIFACT}.csv`,
};

/**
 * Keep the header and the hospital rows whose provider number is a General
 * Information Facility ID. Every other provider category stays in the cache.
 */
export function cutHospitalRows(
  parentBytes: Buffer,
  acquired: ReadonlyMap<string, Buffer>,
): Buffer {
  const general = acquired.get(HOSPITAL_GENERAL_ARTIFACT);
  if (!general)
    throw new Error("The hospital slice needs the General Information file.");
  const facilityIds = new Set(
    general
      .toString("utf8")
      .split(/\r?\n/)
      .slice(1)
      .filter((line) => line !== "")
      .map((line) => splitSimpleCsv(line)[0] ?? ""),
  );
  const text = parentBytes.toString("latin1");
  const lines = text.split("\n");
  const header = lines[0] ?? "";
  const names = header
    .replace(/\r$/, "")
    .split(",")
    .map((n) => n.replace(/^"|"$/g, ""));
  const category = names.indexOf("PRVDR_CTGRY_CD");
  const number = names.indexOf("PRVDR_NUM");
  if (category < 0 || number < 0)
    throw new Error(
      "The Provider of Services header lacks PRVDR_CTGRY_CD or PRVDR_NUM.",
    );
  const kept = lines.slice(1).filter((line) => {
    if (line === "") return false;
    const fields = splitSimpleCsv(line.replace(/\r$/, ""));
    return fields[category] === "01" && facilityIds.has(fields[number] ?? "");
  });
  return Buffer.from(`${[header, ...kept].join("\n")}\n`, "latin1");
}

function splitSimpleCsv(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = false;
      } else current += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      fields.push(current);
      current = "";
    } else current += c;
  }
  fields.push(current);
  return fields;
}

const posSlice: AcquisitionRequest = {
  ...providerOfServices,
  artifactId: HOSPITAL_POS_SLICE_ARTIFACT,
  storage: "derived-qa-slice",
  cachePath: undefined,
  localPath:
    "data/source/hospitals/raw/Provider_of_Services_2026_Q2.hospital-slice.csv",
  sliceOf: {
    parentArtifactId: HOSPITAL_POS_ARTIFACT,
    selectionPredicate: HOSPITAL_POS_SLICE_PREDICATE,
    cut: cutHospitalRows,
  },
};

export const hospitalsAcquisition: AcquisitionPlan = {
  domain: "hospitals",
  requests: [generalInformation, providerOfServices, posSlice],
};
