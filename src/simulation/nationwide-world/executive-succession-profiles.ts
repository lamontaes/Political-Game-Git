/**
 * Source-backed executive vacancy rules. A missing or unverified rule is
 * represented as unknown; callers must not substitute a nationwide default.
 * Keys are canonical government jurisdiction keys, never runtime entity IDs.
 */
export type SuccessionSource = {
  readonly citation: string;
  readonly url: string;
  readonly pinpoint: string;
  readonly effectiveAsOf: string;
};

export type SuccessionStep = {
  readonly office: string;
  readonly disposition: "succeeds" | "acts" | "selection-required";
  readonly condition?: string;
};

export type SuccessionRule =
  | { readonly status: "unknown"; readonly reason: string }
  | {
      readonly status: "verified";
      readonly source: SuccessionSource;
      readonly steps: readonly SuccessionStep[];
      readonly afterOrder?: "selection-required" | "special-election";
    };

export type ExecutiveSuccessionProfile = {
  readonly jurisdictionKey: string;
  /** Postal abbreviation for source/display metadata only. */
  readonly usps: string;
  readonly permanentVacancy: SuccessionRule;
  readonly temporaryIncapacity: SuccessionRule;
};

const unknown = (reason: string): SuccessionRule => ({
  status: "unknown",
  reason,
});
const verified = (
  citation: string,
  url: string,
  pinpoint: string,
  steps: readonly SuccessionStep[],
  effectiveAsOf = "2026-09-23",
  afterOrder?: "selection-required" | "special-election",
): SuccessionRule => ({
  status: "verified",
  source: { citation, url, pinpoint, effectiveAsOf },
  steps,
  ...(afterOrder ? { afterOrder } : {}),
});

const ncConstitution = "https://www.ncleg.gov/Laws/Constitution/Article3";
const ncStatute =
  "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_147/GS_147-11.1.html";

/** Explicit initial coverage: verified examples plus explicit unknowns. */
export const EXECUTIVE_SUCCESSION_PROFILES: Record<
  string,
  ExecutiveSuccessionProfile
> = {
  "US-NC": {
    jurisdictionKey: "US-NC",
    usps: "NC",
    permanentVacancy: verified(
      "North Carolina Constitution, art. III, § 3(2); N.C. Gen. Stat. § 147-11.1",
      ncStatute,
      "§ 147-11.1(a), (c); art. III, § 3(2)",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "President pro tempore of the Senate",
          disposition: "succeeds",
        },
        { office: "Speaker of the House", disposition: "succeeds" },
        { office: "Secretary of State", disposition: "succeeds" },
        { office: "State Auditor", disposition: "succeeds" },
        { office: "State Treasurer", disposition: "succeeds" },
        {
          office: "Superintendent of Public Instruction",
          disposition: "succeeds",
        },
        { office: "Attorney General", disposition: "succeeds" },
        { office: "Commissioner of Agriculture", disposition: "succeeds" },
        { office: "Commissioner of Labor", disposition: "succeeds" },
        { office: "Commissioner of Insurance", disposition: "succeeds" },
      ],
    ),
    temporaryIncapacity: verified(
      "North Carolina Constitution, art. III, § 3(2); N.C. Gen. Stat. § 147-11.1",
      ncStatute,
      "§ 147-11.1(b), (d); art. III, § 3(2)",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        { office: "President pro tempore of the Senate", disposition: "acts" },
        { office: "Speaker of the House", disposition: "acts" },
        { office: "Secretary of State", disposition: "acts" },
        { office: "State Auditor", disposition: "acts" },
        { office: "State Treasurer", disposition: "acts" },
        { office: "Superintendent of Public Instruction", disposition: "acts" },
        { office: "Attorney General", disposition: "acts" },
        { office: "Commissioner of Agriculture", disposition: "acts" },
        { office: "Commissioner of Labor", disposition: "acts" },
        { office: "Commissioner of Insurance", disposition: "acts" },
      ],
    ),
  },
  "US-CA": {
    jurisdictionKey: "US-CA",
    usps: "CA",
    permanentVacancy: verified(
      "California Constitution, art. V, § 10; Gov. Code § 12058",
      "https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?article=&chapter=6.&division=3.&goUp=Y&part=2.&title=2.&tocCode=GOV",
      "art. V, § 10; Gov. Code § 12058",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "President pro Tempore of the Senate",
          disposition: "succeeds",
          condition: "if Governor and Lieutenant Governor are both vacant",
        },
        {
          office: "Speaker of the Assembly",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Secretary of State",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Attorney General",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Treasurer",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Controller",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Superintendent of Public Instruction",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Insurance Commissioner",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
        {
          office: "Chair of the Board of Equalization",
          disposition: "succeeds",
          condition: "if preceding office vacant",
        },
      ],
      "1974-11-05",
    ),
    temporaryIncapacity: verified(
      "California Constitution, art. V, § 10; Gov. Code § 12059",
      "https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?article=&chapter=6.&division=3.&goUp=Y&part=2.&title=2.&tocCode=GOV",
      "art. V, § 10; Gov. Code § 12059",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition:
            "during impeachment, absence from State, or other temporary disability",
        },
        {
          office: "Successor officers in statutory order",
          disposition: "acts",
          condition: "if preceding officer unavailable",
        },
      ],
      "1974-11-05",
    ),
  },
  "US-AZ": {
    jurisdictionKey: "US-AZ",
    usps: "AZ",
    permanentVacancy: verified(
      "Arizona Constitution, art. V, § 6",
      "https://www.azleg.gov/const/5/6.htm",
      "art. V, § 6(A)-(D)",
      [
        {
          office: "Lieutenant Governor",
          disposition: "succeeds",
          condition:
            "permanent vacancy; serves until a successor is elected and qualifies",
        },
        {
          office: "Secretary of State",
          disposition: "succeeds",
          condition:
            "pre-2027 Governor vacancy before the Lieutenant Governor term begins; also if Governor and Lieutenant Governor are both vacant",
        },
        {
          office: "Attorney General",
          disposition: "succeeds",
          condition: "if preceding officer unavailable",
        },
        {
          office: "State Treasurer",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Superintendent of Public Instruction",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
      ],
      "2026-09-23",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Arizona Constitution, art. V, § 6(E)",
      "https://www.azleg.gov/const/5/6.htm",
      "art. V, § 6(E)",
      [
        {
          office: "Same person as in case of vacancy",
          disposition: "acts",
          condition:
            "impeachment, absence from State, or temporary disability; only until disability ceases",
        },
      ],
    ),
  },
  "US-WY": {
    jurisdictionKey: "US-WY",
    usps: "WY",
    permanentVacancy: verified(
      "Wyoming Statutes §§ 9-1-211, 9-1-212",
      "https://wyoleg.gov/statutes/compress/title09.pdf",
      "§ 9-1-211(a)-(b); § 9-1-212",
      [
        { office: "Secretary of State", disposition: "acts" },
        { office: "President of the Senate", disposition: "acts" },
        { office: "Speaker of the House", disposition: "acts" },
        { office: "State Auditor", disposition: "acts" },
        { office: "State Treasurer", disposition: "acts" },
        { office: "Superintendent of Public Instruction", disposition: "acts" },
        { office: "Vice President of the Senate", disposition: "acts" },
        { office: "Speaker pro tempore of the House", disposition: "acts" },
      ],
      "2026-09-23",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Wyoming Statutes § 9-1-211",
      "https://wyoleg.gov/statutes/compress/title09.pdf",
      "§ 9-1-211(a)-(b)",
      [
        { office: "Secretary of State", disposition: "acts" },
        { office: "President of the Senate", disposition: "acts" },
        { office: "Speaker of the House", disposition: "acts" },
        { office: "State Auditor", disposition: "acts" },
        { office: "State Treasurer", disposition: "acts" },
        { office: "Superintendent of Public Instruction", disposition: "acts" },
        { office: "Vice President of the Senate", disposition: "acts" },
        { office: "Speaker pro tempore of the House", disposition: "acts" },
      ],
    ),
  },
  "US-DE": {
    jurisdictionKey: "US-DE",
    usps: "DE",
    permanentVacancy: verified(
      "Delaware Constitution, art. III, § 20(a)(1)-(3)",
      "https://delcode.delaware.gov/constitution/constitution-04.html",
      "art. III, § 20(a)(1)-(3)",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition: "if both Governor and Lieutenant Governor cannot serve",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officer cannot serve",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if preceding officers cannot serve",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers cannot serve",
        },
      ],
    ),
    temporaryIncapacity: verified(
      "Delaware Constitution, art. III, § 20(a)-(c)",
      "https://delcode.delaware.gov/constitution/constitution-04.html",
      "art. III, § 20(a)-(c)",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition:
            "Governor's written declaration or unanimous medical/Chief Justice declaration",
        },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition:
            "if both Governor and Lieutenant Governor are unable to serve",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officer unable",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if preceding officers unable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers unable",
        },
      ],
    ),
  },
  "US-MA": {
    jurisdictionKey: "US-MA",
    usps: "MA",
    permanentVacancy: verified(
      "Massachusetts Constitution, Amendments LV and LXIII",
      "https://malegislature.gov/Laws/Constitution",
      "Amend. LV; Amend. LXIII",
      [
        {
          office: "Lieutenant Governor",
          disposition: "succeeds",
          condition: "single Governor vacancy",
        },
        {
          office: "Secretary",
          disposition: "acts",
          condition: "if both Governor and Lieutenant Governor are vacant",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding office is vacant",
        },
        {
          office: "Treasurer and Receiver-General",
          disposition: "acts",
          condition: "if preceding offices are vacant",
        },
        {
          office: "Auditor",
          disposition: "acts",
          condition: "if preceding offices are vacant",
        },
      ],
    ),
    temporaryIncapacity: verified(
      "Massachusetts Constitution, Amendments LV and XCI",
      "https://malegislature.gov/Laws/Constitution",
      "Amend. LV; Amend. XCI",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition: "during single Governor vacancy due to inability",
        },
        {
          office: "Secretary",
          disposition: "acts",
          condition: "if both Governor and Lieutenant Governor are vacant",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding office is vacant",
        },
        {
          office: "Treasurer and Receiver-General",
          disposition: "acts",
          condition: "if preceding offices are vacant",
        },
        {
          office: "Auditor",
          disposition: "acts",
          condition: "if preceding offices are vacant",
        },
      ],
    ),
  },
  "US-LA": {
    jurisdictionKey: "US-LA",
    usps: "LA",
    permanentVacancy: verified(
      "Louisiana Constitution, art. IV, § 14",
      "https://www.legis.la.gov/Legis/Law.aspx?d=206430",
      "art. IV, § 14",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Secretary of State",
          disposition: "succeeds",
          condition: "if Lieutenant Governor unavailable",
        },
        {
          office: "Attorney General",
          disposition: "succeeds",
          condition: "if preceding officer unavailable",
        },
        {
          office: "Treasurer",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
        {
          office: "President of the Senate",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Person provided by law",
          disposition: "succeeds",
          condition: "if preceding officers unavailable",
        },
      ],
      "1974-01-01",
    ),
    temporaryIncapacity: unknown(
      "The current Louisiana constitutional/statutory temporary inability order has not yet been verified from operative primary text.",
    ),
  },
  "US-ND": {
    jurisdictionKey: "US-ND",
    usps: "ND",
    permanentVacancy: verified(
      "North Dakota Constitution, art. V, § 11; N.D.C.C. § 44-02-03",
      "https://www.ndcourts.gov/legal-resources/nd-constitution/article-v-executive-branch",
      "art. V, § 11; N.D.C.C. § 44-02-03",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition:
            "if the Lieutenant Governor cannot serve during the vacancy",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition:
            "if Lieutenant Governor and Secretary of State cannot serve",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if preceding officers cannot serve",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officers cannot serve",
        },
      ],
    ),
    temporaryIncapacity: verified(
      "North Dakota Constitution, art. V, § 11",
      "https://www.ndcourts.gov/legal-resources/nd-constitution/article-v-executive-branch",
      "art. V, § 11",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition:
            "if Lieutenant Governor is unable to serve during the vacancy",
        },
      ],
    ),
  },
  "US-OH": {
    jurisdictionKey: "US-OH",
    usps: "OH",
    permanentVacancy: verified(
      "Ohio Constitution, art. III, §§ 15, 17; Ohio Rev. Code § 161.03",
      "https://codes.ohio.gov/ohio-constitution/section-3.15",
      "art. III, § 15(A), (C); § 17; ORC § 161.03",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "President of the Senate",
          disposition: "acts",
          condition: "if the Lieutenant Governor is unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition:
            "if Governor, Lieutenant Governor, Senate President, and House Speaker are unavailable",
        },
        {
          office: "Treasurer of State",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Auditor of State",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Election for Governor and Lieutenant Governor",
          disposition: "selection-required",
          condition:
            "if both offices become vacant before the first 20 months of the term",
        },
      ],
      "2026-09-23",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Ohio Constitution, art. III, §§ 15, 22; Ohio Rev. Code § 161.03",
      "https://codes.ohio.gov/ohio-constitution/section-3.15",
      "art. III, § 15(B)-(D), § 22; ORC § 161.03",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        {
          office: "President of the Senate",
          disposition: "acts",
          condition: "if Governor and Lieutenant Governor cannot serve",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers cannot serve",
        },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition:
            "if Governor, Lieutenant Governor, Senate President, and House Speaker are unavailable",
        },
        {
          office: "Treasurer of State",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Auditor of State",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officers are unavailable",
        },
      ],
    ),
  },
  "US-ME": {
    jurisdictionKey: "US-ME",
    usps: "ME",
    permanentVacancy: verified(
      "Maine Constitution, art. V, pt. First, § 14-A",
      "https://www.legislature.maine.gov/doc/10674",
      "art. V, pt. First, § 14-A",
      [
        {
          office: "President of the Senate",
          disposition: "acts",
          condition:
            "acts until a Governor is elected and qualifies; if the vacancy occurs less than 90 days before a primary, serves the remainder",
        },
        {
          office: "Special election",
          disposition: "selection-required",
          condition:
            "when vacancy occurs at least 90 days before the next primary; election within 90 days",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if the Senate President is unable to act",
        },
      ],
      "2018-12-05",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Maine Constitution, art. V, pt. First, § 15-A",
      "https://www.legislature.maine.gov/doc/10674",
      "art. V, pt. First, § 15-A",
      [
        {
          office: "President of the Senate",
          disposition: "acts",
          condition:
            "during Governor's mental or physical disability; restoration follows Governor certification or court process",
        },
      ],
      "2018-12-05",
    ),
  },
  "US-VT": {
    jurisdictionKey: "US-VT",
    usps: "VT",
    permanentVacancy: verified(
      "Vermont Constitution, ch. II, § 24; 3 V.S.A. § 1",
      "https://legislature.vermont.gov/statutes/section/03/001/00001",
      "3 V.S.A. § 1(a); Vt. Const. ch. II, § 24",
      [
        {
          office: "Lieutenant Governor",
          disposition: "succeeds",
          condition: "ordinary Governor vacancy",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition:
            "when both Governor and Lieutenant Governor offices are vacant",
        },
      ],
    ),
    temporaryIncapacity: verified(
      "Vermont Constitution, ch. II, §§ 3, 20; 3 V.S.A. § 1",
      "https://legislature.vermont.gov/statutes/section/03/001/00001",
      "3 V.S.A. § 1(b); Vt. Const. ch. II, §§ 3, 20",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition: "when Governor is absent from the State",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition:
            "when both Governor and Lieutenant Governor are absent from the State",
        },
      ],
    ),
  },
  "US-PA": {
    jurisdictionKey: "US-PA",
    usps: "PA",
    permanentVacancy: verified(
      "Pennsylvania Constitution, art. IV, § 13",
      "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/00/00.004..HTM",
      "art. IV, § 13(a)",
      [
        {
          office: "Lieutenant Governor",
          disposition: "succeeds",
          condition:
            "death, impeachment conviction, failure to qualify, resignation, or other vacancy",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "succeeds",
          condition: "if there is no Lieutenant Governor",
        },
      ],
      "1967-05-16",
    ),
    temporaryIncapacity: verified(
      "Pennsylvania Constitution, art. IV, § 13",
      "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/00/00.004..HTM",
      "art. IV, § 13(b)",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition: "during Governor's disability",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if no Lieutenant Governor",
        },
      ],
      "1967-05-16",
    ),
  },
  "US-MI": {
    jurisdictionKey: "US-MI",
    usps: "MI",
    permanentVacancy: verified(
      "Michigan Constitution of 1963, art. V, § 26",
      "https://legislature.mi.gov/doc.aspx?mcl-Article-V-26=",
      "art. V, § 26",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Secretary of State",
          disposition: "succeeds",
          condition: "if preceding person cannot succeed",
        },
        {
          office: "Attorney General",
          disposition: "succeeds",
          condition: "if preceding persons cannot succeed",
        },
        {
          office: "Persons designated by law",
          disposition: "succeeds",
          condition: "in statutory order after Attorney General",
        },
      ],
      "1964-01-01",
    ),
    temporaryIncapacity: verified(
      "Michigan Constitution of 1963, art. V, § 26",
      "https://legislature.mi.gov/doc.aspx?mcl-Article-V-26=",
      "art. V, § 26",
      [
        {
          office: "Persons in permanent succession order",
          disposition: "acts",
          condition:
            "powers devolve in precedence order during absence or inability; Supreme Court determines inability on joint request of Senate President pro tem and House Speaker",
        },
      ],
      "1964-01-01",
    ),
  },
  "US-NY": {
    jurisdictionKey: "US-NY",
    usps: "NY",
    permanentVacancy: verified(
      "New York Constitution, art. IV, §§ 5-6",
      "https://www.nysenate.gov/legislation/laws/CNS/A4S5",
      "art. IV, §§ 5-6",
      [
        {
          office: "Lieutenant Governor",
          disposition: "succeeds",
          condition: "single Governor vacancy for remainder of term",
        },
        {
          office: "Temporary President of the Senate",
          disposition: "acts",
          condition:
            "if both Governor and Lieutenant Governor offices are vacant, pending election",
        },
        {
          office: "Speaker of the Assembly",
          disposition: "acts",
          condition: "if Temporary President is unavailable",
        },
        {
          office: "Special election",
          disposition: "selection-required",
          condition:
            "dual vacancy; next general election not sooner than three months",
        },
      ],
      "2014-09-22",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "New York Constitution, art. IV, §§ 5-6",
      "https://www.nysenate.gov/legislation/laws/CNS/A4S6",
      "art. IV, §§ 5-6",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition:
            "Governor impeached, absent from State, or unable to discharge duties",
        },
        {
          office: "Temporary President of the Senate",
          disposition: "acts",
          condition: "if both Governor and Lieutenant Governor cannot serve",
        },
        {
          office: "Speaker of the Assembly",
          disposition: "acts",
          condition: "if Temporary President is unavailable",
        },
      ],
      "2014-09-22",
    ),
  },
  "US-NJ": {
    jurisdictionKey: "US-NJ",
    usps: "NJ",
    permanentVacancy: verified(
      "New Jersey Constitution, art. V, § I, ¶¶ 6, 9",
      "https://www.njleg.state.nj.us/constitution",
      "art. V, § I, ¶¶ 6, 9",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Senate President",
          disposition: "acts",
          condition: "if Governor and Lieutenant Governor offices are vacant",
        },
        {
          office: "Speaker of the General Assembly",
          disposition: "acts",
          condition: "if Senate President is unavailable",
        },
        {
          office: "Special election",
          disposition: "selection-required",
          condition:
            "next general election; if vacancy within 60 days before general election, second succeeding general election; no election in year full-term Governor/LG are elected",
        },
      ],
      "2006-01-17",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "New Jersey Constitution, art. V, § I, ¶¶ 7-8",
      "https://www.njleg.state.nj.us/constitution",
      "art. V, § I, ¶¶ 7-8",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        {
          office: "Senate President",
          disposition: "acts",
          condition:
            "if Lieutenant Governor absent, unable, impeached, or office vacant",
        },
        {
          office: "Speaker of the General Assembly",
          disposition: "acts",
          condition: "if Senate President unavailable",
        },
      ],
      "2006-01-17",
    ),
  },
  "US-NM": {
    jurisdictionKey: "US-NM",
    usps: "NM",
    permanentVacancy: verified(
      "New Mexico Constitution, art. V, § 7",
      "https://www.sos.nm.gov/wp-content/uploads/2025/01/NM_Constitution_-2025-for-SOS.pdf",
      "art. V, § 7",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition: "if no Lieutenant Governor or unavailable",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if Secretary of State unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
      ],
      "1948-11-02",
    ),
    temporaryIncapacity: verified(
      "New Mexico Constitution, art. V, § 7",
      "https://www.sos.nm.gov/wp-content/uploads/2025/01/NM_Constitution_-2025-for-SOS.pdf",
      "art. V, § 7",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        {
          office: "Secretary of State",
          disposition: "acts",
          condition: "if no Lieutenant Governor or unavailable",
        },
        {
          office: "President pro tempore of the Senate",
          disposition: "acts",
          condition: "if Secretary of State unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
      ],
      "1948-11-02",
    ),
  },
  "US-OR": {
    jurisdictionKey: "US-OR",
    usps: "OR",
    permanentVacancy: verified(
      "Oregon Constitution, art. V, § 8a",
      "https://www.oregonlegislature.gov/bills_laws/ors/orcons.html",
      "art. V, § 8a",
      [
        {
          office: "Secretary of State",
          disposition: "succeeds",
          condition:
            "until disability removed or Governor elected at next general biennial election",
        },
        {
          office: "State Treasurer",
          disposition: "acts",
          condition: "if Secretary of State unavailable",
        },
        {
          office: "President of the Senate",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Election for unexpired term",
          disposition: "selection-required",
          condition: "next general biennial election",
        },
      ],
      "1972-11-07",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Oregon Constitution, art. V, § 8a",
      "https://www.oregonlegislature.gov/bills_laws/ors/orcons.html",
      "art. V, § 8a",
      [
        {
          office: "Secretary of State",
          disposition: "acts",
          condition: "during disability until removed",
        },
        {
          office: "State Treasurer",
          disposition: "acts",
          condition: "if Secretary of State unavailable",
        },
        {
          office: "President of the Senate",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
      ],
      "1972-11-07",
    ),
  },
  "US-FL": {
    jurisdictionKey: "US-FL",
    usps: "FL",
    permanentVacancy: verified(
      "Florida Statutes § 14.055",
      "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0014/Sections/0014.055.html",
      "§ 14.055(1)-(3)",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        { office: "Attorney General", disposition: "succeeds" },
        { office: "Chief Financial Officer", disposition: "succeeds" },
        { office: "Commissioner of Agriculture", disposition: "succeeds" },
        {
          office: "Legislature in joint session",
          disposition: "selection-required",
        },
      ],
      "2026-09-23",
      "selection-required",
    ),
    temporaryIncapacity: unknown(
      "Temporary absence or disability is governed separately; that current primary provision has not yet been source-checked in this slice.",
    ),
  },
  "US-HI": {
    jurisdictionKey: "US-HI",
    usps: "HI",
    permanentVacancy: verified(
      "Hawaii Constitution, art. V, § 4; Haw. Rev. Stat. § 26-2(a), (c)",
      "https://data.capitol.hawaii.gov/hrscurrent/Vol01_Ch0001-0042F/HRS0026/HRS_0026-.htm",
      "art. V, § 4; HRS § 26-2(a), (c)",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "President of the Senate",
          disposition: "acts",
          condition:
            "fills Lieutenant Governor powers after LG becomes Governor",
        },
        {
          office: "Speaker of the House",
          disposition: "acts",
          condition:
            "if no Senate President or Senate President does not resign legislative offices promptly",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Director of Finance",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Comptroller",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Director of Taxation",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
        {
          office: "Director of Human Resources Development",
          disposition: "acts",
          condition: "if preceding officers unavailable",
        },
      ],
    ),
    temporaryIncapacity: verified(
      "Hawaii Constitution, art. V, § 4; Haw. Rev. Stat. § 26-2(b)-(c)",
      "https://data.capitol.hawaii.gov/hrscurrent/Vol01_Ch0001-0042F/HRS0026/HRS_0026-.htm",
      "art. V, § 4; HRS § 26-2(b)-(c)",
      [
        {
          office: "Lieutenant Governor",
          disposition: "acts",
          condition: "during Governor absence from State or inability",
        },
        {
          office: "Attorney General",
          disposition: "acts",
          condition: "if Lieutenant Governor temporarily absent or disabled",
        },
        {
          office: "Director of Finance",
          disposition: "acts",
          condition: "if preceding office unavailable",
        },
        {
          office: "Comptroller",
          disposition: "acts",
          condition: "if preceding offices unavailable",
        },
        {
          office: "Director of Taxation",
          disposition: "acts",
          condition: "if preceding offices unavailable",
        },
        {
          office: "Director of Human Resources Development",
          disposition: "acts",
          condition: "if preceding offices unavailable",
        },
      ],
    ),
  },
  "US-DC": {
    jurisdictionKey: "US-DC",
    usps: "DC",
    permanentVacancy: verified(
      "D.C. Code § 1-204.21",
      "https://code.dccouncil.gov/us/dc/council/code/sections/1-204.21",
      "§ 1-204.21(a)-(c)",
      [
        {
          office: "Chair of the Council",
          disposition: "acts",
          condition: "until special election result is certified",
        },
        {
          office: "Mayor elected at special election",
          disposition: "succeeds",
          condition: "serves remainder of term",
        },
      ],
      "2026-09-23",
      "special-election",
    ),
    temporaryIncapacity: unknown(
      "The Mayor may designate an officer, but the World does not model or record that designation; no automatic fallback is established.",
    ),
  },
  "US-MP": {
    jurisdictionKey: "US-MP",
    usps: "MP",
    permanentVacancy: verified(
      "Commonwealth of the Northern Mariana Islands Constitution, art. III, § 7",
      "https://www.cnmilaw.gov/constitution",
      "art. III, § 7(a)-(b)",
      [
        { office: "Lieutenant Governor", disposition: "succeeds" },
        {
          office: "Senate President",
          disposition: "acts",
          condition: "if Governor and Lieutenant Governor offices are vacant",
        },
        {
          office: "Special election",
          disposition: "selection-required",
          condition: "when more than one year remains in term",
        },
      ],
      "2026-09-23",
      "special-election",
    ),
    temporaryIncapacity: verified(
      "Commonwealth of the Northern Mariana Islands Constitution, art. III, § 8",
      "https://www.cnmilaw.gov/constitution",
      "art. III, § 8",
      [
        { office: "Lieutenant Governor", disposition: "acts" },
        {
          office: "Senate President",
          disposition: "acts",
          condition: "if Lieutenant Governor is unavailable",
        },
      ],
    ),
  },
  "US-AK": {
    jurisdictionKey: "US-AK",
    usps: "AK",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-AL": {
    jurisdictionKey: "US-AL",
    usps: "AL",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-AR": {
    jurisdictionKey: "US-AR",
    usps: "AR",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-CO": {
    jurisdictionKey: "US-CO",
    usps: "CO",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-CT": {
    jurisdictionKey: "US-CT",
    usps: "CT",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-GA": {
    jurisdictionKey: "US-GA",
    usps: "GA",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-IA": {
    jurisdictionKey: "US-IA",
    usps: "IA",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-ID": {
    jurisdictionKey: "US-ID",
    usps: "ID",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-IL": {
    jurisdictionKey: "US-IL",
    usps: "IL",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-IN": {
    jurisdictionKey: "US-IN",
    usps: "IN",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-KS": {
    jurisdictionKey: "US-KS",
    usps: "KS",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-KY": {
    jurisdictionKey: "US-KY",
    usps: "KY",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-MD": {
    jurisdictionKey: "US-MD",
    usps: "MD",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-MN": {
    jurisdictionKey: "US-MN",
    usps: "MN",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-MO": {
    jurisdictionKey: "US-MO",
    usps: "MO",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-MS": {
    jurisdictionKey: "US-MS",
    usps: "MS",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-MT": {
    jurisdictionKey: "US-MT",
    usps: "MT",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-NE": {
    jurisdictionKey: "US-NE",
    usps: "NE",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-NH": {
    jurisdictionKey: "US-NH",
    usps: "NH",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-NV": {
    jurisdictionKey: "US-NV",
    usps: "NV",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-OK": {
    jurisdictionKey: "US-OK",
    usps: "OK",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-RI": {
    jurisdictionKey: "US-RI",
    usps: "RI",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-SC": {
    jurisdictionKey: "US-SC",
    usps: "SC",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-SD": {
    jurisdictionKey: "US-SD",
    usps: "SD",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-TN": {
    jurisdictionKey: "US-TN",
    usps: "TN",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-TX": {
    jurisdictionKey: "US-TX",
    usps: "TX",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-UT": {
    jurisdictionKey: "US-UT",
    usps: "UT",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-VA": {
    jurisdictionKey: "US-VA",
    usps: "VA",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-WA": {
    jurisdictionKey: "US-WA",
    usps: "WA",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-WI": {
    jurisdictionKey: "US-WI",
    usps: "WI",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-WV": {
    jurisdictionKey: "US-WV",
    usps: "WV",
    permanentVacancy: unknown("Not source-checked."),
    temporaryIncapacity: unknown("Not source-checked."),
  },
  "US-PR": {
    jurisdictionKey: "US-PR",
    usps: "PR",
    permanentVacancy: unknown(
      "Puerto Rico Constitution identifies the Secretary of State; statutory fallback chain not yet verified from current official code.",
    ),
    temporaryIncapacity: unknown(
      "Statutory temporary line not yet verified from current official code.",
    ),
  },
  "US-GU": {
    jurisdictionKey: "US-GU",
    usps: "GU",
    permanentVacancy: unknown(
      "Federal law verifies Lieutenant Governor succession; local dual-vacancy rule not yet verified from official current code.",
    ),
    temporaryIncapacity: unknown(
      "Federal law delegates simultaneous absence to local law, not yet verified from official current code.",
    ),
  },
  "US-VI": {
    jurisdictionKey: "US-VI",
    usps: "VI",
    permanentVacancy: unknown(
      "Federal law verifies Lieutenant Governor succession; local dual-vacancy rule not yet verified from official current code.",
    ),
    temporaryIncapacity: unknown(
      "Federal law delegates simultaneous absence to local law, not yet verified from official current code.",
    ),
  },
  "US-AS": {
    jurisdictionKey: "US-AS",
    usps: "AS",
    permanentVacancy: unknown(
      "Current official government source not yet located.",
    ),
    temporaryIncapacity: unknown(
      "Current official government source not yet located.",
    ),
  },
};

/**
 * The all-jurisdiction source review supports the first permanent successor
 * in each previously open row. Deeper fallback tiers stay explicit unknown;
 * this slice does not turn a first-line source into a claim about the full law.
 */
const FIRST_LINE_SOURCES: Readonly<
  Record<string, readonly [string, string, string, string]>
> = {
  "US-AL": [
    "Lieutenant Governor",
    "Alabama Constitution art. V, § 127",
    "https://alison.legislature.state.al.us/constitution?section=127",
    "art. V, § 127",
  ],
  "US-AK": [
    "Lieutenant Governor",
    "Alaska Constitution art. III, § 11",
    "https://www.akleg.gov/statutesPDF/Title-44.pdf",
    "art. III, § 11; AS 44.19.040",
  ],
  "US-AR": [
    "Lieutenant Governor",
    "Arkansas Constitution art. VI, § 5",
    "https://www.sos.arkansas.gov/uploads/elections/Arkansas_Election_Laws_and_Constitution_2025_Edition.pdf",
    "art. VI, § 5; Amendment 96",
  ],
  "US-CO": [
    "Lieutenant Governor",
    "Colorado Constitution art. IV, § 13",
    "https://www.leg.colorado.gov/laws/colorado-constitution",
    "art. IV, § 13",
  ],
  "US-CT": [
    "Lieutenant Governor",
    "Connecticut Constitution art. IV, § 2",
    "https://www.cga.ct.gov/asp/Content/constitutions/Constitution_State_CT.pdf",
    "art. IV, § 2",
  ],
  "US-GA": [
    "Lieutenant Governor",
    "Georgia Constitution art. V, § I, para. I",
    "https://sos.ga.gov/index.php/georgia-constitution-revised-2025",
    "art. V, § I, para. I",
  ],
  "US-ID": [
    "Lieutenant Governor",
    "Idaho Constitution art. IV, § 12",
    "https://sos.idaho.gov/elect/stcon/Idaho_State_Constitution.pdf",
    "art. IV, § 12",
  ],
  "US-IL": [
    "Lieutenant Governor",
    "Illinois Constitution art. V, § 6",
    "https://www.ilga.gov/Legislation/ILCS/Articles?ActID=183&ChapterID=4&Print=True",
    "art. V, § 6; 15 ILCS 5/1",
  ],
  "US-IN": [
    "Lieutenant Governor",
    "Indiana Constitution art. V, § 10",
    "https://www.in.gov/sos/elections/files/2026-Vacancies-Brochure.FINAL-VERSION.pdf",
    "art. V, § 10; 2026 vacancies brochure",
  ],
  "US-IA": [
    "Lieutenant Governor",
    "Iowa Constitution art. IV, § 17",
    "https://www.legis.iowa.gov/law/statutory/constitution",
    "art. IV, § 17",
  ],
  "US-KS": [
    "Lieutenant Governor",
    "Kansas Constitution art. I, § 11",
    "https://www.kslegislature.gov/li/b2025_26/statute/",
    "art. I, § 11; K.S.A. 75-125",
  ],
  "US-KY": [
    "Lieutenant Governor",
    "Kentucky Constitution § 84",
    "https://apps.legislature.ky.gov/Law/Constitution/Constitution/ViewConstitution?rsn=92",
    "§ 84",
  ],
  "US-MD": [
    "Lieutenant Governor",
    "Maryland Constitution art. II, § 6",
    "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=c2&enactments=false&section=6",
    "art. II, § 6",
  ],
  "US-MN": [
    "Lieutenant Governor",
    "Minnesota Constitution art. V, § 3",
    "https://www.revisor.mn.gov/statutes/2025/cite/4.06",
    "art. V, § 3",
  ],
  "US-MS": [
    "Lieutenant Governor",
    "Mississippi Constitution art. V, § 131",
    "https://www.sos.ms.gov/publications-external-affairs/publications/mississippi-constitution",
    "art. V, § 131",
  ],
  "US-MO": [
    "Lieutenant Governor",
    "Missouri Constitution art. IV, § 11(a)",
    "https://revisor.mo.gov/main/OneSection.aspx?constit=y&section=IV++11%28a%29",
    "art. IV, § 11(a)",
  ],
  "US-MT": [
    "Lieutenant Governor",
    "Montana Constitution art. VI, § 14",
    "https://mca.legmt.gov/bills/mca/title_0000/article_0060/part_0010/section_0140/0000-0060-0010-0140.html",
    "art. VI, § 14; MCA §§ 2-16-511 to -515",
  ],
  "US-NE": [
    "Lieutenant Governor",
    "Nebraska Constitution art. IV, § 16",
    "https://nebraskalegislature.gov/laws/articles.php?article=IV-16",
    "art. IV, § 16; Neb. Rev. Stat. §§ 84-120 to -121",
  ],
  "US-NV": [
    "Lieutenant Governor",
    "Nevada Constitution art. V, §§ 17-18",
    "https://www.leg.state.nv.us/nrs/NRS-223.html",
    "art. V, §§ 17-18; NRS 223.080",
  ],
  "US-NH": [
    "President of the Senate",
    "New Hampshire Constitution pt. II, art. 49",
    "https://www.sos.nh.gov/administration/state-resources",
    "pt. II, art. 49 (current text display gap)",
  ],
  "US-OK": [
    "Lieutenant Governor",
    "Oklahoma Constitution art. VI, § 15",
    "https://oksenate.gov/sites/default/files/2019-12/os63.pdf",
    "art. VI, § 15",
  ],
  "US-RI": [
    "Lieutenant Governor",
    "Rhode Island Constitution art. IX, § 12",
    "https://rilegislature.gov/riconstitution/Constitution/C09.aspx",
    "art. IX, § 12",
  ],
  "US-SC": [
    "Lieutenant Governor",
    "South Carolina Constitution art. IV, §§ 3-4",
    "https://www.scstatehouse.gov/code/t01c009.php",
    "art. IV, §§ 3-4; S.C. Code tit. 1, ch. 9",
  ],
  "US-SD": [
    "Lieutenant Governor",
    "South Dakota Codified Laws § 3-4-2",
    "https://sdlegislature.gov/Statutes/1-7-4.1",
    "SDCL § 3-4-2; § 1-7-4.1",
  ],
  "US-TN": [
    "Speaker of the Senate",
    "Tennessee Constitution art. III, § 12",
    "https://publications.tnsosfiles.com/pub/2023%20TN%20Constitution.pdf",
    "art. III, § 12",
  ],
  "US-TX": [
    "Lieutenant Governor",
    "Texas Constitution art. IV, § 16",
    "https://www.statutes.legis.state.tx.us/Docs/SDocs/THETEXASCONSTITUTION.pdf",
    "art. IV, § 16",
  ],
  "US-UT": [
    "Lieutenant Governor",
    "Utah Constitution art. VII, § 11",
    "https://le.utah.gov/xcode/Articlevii/UC_AVII_S11_1800010118000101.pdf",
    "art. VII, § 11",
  ],
  "US-VA": [
    "Lieutenant Governor",
    "Virginia Constitution art. V, § 16",
    "https://law.lis.virginia.gov/constitution/article5/section16/",
    "art. V, § 16",
  ],
  "US-WA": [
    "Lieutenant Governor",
    "Washington Constitution art. III, § 10",
    "https://apps.leg.wa.gov/rcw/default.aspx?cite=42.14.020",
    "art. III, § 10; RCW 42.14.020",
  ],
  "US-WI": [
    "Lieutenant Governor",
    "Wisconsin Constitution art. V, § 7",
    "https://docs.legis.wisconsin.gov/constitution/wi/000245/000007",
    "art. V, § 7 (government-hosted text caveat)",
  ],
  "US-WV": [
    "President of the Senate",
    "West Virginia Constitution art. VII, § 16",
    "https://www.wvlegislature.gov/wvcode/wv_con.cfm",
    "art. VII, § 16",
  ],
  "US-AS": [
    "Lieutenant Governor",
    "American Samoa Code Annotated § 4.0106",
    "https://asbar.org/code-annotated/4-0106-line-of-succession/",
    "§ 4.0106; official government repository refers to ASCA",
  ],
  "US-GU": [
    "Lieutenant Governor",
    "48 U.S.C. § 1422b; 5 GCA §§ 1101-1102",
    "https://www.guamcourts.org/compileroflaws/GCA/05gca/5gc001.PDF",
    "48 U.S.C. § 1422b; 5 GCA §§ 1101-1102",
  ],
  "US-PR": [
    "Secretary of State",
    "Puerto Rico Act No. 7-1952, as amended",
    "https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/Gobe/7-1952.pdf",
    "§§ 1-2; 2024 official version",
  ],
  "US-VI": [
    "Lieutenant Governor",
    "48 U.S.C. § 1595",
    "https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title48-section1595",
    "48 U.S.C. § 1595 (local § 29 dual-vacancy source unresolved)",
  ],
};

for (const [
  jurisdictionKey,
  [office, citation, url, pinpoint],
] of Object.entries(FIRST_LINE_SOURCES)) {
  const profile = EXECUTIVE_SUCCESSION_PROFILES[jurisdictionKey];
  if (!profile || profile.permanentVacancy.status !== "unknown") continue;
  EXECUTIVE_SUCCESSION_PROFILES[jurisdictionKey] = {
    ...profile,
    permanentVacancy: verified(citation, url, pinpoint, [
      {
        office,
        disposition:
          jurisdictionKey === "US-NH" || jurisdictionKey === "US-WV"
            ? "acts"
            : "succeeds",
        condition:
          "first line only; deeper fallback and election conditions remain unmodeled",
      },
    ]),
  };
}

/** Resolve by stable canonical jurisdiction key; runtime IDs are intentionally ignored. */
export function executiveSuccessionProfileFor(input: {
  readonly jurisdictionKey: string;
  readonly jurisdictionId: string;
}): ExecutiveSuccessionProfile | undefined {
  void input.jurisdictionId;
  return EXECUTIVE_SUCCESSION_PROFILES[input.jurisdictionKey];
}
