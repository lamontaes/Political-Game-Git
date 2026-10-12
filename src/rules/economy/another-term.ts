/** Retained complete another-term context, cached result and private reason rank. Trait/press facts and the shared chooser/writer stay with their owners. */
import { lifeWeighsAgainstOffice, type OfficeLifeFacts } from "./office-life";
import { growingIndex, type GrowingIndexKind } from "./raw-record-index";
import type { AnotherTermInput } from "../../simulation/careers/another-term";
import type {
  World,
  EntityId,
  DecisionContext,
  DecisionConsideration,
  DecisionImportance,
} from "../../simulation/types";
export interface AnotherTermFacts {
  readonly life: OfficeLifeFacts;
  readonly traces: World["history"]["decisionTraces"];
  readonly traitReceipts: ReadonlyMap<string, readonly DecisionConsideration[]>;
  readonly pressReceipts: ReadonlyMap<string, readonly DecisionConsideration[]>;
}
export function anotherTermReceiptKey(input: AnotherTermInput) {
  return JSON.stringify([input.personId, input.stableKey, input.onDate]);
}
function receipt(
  map: ReadonlyMap<string, readonly DecisionConsideration[]>,
  key: string,
) {
  if (!map.has(key))
    throw Error(
      "Missing separately owned another-term consideration receipt: " + key,
    );
  return map.get(key)!;
}
const FIRST_RECORD_BY_STABLE_KEY: GrowingIndexKind<Map<unknown, unknown>> = {
  create: () => new Map(),
  add: (index, record) => {
    const key = (
      record as {
        readonly stableKey?: unknown;
      }
    ).stableKey;
    if (!index.has(key)) index.set(key, record);
  },
};

export function recordByStableKey<
  T extends {
    readonly stableKey: string;
  },
>(records: readonly T[], stableKey: string): T | undefined {
  return growingIndex(FIRST_RECORD_BY_STABLE_KEY, records).get(stableKey) as
    T | undefined;
}
// stopgapId: "economy.another-term-reason-rank"
function weightiestReason(
  considerations: readonly DecisionConsideration[],
  chosen: string | null,
): string {
  const weightiest = considerations
    .filter((row) => row.optionKey === chosen)
    .sort(
      (a, b) =>
        IMPORTANCE_ORDER.indexOf(b.importance) -
        IMPORTANCE_ORDER.indexOf(a.importance),
    )[0];
  return weightiest?.explanation ?? "They decided.";
}
const IMPORTANCE_ORDER: readonly DecisionImportance[] = [
  "slight",
  "moderate",
  "strong",
  "decisive",
];
export type PreparedAnotherTerm =
  | {
      readonly status: "already-decided";
      readonly seeks: boolean;
      readonly decisionTraceId: EntityId;
      readonly reason: string;
    }
  | { readonly status: "decision"; readonly context: DecisionContext };
export function prepareAnotherTerm(
  facts: AnotherTermFacts,
  input: AnotherTermInput,
): PreparedAnotherTerm {
  const made = recordByStableKey(facts.traces, `${input.stableKey}:trace`);
  if (made)
    return {
      status: "already-decided",
      seeks: made.selectedOptionKey === "seek",
      decisionTraceId: made.id,
      reason: weightiestReason(
        made.context.considerations,
        made.selectedOptionKey,
      ),
    };
  const key = anotherTermReceiptKey(input);
  const considerations: DecisionConsideration[] = [
    ...input.serving,
    ...receipt(facts.pressReceipts, key),
    ...lifeWeighsAgainstOffice(facts.life, {
      personId: input.personId,
      keyPrefix: input.stableKey,
      onDate: input.onDate,
      termEnds: input.termEnds,
      optionKey: "step-down",
    }),
    ...receipt(facts.traitReceipts, key),
  ];
  return {
    status: "decision",
    context: {
      stableKey: input.stableKey,
      decisionType: input.decisionType,
      actorPersonId: input.personId,
      cutoff: {
        asOfDate: input.onDate,
        historySequenceExclusive: facts.life.nextSequence,
      },
      subject: { kind: "context:life", key: input.subjectKey, entityId: null },
      options: [
        {
          key: "seek",
          label: input.seekLabel ?? "Run again",
          description: "Seek another term.",
        },
        {
          key: "step-down",
          label: input.stepDownLabel ?? "Step down",
          description: "Leave when this term ends.",
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    },
  };
}
export function completeAnotherTerm(
  prepared: Extract<PreparedAnotherTerm, { status: "decision" }>,
  selected: string | null,
  decisionTraceId: EntityId,
) {
  return {
    seeks: selected === "seek",
    decisionTraceId,
    reason: weightiestReason(prepared.context.considerations, selected),
  };
}
