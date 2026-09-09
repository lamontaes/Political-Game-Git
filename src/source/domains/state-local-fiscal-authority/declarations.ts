import { known, normalizeRetrievedText } from "../../core/index";
import type { Evidence, OpenedArtifact } from "../../core/index";
import { FISCAL_AUTHORITY_AS_OF } from "./acquisition";
import {
  ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
  ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  assertAlaskaSessionLawEnactedText,
} from "./session-law";
import type {
  CitedFiscalAuthority,
  FiscalAuthorityRecord,
  FiscalLevel,
  FiscalRuleField,
  FiscalRuleValue,
  TaxAuthorizationStatus,
  TaxInstrument,
} from "./types";

const EFFECTIVE_FROM = "1986-01-01";

const SOURCES = {
  sales: {
    artifactId: "ak-municipal-sales-use-tax-statutes",
    authorityUrl:
      "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.45.650&secEnd=29.45.710",
  },
  property: {
    artifactId: "ak-municipal-property-tax-statutes",
    authorityUrl:
      "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.45.010&secEnd=29.45.100",
  },
  bonds: {
    artifactId: "ak-municipal-general-obligation-bond-statutes",
    authorityUrl:
      "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=29.47.180&secEnd=29.47.200",
  },
} as const;

/** Exact first-party support for the shared Title 29 effective date. */
export const AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE = {
  artifactId: ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  extractArtifactId: ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
  authorityUrl:
    "https://www.akleg.gov/pdf/billfiles/SLAs/SLA%201985/CH%2074%20SLA%201985.pdf",
  legalLocator: "ch. 74 SLA 1985, § 90",
  provisionPdfPages: {
    propertyTax: [101, 102],
    taxLimitation: [116],
    salesAndUseTax: [136, 137, 138],
    generalObligationBondVote: [150],
    effectiveDate: [211],
  },
  effectiveDate: EFFECTIVE_FROM,
} as const;

interface DeclarationBase {
  readonly artifactId: string;
  readonly authorityUrl: string;
  readonly level: FiscalLevel;
  readonly citation: string;
  readonly excerpt: string;
  readonly paraphrase: string;
  readonly constraints: readonly string[];
  readonly derivationChain?: string;
}

interface InstrumentDeclaration extends DeclarationBase {
  readonly kind: "TAX_INSTRUMENT";
  readonly instrument: TaxInstrument;
  readonly value: TaxAuthorizationStatus;
}

interface RuleDeclaration extends DeclarationBase {
  readonly kind: "FISCAL_RULE";
  readonly field: FiscalRuleField;
  readonly value: FiscalRuleValue;
}

export type FiscalAuthorityDeclaration =
  InstrumentDeclaration | RuleDeclaration;

const REFERENDUM_EXCERPT =
  "A new sales and use tax or an increase in the rate of levy of a sales tax approved by ordinance does not take effect until ratified by a majority of the voters at an election.";

const TITLE_29_EFFECTIVE_DATE_DERIVATION = `Foundational enactment and effective date are supported by ${AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE.artifactId}, ${AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE.legalLocator}; the deterministic ${AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE.extractArtifactId} carries the cited PDF pages ${Object.values(AK_TITLE_29_EFFECTIVE_DATE_EVIDENCE.provisionPdfPages).flat().join(", ")}. The current statute wording is separately observed as of ${FISCAL_AUTHORITY_AS_OF}; continuous wording between those evidence points and later amendment dates are not established.`;

export const FISCAL_AUTHORITY_DECLARATIONS: readonly FiscalAuthorityDeclaration[] =
  [
    {
      kind: "TAX_INSTRUMENT",
      ...SOURCES.sales,
      level: "COUNTY",
      instrument: "GENERAL_SALES_TAX",
      value: "AUTHORIZED_WITH_VOTER_APPROVAL",
      citation: "Alaska Stat. §§ 29.45.650, 29.45.670",
      excerpt:
        "a borough may levy and collect a sales tax on sales, rents, and services provided in the borough.",
      paraphrase:
        "An Alaska borough may levy a sales tax on covered sources, subject to statutory exceptions and voter ratification for a new tax or rate increase.",
      constraints: [
        "A new sales and use tax or rate increase must be ratified by a majority of voters.",
        "The statute states source-specific exclusions and permits exemptions by ordinance.",
      ],
      derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
    },
    {
      kind: "TAX_INSTRUMENT",
      ...SOURCES.sales,
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      value: "AUTHORIZED_WITH_VOTER_APPROVAL",
      citation: "Alaska Stat. §§ 29.45.670, 29.45.700",
      excerpt:
        "A city outside a borough may levy and collect sales and use taxes in the manner provided for boroughs.",
      paraphrase:
        "An Alaska city may levy sales and use taxes under the routes in § 29.45.700, subject to borough relationships, statutory exclusions, and voter ratification for a new tax or rate increase.",
      constraints: [
        "The applicable route depends on whether the city is inside a borough and whether the borough levies an areawide tax.",
        "A new sales and use tax or rate increase must be ratified by a majority of voters.",
        "The statute states source-specific exclusions.",
      ],
      derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
    },
    ...(["COUNTY", "MUNICIPALITY"] as const).flatMap((level) => [
      {
        kind: "FISCAL_RULE" as const,
        ...SOURCES.sales,
        level,
        field: "LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED" as const,
        value: true,
        citation: "Alaska Stat. § 29.45.670",
        excerpt: REFERENDUM_EXCERPT,
        paraphrase:
          "A new local sales and use tax or a sales-tax rate increase approved by ordinance requires ratification by a majority of voters before taking effect.",
        constraints: [
          "The rule applies to a new sales and use tax or an increase in a sales-tax levy rate.",
        ],
        derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
      },
      {
        kind: "FISCAL_RULE" as const,
        ...SOURCES.sales,
        level,
        field: "TAX_INCREASE_VOTE_REQUIREMENT" as const,
        value: "VOTER_APPROVAL_REQUIRED",
        citation: "Alaska Stat. § 29.45.670",
        excerpt: REFERENDUM_EXCERPT,
        paraphrase:
          "The covered local sales-tax action requires voter approval after ordinance adoption.",
        constraints: [
          "This record is limited to the sales-and-use-tax action described by § 29.45.670; it is not a universal rule for every tax instrument.",
        ],
        derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
      },
    ]),
    {
      kind: "TAX_INSTRUMENT",
      ...SOURCES.property,
      level: "COUNTY",
      instrument: "PROPERTY_TAX",
      value: "AUTHORIZED",
      citation: "Alaska Stat. § 29.45.010(a)",
      excerpt:
        "A borough may levy (1) an areawide property tax for areawide functions; (2) a nonareawide property tax for functions limited to the area outside cities; (3) a property tax in a service area for functions limited to the service area.",
      paraphrase:
        "An Alaska borough may levy property tax for the areawide, nonareawide, and service-area functions identified by statute.",
      constraints: [
        "The purpose and geographic reach depend on whether the levy supports an areawide, nonareawide, or service-area function.",
        "Assessment, levy, and collection remain subject to Alaska Statutes title 29, chapter 45.",
      ],
      derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
    },
    {
      kind: "TAX_INSTRUMENT",
      ...SOURCES.property,
      level: "MUNICIPALITY",
      instrument: "PROPERTY_TAX",
      value: "AUTHORIZED",
      citation: "Alaska Stat. § 29.45.010(b)",
      excerpt:
        "A home rule or first class city may levy a property tax subject to AS 29.45.550 — 29.45.560. A second class city may levy a property tax subject to AS 29.45.590 .",
      paraphrase:
        "Alaska cities may levy property tax through the routes stated for home-rule, first-class, and second-class cities.",
      constraints: [
        "Home-rule and first-class cities are subject to §§ 29.45.550-.560.",
        "Second-class cities are subject to § 29.45.590.",
        "Assessment, levy, and collection remain subject to Alaska Statutes title 29, chapter 45.",
      ],
      derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
    },
    ...(["COUNTY", "MUNICIPALITY"] as const).flatMap((level) => [
      {
        kind: "FISCAL_RULE" as const,
        ...SOURCES.property,
        level,
        field: "NOMINAL_MILLAGE_CAP_MILLS" as const,
        value: 30,
        citation: "Alaska Stat. §§ 29.45.090(a), 29.45.100",
        excerpt:
          "A municipality may not, during a year, levy an ad valorem tax for any purpose in excess of three percent of the assessed value of property in the municipality.",
        paraphrase:
          "The ordinary municipal ad valorem ceiling is three percent of assessed value, arithmetically equivalent to 30 mills; bond-payment levies are outside that ceiling under § 29.45.100.",
        constraints: [
          "Thirty mills is the exact unit conversion of the enacted three-percent ceiling; it is not a separately stated statutory number.",
          "Section 29.45.100 excludes taxes levied or pledged for bond principal and interest from the §§ 29.45.080-.090 limitations.",
          "All property subject to the ad valorem levy must be taxed at the same rate during the year.",
        ],
        derivationChain: `${TITLE_29_EFFECTIVE_DATE_DERIVATION} Value conversion: 3 percent × 10 mills per percentage point = 30 mills.`,
      },
      {
        kind: "FISCAL_RULE" as const,
        ...SOURCES.bonds,
        level,
        field: "LOCAL_GO_BOND_VOTER_HURDLE" as const,
        value: "SIMPLE_MAJORITY",
        citation: "Alaska Stat. § 29.47.190(a)",
        excerpt:
          "A municipality may incur general obligation bond debt only after a bond authorization ordinance is approved by a majority vote at an election.",
        paraphrase:
          "A municipality may incur general-obligation bond debt only after voters approve the bond authorization ordinance by majority vote.",
        constraints: [
          "The record describes authorization of municipal general-obligation bond debt, not revenue bonds or an observed debt balance.",
          "Any municipal voter may vote except as otherwise provided by law.",
        ],
        derivationChain: TITLE_29_EFFECTIVE_DATE_DERIVATION,
      },
    ]),
  ];

function evidence(artifactId: string, citation: string): Evidence {
  return {
    artifactId,
    locator: {
      kind: "legal-section",
      artifactId,
      citation,
      pageOrSection: citation,
    },
  };
}

function citedAuthority(
  declaration: FiscalAuthorityDeclaration,
  lockedParentSha256: string,
): CitedFiscalAuthority {
  return {
    authorityType: "Enacted Statute",
    artifactKind: "ENACTED_STATUTE",
    artifactId: declaration.artifactId,
    lineage: "FIRST_PARTY_LEGAL_ARTIFACT",
    legalLocator: declaration.citation,
    authorityUrl: declaration.authorityUrl,
    enactedDate: null,
    effectiveDate: EFFECTIVE_FROM,
    lastAmendedDate: null,
    observedDate: FISCAL_AUTHORITY_AS_OF,
    versionApplicability: "FOUNDATIONAL_AND_OBSERVED_POINTS",
    derivation: declaration.derivationChain ? "DERIVED" : "DIRECT",
    derivationChain: declaration.derivationChain
      ? `${declaration.derivationChain} Locked publisher PDF SHA-256 ${lockedParentSha256}.`
      : null,
    derivationArtifactIds: declaration.derivationChain
      ? [
          ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
          ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID,
        ]
      : [],
    paraphrase: declaration.paraphrase,
  };
}

export function compileFiscalAuthorityDeclarations(
  opened: Readonly<Record<string, OpenedArtifact>>,
  declarations: readonly FiscalAuthorityDeclaration[] = FISCAL_AUTHORITY_DECLARATIONS,
): readonly FiscalAuthorityRecord[] {
  const sessionLaw = opened[ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID];
  if (!sessionLaw) {
    throw new Error(
      `Missing opened artifact ${ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID}.`,
    );
  }
  assertAlaskaSessionLawEnactedText(sessionLaw.bytes);
  const lockedParentSha256 = sessionLaw.artifact.derivation?.parentSha256;
  if (!lockedParentSha256) {
    throw new Error(
      `${ALASKA_SESSION_LAW_EXTRACT_ARTIFACT_ID} has no locked parent digest.`,
    );
  }
  return declarations.map((declaration) => {
    const artifact = opened[declaration.artifactId];
    if (!artifact)
      throw new Error(`Missing opened artifact ${declaration.artifactId}.`);
    const text = normalizeRetrievedText(artifact.bytes);
    if (!text.includes(declaration.excerpt)) {
      throw new Error(
        `${declaration.citation} no longer contains its declared excerpt in ${declaration.artifactId}.`,
      );
    }
    const source = evidence(declaration.artifactId, declaration.citation);
    const base = {
      stateUsps: "AK",
      level: declaration.level,
      citedAuthority: citedAuthority(declaration, lockedParentSha256),
      normalizationReviewRequired: false,
      evidence: source,
      constraints: declaration.constraints,
    } as const;

    return declaration.kind === "TAX_INSTRUMENT"
      ? {
          ...base,
          kind: "TAX_INSTRUMENT" as const,
          recordId: `AK:${declaration.level}:instrument:${declaration.instrument}`,
          instrument: declaration.instrument,
          authorization: known(
            declaration.value,
            [source],
            "FINAL",
            FISCAL_AUTHORITY_AS_OF,
          ),
          searchedScope: null,
        }
      : {
          ...base,
          kind: "FISCAL_RULE" as const,
          recordId: `AK:${declaration.level}:rule:${declaration.field}`,
          field: declaration.field,
          rule: known(
            declaration.value,
            [source],
            "FINAL",
            FISCAL_AUTHORITY_AS_OF,
          ),
        };
  });
}
