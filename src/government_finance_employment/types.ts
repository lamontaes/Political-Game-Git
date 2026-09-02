/**
 * Source Schema & Types for State & Local Government Finance and Public Employment & Payroll
 *
 * Grounded in:
 * - U.S. Census Bureau State and Local Government Finances (2017-2024 published developer series)
 * - U.S. Census Bureau Annual Survey of Public Employment & Payroll (1992-2025 published developer series)
 * - Census Government Finance and Employment Classification Manuals
 */

/**
 * 14-digit Census Government Identification Code
 * Format: [State 2d][Type 1d][County 3d][Unit 3d][Function 3d][Subunit 2d]
 */
export type CensusGovId = string;

/**
 * Standard Government Classification per Census Bureau methodology
 */
export type GovernmentClass =
  | "federal"
  | "state"
  | "county"
  | "municipal"
  | "township"
  | "special_district"
  | "school_district";

export type GovernmentLevel = "federal" | "state" | "local";

/**
 * Enumeration and sampling methodology metadata
 */
export type EnumerationType =
  | "complete_census" // 5-year Census of Governments (e.g. 2017, 2022)
  | "annual_survey_sample" // Annual Survey of State/Local Gov Finances / APEP probability sample
  | "state_level_aggregate" // Census state-area aggregate
  | "national_aggregate" // Census national aggregate
  | "administrative_compilation"; // Explicit direct ACFR/CAFR compilation

export type RevisionStatus = "preliminary" | "revised" | "final";

export type ReferenceMonth = "March" | "October";

export interface DataQualityFlag {
  readonly imputed: boolean;
  readonly samplingErrorCvPercent?: number | null;
  readonly samplingWeight?: number | null;
  readonly vintage: string;
  readonly releaseDate: string;
  readonly revisionStatus: RevisionStatus;
  readonly notes?: readonly string[];
}

export interface FunctionCompatibilityFlag {
  readonly isDefinitionCompatible: boolean;
  readonly breakInSeries: boolean;
  readonly compatibilityNotes?: string;
  readonly historicalFunctionCode?: string;
}

export interface RecordProvenance {
  readonly sourceSystem: "US_CENSUS_BUREAU";
  readonly surveyName:
    | "STATE_AND_LOCAL_GOVERNMENT_FINANCES"
    | "ANNUAL_SURVEY_OF_PUBLIC_EMPLOYMENT_AND_PAYROLL"
    | "CENSUS_OF_GOVERNMENTS";
  readonly sourceUrl?: string;
  readonly sourceFile?: string;
  readonly sourceLine?: number;
  readonly sourceHash: string; // SHA-256
  readonly extractedAt: string; // ISO 8601
  readonly methodologyCitation: string;
}

export interface GovernmentEntityMetadata {
  readonly govId: string; // Stable ID: e.g. "gov-census-18203400100000"
  readonly censusGovId: CensusGovId;
  readonly name: string;
  readonly statePostal: string;
  readonly stateFips: string;
  readonly countyFips?: string;
  readonly govClass: GovernmentClass;
  readonly govLevel: GovernmentLevel;
  readonly population?: number;
  readonly populationYear?: number;
  readonly schoolEnrollment?: number;
  readonly isConsolidatedGovernment?: boolean;
}

/* =========================================================================
 * GOVERNMENT FINANCE TYPES (All amounts in integer US Dollars or null)
 * ========================================================================= */

export interface SelectiveSalesTaxes {
  readonly total: number | null;
  readonly motorFuelTaxes?: number | null;
  readonly alcoholicBeverageTaxes?: number | null;
  readonly tobaccoTaxes?: number | null;
  readonly publicUtilityTaxes?: number | null;
  readonly insurancePremiumTaxes?: number | null;
  readonly otherSelectiveSalesTaxes?: number | null;
}

export interface LicenseTaxes {
  readonly total: number | null;
  readonly motorVehicleLicenses?: number | null;
  readonly vehicleOperatorLicenses?: number | null;
  readonly corporationLicenses?: number | null;
  readonly alcoholicBeverageLicenses?: number | null;
  readonly otherLicenses?: number | null;
}

export interface OtherTaxes {
  readonly total: number | null;
  readonly severanceTaxes?: number | null;
  readonly estateAndGiftTaxes?: number | null;
  readonly documentaryAndStockTransferTaxes?: number | null;
  readonly otherMiscellaneousTaxes?: number | null;
}

export interface TaxRevenueBreakdown {
  readonly totalTaxes: number | null;
  readonly propertyTaxes: number | null;
  readonly generalSalesTaxes: number | null;
  readonly selectiveSalesTaxes: SelectiveSalesTaxes | null;
  readonly individualIncomeTaxes: number | null;
  readonly corporateIncomeTaxes: number | null;
  readonly licenseTaxes: LicenseTaxes | null;
  readonly otherTaxes: OtherTaxes | null;
}

export interface IntergovernmentalRevenueBreakdown {
  readonly total: number | null;
  readonly fromFederal: number | null;
  readonly fromState: number | null;
  readonly fromLocal: number | null;
}

export interface CurrentChargesBreakdown {
  readonly total: number | null;
  readonly educationCharges?: number | null;
  readonly higherEducationTuitionCharges?: number | null;
  readonly hospitalCharges?: number | null;
  readonly highwayChargesAndTolls?: number | null;
  readonly sewerageCharges?: number | null;
  readonly solidWasteManagementCharges?: number | null;
  readonly parksAndRecreationCharges?: number | null;
  readonly naturalResourcesCharges?: number | null;
  readonly airTransportationCharges?: number | null;
  readonly waterTransportationCharges?: number | null;
  readonly parkingFacilityCharges?: number | null;
  readonly otherCharges?: number | null;
}

export interface MiscellaneousGeneralRevenueBreakdown {
  readonly total: number | null;
  readonly specialAssessments?: number | null;
  readonly interestEarnings?: number | null;
  readonly saleOfProperty?: number | null;
  readonly otherMiscellaneous?: number | null;
}

export interface UtilityRevenueBreakdown {
  readonly total: number | null;
  readonly waterSupplyUtility?: number | null;
  readonly electricUtility?: number | null;
  readonly gasUtility?: number | null;
  readonly transitUtility?: number | null;
}

export interface InsuranceTrustRevenueBreakdown {
  readonly total: number | null;
  readonly employeeRetirement?: number | null;
  readonly unemploymentCompensation?: number | null;
  readonly workersCompensation?: number | null;
  readonly otherInsuranceTrust?: number | null;
}

export interface IntergovernmentalExpenditureBreakdown {
  readonly total: number | null;
  readonly toState?: number | null;
  readonly toLocal?: number | null;
  readonly toFederal?: number | null;
}

export interface CapitalOutlayBreakdown {
  readonly total: number | null;
  readonly construction?: number | null;
  readonly landAndExistingStructures?: number | null;
  readonly equipment?: number | null;
}

export interface CharacterExpenditureBreakdown {
  readonly currentOperation: number | null;
  readonly capitalOutlay: CapitalOutlayBreakdown | null;
  readonly assistanceAndSubsidies: number | null;
  readonly interestOnGeneralDebt: number | null;
  readonly insuranceBenefitsAndRepayments: number | null;
}

export interface FunctionalAmountBreakdown {
  readonly currentOperation: number | null;
  readonly capitalOutlay: number | null;
  readonly assistanceAndSubsidies?: number | null;
  readonly total: number | null;
}

export interface FunctionalExpenditureMap {
  readonly educationElementarySecondary?: FunctionalAmountBreakdown | null;
  readonly educationHigher?: FunctionalAmountBreakdown | null;
  readonly educationOther?: FunctionalAmountBreakdown | null;
  readonly libraries?: FunctionalAmountBreakdown | null;
  readonly publicWelfare?: FunctionalAmountBreakdown | null;
  readonly hospitals?: FunctionalAmountBreakdown | null;
  readonly health?: FunctionalAmountBreakdown | null;
  readonly highways?: FunctionalAmountBreakdown | null;
  readonly policeProtection?: FunctionalAmountBreakdown | null;
  readonly fireProtection?: FunctionalAmountBreakdown | null;
  readonly correction?: FunctionalAmountBreakdown | null;
  readonly naturalResources?: FunctionalAmountBreakdown | null;
  readonly parksAndRecreation?: FunctionalAmountBreakdown | null;
  readonly housingAndCommunityDevelopment?: FunctionalAmountBreakdown | null;
  readonly sewerage?: FunctionalAmountBreakdown | null;
  readonly solidWasteManagement?: FunctionalAmountBreakdown | null;
  readonly financialAdministration?: FunctionalAmountBreakdown | null;
  readonly judicialAndLegal?: FunctionalAmountBreakdown | null;
  readonly generalPublicBuildings?: FunctionalAmountBreakdown | null;
  readonly otherGovernmentAdministration?: FunctionalAmountBreakdown | null;
  readonly interestOnGeneralDebt?: FunctionalAmountBreakdown | null;
  readonly utilitiesWaterSupply?: FunctionalAmountBreakdown | null;
  readonly utilitiesElectricPower?: FunctionalAmountBreakdown | null;
  readonly utilitiesGasSupply?: FunctionalAmountBreakdown | null;
  readonly utilitiesTransit?: FunctionalAmountBreakdown | null;
  readonly otherAndUnallocable?: FunctionalAmountBreakdown | null;
}

export interface UtilityExpenditureBreakdown {
  readonly total: number | null;
  readonly waterSupply?: number | null;
  readonly electricPower?: number | null;
  readonly gasSupply?: number | null;
  readonly transit?: number | null;
}

export interface LongTermDebtBreakdown {
  readonly total: number | null;
  readonly fullFaithAndCredit: number | null;
  readonly nonguaranteedRevenueDebt: number | null;
  readonly utilityDebt?: number | null;
  readonly privatePurposeDebt?: number | null;
}

export interface DebtOutstandingBreakdown {
  readonly total: number | null;
  readonly shortTermDebt: number | null;
  readonly longTermDebt: LongTermDebtBreakdown | null;
}

export interface NonInsuranceTrustFundsBreakdown {
  readonly total: number | null;
  readonly sinkingFunds?: number | null;
  readonly bondFunds?: number | null;
  readonly otherFunds?: number | null;
}

export interface CashAndSecuritiesBreakdown {
  readonly total: number | null;
  readonly insuranceTrustFunds?: number | null;
  readonly nonInsuranceTrustFunds: NonInsuranceTrustFundsBreakdown | null;
}

export interface FinanceRecord {
  readonly recordId: string; // "gov-fin-${censusGovId}-${fiscalYear}-${vintage}"
  readonly govId: string;
  readonly censusGovId: CensusGovId;
  readonly fiscalYear: number;
  readonly enumerationType: EnumerationType;
  readonly quality: DataQualityFlag;

  // Revenues
  readonly totalRevenue: number | null;
  readonly generalRevenue: number | null;
  readonly ownSourceRevenue: number | null;
  readonly taxes: TaxRevenueBreakdown | null;
  readonly intergovernmentalRevenue: IntergovernmentalRevenueBreakdown | null;
  readonly currentCharges: CurrentChargesBreakdown | null;
  readonly miscellaneousGeneralRevenue: MiscellaneousGeneralRevenueBreakdown | null;
  readonly utilityRevenue: UtilityRevenueBreakdown | null;
  readonly liquorStoreRevenue: number | null;
  readonly insuranceTrustRevenue: InsuranceTrustRevenueBreakdown | null;

  // Expenditures
  readonly totalExpenditure: number | null;
  readonly directExpenditure: number | null;
  readonly directGeneralExpenditure: number | null;
  readonly intergovernmentalExpenditure: IntergovernmentalExpenditureBreakdown | null;
  readonly characterExpenditure: CharacterExpenditureBreakdown | null;
  readonly functionalExpenditures: FunctionalExpenditureMap | null;
  readonly utilityExpenditure: UtilityExpenditureBreakdown | null;
  readonly liquorStoreExpenditure: number | null;
  readonly insuranceTrustExpenditure: number | null;

  // Debt
  readonly debtOutstandingEndYear: DebtOutstandingBreakdown | null;
  readonly debtIssuedDuringYear: number | null;
  readonly debtRetiredDuringYear: number | null;

  // Cash and Securities (Assets)
  readonly cashAndSecuritiesEndYear: CashAndSecuritiesBreakdown | null;

  readonly provenance: RecordProvenance;
}

/* =========================================================================
 * GOVERNMENT EMPLOYMENT & PAYROLL TYPES
 * ========================================================================= */

export interface EmploymentRecord {
  readonly recordId: string; // "gov-emp-${censusGovId}-${surveyYear}-${functionCode}-${vintage}"
  readonly govId: string;
  readonly censusGovId: CensusGovId;
  readonly surveyYear: number;
  readonly referenceMonth: ReferenceMonth;
  readonly enumerationType: EnumerationType;
  readonly functionCode: string; // e.g. "000", "012", "024", "025", "055", etc.
  readonly functionName: string;
  readonly fullTimeEmployees: number | null;
  readonly fullTimePayroll: number | null; // Monthly payroll in US dollars
  readonly partTimeEmployees: number | null;
  readonly partTimePayroll: number | null; // Monthly payroll in US dollars
  readonly partTimeHours: number | null; // Monthly part-time hours
  readonly fullTimeEquivalentEmployees: number | null;
  readonly totalEmployees: number | null; // Full-time + Part-time
  readonly totalPayroll: number | null; // Full-time payroll + Part-time payroll
  readonly averageFullTimeSalary: number | null; // Monthly full-time salary
  readonly quality: DataQualityFlag;
  readonly compatibility: FunctionCompatibilityFlag;
  readonly provenance: RecordProvenance;
}

export interface GovernmentEmploymentSummary {
  readonly govId: string;
  readonly censusGovId: CensusGovId;
  readonly surveyYear: number;
  readonly referenceMonth: ReferenceMonth;
  readonly enumerationType: EnumerationType;
  readonly totalEmployees: number | null;
  readonly fullTimeEmployees: number | null;
  readonly partTimeEmployees: number | null;
  readonly fullTimeEquivalentEmployees: number | null;
  readonly totalMonthlyPayroll: number | null;
  readonly fullTimeMonthlyPayroll: number | null;
  readonly partTimeMonthlyPayroll: number | null;
  readonly functions: readonly EmploymentRecord[];
  readonly quality: DataQualityFlag;
  readonly provenance: RecordProvenance;
}

/* =========================================================================
 * LONGITUDINAL SERIES & MANIFEST TYPES
 * ========================================================================= */

export interface LongitudinalFinanceSeries {
  readonly govId: string;
  readonly censusGovId: CensusGovId;
  readonly years: readonly number[];
  readonly records: readonly FinanceRecord[];
  readonly metadata: {
    readonly hasCensusYears: boolean;
    readonly hasSurveyYears: boolean;
    readonly isStrictlyUninterpolated: true;
    readonly detectedDefinitionBreaks: readonly string[];
  };
}

export interface LongitudinalEmploymentSeries {
  readonly govId: string;
  readonly censusGovId: CensusGovId;
  readonly years: readonly number[];
  readonly summaries: readonly GovernmentEmploymentSummary[];
  readonly metadata: {
    readonly hasCensusYears: boolean;
    readonly hasSurveyYears: boolean;
    readonly hasOctoberToMarchTransition: boolean;
    readonly isStrictlyUninterpolated: true;
    readonly detectedDefinitionBreaks: readonly string[];
  };
}

export interface SourceCitation {
  readonly id: string;
  readonly title: string;
  readonly publisher: "U.S. Census Bureau";
  readonly program:
    | "State and Local Government Finances"
    | "Annual Survey of Public Employment & Payroll"
    | "Census of Governments";
  readonly timeRange: string;
  readonly methodologyUrl: string;
  readonly developerUrl: string;
  readonly notes: string;
}

export interface NationalCoverageManifest {
  readonly manifestVersion: string;
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly sources: readonly SourceCitation[];
  readonly coverage: {
    readonly totalGovernments: number;
    readonly governmentsByClass: Record<GovernmentClass, number>;
    readonly governmentsByState: Record<string, number>;
    readonly financeYearsAvailable: readonly number[];
    readonly employmentYearsAvailable: readonly number[];
    readonly totalFinanceRecords: number;
    readonly totalEmploymentRecords: number;
  };
  readonly checksums: Record<string, string>;
  readonly vintages: readonly string[];
}
