/**
 * P15 people module: time spent together at home, and the pull to reach out
 * to someone whose tie is fading.
 *
 * People who share a household spend the ATUS average time in each other's
 * presence; once a week that week's hours are added to their tie. When a
 * person chooses whom to contact, each candidate's pull is the hours of time
 * together their tie has lost since they last met, so close ties that are
 * fading draw contact first and distant relatives draw less.
 *
 * Part 2b: caring for a relative answers the needs of relatives at home (a
 * child by age, a grown relative by health and closeness), so a person cares
 * when they have one to care for and the need is met for the day once they
 * have.
 *
 * Part 4: after a death, relatives grieve (grief.ts); grief pulls toward rest
 * and family and holds back organizing as it fades.
 */
import { pairKey } from "../kernel/pair-key";
import { daysBetween, makeIsoDate } from "../kernel/dates";
import {
  CLOSENESS,
  closenessBetween,
  hoursLost,
  openingClosenessHours,
} from "../closeness";
import { careNeedOf } from "./health";
import { GRIEF, griefToday, recordDeath } from "../grief";
import { ENCOUNTERS } from "../encounters";
import { runDuePlannedActs } from "../free-block";
import { OPENING_KIN } from "../opening-kin";
import type {
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonState,
  Relationship,
} from "../types";
import { offer } from "./life";

export const PEOPLE_MODULE_ID = "core2-people-p15-v1";
const LOOKUP = {
  officeAffordance: "known-office",
  affordances: ["known-office", "public-meeting-place", "known-group"],
} as const;

const seeded = new WeakSet<object>();

function shareHomeTime(api: CoreAPI): void {
  const core = api.state;
  const p = (key: string) => api.parameter(key);
  const day = daysBetween(makeIsoDate(core.startedAt), makeIsoDate(core.date));
  const week = p("daysPerWeek");
  const opening = !seeded.has(core);
  if (!opening && (day <= p("zero") || day % week !== p("zero"))) return;
  seeded.add(core);
  api.stopgap(CLOSENESS.stopgapId);
  for (const household of core.households.values()) {
    if (household.memberIds.length < p("two")) continue;
    const members = household.memberIds
      .map((id) => core.people.get(id))
      .filter(
        (person) =>
          person !== undefined &&
          person.alive &&
          person.tier !== OPENING_KIN.kinTier,
      );
    for (let left = p("zero"); left < members.length; left += p("one"))
      for (
        let right = left + p("one");
        right < members.length;
        right += p("one")
      ) {
        const a = members[left]!,
          b = members[right]!;
        const family = a.familyIds.has(b.id);
        // Housemates who are not family start where living together settles.
        if (opening) {
          if (!family && !core.relationships.has(pairKey(a.id, b.id)))
            api.relationship(
              a.id,
              b.id,
              CLOSENESS.householdKind as Relationship["kind"],
              openingClosenessHours(core, a.id, b.id),
              undefined,
              { cause: ENCOUNTERS.causes.openingHome },
            );
          continue;
        }
        const minutes = p(
          family
            ? "householdFamilyMinutesPerDay"
            : "householdOtherMinutesPerDay",
        );
        api.relationship(
          a.id,
          b.id,
          (family
            ? CLOSENESS.familyKind
            : CLOSENESS.householdKind) as Relationship["kind"],
          (minutes / p("minutesPerHour")) * week,
          undefined,
          { cause: ENCOUNTERS.causes.homeTime, sourceId: household.id },
        );
      }
  }
}

/**
 * P15 part 2b: relatives at home who need care, with how much each needs: a
 * newborn needs full care, and a child's need falls with age to none at the
 * age ATUS counts household children to. A grown relative's need follows
 * their health (health.ts `careNeedOf`) and the closeness of the tie.
 */
const dependentsCache = new WeakMap<
  Readonly<PersonState>,
  { date: string; rows: { id: string; need: number }[] }
>();

function dependents(
  api: CoreAPI,
  actor: Readonly<PersonState>,
): { id: string; need: number }[] {
  const cached = dependentsCache.get(actor);
  if (cached?.date === api.state.date) return cached.rows;
  const p = (key: string) => api.parameter(key);
  const rows: { id: string; need: number }[] = [];
  const today = makeIsoDate(api.state.date);
  for (const id of actor.familyIds) {
    const other = api.state.people.get(id);
    if (!other?.alive || other.householdId !== actor.householdId) continue;
    const years =
      daysBetween(makeIsoDate(other.birthDate), today) / p("daysPerMeanYear");
    const childNeed = p("one") - years / p("householdChildAgeYears");
    // A child needs care by age. A grown relative needs it by health, and how
    // much of it this person gives follows how close the two are.
    const need =
      childNeed > p("zero")
        ? childNeed
        : careNeedOf(api.state, id) * closenessBetween(api.state, actor.id, id);
    if (need > p("zero")) rows.push({ id, need });
  }
  dependentsCache.set(actor, { date: api.state.date, rows });
  return rows;
}

export const PEOPLE_MODULE: CoreModule = {
  id: PEOPLE_MODULE_ID,
  onDay: (api) => {
    shareHomeTime(api);
  },
  // Part 4: a death reaches the relatives who learn of it as grief.
  eventKinds: GRIEF.deathEventKinds,
  onEvent: (api, event, learnedBy) => recordDeath(api, event, learnedBy),
  // Part 2b: acts planned for today that no other loop has run yet.
  onAfterDay: (api) => {
    runDuePlannedActs(api.state);
  },
  needEvaluators: {
    // The children at home need care each day; the act meets it for the day.
    "dependent-care": (api, actor) =>
      Math.min(
        api.parameter("one"),
        dependents(api, actor).reduce(
          (sum, row) => sum + row.need,
          api.parameter("zero"),
        ),
      ),
  },
  offerProviders: {
    "dependent-at-home": (api, actor, action) =>
      dependents(api, actor).map((row) => offer(api, actor, action, row.id)),
    // P15 part 4: looking something up serves a cause's need to know where
    // to go next: an office to approach (one with staff), a place to meet or
    // a group to join. A person with a cause is offered the institutions of
    // each kind they know none of in their town and county; once they know
    // one of a kind, look-ups of that kind stop pulling.
    "office-directory": (api, actor, action) => {
      if (!actor.drives.size) return [];
      const unknown = new Map<string, string[]>();
      const known = new Set<string>();
      for (const placeId of new Set([
        actor.placeId,
        ...(actor.countyId ? [actor.countyId] : []),
      ]))
        for (const id of api.state.publicOrganizationsByPlace.get(placeId) ??
          []) {
          const row = api.state.publicOrganizations.get(id)!;
          for (const kind of LOOKUP.affordances) {
            if (!row.affordances?.includes(kind)) continue;
            if (kind === LOOKUP.officeAffordance && !row.staff?.length)
              continue;
            if (api.knows(actor.id, `organization:${id}:public`))
              known.add(kind);
            else unknown.set(kind, [...(unknown.get(kind) ?? []), id]);
          }
        }
      const ids = new Set<string>();
      for (const [kind, rows] of unknown)
        if (!known.has(kind)) for (const id of rows) ids.add(id);
      return [...ids].map((id) => offer(api, actor, action, id));
    },
    // Everyone the person knows and has a tie with, plus one person they know
    // without a tie yet. Untied offers all score alike and the chooser breaks
    // ties by the lowest key, so the lowest-id untied person stands for them all.
    "contact-candidate": (api, actor, action) => {
      const out: ActOffer[] = [];
      let untied: string | undefined;
      for (const id of actor.knownIds) {
        if (!api.state.people.get(id)?.alive) continue;
        if (api.state.relationships.has(pairKey(actor.id, id)))
          out.push(offer(api, actor, action, id));
        else if (untied === undefined || id < untied) untied = id;
      }
      if (untied !== undefined) out.push(offer(api, actor, action, untied));
      return out;
    },
  },
  reasonProviders: {
    // Grief pulls toward rest and toward family, and holds back organizing;
    // a visit to someone outside the family draws no pull from it.
    grief: (api, actor, offer) => {
      const { grief, sourceIds } = griefToday(api, actor);
      if (grief <= api.parameter("zero")) return undefined;
      const target = api.state.people.get(offer.targetId);
      if (target && target.id !== actor.id && !actor.familyIds.has(target.id))
        return undefined;
      return { value: grief, sourceIds };
    },
    "tie-fading": (api, actor, offer) => {
      const id = pairKey(actor.id, offer.targetId);
      const row = api.state.relationships.get(id);
      const other = api.state.people.get(offer.targetId);
      if (!row || !other) return undefined;
      const near =
        other.placeId === actor.placeId ||
        (other.countyId !== undefined && other.countyId === actor.countyId);
      return {
        value:
          hoursLost(api.state, row) *
          (near ? api.parameter("one") : api.parameter("farKinContactShare")),
        sourceIds: [row.id],
      };
    },
  },
};
