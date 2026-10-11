/** Frozen numeric table. SOURCED means retained unit/calendar/schema contract; legal or empirical sourcing is not inferred from native code. ESTIMATED/TUNABLE preserve the cited registered assumptions. Big integers are lossless literal strings. */
export const ECONOMY_LEGACY_PARAMETERS = {
  "bank-credit.ts": {
    values: [0],
    provenance: "TUNABLE",
    source:
      "src/simulation/living-world/town-finances.ts:717; src/simulation/living-world/town-finances.ts:1057; src/simulation/living-world/town-finances.ts:1070; src/simulation/living-world/town-finances.ts:1079",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.largest-bank-lender"],
  },
  "bank-profile.ts": {
    values: [0, 1, 2],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "bank-source-profile.ts": {
    values: [0, 1, 2, 5, 1000],
    provenance: "ESTIMATED",
    source:
      "src/simulation/living-world/town-finances.ts:309; src/simulation/living-world/town-finances.ts:358",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.bank-shape-nearest-assets"],
  },
  "budget-deadline.ts": {
    values: [0, 1, 4, 30, 90, 86400000],
    provenance: "TUNABLE",
    source: "src/simulation/governing/budget-stakes.ts:69",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.budget-deadline-bands"],
  },
  "budget-fiscal.ts": {
    values: [-1, 0, 1, 2, 4, 5, 7],
    provenance: "ESTIMATED",
    source:
      "src/simulation/public-budgets/fiscal.ts:66; src/simulation/public-budgets/fiscal.ts:92; src/simulation/public-budgets/fiscal.ts:309",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.budget-local-balanced-fallback",
      "economy.budget-own-authority-date",
    ],
  },
  "budget-opening.ts": {
    values: [0, 1, 2, 5, 100, 1000, 10000, 1000000],
    provenance: "ESTIMATED",
    source:
      "src/simulation/public-budgets/opening.ts:312; src/simulation/public-budgets/opening.ts:663; src/simulation/public-budgets/opening.ts:670; src/simulation/public-budgets/opening.ts:772",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.budget-opening-source-proxies",
      "economy.budget-pension-source-medians",
      "economy.budget-local-fiscal-year-proxy",
      "economy.budget-native-English",
    ],
  },
  "budget-pension.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/public-budgets/opening.ts:590; src/simulation/public-budgets/opening.ts:615; src/simulation/public-budgets/opening.ts:635",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "budget-policy.ts": {
    values: [
      0, 0.05, 0.07, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6,
      0.65, 0.7, 0.85, 30, 90,
    ],
    provenance: "ESTIMATED",
    source:
      "src/simulation/public-budgets/rules.ts:1; src/simulation/public-budgets/store.ts:1; src/simulation/legislative-effective-date.ts:16",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.budget-local-program-split",
      "economy.budget-interest-source-fallback",
      "economy.budget-pension-assumptions",
    ],
  },
  "budget-road.ts": {
    values: [0, 1, 30.44, 365.25],
    provenance: "SOURCED",
    source:
      "src/simulation/public-budgets/road-usage-charge.ts:29; src/simulation/public-budgets/road-usage-charge.ts:47",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "budget-tax-policy.ts": {
    values: [-1, 0.21, 1, 2, 11, 24, 28, 40.7, 100],
    provenance: "ESTIMATED",
    source:
      "src/simulation/public-budgets/rules.ts:130; src/simulation/public-budgets/road-usage-charge-constants.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.budget-road-national-projection",
      "economy.budget-road-first-bill-lag",
      "economy.budget-cannabis-tax-calibration",
    ],
  },
  "business-book-math.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/town-business-books.ts:97; src/simulation/living-world/town-business-books.ts:126",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "business-hiring.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/living-world/town-business-books.ts:110",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "business-layoffs.ts": {
    values: [2],
    provenance: "SOURCED",
    source: "src/simulation/living-world/town-business-books.ts:136",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "business-plans.ts": {
    values: [0, 1, 2, 3, 4, 12, 100],
    provenance: "TUNABLE",
    source: "src/simulation/local-economy.ts:199",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.business-plan-opening-caps"],
  },
  "business-supply.ts": {
    values: [0, 1, 2],
    provenance: "ESTIMATED",
    source:
      "src/simulation/local-business-counts.ts:62; src/simulation/local-business-counts.ts:112; src/simulation/local-business-counts.ts:132; src/simulation/local-business-counts.ts:152; src/simulation/local-business-counts.ts:220",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.source-business-count-estimate"],
  },
  "calendar-year.ts": {
    values: [0, 4],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/town-employment.ts:1130; src/simulation/local-economy.ts:341",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "calendar.ts": {
    values: [0, 1, 2, 3, 4, 86400000],
    provenance: "SOURCED",
    source: "src/simulation/careers/another-term.ts:398",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "cash-positions.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "src/simulation/resource-queries.ts:98; src/simulation/resource-queries.ts:859",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "central-bank.ts": {
    values: [
      -4, -1, 0, 0.125, 0.5, 1, 2, 3, 4, 4.4, 5, 6, 7, 9, 11, 12, 14, 30, 60,
      65, 70, 90, 100, 240, 400, 1000, 2025,
    ],
    provenance: "ESTIMATED",
    source:
      "src/simulation/macro-economy/central-bank.ts:152; src/simulation/macro-economy/central-bank.ts:254; src/simulation/macro-economy/central-bank.ts:739; src/simulation/macro-economy/central-bank.ts:794; src/simulation/macro-economy/central-bank.ts:902; src/simulation/macro-economy/central-bank.ts:991; src/simulation/macro-economy/central-bank.ts:1007",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.central-bank-succession-profile",
      "economy.central-bank-reading-window",
      "economy.central-bank-direction-vote",
      "economy.central-bank-native-English",
    ],
  },
  "completed-gross.ts": {
    values: [0, 60],
    provenance: "SOURCED",
    source: "src/simulation/completed-hourly-gross.ts:6",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "county-home-values.ts": {
    values: [0, 1, 2],
    provenance: "ESTIMATED",
    source:
      "src/simulation/county-home-value.ts:46; src/simulation/county-home-value.ts:63",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.county-home-equal-weight"],
  },
  "dated-cash.ts": {
    values: [-1, 0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/resource-payments.ts:48; src/simulation/resource-payments.ts:199; src/simulation/resource-payments.ts:249; src/simulation/resource-payments.ts:280",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "down-payments.ts": {
    values: [0],
    provenance: "ESTIMATED",
    source: "src/simulation/home-down-payment.ts:31",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.down-payment-completed-sample-mean"],
  },
  "employment-mix.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "employment-source-mix.ts": {
    values: [0, 1, 2, 3, 4, 6],
    provenance: "TUNABLE",
    source:
      "src/simulation/living-world/town-employment.ts:143; src/simulation/living-world/town-employment.ts:159; src/simulation/living-world/town-employment.ts:1070",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.employment-workplace-shares"],
  },
  "employment-tenure.ts": {
    values: [1],
    provenance: "SOURCED",
    source: "src/simulation/living-world/town-employment.ts:904",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "exact-quantity.ts": {
    values: [-1, 0, 1],
    provenance: "TUNABLE",
    source:
      "src/simulation/quantity.ts:14; src/simulation/quantity.ts:51; src/simulation/quantity.ts:86; src/simulation/quantity.ts:116; src/simulation/quantity.ts:158; src/simulation/quantity.ts:180; src/simulation/quantity.ts:223; src/simulation/quantity.ts:234",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.quantity-intermediate-overflow"],
  },
  "fiscal-and-month-dates.ts": {
    values: [0, 1, 2, 4, 5, 7, 12, 86400000],
    provenance: "SOURCED",
    source:
      "src/simulation/governing/budget-stakes.ts:57; src/simulation/macro-economy/store.ts:35",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "home-allocation.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/living-world/town-homes.ts:175",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "home-price-levels.ts": {
    values: [0, 1, 2, 100],
    provenance: "TUNABLE",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.home-price-mortgage-rate-proxy",
      "economy.home-price-supply-elasticity",
      "economy.home-price-opening-level",
    ],
  },
  "home-purchase-records.ts": {
    values: [-1, 0, 1, 2, 18, 100, 100000],
    provenance: "TUNABLE",
    source:
      "src/simulation/home-purchase.ts:69; src/simulation/home-purchase.ts:74; src/simulation/home-purchase.ts:253; src/simulation/money-text.ts:9",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.home-purchase-majority-age",
      "economy.home-purchase-native-English",
    ],
  },
  "home-purchase.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source: "src/simulation/job-market.ts:747",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "household-pay-math.ts": {
    values: [-1, 0, 1, 3, 12, 24, 26, 52, 100],
    provenance: "ESTIMATED",
    source:
      "src/simulation/household-pay.ts:48; src/simulation/household-pay.ts:84",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.poverty-year-region-extrapolation"],
  },
  "housing-occupancy.ts": {
    values: [0, 1],
    provenance: "TUNABLE",
    source:
      "src/simulation/living-world/town-rent.ts:559; src/simulation/living-world/town-rent.ts:1569",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.first-lease-bedroom-proxy",
      "economy.inclusionary-rounding-tolerance",
    ],
  },
  "housing-price-model.ts": {
    values: [-0.12, -0.0046, 0.036, 0.38, 0.63, 12],
    provenance: "SOURCED",
    source: "src/simulation/living-world/housing-price-model.ts:52",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "housing-prices.ts": {
    values: [-0.12, -0.00146, 0, 1, 2, 12, 100, 365],
    provenance: "ESTIMATED",
    source:
      "src/simulation/living-world/housing-market.ts:118; src/simulation/living-world/housing-market.ts:157; src/simulation/living-world/housing-market.ts:161; src/simulation/living-world/housing-market.ts:166",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.housing-supply-law-response",
      "economy.housing-price-cache-frontier",
    ],
  },
  "job-history-rules.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "living-cost-means.ts": {
    values: [0, 1, 5, 12, 100],
    provenance: "SOURCED",
    source: "src/simulation/living-costs-data.ts:47",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "living-cost-ratio.ts": {
    values: [0],
    provenance: "TUNABLE",
    source: "src/simulation/living-costs-data.ts:23",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.joint-living-cost-ratio"],
  },
  "loan-servicing.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "macro-calendar.ts": {
    values: [0, 0.98, 1, 1.02, 2, 4, 5, 7, 10, 12],
    provenance: "TUNABLE",
    source: "src/simulation/macro-economy/store.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.macro-housing-reading-bands"],
  },
  "macro-credit.ts": {
    values: [
      0, 0.001, 0.011, 0.012, 0.017, 0.048, 0.082, 0.1, 0.11, 0.14, 0.2, 0.3,
      0.32, 0.35, 0.5, 0.55, 0.59, 0.8, 0.999, 1, 1.2, 1.4, 1.5, 2, 2.5, 3, 3.3,
      6, 10, 12, 100, 1200, 1000000,
    ],
    provenance: "ESTIMATED",
    source:
      "src/simulation/macro-economy/credit.ts:191; src/simulation/macro-economy/credit.ts:197; src/simulation/macro-economy/credit.ts:202; src/simulation/macro-economy/credit.ts:252",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.credit-response-model"],
  },
  "macro-deterministic-math.ts": {
    values: [
      -700, 0, 0.6931471805599453, 0.7071067811865476, 1, 2, 60, 80, 700,
    ],
    provenance: "SOURCED",
    source: "src/simulation/world-setup/deterministic-math.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "macro-index-rules.ts": {
    values: [0, 1, 4, 10, 100],
    provenance: "SOURCED",
    source:
      "src/simulation/macro-economy/kernel.ts:24; src/simulation/macro-economy/kernel.ts:228; src/simulation/macro-economy/kernel.ts:239",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "macro-kernel.ts": {
    values: [0, 1, 6, 10, 12, 100],
    provenance: "SOURCED",
    source:
      "src/simulation/macro-economy/kernel.ts:124; src/simulation/macro-economy/kernel.ts:136; src/simulation/macro-economy/kernel.ts:201; src/simulation/macro-economy/kernel.ts:272; src/simulation/macro-economy/kernel.ts:291",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "macro-months.ts": {
    values: [0, 0.01, 1, 2, 4, 5, 7, 12, 100],
    provenance: "ESTIMATED",
    source:
      "src/simulation/macro-economy/producer.ts:131; src/simulation/macro-economy/producer.ts:140; src/simulation/macro-economy/producer.ts:160; src/simulation/macro-economy/producer.ts:279; src/simulation/macro-economy/producer.ts:289; src/simulation/macro-economy/producer.ts:361",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.macro-shock-floor",
      "economy.macro-local-exposure",
      "economy.macro-housing-ratio-hold",
    ],
  },
  "macro-policy.ts": {
    values: [
      -1, -0.5, -0.4, -0.3, -0.25, -0.2, -0.15, -0.05, -0.03, -0.02, -0.01, 0,
      0.002, 0.004, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.15, 0.2, 0.25,
      0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.985, 1, 1.5, 2,
      2.5, 2.7, 3, 3.5, 3.75, 4.6, 4.8, 6, 9, 14, 100,
    ],
    provenance: "ESTIMATED",
    source: "src/simulation/macro-economy/policy.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.macro-provisional-policy",
      "economy.macro-recovery-episode",
    ],
  },
  "macro-rate-choice.ts": {
    values: [
      -2, -1.5, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.3, 0.5, 0.6, 1, 1.5, 2, 4,
      10,
    ],
    provenance: "TUNABLE",
    source:
      "src/simulation/macro-economy/rate-choice.ts:100; src/simulation/macro-economy/rate-choice.ts:105; src/simulation/macro-economy/rate-choice.ts:120; src/simulation/macro-economy/rate-choice.ts:125",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.central-bank-judgment-bands"],
  },
  "macro-readings.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/macro-economy/readers.ts:24; src/simulation/macro-economy/readers.ts:37; src/simulation/macro-economy/readers.ts:47",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "mortgage-financing.ts": {
    values: [0, 1, 2],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "mortgage-quotes.ts": {
    values: [0, 1, 2, 3.5, 3.75, 6.15, 12, 30, 100],
    provenance: "ESTIMATED",
    source:
      "src/simulation/mortgage-financing.ts:55; src/simulation/mortgage-financing.ts:170",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.mortgage-saved-rate-pass-through"],
  },
  "operating-income.ts": {
    values: [0],
    provenance: "TUNABLE",
    source: "src/simulation/local-economy.ts:255",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.operating-income-omits-other-costs"],
  },
  "payday-and-shift.ts": {
    values: [-13, -6, 0, 1, 2, 5, 7, 8, 10, 15, 24, 60],
    provenance: "TUNABLE",
    source:
      "src/simulation/living-world/town-pay.ts:503; src/simulation/living-world/town-pay.ts:536; src/simulation/living-world/town-pay.ts:694; src/simulation/living-world/work-schedules.ts:514; src/simulation/living-world/work-schedules.ts:521",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.common-payday-calendar"],
  },
  "public-budget-decisions.ts": {
    values: [0],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "quarterly-pay.ts": {
    values: [0, 1, 10],
    provenance: "SOURCED",
    source: "src/simulation/living-world/town-finances.ts:449",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "raw-record-index.ts": {
    values: [0, 1, 16],
    provenance: "SOURCED",
    source: "src/simulation/history-index.ts:1",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "recorded-pay.ts": {
    values: [0, 1, 12, 24, 26, 52],
    provenance: "ESTIMATED",
    source: "src/simulation/recorded-work-pay.ts:48",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.recorded-pay-comparable-mean"],
  },
  "rent-and-eviction.ts": {
    values: [-1, 0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/town-rent.ts:581; src/simulation/living-world/town-rent.ts:756; src/simulation/living-world/town-rent.ts:1490; src/simulation/living-world/town-rent.ts:2290",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "retail-revenue.ts": {
    values: [0, 1],
    provenance: "TUNABLE",
    source: "src/simulation/public-budgets/cannabis-sales-revenue.ts:288",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.cannabis-missing-source-keys"],
  },
  "source-money-selectors.ts": {
    values: [-1, 0, 1, 100],
    provenance: "ESTIMATED",
    source:
      "src/simulation/starting-money.ts:56; src/simulation/student-debt.ts:50",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: [
      "economy.starting-cash-source-interpolation",
      "economy.student-rate-nearest-award",
    ],
  },
  "starting-cash.ts": {
    values: [0, 1, 12, 18, 52, 100, 365.25],
    provenance: "ESTIMATED",
    source:
      "src/simulation/starting-money.ts:32; src/simulation/starting-money.ts:236",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.starting-cash-pay-eligibility"],
  },
  "town-employment-mix.ts": {
    values: [0, 1, 4],
    provenance: "SOURCED",
    source:
      "Frozen supporting native unit/schema/calendar contract; see module imports and KEEP-DISPOSITION.md.",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "town-measures.ts": {
    values: [0, 1, 2],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/town-economy-measures.ts:37; src/simulation/living-world/town-economy-measures.ts:55; src/simulation/living-world/town-employment.ts:1106",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
  },
  "town-pay.ts": {
    values: [0, 1],
    provenance: "TUNABLE",
    source:
      "src/simulation/living-world/town-pay.ts:273; src/simulation/living-world/town-pay.ts:282; src/simulation/living-world/town-pay.ts:364",
    spread:
      "Frozen native values including structural indices, guards and units; no recalibration. Bounded all-56 native public-caller coverage is documented per source row. Source here identifies the retained implementation contract, not a new legal or empirical citation.",
    registeredStopgaps: ["economy.local-minimum-wages"],
  },
} as const;
