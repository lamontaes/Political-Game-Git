import type { EntityId, World } from "../simulation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { seatHolderAt } from "../simulation/judiciary/courts";
import type { OutfitTag } from "./appearance-engine/pack";

/**
 * WHO WEARS A UNIFORM, AND WHEN.
 *
 * A person whose job wears a uniform (Lane B's town jobs: nurses, police
 * officers, construction and quarry laborers) is drawn in it at work and in
 * their own portrait, which is how the player can tell what they do. At home,
 * in the neighborhood and outdoors in winter they wear their own clothes. A
 * police officer on duty in a chamber or courtroom stays in uniform; a nurse
 * at a formal hearing dresses formally.
 *
 * Judges wear a robe in court (a formal place) and in their own portrait,
 * never at home. A judge is anyone holding a judicial seat today (the
 * judiciary's seat tenures, including the Chief Justice's federal tenure) or
 * working in a judicial office as its judge.
 */
type Occasion = Exclude<OutfitTag, "uniform"> | "portrait";

const UNIFORMS: readonly {
  readonly occupations: RegExp;
  readonly outfit: string;
  readonly wornFor: readonly Occasion[];
}[] = [
  {
    occupations:
      /^(profession:(registered|practical)-nurse|occupation:(nursing-assistant|medical-assistant|home-health-aide))$/,
    outfit: "scrubs",
    wornFor: ["portrait", "business"],
  },
  {
    occupations: /^profession:police-officer$/,
    outfit: "police",
    wornFor: ["portrait", "business", "formal"],
  },
  {
    occupations: /^occupation:(construction-laborer|extraction-laborer)$/,
    outfit: "hi-vis",
    wornFor: ["portrait", "business"],
  },
];

const ROBE_WORN_FOR: readonly Occasion[] = ["portrait", "formal"];

/** The people sitting as judges on a date, cached per judiciary record. */
const SITTING_JUDGES = new WeakMap<
  object,
  { readonly date: string; readonly ids: ReadonlySet<EntityId> }
>();

function sittingJudgeIds(world: World): ReadonlySet<EntityId> {
  const judiciary = world.judiciary;
  if (!judiciary) return new Set();
  const today = world.currentDate;
  const cached = SITTING_JUDGES.get(judiciary);
  if (cached?.date === today) return cached.ids;
  const ids = new Set<EntityId>();
  for (const tenure of judiciary.seatTenures)
    if (
      tenure.startedAt <= today &&
      (tenure.endedAt === null || tenure.endedAt > today)
    )
      ids.add(tenure.personId);
  for (const seat of Object.values(judiciary.seats)) {
    if (!seat.linkedOfficeId) continue;
    const holder = seatHolderAt(world, seat.seatId, today);
    if (holder) ids.add(holder.personId);
  }
  SITTING_JUDGES.set(judiciary, { date: today, ids });
  return ids;
}

/** Whether this person sits as a judge on `world.currentDate`. */
export function isSittingJudge(world: World, personId: EntityId): boolean {
  if (sittingJudgeIds(world).has(personId)) return true;
  return activeWorkRelationshipsAt(world, personId).some(
    ({ role }) =>
      role.occupationClassification === "profession:judicial-office-principal",
  );
}

/**
 * The uniform outfit (a people-engine outfit id) this person wears in this
 * place, or undefined. `wear` undefined is their own portrait.
 */
export function workUniform(
  world: World,
  personId: EntityId,
  wear: Exclude<OutfitTag, "uniform"> | undefined,
): string | undefined {
  if (!world.people[personId]) return undefined;
  const occasion: Occasion = wear ?? "portrait";
  if (ROBE_WORN_FOR.includes(occasion) && isSittingJudge(world, personId))
    return "judge-robe";
  for (const { role } of activeWorkRelationshipsAt(world, personId)) {
    const occupation = role.occupationClassification ?? "";
    const uniform = UNIFORMS.find(
      (entry) =>
        entry.occupations.test(occupation) && entry.wornFor.includes(occasion),
    );
    if (uniform) return uniform.outfit;
  }
  return undefined;
}
