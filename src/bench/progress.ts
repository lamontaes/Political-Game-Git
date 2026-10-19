import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { availableActs } from "../core2/life";
import type { CoreState } from "../core2/types";
import { coreAPI } from "../core2/state";
import { openContests, filingOfficeFor } from "../core2/modules/elections";
import { reachedSteps } from "./reached";

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
// Each world piece, the modules that run it, and what is still missing.
const missingWorld = [
  [
    "National economy",
    "national economy and central-bank module",
    ["macro"],
    null,
  ],
  [
    "State government",
    "state elections, laws, budgets and governing modules",
    ["core2-laws-v1", "core2-offices-v1", "core2-elections-v1", "regional"],
    "state budgets and governing (legislature, governor acting)",
  ],
  [
    "Federal government",
    "federal elections, laws, budgets and governing modules",
    ["core2-laws-v1", "core2-offices-v1", "core2-elections-v1", "macro"],
    "federal budgets and governing (Congress, president acting)",
  ],
  ["Other places", "coarse other-place world module", [], null],
] as const;

/** A read-only projection. Opening history is never evidence of a played step. */
// The module that runs each later step (OPUS-GOV and OPUS-PEOPLE).
const STEP_MODULES: Record<number, string> = {
  4: "core2-campaigns-v1",
  5: "core2-voting-v1",
  6: "core2-legislature-v1",
  7: "core2-legislature-v1",
  8: "core2-legislature-v1",
  9: "core2-law-effects-v1",
  10: "news",
  11: "core2-record-v1",
};

export function benchProgress(
  core: CoreState,
  placeId: string,
  playerId?: string,
) {
  const reached = playerId ? reachedSteps(core, playerId) : [];
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
  // Step 3 is reachable once the elections module has an open contest with
  // the office that takes its filings (a played filing is the reached step).
  const contest = core.modules.has("core2-elections-v1")
    ? openContests(coreAPI(core))[0]
    : undefined;
  const filingEvidence =
    entryEvidence && contest
      ? {
          kind: "open-contest" as const,
          personId: entryEvidence.personId,
          contestId: contest.id,
          title: contest.title,
          filingDeadline: contest.filingDeadline,
          filedWith: filingOfficeFor(coreAPI(core), contest.id).filedWith,
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
      ...missingSteps.map(([label, missingModule], index) => {
        const step = index + 3;
        const played = reached.find((row) => row.step === step);
        if (played)
          return {
            step,
            label,
            status: "reached",
            missingModule: null,
            evidence: { kind: "played-records" as const, ...played },
          };
        if (step === 3 && filingEvidence)
          return {
            step,
            label,
            status: "reachable now",
            missingModule: null,
            evidence: filingEvidence,
          };
        const moduleId = STEP_MODULES[step];
        if (moduleId && core.modules.has(moduleId))
          return {
            step,
            label,
            status: "reachable now",
            missingModule: null,
            evidence: { kind: "module-running" as const, moduleId },
          };
        return {
          step,
          label,
          status: "not in the new core yet",
          missingModule,
          evidence: undefined,
        };
      }),
    ],
    world: missingWorld.map(([label, missingModule, modules, still]) => {
      const running = modules.filter((id) => core.modules.has(id));
      return running.length === 0
        ? { label, status: "not in the new core yet", missingModule }
        : {
            label,
            status:
              running.length === modules.length && !still
                ? "running"
                : "partly running",
            runningModules: running,
            missingModule:
              still ??
              (running.length === modules.length ? null : missingModule),
          };
    }),
    installedModules: [...core.modules.keys()],
    worldRunning: missingWorld.some(([, , modules]) =>
      modules.some((id) => core.modules.has(id)),
    ),
    furthestReachedStep: reached.length
      ? Math.max(...reached.map((row) => row.step))
      : null,
    reachedEvidence: reached,
    basis:
      "Reachability identifies existing opening records and current offers. No step is reached without played records and the M1 world modules running. Opening history and the presence of government organizations do not establish that.",
  };
}
