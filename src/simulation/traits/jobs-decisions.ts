import type { DecisionDeclaration } from "../trait-packs";

/** Job decisions exposed to trait packs. */
export const JOB_TRAIT_DECISIONS = {
  workerQuit: {
    id: "labor.worker-quit",
    scope: "career:choice",
    options: ["continue-work", "quit"],
  },
  dischargeAppeal: {
    id: "civil-personnel.discharge-appeal",
    scope: "career:choice",
    options: ["appeal", "no-appeal"],
  },
  commissionerSettlement: {
    id: "civil-personnel.commissioner-settlement",
    scope: "government:personnel",
    options: ["settlement-directed", "settlement-not-directed"],
  },
} as const satisfies Record<string, DecisionDeclaration>;

export const JOB_TRAIT_DECISION_DECLARATIONS: readonly DecisionDeclaration[] =
  Object.values(JOB_TRAIT_DECISIONS);
