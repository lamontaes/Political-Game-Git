import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { availableActs } from "../core2/life";
import type { CoreState } from "../core2/types";

// M0's entry age is an exhibit-selection criterion, not a simulation rule.
const ENTRY_AGE = 18; // docs/roadmap/features.json, M0-05 and M0-06.
const missingSteps = [
  [
    "File for office where that place files: clerk, registrar or board of elections",
    "filing-office and office-qualification module",
  ],
  ["Campaign", "campaign module"],
  ["Win or lose", "election module"],
  ["Propose an ordinance", "governing and ordinance-proposal module"],
  ["Negotiate", "legislature and negotiation module"],
  ["Pass or fail", "legislature voting and enactment module"],
  ["Town changes", "law-effects module"],
  ["People bring it up", "law-effects-to-story and English integration"],
  ["Next election uses the record", "election-history integration"],
] as const;
const missingWorld = [
  ["National economy", "national economy and central-bank module"],
  ["State government", "state elections, laws, budgets and governing modules"],
  [
    "Federal government",
    "federal elections, laws, budgets and governing modules",
  ],
  ["Other places", "coarse other-place world module"],
] as const;

/** A read-only projection. Opening history is never evidence of a played step. */
export function benchProgress(core: CoreState, placeId: string) {
  const ids = [...(core.peopleByPlace.get(placeId) ?? [])].sort();
  const entrants = ids
    .map((id) => core.people.get(id)!)
    .filter(
      (person) =>
        person.alive &&
        [ENTRY_AGE - 1, ENTRY_AGE].includes(
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)),
        ),
    );
  // The core-only opening has 17-year-olds and adults starting at 19.
  // An actual upcoming birthday remains reachable through the calendar.
  entrants.sort(
    (a, b) =>
      ageOnDate(makeIsoDate(b.birthDate), makeIsoDate(core.date)) -
      ageOnDate(makeIsoDate(a.birthDate), makeIsoDate(core.date)),
  );
  let entrant = entrants[0];
  let contact: ReturnType<typeof availableActs>[number] | undefined;
  for (const person of entrants) {
    const offered = availableActs(core, person.id).find(
      (offer) =>
        offer.definition.effect === "contact" &&
        offer.targetId !== person.id &&
        core.people.get(offer.targetId)?.alive,
    );
    if (offered) {
      entrant = person;
      contact = offered;
      break;
    }
  }
  const household = entrant && core.households.get(entrant.householdId);
  const birthdayYear =
    entrant && Number(entrant.birthDate.slice(0, 4)) + ENTRY_AGE;
  const birthdayMonthDay = entrant?.birthDate.slice(5);
  // Match the date utility's leap-day birthday convention.
  const turns18At =
    birthdayYear && birthdayMonthDay
      ? `${birthdayYear}-${
          birthdayMonthDay === "02-29" &&
          !(
            birthdayYear % 4 === 0 &&
            (birthdayYear % 100 !== 0 || birthdayYear % 400 === 0)
          )
            ? "02-28"
            : birthdayMonthDay
        }`
      : undefined;
  const entryEvidence =
    entrant && household?.memberIds.includes(entrant.id)
      ? {
          kind: "opening-person" as const,
          personId: entrant.id,
          givenName: entrant.givenName,
          familyName: entrant.familyName,
          householdId: household.id,
          birthDate: entrant.birthDate,
          turns18At,
          age: ageOnDate(
            makeIsoDate(entrant.birthDate),
            makeIsoDate(core.date),
          ),
          date: core.date,
          source: entrant.source,
          birthFact: entrant.pastFacts?.find(
            (fact) =>
              fact.date === entrant.birthDate &&
              fact.facts?.birthDate === entrant.birthDate,
          ),
        }
      : undefined;
  const contactEvidence =
    entryEvidence && contact
      ? {
          kind: "current-offer" as const,
          personId: entryEvidence.personId,
          actionId: contact.definition.id,
          targetId: contact.targetId,
          date: core.date,
          offer: contact,
          target: core.people.get(contact.targetId),
        }
      : undefined;
  return {
    date: core.date,
    placeId,
    steps: [
      {
        step: 1,
        label: "Turn 18",
        status: entryEvidence ? "reachable now" : "not in the new core yet",
        missingModule: entryEvidence
          ? null
          : "opening resident at or approaching 18",
        evidence: entryEvidence,
      },
      {
        step: 2,
        label: "Meet people",
        status: contactEvidence ? "reachable now" : "not in the new core yet",
        missingModule: contactEvidence
          ? null
          : "contact offer for the resident at or approaching 18",
        evidence: contactEvidence,
      },
      ...missingSteps.map(([label, missingModule], index) => ({
        step: index + 3,
        label,
        status: "not in the new core yet",
        missingModule,
        evidence: undefined,
      })),
    ],
    world: missingWorld.map(([label, missingModule]) => ({
      label,
      status: "not in the new core yet",
      missingModule,
    })),
    installedModules: [...core.modules.keys()],
    worldRunning: false,
    furthestReachedStep: null,
    reachedEvidence: [],
    basis:
      "Reachability identifies existing opening records and current offers. No step is reached without played records and the M1 world modules running. Opening history and the presence of government organizations do not establish that.",
  };
}
