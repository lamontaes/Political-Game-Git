/**
 * P15 part 3: favors in the shared past.
 *
 * A favor comes from a recorded need at the time, here a move, and from how
 * close the helper was to the person who moved. Every person the mover had
 * shared a class or workgroup with before the move may help. Closeness at the
 * time is their shared years as hours together, faded since their shared time
 * ended at the half-life for people outside the family; the chance of a favor
 * rises smoothly with it. Each pair carries its own line, keyed to the pair
 * and the move. A favor is a dated fact on both people, kept forever.
 */
import data from "./data/opening-favors.json" with { type: "json" };
import fallingOuts from "./data/opening-falling-outs.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { CLOSENESS, halfLifeDays, levelFromHours } from "./closeness";
import { PARAMETERS, parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import { sharedYears } from "./opening-falling-outs";
import type { CoreInput, IsoDate, PersonId, PersonInput } from "./types";

export const OPENING_FAVORS = data;

type PriorFact = NonNullable<PersonInput["pastFacts"]>[number];

const p = (key: string) => parameter(key, PARAMETERS);

/** Closeness at a date from years shared before it, faded since they ended. */
function closenessAt(
  person: PersonInput,
  fact: PriorFact,
  date: IsoDate,
  opening: ReturnType<typeof makeIsoDate>,
): number {
  const start = makeIsoDate(fact.date);
  const at = makeIsoDate(date);
  if (start >= at) return p("zero");
  const years = sharedYears(person, fact, opening);
  const end = addDays(start, Math.floor(years * p("daysPerMeanYear")));
  const sharedBefore =
    daysBetween(start, end < at ? end : at) / p("daysPerMeanYear");
  const sinceEnd = end < at ? daysBetween(end, at) : p("zero");
  const hours = sharedBefore * p("favorSharedHoursPerYear");
  return levelFromHours(
    p,
    hours * p("two") ** (-sinceEnd / halfLifeDays(p, CLOSENESS.householdKind)),
  );
}

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

export function addOpeningFavors(input: CoreInput): CoreInput {
  const marker = stopgap(data.stopgapId);
  const opening = makeIsoDate(input.startedAt);
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const added = new Map<PersonId, PriorFact[]>();
  const add = (id: PersonId, fact: PriorFact) =>
    added.set(id, [...(added.get(id) ?? []), fact]);
  for (const person of input.people)
    for (const need of person.pastFacts ?? []) {
      if (!data.needKinds.includes(need.kind)) continue;
      for (const fact of person.pastFacts ?? []) {
        if (!fallingOuts.pairKinds.includes(fact.kind)) continue;
        const helper = byId.get(fact.facts?.otherPersonId ?? "");
        if (!helper) continue;
        const closeness = closenessAt(person, fact, need.date, opening);
        if (closeness <= p("zero")) continue;
        const key = `${need.id}|${helper.id}|${fact.facts?.contextKey ?? fact.kind}`;
        if (p("favorRatePerNeed") * closeness < pairLine(input.seed, key))
          continue;
        const pairId = stableHash(key);
        const name = (row: PersonInput) =>
          [row.givenName, row.familyName].join(" ");
        const common = {
          date: need.date,
          kind: data.factKind,
          source: {
            ...data.source,
            tag: "ESTIMATED" as const,
            asOf: input.startedAt,
          },
        };
        add(person.id, {
          ...common,
          id: `${person.id}:${data.version}:${pairId}`,
          summary: data.receiverSummaryTemplate.replace(
            "{otherName}",
            name(helper),
          ),
          facts: {
            otherPersonId: helper.id,
            helperId: helper.id,
            needFactId: need.id,
            contextFactId: fact.facts?.contextFactId ?? "",
            closeness: closeness.toFixed(p("two")),
            stopgapId: marker.id,
          },
        });
        add(helper.id, {
          ...common,
          id: `${helper.id}:${data.version}:${pairId}`,
          summary: data.helperSummaryTemplate.replace(
            "{otherName}",
            name(person),
          ),
          facts: {
            otherPersonId: person.id,
            helperId: helper.id,
            needFactId: need.id,
            contextFactId: fact.facts?.otherContextFactId ?? "",
            closeness: closeness.toFixed(p("two")),
            stopgapId: marker.id,
          },
        });
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
