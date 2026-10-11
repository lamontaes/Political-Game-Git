import type { IsoDate } from "../../simulation/types";
import type { TaxTerms } from "../../simulation/tax-types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { StatuteDateContext } from "../../simulation/governing/statute-effective-date";
import {
  statuteEffectiveRule,
  stateStatuteOperativeAt,
  statuteEffectiveDateEstimated,
  type StatuteFacts,
} from "./statute-date-dependency";
import { addDays as advanceDays } from "../elections/calendar";
function addDays(date: IsoDate, days: number): IsoDate {
  return advanceDays(date, days) as IsoDate;
}
export interface EnactmentDateFacts extends StatuteFacts {
  readonly government: string | null;
}
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;

export type LegislativeEffectiveDateResolution =
  | {
      readonly kind: "source-default";
      readonly effectiveAt: IsoDate | null;
    }
  | {
      readonly kind: "game-default";
      readonly effectiveAt: IsoDate;
    };

export function resolveLegislativeEffectiveDate(
  facts: EnactmentDateFacts,
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
  dateContext?: StatuteDateContext,
): LegislativeEffectiveDateResolution {
  const government = dateContext ? facts.government : null;
  if (
    dateContext &&
    (government === "state" || government === "territory") &&
    statuteEffectiveRule(facts, pack.jurisdictionKey)
  ) {
    const effectiveAt = stateStatuteOperativeAt(
      facts,
      pack.jurisdictionKey,
      enactedAt,
      dateContext,
    );
    return effectiveAt !== null &&
      statuteEffectiveDateEstimated(
        facts,
        pack.jurisdictionKey,
        enactedAt,
        dateContext,
      )
      ? { kind: "game-default", effectiveAt }
      : { kind: "source-default", effectiveAt };
  }
  const schedule = pack.enactment.defaultEffectiveSchedule;
  if (schedule?.kind === "known") {
    switch (schedule.value.kind) {
      case "days-after-enactment":
        return {
          kind:
            schedule.source.verification === "game-profile"
              ? "game-default"
              : "source-default",
          effectiveAt: addDays(enactedAt, schedule.value.days),
        };
    }
  }
  const distinct = pack.enactment.effectiveDateDistinctFromEnactment;
  if (distinct.kind === "known" && !distinct.value) {
    return {
      kind:
        distinct.source.verification === "game-profile"
          ? "game-default"
          : "source-default",
      effectiveAt: enactedAt,
    };
  }
  return {
    kind: "game-default",
    effectiveAt: addDays(enactedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
  };
}
export function taxPolicyEffectiveDate(
  enactment: {
    readonly resolvedAt: IsoDate;
    readonly effectiveAt: IsoDate | null;
  },
  terms: TaxTerms,
): IsoDate {
  const profileDate = addDays(
    enactment.resolvedAt,
    terms.effectiveDelayDays ?? 90,
  );
  if (
    terms.legalBaselineAssumption !== "authored-state-game-profile" ||
    !enactment.effectiveAt ||
    enactment.effectiveAt <= profileDate
  )
    return profileDate;
  return enactment.effectiveAt;
}
/** Pinned compiler identity is F's output. This kernel owns the date decision after admission. */
export function typedTaxEnactmentDate(
  facts: EnactmentDateFacts & {
    readonly onDate: IsoDate;
    readonly filedIdentity: { readonly kind: "available" | "unavailable" };
    readonly proposal: { readonly terms: TaxTerms } | null;
    readonly pack: LegislativeRulePack | null;
  },
): IsoDate | null {
  if (facts.filedIdentity.kind !== "available") return null;
  const { proposal, pack } = facts;
  if (!proposal || !pack) return null;
  const defaultDate = resolveLegislativeEffectiveDate(
    facts,
    pack,
    facts.onDate,
  );
  return taxPolicyEffectiveDate(
    { resolvedAt: facts.onDate, effectiveAt: defaultDate.effectiveAt },
    proposal.terms,
  );
}

// stopgapId: "SG-P14-legislatures-default-effective-date"
