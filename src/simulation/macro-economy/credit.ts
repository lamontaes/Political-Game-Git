import { detExp, logistic } from "../world-setup/deterministic-math";
import type { MacroEra } from "./kernel";
import { MACRO_ERA_POLICY } from "./policy";

/**
 * CONDITIONS, NOT DICE: the credit and demand arithmetic behind the national
 * business cycle (Build 19, Research 1 build step 3, approved by Lamontae on
 * September 28, 2026).
 *
 * A recession is no longer drawn. It is what happens when recorded stocks
 * turn: borrowers carry debt at a rate that follows the central bank's
 * policy rate as loans reprice; when the interest they owe runs past what
 * they can carry, more of them default; the losses eat the banks' capital;
 * banks with thin capital lend less; less new lending means less spending;
 * and lost jobs cut spending again and raise defaults further. The same
 * stocks bring the recovery: defaults write debt down, rate cuts reprice it,
 * and banks rebuild capital from their earnings.
 *
 * Nothing here decides an outcome by chance, and nothing else in the national
 * month does either: there are no drawn monthly surprises and no drawn price
 * shocks. Each month records how much of its growth came from each source
 * (`MacroGrowthDrivers`), so a recession can always be explained from what
 * moved. The "unexplained surprise" driver (`chancePp`) stays in the record,
 * always zero.
 *
 * Pure: no World access, no clock, no storage.
 *
 * MACRO_CREDIT_POLICY records measured values where the game's research bank
 * supplies them. The remaining values are ESTIMATED FROM AVERAGE: one national
 * credit market is modeled from the game's recorded household, auto, mortgage,
 * personal-loan and student-loan series in `debt-and-credit-2026`. The response
 * sizes are calibrated against the recorded national recession history named
 * below; they describe the simulation rather than selecting an actor's outcome.
 */
export const MACRO_CREDIT_VERSION = "macro-credit-conditions-v1" as const;

export const MACRO_CREDIT_POLICY = {
  version: MACRO_CREDIT_VERSION,
  start: {
    /**
     * MEASURED: credit to households and nonfinancial businesses as a
     * multiple of a year's output, 140.3 percent in the fourth quarter of
     * 2025 (Bank for International Settlements, FRED series QUSPAM770A,
     * read September 28, 2026).
     */
    debtRatio: 1.4,
    /**
     * ESTIMATED FROM AVERAGE: 2 points above the policy rate, using the game's
     * national mortgage, auto, personal-loan and student-loan rate records.
     */
    spreadPp: 2,
    /**
     * ESTIMATED FROM AVERAGE: 10 percent of loans. Basis: the national credit
     * model's recorded starting and target capital ratios; no place-specific
     * bank series is used by this national simulation.
     */
    bankCapitalRatio: 0.1,
    /**
     * ESTIMATED FROM AVERAGE: 0.5 percent yearly. Basis: the game's national
     * household debt and delinquency records, calibrated to calm months.
     */
    chargeOffPct: 0.5,
  },
  /**
   * ESTIMATED FROM AVERAGE: 3.3 percent of debt reprices monthly, so the whole
   * stock turns over in about two and a half years. Basis: the fixed terms in
   * the game's national mortgage, auto, personal-loan and student-loan records.
   */
  debtRepricedPctPerMonth: 3.3,
  /**
   * ESTIMATED FROM RECORDED NATIONAL CYCLES: three extra points when credit
   * is fully tight, calibrated with the NBER 1854–2020 recession record
   * named below rather than assigned to an individual borrower.
   */
  spreadPerTightnessPp: 3,
  /**
   * ESTIMATED FROM RECORDED NATIONAL CYCLES: borrowers carry yearly interest
   * equal to 8.2 percent of yearly output without strain. The estimate uses
   * the same NBER 1854–2020 recession calibration named below. Above it,
   * defaults climb.
   */
  burdenLine: 0.082,
  /*
   * The response strengths in chargeOff, tightness, lending, growth and
   * inflation are ESTIMATED FROM RECORDED NATIONAL CYCLES, calibrated on
   * September 28, 2026 so a
   * century of simulated months matches the record of U.S. recessions
   * (National Bureau of Economic Research dates, 1854 to 2020): about 1.3
   * onsets a decade, a median of 13 months, a tenth longer than 19 months,
   * and the longest near three and a half years.
   */
  chargeOff: {
    /** Percent a year added per point of burden over the line. */
    perBurdenPointPct: 2,
    /** Percent a year added per point of unemployment over its normal rate. */
    perUnemploymentPointPct: 0.14,
    /** Share of a charged-off loan the bank loses (the rest is recovered). */
    lossGivenDefault: 0.55,
  },
  bank: {
    /** Yearly earnings before losses, as a share of loans. */
    earningsRate: 0.012,
    /** Points of bank earnings per point of tight-credit spread. */
    spreadEarnedPerPoint: 0.5,
    /** The capital ratio banks aim to hold. */
    targetCapitalRatio: 0.1,
  },
  tightness: {
    /** Logistic intercept; with calm conditions tightness sits near the start draw. */
    intercept: 0,
    /** Per point of capital below target. */
    perCapitalShortfallPoint: 2,
    /** Per point of yearly charge-offs over the calm rate. */
    perChargeOffPoint: 0.35,
    /** Per point the real policy rate sits above neutral. */
    perRealRatePoint: 0.11,
    /** Share of the gap to its new level closed each month. */
    monthlyAdjustment: 0.59,
  },
  lending: {
    /** Points of lending growth per point growth ran above trend last month. */
    perGrowthGapPp: 0.35,
    /** Points of lending growth lost per 0.1 of tightness over its start. */
    perTightnessTenthPp: 2.5,
    /** Points of lending growth lost per point of burden over the line. */
    perBurdenPointPp: 0.8,
    /** Points gained per point of burden under the line: room to borrow tempts less than strain deters. */
    perRoomPointPp: 0.1,
  },
  growth: {
    /** Growth points per point that lending grows faster than nominal trend. */
    perCreditGapPp: 0.011,
    /** Growth points per point lending growth rose over the month. */
    perCreditChangePp: 1.5,
    /** Growth points lost per point the real policy rate sits above neutral. */
    perRealRatePointPp: 0.017,
    /** Growth points lost per point unemployment rose last month. */
    perUnemploymentRisePp: 0.32,
  },
  inflation: {
    /** Inflation points added per point unemployment sits below its normal rate. */
    perSlackPointPp: 0.048,
  },
  /**
   * ESTIMATED FROM AVERAGE: the real policy rate that neither pushes nor
   * holds back growth. The Federal Open Market Committee's median longer-run
   * projection of the nominal rate, 3.2 percent on September 16, 2026 (FRED
   * series FEDTARMDLR), less its 2 percent inflation goal.
   */
  neutralRealRatePct: 1.2,
} as const;

export interface MacroCreditState {
  readonly version: typeof MACRO_CREDIT_VERSION;
  /** Private debt as a multiple of a year's output. */
  readonly debtRatio: number;
  /** The average rate borrowers pay on what they owe, percent a year. */
  readonly debtRatePct: number;
  /** Yearly interest as a share of a year's output. */
  readonly burden: number;
  /** Yearly share of debt charged off, percent. */
  readonly chargeOffPct: number;
  /** Bank equity as a share of loans. */
  readonly bankCapitalRatio: number;
  /** Yearly growth of the stock of credit, percent. */
  readonly lendingGrowthPct: number;
  /** 0 (banks lend freely) to 1 (banks will not lend). */
  readonly tightness: number;
  /** Last month's unemployment, so a rise can be read next month. */
  readonly priorUnemploymentPct: number;
}

/** How much of the month's growth came from each source, in points. */
export interface MacroGrowthDrivers {
  /** Where growth would settle with nothing else acting: the era's trend. */
  readonly trendPct: number;
  /** Last month's distance from trend carried into this month. */
  readonly carriedPp: number;
  /** New credit flowing faster or slower than nominal trend. */
  readonly creditPp: number;
  /** The real policy rate above or below neutral. */
  readonly ratePp: number;
  /** Spending lost or gained as jobs were lost or found last month. */
  readonly demandPp: number;
  /** Recorded shocks (disasters, trade, public money, and the rest). */
  readonly shocksPp: number;
  /** The month's unexplained surprise: always zero, nothing is drawn. */
  readonly chancePp: number;
}

function round6(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Credit values must be finite.");
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The credit stocks on the first month, from WORLD's starting draw. */
export function startCreditState(
  policyMidPct: number,
  startTightness: number,
  unemploymentPct: number,
): MacroCreditState {
  const s = MACRO_CREDIT_POLICY.start;
  const debtRatePct = round6(policyMidPct + s.spreadPp);
  return {
    version: MACRO_CREDIT_VERSION,
    debtRatio: s.debtRatio,
    debtRatePct,
    burden: round6((s.debtRatio * debtRatePct) / 100),
    chargeOffPct: s.chargeOffPct,
    bankCapitalRatio: s.bankCapitalRatio,
    // Lending starts at its calm pace: the start era's nominal trend plus
    // the loans written off.
    lendingGrowthPct: round6(
      MACRO_ERA_POLICY.start.trendGrowthPct +
        MACRO_ERA_POLICY.start.inflationAnchorPct +
        s.chargeOffPct,
    ),
    tightness: round6(startTightness),
    priorUnemploymentPct: unemploymentPct,
  };
}

export interface CreditMonthInput {
  readonly previousGrowthPct: number;
  readonly previousUnemploymentPct: number;
  readonly previousInflationPct: number;
  readonly era: MacroEra;
  readonly policyMidPct: number;
  /** The tightness WORLD drew at the start, the level calm conditions return to. */
  readonly startTightness: number;
}

export interface CreditMonthResult {
  readonly credit: MacroCreditState;
  /** Growth, labor and price impulses from credit and demand this month. */
  readonly creditPp: number;
  readonly ratePp: number;
  readonly demandPp: number;
  readonly slackPricePp: number;
}

/**
 * One month of the credit stocks, read from last month's record and this
 * month's policy rate. Returns the new stocks and the impulses they send
 * into this month's growth and inflation.
 */
export function stepCredit(
  previous: MacroCreditState,
  input: CreditMonthInput,
): CreditMonthResult {
  const p = MACRO_CREDIT_POLICY;
  const { era } = input;
  const realPolicy = input.policyMidPct - era.inflationAnchorPct;
  const realGap = realPolicy - p.neutralRealRatePct;

  // Loans reprice toward what lenders charge today.
  const offered =
    input.policyMidPct +
    p.start.spreadPp +
    p.spreadPerTightnessPp * (previous.tightness - input.startTightness);
  const debtRatePct =
    previous.debtRatePct +
    (p.debtRepricedPctPerMonth / 100) * (offered - previous.debtRatePct);
  const burden = (previous.debtRatio * debtRatePct) / 100;
  const burdenPoints = (burden - p.burdenLine) * 100;
  const strainPoints = Math.max(0, burdenPoints);
  const unemploymentOver = Math.max(
    0,
    input.previousUnemploymentPct - era.naturalRatePct,
  );

  // Borrowers who cannot carry what they owe default.
  const chargeOffPct =
    p.start.chargeOffPct +
    p.chargeOff.perBurdenPointPct * strainPoints +
    p.chargeOff.perUnemploymentPointPct * unemploymentOver;
  const lossRate = (chargeOffPct / 100) * p.chargeOff.lossGivenDefault;

  // Banks earn on their loans, lose on defaults, and spread capital thinner
  // as they lend more.
  // Tight credit is dear credit: the wider spread is also the banks' margin.
  const earnings =
    p.bank.earningsRate +
    (p.bank.spreadEarnedPerPoint *
      p.spreadPerTightnessPp *
      Math.max(0, previous.tightness - input.startTightness)) /
      100;
  const bankCapitalRatio = clamp(
    previous.bankCapitalRatio +
      (earnings - lossRate) / 12 -
      (previous.bankCapitalRatio * (previous.lendingGrowthPct / 100)) / 12,
    0,
    0.3,
  );
  const shortfallPoints = (p.bank.targetCapitalRatio - bankCapitalRatio) * 100;
  const wanted = logistic(
    p.tightness.intercept +
      Math.log(input.startTightness / (1 - input.startTightness)) +
      p.tightness.perCapitalShortfallPoint * shortfallPoints +
      p.tightness.perChargeOffPoint * (chargeOffPct - p.start.chargeOffPct) +
      p.tightness.perRealRatePoint * Math.max(0, realGap),
  );
  const tightness = clamp(
    previous.tightness +
      p.tightness.monthlyAdjustment * (wanted - previous.tightness),
    0.001,
    0.999,
  );

  // New lending: borrowers want more when the economy runs hot and when what
  // they owe is light, banks give less when they are tight, and borrowers who
  // are stretched stop. In calm conditions lending keeps pace with nominal
  // trend plus the loans written off, so the debt ratio holds.
  const nominalTrend = era.trendGrowthPct + era.inflationAnchorPct;
  const calmLending = nominalTrend + p.start.chargeOffPct;
  const lendingGrowthPct =
    calmLending +
    p.lending.perGrowthGapPp * (input.previousGrowthPct - era.trendGrowthPct) -
    p.lending.perTightnessTenthPp * 10 * (tightness - input.startTightness) -
    (burdenPoints > 0
      ? p.lending.perBurdenPointPp * burdenPoints
      : p.lending.perRoomPointPp * burdenPoints);
  const nominalGrowth = input.previousGrowthPct + input.previousInflationPct;
  const debtRatio = clamp(
    previous.debtRatio *
      detExp((lendingGrowthPct - chargeOffPct - nominalGrowth) / 1200),
    0.2,
    6,
  );

  // Spending follows new credit: its level against calm, and above all its
  // change, the credit impulse (Biggs, Mayer and Pick, 2010). Once lending
  // stops falling, spending stops falling, though lending stays low.
  const creditPp =
    p.growth.perCreditGapPp * (lendingGrowthPct - calmLending) +
    p.growth.perCreditChangePp * (lendingGrowthPct - previous.lendingGrowthPct);
  const ratePp = -p.growth.perRealRatePointPp * realGap;
  const demandPp =
    -p.growth.perUnemploymentRisePp *
    (input.previousUnemploymentPct - previous.priorUnemploymentPct);
  const slackPricePp =
    p.inflation.perSlackPointPp *
    (era.naturalRatePct - input.previousUnemploymentPct);

  return {
    credit: {
      version: MACRO_CREDIT_VERSION,
      debtRatio: round6(debtRatio),
      debtRatePct: round6(debtRatePct),
      burden: round6(burden),
      chargeOffPct: round6(chargeOffPct),
      bankCapitalRatio: round6(bankCapitalRatio),
      lendingGrowthPct: round6(lendingGrowthPct),
      tightness: round6(tightness),
      priorUnemploymentPct: input.previousUnemploymentPct,
    },
    creditPp: round6(creditPp),
    ratePp: round6(ratePp),
    demandPp: round6(demandPp),
    slackPricePp: round6(slackPricePp),
  };
}
