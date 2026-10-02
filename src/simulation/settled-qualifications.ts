import type { RuleSourceRef } from "./legislature-rules";
import type {
  QualificationFieldName,
  QualificationOfficeFamily,
} from "./office-qualification-rules";

/** Primary-source qualifications awaiting the locked corpus transport.
 * Each row retains its own authority and earliest supported date. These rows
 * are partial, never a claim that blocked acquisition produced verified bytes.
 * A compiled field remains authoritative where it already exists.
 */
interface SettledQualification {
  readonly stateJurisdictionKey: string;
  readonly officeFamily: QualificationOfficeFamily;
  readonly field: QualificationFieldName;
  readonly value: number;
  readonly validFrom?: string;
  readonly source: RuleSourceRef;
}

const SETTLED: readonly SettledQualification[] = [
  {
    stateJurisdictionKey: "US-AZ",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 25,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Ariz. Const. art. IV, pt. 2, § 2",
      sourceTitle: "Arizona Constitution, Article IV, Part 2, Section 2",
      sourceUrl: "https://www.azleg.gov/const/4/2.p2.htm",
      retrievedAt: "2026-10-02T15:02:45.000Z",
      verification: "partial",
      note: "Current primary-source observation only; historical commencement of this age clause is unproved. The provision applies to both legislative chambers. Source recovery: docs/research/a116-office-age-recovery-2026-10-02.md. Locked artifact acquisition and compilation remain separate.",
    },
  },
  {
    stateJurisdictionKey: "US-AZ",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 25,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Ariz. Const. art. IV, pt. 2, § 2",
      sourceTitle: "Arizona Constitution, Article IV, Part 2, Section 2",
      sourceUrl: "https://www.azleg.gov/const/4/2.p2.htm",
      retrievedAt: "2026-10-02T15:02:45.000Z",
      verification: "partial",
      note: "Current primary-source observation only; historical commencement of this age clause is unproved. The provision applies to both legislative chambers. Source recovery: docs/research/a116-office-age-recovery-2026-10-02.md. Locked artifact acquisition and compilation remain separate.",
    },
  },
  {
    stateJurisdictionKey: "US-FL",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Fla. Const. art. III, § 15(c)",
      sourceTitle: "Florida Constitution, Article III, Section 15(c)",
      sourceUrl: "https://www.flsenate.gov/Laws/Constitution#A3S15",
      retrievedAt: "2026-10-02T15:02:45.000Z",
      verification: "partial",
      note: "Current primary-source observation only; historical commencement of this age clause is unproved. The provision applies to both legislative chambers. Source recovery: docs/research/a116-office-age-recovery-2026-10-02.md. Locked artifact acquisition and compilation remain separate.",
    },
  },
  {
    stateJurisdictionKey: "US-FL",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Fla. Const. art. III, § 15(c)",
      sourceTitle: "Florida Constitution, Article III, Section 15(c)",
      sourceUrl: "https://www.flsenate.gov/Laws/Constitution#A3S15",
      retrievedAt: "2026-10-02T15:02:45.000Z",
      verification: "partial",
      note: "Current primary-source observation only; historical commencement of this age clause is unproved. The provision applies to both legislative chambers. Source recovery: docs/research/a116-office-age-recovery-2026-10-02.md. Locked artifact acquisition and compilation remain separate.",
    },
  },
  {
    stateJurisdictionKey: "US-ME",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    source: {
      authority: "constitution",
      citation: "Me. Const. art. IV, pt. 1, § 4",
      sourceTitle: "Constitution of the State of Maine",
      sourceUrl: null,
      retrievedAt: null,
      verification: "partial",
      note: "Applied from the cited section before the state's qualifications are compiled; the text was not retrieved here. Confirmation is filed as state-legislator-qualifications-in-every-unread-state.",
    },
  },
  {
    stateJurisdictionKey: "US-KY",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 24,
    validFrom: "1891-09-28",
    source: {
      authority: "constitution",
      citation: "Ky. Const. § 32",
      sourceTitle: "Constitution of the Commonwealth of Kentucky, Section 32",
      sourceUrl:
        "https://apps.legislature.ky.gov/Law/Constitution/Constitution/ViewConstitution?rsn=36",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "The publisher dates the revised text September 28, 1891 and records that this section has not yet been amended. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-KY",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 30,
    validFrom: "1891-09-28",
    source: {
      authority: "constitution",
      citation: "Ky. Const. § 32",
      sourceTitle: "Constitution of the Commonwealth of Kentucky, Section 32",
      sourceUrl:
        "https://apps.legislature.ky.gov/Law/Constitution/Constitution/ViewConstitution?rsn=36",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "The publisher dates the revised text September 28, 1891 and records that this section has not yet been amended. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-IL",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Ill. Const. art. IV, § 2(c)",
      sourceTitle: "Illinois Constitution, Article IV",
      sourceUrl: "https://lrb.ilga.gov/Commission/lrb/con4.htm",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; the age clause's historical commencement has not been established in this repair. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-IL",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Ill. Const. art. IV, § 2(c)",
      sourceTitle: "Illinois Constitution, Article IV",
      sourceUrl: "https://lrb.ilga.gov/Commission/lrb/con4.htm",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; the age clause's historical commencement has not been established in this repair. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-MD",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Md. Const. art. III, § 9",
      sourceTitle: "Maryland Constitution, Article III",
      sourceUrl:
        "https://msa.maryland.gov/msa/mdmanual/43const/html/03art3.html",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; ratification annotations are not substituted for the unproved proclamation date. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-MD",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 25,
    validFrom: "2026-10-02",
    source: {
      authority: "constitution",
      citation: "Md. Const. art. III, § 9",
      sourceTitle: "Maryland Constitution, Article III",
      sourceUrl:
        "https://msa.maryland.gov/msa/mdmanual/43const/html/03art3.html",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; ratification annotations are not substituted for the unproved proclamation date. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-MA",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 18,
    validFrom: "2026-10-02",
    source: {
      authority: "research-reference",
      citation:
        "Massachusetts Secretary of the Commonwealth, Candidate's Guide to Special Elections: State Senator and State Representative",
      sourceTitle: "A Candidate's Guide to Special Elections",
      sourceUrl:
        "https://www.sec.state.ma.us/divisions/elections/getting-on-the-ballot/candidates-guide-special-elections.htm",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; the guide states both ages, but historical candidacy commencement is not established. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-MA",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 18,
    validFrom: "2026-10-02",
    source: {
      authority: "research-reference",
      citation:
        "Massachusetts Secretary of the Commonwealth, Candidate's Guide to Special Elections: State Senator and State Representative",
      sourceTitle: "A Candidate's Guide to Special Elections",
      sourceUrl:
        "https://www.sec.state.ma.us/divisions/elections/getting-on-the-ballot/candidates-guide-special-elections.htm",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Current observation only; the guide states both ages, but historical candidacy commencement is not established. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-OH",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 18,
    validFrom: "2022-11-08",
    source: {
      authority: "constitution",
      citation: "Ohio Const. art. XV, § 4; art. V, § 1",
      sourceTitle:
        "Ohio Constitution, officer elector qualifications and elector age",
      sourceUrl: "https://codes.ohio.gov/ohio-constitution/section-5.1",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Article XV § 4 requires officers to be electors; the current Article V § 1 sets elector age eighteen and records its effective date as November 8, 2022. Earlier elector ages are not inferred. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-OH",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 18,
    validFrom: "2022-11-08",
    source: {
      authority: "constitution",
      citation: "Ohio Const. art. XV, § 4; art. V, § 1",
      sourceTitle:
        "Ohio Constitution, officer elector qualifications and elector age",
      sourceUrl: "https://codes.ohio.gov/ohio-constitution/section-5.1",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "Article XV § 4 requires officers to be electors; the current Article V § 1 sets elector age eighteen and records its effective date as November 8, 2022. Earlier elector ages are not inferred. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-MN",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "1974-11-05",
    source: {
      authority: "constitution",
      citation: "Minn. Const. art. VII, § 6; art. IV, § 6",
      sourceTitle: "Minnesota Constitution",
      sourceUrl: "https://www.revisor.mn.gov/constitution/#article_7",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "The same general elective-office age and publisher revision date already held in the compiled MN lower-chamber row also cover the Senate; no different age is stated for the Senate. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
  {
    stateJurisdictionKey: "US-NV",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    value: 21,
    validFrom: "2025-10-01",
    source: {
      authority: "statute",
      citation: "NRS 218A.200",
      sourceTitle: "Nevada Revised Statutes, Chapter 218A",
      sourceUrl: "https://www.leg.state.nv.us/NRS/NRS-218A.html#NRS218ASec200",
      retrievedAt: "2026-10-02T10:14:00.000Z",
      verification: "partial",
      note: "The legislative-office provision already held in the compiled NV lower-chamber row also covers the Senate. Its existing 2025 chapter 323 applicability boundary is preserved. Primary-source check: docs/research/a116-office-age-primary-check-2026-10-02.md. Source text is not newly acquired as a locked artifact; compilation remains separate.",
    },
  },
];

export function settledQualification(
  stateJurisdictionKey: string,
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
  onDate?: string,
): {
  readonly value: number;
  readonly source: RuleSourceRef;
  readonly validFrom?: string;
} | null {
  const row = SETTLED.find(
    (candidate) =>
      candidate.stateJurisdictionKey === stateJurisdictionKey &&
      candidate.field === field &&
      candidate.officeFamily === officeFamily,
  );
  if (
    !row ||
    (onDate !== undefined &&
      row.validFrom !== undefined &&
      onDate < row.validFrom)
  )
    return null;
  return {
    value: row.value,
    source: row.source,
    ...(row.validFrom === undefined ? {} : { validFrom: row.validFrom }),
  };
}
