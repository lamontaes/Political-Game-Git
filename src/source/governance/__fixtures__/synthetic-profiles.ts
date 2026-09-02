import type { EntityId, IsoDate } from "../types.js";
import type { JurisdictionProfile, ProvenanceRecord } from "../types.js";

/**
 * Standard Synthetic Provenance helper for fixtures.
 * Explicitly labeled SYNTHETIC.
 */
export const SYNTHETIC_FIXTURE_PROVENANCE: ProvenanceRecord = {
  sourceId: "src-synthetic-spec-v1",
  authoritativeUrl: "https://example.gov/synthetic-spec",
  publisher: "Synthetic Testing Framework Authority",
  effectiveDate: "2026-01-01" as IsoDate,
  locator: "Synthetic Article I, Section 1",
  sourceClassification: "CONSTITUTIONAL_PROVISION",
  retrievedAt: "2026-01-01" as IsoDate,
  notes: "SYNTHETIC FIXTURE - NOT A REAL JURISDICTION OR FACT DATABASE",
};

/**
 * 1. SYNTHETIC BICAMERAL STATE FIXTURE
 * Represents a fictional state with a Governor and Senate/House legislative structure.
 */
export const SYNTHETIC_BICAMERAL_STATE_PROFILE: JurisdictionProfile = {
  schemaVersion: "1.0.0",
  profileId: "profile:synthetic-bicameral-state-v1",
  isSynthetic: true,
  identity: {
    jurisdictionId: "jurisdiction:synthetic-state-alpha" as EntityId,
    officialName: {
      state: "KNOWN",
      value: "Synthetic Commonwealth of Alpha",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    jurisdictionType: {
      state: "KNOWN",
      value: "STATE",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    postalAbbreviation: {
      state: "KNOWN",
      value: "SA",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    censusFips: {
      state: "KNOWN",
      value: {
        fipsStateCode: "99",
        censusGeoId: "9900000",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    parentJurisdictionId: {
      state: "KNOWN",
      value: "jurisdiction:synthetic-federal" as EntityId,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    effectiveDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    vintageDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  institutions: {
    executiveStructure: {
      state: "KNOWN",
      value: {
        model: "SINGLE_EXECUTIVE",
        headOfGovernmentTitle: "Governor",
        isPluralExecutive: false,
        summaryDescription: "Synthetic single executive state model.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    legislativeChamberStructure: {
      state: "KNOWN",
      value: {
        model: "BICAMERAL",
        officialBodyName: "Synthetic General Assembly",
        chambers: [
          {
            chamberId: "chamber-senate",
            chamberName: "Synthetic Senate",
            chamberType: "STATE_SENATE",
            totalSeats: 30,
            apportionmentMethod: "Single-member districts",
          },
          {
            chamberId: "chamber-house",
            chamberName: "Synthetic House of Delegates",
            chamberType: "HOUSE_OF_REPRESENTATIVES",
            totalSeats: 60,
            apportionmentMethod: "Single-member districts",
          },
        ],
        summaryDescription: "Synthetic bicameral legislature.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    judicialStructuralSummary: {
      state: "KNOWN",
      value: {
        highCourtName: "Synthetic Supreme Court",
        tierLevels: [
          {
            tier: "COURT_OF_LAST_RESORT",
            name: "Supreme Court",
            selectionMethod:
              "Gubernatorial appointment with Senate confirmation",
          },
          {
            tier: "GENERAL_JURISDICTION_TRIAL",
            name: "Superior Court",
            selectionMethod: "Nonpartisan election",
          },
        ],
        summaryDescription:
          "Two-tiered judicial structure for synthetic state.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    constitutionalStatutoryOfficeTypes: {
      state: "KNOWN",
      value: [
        {
          officeTypeId: "office-type-governor",
          title: "Governor",
          branch: "EXECUTIVE",
          isConstitutional: true,
          summaryDescription: "Chief executive officer.",
        },
        {
          officeTypeId: "office-type-senator",
          title: "State Senator",
          branch: "LEGISLATIVE",
          isConstitutional: true,
          summaryDescription: "Member of upper legislative chamber.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  offices: {
    offices: [
      {
        officeId: "office:synthetic-governor",
        officeType: {
          state: "KNOWN",
          value: "Governor",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        selectionMethod: {
          state: "KNOWN",
          value: "PARTISAN_ELECTION",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLengthYears: {
          state: "KNOWN",
          value: 4,
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLimits: {
          state: "KNOWN",
          value: {
            exists: true,
            maxTerms: 2,
            lifetimeLimit: true,
            ruleDescription: "Synthetic two-term limit.",
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        staggerRules: {
          state: "KNOWN",
          value: {
            isStaggered: false,
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        eligibilityRules: {
          state: "KNOWN",
          value: [
            {
              minimumAgeYears: 30,
              residencyRequirementYears: 5,
              citizenshipRequired: true,
              registeredVoterRequired: true,
              legalCitation: "Synthetic Const. Art. II, Sec. 2",
              summaryDescription: "Age 30 and 5 years residency.",
            },
          ],
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
      },
    ],
  },
  electionStructure: {
    ordinaryCycleCadence: {
      state: "KNOWN",
      value: "QUADRENNIAL_PRESIDENTIAL_ALIGNED",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    primaryElectionType: {
      state: "KNOWN",
      value: "CLOSED_PRIMARY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    generalElectionType: {
      state: "KNOWN",
      value: "GENERAL_PLURALITY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    structuralTimingRules: {
      state: "KNOWN",
      value: [
        {
          eventType: "PRIMARY",
          timingFormula: "First Tuesday in June",
          month: 6,
        },
        {
          eventType: "GENERAL",
          timingFormula: "First Tuesday after first Monday in November",
          month: 11,
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    ruleSourceReferences: {
      state: "KNOWN",
      value: [
        {
          citation: "Synthetic Election Code Ch. 100",
          summary: "Governs general election timing.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  localGovernmentStructure: {
    countyModel: {
      state: "KNOWN",
      value: "TRADITIONAL_COUNTY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    municipalClassifications: {
      state: "KNOWN",
      value: [
        {
          className: "Class 1 City",
          populationThresholdMin: 100000,
          governanceModelDescription: "Mayor-Council form mandatory.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    townshipStructure: {
      state: "KNOWN",
      value: {
        existsInState: false,
        isOrganized: false,
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    homeRuleConcepts: {
      state: "KNOWN",
      value: "FULL_HOME_RULE",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    stateSpecificClassifications: {
      state: "KNOWN",
      value: ["Synthetic First-Class Municipality"],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  metadata: {
    createdAt: "2026-01-01" as IsoDate,
    lastUpdatedAt: "2026-01-01" as IsoDate,
    authorOrWorkerId: "worker:jules-synthetic-foundation",
    notes: "SYNTHETIC FIXTURE FOR TESTING BICAMERAL STATE SCHEMA",
  },
};

/**
 * 2. SYNTHETIC UNICAMERAL STATE FIXTURE
 * Represents a fictional state with a single nonpartisan legislative chamber.
 */
export const SYNTHETIC_UNICAMERAL_STATE_PROFILE: JurisdictionProfile = {
  schemaVersion: "1.0.0",
  profileId: "profile:synthetic-unicameral-state-v1",
  isSynthetic: true,
  identity: {
    jurisdictionId: "jurisdiction:synthetic-state-beta" as EntityId,
    officialName: {
      state: "KNOWN",
      value: "Synthetic State of Beta",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    jurisdictionType: {
      state: "KNOWN",
      value: "STATE",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    postalAbbreviation: {
      state: "KNOWN",
      value: "SB",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    censusFips: {
      state: "KNOWN",
      value: {
        fipsStateCode: "98",
        censusGeoId: "9800000",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    parentJurisdictionId: {
      state: "KNOWN",
      value: "jurisdiction:synthetic-federal" as EntityId,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    effectiveDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    vintageDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  institutions: {
    executiveStructure: {
      state: "KNOWN",
      value: {
        model: "SINGLE_EXECUTIVE",
        headOfGovernmentTitle: "Governor",
        isPluralExecutive: false,
        summaryDescription: "Synthetic single executive state.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    legislativeChamberStructure: {
      state: "KNOWN",
      value: {
        model: "UNICAMERAL",
        officialBodyName: "Synthetic Unicameral Legislature",
        chambers: [
          {
            chamberId: "chamber-unicameral-senate",
            chamberName: "Synthetic Legislature",
            chamberType: "UNAMENDED_UNICAMERAL",
            totalSeats: 49,
            apportionmentMethod: "Single-member districts",
          },
        ],
        summaryDescription: "Synthetic unicameral legislature.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    judicialStructuralSummary: {
      state: "KNOWN",
      value: {
        highCourtName: "Synthetic Supreme Court",
        tierLevels: [
          {
            tier: "COURT_OF_LAST_RESORT",
            name: "Supreme Court",
            selectionMethod: "Merit selection with retention vote",
          },
        ],
        summaryDescription: "Synthetic merit selection judicial tier.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    constitutionalStatutoryOfficeTypes: {
      state: "KNOWN",
      value: [
        {
          officeTypeId: "office-type-unicameral-senator",
          title: "Senator",
          branch: "LEGISLATIVE",
          isConstitutional: true,
          summaryDescription: "Member of unicameral legislature.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  offices: {
    offices: [
      {
        officeId: "office:synthetic-unicameral-senator",
        officeType: {
          state: "KNOWN",
          value: "Senator",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        selectionMethod: {
          state: "KNOWN",
          value: "NONPARTISAN_ELECTION",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLengthYears: {
          state: "KNOWN",
          value: 4,
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLimits: {
          state: "KNOWN",
          value: {
            exists: true,
            maxConsecutiveYears: 8,
            ruleDescription: "Maximum 8 consecutive years.",
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        staggerRules: {
          state: "KNOWN",
          value: {
            isStaggered: true,
            classCount: 2,
            staggerDescription: "Half elected every two years.",
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        eligibilityRules: {
          state: "KNOWN",
          value: [
            {
              minimumAgeYears: 21,
              residencyRequirementYears: 1,
              citizenshipRequired: true,
              registeredVoterRequired: true,
              legalCitation: "Synthetic Const. Art. III, Sec. 5",
              summaryDescription: "Age 21 and 1 year residency.",
            },
          ],
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
      },
    ],
  },
  electionStructure: {
    ordinaryCycleCadence: {
      state: "KNOWN",
      value: "EVEN_YEAR_BIENNIAL",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    primaryElectionType: {
      state: "KNOWN",
      value: "TOP_TWO_PRIMARY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    generalElectionType: {
      state: "KNOWN",
      value: "NONPARTISAN_GENERAL",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    structuralTimingRules: {
      state: "KNOWN",
      value: [
        {
          eventType: "PRIMARY",
          timingFormula: "Second Tuesday in May",
          month: 5,
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    ruleSourceReferences: {
      state: "KNOWN",
      value: [
        {
          citation: "Synthetic Unicameral Code Ch. 5",
          summary: "Governs nonpartisan election timing.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  localGovernmentStructure: {
    countyModel: {
      state: "KNOWN",
      value: "TRADITIONAL_COUNTY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    municipalClassifications: {
      state: "KNOWN",
      value: [],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    townshipStructure: {
      state: "KNOWN",
      value: {
        existsInState: true,
        isOrganized: true,
        townshipPowersDescription: "Synthetic organized townships.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    homeRuleConcepts: {
      state: "KNOWN",
      value: "CHARTER_BASED",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    stateSpecificClassifications: {
      state: "KNOWN",
      value: [],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  metadata: {
    createdAt: "2026-01-01" as IsoDate,
    lastUpdatedAt: "2026-01-01" as IsoDate,
    authorOrWorkerId: "worker:jules-synthetic-foundation",
    notes: "SYNTHETIC FIXTURE FOR TESTING UNICAMERAL STATE SCHEMA",
  },
};

/**
 * 3. SYNTHETIC ABSENT / UNKNOWN VALUE FIXTURE
 * Proves handling of unresearched (UNKNOWN) and non-applicable (NOT_APPLICABLE) values
 * without coercing UNKNOWN into false, 0, or null.
 */
export const SYNTHETIC_ABSENT_UNKNOWN_PROFILE: JurisdictionProfile = {
  schemaVersion: "1.0.0",
  profileId: "profile:synthetic-absent-unknown-v1",
  isSynthetic: true,
  identity: {
    jurisdictionId: "jurisdiction:synthetic-county-gamma" as EntityId,
    officialName: {
      state: "KNOWN",
      value: "Synthetic County of Gamma",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    jurisdictionType: {
      state: "KNOWN",
      value: "COUNTY_EQUIVALENT",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    postalAbbreviation: {
      state: "UNKNOWN",
      reason:
        "County level jurisdiction has no postal abbreviation; unresearched if local shortcode exists.",
    },
    censusFips: {
      state: "UNKNOWN",
      reason:
        "Census FIPS identifiers not yet populated for this synthetic county fixture.",
    },
    parentJurisdictionId: {
      state: "KNOWN",
      value: "jurisdiction:synthetic-state-alpha" as EntityId,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    effectiveDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    vintageDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  institutions: {
    executiveStructure: {
      state: "KNOWN",
      value: {
        model: "COMMISSION_EXECUTIVE",
        headOfGovernmentTitle: "County Board Chair",
        isPluralExecutive: true,
        summaryDescription: "Synthetic elected board of commissioners.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    legislativeChamberStructure: {
      state: "NOT_APPLICABLE",
      reason:
        "County executive board performs legislative functions; separate legislative chamber is not applicable.",
    },
    judicialStructuralSummary: {
      state: "UNKNOWN",
      reason: "Local court tier structure unresearched.",
    },
    constitutionalStatutoryOfficeTypes: {
      state: "UNKNOWN",
      reason: "Statutory county office list pending archival extraction.",
    },
  },
  offices: {
    offices: [
      {
        officeId: "office:synthetic-county-commissioner",
        officeType: {
          state: "KNOWN",
          value: "County Commissioner",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        selectionMethod: {
          state: "KNOWN",
          value: "PARTISAN_ELECTION",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLengthYears: {
          state: "KNOWN",
          value: 4,
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        termLimits: {
          state: "UNKNOWN",
          reason: "Term limits for synthetic county commissioner unresearched.",
        },
        staggerRules: {
          state: "UNKNOWN",
          reason: "Stagger cadence unresearched.",
        },
        eligibilityRules: {
          state: "UNKNOWN",
          reason: "Eligibility rule citations pending review.",
        },
      },
    ],
  },
  electionStructure: {
    ordinaryCycleCadence: {
      state: "KNOWN",
      value: "EVEN_YEAR_BIENNIAL",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    primaryElectionType: {
      state: "UNKNOWN",
      reason: "County primary rules unresearched.",
    },
    generalElectionType: {
      state: "KNOWN",
      value: "GENERAL_PLURALITY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    structuralTimingRules: {
      state: "UNKNOWN",
      reason: "Timing rules unresearched.",
    },
    ruleSourceReferences: {
      state: "UNKNOWN",
      reason: "Rule citations unresearched.",
    },
  },
  localGovernmentStructure: {
    countyModel: {
      state: "KNOWN",
      value: "TRADITIONAL_COUNTY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    municipalClassifications: {
      state: "NOT_APPLICABLE",
      reason: "Municipal classification rules belong to state, not county.",
    },
    townshipStructure: {
      state: "NOT_APPLICABLE",
      reason: "Township structure defined at state level.",
    },
    homeRuleConcepts: {
      state: "UNKNOWN",
      reason: "County charter home rule status unresearched.",
    },
    stateSpecificClassifications: {
      state: "NOT_APPLICABLE",
      reason: "Not applicable to county entity directly.",
    },
  },
  metadata: {
    createdAt: "2026-01-01" as IsoDate,
    lastUpdatedAt: "2026-01-01" as IsoDate,
    authorOrWorkerId: "worker:jules-synthetic-foundation",
    notes: "SYNTHETIC FIXTURE FOR TESTING ABSENT AND UNKNOWN VALUES",
  },
};

/**
 * 4. SYNTHETIC HISTORICAL TRANSITION FIXTURE
 * Proves representation of superseded historical institutional/office values over time.
 */
export const SYNTHETIC_HISTORICAL_TRANSITION_PROFILE: JurisdictionProfile = {
  schemaVersion: "1.0.0",
  profileId: "profile:synthetic-historical-transition-v1",
  isSynthetic: true,
  identity: {
    jurisdictionId: "jurisdiction:synthetic-city-delta" as EntityId,
    officialName: {
      state: "KNOWN",
      value: "Synthetic City of Delta",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    jurisdictionType: {
      state: "KNOWN",
      value: "MUNICIPALITY",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    postalAbbreviation: {
      state: "NOT_APPLICABLE",
      reason: "Municipalities do not have state postal abbreviations.",
    },
    censusFips: {
      state: "KNOWN",
      value: {
        fipsPlaceCode: "99999",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    parentJurisdictionId: {
      state: "KNOWN",
      value: "jurisdiction:synthetic-county-gamma" as EntityId,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    effectiveDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    vintageDate: {
      state: "KNOWN",
      value: "2026-01-01" as IsoDate,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  institutions: {
    executiveStructure: {
      state: "KNOWN",
      value: {
        model: "COUNCIL_MANAGER",
        headOfGovernmentTitle: "City Manager",
        isPluralExecutive: false,
        summaryDescription:
          "Council-Manager government adopted via charter amendment in 2010.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    legislativeChamberStructure: {
      state: "HISTORICAL",
      value: {
        model: "BICAMERAL",
        officialBodyName: "Synthetic City Council & Board of Aldermen",
        chambers: [
          {
            chamberId: "chamber-aldermen",
            chamberName: "Board of Aldermen",
            chamberType: "CITY_COUNCIL",
            totalSeats: 12,
            apportionmentMethod: "Ward",
          },
          {
            chamberId: "chamber-common-council",
            chamberName: "Common Council",
            chamberType: "CITY_COUNCIL",
            totalSeats: 6,
            apportionmentMethod: "At-large",
          },
        ],
        summaryDescription: "Abolished bicameral municipal council structure.",
      },
      effectiveStart: "1900-01-01" as IsoDate,
      effectiveEnd: "2009-12-31" as IsoDate,
      supersedingReason:
        "Charter reform merged chambers into unicameral City Council.",
      provenance: {
        ...SYNTHETIC_FIXTURE_PROVENANCE,
        sourceId: "src-charter-reform-2009",
        locator: "Charter Reform Act of 2009, Sec. 4",
      },
    },
    judicialStructuralSummary: {
      state: "KNOWN",
      value: {
        highCourtName: "Municipal Court",
        tierLevels: [
          {
            tier: "LIMITED_JURISDICTION_TRIAL",
            name: "Municipal Court",
            selectionMethod: "Council appointment",
          },
        ],
        summaryDescription: "Single limited jurisdiction municipal court.",
      },
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    constitutionalStatutoryOfficeTypes: {
      state: "KNOWN",
      value: [
        {
          officeTypeId: "office-type-city-manager",
          title: "City Manager",
          branch: "EXECUTIVE",
          isConstitutional: false,
          summaryDescription: "Appointed chief administrative officer.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  offices: {
    offices: [
      {
        officeId: "office:synthetic-mayor",
        officeType: {
          state: "KNOWN",
          value: "Mayor",
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        selectionMethod: {
          state: "HISTORICAL",
          value: "PARTISAN_ELECTION",
          effectiveStart: "1950-01-01" as IsoDate,
          effectiveEnd: "2009-12-31" as IsoDate,
          supersedingReason:
            "Switched to nonpartisan mayoral election in 2010 charter reform.",
          provenance: {
            ...SYNTHETIC_FIXTURE_PROVENANCE,
            sourceId: "src-charter-reform-2009",
            locator: "Charter Reform Act of 2009, Sec. 12",
          },
        },
        termLengthYears: {
          state: "HISTORICAL",
          value: 2,
          effectiveStart: "1950-01-01" as IsoDate,
          effectiveEnd: "2009-12-31" as IsoDate,
          supersedingReason: "Term length increased from 2 to 4 years in 2010.",
          provenance: {
            ...SYNTHETIC_FIXTURE_PROVENANCE,
            sourceId: "src-charter-reform-2009",
            locator: "Charter Reform Act of 2009, Sec. 14",
          },
        },
        termLimits: {
          state: "KNOWN",
          value: {
            exists: false,
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        staggerRules: {
          state: "KNOWN",
          value: {
            isStaggered: false,
          },
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
        eligibilityRules: {
          state: "KNOWN",
          value: [
            {
              minimumAgeYears: 18,
              residencyRequirementYears: 1,
              registeredVoterRequired: true,
              legalCitation: "Synthetic City Charter Sec. 3.01",
              summaryDescription: "Age 18 and 1 year city residence.",
            },
          ],
          provenance: SYNTHETIC_FIXTURE_PROVENANCE,
        },
      },
    ],
  },
  electionStructure: {
    ordinaryCycleCadence: {
      state: "KNOWN",
      value: "ODD_YEAR_BIENNIAL",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    primaryElectionType: {
      state: "KNOWN",
      value: "NONPARTISAN_GENERAL",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    generalElectionType: {
      state: "KNOWN",
      value: "GENERAL_MAJORITY_RUNOFF",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    structuralTimingRules: {
      state: "KNOWN",
      value: [
        {
          eventType: "GENERAL",
          timingFormula: "First Tuesday in November of odd years",
          month: 11,
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    ruleSourceReferences: {
      state: "KNOWN",
      value: [
        {
          citation: "Synthetic Municipal Code Ch. 2",
          summary: "Governs municipal odd-year elections.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  localGovernmentStructure: {
    countyModel: {
      state: "NOT_APPLICABLE",
      reason: "Jurisdiction is a city, not a county.",
    },
    municipalClassifications: {
      state: "KNOWN",
      value: [
        {
          className: "Charter City",
          governanceModelDescription:
            "Council-Manager under municipal charter.",
        },
      ],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    townshipStructure: {
      state: "NOT_APPLICABLE",
      reason: "Township structure not applicable inside municipal boundaries.",
    },
    homeRuleConcepts: {
      state: "KNOWN",
      value: "FULL_HOME_RULE",
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
    stateSpecificClassifications: {
      state: "KNOWN",
      value: ["Home Rule City"],
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    },
  },
  metadata: {
    createdAt: "2026-01-01" as IsoDate,
    lastUpdatedAt: "2026-01-01" as IsoDate,
    authorOrWorkerId: "worker:jules-synthetic-foundation",
    notes:
      "SYNTHETIC FIXTURE FOR TESTING HISTORICAL SUPERSEDED VALUE TRANSITIONS",
  },
};
