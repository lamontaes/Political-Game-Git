import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { recordByStableKey } from "../history-index";
import { recordWorldEvent } from "../world";
import { knownRule, fractionOf } from "../legislature-rules";
import type { LegislativeRulePack } from "../legislature-rules";
import type { EntityId, LegislativeMeasureRecord, World } from "../types";
import { seatedCongressChamber } from "./congress-chambers";
import { principledLeaning } from "./officeholder-principles";
import { lawInForce, statuteAnswer } from "./law-in-force";
import { FEDERAL_LAW_EFFECTS } from "../public-budgets/federal-treasury";
import { currentMeasureProvisions } from "../legislative-politics";

const VERSION = "congress-procedure/v1";
const SOURCE = {
  authority: "research-reference",
  citation: "2 U.S.C. § 644; Senate unanimous consent",
  sourceTitle: "CRS R48444 and Senate glossary",
  sourceUrl:
    "https://www.congress.gov/crs_external_products/R/PDF/R48444/R48444.2.pdf",
  retrievedAt: "2026-09-29",
  verification: "partial",
  note: "Budget-only, deficit-reducing reconciliation profile; not a complete parliamentary ruling on all possible riders.",
} as const;

/**
 * Narrow automatic Byrd review: each term must change a registered fiscal line,
 * every recurring term must avoid a deficit increase, and Social Security is
 * excluded. Mixed or unscored terms stay on the ordinary route. A fiscal label
 * by itself never qualifies a bill.
 */
export function reconciliationScope(
  world: World,
  measure: LegislativeMeasureRecord,
): boolean {
  if (measure.rulePackId !== US_CONGRESS_PACK_ID) return false;
  const answers = measure.propositionAnswers ?? [];
  if (answers.length === 0) return false;
  for (const term of answers) {
    const proposition = world.policyCatalog.propositions[term.propositionId];
    if (!proposition) return false;
    const issue = world.policyCatalog.issues[proposition.issueId];
    if (issue?.stableKey.includes("social-security")) return false;
    const effects = FEDERAL_LAW_EFFECTS.filter(
      (e) => e.questionKey === proposition.stableKey,
    );
    if (effects.length === 0) return false;
    const prior = statuteAnswer(
      lawInForce(world, measure.jurisdictionId, term.propositionId),
    );
    if (prior === "closed" || prior === term.answer) return false;
    // The treasury starts from sourced actual receipts/outlays and applies
    // only enacted-in-play deltas. No enacted delta means the model's known
    // opening books, not a claim that unrecorded law answers "no".
    const applied = lawInForce(
      world,
      measure.jurisdictionId,
      term.propositionId,
      world.currentDate,
      "enacted-only",
    );
    for (const effect of effects) {
      if (effect.shareOn) return false; // Unscored future windows need a fiscal score.
      const after = (term.answer === "yes" ? effect.toYes : effect.toNo) ?? 0;
      const before = applied
        ? ((applied.answer === "yes" ? effect.toYes : effect.toNo) ?? 0)
        : 0;
      const delta = after - before;
      if (
        delta === 0 ||
        (effect.line.kind === "receipt" ? delta < 0 : delta > 0)
      )
        return false;
    }
  }
  // Every recorded section needs a fiscal answer scored above. An unlinked
  // clause is unscored; a budget title does not make that clause incidental.
  return currentMeasureProvisions(world, measure.id).every(
    (section) =>
      section.answers !== undefined &&
      answers.some(
        (a) =>
          a.propositionId === section.answers!.propositionId &&
          a.answer === section.answers!.answer,
      ),
  );
}

function procedureKey(measureId: EntityId) {
  return `${VERSION}:${measureId}`;
}

export function recordedCongressProcedure(
  world: World,
  measureId: EntityId,
): "ordinary" | "reconciliation" | "unanimous-consent" {
  const record = recordByStableKey(
    world.history.events,
    procedureKey(measureId),
  );
  if (record?.tags.includes("procedure:reconciliation"))
    return "reconciliation";
  if (record?.tags.includes("procedure:unanimous-consent"))
    return "unanimous-consent";
  return "ordinary";
}

/**
 * Compact budget-resolution producer: each chamber decides the fiscal
 * instructions from its members' recorded principles. The dated roll and
 * outcome are canonical events; these instructions are not enacted law.
 */
export function recordBudgetInstructions(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (
    recordedCongressProcedure(world, measure.id) !== "ordinary" ||
    !reconciliationScope(world, measure)
  )
    return world;
  let next = world;
  const instructionKeys: string[] = [];
  for (const chamberKey of ["house", "senate"] as const) {
    const key = `${VERSION}:instructions:${measure.id}:${chamberKey}`;
    instructionKeys.push(key);
    const existing = recordByStableKey(next.history.events, key);
    if (existing) {
      if (!existing.tags.includes("outcome:passed")) return next;
      continue;
    }
    const members = seatedCongressChamber(next, chamberKey)?.body.members ?? [];
    if (!members.length) return next;
    const ballots = members.map((member) => {
      if (
        !member.personId ||
        (next.control.kind === "person" &&
          next.control.personId === member.personId)
      )
        return { member, disposition: "absent" };
      const views = (measure.propositionAnswers ?? []).map((a) => {
        const score = principledLeaning(
          next,
          member.personId!,
          a.propositionId,
        ).score;
        return a.answer === "yes" ? score : -score;
      });
      return {
        member,
        disposition: views.every((score) => score > 0)
          ? "yea"
          : views.some((score) => score < 0)
            ? "nay"
            : "present-not-voting",
      };
    });
    const yeas = ballots.filter((b) => b.disposition === "yea").length;
    const nays = ballots.filter((b) => b.disposition === "nay").length;
    const present = ballots.filter((b) => b.disposition !== "absent").length;
    const passed = present > members.length / 2 && yeas > nays;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "congress.budget-instructions-voted",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: measure.jurisdictionId,
      involvedEntityIds: [measure.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        VERSION,
        "basis:game-profile",
        `chamber:${chamberKey}`,
        `outcome:${passed ? "passed" : "failed"}`,
        ...ballots
          .filter((b) => b.member.personId)
          .map((b) => `ballot:${b.member.personId}:${b.disposition}`),
      ],
      summary: `The ${chamberKey === "house" ? "House" : "Senate"} ${passed ? "adopted" : "did not adopt"} deficit-reducing budget instructions for ${measure.designation}: ${yeas} yeas and ${nays} nays, with ${present} members present.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation:
          "Members weighed the fiscal instructions from their recorded principles.",
        immediateReaction: null,
      },
    });
    if (!passed) return next;
  }
  return recordProcedure(
    next,
    measure,
    "reconciliation",
    instructionKeys.map((key) => `instructions:${key}`),
    "Both chambers adopted deficit-reducing budget instructions from their members' principles. The bill's scored fiscal terms comply with those instructions.",
  );
}

/** Before Senate calendar placement, an objection keeps the ordinary route. */
export function recordUnanimousConsent(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (
    measure.rulePackId !== US_CONGRESS_PACK_ID ||
    measure.subjectClass !== "general-policy" ||
    recordedCongressProcedure(world, measure.id) !== "ordinary"
  )
    return world;
  const answers = measure.propositionAnswers ?? [];
  const senators = seatedCongressChamber(world, "senate")?.body.members ?? [];
  if (!answers.length || !senators.length || senators.some((s) => !s.personId))
    return world;
  if (
    senators.some(
      (s) =>
        world.control.kind === "person" &&
        world.control.personId === s.personId,
    )
  )
    return world;
  const objection = senators.some((s) =>
    answers.some((a) => {
      const score = principledLeaning(
        world,
        s.personId!,
        a.propositionId,
      ).score;
      return (a.answer === "yes" ? score : -score) < 0;
    }),
  );
  if (objection) return world;
  return recordProcedure(
    world,
    measure,
    "unanimous-consent",
    senators.map((s) => `no-objection:${s.personId}`),
    "No senator objected from their principles to the routine measure's recorded terms.",
  );
}

function recordProcedure(
  world: World,
  measure: LegislativeMeasureRecord,
  kind: "reconciliation" | "unanimous-consent",
  tags: readonly string[],
  reason: string,
): World {
  return recordWorldEvent(world, {
    stableKey: procedureKey(measure.id),
    type: "congress.procedure-adopted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [VERSION, `procedure:${kind}`, ...tags],
    summary: reason,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: reason,
      immediateReaction: null,
    },
  });
}

/** Writers and action replay must use this same saved procedure. */
export function congressProcedurePack(
  world: World,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
): LegislativeRulePack {
  const procedure = recordedCongressProcedure(world, measure.id);
  if (measure.rulePackId !== US_CONGRESS_PACK_ID || procedure === "ordinary")
    return pack;
  return {
    ...pack,
    chambers: pack.chambers.map((chamber) =>
      chamber.chamberKey !== "senate"
        ? chamber
        : {
            ...chamber,
            floorStages: chamber.floorStages
              .filter((stage) => stage.stageKey !== "cloture")
              .map((stage) =>
                procedure !== "unanimous-consent"
                  ? stage
                  : {
                      ...stage,
                      vote: knownRule(
                        fractionOf(
                          1,
                          1,
                          "members-voting",
                          "unanimous consent of the senators voting",
                          SOURCE,
                        ),
                        SOURCE,
                      ),
                    },
              ),
          },
    ),
  };
}
