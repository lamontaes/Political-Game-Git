import { lawInForce } from "../governing/law-in-force";
import { recordById, recordByStableKey } from "../history-index";
import { lawEffectStamp } from "../law-effect-stamp";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { COUNCIL_TERM_LIMIT_QUESTION } from "../living-world/local-council-term-limits";
import { personName } from "../people";
import type { World } from "../types";
import { recordWorldEvent } from "../world";
import { checkRow, questionForRow } from "./institution-rule";
/** Existing saved term-bar determinations only. Live candidacy enforcement remains on its owning caller. */
export const rightPermissionRegistration: LawConsequenceKindRegistration = {
  kind: "right-permission",
  owner: "Team1",
  selectors: ["recorded-term-bar-subjects"],
  actions: ["record-candidacy-permission"],
  predicates: [],
  units: [],
  resolve(
    world: World,
    row: LawConsequenceRow,
    context: LawConsequenceContext,
  ): readonly ResolvedLawConsequence[] {
    checkRow(
      row,
      "right-permission",
      "recorded-term-bar-subjects",
      "record-candidacy-permission",
      "recorded-candidacy-permission",
    );
    if (context.activity !== row.when) return [];
    const event = recordById(world.history.events, context.activityId);
    if (
      !event ||
      event.occurredAt !== context.onDate ||
      event.type !== "local.officeholder-retired" ||
      !event.tags.includes("barred:term-limit") ||
      !event.jurisdictionId
    )
      return [];
    const question = questionForRow(world, row);
    if (question.stableKey !== COUNCIL_TERM_LIMIT_QUESTION)
      throw new Error(`Consequence ${row.id}: unsupported candidacy authority`);
    const law = lawInForce(
      world,
      event.jurisdictionId,
      question.id,
      context.onDate,
    );
    if (
      !law ||
      law.answer !== "yes" ||
      (context.governingLawId && context.governingLawId !== law.measureId)
    )
      return [];
    return context.subjectIds
      .filter((id) => world.people[id] && event.involvedEntityIds.includes(id))
      .map((id) => ({
        row,
        law,
        questionKey: question.stableKey,
        jurisdictionId: event.jurisdictionId!,
        subject: { kind: "person" as const, id },
        activityId: event.id,
        effectiveAt: event.occurredAt,
        sourceRecordIds: [event.id, id],
        value: { type: "boolean" as const, value: false },
      }));
  },
  apply(world: World, resolved: ResolvedLawConsequence): World {
    checkRow(
      resolved.row,
      "right-permission",
      "recorded-term-bar-subjects",
      "record-candidacy-permission",
      "recorded-candidacy-permission",
    );
    const person = world.people[resolved.subject.id];
    const source = recordById(world.history.events, resolved.activityId);
    if (
      resolved.subject.kind !== "person" ||
      !person ||
      !source ||
      !source.tags.includes("barred:term-limit") ||
      !source.involvedEntityIds.includes(person.id) ||
      resolved.value.type !== "boolean" ||
      resolved.value.value ||
      resolved.questionKey !== COUNCIL_TERM_LIMIT_QUESTION ||
      resolved.law.answer !== "yes"
    )
      throw new Error(
        `Consequence ${resolved.row.id}: unsupported resolved candidacy decision`,
      );
    const stableKey = `law-consequence:${resolved.row.id}:${resolved.law.measureId}:${person.id}:${source.id}:${resolved.effectiveAt}`;
    if (recordByStableKey(world.history.events, stableKey)) return world;
    const stamp = lawEffectStamp(resolved.law, {
      effectKind: "candidacy-permission-recorded",
      questionKey: resolved.questionKey,
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: resolved.effectiveAt,
      sourceRecordIds: resolved.sourceRecordIds,
    });
    if (!stamp)
      throw new Error(
        `Consequence ${resolved.row.id}: invalid governing law stamp`,
      );
    return recordWorldEvent(world, {
      stableKey,
      type: "local.candidacy-permission",
      occurredAt: resolved.effectiveAt,
      recordedAt: world.currentDate,
      jurisdictionId: resolved.jurisdictionId,
      involvedEntityIds: [person.id, source.id],
      participants: [
        {
          personId: person.id,
          role: "focus:subject",
          detail: "candidacy barred by recorded term-limit determination",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "law-consequence-v1",
        "permission:denied",
        `row:${resolved.row.id}`,
        `source:${source.id}`,
      ],
      summary: `${personName(person)} may not seek the recorded council term; the existing term-limit determination is ${source.id}.`,
      context: source.context,
      lawEffectStamps: [stamp],
    });
  },
};
