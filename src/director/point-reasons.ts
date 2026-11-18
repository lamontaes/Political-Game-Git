/**
 * Why someone stands where they do on a question, from their own life beyond
 * their work and their money (CTO, Nov 18 08:47Z, Story thread: "widen
 * `has-reason` to a lease, a relative in the house and a story read"). One
 * reader for each, used by both pickers that give a stand its reason: the
 * point of the President's address a housemate raises (`addressPointFor`,
 * ./conversation) and the stand said in own-view talk (`viewReason`,
 * ./view-learned). Each reads records other engines already keep, by the rows
 * in conversation-rules.json (`addressPoint.lease`, `.relative`, `.story`),
 * and cites them; nothing here decides what anyone believes (no dice).
 *
 * - `lease`: the household rents (the housing engine's dwelling and its
 *   lease), and a month's rent is above HUD's burden share of the household's
 *   month of income on its books (moves' `householdIncome`), on a question
 *   and side the rows list.
 * - `relative`: another member of the household whom the question touches,
 *   by the record the row names (a child the school engine sends to school,
 *   someone on Medicare, someone paid a retirement award, someone in college).
 * - `story`: a printed story the person heard and holds in what they know,
 *   whose question is the one asked, on either side.
 */
import { COVERAGE_MODULE_ID, coverageOf } from "../core2/modules/coverage";
import { HOUSING_MODULE_ID, dwellingTenure } from "../core2/modules/housing";
import { householdIncome } from "../core2/modules/moves";
import { newsKey, storiesHeard } from "../core2/modules/news";
import { schoolDayOf } from "../core2/modules/people";
import { ageInYears } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import {
  COLLEGE_STARTED,
  highSchoolEndOf,
  preStartHistory,
  schoolingEndsOf,
} from "../core2/past";
import { registerDerivedCache } from "../core2/snapshot";
import { coreAPI } from "../core2/state";
import rulesFile from "./data/conversation-rules.json" with { type: "json" };
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import type { CoreState, PersonId } from "../core2/types";
import type { Story } from "../core2/modules/news";

type Side = "for" | "against";
/** What in a household member's records a question touches. */
export type Touches = "school" | "medicare" | "retirement" | "student";

interface ReasonRules {
  readonly lease: { readonly questions: Readonly<Record<string, Side[]>> };
  readonly relative: {
    readonly retirementContractKind: string;
    readonly questions: Readonly<
      Record<string, { touches: Touches; sides: readonly Side[] }>
    >;
  };
  readonly story: { readonly kinds: readonly string[] };
}
const RULES = (rulesFile as unknown as { addressPoint: ReasonRules })
  .addressPoint;
/** The sides a household's hardship bears out, by question (stands.reasonFits): a lease the books say is too much is that hardship. */
const HARDSHIP_FITS = (
  rulesFile as unknown as {
    stands: {
      reasonFits: {
        questions: Readonly<Record<string, Partial<Record<Side, string>>>>;
      };
    };
  }
).stands.reasonFits.questions;
const HARDSHIP = "hardship";

/** A reason from the person's own life beyond work and money, with the records it stands on. */
export type LifeReason =
  | {
      readonly reason: "lease";
      /** The lease, the dwelling it is the rent of, and the income records it was weighed against. */
      readonly recordIds: readonly string[];
      readonly leaseId: string;
      /** A month's rent and a month's income on the books, in cents (for the trace; never said). */
      readonly rentMinor: number;
      readonly incomeMinor: number;
    }
  | {
      readonly reason: "relative";
      /** The relative's person record, then the record the question touches. */
      readonly recordIds: readonly string[];
      readonly relativeId: PersonId;
      readonly touches: Touches;
    }
  | {
      readonly reason: "story";
      /** The story, by its id. */
      readonly recordIds: readonly string[];
      readonly storyId: string;
      /** The day it ran. */
      readonly date: string;
      /** The outlet that carried it: its organization's id. */
      readonly outletId?: string;
    };

/** The reasons in the order a picker prefers them (see `lifeReason`). */
export const LIFE_REASONS = ["lease", "relative", "story"] as const;

/**
 * The household's lease, where its rent takes more than the burden share of
 * what its books say it brings in a month: the lease, its dwelling and the
 * income records. Null for an owner, a household with no lease or no income
 * on record, a question the rows do not list, or a side they do not give.
 */
export function leaseReason(
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  side: Side | null,
): Extract<LifeReason, { reason: "lease" }> | null {
  if (
    !side ||
    !(
      HARDSHIP_FITS[question]?.[side] === HARDSHIP ||
      RULES.lease.questions[question]?.includes(side)
    )
  )
    return null;
  const person = core.people.get(personId);
  if (!person) return null;
  const api = coreAPI(core as CoreState);
  const home = dwellingTenure(api, person.householdId);
  if (home?.tenure !== "rent") return null;
  // The lease the world opened with, else one signed on moving back in (its
  // id carries the day the dwelling's record says it began).
  const since = (
    api.moduleState(HOUSING_MODULE_ID).table("dwellings").get(home.recordId) as
      { since?: string } | undefined
  )?.since;
  const lease = [
    `lease:${person.householdId}`,
    ...(since ? [`lease:${person.householdId}:${since}`] : []),
  ]
    .map((id) => core.finance.contracts.get(id))
    .find((row) => !!row && !row.endedAt);
  const rent = home.rentMinor ?? lease?.amountMinor;
  if (!lease || !rent) return null;
  const income = householdIncome(api, person.householdId);
  const burden =
    DEFAULT_DIRECTOR_DATA.parameters.directorRentBurdenShare!.value;
  // A household with no income on its books has no burden to weigh: HUD's
  // CHAS tables mark its cost burden "not computed" and the Census Bureau
  // leaves it out of housing cost to income (directorRentBurdenShare).
  if (income.minor <= P.zero || rent <= income.minor * burden) return null;
  return {
    reason: "lease",
    leaseId: lease.id,
    rentMinor: rent,
    incomeMinor: income.minor,
    recordIds: [lease.id, home.recordId, ...income.ids],
  };
}

/** The record of a household member that a question touches, or null. */
function touchedRecord(
  core: Readonly<CoreState>,
  memberId: PersonId,
  touches: Touches,
): string | null {
  const api = coreAPI(core as CoreState);
  const person = core.people.get(memberId);
  if (!person?.alive) return null;
  switch (touches) {
    case "school":
      return schoolDayOf(api, memberId)?.schoolId ?? null;
    case "medicare": {
      // The coverage table is read only for someone old enough for Medicare.
      if (
        !core.modules.has(COVERAGE_MODULE_ID) ||
        ageInYears(person.birthDate, core.date) <
          api.parameter("healthMedicareAge")
      )
        return null;
      const row = coverageOf(api, memberId);
      return row?.plan === "medicare" ? row.id : null;
    }
    case "retirement":
      for (const id of core.finance.incomeContractsByPerson.get(memberId) ??
        []) {
        const row = core.finance.contracts.get(id);
        if (
          row &&
          !row.endedAt &&
          row.kind === RULES.relative.retirementContractKind
        )
          return row.id;
      }
      return null;
    case "student": {
      // In college now: past high school and before their schooling's end,
      // with the school past's record of the fall they started.
      if (
        highSchoolEndOf(person) >= core.date ||
        schoolingEndsOf(core, person) <= core.date
      )
        return null;
      const [started] = preStartHistory(core as CoreState, {
        kind: COLLEGE_STARTED,
        personId: memberId,
      });
      return started?.id ?? null;
    }
  }
}

/**
 * Another member of the person's household whom the question touches, by the
 * row's record (never the listener: they are told about someone else). The
 * first such member by id, so the same house gives the same relative.
 */
export function relativeReason(
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  side: Side | null,
  exceptId?: PersonId,
): Extract<LifeReason, { reason: "relative" }> | null {
  const row = RULES.relative.questions[question];
  if (!side || !row?.sides.includes(side)) return null;
  const person = core.people.get(personId);
  if (!person) return null;
  const members = [
    ...(core.households.get(person.householdId)?.memberIds ?? []),
  ].sort();
  for (const memberId of members) {
    if (memberId === personId || memberId === exceptId) continue;
    const record = touchedRecord(core, memberId, row.touches);
    if (record)
      return {
        reason: "relative",
        relativeId: memberId,
        touches: row.touches,
        recordIds: [memberId, record],
      };
  }
  return null;
}

/**
 * The newest printed story the person heard, and holds in what they know,
 * whose question is this one, or that reports the record the question was
 * raised from (`from`: the President's address, for its point, whose story
 * the paper prints under the address and not under each question).
 * Side-neutral: reading it puts the question on their mind, whichever way
 * they lean.
 */
export function storyReason(
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  from: readonly string[] = [],
): Extract<LifeReason, { reason: "story" }> | null {
  const known = core.knowledgeByPerson.get(personId);
  if (!known) return null;
  const heard = printedHeard(core, personId, known.size);
  // The newest of those on the question and those on the record it was
  // raised from.
  const [story] = [
    heard.byTopic.get(question),
    ...from.map((id) => heard.bySource.get(id)),
  ]
    .filter((row): row is Story => !!row)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  if (!story) return null;
  return {
    reason: "story",
    storyId: story.id,
    date: story.date,
    recordIds: [story.id],
    ...(story.outletId ? { outletId: story.outletId } : {}),
  };
}

/** The printed stories a person heard and holds in what they know, the newest by question and by the record each reports. */
interface Heard {
  readonly date: string;
  readonly known: number;
  readonly byTopic: ReadonlyMap<string, Story>;
  readonly bySource: ReadonlyMap<string, Story>;
}
/**
 * Read once while the day and what they know stay the same: a stand weighs
 * every question they hold one on, and each would read the same list again.
 */
const heardKept = new WeakMap<CoreState, Map<PersonId, Heard>>();
registerDerivedCache(heardKept);
function printedHeard(
  core: Readonly<CoreState>,
  personId: PersonId,
  known: number,
): Heard {
  let byPerson = heardKept.get(core as CoreState);
  if (!byPerson) heardKept.set(core as CoreState, (byPerson = new Map()));
  const kept = byPerson.get(personId);
  if (kept?.date === core.date && kept.known === known) return kept;
  const knows = core.knowledgeByPerson.get(personId);
  const byTopic = new Map<string, Story>();
  const bySource = new Map<string, Story>();
  // Newest first, so the first on each key is the newest.
  for (const story of storiesHeard(coreAPI(core as CoreState), personId)) {
    if (
      !RULES.story.kinds.includes(story.kind) ||
      !knows?.has(newsKey(story.id))
    )
      continue;
    if (story.topic && !byTopic.has(story.topic))
      byTopic.set(story.topic, story);
    const source = story.facts.sourceRecordId;
    if (source && !bySource.has(source)) bySource.set(source, story);
  }
  const heard = { date: core.date, known, byTopic, bySource };
  byPerson.set(personId, heard);
  return heard;
}

/**
 * One reason of a kind for a stand on a question, or null. Callers that
 * weigh several points take the kinds in `LIFE_REASONS` order: the person's
 * own life (their lease, someone they live with) before what they read, as
 * work and money come before both (owner, Nov 11: "where they stand on it
 * from their own life").
 */
export function lifeReasonOf(
  kind: (typeof LIFE_REASONS)[number],
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  side: Side | null,
  options: LifeReasonOptions = {},
): LifeReason | null {
  return kind === "lease"
    ? leaseReason(core, personId, question, side)
    : kind === "relative"
      ? relativeReason(core, personId, question, side, options.exceptId)
      : storyReason(core, personId, question, options.from);
}

/** Who a relative is never (the listener), and the records a question was raised from (a story reports them). */
export interface LifeReasonOptions {
  readonly exceptId?: PersonId;
  readonly from?: readonly string[];
}

/** The first reason of any kind for a stand on one question, in `LIFE_REASONS` order. */
export function lifeReason(
  core: Readonly<CoreState>,
  personId: PersonId,
  question: string,
  side: Side | null,
  options: LifeReasonOptions = {},
): LifeReason | null {
  for (const kind of LIFE_REASONS) {
    const found = lifeReasonOf(kind, core, personId, question, side, options);
    if (found) return found;
  }
  return null;
}
