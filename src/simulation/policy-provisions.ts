import { constitutionalPosition } from "./constitutional-process";
import type { PolicyProvisionStance } from "./constitutional-types";
import { constitutionalStateUsps } from "./enacted-rule-changes";
import type {
  EntityId,
  IsoDate,
  PolicyPropositionDefinition,
  World,
} from "./types";

/**
 * POLICY PROVISIONS — a state amendment writing a policy into its
 * constitution, or taking one out, as Prohibition and its repeal did
 * federally.
 *
 * A provision names one proposition of the World's own policy catalog
 * (`world.policyCatalog`, so a mod's propositions qualify) and adopts or
 * repeals it. It goes through the same amendment route as every other
 * amendment (`constitutional-process.ts`), and it is in force from the
 * amendment's operative date until a later operative amendment on the same
 * proposition says otherwise. Nothing is stored as "the current
 * constitution"; it is derived from what was ratified each time it is read.
 *
 * Which questions qualify: those whose issue the catalog says a state decides
 * (`levels` includes "state"). An issue with no recorded levels is not
 * treated as a state's to decide: an unknown fact is not permission.
 *
 * NOT MODELED, pending research `constitutional-policy-amendments`, with the
 * blanket rule applied meanwhile:
 * - What a provision does. It is recorded and read, and changes nothing else:
 *   no statute is voided, no local law is bound, no behavior changes.
 * - Federal policy amendments. The catalog records no federal level for any
 *   issue, so a federal amendment cannot carry a provision yet.
 * - Town charters. A charter amendment cannot carry one either.
 */

/** The policy a state's constitution holds on one question, and since when. */
export interface PolicyProvisionInForce {
  readonly stateUsps: string;
  readonly propositionId: EntityId;
  readonly stance: PolicyProvisionStance;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly operativeAt: IsoDate;
}

/** The propositions a state's constitution may take a position on. */
export function stateDecidedPropositions(
  world: World,
): readonly PolicyPropositionDefinition[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        (catalog.issues[proposition.issueId]?.levels ?? []).includes("state"),
    );
}

export function assertPolicyProvisionDelta(
  world: World,
  jurisdictionKey: string,
  delta: { readonly propositionId: EntityId; readonly stance: string },
): void {
  if (!constitutionalStateUsps(jurisdictionKey))
    throw new Error(
      "Only a state constitution's amendment can carry a policy yet; federal and charter policy amendments are not modeled.",
    );
  if (delta.stance !== "adopt" && delta.stance !== "repeal")
    throw new Error("A policy amendment adopts a policy or repeals it.");
  const proposition = world.policyCatalog.propositions[delta.propositionId];
  if (!proposition)
    throw new Error(
      "The amendment names a policy this World's catalog does not hold.",
    );
  const levels = world.policyCatalog.issues[proposition.issueId]?.levels;
  if (!levels?.includes("state"))
    throw new Error(
      `Nothing on record says a state decides "${proposition.name}", so a state constitution cannot take it up.`,
    );
}

/** Every policy a state's constitution holds on the date, one per question. */
export function constitutionalPolicyProvisions(
  world: World,
  stateUsps: string,
  onDate: IsoDate = world.currentDate,
): readonly PolicyProvisionInForce[] {
  const latest = new Map<
    EntityId,
    PolicyProvisionInForce & { readonly sequence: number }
  >();
  for (const measure of world.history.constitutionalMeasures ?? []) {
    const delta = measure.ruleDelta;
    if (delta.kind !== "policy-provision") continue;
    if (constitutionalStateUsps(measure.jurisdictionKey) !== stateUsps)
      continue;
    const { operativeAt } = constitutionalPosition(world, measure.id);
    if (!operativeAt || operativeAt > onDate) continue;
    const held = latest.get(delta.propositionId);
    if (
      held &&
      (held.operativeAt > operativeAt ||
        (held.operativeAt === operativeAt && held.sequence > measure.sequence))
    )
      continue;
    latest.set(delta.propositionId, {
      stateUsps,
      propositionId: delta.propositionId,
      stance: delta.stance,
      measureId: measure.id,
      designation: measure.designation,
      operativeAt,
      sequence: measure.sequence,
    });
  }
  return [...latest.values()]
    .sort(
      (a, b) =>
        a.operativeAt.localeCompare(b.operativeAt) || a.sequence - b.sequence,
    )
    .map(({ sequence: _sequence, ...provision }) => provision);
}

/** A player-facing sentence for a provision, from the World's catalog. */
export function describePolicyProvision(
  world: World,
  delta: { readonly propositionId: EntityId; readonly stance: string },
): string {
  const name =
    world.policyCatalog.propositions[delta.propositionId]?.name ??
    "a policy no longer in the catalog";
  return delta.stance === "adopt"
    ? `writes "${name}" into the constitution`
    : `takes "${name}" out of the constitution`;
}
