/**
 * A chosen look's origin and the player's family (owner, Nov 8: "I'm Mexican
 * and my son is white"). A person's origin is one of their two parents' (the
 * rule births already use, `childOrigin`), so when the player chooses a look
 * from another origin than the family was drawn with, the family is worked
 * out again from the record of who is whose parent, not painted all in the
 * player's tone:
 *
 * - one of the player's parents takes the chosen origin (picked by the
 *   player's id), so the player is still one of their parents' children;
 *   the other parent keeps theirs, and the parents may differ;
 * - the player's brothers and sisters, children, grandchildren, nieces and
 *   nephews each take one of their own parents' origins, by their own id;
 * - a partner, in-laws and housemates keep the origin they were drawn with,
 *   and so do grandparents, aunts and uncles (the record does not say which
 *   side of the family they are on).
 *
 * Only people still carrying the drawn origin are worked out again; someone
 * already of another origin keeps it. No dice: the pick is by id and seed.
 */
import { bloodKin, familyRelation } from "./closeness";
import { childOrigin, oneOfParents } from "./opening-origin";
import type { CoreState, PersonId } from "./types";

type Core = Pick<CoreState, "people" | "households" | "seed">;

const PARENT = ["parent", "other-parent"];
const BELOW = ["sibling", "child", "grandchild", "niece-or-nephew"];

function relatives(core: Core, id: PersonId): PersonId[] {
  const person = core.people.get(id);
  const near = core.households.get(person?.householdId ?? "")?.memberIds ?? [];
  return [...new Set([...near, ...(person?.familyIds ?? [])])].filter(
    (other) => other !== id,
  );
}

/** A person's parents on the record: who they hold as parent or other parent. */
export function parentsOf(core: Core, id: PersonId): PersonId[] {
  return relatives(core, id).filter((other) =>
    PARENT.includes(familyRelation(core, id, other) ?? ""),
  );
}

/** Work the player's family out again once the player's origin is `chosen`. */
export function familyTakesChosenOrigin(
  core: Core,
  playerId: PersonId,
  drawn: string,
  chosen: string,
): void {
  const originOf = (id: PersonId) => core.people.get(id)?.looks?.origin;
  const set = (id: PersonId, origin: string) => {
    const person = core.people.get(id);
    if (person) person.looks = { ...(person.looks ?? {}), origin };
  };
  const kin = relatives(core, playerId).filter((id) =>
    bloodKin(core, playerId, id),
  );
  const relation = (id: PersonId) => familyRelation(core, playerId, id) ?? "";
  // One parent carries the chosen origin; the other keeps theirs.
  const parents = kin.filter((id) => PARENT.includes(relation(id))).sort();
  if (parents.length && !parents.some((id) => originOf(id) === chosen)) {
    // Which parent the player takes after: the same rule that picks a
    // child's origin from the parents', here over the parents' ids.
    const taken = oneOfParents(parents, playerId, core.seed);
    if (taken && originOf(taken) === drawn) set(taken, chosen);
  }
  // Then each person below the parents, nearest first, from their own parents.
  const settled = new Set<PersonId>([playerId]);
  for (const rank of BELOW) {
    for (const id of kin.filter((other) => relation(other) === rank).sort()) {
      if (originOf(id) !== drawn) continue;
      const origins = parentsOf(core, id).map(originOf);
      const next = childOrigin(origins, id, core.seed);
      if (next) set(id, next);
      settled.add(id);
    }
  }
}
