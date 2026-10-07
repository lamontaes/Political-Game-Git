import type { World, EntityId } from "../../src/simulation/types";
import {
  isLawEffectStamp,
  type LawEffectStamp,
} from "../../src/simulation/law-effect-stamp";
import { addDays } from "../../src/simulation/dates";
import { measureAnswersAt } from "../../src/simulation/vote-bundle";
import {
  enactmentOperative,
  lawInForce,
  lawInForceAtStart,
  ownLawLevel,
} from "../../src/simulation/governing/law-in-force";
import { lawEffectPaths } from "../../src/simulation/governing/law-effect-paths";
import {
  outcomeLinksFedByQuestion,
  outcomeLinkStatus,
  type OutcomeLink,
} from "../../src/simulation/outcome-web";
import {
  placeOutcomeRecords,
  type PlaceOutcomeRecord,
} from "../../src/simulation/outcome-web/place-outcome-store";
import { STATE_TRANSIT_SERVICE_QUESTION } from "../../src/simulation/legislation-transit-families";
import { personName } from "../../src/simulation/people";
import traces from "./trace-inventory.json" with { type: "json" };

export interface Evidence {
  record: string;
  touched: string;
  before: unknown;
  after: unknown;
  detail: string;
  jurisdictionId?: string;
  appliedAt?: string;
  recordDate?: string;
  sourceRecordIds?: readonly EntityId[];
}
export interface AuditRow {
  source: "enacted" | "starting";
  lawSource: LawEffectStamp["source"];
  enactmentId: string | null;
  measureId: string;
  designation: string;
  title: string;
  jurisdiction: string;
  jurisdictionId: string;
  level: string;
  question: string | null;
  answer: string | null;
  startingAnswer: string | null;
  comparison:
    | "changes the law"
    | "same as starting law"
    | "no starting law"
    | "no catalog answer";
  effectiveAt: string;
  effect: string;
  reader: string;
  fired: boolean;
  reason: string;
  evidence: Evidence[];
  research: unknown;
  trace: unknown;
}
type JsonRecord = Record<string, unknown>;
function object(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function strings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (object(value))
    for (const item of Object.values(value)) strings(item, out);
  return out;
}
function numbers(
  value: unknown,
  prefix = "",
  out: JsonRecord = {},
): JsonRecord {
  if (object(value))
    for (const [key, item] of Object.entries(value)) {
      if (key === "sequence") continue;
      if (typeof item === "number") out[`${prefix}${key}`] = item;
      else if (object(item)) numbers(item, `${prefix}${key}.`, out);
    }
  return out;
}
const COLLECTIONS: Record<string, RegExp> = {
  paycheck:
    /resourceTransfers|resourceFlows|withholding|moneyFlow|employment|teacher/i,
  "state-revenue": /tax|resourceTransfers|resourceFlows/i,
  "state-spending": /publicProgram|resourceTransfers|resourceFlows/i,
  "rent-and-eviction": /dwelling|rent|eviction/i,
  "home-prices": /dwelling|housing|home|property/i,
  "seat-turnover": /election|participation|ward|district|office/i,
  "court-and-jail": /court|criminal|sentence|justice|detention|pretrial/i,
  "business-costs": /business|resourceTransfers|resourceFlows/i,
  "authority-gate": /ruleChange|municipal|constitutional/i,
  "local-powers": /ruleChange|municipal|constitutional/i,
  "news-and-reactions": /press|knowledge|publication|conversation|principle/i,
};

/** Read-only, once at the end of a run. A title, procedural vote or aggregate
 * drift alone is never proof that an effect fired. Unknown evidence stays a gap. */
export function auditWorld(opening: World, world: World): AuditRow[] {
  const rows: AuditRow[] = [];
  const paths = lawEffectPaths();
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((row) => [row.id, row]),
  );
  const outcomes = placeOutcomeRecords(world);
  const openingOutcomes = placeOutcomeRecords(opening);
  const entries: {
    collection: string;
    record: JsonRecord;
    refs: Set<string>;
  }[] = [];
  for (const [collection, records] of Object.entries(world.history)) {
    if (!Array.isArray(records)) continue;
    for (const record of records)
      if (
        object(record) &&
        typeof record.sequence === "number" &&
        record.sequence >= opening.history.nextSequence
      )
        entries.push({ collection, record, refs: strings(record) });
  }
  const stampedEntries = collectStampedRecords(opening, world);
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (
      enactment.outcome !== "enacted" ||
      (enactment.resolvedAt <= opening.currentDate &&
        !stampedEntries.some(
          ({ stamp }) =>
            stamp.source === "enacted" &&
            stamp.governingLawKey === enactment.measureId,
        )) ||
      enactment.resolvedAt > world.currentDate
    )
      continue;
    const measure = measures.get(enactment.measureId);
    if (!measure)
      throw new Error(`Missing enacted measure ${enactment.measureId}`);
    const answers = measureAnswersAt(world, measure.id, enactment.sequence);
    const effective = enactmentOperative(world, measure, enactment).operativeAt;
    const base = {
      source: "enacted" as const,
      lawSource: "enacted" as const,
      enactmentId: enactment.id,
      measureId: measure.id,
      designation: measure.designation,
      title: measure.shortTitle,
      jurisdiction:
        world.jurisdictions[measure.jurisdictionId]?.name ??
        measure.jurisdictionId,
      jurisdictionId: measure.jurisdictionId,
      level: ownLawLevel(measure.jurisdictionId),
      effectiveAt: effective,
    };
    const questions = answers.length
      ? answers
      : [{ propositionId: null, answer: null }];
    for (const answer of questions) {
      const proposition = answer.propositionId
        ? world.policyCatalog.propositions[answer.propositionId]
        : null;
      const question = proposition?.stableKey ?? null;
      const starting = answer.propositionId
        ? lawInForceAtStart(
            world,
            measure.jurisdictionId,
            answer.propositionId,
            opening.currentDate,
          )
        : null;
      const trace = traces.filter((row) => row.questionKey === question);
      const context = {
        ...base,
        question,
        answer: answer.answer,
        startingAnswer: starting,
        comparison: !question
          ? ("no catalog answer" as const)
          : starting === null
            ? ("no starting law" as const)
            : starting === answer.answer
              ? ("same as starting law" as const)
              : ("changes the law" as const),
        trace,
      };
      const links = question ? outcomeLinksFedByQuestion(question) : [];
      const direct = paths.filter(
        (path) => path.questionKey === question && path.kind !== "outcome-web",
      );
      const effects: { effect: string; reader: string; link?: OutcomeLink }[] =
        [
          ...links.map((link) => ({
            effect: `outcome-web:${link.to}`,
            reader: link.key,
            link,
          })),
          ...direct.map((path) => ({ effect: path.kind, reader: path.via })),
          {
            effect: "news-and-reactions",
            reader:
              "src/simulation/press/law-effect-news.ts; canonical press/knowledge evidence",
          },
        ];
      const appropriations = (world.history.publicProgramRecords ?? []).filter(
        (record) =>
          record.kind === "appropriation" &&
          record.sourceMeasureId === measure.id,
      );
      if (
        question === STATE_TRANSIT_SERVICE_QUESTION ||
        appropriations.length
      ) {
        effects.push(
          {
            effect: "spending-authority",
            reader: "src/simulation/governing/program-governing.ts",
          },
          {
            effect: "program-payment",
            reader: "src/simulation/governing/public-program.ts",
          },
          {
            effect: "public-service",
            reader: "src/simulation/governing/public-program-transit.ts",
          },
        );
      }
      if (!links.length && !direct.length)
        effects.unshift({
          effect: "rule-or-service",
          reader: "No path in lawEffectPaths or outcome links",
        });
      const stamped = stampedEntries.filter(
        ({ stamp }) =>
          stamp.source === "enacted" &&
          stamp.governingLawKey === measure.id &&
          stamp.questionKey === question,
      );
      appendStampedRows(rows, world, context, stamped);
      if (enactment.resolvedAt <= opening.currentDate) continue;
      for (const effect of effects) {
        const evidence: Evidence[] = [];
        let reason =
          "reader-present-no-attributable-record; inspect the reader and missing trace before assigning a cause";
        if (effect.link) {
          const link = effect.link;
          const status = outcomeLinkStatus(link);
          reason =
            status === "built"
              ? "no-recorded-cause-in-operative-window"
              : status;
          if (status === "built" && answer.propositionId) {
            for (const record of outcomes) {
              if (
                record.measure !== link.to ||
                record.month <= opening.currentDate ||
                record.month > world.currentDate
              )
                continue;
              const cause = record.causes.find(
                (cause) => cause.key === link.key && cause.factor !== 1,
              );
              if (!cause) continue;
              const readAt = addDays(
                record.month,
                -Math.round(link.lagMonths * 30.44),
              );
              const law = lawInForce(
                world,
                record.jurisdictionId,
                answer.propositionId,
                readAt,
              );
              if (law?.measureId !== measure.id) continue;
              const previous = [...openingOutcomes, ...outcomes]
                .filter(
                  (row) =>
                    row.measure === record.measure &&
                    row.placeKey === record.placeKey &&
                    row.month < record.month,
                )
                .at(-1);
              evidence.push(outcomeEvidence(record, previous, cause.factor));
            }
          }
        } else {
          const channels: Record<string, readonly string[]> = {
            paycheck: ["paycheck", "job-rule"],
            "state-revenue": ["tax-payment"],
            "state-spending": ["benefit", "public-service"],
            "rent-and-eviction": ["rent"],
            "business-costs": ["business-rule"],
          };
          for (const exposure of world.history.lawExposures ?? []) {
            if (
              exposure.measureId !== measure.id ||
              exposure.relation !== "own" ||
              exposure.sequence < opening.history.nextSequence ||
              !channels[effect.effect]?.includes(exposure.channel)
            )
              continue;
            const source = entries.find(
              (entry) => entry.record.id === exposure.sourceRecordId,
            );
            if (!source) continue;
            const person = world.people[exposure.personId];
            evidence.push({
              record: `lawExposures:${exposure.id}; ${source.collection}:${exposure.sourceRecordId}`,
              touched: person ? personName(person) : exposure.personId,
              before: null,
              after: {
                channel: exposure.channel,
                direction: exposure.direction,
                amount: exposure.amount,
                source: numbers(source.record),
              },
              detail:
                "Canonical own exposure and its source record. Prior amount is unrecorded here; no zero baseline is inferred.",
            });
          }
          if (
            effect.effect === "paycheck" ||
            effect.effect === "rent-and-eviction"
          ) {
            const terms = new Map(
              world.history.resourceFlowTerms.map((term) => [term.id, term]),
            );
            const flows = new Map(
              world.history.resourceFlows.map((flow) => [flow.id, flow]),
            );
            for (const term of world.history.resourceFlowTerms) {
              if (
                term.sequence < opening.history.nextSequence ||
                term.provenance.kind !== "simulated-event" ||
                term.provenance.eventId !== enactment.outcomeEventId ||
                !term.supersedesTermsId
              )
                continue;
              const before = terms.get(term.supersedesTermsId);
              const flow = flows.get(term.resourceFlowId);
              if (
                !before ||
                !flow ||
                before.amount.minorUnits === term.amount.minorUnits
              )
                continue;
              if (
                effect.effect === "paycheck"
                  ? flow.basisReference.kind !== "work"
                  : !flow.basisKind.startsWith("housing:")
              )
                continue;
              const personIds = [
                ...strings([flow.source, flow.recipient]),
              ].filter((id) => world.people[id]);
              evidence.push({
                record: `resourceFlowTerms:${term.id}`,
                touched:
                  personIds
                    .map((id) => personName(world.people[id]!))
                    .join(", ") || `resource flow ${flow.id}`,
                before: before.amount,
                after: term.amount,
                detail: `${term.reason}; recurring terms changed, actual payment remains a separate check.`,
              });
            }
          }
          const pattern = COLLECTIONS[effect.effect];
          const directIds = new Set([
            measure.id,
            enactment.id,
            enactment.outcomeEventId,
          ]);
          // Event knowledge and press can reference the enacted outcome event.
          // Other paths must reference this measure/enactment, not an unrelated event.
          for (const entry of entries) {
            if (!pattern?.test(entry.collection)) continue;
            const allowed =
              effect.effect === "news-and-reactions"
                ? directIds
                : new Set([measure.id, enactment.id]);
            if (![...allowed].some((id) => entry.refs.has(id))) continue;
            const numeric = numbers(entry.record);
            // A reference proves reading/noticing; without a prior numeric record
            // it does not prove a money, service or rule change.
            if (effect.effect !== "news-and-reactions") continue;
            const personId =
              typeof entry.record.personId === "string"
                ? entry.record.personId
                : null;
            evidence.push({
              record: `${entry.collection}:${String(entry.record.id ?? entry.record.sequence)}`,
              touched: personId
                ? world.people[personId]
                  ? personName(world.people[personId]!)
                  : personId
                : base.jurisdiction,
              before: "No new linked record at opening",
              after: numeric,
              detail:
                "Saved event-linked knowledge or press record; noticing is separate from attention or changed opinion.",
            });
          }
          if (effect.effect === "rule-or-service")
            reason = question
              ? "no-registered-reader; research/trace coverage still required"
              : "no-catalog-answer-or-registered-effect; authored scenario needs an explicit trace";
        }
        if (
          ["spending-authority", "program-payment", "public-service"].includes(
            effect.effect,
          )
        ) {
          const records = world.history.publicProgramRecords ?? [];
          const authorities = records.filter(
            (record) =>
              record.kind === "appropriation" &&
              record.sourceMeasureId === measure.id,
          );
          const commitments = records.filter(
            (record) =>
              record.kind === "commitment" &&
              authorities.some(
                (authority) => authority.id === record.appropriationId,
              ),
          );
          const installments = records.filter(
            (record) =>
              record.kind === "installment" &&
              commitments.some(
                (commitment) => commitment.id === record.commitmentId,
              ),
          );
          reason =
            authorities.length === 0
              ? "no-saved-appropriation; program-governing.ts admission/lineage must be traced"
              : commitments.length === 0
                ? "no-commitment-against-saved-appropriation"
                : installments.length === 0
                  ? "no-installment-record-against-commitment"
                  : "no-completed-program-payment";
          if (effect.effect === "spending-authority") {
            for (const authority of authorities) {
              if (
                authority.kind !== "appropriation" ||
                authority.availableFrom > world.currentDate
              )
                continue;
              evidence.push({
                record: `publicProgramRecords:${authority.id}`,
                touched: base.jurisdiction,
                before: "No authority under this measure at opening",
                after: {
                  amount: authority.amount,
                  availableFrom: authority.availableFrom,
                  availableThrough: authority.availableThrough,
                },
                detail:
                  "Recorded legal spending authority; not cash, payment, service or a researched effect size.",
              });
            }
          }
          for (const installment of installments) {
            if (installment.kind !== "installment") continue;
            if (installment.status === "failed") {
              reason = `recorded-payment-failure: ${installment.reason}`;
              continue;
            }
            const payment = world.history.resourceTransferOutcomes.find(
              (outcome) =>
                outcome.resourceFlowId === installment.resourceFlowId &&
                outcome.status === "completed",
            );
            if (!payment) {
              reason = "posted-installment-without-completed-transfer";
              continue;
            }
            const flow = world.history.resourceFlows.find(
              (flow) => flow.id === payment.resourceFlowId,
            );
            if (effect.effect === "program-payment")
              evidence.push({
                record: `publicProgramRecords:${installment.id}; resourceTransferOutcomes:${payment.id}`,
                touched: flow
                  ? JSON.stringify(flow.recipient)
                  : base.jurisdiction,
                before: null,
                after: payment.transferredAmount,
                detail:
                  "Actual completed transfer under this measure's commitment. The recipient endpoint is preserved; prior income is not inferred.",
              });
            if (effect.effect === "public-service") {
              const delivered = world.history.events.filter(
                (event) =>
                  event.type === "transit.program-paid-service-hours" &&
                  event.involvedEntityIds.includes(measure.id) &&
                  event.involvedEntityIds.includes(payment.resourceFlowId),
              );
              for (const event of delivered)
                evidence.push({
                  record: `events:${event.id}`,
                  touched:
                    world.jurisdictions[event.jurisdictionId!]?.name ??
                    base.jurisdiction,
                  before: null,
                  after: event.summary,
                  detail:
                    "Paid physical service record only; ridership, access and travel time remain separate effects.",
                });
              if (delivered.length === 0)
                reason =
                  "completed-payment-without-matching-paid-service-event";
            }
          }
        }
        if (evidence.length) reason = "recorded-effect";
        else if (effective > world.currentDate) reason = "effective-after-run";
        else if (effect.link?.evidence === "about-zero")
          reason = "researched-about-zero";
        else if (starting !== null && starting === answer.answer)
          reason = `same-as-starting-law; ${reason}`;
        rows.push({
          ...context,
          effect: effect.effect,
          reader: effect.reader,
          fired: evidence.length > 0,
          reason,
          evidence,
          research: effect.link
            ? {
                source: effect.link.source,
                evidence: effect.link.evidence,
                range: effect.link.range ?? null,
                size: effect.link.size,
                per: effect.link.per,
                lagMonths: effect.link.lagMonths,
                status: outcomeLinkStatus(effect.link),
              }
            : null,
        });
      }
    }
  }
  // Starting-law observations have no in-play enactment. Only observed stamps
  // get rows; an unobserved store never becomes a missing-effect assertion.
  const starting = stampedEntries.filter(
    ({ stamp }) => stamp.source === "in-force-at-start",
  );
  for (const groupKey of new Set(
    starting.map(({ stamp }) =>
      JSON.stringify([stamp.governingLawKey, stamp.jurisdictionId]),
    ),
  )) {
    const matching = starting.filter(
      ({ stamp }) =>
        JSON.stringify([stamp.governingLawKey, stamp.jurisdictionId]) ===
        groupKey,
    );
    const lawKey = matching[0]!.stamp.governingLawKey;
    const { stamp, law } = matching[0]!;
    appendStampedRows(
      rows,
      world,
      {
        source: "starting",
        lawSource: "in-force-at-start",
        enactmentId: null,
        measureId: lawKey,
        designation: "Starting law (no in-play enactment)",
        title: stamp.questionKey,
        jurisdiction:
          world.jurisdictions[stamp.jurisdictionId]?.name ??
          stamp.jurisdictionId,
        jurisdictionId: stamp.jurisdictionId,
        level: law.level,
        question: stamp.questionKey,
        answer: law.answer,
        startingAnswer: law.answer,
        comparison: "same as starting law",
        effectiveAt: stamp.operativeAt,
        trace: traces.filter((row) => row.questionKey === stamp.questionKey),
      },
      matching,
    );
  }
  return rows;
}
function outcomeEvidence(
  record: PlaceOutcomeRecord,
  previous: PlaceOutcomeRecord | undefined,
  factor: number,
): Evidence {
  return {
    record: `placeOutcomes:${record.placeKey}:${record.measure}:${record.month}`,
    touched: record.placeKey,
    before: previous?.value ?? null,
    after: record.value,
    detail: `Saved link factor ${factor}; total value also includes other causes and drift. This is an aggregate place effect; no person-level consequence is established.`,
  };
}
export function summarize(rows: readonly AuditRow[]) {
  const reasons: Record<string, number> = {};
  const enacted = rows.filter((row) => row.lawSource !== "in-force-at-start");
  const starting = rows.filter((row) => row.lawSource === "in-force-at-start");
  for (const row of enacted)
    reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
  return {
    lawsAudited: new Set(enacted.map((row) => row.enactmentId)).size,
    startingLawsObserved: new Set(starting.map((row) => row.measureId)).size,
    startingEffectsFiring: starting.filter((row) => row.fired).length,
    startingEffectsWithoutPayload: starting.filter((row) => !row.fired).length,
    effectsFiring: enacted.filter((row) => row.fired).length,
    effectsAboutZero: enacted.filter(
      (row) => row.reason === "researched-about-zero",
    ).length,
    effectsMissing: enacted.filter(
      (row) => !row.fired && row.reason !== "researched-about-zero",
    ).length,
    reasons,
  };
}

/** Exclude attribution, identity and ordering metadata: a stamp alone is no effect. */
function stampedConsequence(record: JsonRecord): JsonRecord {
  const payload: JsonRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (
      key === "lawEffectStamps" ||
      /(?:Id|Ids|Key|Keys|At|Date|Sequence)$/.test(key) ||
      ["id", "sequence", "kind", "type", "version"].includes(key)
    )
      continue;
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      (typeof value === "string" &&
        /amount|value|status|outcome|decision|reason|summary|answer|eligibility|restriction|service|hours/i.test(
          key,
        )) ||
      (Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === "number")) ||
      (object(value) && Object.keys(numbers(value)).length > 0)
    )
      payload[key] = value;
  }
  return payload;
}
function stampedTouched(
  world: World,
  record: JsonRecord,
  stamp: LawEffectStamp,
): string {
  const people = [
    record.personId,
    record.studentPersonId,
    record.pupilPersonId,
    record.recipientPersonId,
  ].filter((id): id is EntityId => typeof id === "string");
  return (
    people
      .map((id) =>
        world.people[id] ? `${personName(world.people[id])} (${id})` : id,
      )
      .join(", ") ||
    (typeof record.organizationId === "string"
      ? `Business ${record.organizationId}; no person-level consequence established`
      : "") ||
    `No person-level identity on this record; ${world.jurisdictions[stamp.jurisdictionId]?.name ?? stamp.jurisdictionId}`
  );
}

interface StampedEntry {
  collection: string;
  locator: string;
  record: JsonRecord;
  before: JsonRecord | undefined;
  recordDate?: string;
  stamp: LawEffectStamp;
  law: NonNullable<ReturnType<typeof lawInForce>>;
}

/** Walk every saved object, once at audit time. Application dates, not history
 * sequences or store location, delimit stamped observations. Known stores keep
 * exact business and government/month locators before the general traversal. */
function collectStampedRecords(
  opening: World,
  world: World,
  coverage?: StampCoverage,
): StampedEntry[] {
  const candidates: Omit<StampedEntry, "stamp" | "law">[] = [];
  const beforeWorld = opening as unknown as JsonRecord;
  const afterWorld = world as unknown as JsonRecord;
  const books = object(afterWorld.townFinances)
    ? afterWorld.townFinances.businesses
    : undefined;
  const oldBooks = object(beforeWorld.townFinances)
    ? beforeWorld.townFinances.businesses
    : undefined;
  if (object(books))
    for (const [key, record] of Object.entries(books)) {
      if (!object(record)) continue;
      candidates.push({
        collection: "townFinances.businesses",
        locator: `townFinances.businesses:${key}`,
        record,
        before:
          object(oldBooks) && object(oldBooks[key]) ? oldBooks[key] : undefined,
        recordDate:
          typeof record.lastRound === "string" ? record.lastRound : undefined,
      });
    }
  const budgets = object(afterWorld.publicBudgets)
    ? afterWorld.publicBudgets
    : undefined;
  const oldBudgets = object(beforeWorld.publicBudgets)
    ? beforeWorld.publicBudgets
    : undefined;
  function monthly(
    collection: string,
    key: string,
    container: JsonRecord,
    previous: unknown,
  ) {
    if (!Array.isArray(container.months)) return;
    const prior =
      object(previous) && Array.isArray(previous.months) ? previous.months : [];
    for (const record of container.months) {
      if (!object(record) || typeof record.month !== "string") continue;
      const before = prior.find(
        (row) => object(row) && row.month === record.month,
      );
      candidates.push({
        collection,
        locator: `${collection}:${key}:months:${record.month}`,
        record,
        before: object(before) ? before : undefined,
        recordDate: record.month,
      });
    }
  }
  if (Array.isArray(budgets?.governments))
    for (const government of budgets.governments) {
      if (!object(government) || typeof government.key !== "string") continue;
      const before = Array.isArray(oldBudgets?.governments)
        ? oldBudgets.governments.find(
            (row) => object(row) && row.key === government.key,
          )
        : undefined;
      monthly("publicBudgets.governments", government.key, government, before);
    }
  if (object(budgets?.federal))
    monthly(
      "publicBudgets.federal",
      "federal",
      budgets.federal,
      oldBudgets?.federal,
    );
  const visited = new Set<object>();
  function walk(value: unknown, previous: unknown, path: string) {
    if (value === null || typeof value !== "object" || visited.has(value))
      return;
    visited.add(value);
    if (Array.isArray(value)) {
      const prior = Array.isArray(previous) ? previous : [];
      value.forEach((record, index) => {
        const key = object(record)
          ? (record.id ?? record.stableKey ?? record.key ?? record.month)
          : undefined;
        const before =
          key === undefined
            ? prior[index]
            : prior.find(
                (row) =>
                  object(row) &&
                  (row.id ?? row.stableKey ?? row.key ?? row.month) === key,
              );
        walk(record, before, `${path}:${String(key ?? index)}`);
      });
      return;
    }
    if (!object(value)) return;
    if (Array.isArray(value.lawEffectStamps))
      candidates.push({
        collection: path.startsWith("history.") ? path.split(/[.:]/)[1]! : path,
        locator: path.startsWith("history.")
          ? path.slice("history.".length)
          : path,
        record: value,
        before: object(previous) ? previous : undefined,
        recordDate:
          typeof value.month === "string"
            ? value.month
            : typeof value.lastRound === "string"
              ? value.lastRound
              : undefined,
      });
    for (const [key, child] of Object.entries(value)) {
      if (key === "lawEffectStamps") continue;
      walk(
        child,
        object(previous) ? previous[key] : undefined,
        path ? `${path}.${key}` : key,
      );
    }
  }
  walk(world, opening, "");
  const propositions = new Map(
    Object.values(world.policyCatalog.propositions).map((prop) => [
      prop.stableKey,
      prop.id,
    ]),
  );
  const collected: StampedEntry[] = [];
  const seen = new Map<JsonRecord | string, Set<string>>();
  const processed = new Set<JsonRecord>();
  const reject = (reason: string) => {
    if (coverage)
      coverage.excluded[reason] = (coverage.excluded[reason] ?? 0) + 1;
  };
  for (const candidate of candidates) {
    if (
      !Array.isArray(candidate.record.lawEffectStamps) ||
      processed.has(candidate.record)
    )
      continue;
    processed.add(candidate.record);
    if (coverage) {
      coverage.stampedRecordObjects++;
      coverage.rawStamps += candidate.record.lawEffectStamps.length;
      coverage.observedStores.add(candidate.collection);
    }
    for (const raw of candidate.record.lawEffectStamps) {
      if (!isLawEffectStamp(raw)) {
        reject("invalid-stamp-shape");
        continue;
      }
      const stamp = raw;
      if (
        stamp.appliedAt <= opening.currentDate ||
        stamp.appliedAt > world.currentDate
      ) {
        reject("outside-application-window");
        continue;
      }
      const propositionId = propositions.get(stamp.questionKey);
      if (!propositionId) {
        reject("question-not-in-catalog");
        continue;
      }
      const law = lawInForce(
        world,
        stamp.jurisdictionId,
        propositionId,
        stamp.appliedAt,
      );
      if (
        !law ||
        law.measureId !== stamp.governingLawKey ||
        law.origin !== stamp.source ||
        law.operativeAt !== stamp.operativeAt
      ) {
        reject("canonical-law-mismatch");
        continue;
      }
      // The same saved object may be exposed in a flat history alias. Business
      // aliases with the exact organization identity and payload also collapse.
      const book =
        typeof candidate.record.organizationId === "string" && object(books)
          ? books[candidate.record.organizationId]
          : undefined;
      const identity =
        object(book) &&
        (candidate.record.id === undefined ||
          candidate.record.id === candidate.record.organizationId) &&
        JSON.stringify(stampedConsequence(book)) ===
          JSON.stringify(stampedConsequence(candidate.record))
          ? book
          : typeof candidate.record.id === "string"
            ? JSON.stringify([
                candidate.record.id,
                candidate.recordDate,
                stampedConsequence(candidate.record),
              ])
            : candidate.record;
      const stampKey = JSON.stringify([
        stamp.source,
        stamp.governingLawKey,
        stamp.questionKey,
        stamp.jurisdictionId,
        stamp.effectKind,
        stamp.operativeAt,
        stamp.appliedAt,
      ]);
      const keys = seen.get(identity) ?? new Set<string>();
      if (keys.has(stampKey)) {
        reject("duplicate-record-stamp");
        continue;
      }
      keys.add(stampKey);
      seen.set(identity, keys);
      collected.push({ ...candidate, stamp, law });
    }
  }
  return collected;
}

function appendStampedRows(
  rows: AuditRow[],
  world: World,
  context: Omit<
    AuditRow,
    "effect" | "reader" | "fired" | "reason" | "evidence" | "research"
  >,
  entries: readonly StampedEntry[],
) {
  for (const kind of new Set(entries.map(({ stamp }) => stamp.effectKind))) {
    const matching = entries.filter(({ stamp }) => stamp.effectKind === kind);
    const evidence = matching.flatMap(
      ({ locator, record, before, recordDate, stamp }) => {
        const payload = stampedConsequence(record);
        if (!Object.keys(payload).length) return [];
        return [
          {
            record: locator,
            touched: stampedTouched(world, record, stamp),
            before: before ? stampedConsequence(before) : null,
            after: payload,
            jurisdictionId: stamp.jurisdictionId,
            appliedAt: stamp.appliedAt,
            ...(recordDate === undefined ? {} : { recordDate }),
            sourceRecordIds: stamp.sourceRecordIds ?? [],
            detail: `Saved consequence stamped with canonical ${stamp.governingLawKey}; source ${stamp.source}; applied ${stamp.appliedAt}; source record IDs ${JSON.stringify(stamp.sourceRecordIds ?? [])}. Prior absence is unknown, not zero. This proves only this recorded mechanism, not downstream delivery.`,
          },
        ];
      },
    );
    rows.push({
      ...context,
      effect: `stamped:${kind}`,
      reader: [...new Set(matching.map(({ collection }) => collection))].join(
        ", ",
      ),
      fired: evidence.length > 0,
      reason: evidence.length
        ? "stamped-recorded-consequence"
        : "stamp-without-consequence-payload",
      evidence,
      research: null,
    });
  }
}

interface StampCoverage {
  stampedRecordObjects: number;
  rawStamps: number;
  observedStores: Set<string>;
  excluded: Record<string, number>;
}

/** Counts describe collector observations only, never absent physical effects. */
export function stampAuditCoverage(opening: World, world: World) {
  const coverage: StampCoverage = {
    stampedRecordObjects: 0,
    rawStamps: 0,
    observedStores: new Set(),
    excluded: {},
  };
  const records = collectStampedRecords(opening, world, coverage);
  return {
    scope:
      "Every enumerable saved object carrying an array lawEffectStamps; canonical law/date validation; read-only end-of-run traversal",
    stampedRecordObjects: coverage.stampedRecordObjects,
    rawStamps: coverage.rawStamps,
    observedStores: [...coverage.observedStores].sort(),
    excluded: coverage.excluded,
    uniqueCanonicalStampsInWindow: records.length,
    canonicalStampsWithPayload: records.filter(
      ({ record }) => Object.keys(stampedConsequence(record)).length > 0,
    ).length,
    limit:
      "An unobserved store, rejected stamp, or empty observation count is not proof of absent effects. A payload proves its recorded mechanism only.",
  };
}

/** One row per law and application jurisdiction. Adapter counts stay separate.
 * Monetary fields remain named saved values; they are never summed into a
 * supposed law-caused cost, and multiple stamps never duplicate a saved amount. */
export function lawJurisdictionTable(rows: readonly AuditRow[]) {
  const grouped = new Map<
    string,
    {
      source: AuditRow["source"];
      lawKey: string;
      jurisdictionId: string;
      designation: string;
      question: string | null;
      fired: boolean;
      stamped: boolean;
      adapterFired: boolean;
      records: Evidence[];
    }
  >();
  for (const row of rows) {
    const jurisdictions = row.evidence.length
      ? new Set(row.evidence.map((e) => e.jurisdictionId ?? row.jurisdictionId))
      : new Set([row.jurisdictionId]);
    for (const jurisdictionId of jurisdictions) {
      const key = JSON.stringify([row.source, row.measureId, jurisdictionId]);
      const item = grouped.get(key) ?? {
        source: row.source,
        lawKey: row.measureId,
        jurisdictionId,
        designation: row.designation,
        question: row.question,
        fired: false,
        stamped: false,
        adapterFired: false,
        records: [],
      };
      const matching = row.evidence.filter(
        (e) => (e.jurisdictionId ?? row.jurisdictionId) === jurisdictionId,
      );
      if (row.fired && matching.length) {
        item.fired = true;
        if (row.effect.startsWith("stamped:")) item.stamped = true;
        else item.adapterFired = true;
      }
      for (const evidence of matching)
        if (
          !item.records.some(
            (e) =>
              e.record === evidence.record &&
              e.appliedAt === evidence.appliedAt,
          )
        )
          item.records.push(evidence);
      grouped.set(key, item);
    }
  }
  return [...grouped.values()].map(({ records, ...row }) => ({
    ...row,
    records: records.map((evidence) => ({
      ...evidence,
      amountFields: moneyFields(evidence.after),
    })),
    observation: row.fired
      ? "saved mechanism observed; downstream effects unproven"
      : "no attributable record observed; absent effect not established",
  }));
}
function moneyFields(value: unknown, prefix = ""): JsonRecord {
  const result: JsonRecord = {};
  if (!object(value)) return result;
  for (const [key, item] of Object.entries(value)) {
    const field = `${prefix}${key}`;
    if (
      /amount|cost|cash|balance|debt|revenue|receipt|spending|outlay|pay|tax|net|wage|price/i.test(
        key,
      )
    ) {
      if (
        typeof item === "number" ||
        (Array.isArray(item) && item.every((part) => typeof part === "number"))
      )
        result[field] = item;
    }
    if (object(item)) Object.assign(result, moneyFields(item, `${field}.`));
  }
  return result;
}
