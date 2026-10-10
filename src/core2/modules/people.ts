/**
 * P15 people module: time spent together at home, and the pull to reach out
 * to someone whose tie is fading.
 *
 * People who share a household spend the ATUS average time in each other's
 * presence; once a week that week's hours are added to their tie. When a
 * person chooses whom to contact, each candidate's pull is the hours of time
 * together their tie has lost since they last met, so close ties that are
 * fading draw contact first and distant relatives draw less.
 */
import { daysBetween, makeIsoDate } from "../../simulation/dates";
import { CLOSENESS, hoursLost, openingClosenessHours } from "../closeness";
import { OPENING_KIN } from "../opening-kin";
import type { CoreAPI, CoreModule, Relationship } from "../types";

export const PEOPLE_MODULE_ID = "core2-people-p15-v1";

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
          if (!family && !core.relationships.has([a.id, b.id].sort().join(":")))
            api.relationship(
              a.id,
              b.id,
              CLOSENESS.householdKind as Relationship["kind"],
              openingClosenessHours(core, a.id, b.id),
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
        );
      }
  }
}

export const PEOPLE_MODULE: CoreModule = {
  id: PEOPLE_MODULE_ID,
  onDay: (api) => {
    shareHomeTime(api);
  },
  reasonProviders: {
    "tie-fading": (api, actor, offer) => {
      const id = [actor.id, offer.targetId].sort().join(":");
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
