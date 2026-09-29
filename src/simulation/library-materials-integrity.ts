import research from "../../data/research/laws/library-materials.json" with { type: "json" };
import type { World } from "./types";
export function assertLibraryMaterialsIntegrity(world: World): void {
  const store = world.libraryMaterials;
  if (!store) return;
  const challenges = new Map(store.challenges.map((c) => [c.key, c]));
  if (challenges.size !== store.challenges.length)
    throw Error("Duplicate library challenge.");
  for (const c of challenges.values())
    if (
      !world.people[c.personId] ||
      !world.jurisdictions[c.townId] ||
      c.filedOn > world.currentDate ||
      !research.titles.some((t) => t.key === c.titleKey) ||
      !c.reason.trim() ||
      !c.principleRecordIds.length ||
      c.principleRecordIds.some(
        (id) =>
          !world.history.principles.some(
            (p) => p.id === id && p.personId === c.personId,
          ),
      )
    )
      throw Error("Invalid library challenge evidence.");
  const done = new Set<string>();
  for (const d of store.decisions) {
    const c = challenges.get(d.challengeKey);
    if (
      !c ||
      done.has(d.challengeKey) ||
      d.on < c.filedOn ||
      d.on > world.currentDate ||
      !Number.isSafeInteger(d.expenseCents) ||
      d.expenseCents < 0 ||
      d.staffHours < 0 ||
      d.legalHours < 0 ||
      !d.authorityReason.trim() ||
      d.ballots.some((b) => !world.people[b.personId] || !b.reason.trim()) ||
      (d.authority === "state" && d.ballots.length) ||
      (d.authority === "local" && !d.ballots.length) ||
      d.removed !==
        d.ballots.filter((b) => b.remove).length > d.ballots.length / 2
    )
      throw Error("Invalid library collection decision.");
    done.add(d.challengeKey);
  }
}
