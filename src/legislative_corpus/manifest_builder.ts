import type {
  ChamberStructure,
  JurisdictionClassification,
  JurisdictionCoverageSummary,
  NationalCoverageManifest
} from "./types.js";
import { computeSha256 } from "./provenance.js";

export interface JurisdictionRegistryItem {
  key: string;
  name: string;
  abbr: string;
  classification: JurisdictionClassification;
  chamberStructure: ChamberStructure;
  officialUrl: string;
  openStatesId: string;
  recentSessions: string[];
}

export const NATIONAL_JURISDICTIONS_REGISTRY: JurisdictionRegistryItem[] = [
  { key: "us_al", name: "Alabama", abbr: "AL", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legislature.state.al.us/", openStatesId: "ocd-jurisdiction/country:us/state:al/government", recentSessions: ["2021RS", "2022RS", "2023RS", "2024RS"] },
  { key: "us_ak", name: "Alaska", abbr: "AK", classification: "state", chamberStructure: "bicameral", officialUrl: "https://akleg.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ak/government", recentSessions: ["32nd", "33rd"] },
  { key: "us_az", name: "Arizona", abbr: "AZ", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.azleg.gov/", openStatesId: "ocd-jurisdiction/country:us/state:az/government", recentSessions: ["55th-1st-regular", "55th-2nd-regular", "56th-1st-regular"] },
  { key: "us_ar", name: "Arkansas", abbr: "AR", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.arkleg.state.ar.us/", openStatesId: "ocd-jurisdiction/country:us/state:ar/government", recentSessions: ["2021", "2023", "2024F"] },
  { key: "us_ca", name: "California", abbr: "CA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legislature.ca.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ca/government", recentSessions: ["2021-2022", "2023-2024"] },
  { key: "us_co", name: "Colorado", abbr: "CO", classification: "state", chamberStructure: "bicameral", officialUrl: "https://leg.colorado.gov/", openStatesId: "ocd-jurisdiction/country:us/state:co/government", recentSessions: ["2021A", "2022A", "2023A", "2024A"] },
  { key: "us_ct", name: "Connecticut", abbr: "CT", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.cga.ct.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ct/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_de", name: "Delaware", abbr: "DE", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legis.delaware.gov/", openStatesId: "ocd-jurisdiction/country:us/state:de/government", recentSessions: ["151st", "152nd"] },
  { key: "us_fl", name: "Florida", abbr: "FL", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.flsenate.gov/", openStatesId: "ocd-jurisdiction/country:us/state:fl/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_ga", name: "Georgia", abbr: "GA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legis.ga.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ga/government", recentSessions: ["2021_22", "2023_24"] },
  { key: "us_hi", name: "Hawaii", abbr: "HI", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.capitol.hawaii.gov/", openStatesId: "ocd-jurisdiction/country:us/state:hi/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_id", name: "Idaho", abbr: "ID", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legislature.idaho.gov/", openStatesId: "ocd-jurisdiction/country:us/state:id/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_il", name: "Illinois", abbr: "IL", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.ilga.gov/", openStatesId: "ocd-jurisdiction/country:us/state:il/government", recentSessions: ["102nd", "103rd"] },
  { key: "us_in", name: "Indiana", abbr: "IN", classification: "state", chamberStructure: "bicameral", officialUrl: "https://iga.in.gov/", openStatesId: "ocd-jurisdiction/country:us/state:in/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_ia", name: "Iowa", abbr: "IA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legis.iowa.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ia/government", recentSessions: ["89th-general-assembly", "90th-general-assembly"] },
  { key: "us_ks", name: "Kansas", abbr: "KS", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.kslegislature.org/", openStatesId: "ocd-jurisdiction/country:us/state:ks/government", recentSessions: ["2021-2022", "2023-2024"] },
  { key: "us_ky", name: "Kentucky", abbr: "KY", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legislature.ky.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ky/government", recentSessions: ["2021RS", "2021SS", "2022RS", "2023RS", "2024RS"] },
  { key: "us_la", name: "Louisiana", abbr: "LA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legis.la.gov/", openStatesId: "ocd-jurisdiction/country:us/state:la/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_me", name: "Maine", abbr: "ME", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legislature.maine.gov/", openStatesId: "ocd-jurisdiction/country:us/state:me/government", recentSessions: ["130th", "131st"] },
  { key: "us_md", name: "Maryland", abbr: "MD", classification: "state", chamberStructure: "bicameral", officialUrl: "https://mgaleg.maryland.gov/", openStatesId: "ocd-jurisdiction/country:us/state:md/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_ma", name: "Massachusetts", abbr: "MA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://malegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ma/government", recentSessions: ["192nd", "193rd"] },
  { key: "us_mi", name: "Michigan", abbr: "MI", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legislature.mi.gov/", openStatesId: "ocd-jurisdiction/country:us/state:mi/government", recentSessions: ["101st", "102nd"] },
  { key: "us_mn", name: "Minnesota", abbr: "MN", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.revisor.mn.gov/", openStatesId: "ocd-jurisdiction/country:us/state:mn/government", recentSessions: ["92nd", "93rd"] },
  { key: "us_ms", name: "Mississippi", abbr: "MS", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legislature.ms.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ms/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_mo", name: "Missouri", abbr: "MO", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.senate.mo.gov/", openStatesId: "ocd-jurisdiction/country:us/state:mo/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_mt", name: "Montana", abbr: "MT", classification: "state", chamberStructure: "bicameral", officialUrl: "https://leg.mt.gov/", openStatesId: "ocd-jurisdiction/country:us/state:mt/government", recentSessions: ["67th", "68th"] },
  { key: "us_ne", name: "Nebraska", abbr: "NE", classification: "state", chamberStructure: "nonpartisan_unicameral", officialUrl: "https://nebraskalegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ne/government", recentSessions: ["107th", "108th"] },
  { key: "us_nv", name: "Nevada", abbr: "NV", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.leg.state.nv.us/", openStatesId: "ocd-jurisdiction/country:us/state:nv/government", recentSessions: ["81st", "82nd"] },
  { key: "us_nh", name: "New Hampshire", abbr: "NH", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.gencourt.state.nh.us/", openStatesId: "ocd-jurisdiction/country:us/state:nh/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_nj", name: "New Jersey", abbr: "NJ", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.njleg.state.nj.us/", openStatesId: "ocd-jurisdiction/country:us/state:nj/government", recentSessions: ["219th", "220th", "221st"] },
  { key: "us_nm", name: "New Mexico", abbr: "NM", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.nmlegis.gov/", openStatesId: "ocd-jurisdiction/country:us/state:nm/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_ny", name: "New York", abbr: "NY", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.nysenate.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ny/government", recentSessions: ["2021-2022", "2023-2024"] },
  { key: "us_nc", name: "North Carolina", abbr: "NC", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.ncleg.gov/", openStatesId: "ocd-jurisdiction/country:us/state:nc/government", recentSessions: ["2021", "2023"] },
  { key: "us_nd", name: "North Dakota", abbr: "ND", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.ndlegis.gov/", openStatesId: "ocd-jurisdiction/country:us/state:nd/government", recentSessions: ["67th", "68th"] },
  { key: "us_oh", name: "Ohio", abbr: "OH", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legislature.ohio.gov/", openStatesId: "ocd-jurisdiction/country:us/state:oh/government", recentSessions: ["134th", "135th"] },
  { key: "us_ok", name: "Oklahoma", abbr: "OK", classification: "state", chamberStructure: "bicameral", officialUrl: "http://www.oklegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ok/government", recentSessions: ["58th", "59th"] },
  { key: "us_or", name: "Oregon", abbr: "OR", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.oregonlegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:or/government", recentSessions: ["2021-regular-session", "2022-regular-session", "2023-regular-session", "2024-regular-session"] },
  { key: "us_pa", name: "Pennsylvania", abbr: "PA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.legis.state.pa.us/", openStatesId: "ocd-jurisdiction/country:us/state:pa/government", recentSessions: ["2021-2022", "2023-2024"] },
  { key: "us_ri", name: "Rhode Island", abbr: "RI", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.rilegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ri/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_sc", name: "South Carolina", abbr: "SC", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.scstatehouse.gov/", openStatesId: "ocd-jurisdiction/country:us/state:sc/government", recentSessions: ["124th", "125th"] },
  { key: "us_sd", name: "South Dakota", abbr: "SD", classification: "state", chamberStructure: "bicameral", officialUrl: "https://sdlegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:sd/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_tn", name: "Tennessee", abbr: "TN", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.capitol.tn.gov/", openStatesId: "ocd-jurisdiction/country:us/state:tn/government", recentSessions: ["112th", "113th"] },
  { key: "us_tx", name: "Texas", abbr: "TX", classification: "state", chamberStructure: "bicameral", officialUrl: "https://capitol.texas.gov/", openStatesId: "ocd-jurisdiction/country:us/state:tx/government", recentSessions: ["87", "871", "872", "88", "881", "882", "883", "884"] },
  { key: "us_ut", name: "Utah", abbr: "UT", classification: "state", chamberStructure: "bicameral", officialUrl: "https://le.utah.gov/", openStatesId: "ocd-jurisdiction/country:us/state:ut/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_vt", name: "Vermont", abbr: "VT", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legislature.vermont.gov/", openStatesId: "ocd-jurisdiction/country:us/state:vt/government", recentSessions: ["2021-2022", "2023-2024"] },
  { key: "us_va", name: "Virginia", abbr: "VA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://virginiageneralassembly.gov/", openStatesId: "ocd-jurisdiction/country:us/state:va/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_wa", name: "Washington", abbr: "WA", classification: "state", chamberStructure: "bicameral", officialUrl: "https://leg.wa.gov/", openStatesId: "ocd-jurisdiction/country:us/state:wa/government", recentSessions: ["2021-22", "2023-24"] },
  { key: "us_wv", name: "West Virginia", abbr: "WV", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.wvlegislature.gov/", openStatesId: "ocd-jurisdiction/country:us/state:wv/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_wi", name: "Wisconsin", abbr: "WI", classification: "state", chamberStructure: "bicameral", officialUrl: "https://legis.wisconsin.gov/", openStatesId: "ocd-jurisdiction/country:us/state:wi/government", recentSessions: ["2021", "2023"] },
  { key: "us_wy", name: "Wyoming", abbr: "WY", classification: "state", chamberStructure: "bicameral", officialUrl: "https://www.wyoleg.gov/", openStatesId: "ocd-jurisdiction/country:us/state:wy/government", recentSessions: ["2021", "2022", "2023", "2024"] },
  { key: "us_dc", name: "District of Columbia", abbr: "DC", classification: "district", chamberStructure: "council", officialUrl: "https://dccouncil.gov/", openStatesId: "ocd-jurisdiction/country:us/district:dc/government", recentSessions: ["24", "25"] },
  { key: "us_pr", name: "Puerto Rico", abbr: "PR", classification: "territory", chamberStructure: "bicameral", officialUrl: "https://sutra.oslpr.org/", openStatesId: "ocd-jurisdiction/country:us/territory:pr/government", recentSessions: ["19", "2021-2024"] },
  { key: "us_fed", name: "United States Congress", abbr: "US", classification: "federal", chamberStructure: "bicameral", officialUrl: "https://www.congress.gov/", openStatesId: "ocd-jurisdiction/country:us/government", recentSessions: ["117", "118"] }
];

export interface ManifestSampleCounts {
  measures?: number;
  actions?: number;
  votes?: number;
}

export function buildNationalCoverageManifest(
  countsByJurisdiction: Record<string, ManifestSampleCounts> = {},
  timestamp: string = "2026-08-28T00:00:00Z"
): NationalCoverageManifest {
  const jurisdictions: Record<string, JurisdictionCoverageSummary> = {};

  let totalSessions = 0;
  let totalMeasures = 0;
  let totalActions = 0;
  let totalVotes = 0;

  for (const item of NATIONAL_JURISDICTIONS_REGISTRY) {
    const counts = countsByJurisdiction[item.key] || {};
    const measures = counts.measures ?? 0;
    const actions = counts.actions ?? 0;
    const votes = counts.votes ?? 0;

    totalSessions += item.recentSessions.length;
    totalMeasures += measures;
    totalActions += actions;
    totalVotes += votes;

    jurisdictions[item.key] = {
      sourceKey: item.key,
      name: item.name,
      classification: item.classification,
      chamberStructure: item.chamberStructure,
      officialWebsiteUrl: item.officialUrl,
      providerJurisdictionId: item.openStatesId,
      availableSessionsCount: item.recentSessions.length,
      recentSessions: [...item.recentSessions],
      totalMeasuresTracked: measures,
      totalActionsTracked: actions,
      totalVotesTracked: votes,
      lastRetrievedTimestamp: timestamp
    };
  }

  const manifestData: Omit<NationalCoverageManifest, "sha256"> = {
    manifestVersion: "1.0.0",
    generatedAt: timestamp,
    totalJurisdictions: NATIONAL_JURISDICTIONS_REGISTRY.length,
    totalSessionsIndexed: totalSessions,
    totalMeasuresSampled: totalMeasures,
    totalActionsSampled: totalActions,
    totalVotesSampled: totalVotes,
    jurisdictions,
    providers: {
      primary: {
        name: "Open States / Plural Open",
        documentationUrl: "https://docs.openstates.org/",
        bulkDataUrl: "https://open.pluralpolicy.com/data/"
      },
      secondary: {
        name: "LegiScan",
        documentationUrl: "https://legiscan.com/about",
        datasetsUrl: "https://legiscan.com/datasets"
      }
    }
  };

  const sha256 = computeSha256(manifestData);

  return {
    ...manifestData,
    sha256
  };
}
