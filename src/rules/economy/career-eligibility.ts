/** Full retained public career eligibility, accepted-offer overlap and twelve-hour clock realization. Life-entry eligibility remains its separately owned receipt. */
import type { World, EntityId } from "../../simulation/types";
import type { lifePathDefinition as nativeDefinition } from "../../simulation/life-paths2-catalog";
import type { workStatusAt as nativeStatus } from "../../simulation/life-queries";
export interface CareerEligibilityFacts {
  readonly control: World["control"];
  readonly records: Pick<World["history"], "workRelationships" | "events">;
  readonly paths: ReadonlyMap<string, ReturnType<typeof nativeDefinition>>;
  readonly heldPaths: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeDefinition> | null
  >;
  readonly statuses: ReadonlyMap<EntityId, ReturnType<typeof nativeStatus>>;
  readonly entryReasons: ReadonlyMap<string, string | null>;
}
export interface CareerTask {
  readonly id: string;
  readonly text: string;
  readonly type: string;
}
export interface CareerProvider {
  readonly id: string;
  readonly pathId: string;
  readonly occupationCode: string;
  readonly sourceVersion: string;
  readonly tasks: readonly CareerTask[];
}
const actor = (facts: CareerEligibilityFacts) =>
  facts.control.kind === "person" ? facts.control.personId : null;
export function careerEligibility(
  facts: CareerEligibilityFacts,
  p: CareerProvider,
): string | null {
  const a = actor(facts);
  if (!a) return "Choose a person to seek work.";
  const path = definition(facts, p.pathId);
  if (path.scope !== "personal" || path.kind !== "work")
    return "Public and campaign hiring require their own authority.";
  if (
    !["shop-assistant", "office-assistant", "repair-worker"].includes(path.id)
  )
    return "This provider has no authored civilian hiring context.";
  if (p.tasks.length === 0)
    return "No supported responsibilities are available.";
  const clash = overlappingWork(facts, a, path);
  if (clash) return clash;
  return lifePathEntryReason(facts, a, path);
}
// stopgapId: "economy.career-overlap-clock-English"
function clock(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const minutes = minute % 60;
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minutes === 0
    ? `${twelve} ${suffix}`
    : `${twelve}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}
function overlappingWork(
  facts: CareerEligibilityFacts,
  personId: EntityId,
  path: ReturnType<typeof nativeDefinition>,
): string | null {
  const start = path.sessionStartMinute;
  const end = start + path.sessionMinutes;
  for (const work of facts.records.workRelationships) {
    if (work.personId !== personId) continue;
    const held = pathForRelationship(facts, work.id);
    if (!held || held.id === path.id) continue;
    if (held.kind !== "work" || held.scope !== "personal") continue;
    const status = workStatusAt(facts, work.id)?.status;
    if (
      status !== "active" &&
      !(status === "expected" && careerOfferAccepted(facts, work.id))
    )
      continue;
    const heldStart = held.sessionStartMinute;
    const heldEnd = heldStart + held.sessionMinutes;
    if (start < heldEnd && heldStart < end)
      return `This job's ${clock(start)} to ${clock(end)} shift overlaps the ${clock(heldStart)} to ${clock(heldEnd)} shift you work as ${held.title.toLowerCase()}.`;
  }
  return null;
}
export function careerOfferAccepted(
  facts: CareerEligibilityFacts,
  id: EntityId,
): boolean {
  return facts.records.events.some(
    (e) =>
      e.type === "career-path7.accepted" && e.involvedEntityIds.includes(id),
  );
}

function definition(facts: CareerEligibilityFacts, id: string) {
  const value = facts.paths.get(id);
  if (!value) throw Error("Missing life path source: " + id);
  return value;
}
function pathForRelationship(facts: CareerEligibilityFacts, id: EntityId) {
  if (!facts.heldPaths.has(id))
    throw Error("Missing life relationship path: " + id);
  return facts.heldPaths.get(id) ?? null;
}
function workStatusAt(facts: CareerEligibilityFacts, id: EntityId) {
  if (!facts.statuses.has(id)) throw Error("Missing dated work status: " + id);
  return facts.statuses.get(id) ?? null;
}
function lifePathEntryReason(
  facts: CareerEligibilityFacts,
  id: EntityId,
  path: ReturnType<typeof nativeDefinition>,
) {
  const key = JSON.stringify([id, path.id]);
  if (!facts.entryReasons.has(key))
    throw Error("Missing life eligibility receipt: " + key);
  return facts.entryReasons.get(key) ?? null;
}
