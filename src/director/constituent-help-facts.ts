/**
 * What a constituent's own records hand the office-hours scene (owner, Nov 9:
 * "a bunch of different scenes and scenarios and variants", drawn "from
 * people's lives and the world's records"): the employer they lost and how
 * long ago, the back rent a notice names and the day it runs out, the hourly
 * pay under the legal floor, and the relative at home who needs care. Each is
 * a fact of the scene cited to the records it came from, and each is set only
 * where its record is on the books, so a line that names it plays only then.
 * The variant that plays is chosen by arc-variant.ts from the same records;
 * this file only words what they say.
 */
import { P } from "../core2/parameters";
import { daysBetweenText } from "../core2/kernel/dates";
import { careNeedOf } from "../core2/modules/health";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  CASES_MODULE_ID,
  openCasesOf,
  type CaseRow,
} from "../core2/modules/offices";
import { STAFF_MODULE_ID, servingStaffOf } from "../core2/modules/staff";
import { countSaid, daysSaid } from "../english/count-words";
import rules from "./data/constituent-help-facts.json" with { type: "json" };
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { dollars } from "../english/bill-sections";
import { spanSaid } from "../english/span-words";
import type { Fact } from "../english/scene-talk-words";
import { properName, spokenDate } from "./words";
import type { VariantChoice } from "./arc-variant";

/** The job a person lost most recently before a day: the jobs module's newest layoff row. */
export function lastLayoff(
  core: Readonly<CoreState>,
  personId: PersonId,
  before: string,
) {
  if (!core.modules.has(JOBS_MODULE_ID)) return null;
  const rows = coreAPI(core as CoreState)
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .query("byPerson", [personId]) as unknown as {
    id: string;
    date: string;
    kind: string;
    organizationId: string;
  }[];
  return (
    rows
      .filter((row) => row.kind === "layoff" && row.date < before)
      .sort((x, y) => y.date.localeCompare(x.date) || x.id.localeCompare(y.id))[
      P.zero
    ] ?? null
  );
}

/**
 * What the constituent's case on the office's books says (constituent-cases.ts
 * CaseRow), for the moves of the case-help set (data/english/scene-move-sets.json):
 *
 * - `problem-work` / `problem-wage`: the problem the case was opened for;
 * - `agency`: the office the official refers it to by taking it up;
 * - `respond-in`: when the office decides it if nobody does sooner ("in
 *   seven days"), from the case's deadline;
 * - `employer` and `since` (a job seeker's last layoff), `money-left` (how
 *   their savings stand, in words), `pay` and `floor` (a wage complaint);
 * - `other-cases`: the official's other open cases; `staffer`: the aide who
 *   would take the case, where the official has staff.
 *
 * A fact is set only where its record is on the books.
 */
export function caseFacts(
  core: Readonly<CoreState>,
  askerId: PersonId,
  cause: { id: string; date: string; facts: Readonly<Record<string, string>> },
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const caseId = cause.facts.caseId;
  if (!caseId || !core.modules.has(CASES_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const row = api.moduleState(CASES_MODULE_ID).table("cases").get(caseId) as
    CaseRow | undefined;
  if (!row) return facts;
  const ids = [caseId];
  const said = (text: string) => ({ text, sourceRecordIds: ids });
  facts[
    row.problem === "paid-under-minimum-wage" ? "problem-wage" : "problem-work"
  ] = said("yes");
  const agency = (rules.agencyByProblem.value as Record<string, string>)[
    row.problem
  ];
  if (agency) facts.agency = said(agency);
  facts["respond-in"] = said(
    daysSaid(Math.max(P.one, daysBetweenText(cause.date, row.respondBy))),
  );
  if (row.problem === "paid-under-minimum-wage") {
    const hourly = Number(row.facts.hourlyMinor ?? P.zero);
    const floor = Number(row.facts.floorMinor ?? P.zero);
    if (hourly > P.zero) facts.pay = said(dollars(hourly));
    if (floor > P.zero) facts.floor = said(dollars(floor));
  } else {
    const loss = lastLayoff(core, askerId, cause.date);
    const org = loss ? core.organizations.get(loss.organizationId) : undefined;
    if (loss && org) {
      facts.employer = {
        text: properName(org.name),
        sourceRecordIds: [loss.id, org.id],
      };
      facts.since = {
        text: spanSaid(daysBetweenText(loss.date, cause.date)),
        sourceRecordIds: [loss.id],
      };
    }
    // How their savings stand, in words, from the case's severity.
    const band = rules.moneyLeft.value.find(
      (row_) => row.severity >= row_.atLeast,
    );
    if (band && row.severity > P.zero) facts["money-left"] = said(band.said);
  }
  const others = openCasesOf(api, row.officialId, row.id);
  if (others > P.zero) {
    const words = rules.otherCases.value;
    facts["other-cases"] = said(
      others === P.one
        ? words.one
        : words.more.replace("{count}", countSaid(others)),
    );
  }
  if (core.modules.has(STAFF_MODULE_ID)) {
    const aide = servingStaffOf(api, row.officialId)
      .map((staffer) => core.people.get(staffer.personId))
      .find((person) => person?.alive);
    if (aide)
      facts.staffer = { text: aide.givenName, sourceRecordIds: [aide.id] };
  }
  return facts;
}

export function constituentFacts(
  core: Readonly<CoreState>,
  askerId: PersonId,
  cause: { id: string; date: string; facts: Readonly<Record<string, string>> },
  variant: VariantChoice | null,
): Record<string, Fact> {
  const facts: Record<string, Fact> = caseFacts(core, askerId, cause);
  if (!variant) return facts;
  const api = coreAPI(core as CoreState);
  const person = core.people.get(askerId);
  if (!person) return facts;
  // A layoff: the employer, and how long ago it was.
  if ((variant.reads["laid-off"] ?? P.zero) > P.zero) {
    const loss = lastLayoff(core, askerId, cause.date);
    const org = loss ? core.organizations.get(loss.organizationId) : undefined;
    if (loss && org) {
      facts.employer = {
        text: properName(org.name),
        sourceRecordIds: [loss.id, org.id],
      };
      facts.since = {
        text: spanSaid(daysBetweenText(loss.date, cause.date)),
        sourceRecordIds: [loss.id],
      };
    }
  }
  // A rent notice on the household: what it owes, to the dollar, and the day.
  if ((variant.reads["notice-served"] ?? P.zero) > P.zero) {
    const rows = (
      api
        .moduleState("housing")
        .table("cases")
        .query("byHousehold", [person.householdId]) as unknown as {
        id: string;
        open?: boolean;
        owedAtNoticeMinor?: number;
        cureBy?: string;
      }[]
    )
      .filter((row) => row.open)
      .sort((a, b) => b.id.localeCompare(a.id));
    const row = rows[P.zero];
    if (row) {
      if ((row.owedAtNoticeMinor ?? P.zero) > P.zero)
        facts.owed = {
          text: dollars(
            Math.round(row.owedAtNoticeMinor! / P.minorPerDollar) *
              P.minorPerDollar,
          ),
          sourceRecordIds: [row.id],
        };
      if (row.cureBy)
        facts.deadline = {
          text: spokenDate(row.cureBy, cause.date),
          sourceRecordIds: [row.id],
        };
    }
  }
  // Pay under the floor: what the job pays by the hour and what the law sets.
  if (
    (variant.reads["paid-under-floor"] ?? P.zero) > P.zero &&
    cause.facts.caseId &&
    core.modules.has(CASES_MODULE_ID)
  ) {
    const row = api
      .moduleState(CASES_MODULE_ID)
      .table("cases")
      .get(cause.facts.caseId) as unknown as
      { facts?: { hourlyMinor?: number; floorMinor?: number } } | undefined;
    const ids = [cause.facts.caseId];
    if ((row?.facts?.hourlyMinor ?? P.zero) > P.zero)
      facts.pay = {
        text: dollars(row!.facts!.hourlyMinor!),
        sourceRecordIds: ids,
      };
    if ((row?.facts?.floorMinor ?? P.zero) > P.zero)
      facts.floor = {
        text: dollars(row!.facts!.floorMinor!),
        sourceRecordIds: ids,
      };
  }
  // Sickness at home: the relative whose care asks the most, named only where
  // that need is the larger of the two (theirs against the asker's own).
  const home = variant.reads["household-illness"] ?? P.zero;
  if (home > P.zero && home > (variant.reads["own-illness"] ?? P.zero)) {
    let best: { id: PersonId; need: number } | undefined;
    for (const id of core.households.get(person.householdId)?.memberIds ?? []) {
      const kin = core.people.get(id);
      if (id === askerId || !kin?.alive) continue;
      const need = careNeedOf(core, id);
      if (need > (best?.need ?? P.zero)) best = { id, need };
    }
    const kin = best ? core.people.get(best.id) : undefined;
    if (kin)
      facts.relative = {
        text: kin.givenName,
        sourceRecordIds: [kin.id, person.householdId],
      };
  }
  return facts;
}
