/** Frozen numeric table. SOURCED means retained unit/calendar/schema contract; legal or empirical sourcing is not inferred from native code. ESTIMATED/TUNABLE preserve the cited registered assumptions. Big integers are lossless literal strings. */
export const LAWS_LEGACY_PARAMETERS = {
  "calendar.ts": {
    values: [0, 1, 2, 3, 4],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "consumer-cap.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/consumer-loan-law.ts:23",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "dated-law.ts": {
    values: [-1, 0, 0.5, 1, 3],
    provenance: "TUNABLE",
    source:
      "src/simulation/governing/law-in-force.ts:120; src/simulation/governing/law-in-force.ts:439; src/simulation/governing/law-in-force.ts:500; src/simulation/governing/law-in-force.ts:551",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.starting-local-rank-offset"],
  },
  "earned-pay-integrity.ts": {
    values: [-1, 0, 1, 2, 60],
    provenance: "SOURCED",
    source: "src/simulation/earned-law-pay-integrity.ts:50",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "effect-stamp.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/law-effect-stamp.ts:70",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "effective-date.ts": {
    values: [-1, 0, 1, 2, 4, 7, 10, 12, 86400000],
    provenance: "TUNABLE",
    source:
      "src/simulation/governing/statute-effective-date.ts:258; src/simulation/governing/statute-effective-date.ts:271; src/simulation/governing/statute-effective-date.ts:364; src/simulation/governing/statute-effective-date.ts:378; src/simulation/governing/statute-effective-date.ts:390; src/simulation/governing/statute-effective-date.ts:409",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.session-end-effective-date-fallback"],
  },
  "effective-tax-policy.ts": {
    values: [-1],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "enactment-calendar.ts": {
    values: [0, 90],
    provenance: "SOURCED",
    source: "src/simulation/legislative-effective-date.ts:89",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "exact-quantity.ts": {
    values: [-1, 0, 1],
    provenance: "SOURCED",
    source: "src/simulation/quantity.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "federal-income-tax-schedule.ts": {
    values: [0, 1, 2, 4],
    provenance: "TUNABLE",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.federal-mfs-tax-schedule"],
  },
  "federal-outlay.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "federal-tax-law.ts": {
    values: [0, 1, 2, 4, 10000],
    provenance: "SOURCED",
    source: "src/simulation/federal-top-income-tax-law.ts:44",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "housing-income.ts": {
    values: [
      -1, 0, 0.08, 0.7, 0.8, 0.9, 1, 1.08, 1.16, 1.24, 1.32, 7, 8, 12, 100,
    ],
    provenance: "SOURCED",
    source: "src/simulation/housing-voucher-eligibility.ts:22",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "income-tax-calculation.ts": {
    values: [0, "0n", 1, "2n"],
    provenance: "SOURCED",
    source:
      "src/simulation/income-tax-withholding.ts:373; src/simulation/income-tax-withholding.ts:392",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "income-tax-estimation.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/income-tax-withholding.ts:126; src/simulation/income-tax-withholding.ts:144",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "income-tax-schedule.ts": {
    values: [1],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "issue-judgment.ts": {
    values: [-1, 0, 1, 2, 3, 4, 18, 150],
    provenance: "TUNABLE",
    source: "src/simulation/issue-record.ts:396",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "laws.issue-record-magnitudes",
      "laws.former-executive-record-gap",
      "laws.issue-voter-qualification-gap",
    ],
  },
  "law-amount.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/law-consequence-amount.ts:26",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "law-exposure.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/law-exposure.ts:86",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "law-in-force.ts": {
    values: [0],
    provenance: "TUNABLE",
    source:
      "src/simulation/governing/law-in-force.ts:754; src/simulation/governing/law-in-force.ts:760; src/simulation/law-hierarchy.ts:94; src/simulation/law-hierarchy.ts:98",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.floor-preemption"],
  },
  "loan-arithmetic.ts": {
    values: [0, 12, 10000],
    provenance: "SOURCED",
    source:
      "src/simulation/public-benefit-formulas.ts:205; src/simulation/public-benefit-formulas.ts:217; src/simulation/public-benefit-formulas.ts:237",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "loan-rate-cap.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "minimum-authority.ts": {
    values: [2, 3],
    provenance: "TUNABLE",
    source:
      "src/simulation/minimum-wage.ts:241; src/simulation/enacted-rule-changes.ts:1251",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.minimum-cache-dependencies"],
  },
  "minimum-hourly.ts": {
    values: [100],
    provenance: "SOURCED",
    source:
      "src/simulation/minimum-wage.ts:206; src/simulation/minimum-wage.ts:553",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "money-facts.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/resources.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "paid-leave.ts": {
    values: [0, "2n"],
    provenance: "SOURCED",
    source:
      "src/simulation/paid-leave-benefits.ts:153; src/simulation/state-paid-leave-law.ts:212",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "payroll-records.ts": {
    values: [0, 4],
    provenance: "TUNABLE",
    source:
      "src/simulation/statutory-tax.ts:557; src/simulation/statutory-tax.ts:586",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.federal-employment-coverage-gaps"],
  },
  "policy-availability.ts": {
    values: [-1, 0],
    provenance: "SOURCED",
    source: "src/simulation/policy-semantics.ts:562",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "policy-math.ts": {
    values: [-1, 0, 1],
    provenance: "TUNABLE",
    source:
      "src/simulation/policy-semantics.ts:796; src/simulation/policy-semantics.ts:842; src/simulation/policy-semantics.ts:1520; src/simulation/policy-semantics.ts:1615; src/simulation/policy-semantics.ts:1626; src/simulation/policy-semantics.ts:1942; src/simulation/policy-semantics.ts:1969; src/simulation/policy-semantics.ts:2008; src/simulation/policy-semantics.ts:2160",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.policy-multiplicative-implementation"],
  },
  "privacy-estimate.ts": {
    values: [0, 1, 100, 500],
    provenance: "TUNABLE",
    source: "src/simulation/federal-data-privacy-law.ts:55",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.privacy-band-convention"],
  },
  "program-delivery.ts": {
    values: [-1, 0, 1, 2],
    provenance: "TUNABLE",
    source: "src/simulation/governing/public-program.ts:1392",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.linear-service-restoration"],
  },
  "program-forecast.ts": {
    values: [-1, 0, 1, 2, 10, 100],
    provenance: "SOURCED",
    source:
      "src/simulation/governing/public-program.ts:227; src/simulation/governing/public-program.ts:715",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "program-last-day.ts": {
    values: [-1, 1],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "public-benefits.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/public-benefit-formulas.ts:176; src/simulation/public-benefit-formulas.ts:191",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "recorded-outlays.ts": {
    values: [-12, 0, 1, 4, 5, 7, 12, 100],
    provenance: "SOURCED",
    source:
      "src/simulation/federal-defense-spending.ts:12; src/simulation/federal-outlay-laws.ts:35; src/simulation/federal-outlay-laws.ts:59; src/simulation/federal-outlay-laws.ts:93; src/simulation/federal-outlay-laws.ts:149; src/simulation/federal-outlay-laws.ts:215; src/simulation/federal-outlay-laws.ts:226",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "recorded-rule-changes.ts": {
    values: [0, 1, 3],
    provenance: "SOURCED",
    source:
      "src/simulation/enacted-rule-changes.ts:476; src/simulation/enacted-rule-changes.ts:1075; src/simulation/enacted-rule-changes.ts:1192",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "rule-change-order.ts": {
    values: [-1, 0],
    provenance: "SOURCED",
    source: "src/simulation/enacted-rule-changes.ts:1220",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "rule-value.ts": {
    values: [0, 1, 2, 10, 18, 30, 99, 100, 1000, 100000, 10000000],
    provenance: "TUNABLE",
    source: "src/simulation/enacted-rule-changes.ts:799",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "laws.rule-value-envelope",
      "laws.rule-silent-applicability",
    ],
  },
  "school-year-date.ts": {
    values: [1],
    provenance: "TUNABLE",
    source: "src/simulation/teacher-salary-floor.ts:247",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.common-teacher-school-year"],
  },
  "statutory-payroll.ts": {
    values: [0, "10000n", "20000n", "2n"],
    provenance: "TUNABLE",
    source:
      "src/simulation/statutory-tax.ts:614; src/simulation/statutory-tax.ts:636",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "laws.wage-floor-overwrites-cap",
      "laws.negative-payroll-rounding",
    ],
  },
  "student-aid.ts": {
    values: [
      -1, 0, 1, 3, 24, 100, 5500, 6500, 7500, 9500, 10500, 12500, 31000, 57500,
    ],
    provenance: "TUNABLE",
    source:
      "src/simulation/student-aid-facts.ts:34; src/simulation/student-aid-facts.ts:106",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.student-representative-limits"],
  },
  "tax-assessment.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "tax-law-schedules.ts": {
    values: [
      -1, 0, 1, 2, 3, 4, 100, 5000, 10000, 20000, 30000, 40000, 50000, 60000,
      80000, 100000, 150000, 200000, 300000, 500000, 1000000,
    ],
    provenance: "ESTIMATED",
    source:
      "src/simulation/state-income-tax-law.ts:103; src/simulation/state-income-tax-law.ts:293; src/simulation/state-income-tax-law.ts:325; src/simulation/state-income-tax-law.ts:363",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.state-tax-graduated-grid"],
  },
  "tax-occurrence.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "src/simulation/tax-policy.ts:844; src/simulation/tax-policy.ts:1008; src/simulation/tax-policy.ts:1102; src/simulation/tax-policy.ts:1581",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "tax-preview.ts": {
    values: [-1, 0, 1, "2n", 3650],
    provenance: "SOURCED",
    source:
      "src/simulation/tax-policy.ts:765; src/simulation/tax-policy.ts:784",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "teacher-floor.ts": {
    values: [-1, 0, 1, 2, 100],
    provenance: "TUNABLE",
    source:
      "src/simulation/teacher-salary-floor.ts:33; src/simulation/teacher-salary-floor.ts:116; src/simulation/teacher-salary-floor.ts:269",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["laws.teacher-median-flow-count"],
  },
  "variant-authority.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/legislation-program-families.ts:291",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "withholding-facts.ts": {
    values: [
      0, 1, 3, 7, 12, 14, 15, 16, 19, 24, 26, 28, 31, 52, 100, 260, 365, 365.25,
    ],
    provenance: "ESTIMATED",
    source:
      "src/simulation/income-tax-withholding.ts:189; src/simulation/income-tax-withholding.ts:281; src/simulation/income-tax-withholding.ts:335; src/simulation/income-tax-withholding.ts:360",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "laws.filing-status-family-default",
      "laws.pay-period-inference",
    ],
  },
  "withholding-plan.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/statutory-tax.ts:701",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "work-cadence.ts": {
    values: [1, 12, 24, 26, 52],
    provenance: "SOURCED",
    source: "src/simulation/law-effects-noticed.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
} as const;
