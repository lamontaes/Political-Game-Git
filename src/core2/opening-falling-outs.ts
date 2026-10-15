/**
 * P15 part 3: falling-outs in the shared past.
 *
 * Every pair that shared a class or a workgroup builds up a chance of falling
 * out over the years they shared. It rises smoothly with both people's
 * conflict trait and falls with both people's reliability. Each pair carries
 * its own line, keyed to the pair the way a relative's survival line is, and
 * falls out on the date its built-up chance reaches the line, if that comes
 * within their shared years. The deep past is generated history; nothing here
 * decides a choice in play. Each falling-out is a dated fact on both people,
 * kept forever, so a person can come back with something at stake.
 */
import data from "./data/opening-falling-outs.json" with { type: "json" };
import deepPast from "./data/deep-past.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { PARAMETERS, parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, IsoDate, PersonId, PersonInput } from "./types";

export const OPENING_FALLING_OUTS = data;

type PriorFact = NonNullable<PersonInput["pastFacts"]>[number];

const p = (key: string) => parameter(key, PARAMETERS);

/** Years a school stage lasts, from its entry grade to the next stage's. */
function stageYears(stage: string): number {
  const stages = deepPast.schools.stages;
  const grade = (code: string) =>
    (deepPast.schools.gradesBeforeFirst as Record<string, number>)[code] ??
    Number(code);
  const index = stages.findIndex((row) => row.id === stage);
  if (index < p("zero")) return p("zero");
  const next = stages[index + p("one")];
  const end = next ? grade(next.entryGrade) : p("schoolFinalGrade") + p("one");
  return end - grade(stages[index]!.entryGrade);
}

/** The years a pair shared, from the date their context began. */
export function sharedYears(
  person: PersonInput,
  fact: PriorFact,
  opening: ReturnType<typeof makeIsoDate>,
): number {
  const start = makeIsoDate(fact.date);
  const context = person.pastFacts?.find(
    (row) => row.id === fact.facts?.contextFactId,
  );
  const untilOpening = daysBetween(start, opening) / p("daysPerMeanYear");
  if (context?.kind !== data.schoolKind) return untilOpening;
  return Math.min(untilOpening, stageYears(context.facts?.stage ?? ""));
}

/** Falling-outs per year shared, for this pair's temperaments. */
function yearlyRate(left: PersonInput, right: PersonInput): number {
  const trait = (person: PersonInput, id: string) =>
    person.traits?.[id] ?? p("zero");
  return (
    p("fallingOutBaseRatePerYear") *
    Math.exp(
      p("fallingOutConflictWeight") *
        (trait(left, data.conflictTrait) + trait(right, data.conflictTrait)) -
        p("fallingOutReliabilityWeight") *
          (trait(left, data.reliabilityTrait) +
            trait(right, data.reliabilityTrait)),
    )
  );
}

/** The pair's own line: a unit exponential read at the pair's stable key. */
function pairLine(seed: string, key: string): number {
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  const hash = stableHash(`${seed}:${data.lineKey}:${key}`);
  const draw =
    (Number.parseInt(hash.slice(p("zero"), digits), radix) +
      p("one") / p("two")) /
    radix ** digits;
  return -Math.log(p("one") - draw);
}

/**
 * A generated town samples its place, so a big place's school class or
 * workgroup holds fewer generated members than a full group. Each generated
 * peer stands for the full group's peers over the generated ones.
 */
export function peersRepresented(input: CoreInput): Map<string, number> {
  // The group's size comes from its records (peerGroupMembers on the fact),
  // so a pair's chances never depend on who else has been filled in.
  const members = new Map<string, number>();
  for (const person of input.people)
    for (const fact of person.pastFacts ?? []) {
      const group = fact.facts?.peerGroupId;
      const recorded = Number(fact.facts?.peerGroupMembers);
      if (!group || !data.pairKinds.includes(fact.kind)) continue;
      if (Number.isFinite(recorded) && recorded > p("zero"))
        members.set(`${fact.kind}|${group}`, recorded);
    }
  const sizes = data.groupSizeParameters as Record<string, string>;
  return new Map(
    [...members].map(([key, generated]) => {
      const full = p(sizes[key.slice(p("zero"), key.indexOf("|"))]!);
      return [
        key,
        Math.max(
          p("one"),
          (full - p("one")) / Math.max(p("one"), generated - p("one")),
        ),
      ];
    }),
  );
}

export function addOpeningFallingOuts(input: CoreInput): CoreInput {
  const marker = stopgap(data.stopgapId);
  const opening = makeIsoDate(input.startedAt);
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const represented = peersRepresented(input);
  const added = new Map<PersonId, PriorFact[]>();
  const seen = new Set<string>();
  for (const person of input.people)
    for (const fact of person.pastFacts ?? []) {
      if (!data.pairKinds.includes(fact.kind)) continue;
      const otherId = fact.facts?.otherPersonId;
      const other = otherId ? byId.get(otherId) : undefined;
      if (!other) continue;
      const key = [
        [person.id, other.id].sort().join(":"),
        fact.facts?.contextKey ?? fact.kind,
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const years = sharedYears(person, fact, opening);
      const rate =
        yearlyRate(person, other) *
        (represented.get(`${fact.kind}|${fact.facts?.peerGroupId}`) ??
          p("one"));
      const line = pairLine(input.seed, key);
      if (years <= p("zero") || rate * years < line) continue;
      const date = addDays(
        makeIsoDate(fact.date),
        Math.floor((line / rate) * p("daysPerMeanYear")),
      ) as IsoDate;
      const pairId = stableHash(key);
      for (const [self, peer, contextFactId] of [
        [person, other, fact.facts?.contextFactId],
        [other, person, fact.facts?.otherContextFactId],
      ] as const) {
        const rows = added.get(self.id) ?? [];
        rows.push({
          id: `${self.id}:${data.version}:${pairId}`,
          date,
          kind: data.factKind,
          summary: data.factSummaryTemplate.replace(
            "{otherName}",
            [peer.givenName, peer.familyName].join(" "),
          ),
          source: {
            ...data.source,
            tag: "ESTIMATED",
            asOf: input.startedAt,
          },
          facts: {
            otherPersonId: peer.id,
            contextFactId: contextFactId ?? "",
            sharedYears: years.toFixed(p("two")),
            stopgapId: marker.id,
          },
        });
        added.set(self.id, rows);
      }
    }
  return {
    ...input,
    people: input.people.map((person) =>
      added.has(person.id)
        ? {
            ...person,
            pastFacts: [...(person.pastFacts ?? []), ...added.get(person.id)!],
          }
        : person,
    ),
  };
}
