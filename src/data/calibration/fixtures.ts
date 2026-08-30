import type { SyntheticTestFixture } from "./types";

export const SYNTHETIC_TEST_FIXTURES: readonly SyntheticTestFixture[] = [
  {
    kind: "synthetic-fixture",
    fixtureId: "fixture-working-class-single-parent",
    label: "Working-Class Single Parent with Care Obligations & High Debt",
    description:
      "Represents a single-parent household managing modest hourly wages, significant childcare hours, medical debt, and low liquid savings.",
    profile: {
      profileId: "bg-profile-working-class-single-parent",
      seed: "fixture-seed-001",
      householdComposition: "single_parent",
      householdSize: 3,
      parentGuardianStructure: "single_parent",
      employmentStatus: "full_time",
      annualHouseholdIncomeUsd: 34000,
      liquidResourcesUsd: 800,
      assets: {
        homeOwnershipStatus: "rent",
        estimatedHomeValueUsd: null,
        vehicleCount: 1,
        retirementSavingsUsd: 1200,
        otherAssetsUsd: 150,
      },
      debt: {
        studentDebtUsd: 14000,
        medicalDebtUsd: 6500,
        creditCardDebtUsd: 3800,
        mortgageDebtUsd: null,
        totalDebtUsd: 24300,
      },
      housingTenure: "rent",
      caregiving: {
        recipientType: "child",
        averageHoursPerWeek: 25,
        financialCareSupportMonthlyUsd: null,
      },
      recentEconomicShocks: [
        {
          shockType: "medical_emergency_cost",
          estimatedFinancialImpactUsd: 3200,
          occurredMonthsAgo: 4,
        },
      ],
      intergenerational: {
        parentalEducationLevel: "high_school_diploma",
        parentalWealthQuartile: "q1_bottom",
        directFinancialSupportReceivedMonthlyUsd: null,
      },
    },
  },
  {
    kind: "synthetic-fixture",
    fixtureId: "fixture-wealthy-multigen-household",
    label: "Wealthy Multigenerational Household",
    description:
      "Represents a multigenerational household with substantial assets, homeownership outright, eldercare responsibilities, and significant liquid buffers.",
    profile: {
      profileId: "bg-profile-wealthy-multigen-household",
      seed: "fixture-seed-002",
      householdComposition: "multigenerational",
      householdSize: 6,
      parentGuardianStructure: "dual_parent",
      employmentStatus: "full_time",
      annualHouseholdIncomeUsd: 260000,
      liquidResourcesUsd: 140000,
      assets: {
        homeOwnershipStatus: "own_outright",
        estimatedHomeValueUsd: 750000,
        vehicleCount: 3,
        retirementSavingsUsd: 480000,
        otherAssetsUsd: 35000,
      },
      debt: {
        studentDebtUsd: null,
        medicalDebtUsd: null,
        creditCardDebtUsd: 1200,
        mortgageDebtUsd: null,
        totalDebtUsd: 1200,
      },
      housingTenure: "own_outright",
      caregiving: {
        recipientType: "elderly_or_disabled",
        averageHoursPerWeek: 15,
        financialCareSupportMonthlyUsd: 400,
      },
      recentEconomicShocks: [],
      intergenerational: {
        parentalEducationLevel: "graduate_or_professional_degree",
        parentalWealthQuartile: "q4_top",
        directFinancialSupportReceivedMonthlyUsd: 1000,
      },
    },
  },
  {
    kind: "synthetic-fixture",
    fixtureId: "fixture-middle-income-mortgage-unstable",
    label: "Middle-Income Couple with Mortgage & Recent Employment Shock",
    description:
      "Represents a dual-earner middle income couple facing gig/unstable work following a recent job loss, carrying mortgage obligations.",
    profile: {
      profileId: "bg-profile-middle-income-mortgage-unstable",
      seed: "fixture-seed-003",
      householdComposition: "couple_with_children",
      householdSize: 4,
      parentGuardianStructure: "dual_parent",
      employmentStatus: "self_employed_gig",
      annualHouseholdIncomeUsd: 68000,
      liquidResourcesUsd: 5500,
      assets: {
        homeOwnershipStatus: "own_with_mortgage",
        estimatedHomeValueUsd: 320000,
        vehicleCount: 2,
        retirementSavingsUsd: 45000,
        otherAssetsUsd: 1200,
      },
      debt: {
        studentDebtUsd: 22000,
        medicalDebtUsd: null,
        creditCardDebtUsd: 8500,
        mortgageDebtUsd: 210000,
        totalDebtUsd: 240500,
      },
      housingTenure: "own_with_mortgage",
      caregiving: {
        recipientType: "child",
        averageHoursPerWeek: 18,
        financialCareSupportMonthlyUsd: null,
      },
      recentEconomicShocks: [
        {
          shockType: "job_loss_or_income_drop",
          estimatedFinancialImpactUsd: 9500,
          occurredMonthsAgo: 2,
        },
      ],
      intergenerational: {
        parentalEducationLevel: "some_college_or_associates",
        parentalWealthQuartile: "q2_lower_middle",
        directFinancialSupportReceivedMonthlyUsd: null,
      },
    },
  },
];
