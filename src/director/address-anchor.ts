/**
 * The resident an address tells its problem through (the owner, Nov 24, P21:
 * "the problem told through people's lives, then the stand";
 * `story-address-anchor-person`): one real person in the town where the
 * address is watched whose own records carry the most of the burden the
 * speech's theme is about, never a draw. Health: the care their health asks
 * (`careNeedOf`, a sliding scale) plus going without coverage
 * (`coverageOf`). Wages: the lowest hourly pay among those who hold a job.
 * Hard times (`safety-net`): the lowest yearly household income on record
 * (`fullHouseholdIncomes`: pay, awards and public benefits). Public safety
 * (`justice`): the most crimes the crime engine recorded against them
 * (`crime.victimized`, which names the victim of a violent crime and every
 * member for one against the household). Ties go to the earlier record id.
 * Housing waits on the rent-burden reader (`housing-rent-burden-reader`);
 * other themes have no anchor yet.
 *
 * The facts are the person's name and town and what touches them, each cited
 * to the record that holds it; the words are the banks'.
 */
import type { EntityId } from "../core2/kernel/brands";
import { ageOnDate } from "../core2/kernel/dates";
import { fullHouseholdIncomes } from "../core2/counted-income-fifth";
import { coverageOf } from "../core2/modules/coverage";
import { CRIME_EVENT } from "../core2/modules/crime";
import { careNeedOf, seriousIllnessOf } from "../core2/modules/health";
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { spoken } from "./words";

type Facts = Record<string, GroundedEnglishFact>;

const fact = (text: string, ids: readonly string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

/** A resident's burden for a theme, with the records it rests on; null where the theme reads none of theirs. */
type Burden = { amount: number; facts: Facts } | null;

/** A theme's burden reader, prepared once per address from the world's records. */
type Reader = (person: PersonState) => Burden;

const BURDENS: Readonly<Record<string, (core: CoreState) => Reader>> = {
  health: (core) => (person) => {
    const care = careNeedOf(core, person.id as PersonId);
    const covered = coverageOf(coreAPI(core), person.id);
    const ill = seriousIllnessOf(core, person.id as PersonId);
    const amount = care + (covered ? P.zero : P.one);
    if (amount <= P.zero) return null;
    const facts: Facts = {};
    if (!covered) facts["anchor-uninsured"] = fact("yes", [person.id]);
    if (ill) facts["anchor-sick"] = fact("yes", [person.id]);
    else if (care > P.zero)
      facts["anchor-needs-care"] = fact("yes", [person.id]);
    return { amount, facts };
  },
  wages: (core) => (person) => {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job || !job.hoursDaily || (job.endsAt && job.endsAt <= core.date))
      return null;
    // Lower hourly pay is the larger burden.
    return {
      amount: -job.wageDailyMinor / job.hoursDaily,
      facts: { "anchor-low-pay": fact("yes", [job.id]) },
    };
  },
  "safety-net": (core) => {
    const income = fullHouseholdIncomes(core);
    return (person) => {
      // Only a household whose income is on record: a named official with no
      // household books is not the poorest in town.
      const yearly = person.householdId
        ? income.get(person.householdId)
        : undefined;
      return yearly === undefined
        ? null
        : {
            // Lower household income is the larger burden.
            amount: -yearly,
            facts: {
              "anchor-low-income": fact("yes", [person.householdId!]),
            },
          };
    };
  },
  justice: (core) => {
    const crimes = new Map<string, string[]>();
    for (const id of core.logByKind.get(CRIME_EVENT) ?? []) {
      const record = core.durableLog.get(id);
      if (!record || record.date > core.date) continue;
      for (const personId of record.personIds)
        crimes.set(personId, [...(crimes.get(personId) ?? []), id]);
    }
    return (person) => {
      const ids = crimes.get(person.id);
      return ids
        ? {
            amount: ids.length,
            facts: { "anchor-crime-victim": fact("yes", ids) },
          }
        : null;
    };
  },
};

/**
 * The anchor resident's facts for an address whose theme is `family`, from
 * the adults living in the player's own town (outside the player's
 * household), or nothing where the theme has no burden reader or nobody
 * carries one.
 */
export function anchorFacts(core: CoreState, family: string | null): Facts {
  const reader = family ? BURDENS[family] : undefined;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!reader || !player) return {};
  const burdenOf = reader(core);
  let best: { person: PersonState; amount: number; facts: Facts } | null = null;
  for (const person of core.people.values()) {
    if (
      !person.alive ||
      person.placeId !== player.placeId ||
      person.householdId === player.householdId ||
      ageOnDate(person.birthDate, core.date) < P.votingAge
    )
      continue;
    const burden = burdenOf(person);
    if (
      burden &&
      (!best ||
        burden.amount > best.amount ||
        (burden.amount === best.amount && person.id < best.person.id))
    )
      best = { person, ...burden };
  }
  if (!best) return {};
  const town = corePlaceByJurisdictionId(best.person.placeId as never);
  return {
    "anchor-name": fact(`${best.person.givenName} ${best.person.familyName}`, [
      best.person.id,
    ]),
    "anchor-first": fact(best.person.givenName, [best.person.id]),
    ...(town
      ? { "anchor-town": fact(spoken(town), [best.person.placeId]) }
      : {}),
    ...best.facts,
  };
}
