/**
 * Normalizer & Arithmetic Identity Engine for State and Local Government Finance Records
 *
 * Implements strict accounting identity verification and "no-missing-as-zero" guarantees.
 */

import type {
  FinanceRecord,
  TaxRevenueBreakdown,
  SelectiveSalesTaxes,
  LicenseTaxes,
  OtherTaxes,
  IntergovernmentalRevenueBreakdown,
  CurrentChargesBreakdown,
  MiscellaneousGeneralRevenueBreakdown,
  UtilityRevenueBreakdown,
  InsuranceTrustRevenueBreakdown,
  IntergovernmentalExpenditureBreakdown,
  CapitalOutlayBreakdown,
  CharacterExpenditureBreakdown,
  FunctionalExpenditureMap,
  UtilityExpenditureBreakdown,
  DebtOutstandingBreakdown,
  CashAndSecuritiesBreakdown,
  DataQualityFlag,
  RecordProvenance,
  EnumerationType,
  CensusGovId,
} from "./types.js";
import {
  createStableFinanceRecordId,
  createStableGovernmentId,
} from "./ids.js";

export interface RawFinanceInput {
  readonly censusGovId: CensusGovId;
  readonly fiscalYear: number;
  readonly enumerationType: EnumerationType;
  readonly quality: DataQualityFlag;
  readonly rawUnitMultiplier?: number; // 1 if dollars, 1000 if thousands (Census default is 1000)

  // Revenues (in raw units)
  readonly totalRevenue?: number | null;
  readonly generalRevenue?: number | null;
  readonly ownSourceRevenue?: number | null;

  // Taxes
  readonly totalTaxes?: number | null;
  readonly propertyTaxes?: number | null;
  readonly generalSalesTaxes?: number | null;
  readonly selectiveSalesMotorFuel?: number | null;
  readonly selectiveSalesAlcohol?: number | null;
  readonly selectiveSalesTobacco?: number | null;
  readonly selectiveSalesPublicUtilities?: number | null;
  readonly selectiveSalesInsurance?: number | null;
  readonly selectiveSalesOther?: number | null;
  readonly selectiveSalesTotal?: number | null;
  readonly individualIncomeTaxes?: number | null;
  readonly corporateIncomeTaxes?: number | null;
  readonly motorVehicleLicenses?: number | null;
  readonly corporationLicenses?: number | null;
  readonly licenseTaxesOther?: number | null;
  readonly licenseTaxesTotal?: number | null;
  readonly severanceTaxes?: number | null;
  readonly otherTaxesTotal?: number | null;

  // Intergovernmental Revenue
  readonly intergovernmentalTotal?: number | null;
  readonly intergovernmentalFromFederal?: number | null;
  readonly intergovernmentalFromState?: number | null;
  readonly intergovernmentalFromLocal?: number | null;

  // Current Charges
  readonly currentChargesTotal?: number | null;
  readonly educationCharges?: number | null;
  readonly hospitalCharges?: number | null;
  readonly highwayCharges?: number | null;
  readonly sewerageCharges?: number | null;
  readonly solidWasteCharges?: number | null;
  readonly parksCharges?: number | null;
  readonly airTransportCharges?: number | null;
  readonly otherCharges?: number | null;

  // Miscellaneous Revenue
  readonly miscGeneralRevenueTotal?: number | null;
  readonly interestEarnings?: number | null;
  readonly specialAssessments?: number | null;
  readonly saleOfProperty?: number | null;
  readonly otherMiscRevenue?: number | null;

  // Utility Revenue
  readonly utilityRevenueTotal?: number | null;
  readonly waterUtilityRevenue?: number | null;
  readonly electricUtilityRevenue?: number | null;
  readonly gasUtilityRevenue?: number | null;
  readonly transitUtilityRevenue?: number | null;

  readonly liquorStoreRevenue?: number | null;

  // Insurance Trust Revenue
  readonly insuranceTrustRevenueTotal?: number | null;
  readonly employeeRetirementRevenue?: number | null;
  readonly unemploymentCompensationRevenue?: number | null;

  // Expenditures
  readonly totalExpenditure?: number | null;
  readonly directExpenditure?: number | null;
  readonly directGeneralExpenditure?: number | null;

  // Intergovernmental Expenditure
  readonly intergovernmentalExpenditureTotal?: number | null;
  readonly intergovernmentalExpenditureToState?: number | null;
  readonly intergovernmentalExpenditureToLocal?: number | null;

  // Character
  readonly currentOperationExpenditure?: number | null;
  readonly capitalOutlayTotal?: number | null;
  readonly capitalOutlayConstruction?: number | null;
  readonly capitalOutlayLandStructures?: number | null;
  readonly capitalOutlayEquipment?: number | null;
  readonly assistanceAndSubsidies?: number | null;
  readonly interestOnGeneralDebt?: number | null;
  readonly insuranceBenefitsAndRepayments?: number | null;

  // Functional Expenditures
  readonly functionalExpenditures?: FunctionalExpenditureMap | null;

  // Utility Expenditure
  readonly utilityExpenditureTotal?: number | null;
  readonly waterUtilityExpenditure?: number | null;
  readonly electricUtilityExpenditure?: number | null;
  readonly gasUtilityExpenditure?: number | null;
  readonly transitUtilityExpenditure?: number | null;

  readonly liquorStoreExpenditure?: number | null;
  readonly insuranceTrustExpenditure?: number | null;

  // Debt
  readonly debtOutstandingTotal?: number | null;
  readonly debtShortTerm?: number | null;
  readonly debtLongTermTotal?: number | null;
  readonly debtLongTermFullFaith?: number | null;
  readonly debtLongTermNonguaranteed?: number | null;
  readonly debtIssuedDuringYear?: number | null;
  readonly debtRetiredDuringYear?: number | null;

  // Cash and Securities
  readonly cashSecuritiesTotal?: number | null;
  readonly cashSecuritiesInsuranceTrust?: number | null;
  readonly cashSecuritiesNonInsuranceTotal?: number | null;
  readonly cashSecuritiesSinkingFunds?: number | null;
  readonly cashSecuritiesBondFunds?: number | null;
  readonly cashSecuritiesOtherFunds?: number | null;

  readonly provenance: RecordProvenance;
}

/**
 * Multiplies a raw amount by the unit multiplier (e.g. 1000 for Census thousands)
 * preserving null/undefined exactly.
 */
function scale(
  val: number | null | undefined,
  multiplier: number,
): number | null {
  if (val === null || val === undefined) return null;
  return Math.round(val * multiplier);
}

export function normalizeFinanceRecord(input: RawFinanceInput): FinanceRecord {
  const mult = input.rawUnitMultiplier ?? 1;

  // 1. Taxes
  let selectiveSales: SelectiveSalesTaxes | null = null;
  const selTotal = scale(input.selectiveSalesTotal, mult);
  const selFuel = scale(input.selectiveSalesMotorFuel, mult);
  const selAlc = scale(input.selectiveSalesAlcohol, mult);
  const selTob = scale(input.selectiveSalesTobacco, mult);
  const selUtil = scale(input.selectiveSalesPublicUtilities, mult);
  const selIns = scale(input.selectiveSalesInsurance, mult);
  const selOther = scale(input.selectiveSalesOther, mult);

  if (
    selTotal !== null ||
    selFuel !== null ||
    selAlc !== null ||
    selTob !== null ||
    selUtil !== null ||
    selIns !== null ||
    selOther !== null
  ) {
    selectiveSales = {
      total: selTotal,
      motorFuelTaxes: selFuel,
      alcoholicBeverageTaxes: selAlc,
      tobaccoTaxes: selTob,
      publicUtilityTaxes: selUtil,
      insurancePremiumTaxes: selIns,
      otherSelectiveSalesTaxes: selOther,
    };
  }

  let licenses: LicenseTaxes | null = null;
  const licTotal = scale(input.licenseTaxesTotal, mult);
  const licVeh = scale(input.motorVehicleLicenses, mult);
  const licCorp = scale(input.corporationLicenses, mult);
  const licOther = scale(input.licenseTaxesOther, mult);
  if (
    licTotal !== null ||
    licVeh !== null ||
    licCorp !== null ||
    licOther !== null
  ) {
    licenses = {
      total: licTotal,
      motorVehicleLicenses: licVeh,
      corporationLicenses: licCorp,
      otherLicenses: licOther,
    };
  }

  let otherTaxes: OtherTaxes | null = null;
  const othTaxTotal = scale(input.otherTaxesTotal, mult);
  const sevTax = scale(input.severanceTaxes, mult);
  if (othTaxTotal !== null || sevTax !== null) {
    otherTaxes = {
      total: othTaxTotal,
      severanceTaxes: sevTax,
    };
  }

  const totalTaxes = scale(input.totalTaxes, mult);
  const propTaxes = scale(input.propertyTaxes, mult);
  const genSales = scale(input.generalSalesTaxes, mult);
  const indInc = scale(input.individualIncomeTaxes, mult);
  const corpInc = scale(input.corporateIncomeTaxes, mult);

  let taxes: TaxRevenueBreakdown | null = null;
  if (
    totalTaxes !== null ||
    propTaxes !== null ||
    genSales !== null ||
    selectiveSales !== null ||
    indInc !== null ||
    corpInc !== null ||
    licenses !== null ||
    otherTaxes !== null
  ) {
    taxes = {
      totalTaxes,
      propertyTaxes: propTaxes,
      generalSalesTaxes: genSales,
      selectiveSalesTaxes: selectiveSales,
      individualIncomeTaxes: indInc,
      corporateIncomeTaxes: corpInc,
      licenseTaxes: licenses,
      otherTaxes: otherTaxes,
    };
  }

  // 2. Intergovernmental Revenue
  let intergovernmentalRevenue: IntergovernmentalRevenueBreakdown | null = null;
  const igTotal = scale(input.intergovernmentalTotal, mult);
  const igFed = scale(input.intergovernmentalFromFederal, mult);
  const igState = scale(input.intergovernmentalFromState, mult);
  const igLocal = scale(input.intergovernmentalFromLocal, mult);
  if (
    igTotal !== null ||
    igFed !== null ||
    igState !== null ||
    igLocal !== null
  ) {
    intergovernmentalRevenue = {
      total: igTotal,
      fromFederal: igFed,
      fromState: igState,
      fromLocal: igLocal,
    };
  }

  // 3. Current Charges
  let currentCharges: CurrentChargesBreakdown | null = null;
  const chgTotal = scale(input.currentChargesTotal, mult);
  const chgEdu = scale(input.educationCharges, mult);
  const chgHosp = scale(input.hospitalCharges, mult);
  const chgHwy = scale(input.highwayCharges, mult);
  const chgSew = scale(input.sewerageCharges, mult);
  const chgSolid = scale(input.solidWasteCharges, mult);
  const chgPark = scale(input.parksCharges, mult);
  const chgAir = scale(input.airTransportCharges, mult);
  const chgOth = scale(input.otherCharges, mult);
  if (
    chgTotal !== null ||
    chgEdu !== null ||
    chgHosp !== null ||
    chgHwy !== null ||
    chgSew !== null ||
    chgSolid !== null ||
    chgPark !== null ||
    chgAir !== null ||
    chgOth !== null
  ) {
    currentCharges = {
      total: chgTotal,
      educationCharges: chgEdu,
      hospitalCharges: chgHosp,
      highwayChargesAndTolls: chgHwy,
      sewerageCharges: chgSew,
      solidWasteManagementCharges: chgSolid,
      parksAndRecreationCharges: chgPark,
      airTransportationCharges: chgAir,
      otherCharges: chgOth,
    };
  }

  // 4. Miscellaneous General Revenue
  let miscGeneralRevenue: MiscellaneousGeneralRevenueBreakdown | null = null;
  const miscTotal = scale(input.miscGeneralRevenueTotal, mult);
  const intEarn = scale(input.interestEarnings, mult);
  const specAssess = scale(input.specialAssessments, mult);
  const propSale = scale(input.saleOfProperty, mult);
  const miscOth = scale(input.otherMiscRevenue, mult);
  if (
    miscTotal !== null ||
    intEarn !== null ||
    specAssess !== null ||
    propSale !== null ||
    miscOth !== null
  ) {
    miscGeneralRevenue = {
      total: miscTotal,
      specialAssessments: specAssess,
      interestEarnings: intEarn,
      saleOfProperty: propSale,
      otherMiscellaneous: miscOth,
    };
  }

  // 5. Utility Revenue
  let utilityRevenue: UtilityRevenueBreakdown | null = null;
  const utilRevTotal = scale(input.utilityRevenueTotal, mult);
  const utilWater = scale(input.waterUtilityRevenue, mult);
  const utilElec = scale(input.electricUtilityRevenue, mult);
  const utilGas = scale(input.gasUtilityRevenue, mult);
  const utilTrans = scale(input.transitUtilityRevenue, mult);
  if (
    utilRevTotal !== null ||
    utilWater !== null ||
    utilElec !== null ||
    utilGas !== null ||
    utilTrans !== null
  ) {
    utilityRevenue = {
      total: utilRevTotal,
      waterSupplyUtility: utilWater,
      electricUtility: utilElec,
      gasUtility: utilGas,
      transitUtility: utilTrans,
    };
  }

  // 6. Insurance Trust Revenue
  let insuranceTrustRevenue: InsuranceTrustRevenueBreakdown | null = null;
  const insRevTotal = scale(input.insuranceTrustRevenueTotal, mult);
  const insRet = scale(input.employeeRetirementRevenue, mult);
  const insUnemp = scale(input.unemploymentCompensationRevenue, mult);
  if (insRevTotal !== null || insRet !== null || insUnemp !== null) {
    insuranceTrustRevenue = {
      total: insRevTotal,
      employeeRetirement: insRet,
      unemploymentCompensation: insUnemp,
    };
  }

  // 7. Intergovernmental Expenditure
  let intergovernmentalExpenditure: IntergovernmentalExpenditureBreakdown | null =
    null;
  const igExpTotal = scale(input.intergovernmentalExpenditureTotal, mult);
  const igExpState = scale(input.intergovernmentalExpenditureToState, mult);
  const igExpLocal = scale(input.intergovernmentalExpenditureToLocal, mult);
  if (igExpTotal !== null || igExpState !== null || igExpLocal !== null) {
    intergovernmentalExpenditure = {
      total: igExpTotal,
      toState: igExpState,
      toLocal: igExpLocal,
    };
  }

  // 8. Capital Outlay & Character Expenditure
  let capitalOutlay: CapitalOutlayBreakdown | null = null;
  const capTotal = scale(input.capitalOutlayTotal, mult);
  const capConst = scale(input.capitalOutlayConstruction, mult);
  const capLand = scale(input.capitalOutlayLandStructures, mult);
  const capEquip = scale(input.capitalOutlayEquipment, mult);
  if (
    capTotal !== null ||
    capConst !== null ||
    capLand !== null ||
    capEquip !== null
  ) {
    capitalOutlay = {
      total: capTotal,
      construction: capConst,
      landAndExistingStructures: capLand,
      equipment: capEquip,
    };
  }

  let characterExpenditure: CharacterExpenditureBreakdown | null = null;
  const curOps = scale(input.currentOperationExpenditure, mult);
  const asstSubs = scale(input.assistanceAndSubsidies, mult);
  const intDebt = scale(input.interestOnGeneralDebt, mult);
  const insBen = scale(input.insuranceBenefitsAndRepayments, mult);
  if (
    curOps !== null ||
    capitalOutlay !== null ||
    asstSubs !== null ||
    intDebt !== null ||
    insBen !== null
  ) {
    characterExpenditure = {
      currentOperation: curOps,
      capitalOutlay: capitalOutlay,
      assistanceAndSubsidies: asstSubs,
      interestOnGeneralDebt: intDebt,
      insuranceBenefitsAndRepayments: insBen,
    };
  }

  // 9. Utility Expenditure
  let utilityExpenditure: UtilityExpenditureBreakdown | null = null;
  const utilExpTotal = scale(input.utilityExpenditureTotal, mult);
  const utilExpWater = scale(input.waterUtilityExpenditure, mult);
  const utilExpElec = scale(input.electricUtilityExpenditure, mult);
  const utilExpGas = scale(input.gasUtilityExpenditure, mult);
  const utilExpTrans = scale(input.transitUtilityExpenditure, mult);
  if (
    utilExpTotal !== null ||
    utilExpWater !== null ||
    utilExpElec !== null ||
    utilExpGas !== null ||
    utilExpTrans !== null
  ) {
    utilityExpenditure = {
      total: utilExpTotal,
      waterSupply: utilExpWater,
      electricPower: utilExpElec,
      gasSupply: utilExpGas,
      transit: utilExpTrans,
    };
  }

  // 10. Debt
  let debtOutstanding: DebtOutstandingBreakdown | null = null;
  const debtTotal = scale(input.debtOutstandingTotal, mult);
  const debtShort = scale(input.debtShortTerm, mult);
  const debtLtTotal = scale(input.debtLongTermTotal, mult);
  const debtLtFull = scale(input.debtLongTermFullFaith, mult);
  const debtLtNon = scale(input.debtLongTermNonguaranteed, mult);
  if (
    debtTotal !== null ||
    debtShort !== null ||
    debtLtTotal !== null ||
    debtLtFull !== null ||
    debtLtNon !== null
  ) {
    debtOutstanding = {
      total: debtTotal,
      shortTermDebt: debtShort,
      longTermDebt:
        debtLtTotal !== null || debtLtFull !== null || debtLtNon !== null
          ? {
              total: debtLtTotal,
              fullFaithAndCredit: debtLtFull,
              nonguaranteedRevenueDebt: debtLtNon,
            }
          : null,
    };
  }

  // 11. Cash and Securities
  let cashAndSecurities: CashAndSecuritiesBreakdown | null = null;
  const cashTotal = scale(input.cashSecuritiesTotal, mult);
  const cashIns = scale(input.cashSecuritiesInsuranceTrust, mult);
  const cashNonInsTotal = scale(input.cashSecuritiesNonInsuranceTotal, mult);
  const cashSink = scale(input.cashSecuritiesSinkingFunds, mult);
  const cashBond = scale(input.cashSecuritiesBondFunds, mult);
  const cashOth = scale(input.cashSecuritiesOtherFunds, mult);
  if (
    cashTotal !== null ||
    cashIns !== null ||
    cashNonInsTotal !== null ||
    cashSink !== null ||
    cashBond !== null ||
    cashOth !== null
  ) {
    cashAndSecurities = {
      total: cashTotal,
      insuranceTrustFunds: cashIns,
      nonInsuranceTrustFunds:
        cashNonInsTotal !== null ||
        cashSink !== null ||
        cashBond !== null ||
        cashOth !== null
          ? {
              total: cashNonInsTotal,
              sinkingFunds: cashSink,
              bondFunds: cashBond,
              otherFunds: cashOth,
            }
          : null,
    };
  }

  // Scale functional expenditures if provided
  let functionalExpenditures: FunctionalExpenditureMap | null = null;
  if (input.functionalExpenditures) {
    const scaledFuncs: Record<string, unknown> = {};
    for (const [funcKey, breakdown] of Object.entries(
      input.functionalExpenditures,
    )) {
      if (breakdown) {
        scaledFuncs[funcKey] = {
          currentOperation: scale(breakdown.currentOperation, mult),
          capitalOutlay: scale(breakdown.capitalOutlay, mult),
          assistanceAndSubsidies:
            breakdown.assistanceAndSubsidies !== undefined
              ? scale(breakdown.assistanceAndSubsidies, mult)
              : undefined,
          total: scale(breakdown.total, mult),
        };
      }
    }
    functionalExpenditures = scaledFuncs as FunctionalExpenditureMap;
  }

  const totalRev = scale(input.totalRevenue, mult);
  const genRev = scale(input.generalRevenue, mult);
  const ownRev = scale(input.ownSourceRevenue, mult);
  const liqRev = scale(input.liquorStoreRevenue, mult);

  const totalExp = scale(input.totalExpenditure, mult);
  const dirExp = scale(input.directExpenditure, mult);
  const dirGenExp = scale(input.directGeneralExpenditure, mult);
  const liqExp = scale(input.liquorStoreExpenditure, mult);
  const insExp = scale(input.insuranceTrustExpenditure, mult);

  const record: FinanceRecord = {
    recordId: createStableFinanceRecordId(
      input.censusGovId,
      input.fiscalYear,
      input.quality.vintage,
    ),
    govId: createStableGovernmentId(input.censusGovId),
    censusGovId: input.censusGovId,
    fiscalYear: input.fiscalYear,
    enumerationType: input.enumerationType,
    quality: input.quality,

    totalRevenue: totalRev,
    generalRevenue: genRev,
    ownSourceRevenue: ownRev,
    taxes,
    intergovernmentalRevenue,
    currentCharges,
    miscellaneousGeneralRevenue: miscGeneralRevenue,
    utilityRevenue,
    liquorStoreRevenue: liqRev,
    insuranceTrustRevenue,

    totalExpenditure: totalExp,
    directExpenditure: dirExp,
    directGeneralExpenditure: dirGenExp,
    intergovernmentalExpenditure,
    characterExpenditure,
    functionalExpenditures,
    utilityExpenditure,
    liquorStoreExpenditure: liqExp,
    insuranceTrustExpenditure: insExp,

    debtOutstandingEndYear: debtOutstanding,
    debtIssuedDuringYear: scale(input.debtIssuedDuringYear, mult),
    debtRetiredDuringYear: scale(input.debtRetiredDuringYear, mult),

    cashAndSecuritiesEndYear: cashAndSecurities,
    provenance: input.provenance,
  };

  validateFinanceIdentities(record);
  return record;
}

export interface FinanceIdentityValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Validates mathematical accounting identities on a normalized FinanceRecord.
 * Allows small rounding differences (<= 1 per component for thousand-dollar rounding).
 */
export function validateFinanceIdentities(
  record: FinanceRecord,
  roundingTolerance: number = 2,
): FinanceIdentityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Total Revenue Identity
  if (
    record.totalRevenue !== null &&
    record.generalRevenue !== null &&
    record.utilityRevenue &&
    record.utilityRevenue.total !== null &&
    record.insuranceTrustRevenue &&
    record.insuranceTrustRevenue.total !== null
  ) {
    const expected =
      record.generalRevenue +
      (record.utilityRevenue.total ?? 0) +
      (record.liquorStoreRevenue ?? 0) +
      (record.insuranceTrustRevenue.total ?? 0);
    const diff = Math.abs(record.totalRevenue - expected);
    if (diff > roundingTolerance) {
      errors.push(
        `Total Revenue mismatch: total (${record.totalRevenue}) != general (${record.generalRevenue}) + utility (${record.utilityRevenue.total}) + liquor (${record.liquorStoreRevenue ?? 0}) + insurance (${record.insuranceTrustRevenue.total}), diff=${diff}`,
      );
    }
  } else if (
    record.totalRevenue !== null &&
    record.generalRevenue !== null &&
    !record.utilityRevenue &&
    !record.insuranceTrustRevenue &&
    record.liquorStoreRevenue === 0
  ) {
    const diff = Math.abs(record.totalRevenue - record.generalRevenue);
    if (diff > roundingTolerance) {
      errors.push(
        `Total Revenue mismatch: total (${record.totalRevenue}) != general (${record.generalRevenue}), diff=${diff}`,
      );
    }
  }

  // 2. General Revenue Identity: General = Own Source + Intergovernmental
  if (
    record.generalRevenue !== null &&
    record.ownSourceRevenue !== null &&
    record.intergovernmentalRevenue &&
    record.intergovernmentalRevenue.total !== null
  ) {
    const expected =
      record.ownSourceRevenue + (record.intergovernmentalRevenue.total ?? 0);
    const diff = Math.abs(record.generalRevenue - expected);
    if (diff > roundingTolerance) {
      errors.push(
        `General Revenue mismatch: general (${record.generalRevenue}) != own source (${record.ownSourceRevenue}) + intergovernmental (${record.intergovernmentalRevenue.total}), diff=${diff}`,
      );
    }
  }

  // 3. Own Source Revenue Identity: Own Source = Taxes + Current Charges + Misc General
  if (
    record.ownSourceRevenue !== null &&
    record.taxes &&
    record.taxes.totalTaxes !== null &&
    record.currentCharges &&
    record.currentCharges.total !== null &&
    record.miscellaneousGeneralRevenue &&
    record.miscellaneousGeneralRevenue.total !== null
  ) {
    const expected =
      (record.taxes.totalTaxes ?? 0) +
      (record.currentCharges.total ?? 0) +
      (record.miscellaneousGeneralRevenue.total ?? 0);
    const diff = Math.abs(record.ownSourceRevenue - expected);
    if (diff > roundingTolerance) {
      errors.push(
        `Own Source Revenue mismatch: own source (${record.ownSourceRevenue}) != taxes (${record.taxes.totalTaxes}) + charges (${record.currentCharges.total}) + misc (${record.miscellaneousGeneralRevenue.total}), diff=${diff}`,
      );
    }
  }

  // 4. Total Taxes Identity: Total Taxes = Property + Gen Sales + Sel Sales + Ind Inc + Corp Inc + Licenses + Other
  if (
    record.taxes &&
    record.taxes.totalTaxes !== null &&
    record.taxes.totalTaxes !== undefined
  ) {
    const components = [
      record.taxes.propertyTaxes,
      record.taxes.generalSalesTaxes,
      record.taxes.selectiveSalesTaxes?.total,
      record.taxes.individualIncomeTaxes,
      record.taxes.corporateIncomeTaxes,
      record.taxes.licenseTaxes?.total,
      record.taxes.otherTaxes?.total,
    ];
    const presentCount = components.filter(
      (c) => c !== null && c !== undefined,
    ).length;
    if (presentCount >= 4) {
      const sum = components.reduce((acc, c) => (acc ?? 0) + (c ?? 0), 0) ?? 0;
      const diff = Math.abs(record.taxes.totalTaxes - sum);
      if (diff > roundingTolerance) {
        warnings.push(
          `Tax components sum (${sum}) differs from total taxes (${record.taxes.totalTaxes}) by ${diff}`,
        );
      }
    }
  }

  // 5. Total Expenditure Identity: Total = Direct + Intergovernmental
  if (
    record.totalExpenditure !== null &&
    record.directExpenditure !== null &&
    record.intergovernmentalExpenditure &&
    record.intergovernmentalExpenditure.total !== null
  ) {
    const expected =
      record.directExpenditure +
      (record.intergovernmentalExpenditure.total ?? 0);
    const diff = Math.abs(record.totalExpenditure - expected);
    if (diff > roundingTolerance) {
      errors.push(
        `Total Expenditure mismatch: total (${record.totalExpenditure}) != direct (${record.directExpenditure}) + intergovernmental (${record.intergovernmentalExpenditure.total}), diff=${diff}`,
      );
    }
  }

  // 6. Direct General Expenditure Identity: Direct General = Direct - Utility - Liquor - Insurance
  if (
    record.directExpenditure !== null &&
    record.directGeneralExpenditure !== null &&
    record.utilityExpenditure &&
    record.utilityExpenditure.total !== null &&
    record.insuranceTrustExpenditure !== null
  ) {
    const nonGeneral =
      (record.utilityExpenditure.total ?? 0) +
      (record.liquorStoreExpenditure ?? 0) +
      (record.insuranceTrustExpenditure ?? 0);
    const expected = record.directExpenditure - nonGeneral;
    const diff = Math.abs(record.directGeneralExpenditure - expected);
    if (diff > roundingTolerance) {
      errors.push(
        `Direct General Expenditure mismatch: direct general (${record.directGeneralExpenditure}) != direct (${record.directExpenditure}) - non-general (${nonGeneral}), diff=${diff}`,
      );
    }
  }

  // 7. Character Expenditure Identity: Direct General = Current Ops + Capital Outlay + Assistance/Subsidies + Interest
  if (
    record.directGeneralExpenditure !== null &&
    record.characterExpenditure &&
    record.characterExpenditure.currentOperation !== null &&
    record.characterExpenditure.capitalOutlay &&
    record.characterExpenditure.capitalOutlay.total !== null &&
    record.characterExpenditure.assistanceAndSubsidies !== null &&
    record.characterExpenditure.interestOnGeneralDebt !== null
  ) {
    const expected =
      (record.characterExpenditure.currentOperation ?? 0) +
      (record.characterExpenditure.capitalOutlay.total ?? 0) +
      (record.characterExpenditure.assistanceAndSubsidies ?? 0) +
      (record.characterExpenditure.interestOnGeneralDebt ?? 0);
    const diff = Math.abs(record.directGeneralExpenditure - expected);
    if (diff > roundingTolerance) {
      warnings.push(
        `Direct General character sum (${expected}) differs from Direct General Expenditure (${record.directGeneralExpenditure}) by ${diff}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
