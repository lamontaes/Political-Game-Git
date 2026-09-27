/**
 * Compile the bounded 2026 civic election calendar from locked publisher pages.
 *
 * The source pages give chamber totals and 2026 seats up, not every district
 * cohort or every other statewide office. Unknowns stay null in the corpus.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  US_STATE_NAMES,
  US_TERRITORY_GOVERNED_NAMES,
} from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { SENATE_CLASSES_BY_STATE } from "../../src/simulation/living-world/congress-seats";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = "data/source/civic-calendar";
const RETRIEVED_DATE = "2026-09-27";

const SOURCES = [
  [
    "ncsl-2026-legislative-races",
    "ncsl-2026-legislative-races.html",
    "National Conference of State Legislatures",
    "https://www.ncsl.org/elections-and-campaigns/2026-legislative-races-by-state-and-chamber",
  ],
  [
    "ncsl-2026-primary-dates",
    "ncsl-2026-primary-dates.html",
    "National Conference of State Legislatures",
    "https://www.ncsl.org/elections-and-campaigns/2026-state-primary-election-dates",
  ],
  [
    "ncsl-primary-types",
    "ncsl-primary-types.html",
    "National Conference of State Legislatures",
    "https://www.ncsl.org/elections-and-campaigns/state-primary-election-types",
  ],
  [
    "nga-governor-elections",
    "nga-2026-governors.html",
    "National Governors Association",
    "https://www.nga.org/governors/elections/",
  ],
  [
    "dc-2026-elections",
    "dc-2026-elections.html",
    "District of Columbia Board of Elections",
    "https://www.dcboe.org/elections/2026-elections",
  ],
  [
    "dc-election-definitions",
    "dc-election-definitions.html",
    "District of Columbia Board of Elections",
    "https://www.dcboe.org/faqs/election-definitions",
  ],
  [
    "dc-governance",
    "dc-governance.html",
    "District of Columbia Statehood Office",
    "https://statehood.dc.gov/page/dc-governance",
  ],
  [
    "house-delegate-terms",
    "house-delegate-terms.html",
    "Clerk of the U.S. House of Representatives",
    "https://clerk.house.gov/Help/ViewMemberFAQs",
  ],
  [
    "ne-legislature-election-statute",
    "nebraska-legislature-election-statute.html",
    "Nebraska Legislature",
    "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
  ],
  [
    "ks-sos-2026-candidates",
    "ks-sos-2026-candidate-filing.html",
    "Kansas Secretary of State",
    "https://sos.ks.gov/media/press-releases/2026/06-01-26-candidate-filing-deadline-closes.html",
  ],
  [
    "ks-election-statute-25-101",
    "ks-election-statute-25-101.html",
    "Kansas Legislature",
    "https://www.kslegislature.gov/b2025_26/laws/025_000_0000_chapter/025_001_0000_article/025_001_0001_section/025_001_0001_k/",
  ],
] as const;

type SourceId = (typeof SOURCES)[number][0];
type Chamber = {
  chamberKey: "upper" | "lower" | "unicameral" | "council";
  officialName: string | null;
  memberTitle: string | null;
  seatCount: number;
  termYears: 2 | 4;
  seatsUpIn2026: number;
  districtsUpIn2026: "even-numbered" | null;
  sourceId: SourceId;
  sourceLocator: string;
  officialNameSource: string | null;
};
type Jurisdiction = {
  usps: string;
  name: string;
  kind: "state" | "district" | "territory";
  executive: {
    office: "governor" | "mayor";
    referenceElectionYear: number;
    regularTermYears: 2 | 4;
    onBallot2026: boolean;
    sourceId: SourceId;
  };
  lieutenantGovernorElection: {
    referenceElectionYear: 2026;
    regularTermYears: 4;
    onBallot2026: true;
    sourceIds: readonly SourceId[];
  } | null;
  otherElectedStatewideOffices:
    | readonly {
        office: string;
        referenceElectionYear: 2026;
        regularTermYears: 4;
        onBallot2026: true;
        sourceIds: readonly SourceId[];
      }[]
    | null;
  specialLegislativeElections2026:
    | readonly {
        chamberKey: "upper";
        districtNumbers: readonly number[];
        sourceId: SourceId;
      }[]
    | null;
  legislature: { chambers: Chamber[] };
  primary2026: {
    nominationSystem:
      | "partisan"
      | "top-two"
      | "top-four"
      | "all-comers"
      | "mixed-nonpartisan-legislature"
      | null;
    voterAccess: string | null;
    stateOfficeDate: string | null;
    congressionalDate: string | null;
    exceptions: readonly { office: string; date: string; note: string }[];
    sourceIds: readonly SourceId[];
  };
  federalSenateClasses: readonly (1 | 2 | 3)[] | null;
  federalHouseDelegateTermYears: 2 | 4 | null;
};

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function json(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

function requireMatch(value: boolean, message: string): void {
  if (!value) throw new Error(`civic-calendar source mismatch: ${message}`);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
}

function plainHtml(value: string): string {
  return decodeHtml(
    value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function tableAt(html: string, marker: string): string {
  const at = html.indexOf(marker);
  requireMatch(at >= 0, `missing table marker ${marker}`);
  const previousStart = html.lastIndexOf("<table", at);
  const previousEnd = html.lastIndexOf("</table>", at);
  const start =
    previousStart > previousEnd ? previousStart : html.indexOf("<table", at);
  const end = html.indexOf("</table>", Math.max(at, start));
  requireMatch(start >= 0 && end > at, `missing table around ${marker}`);
  return html.slice(start, end + "</table>".length);
}

function rows(table: string): string[][] {
  return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1]!.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(
      (cell) => plainHtml(cell[1]!),
    ),
  );
}

function sourceBytes(root: string, filename: string): Buffer {
  return readFileSync(resolve(root, ".source-cache/civic-calendar", filename));
}

function sourceText(root: string, filename: string): string {
  return sourceBytes(root, filename).toString("utf8");
}

function sourceLock(root: string) {
  return {
    artifacts: SOURCES.map(([artifactId, filename, provider, url]) => {
      const bytes = sourceBytes(root, filename);
      return {
        artifactId,
        localPath: null,
        cachePath: `.source-cache/civic-calendar/${filename}`,
        mediaType: "text/html",
        provider,
        publisher: {
          documentationUrl: url,
          releaseDate: null,
          schemaVersion: null,
          statedVintage: null,
        },
        retrieval: {
          method: "direct-GET",
          url,
          retrievedDate: RETRIEVED_DATE,
          httpStatus: 200,
          responseBytes: bytes.length,
        },
        bytes: { length: bytes.length, sha256: sha256(bytes) },
        rights: {
          status: "not-assessed",
          declaredLicense: null,
          attributionRequired: null,
          redistribution:
            provider === "National Conference of State Legislatures"
              ? "permission-required-by-publisher-terms"
              : "not-assessed",
          termsUrl:
            provider === "National Conference of State Legislatures"
              ? "https://www.ncsl.org/terms-of-use"
              : null,
        },
        storage: "cached-not-committed",
      };
    }),
  };
}

function chamberRows(root: string) {
  const html = sourceText(root, "ncsl-2026-legislative-races.html");
  const state = rows(
    tableAt(html, "<caption>2026 Legislative Races</caption>"),
  ).filter(
    (row) => row.length === 7 && row[0] !== "State" && row[0] !== "Totals",
  );
  const district = rows(
    tableAt(html, "<caption>2026 Territory Legislative Seats Up</caption>"),
  ).filter((row) => row.length === 7 && row[0] !== "Territory");
  requireMatch(
    state.length === 50,
    `NCSL state legislature row count ${state.length}`,
  );
  requireMatch(
    district.length === 6,
    `NCSL district/territory row count ${district.length}`,
  );
  return { state, district };
}

function chamberFromCells(
  cells: string[],
  kind: "state" | "district" | "territory",
  existing: Map<
    string,
    { upper?: string; lower?: string; unicameral?: string }
  >,
): Chamber[] {
  const [
    name,
    senateTerm,
    senateSeats,
    senateUp,
    houseTerm,
    houseSeats,
    houseUp,
  ] = cells;
  const sourceLocator = `NCSL 2026 races table: ${name}`;
  const usps = uspsForName(name!);
  const knownNames = existing.get(usps);
  const result: Chamber[] = [];
  const upperKey =
    usps === "DC"
      ? "council"
      : ["NE", "GU", "VI"].includes(usps)
        ? "unicameral"
        : "upper";
  const firstSeats = Number(senateSeats);
  const firstUp = Number(senateUp);
  const firstTerm = Number.parseInt(senateTerm!, 10);
  requireMatch(
    Number.isInteger(firstSeats) &&
      Number.isInteger(firstUp) &&
      [2, 4].includes(firstTerm),
    `invalid first chamber: ${name}`,
  );
  result.push({
    chamberKey: upperKey,
    officialName:
      usps === "DC"
        ? "Council of the District of Columbia"
        : (knownNames?.[upperKey === "upper" ? "upper" : "unicameral"] ?? null),
    memberTitle: null,
    seatCount: firstSeats,
    termYears: firstTerm as 2 | 4,
    seatsUpIn2026: firstUp,
    districtsUpIn2026: usps === "NE" ? "even-numbered" : null,
    sourceId: "ncsl-2026-legislative-races",
    sourceLocator,
    officialNameSource:
      usps === "DC"
        ? "dc-governance"
        : knownNames?.[upperKey === "upper" ? "upper" : "unicameral"]
          ? "data/source/state-legislatures/corpus.json"
          : null,
  });
  if (houseSeats !== "N/A" && houseSeats !== "Unicameral") {
    const lowerSeats = Number(houseSeats);
    const lowerUp = Number(houseUp);
    const lowerTerm = Number.parseInt(houseTerm!, 10);
    requireMatch(
      Number.isInteger(lowerSeats) &&
        Number.isInteger(lowerUp) &&
        [2, 4].includes(lowerTerm),
      `invalid lower chamber: ${name}`,
    );
    result.push({
      chamberKey: "lower",
      officialName: knownNames?.lower ?? null,
      memberTitle: null,
      seatCount: lowerSeats,
      termYears: lowerTerm as 2 | 4,
      seatsUpIn2026: lowerUp,
      districtsUpIn2026: null,
      sourceId: "ncsl-2026-legislative-races",
      sourceLocator,
      officialNameSource: knownNames?.lower
        ? "data/source/state-legislatures/corpus.json"
        : null,
    });
  }
  requireMatch(
    kind !== "state" || usps !== "NE" || result.length === 1,
    "Nebraska must be unicameral",
  );
  return result;
}

function uspsForName(name: string): string {
  const normalized = name
    .replace(/^the /i, "")
    .replace(/^U\.S\. /i, "")
    .toLowerCase();
  if (normalized === "district of columbia") return "DC";
  if (normalized === "virgin islands") return "VI";
  if (normalized === "northern mariana islands") return "MP";
  const states = Object.entries(US_STATE_NAMES).find(
    ([, label]) => label.toLowerCase() === normalized,
  );
  if (states) return states[0];
  const territories = Object.entries(US_TERRITORY_GOVERNED_NAMES).find(
    ([, label]) =>
      label
        .replace(/^the /, "")
        .replace(/^U\.S\. /, "")
        .toLowerCase() === normalized,
  );
  if (territories) return territories[0];
  throw new Error(`Unknown jurisdiction name: ${name}`);
}

function existingChamberNames(
  root: string,
): Map<string, { upper?: string; lower?: string; unicameral?: string }> {
  const records = JSON.parse(
    readFileSync(
      resolve(root, "data/source/state-legislatures/corpus.json"),
      "utf8",
    ),
  ) as {
    stateUsps: string;
    chambers: { chamberKey: string; name: { state: string; value?: string } }[];
  }[];
  return new Map(
    records.map((record) => {
      const names: { upper?: string; lower?: string; unicameral?: string } = {};
      for (const chamber of record.chambers) {
        if (chamber.name.state !== "KNOWN" || !chamber.name.value) continue;
        const key =
          chamber.chamberKey === "senate"
            ? "upper"
            : chamber.chamberKey === "legislature"
              ? "unicameral"
              : "lower";
        names[key] = chamber.name.value;
      }
      return [record.stateUsps, names];
    }),
  );
}

function governorCycles(root: string): Map<
  string,
  {
    referenceElectionYear: number;
    regularTermYears: 2 | 4;
    onBallot2026: boolean;
  }
> {
  const html = sourceText(root, "nga-2026-governors.html");
  const markers = [
    ...html.matchAll(
      /<div data-original-id="US-([A-Z]{2})"[^>]*data-content-index="(\d+)"[^>]*class="igm-map-content"[^>]*>/g,
    ),
  ];
  const groups: { usps: string; termYears: 2 | 4 }[][] = [[]];
  for (const [index, marker] of markers.entries()) {
    const rank = Number(marker[2]);
    if (rank === 0 && groups.at(-1)!.length > 0) groups.push([]);
    const snippet = html.slice(
      marker.index,
      markers[index + 1]?.index ?? html.length,
    );
    const termText = plainHtml(snippet).match(
      /Length of Regular Terms:\s*(2|4) years/i,
    );
    requireMatch(Boolean(termText), `NGA term missing for ${marker[1]}`);
    groups
      .at(-1)!
      .push({ usps: marker[1]!, termYears: Number(termText![1]) as 2 | 4 });
  }
  requireMatch(
    groups[0]?.length === 39 &&
      groups[1]?.length === 13 &&
      groups[2]?.length === 3,
    `NGA 2026/2024/2023 map sizes ${groups.map((group) => group.length)}`,
  );
  const result = new Map<
    string,
    {
      referenceElectionYear: number;
      regularTermYears: 2 | 4;
      onBallot2026: boolean;
    }
  >();
  for (const [groupIndex, year] of [2026, 2024, 2023].entries()) {
    for (const row of groups[groupIndex]!) {
      if (!result.has(row.usps))
        result.set(row.usps, {
          referenceElectionYear: year,
          regularTermYears: row.termYears,
          onBallot2026: year === 2026,
        });
    }
  }
  // The NGA's 2025 section names these two races and lists four-year terms.
  const oddSection = html.slice(
    html.indexOf("2025 Elections"),
    html.indexOf("2024 Elections"),
  );
  requireMatch(
    /New Jersey/.test(oddSection) && /Virginia/.test(oddSection),
    "NGA 2025 governors",
  );
  result.set("NJ", {
    referenceElectionYear: 2025,
    regularTermYears: 4,
    onBallot2026: false,
  });
  result.set("VA", {
    referenceElectionYear: 2025,
    regularTermYears: 4,
    onBallot2026: false,
  });
  requireMatch(
    result.size === 55,
    `NGA governor jurisdiction coverage ${result.size}`,
  );
  return result;
}

function primaryTypes(root: string): Map<string, string> {
  const html = sourceText(root, "ncsl-primary-types.html");
  const table = tableAt(html, '<a id="state1"></a>State Primary Types');
  const entries = rows(table).filter(
    (row) => row.length === 3 && row[0] !== "State",
  );
  requireMatch(
    entries.length === 50,
    `NCSL primary type rows ${entries.length}`,
  );
  return new Map(
    entries.map((row) => [uspsForName(row[0]!), row[2]!.replace(/\*+$/, "")]),
  );
}

function isoDate(value: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(2026)$/);
  requireMatch(Boolean(match), `invalid 2026 primary date: ${value}`);
  return `${match![3]}-${match![1]}-${match![2]}`;
}

function primaryDates(root: string): Map<
  string,
  {
    stateOfficeDate: string | null;
    congressionalDate: string | null;
    exceptions: { office: string; date: string; note: string }[];
  }
> {
  const html = sourceText(root, "ncsl-2026-primary-dates.html");
  const entries = rows(
    tableAt(html, "<caption>2026 State Primary Dates</caption>"),
  ).filter((row) => row.length === 4 && row[0] !== "State");
  const result = new Map<
    string,
    {
      stateOfficeDate: string | null;
      congressionalDate: string | null;
      exceptions: { office: string; date: string; note: string }[];
    }
  >();
  for (const row of entries) {
    const name = row[0]!.replace(/\s*\(.*$/, "");
    const usps = uspsForName(name);
    const date = isoDate(row[1]!);
    const current = result.get(usps) ?? {
      stateOfficeDate: date,
      congressionalDate: date,
      exceptions: [],
    };
    if (usps === "AL" && row[0]!.includes("certain U.S. House")) {
      current.exceptions.push({
        office: "U.S. House districts 1, 2, 6 and 7",
        date,
        note: "Governor-ordered 2026 postponement recorded by NCSL.",
      });
    } else if (usps === "LA") {
      current.stateOfficeDate = null;
      if (row[0]!.includes("U.S. House")) {
        current.exceptions.push({
          office: "U.S. House",
          date,
          note: "All-comers primary; December 12, 2026 general election recorded by NCSL.",
        });
      } else {
        current.congressionalDate = date;
      }
    } else {
      current.congressionalDate = date;
      current.stateOfficeDate = ["MS", "NJ", "VA"].includes(usps) ? null : date;
    }
    result.set(usps, current);
  }
  requireMatch(
    result.size === 50,
    `NCSL primary date state coverage ${result.size}`,
  );
  return result;
}

function nominationSystem(
  usps: string,
  access: string | null,
): Jurisdiction["primary2026"]["nominationSystem"] {
  if (!access) return null;
  if (usps === "NE") return "mixed-nonpartisan-legislature";
  if (/Top-Four/i.test(access)) return "top-four";
  if (/Top-Two/i.test(access)) return "top-two";
  if (/All-Comers/i.test(access)) return "all-comers";
  return "partisan";
}

export function compileCivicCalendar(root = ROOT) {
  const { state, district } = chamberRows(root);
  const names = existingChamberNames(root);
  const governors = governorCycles(root);
  const types = primaryTypes(root);
  const dates = primaryDates(root);
  const chamberByUsps = new Map<string, Chamber[]>();
  for (const cells of state)
    chamberByUsps.set(
      uspsForName(cells[0]!),
      chamberFromCells(cells, "state", names),
    );
  for (const cells of district)
    chamberByUsps.set(
      uspsForName(cells[0]!),
      chamberFromCells(
        cells,
        cells[0] === "District of Columbia" ? "district" : "territory",
        names,
      ),
    );
  const dcElections = sourceText(root, "dc-2026-elections.html");
  const dcDefinitions = sourceText(root, "dc-election-definitions.html");
  const dcGovernance = sourceText(root, "dc-governance.html");
  const houseFaq = sourceText(root, "house-delegate-terms.html");
  const neStatute = sourceText(
    root,
    "nebraska-legislature-election-statute.html",
  );
  const ksSos = plainHtml(
    sourceText(root, "ks-sos-2026-candidate-filing.html"),
  );
  const ksStatute = plainHtml(
    sourceText(root, "ks-election-statute-25-101.html"),
  );
  requireMatch(
    /PRIMARY ELECTION - June 16, 2026/i.test(plainHtml(dcElections)),
    "DC 2026 primary date",
  );
  requireMatch(
    /only voters registered with one of these parties may vote in their party.s election/i.test(
      plainHtml(dcDefinitions),
    ),
    "DC closed partisan primary",
  );
  requireMatch(
    /mayor is elected to a 4-year term.*mid-term elections/i.test(
      plainHtml(dcGovernance),
    ),
    "DC mayor cycle",
  );
  requireMatch(
    /Delegates and Representatives serve a two-year term.*Resident Commissioner serves a four-year term/i.test(
      plainHtml(houseFaq),
    ),
    "House delegate terms",
  );
  requireMatch(
    /even-numbered districts.*1994.*each four years.*odd-numbered districts.*1996.*each four years/is.test(
      plainHtml(neStatute),
    ),
    "Nebraska district cohorts",
  );
  requireMatch(
    /Governor and Lieutenant Governor Attorney General Secretary of State State Treasurer Commissioner of Insurance Kansas Senate – Districts 24 and 25 All seats in the Kansas House of Representatives/.test(
      ksSos,
    ),
    "Kansas Secretary of State 2026 office and special-district list",
  );
  requireMatch(
    /at each alternate election.*governor, lieutenant governor, secretary of state, attorney general, state treasurer and state commissioner of insurance/i.test(
      ksStatute,
    ),
    "Kansas statute regular statewide office cycle",
  );

  const stateKeys = Object.keys(US_STATE_NAMES).sort();
  const territoryKeys = Object.keys(US_TERRITORY_GOVERNED_NAMES).sort();
  const keys = [...stateKeys, "DC", ...territoryKeys];
  const jurisdictions: Jurisdiction[] = keys.map((usps) => {
    const isState = stateKeys.includes(usps);
    const governor = governors.get(usps);
    requireMatch(
      usps === "DC" || Boolean(governor),
      `missing governor cycle for ${usps}`,
    );
    const date = dates.get(usps);
    const voterAccess = types.get(usps) ?? null;
    const isOddState = ["LA", "MS", "NJ", "VA"].includes(usps);
    const primary = isState
      ? {
          nominationSystem: nominationSystem(usps, voterAccess),
          voterAccess,
          stateOfficeDate: isOddState ? null : date!.stateOfficeDate,
          congressionalDate: date!.congressionalDate,
          exceptions: date!.exceptions,
          sourceIds: [
            "ncsl-2026-primary-dates",
            "ncsl-primary-types",
          ] as SourceId[],
        }
      : usps === "DC"
        ? {
            nominationSystem: "partisan" as const,
            voterAccess: "closed",
            stateOfficeDate: "2026-06-16",
            congressionalDate: "2026-06-16",
            exceptions: [],
            sourceIds: [
              "dc-2026-elections",
              "dc-election-definitions",
            ] as SourceId[],
          }
        : {
            nominationSystem: null,
            voterAccess: null,
            stateOfficeDate: null,
            congressionalDate: null,
            exceptions: [],
            sourceIds: [] as SourceId[],
          };
    return {
      usps,
      name:
        usps === "DC"
          ? "District of Columbia"
          : isState
            ? US_STATE_NAMES[usps as keyof typeof US_STATE_NAMES]
            : US_TERRITORY_GOVERNED_NAMES[
                usps as keyof typeof US_TERRITORY_GOVERNED_NAMES
              ].replace(/^the /, ""),
      kind: isState ? "state" : usps === "DC" ? "district" : "territory",
      executive:
        usps === "DC"
          ? {
              office: "mayor",
              referenceElectionYear: 2026,
              regularTermYears: 4,
              onBallot2026: true,
              sourceId: "dc-governance",
            }
          : {
              office: "governor",
              ...governor!,
              sourceId: "nga-governor-elections",
            },
      lieutenantGovernorElection:
        usps === "KS"
          ? {
              referenceElectionYear: 2026,
              regularTermYears: 4,
              onBallot2026: true,
              sourceIds: [
                "ks-sos-2026-candidates",
                "ks-election-statute-25-101",
              ],
            }
          : null,
      otherElectedStatewideOffices:
        usps === "KS"
          ? [
              "Attorney General",
              "Secretary of State",
              "State Treasurer",
              "Commissioner of Insurance",
            ].map((office) => ({
              office,
              referenceElectionYear: 2026 as const,
              regularTermYears: 4 as const,
              onBallot2026: true as const,
              sourceIds: [
                "ks-sos-2026-candidates",
                "ks-election-statute-25-101",
              ] as SourceId[],
            }))
          : null,
      specialLegislativeElections2026:
        usps === "KS"
          ? [
              {
                chamberKey: "upper",
                districtNumbers: [24, 25],
                sourceId: "ks-sos-2026-candidates",
              },
            ]
          : null,
      legislature: { chambers: chamberByUsps.get(usps) ?? [] },
      primary2026: primary,
      federalSenateClasses: isState
        ? [
            ...SENATE_CLASSES_BY_STATE[
              usps as keyof typeof SENATE_CLASSES_BY_STATE
            ],
          ].sort()
        : null,
      federalHouseDelegateTermYears: isState ? 2 : usps === "PR" ? 4 : 2,
    };
  });
  requireMatch(
    jurisdictions.length === 56 &&
      jurisdictions.every((j) => j.legislature.chambers.length > 0),
    "56 jurisdiction legislature coverage",
  );
  const totalSeatsUp = jurisdictions
    .filter((j) => j.kind === "state")
    .flatMap((j) => j.legislature.chambers)
    .reduce((sum, chamber) => sum + chamber.seatsUpIn2026, 0);
  requireMatch(
    totalSeatsUp === 6139,
    `NCSL state seats up total ${totalSeatsUp}`,
  );
  const gaps = [
    {
      field: "lieutenantGovernorElection",
      jurisdictions: keys.filter((key) => key !== "KS"),
      reason:
        "The bounded NGA election page does not establish election method and timing for each jurisdiction's lieutenant-governor-equivalent office.",
    },
    {
      field: "otherElectedStatewideOffices",
      jurisdictions: stateKeys.filter((key) => key !== "KS"),
      reason:
        "Office-by-office statewide ballot timing is not established by the locked item 1 sources.",
    },
    {
      field: "legislature.memberTitle",
      jurisdictions: keys,
      reason:
        "The NCSL chamber table does not establish each chamber's member title.",
    },
    {
      field: "legislature.districtsUpIn2026",
      jurisdictions: keys.filter((key) => key !== "NE"),
      reason:
        "NCSL provides counts, not district identities; Nebraska's official statute alone establishes its even-numbered 2026 cohort.",
    },
    {
      field: "specialLegislativeElections2026",
      jurisdictions: keys.filter((key) => key !== "KS"),
      reason:
        "Only Kansas's identified 2026 special Senate districts were checked against an official election-office list; null elsewhere does not mean no special election.",
    },
    {
      field: "primary2026",
      jurisdictions: territoryKeys,
      reason:
        "The NCSL primary tables cover states; territorial official primary calendars are not yet locked.",
    },
  ];
  const corpus = {
    schema: "civic-calendar-v1",
    asOfDate: RETRIEVED_DATE,
    scope:
      "Regular elections and 2026 primary dates, plus specifically sourced Kansas special Senate districts. Other special elections and future state ballot orders are not asserted.",
    federal: {
      house: {
        regularElectionYears: [2026, 2028, 2030],
        termYears: 2,
        seatSource: "src/simulation/living-world/congress-seats.ts",
      },
      senate: {
        electionYearByClass: { "1": 2030, "2": 2026, "3": 2028 },
        termYears: 6,
        classesByStateSource: "src/simulation/living-world/congress-seats.ts",
      },
      delegates: {
        termYears: 2,
        jurisdictions: ["AS", "DC", "GU", "MP", "VI"],
        sourceId: "house-delegate-terms",
      },
      residentCommissioner: {
        termYears: 4,
        jurisdiction: "PR",
        sourceId: "house-delegate-terms",
      },
    },
    jurisdictions,
    gaps,
  };
  const corpusText = json(corpus);
  const lock = sourceLock(root);
  const manifest = {
    corpusId: "civic-calendar",
    asOf: RETRIEVED_DATE,
    compiler: { name: "compile-civic-calendar", version: "1.0.0" },
    canonicalSha256: sha256(corpusText),
    inputClass: "research-only",
    coverage: {
      isCompleteUniverse: true,
      universeDescription:
        "Fifty states, the District of Columbia and five inhabited territories; individual fields remain null where the locked sources do not establish them.",
      jurisdictions: jurisdictions.length,
      stateLegislativeSeatsUp2026: totalSeatsUp,
      governorElections2026: jurisdictions.filter(
        (j) => j.executive.office === "governor" && j.executive.onBallot2026,
      ).length,
      gapKinds: gaps.length,
    },
    inputs: lock.artifacts.map((artifact) => ({
      artifactId: artifact.artifactId,
      sha256: artifact.bytes.sha256,
    })),
    reusedRepositorySources: [
      "src/simulation/living-world/congress-seats.ts",
      "data/source/state-legislatures/corpus.json",
    ],
  };
  return { corpus, corpusText, lock, manifest };
}

export function writeCivicCalendar(root = ROOT, check = false): void {
  if (
    check &&
    !SOURCES.every(([, filename]) =>
      existsSync(resolve(root, ".source-cache/civic-calendar", filename)),
    )
  ) {
    verifyCommittedCivicCalendar(root);
    return;
  }
  const { corpusText, lock, manifest } = compileCivicCalendar(root);
  const outputs = [
    ["corpus.json", corpusText],
    ["artifact-lock.json", json(lock)],
    ["corpus-manifest.json", json(manifest)],
  ] as const;
  for (const [filename, expected] of outputs) {
    const path = resolve(root, DATA, filename);
    if (check) {
      requireMatch(
        readFileSync(path, "utf8") === expected,
        `stale ${filename}`,
      );
    } else {
      writeFileSync(path, expected);
    }
  }
}

/** Verify portable corpus/lock integrity when publisher captures cannot be redistributed. */
export function verifyCommittedCivicCalendar(root = ROOT): void {
  const corpusText = readFileSync(resolve(root, DATA, "corpus.json"), "utf8");
  const corpus = JSON.parse(corpusText) as ReturnType<
    typeof compileCivicCalendar
  >["corpus"];
  const lock = JSON.parse(
    readFileSync(resolve(root, DATA, "artifact-lock.json"), "utf8"),
  ) as ReturnType<typeof sourceLock>;
  const manifest = JSON.parse(
    readFileSync(resolve(root, DATA, "corpus-manifest.json"), "utf8"),
  ) as ReturnType<typeof compileCivicCalendar>["manifest"];
  requireMatch(
    sha256(corpusText) === manifest.canonicalSha256,
    "committed corpus digest",
  );
  requireMatch(
    corpus.jurisdictions.length === 56,
    "committed jurisdiction count",
  );
  const stateSeatsUp = corpus.jurisdictions
    .filter((j) => j.kind === "state")
    .flatMap((j) => j.legislature.chambers)
    .reduce((sum, chamber) => sum + chamber.seatsUpIn2026, 0);
  requireMatch(
    stateSeatsUp === 6139 &&
      stateSeatsUp === manifest.coverage.stateLegislativeSeatsUp2026,
    "committed seat total",
  );
  requireMatch(
    lock.artifacts.length === SOURCES.length &&
      lock.artifacts.every(
        (artifact) =>
          artifact.localPath === null &&
          artifact.storage === "cached-not-committed",
      ),
    "committed cache-only lock",
  );
  requireMatch(
    lock.artifacts.every(
      (artifact, index) =>
        artifact.bytes.sha256 === manifest.inputs[index]?.sha256,
    ),
    "committed input digests",
  );
  requireMatch(
    manifest.inputClass === "research-only",
    "research-only admission status",
  );
}

if (process.argv[1]?.endsWith("compile-civic-calendar.ts")) {
  writeCivicCalendar(ROOT, process.argv.includes("--check"));
  console.log(
    "civic-calendar: 56 jurisdictions compiled; 2026 seat totals checked against NCSL.",
  );
}
