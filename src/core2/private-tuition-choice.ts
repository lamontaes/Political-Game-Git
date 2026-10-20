/**
 * Which families choose the town's private school. Money alone ranked them
 * (best-off per child first); the owner ruled (Oct 20, #5483) that beliefs,
 * the schools nearby and a child's needs decide too. This is the belief term:
 * a family's rank among the town's families by cash per child (0 to 1) is
 * scaled by how much its faith group favors private school, so a well-off
 * family with no faith tie to the school ranks below one that has it, and no
 * family flips at a threshold. The town's private share still checks the total
 * and never picks a family.
 *
 * Why faith: about four in five private school students attend a religiously
 * affiliated school, about half of those Catholic (NCES Digest Table 205.45);
 * the General Social Survey finds Catholic and evangelical families and
 * frequent attenders demand private schooling more (Sander 2005). The group
 * weights are each group's share of private enrollment over its share of the
 * adult population, assuming a family's school affiliation follows its own
 * faith (ESTIMATED, see parameters). Stopgap SG-CORE-private-tuition-average
 * stays open for the schools-nearby and child-needs terms.
 */
import { parameter as p } from "./parameters";
import { PROFILE_FACT_KINDS } from "./opening-profile";

const GROUP_PARAMETER: Readonly<Record<string, string>> = {
  catholic: "privateTuitionAffinityCatholic",
  protestant: "privateTuitionAffinityProtestant",
  "other-faith": "privateTuitionAffinityOtherFaith",
  none: "privateTuitionAffinityNone",
};

interface FaithRecord {
  readonly pastFacts?: readonly {
    readonly kind: string;
    readonly facts?: Readonly<Record<string, string>>;
  }[];
}

/** A family's draw toward private school from its adults' recorded faith (1 where none is recorded). */
export function faithAffinity(adults: readonly FaithRecord[]): number {
  let total = 0;
  let counted = 0;
  for (const adult of adults) {
    const group = adult.pastFacts?.find(
      (fact) => fact.kind === PROFILE_FACT_KINDS.faith,
    )?.facts?.group;
    const key = group ? GROUP_PARAMETER[group] : undefined;
    if (!key) continue;
    total += p(key);
    counted += 1;
  }
  return counted ? total / counted : p("one");
}

/**
 * The families best to worst for the private school: cash per child as a
 * rank within the town (0 to 1) times the faith draw; ties by id.
 */
export function rankByChoice<
  T extends { readonly id: string; readonly cashPerChild: number },
>(families: readonly T[], affinity: (family: T) => number): readonly T[] {
  const cash = families.map((family) => family.cashPerChild);
  const rank = (value: number) => {
    let below = 0;
    let equal = 0;
    for (const other of cash) {
      if (other < value) below += 1;
      else if (other === value) equal += 1;
    }
    return (below + equal / p("two")) / families.length;
  };
  const score = new Map(
    families.map((family) => [
      family.id,
      rank(family.cashPerChild) * affinity(family),
    ]),
  );
  return [...families].sort(
    (a, b) => score.get(b.id)! - score.get(a.id)! || a.id.localeCompare(b.id),
  );
}
