/**
 * What a story the press printed during play says, as facts for the English
 * engine. The press keeps the record it printed from (a law taking effect, a
 * vote, a charge); this reads that record and the records it names (the bill,
 * the person, the office, the law in force) and hands the English engine the
 * facts its news banks word. Every fact cites the printed story and the record
 * it came from. A record whose facts can't be said is left unworded here.
 */
import billNames from "../../data/english/bill-names.json" with { type: "json" };
import businessBooks from "../core2/data/business-books.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate, spokenDate } from "../core2/kernel/dates";
import { partyName } from "../core2/appointments";
import board from "../core2/data/macro/board.json" with { type: "json" };
import { BUDGETS_MODULE_ID, type BudgetRow } from "../core2/modules/budgets";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { BUSINESS_MODULE_ID } from "../core2/modules/business";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "../core2/modules/laws";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../core2/modules/legislature";
import { MACRO_MODULE_ID } from "../core2/modules/macro";
import {
  federalOffices,
  OFFICES_MODULE_ID,
  stateOffices,
  type TermRow,
  type VacancyRow,
} from "../core2/modules/offices";
import { OFFICE_DAY_MODULE_ID } from "../core2/modules/office-day";
import { officialOf } from "../core2/modules/officials";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import {
  corePlaceByJurisdictionId,
  coreStateName,
} from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import {
  billNameFor,
  billNameOf,
  spokenDesignation,
} from "../english/bill-names";
import type { StoryKind } from "../english/english-newscast";
import { storyTopicName } from "../english/policy-names";
import { lineName } from "./budget";
import { policyNames } from "./words";

/**
 * The ids of the modules whose tables a story is told from, named here by
 * their string as the world panels do (these engines' files are not this
 * family's to import).
 */
const CRIME_MODULE_ID = "core2-crime-v1";
const SCHOOL_MODULE_ID = "core2-school-days-v1";
const WORLD_METRICS_MODULE_ID = "world-metrics";

/** A printed story as the news engine keeps it. */
export interface PrintedStory {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  /** What the story is about: a policy question, a person, an organization. */
  readonly topic?: string;
  readonly facts: Readonly<Record<string, unknown>>;
}

type Fact = { text: string; sourceRecordIds: EntityId[] };
type Facts = Record<string, Fact>;
/** What a printed story says: its kind of story, who it is about and its facts. */
export interface PrintedFacts {
  readonly kind: StoryKind;
  readonly speaker: string;
  readonly facts: Facts;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const dollars = (minor: number, cents = false) => {
  // A paper rounds a large sum: "$228.7 million", never "$228,722,690".
  const whole = Math.abs(minor / 100);
  for (const [size, word] of [
    [1e9, "billion"],
    [1e6, "million"],
  ] as const)
    if (whole >= size)
      return `${minor < 0 ? "-" : ""}$${Math.round((whole / size) * 10) / 10} ${word}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(minor / 100);
};
/** A rate as a paper prints it, to a tenth: "4.1%". */
const percent = (value: number) => `${Math.round(value * 10) / 10}%`;
const SMALL = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
/** A count as a paper prints it: one through nine in words, then "1,250". */
const count = (value: number) =>
  SMALL[Math.round(value)] ??
  new Intl.NumberFormat("en-US").format(Math.round(value));
const ORDINALS = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
];
/** A place in a count as a paper prints it: "first" through "ninth", then "10th". */
const ordinal = (value: number) =>
  ORDINALS[value] ??
  `${value}${
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][value % 10] ?? "th")
  }`;
/** A month and year as a paper prints them: "August 2024". */
const monthYear = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** Whole years from one ISO date to a later one. */
const yearsBetween = (from: string, to: string) =>
  Number(to.slice(0, 4)) -
  Number(from.slice(0, 4)) -
  (to.slice(5) < from.slice(5) ? 1 : 0);
/** The industry each business classification works in, as the books name it. */
const INDUSTRIES = new Map<string, string>(
  businessBooks.classifications.flatMap((row) => {
    const kind = businessBooks.kinds.find((k) => k.id === row.kindId);
    return kind ? [[row.classification, kind.industry] as const] : [];
  }),
);
/** The industry of each kind of business, by the kind's id. */
const KIND_INDUSTRIES = new Map<string, string>(
  businessBooks.kinds.map((kind) => [kind.id, kind.industry]),
);
/** An industry as a sentence says it: "retail trade". */
const industryWords = (industry: string | undefined) =>
  industry && industry !== "All active corporations"
    ? industry.charAt(0).toLowerCase() + industry.slice(1)
    : null;
/**
 * Who fills a vacancy, as the rule names them, in a few words: "governor",
 * "county commission". A long or voting-based answer is left out.
 */
const appointerWords = (appointedBy: string | undefined) => {
  const first = (appointedBy ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .split(/[;,]/)[0]!
    .replace(/-/g, " ")
    .trim();
  return first && !/voter|elected/i.test(first) && first.split(" ").length <= 8
    ? first
    : null;
};
/**
 * What a law's series is about, as a paper says it: the English engine's
 * subject for the series ("maximum monthly food assistance benefit"),
 * without its article, else the key read as words.
 */
const measureName = (series: string) =>
  storyTopicName(series)?.replace(/^the /i, "") ?? spaced(series);
/** A record key read as words: "finance-director" and "financeDirector" are "finance director". */
const spaced = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_.]+/g, " ")
    .trim()
    .toLowerCase();
const num = (value: string | undefined) => {
  const parsed = Number(value);
  return value !== undefined && value.trim() !== "" && Number.isFinite(parsed)
    ? parsed
    : undefined;
};
const POLICIES = (
  billNames as unknown as {
    policies: Record<string, { purpose: string; repealPurpose: string }>;
  }
).policies;

let ISSUES: Record<string, string> | undefined;
/** Other states' office titles by office id, by state: read once, never stored in the world. */
const ELSEWHERE = new Map<string, Map<string, string>>();

/** The facts for one printed story, or null when its record can't be said. */
export function printedFacts(
  core: CoreState,
  story: PrintedStory,
): PrintedFacts | null {
  if (story.kind !== "press.printed") return null;
  const sourceId = String(story.facts.sourceRecordId ?? "");
  const source = core.durableLog.get(sourceId as EntityId) as
    | {
        kind: string;
        date?: string;
        personIds: readonly string[];
        facts?: Record<string, string>;
      }
    | undefined;
  // A source the durable log doesn't keep (a module's own record, a dated
  // event) is named by its id: "event:<kind>:…" or "<kind>:…".
  const kind =
    source?.kind ??
    (sourceId.startsWith("event:")
      ? sourceId.split(":")[1]!
      : sourceId.split(":")[0]!);
  const facts: Record<string, string> = { ...(source?.facts ?? {}) };
  for (const [key, value] of Object.entries(story.facts))
    if (typeof value === "string") facts[key] = value;
  // The day the record happened: its own date, else the one its id ends with.
  const happened =
    source?.date ?? /(\d{4}-\d{2}-\d{2})(?::\d+)*$/.exec(sourceId)?.[1] ?? "";
  const read = new Reader(
    core,
    story,
    sourceId,
    kind,
    source?.personIds ?? [],
    happened,
  );
  return BUILDERS[kind]?.(read, facts) ?? null;
}

/** What a builder reads with: names, offices, bills and places, each cited by record. */
class Reader {
  readonly api;
  constructor(
    readonly core: CoreState,
    readonly story: PrintedStory,
    readonly sourceId: string,
    readonly kind: string,
    readonly people: readonly string[],
    /** The day the printed record happened (the story's date is the day it ran). */
    readonly happened: string = "",
  ) {
    this.api = coreAPI(core);
  }
  fact(text: string, ...more: readonly string[]): Fact {
    return {
      text,
      sourceRecordIds: [
        this.story.id,
        ...(this.sourceId ? [this.sourceId] : []),
        ...more.filter(Boolean),
      ] as EntityId[],
    };
  }
  yes(): Fact {
    return this.fact("yes");
  }
  /** The day the record happened, as people say it (the story's own day when the record keeps none). */
  date(): Fact {
    return this.fact(spokenDate(this.happened || this.story.date));
  }
  private table(module: string, name: string) {
    return this.core.modules.has(module)
      ? this.api.moduleState(module).table(name)
      : undefined;
  }
  term(id: string) {
    return this.table(OFFICES_MODULE_ID, "terms")?.get(
      id.replace(/^official:/, ""),
    ) as unknown as
      | {
          officeId: string;
          identity: { givenName: string; familyName: string };
        }
      | undefined;
  }
  /** A full person's or a named official's name; null for anyone else. */
  name(id: string | undefined): string | null {
    if (!id) return null;
    const person = this.core.people.get(id as EntityId);
    if (person) return `${person.givenName} ${person.familyName}`;
    const term = this.term(id);
    return term
      ? `${term.identity.givenName} ${term.identity.familyName}`
      : null;
  }
  /** An office's title ("Governor", "Council member"); null when unknown. */
  officeTitle(officeId: string | undefined): string | null {
    if (!officeId) return null;
    const office = this.table(OFFICES_MODULE_ID, "offices")?.get(
      officeId,
    ) as unknown as { title?: string } | undefined;
    return office?.title ?? null;
  }
  /**
   * Another state's office (a U.S. Senate seat from Minnesota), which this
   * world's office table does not keep: its title from that state's own
   * offices, read without creating them, and the state's name.
   */
  officeElsewhere(
    officeId: string | undefined,
  ): { title: string; state: string } | null {
    const jurisdiction = (officeId ?? "").split(":")[1] ?? "";
    const state = this.place(jurisdiction);
    let titles = ELSEWHERE.get(jurisdiction);
    if (!titles) {
      titles = new Map(
        [
          ...federalOffices(jurisdiction, "", this.core.date),
          ...stateOffices(jurisdiction, "", this.core.date),
        ].map((row) => [row.office.id, row.office.title]),
      );
      ELSEWHERE.set(jurisdiction, titles);
    }
    const title = titles.get(officeId ?? "");
    return state && title ? { title, state } : null;
  }
  /** The office a person or official holds: by their term, else their serving term. */
  officeOf(id: string): string | null {
    const term = this.term(id);
    if (term) return this.officeTitle(term.officeId);
    const serving = (
      (this.table(OFFICES_MODULE_ID, "terms")?.query("byPerson", [id]) ??
        []) as unknown as { officeId: string; status: string }[]
    ).find((row) => row.status === "serving");
    return serving ? this.officeTitle(serving.officeId) : null;
  }
  /** One row of a module's table, when that module is in this world. */
  row<T>(module: string, name: string, id: string | undefined): T | undefined {
    return id ? (this.table(module, name)?.get(id) as unknown as T) : undefined;
  }
  /** The rows of a module's table under one index key. */
  query<T>(
    module: string,
    name: string,
    index: string,
    key: readonly string[],
  ): T[] {
    return (this.table(module, name)?.query(index, key) ??
      []) as unknown as T[];
  }
  /** The term a person or named official holds: by the official's id, else the person's serving term. */
  termOf(id: string): TermRow | undefined {
    const term = this.term(id) as unknown as TermRow | undefined;
    if (term) return term;
    return this.query<TermRow>(OFFICES_MODULE_ID, "terms", "byPerson", [
      id,
    ]).find((row) => row.status === "serving");
  }
  /**
   * The state official outside the town's own table (a member of Congress, a
   * governor, a legislator elsewhere): the office the officials engine seats
   * them in, as a title and the state that sent them.
   */
  officialPost(id: string): {
    post: string;
    place: string;
    party: string | null;
    since: string;
  } | null {
    const row = officialOf(this.api, id);
    if (!row) return null;
    const there = this.officeElsewhere(
      `office:${row.stateKey}:${row.officeKind}`,
    );
    return there
      ? {
          post: there.title,
          place: there.state,
          party: row.party,
          since: row.serviceStart,
        }
      : null;
  }
  /** A seat on the central bank's board, as a title, and the year the member was appointed to it. */
  boardPost(personId: string): { office: string; since: string } | null {
    const member = (
      (this.table(MACRO_MODULE_ID, "members")?.rows() ?? []) as unknown as {
        personId: string;
        seatKind: string;
        districtId?: string;
        appointedAt: string;
      }[]
    ).find((row) => row.personId === personId);
    if (!member) return null;
    const bank = board.districts.find(
      (district) => district.id === member.districtId,
    )?.institution;
    return {
      office:
        member.seatKind === "governor"
          ? "Federal Reserve governor"
          : bank
            ? `president of the ${bank}`
            : "Federal Reserve Bank president",
      since: member.appointedAt,
    };
  }
  /** What a business does, in a few words ("retail trade"), by its classification. */
  industry(organizationId: string | undefined): string | null {
    const org = organizationId
      ? this.core.organizations.get(organizationId as EntityId)
      : undefined;
    return industryWords(INDUSTRIES.get(org?.classification ?? ""));
  }
  /** The town's own place id (every record of a town's life is filed under it). */
  townPlaceId(): string {
    return lawChain(this.api).townPlaceId;
  }
  /** The town's name for a person who lives in it; null for anyone who lives elsewhere. */
  residence(personId: string | undefined): string | null {
    const person = personId
      ? this.core.people.get(personId as EntityId)
      : undefined;
    return person && person.placeId === this.townPlaceId()
      ? this.place()
      : null;
  }
  bill(id: string | undefined): BillRow | undefined {
    if (!id) return undefined;
    return this.table(LEGISLATURE_MODULE_ID, "bills")?.get(id) as unknown as
      BillRow | undefined;
  }
  /** A bill's name ("Fair Wage Act"), its purpose and its designation ("HB 2"). */
  billFacts(id: string | undefined, number?: string): Facts {
    const bill = this.bill(id);
    // A bill another chamber's engine keeps is named by the number its record carries.
    if (!bill)
      return number ? { designation: this.fact(number, id ?? "") } : {};
    const named = billNameOf(bill);
    return {
      ...(named
        ? {
            law: this.fact(named.title, bill.id),
            purpose: this.fact(named.purpose, bill.id),
          }
        : {}),
      designation: this.fact(
        spokenDesignation(bill.number, bill.form.kind),
        bill.id,
      ),
    };
  }
  /** A race's office, from its contest record ("Town board member"). */
  contestTitle(id: string | undefined): string | null {
    if (!id) return null;
    const contest = this.table(ELECTIONS_MODULE_ID, "contests")?.get(
      id,
    ) as unknown as { title?: string } | undefined;
    return contest?.title ?? null;
  }
  /** An organization's name; null where its record keeps none but its key. */
  organization(id: string | undefined): string | null {
    const name = id ? this.core.organizations.get(id as EntityId)?.name : null;
    return name && !/[:_]/.test(name) ? name : null;
  }
  /** An outlet's name, from its organization. */
  outlet(id: string | undefined): string | null {
    const row = id
      ? (this.table(PRESS_MODULE_ID, "outlets")?.get(id) as unknown as
          { organizationId: string } | undefined)
      : undefined;
    return this.organization(row?.organizationId);
  }
  /** The body an office sits on ("Legislature of the Virgin Islands"), when its record names one. */
  body(officeId: string | undefined): string | null {
    if (!officeId) return null;
    const office = this.table(OFFICES_MODULE_ID, "offices")?.get(
      officeId,
    ) as unknown as { bodyName?: string } | undefined;
    // "Legislature (unicameral)" is the body's name; the note is the record's.
    return office?.bodyName?.replace(/\s*\([^)]*\)$/, "") ?? null;
  }
  /**
   * The town's own name ("Stockport"), or a state's ("Ohio") by its key. A
   * plural name or a district takes its article: "the U.S. Virgin Islands".
   */
  place(jurisdiction?: string): string | null {
    const chain = lawChain(this.api);
    const usps = /^US-([A-Z]{2})$/.exec(jurisdiction ?? "")?.[1];
    if (usps) {
      const name = coreStateName(usps);
      return name && /Islands$|^District of /.test(name) ? `the ${name}` : name;
    }
    if (jurisdiction && jurisdiction !== chain.townPlaceId) return null;
    const town = corePlaceByJurisdictionId(chain.townPlaceId as EntityId);
    return town ? (town.formalName ?? town.displayName.split(",")[0]!) : null;
  }
  /** The first person the record names who has a name. */
  first(ids: readonly string[] = this.people): string | undefined {
    return ids.find((id) => this.name(id));
  }
  /** Name facts for one person (`name`, or another key) and, for `name`, their office. */
  who(id: string | undefined, key = "name", office = true): Facts {
    const name = this.name(id);
    if (!id || !name) return {};
    const title = office && key === "name" ? this.officeOf(id) : null;
    return {
      [key]: this.fact(name, id),
      ...(title ? { office: this.fact(title, id) } : {}),
    };
  }
  /** A policy question by its name ("stand your ground"), as an issue is talked about. */
  /**
   * What an interview or a check of one was about, said after "about" or
   * "on": a policy by what it is for ("preschool for every child"), a budget
   * line by what it pays for ("public welfare"), else by the policy's name.
   */
  issue(topic: string): Facts {
    ISSUES ??= policyNames();
    const name = topic.startsWith("budget-line:")
      ? lineName(topic.slice("budget-line:".length))
      : (POLICIES[topic]?.purpose ?? ISSUES[topic]);
    return name
      ? { issue: this.fact(name.charAt(0).toLowerCase() + name.slice(1)) }
      : {};
  }
  /** What a policy question is for, as a noun phrase ("a higher minimum wage"). */
  purpose(question: string | undefined, repeal = false): Facts {
    const row = question ? POLICIES[question] : undefined;
    return row
      ? { purpose: this.fact(repeal ? row.repealPurpose : row.purpose) }
      : {};
  }
}

type Builder = (
  read: Reader,
  facts: Record<string, string>,
) => PrintedFacts | null;

/**
 * A story when every needed fact is there. A count says whether it is one or
 * several, so a line that says "people" or "jobs" is said only of several.
 */
function story(
  kind: StoryKind,
  facts: Facts,
  needs: readonly string[],
  speaker = "",
): PrintedFacts | null {
  if (!needs.every((key) => facts[key])) return null;
  const said = facts.number?.text.replace(/,/g, "") ?? "";
  const n = SMALL.includes(said) ? SMALL.indexOf(said) : Number(said || NaN);
  const size = n > 1 ? "several" : n === 1 ? "one" : null;
  return {
    kind,
    speaker,
    facts: size ? { ...facts, [size]: facts.number! } : facts,
  };
}

/** How a law's amount is said, by its unit ("minor/hour" is a wage). */
function amount(unit: string, value: number): string | null {
  if (unit === "minor/hour") return dollars(value, true);
  if (unit === "minor") return dollars(value);
  // A benefit or a limit kept in whole dollars for a period.
  if (/^(?:USD|dollars)\/(?:week|month|year)$/i.test(unit))
    return dollars(value * 100);
  if (unit.startsWith("percent")) return percent(value);
  return null;
}

/** A law with no name or amount to tell: what it governs, and that it took effect. */
function rule(
  read: Reader,
  f: Record<string, string>,
  base: Facts,
): PrintedFacts | null {
  return story(
    "law-rule",
    { ...base, measure: read.fact(measureName(f.series ?? ""), f.lawId ?? "") },
    ["measure"],
  );
}

/** A law in force changing: a policy law, or an amount (a wage, a rate). */
const lawTookEffect: Builder = (read, f) => {
  const series = f.series ?? "";
  const ended = Number(f.value) === 0 || f.change === "ended";
  const federal = f.level === "federal";
  const state = f.level === "state";
  const place = federal ? null : read.place(state ? f.jurisdiction : undefined);
  const form = state || federal ? "act" : "ordinance";
  const base: Facts = {
    date: read.date(),
    ...(place ? { place: read.fact(place) } : {}),
    ...(federal ? { federal: read.yes() } : {}),
    // The bill that enacted it, as a clerk reads it: "HB 2", "Ordinance 2025-14".
    // A law another record adopted (`adopt:law:…`, `law:…`) has no bill number.
    ...(f.enactedBy && !f.enactedBy.includes(":")
      ? {
          designation: read.fact(
            spokenDesignation(f.enactedBy, form),
            f.lawId ?? "",
          ),
        }
      : {}),
  };
  if (f.unit && f.unit !== "program") {
    // An amount: the town's law in force the day before, and now.
    const was = lawInForce(
      read.api,
      series,
      addDays(makeIsoDate(read.story.date), -1),
    ).value;
    const now = lawInForce(read.api, series, read.story.date).value;
    const to = typeof now === "number" ? amount(f.unit, now) : null;
    const from = typeof was === "number" ? amount(f.unit, was) : null;
    if (!to || !from) return rule(read, f, base);
    return story(
      "law-amount",
      {
        ...base,
        measure: read.fact(measureName(series), f.lawId ?? ""),
        to: read.fact(to, f.lawId ?? ""),
        ...(from !== to
          ? { from: read.fact(from, f.lawId ?? ""), changed: read.yes() }
          : { same: read.yes() }),
        ...(Number(now) < Number(was) ? { down: read.yes() } : {}),
        ...(Number(now) > Number(was) ? { up: read.yes() } : {}),
      },
      ["measure", "to"],
    );
  }
  const named = billNameFor(series, form, ended);
  if (!named) return rule(read, f, base);
  return story(
    "law",
    {
      ...base,
      law: read.fact(named.title, f.lawId ?? ""),
      purpose: read.fact(named.purpose, f.lawId ?? ""),
      ...(ended ? { ended: read.yes() } : { effective: read.yes() }),
    },
    ["law"],
  );
};

/**
 * A law that took effect in the year before day one, told as the press tells a law
 * that takes effect in play: from the law's own row (its level, its amount, the bill
 * that enacted it) and the law in force the day before. Null when the row is gone.
 */
export function archivedLawFacts(
  core: CoreState,
  story: PrintedStory,
): PrintedFacts | null {
  const lawId = String(story.facts.lawId ?? "");
  const row = coreAPI(core)
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(lawId) as unknown as
    | {
        series: string;
        level: string;
        jurisdiction: string;
        value?: number;
        unit?: string;
        terms?: { enactedBy?: string };
      }
    | undefined;
  if (!row) return null;
  const read = new Reader(core, story, lawId, "law-took-effect", []);
  return lawTookEffect(read, {
    lawId,
    series: row.series,
    level: row.level,
    jurisdiction: row.jurisdiction,
    value: String(row.value ?? ""),
    unit: row.unit ?? "",
    ...(row.terms?.enactedBy ? { enactedBy: String(row.terms.enactedBy) } : {}),
  });
}

/** A floor vote on a bill: the count and whether it carried. */
const rollCall: Builder = (read, f) => {
  const yes = num(f.yes);
  const no = num(f.no);
  if (yes === undefined || no === undefined) return null;
  const body = read.body(f.chamber);
  return story(
    "roll-call",
    {
      ...read.billFacts(f.billId, f.number),
      count: read.fact(`${yes} to ${no}`),
      ...(body ? { body: read.fact(body, f.chamber ?? "") } : {}),
      [yes > no ? "passed" : "failed"]: read.yes(),
    },
    ["designation"],
  );
};

/** A committee's vote on a bill, or its holding the bill without one. */
const committee: Builder = (read, f) => {
  const yes = num(f.yes) ?? 0;
  const no = num(f.no) ?? 0;
  const held = read.kind === "bill-held-in-committee" || yes + no === 0;
  return story(
    "committee",
    {
      ...read.billFacts(f.billId, f.number),
      ...(f.committee ? { committee: read.fact(spaced(f.committee)) } : {}),
      ...(held
        ? { held: read.yes() }
        : {
            count: read.fact(`${yes} to ${no}`),
            [yes > no ? "passed" : "failed"]: read.yes(),
          }),
    },
    ["designation", "committee"],
  );
};

/**
 * A bill that failed, as its vote: on the floor it is the roll call; in
 * committee the record names no committee, so it is told by the tally alone.
 */
const billFailed: Builder = (read, f) => {
  if (f.stage !== "committee") return rollCall(read, f);
  const yes = num(f.yes);
  const no = num(f.no);
  return story(
    "committee",
    {
      ...read.billFacts(f.billId, f.number),
      ...(yes !== undefined && no !== undefined
        ? { count: read.fact(`${yes} to ${no}`) }
        : {}),
      failed: read.yes(),
    },
    ["designation"],
  );
};

/** A member's amendment to a bill. */
const amendment: Builder = (read, f) =>
  story(
    "amendment",
    { ...read.who(f.movedBy), ...read.billFacts(f.billId) },
    ["name", "designation"],
    f.movedBy,
  );

/** One member's own vote on a bill. */
const memberVote: Builder = (read, f) => {
  // The member is the record's subject, and the last part of its id.
  const id =
    read.first() ??
    read.sourceId.slice(`office.voted:${f.billId ?? ""}:`.length);
  return story(
    "member-vote",
    {
      ...read.who(id),
      ...read.billFacts(f.billId, f.number),
      ...(f.vote === "yes" || f.vote === "no" ? { [f.vote]: read.yes() } : {}),
    },
    ["name", "designation"],
    id,
  );
};

/** Lawmakers' vote to override a veto. */
const override: Builder = (read, f) =>
  story(
    "override",
    {
      ...read.billFacts(f.billId, f.number),
      [f.passed === "true" ? "passed" : "failed"]: read.yes(),
    },
    ["designation"],
  );

/** An executive signing or vetoing a bill. */
const signed: Builder = (read, f) => {
  const vetoed = f.action === "vetoed";
  return story(
    "signed",
    {
      ...read.who(f.executiveId),
      ...read.billFacts(f.billId, f.number),
      date: read.date(),
      // A veto fails the bill; a signature passes it into law.
      [vetoed ? "vetoed" : "signed"]: read.yes(),
      [vetoed ? "failed" : "passed"]: read.yes(),
    },
    ["name", "designation"],
    f.executiveId,
  );
};

/** Residents speaking for and against a bill at its hearing. */
const hearing: Builder = (read, f) => {
  const pro = num(f.for);
  const con = num(f.against);
  if (pro === undefined || con === undefined || pro + con === 0) return null;
  return story(
    "hearing",
    {
      ...read.billFacts(f.billId, f.number),
      number: read.fact(count(pro + con)),
      for: read.fact(count(pro)),
      against: read.fact(count(con)),
    },
    ["designation"],
  );
};

/** A government's public hearing on its budget bill, and how many spoke. */
const budgetHearing: Builder = (read, f) => {
  const speakers = num(f.speakers) ?? 0;
  return story(
    "hearing",
    {
      ...read.billFacts(f.billId, f.number),
      budget: read.yes(),
      ...(speakers ? { number: read.fact(count(speakers)) } : {}),
    },
    ["designation"],
  );
};

/** A bill put before a body. */
const introduced: Builder = (read, f) => {
  const bill = read.bill(f.billId);
  return story(
    "introduced",
    {
      ...read.billFacts(f.billId, f.number),
      ...read.who(bill?.sponsorId, "name", false),
    },
    ["designation"],
    bill?.sponsorId,
  );
};

/** A budget line a law changed. */
const budgetLine: Builder = (read, f) => {
  const delta = num(f.deltaMinor);
  // A line the names table lacks is said by its own key ("transit").
  const name = lineName(f.line ?? "") ?? (f.line ? spaced(f.line) : undefined);
  if (delta === undefined || !name || delta === 0) return null;
  const place = read.place(f.level === "state" ? f.governmentId : undefined);
  return story(
    "budget-line",
    {
      purpose: read.fact(name.toLowerCase()),
      money: read.fact(dollars(Math.abs(delta))),
      [delta < 0 ? "cut" : "added"]: read.yes(),
      ...(place ? { place: read.fact(place) } : {}),
    },
    ["purpose", "money"],
  );
};

/** A government's budget for the year, and its largest spending line when kept. */
const budgetAdopted: Builder = (read, f) =>
  budgetStory(
    read,
    read.sourceId.replace(/^budget-adopted:/, ""),
    f.governmentId ?? "",
    f,
  );

/** A government's name as the books keep it ("COUNTY OF LANDER") read as a paper prints it ("Lander County"). */
function governmentWords(name: string): string {
  if (name !== name.toUpperCase()) return name;
  const title = (words: string) =>
    words
      .toLowerCase()
      .replace(
        /(^|[\s-])([a-z])/g,
        (_, gap: string, letter: string) => gap + letter.toUpperCase(),
      );
  const county = /^COUNTY OF (.+)$/.exec(name);
  if (county) return `${title(county[1]!)} County`;
  return title(name).replace(/\b(Of|The|And)\b/g, (word) => word.toLowerCase());
}

/**
 * A government's budget as the paper tells it: where and which year, its
 * largest line, and the totals it plans to spend and take in, read from the
 * budget's own row (the record the press printed it from may keep only the
 * government and the year).
 */
function budgetStory(
  read: Reader,
  budgetId: string,
  governmentId: string,
  f: Record<string, string>,
): PrintedFacts | null {
  const budget = read.row<BudgetRow>(BUDGETS_MODULE_ID, "budgets", budgetId);
  const government = read.row<{ name: string }>(
    BUDGETS_MODULE_ID,
    "governments",
    governmentId,
  );
  const sum = (rows: Readonly<Record<string, number>>) =>
    Object.values(rows).reduce((a, b) => a + b, 0);
  const largest = budget
    ? Object.entries(budget.spendingMinor).sort(
        (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
      )[0]
    : undefined;
  const line = largest?.[0] ?? f.largestLine ?? "";
  const minor = largest?.[1] ?? num(f.largestLineMinor);
  const purpose = lineWords(line);
  const spending = budget ? sum(budget.spendingMinor) : num(f.spendingMinor);
  const revenue = budget ? sum(budget.revenueMinor) : num(f.revenueMinor);
  const federal = governmentId === "US";
  const place = federal
    ? null
    : (read.place(governmentId) ??
      (government ? governmentWords(government.name) : null));
  const year = f.fiscalYear ?? (budget ? String(budget.fiscalYear) : "");
  return story(
    "budget-adopted",
    {
      ...(minor !== undefined && purpose
        ? {
            money: read.fact(dollars(minor), governmentId),
            purpose: read.fact(purpose),
          }
        : {}),
      ...(spending && revenue
        ? {
            spending: read.fact(dollars(spending), budget?.id ?? governmentId),
            revenue: read.fact(dollars(revenue), budget?.id ?? governmentId),
          }
        : {}),
      ...(year ? { year: read.fact(year) } : {}),
      passed: read.yes(),
      ...(place ? { place: read.fact(place, governmentId) } : {}),
      // The nation's budget is Congress's, with no place of its own.
      ...(federal ? { federal: read.yes() } : {}),
    },
    [federal ? "federal" : "place"],
  );
}

/** A federal disaster declared for the town. */
const disaster: Builder = (read, f) => {
  const place = read.place();
  const homes = num(f.damagedHomes);
  return story(
    "hazard",
    {
      ...(place ? { place: read.fact(place) } : {}),
      ...(f.incidentType
        ? { incident: read.fact(f.incidentType.toLowerCase()) }
        : {}),
      ...(homes ? { number: read.fact(count(homes)) } : {}),
      date: read.date(),
    },
    ["place"],
  );
};

/** A state's monthly jobs report. */
const jobsReport: Builder = (read, f) => {
  const rate = num(f.unemploymentPct);
  const nation = num(f.nationUnemploymentPct);
  const state = f.state ? read.place(`US-${f.state}`) : null;
  if (rate === undefined || !state) return null;
  return story(
    "jobs-report",
    {
      // The rate is the state's: told under the area it measures, never a town.
      area: read.fact(state),
      percent: read.fact(percent(rate)),
      ...(nation !== undefined ? { nation: read.fact(percent(nation)) } : {}),
      ...(f.month
        ? { month: read.fact(MONTHS[Number(f.month.slice(5, 7)) - 1]!) }
        : {}),
    },
    ["area", "percent"],
  );
};

/** The measures a month's conditions story can tell of, each a flag the banks read. */
const CONDITIONS: Readonly<Record<string, string>> = {
  "labor.unemployment-pct": "unemployment",
  "crime.burglary": "burglary",
  "crime.robbery": "robbery",
  "crime.assault": "assault",
  "crime.vandalism": "vandalism",
};
/** What each measure is called when a second one moved with the first. */
const CONDITION_NOUNS: Readonly<Record<string, string>> = {
  "labor.unemployment-pct": "unemployment",
  "crime.burglary": "burglaries",
  "crime.robbery": "robberies",
  "crime.assault": "assaults",
  "crime.vandalism": "vandalism",
};
/** The town's month: the measure that moved most, and which way, then the next to move. */
const conditions: Builder = (read, f) => {
  const moved: { measure: string; now: number; was: number; move: number }[] =
    [];
  for (const measure of Object.keys(CONDITIONS)) {
    const now = num(f[`web:${measure}`]);
    const was = num(f[`web:${measure}:was`]);
    if (now === undefined || was === undefined || now === was) continue;
    moved.push({
      measure,
      now,
      was,
      move: Math.abs(now - was) / Math.max(Math.abs(was), 1),
    });
  }
  moved.sort((a, b) => b.move - a.move || a.measure.localeCompare(b.measure));
  const [best, next] = moved;
  if (!best) return null;
  const place = read.place();
  const record = f[`web:${best.measure}:record`] ?? f.webRecordId ?? "";
  // Who is out of work: the town's economic month the rate was taken from
  // (world-metrics writes it the day before the web's record).
  const month = read.row<{ id: string; unemployed: number }>(
    WORLD_METRICS_MODULE_ID,
    "months",
    `metrics:${read.townPlaceId()}:${addDays(makeIsoDate(read.happened || read.story.date), -1)}`,
  );
  const jobless =
    best.measure === "labor.unemployment-pct" && month && month.unemployed > 1
      ? month
      : undefined;
  return story(
    "conditions",
    {
      [CONDITIONS[best.measure]!]: read.fact("yes", record),
      [best.now > best.was ? "up" : "down"]: read.yes(),
      ...(best.measure === "labor.unemployment-pct"
        ? {
            percent: read.fact(percent(best.now), record),
            from: read.fact(percent(best.was), record),
          }
        : {}),
      ...(jobless
        ? { jobless: read.fact(count(jobless.unemployed), jobless.id) }
        : {}),
      ...(next
        ? {
            also: read.fact(
              CONDITION_NOUNS[next.measure]!,
              f[`web:${next.measure}:record`] ?? record,
            ),
            [next.now > next.was ? "also-up" : "also-down"]: read.yes(),
          }
        : {}),
      ...(place ? { place: read.fact(place) } : {}),
    },
    ["place"],
  );
};

/** The central bank's rate decision. */
const rateDecision: Builder = (read) => {
  const meetingId = read.sourceId.replace(/^event:/, "");
  const meeting = (read.core.modules.has(MACRO_MODULE_ID)
    ? read.api.moduleState(MACRO_MODULE_ID).table("meetings").get(meetingId)
    : undefined) as unknown as
    { fromRatePct: number; toRatePct: number } | undefined;
  if (!meeting) return null;
  const move = meeting.toRatePct - meeting.fromRatePct;
  return story(
    "rate",
    {
      percent: read.fact(percent(meeting.toRatePct), meetingId),
      ...(move !== 0
        ? { from: read.fact(percent(meeting.fromRatePct), meetingId) }
        : {}),
      [move > 0 ? "up" : move < 0 ? "down" : "held"]: read.yes(),
      date: read.date(),
    },
    ["percent"],
  );
};

/** An official's town hall. */
const townHall: Builder = (read, f) =>
  story(
    "town-hall",
    {
      ...read.who(f.hostId),
      ...(num(f.attendees)
        ? { number: read.fact(count(num(f.attendees)!)) }
        : {}),
      date: read.date(),
    },
    ["name"],
    f.hostId,
  );

/** A body's regular meeting. */
const publicMeeting: Builder = (read, f) => {
  const body = read.body(f.officeId);
  const items = num(f.items) ?? 0;
  // The members who sat (the record names them), and the first bill the
  // body took up, from the meeting's own row.
  const seated = read.people.filter((id) => read.name(id)).length;
  const meeting = read.row<{ takenUp: readonly string[] }>(
    OFFICE_DAY_MODULE_ID,
    "meetings",
    f.meetingId,
  );
  const taken = meeting?.takenUp[0];
  const bill = read.billFacts(taken);
  return story(
    "body-meeting",
    {
      ...(body ? { body: read.fact(body, f.officeId ?? "") } : {}),
      date: read.date(),
      ...(items > 0
        ? { number: read.fact(count(items)) }
        : { none: read.yes() }),
      ...(seated > 1 ? { members: read.fact(count(seated)) } : {}),
      ...(items > 0 && bill.purpose && bill.designation
        ? {
            designation: bill.designation,
            purpose: bill.purpose,
            ...(bill.law ? { law: bill.law } : {}),
          }
        : {}),
    },
    ["body"],
  );
};

/** A profile of one official or candidate. */
const profile: Builder = (read) => {
  const id = (read.story.topic ?? "").replace(/^person:/, "");
  const subject = read.name(id)
    ? id
    : read.sourceId.match(/(official:term:[^]*?:\d{4}-\d{2}-\d{2})/)?.[1];
  const named = read.who(subject);
  // The office, the party and the year they began: from the seat the town's
  // offices keep, else from the officials engine for a member of Congress or
  // a legislator elsewhere (a title and the state that sent them).
  const term = subject ? read.termOf(subject) : undefined;
  const away = subject && !named.office ? read.officialPost(subject) : null;
  const board =
    subject && !named.office && !away ? read.boardPost(subject) : null;
  const party = partyName(term?.party ?? away?.party ?? null);
  const since =
    term?.serviceStart ?? term?.startDate ?? away?.since ?? board?.since;
  return story(
    "profile",
    {
      ...named,
      ...(board ? { office: read.fact(board.office, subject ?? "") } : {}),
      ...(away
        ? {
            post: read.fact(away.post, subject ?? ""),
            place: read.fact(away.place, subject ?? ""),
          }
        : {}),
      // "The Republican Party" reads for a party that names itself so; an
      // independent is told as one, and any other label is left out.
      ...(party && /^(?:republican|democratic|libertarian|green)$/i.test(party)
        ? { party: read.fact(party, term?.id ?? subject ?? "") }
        : party && /^independent$/i.test(party)
          ? { independent: read.fact("yes", term?.id ?? subject ?? "") }
          : {}),
      ...(since
        ? { year: read.fact(since.slice(0, 4), term?.id ?? subject ?? "") }
        : {}),
    },
    ["name"],
    subject,
  );
};

/** A candidate's interview, printed from the platform they filed. */
const interview: Builder = (read, f) => {
  const key = Object.keys(f).find(
    (k) => k.startsWith("interview:") && k.endsWith(":candidate"),
  );
  const candidate = key ? f[key] : undefined;
  const topic = read.story.topic ?? "";
  return story(
    "interview",
    { ...read.who(candidate, "name", false), ...read.issue(topic) },
    ["name"],
    candidate,
  );
};

/** A reporter checking a candidate's interview answer against their record. */
const claimCheck: Builder = (read) => {
  const interviewId = read.sourceId.replace(/^claim:/, "").replace(/:\d+$/, "");
  const row = (read.core.modules.has(PRESS_MODULE_ID)
    ? read.api.moduleState(PRESS_MODULE_ID).table("interviews").get(interviewId)
    : undefined) as unknown as { candidateId?: string } | undefined;
  return story(
    "claim-check",
    {
      ...read.who(row?.candidateId, "name", false),
      ...read.issue(read.story.topic ?? ""),
    },
    ["name", "issue"],
    row?.candidateId,
  );
};

/** A race's debate. */
const debate: Builder = (read, f) => {
  const office = read.contestTitle(f.contestId);
  const outlet = read.outlet(f.outletId);
  const n = num(f.candidates);
  return story(
    "debate",
    {
      ...(office ? { office: read.fact(office, f.contestId ?? "") } : {}),
      ...(outlet ? { outlet: read.fact(outlet, f.outletId ?? "") } : {}),
      ...(n ? { number: read.fact(count(n)) } : {}),
      date: read.date(),
    },
    ["office"],
  );
};

/** A candidate filing for office. */
const filing: Builder = (read, f) => {
  const filer = f.filingId?.match(/:(person[^:]*(?::[^:]+)*)$/)?.[1];
  const id = read.name(filer) ? filer : read.first();
  return story(
    "filing",
    {
      ...read.who(id, "name", false),
      ...(f.office ? { office: read.fact(f.office, f.contestId ?? "") } : {}),
      ...(f.electionDate
        ? { when: read.fact(spokenDate(f.electionDate), f.contestId ?? "") }
        : {}),
    },
    ["name", "office"],
    id,
  );
};

/** A race's result: the winner and, when one is named, who they beat. */
const electionResult: Builder = (read, f) => {
  let totals: Record<string, number> = {};
  try {
    totals = JSON.parse(f.totals ?? "{}") as Record<string, number>;
  } catch {
    totals = {};
  }
  const rival = Object.entries(totals)
    .filter(([id]) => id !== f.winnerId && read.name(id))
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const cast = Object.values(totals).reduce((a, b) => a + b, 0);
  return story(
    "election",
    {
      ...read.who(f.winnerId, "name", false),
      ...read.who(rival, "opponent"),
      ...(f.office ? { office: read.fact(f.office, f.contestId ?? "") } : {}),
      won: read.yes(),
      ...voteFacts(
        read,
        num(f.winnerVotes) ?? totals[f.winnerId ?? ""],
        num(f.totalVotes) ?? (cast > 0 ? cast : undefined),
        f.contestId,
      ),
    },
    ["name"],
    f.winnerId,
  );
};

/** The winner's share of the vote and how many votes were cast, when the count is kept. */
function voteFacts(
  read: Reader,
  won: number | undefined,
  cast: number | undefined,
  cite: string | undefined,
): Facts {
  return won && cast && cast > 1 && won <= cast
    ? {
        percent: read.fact(percent((won / cast) * 100), cite ?? ""),
        number: read.fact(count(cast), cite ?? ""),
      }
    : {};
}

/** A party primary held for a race. */
const primary: Builder = (read, f) => {
  const office = read.contestTitle(f.contestId);
  return story(
    "primary",
    {
      ...(office ? { office: read.fact(office, f.contestId ?? "") } : {}),
      date: read.date(),
    },
    ["office"],
  );
};

/** A winner sworn in. */
const tookOffice: Builder = (read, f) => {
  const named = read.who(f.winnerId, "name", false);
  // A seat whose new holder this world knows by no name (another state's
  // sampled seat) is told by its title and its state: "A new State Senator
  // from Texas took the oath of office."
  const state = named.name ? null : read.place(f.seatId?.split(":")[1]);
  // Who held the seat before (the seat's last ended term, when it was
  // someone else), how the new holder came to it, and how the seat opened.
  const ended = read
    .query<TermRow>(OFFICES_MODULE_ID, "terms", "bySeatStatus", [
      f.seatId ?? "",
      "ended",
    ])
    .filter((term) => term.endDate && term.endDate <= read.happened)
    .sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""))[0];
  const before =
    ended &&
    ended.personId !== f.winnerId &&
    `${ended.identity.givenName} ${ended.identity.familyName}` !==
      named.name?.text
      ? `${ended.identity.givenName} ${ended.identity.familyName}`
      : null;
  const vacancy = read.row<VacancyRow>(
    OFFICES_MODULE_ID,
    "vacancies",
    f.vacancyId,
  );
  const by = appointerWords(/^appointed by (.+)$/i.exec(f.how ?? "")?.[1]);
  return story(
    "took-office",
    {
      ...named,
      ...(before ? { before: read.fact(before, ended!.id) } : {}),
      ...(by ? { by: read.fact(by, f.vacancyId ?? "") } : {}),
      ...(vacancy?.cause === "death"
        ? { died: read.fact("yes", vacancy.id) }
        : vacancy?.cause === "moved away"
          ? { moved: read.fact("yes", vacancy.id) }
          : {}),
      ...(f.office ? { office: read.fact(f.office, f.seatId ?? "") } : {}),
      ...(state && f.office
        ? {
            post: read.fact(f.office, f.seatId ?? ""),
            place: read.fact(state, f.seatId ?? ""),
          }
        : {}),
    },
    named.name ? ["name", "office"] : ["post", "place"],
    f.winnerId,
  );
};

/** A seat left empty, and why. */
const vacancy: Builder = (read, f) => {
  const office = read.officeTitle(f.officeId);
  // Another state's seat is told by its title and its state ("A U.S.
  // Senator from Minnesota"), never by a bare title a reader here would take
  // for their own.
  const elsewhere = office ? null : read.officeElsewhere(f.officeId);
  const holder = read.first();
  const cause = f.cause === "death" ? "died" : f.cause ? "left" : "";
  // How the seat is filled: the vacancy's own row keeps the rule that applied
  // (who appoints, the date of a special election).
  const row = read.row<VacancyRow>(
    OFFICES_MODULE_ID,
    "vacancies",
    read.sourceId.replace(/^seat-vacated:/, "vacancy:"),
  );
  const method = row?.rule.method;
  const by = appointerWords(row?.rule.appointedBy);
  const successor = appointerWords(row?.rule.successor);
  const election =
    row?.electionDate &&
    (method === "special-election" || method === "appointment-then-special")
      ? row.electionDate
      : undefined;
  return story(
    "vacancy",
    {
      ...read.who(holder, "name", false),
      ...(by &&
      (method === "appointment" || method === "appointment-then-special")
        ? {
            appointed: read.fact("yes", row?.id ?? ""),
            by: read.fact(by, row?.id ?? ""),
            ...(method === "appointment-then-special"
              ? { "then-special": read.yes() }
              : {}),
          }
        : {}),
      ...(method === "successor" && successor
        ? { successor: read.fact(successor, row?.id ?? "") }
        : {}),
      ...(method === "remains-vacant" ? { empty: read.yes() } : {}),
      ...(election
        ? { when: read.fact(spokenDate(election), row?.id ?? "") }
        : {}),
      ...(office ? { office: read.fact(office, f.officeId ?? "") } : {}),
      ...(elsewhere
        ? {
            post: read.fact(elsewhere.title, f.officeId ?? ""),
            place: read.fact(elsewhere.state, f.officeId ?? ""),
          }
        : {}),
      ...(cause ? { [cause]: read.yes() } : {}),
      ...(f.rule === "special-election" ? { special: read.yes() } : {}),
    },
    office ? ["office"] : ["post", "place"],
    holder,
  );
};

/**
 * A reporter's story exposing an official's act: a bribe the corruption
 * engine recorded them taking, or a vote to award a contract to a firm they
 * or their family own.
 */
const exposed: Builder = (read, f) => {
  const id = read.first();
  const acts = Object.values(f);
  const office = id ? read.officeOf(id) : null;
  return story(
    "exposed",
    {
      ...read.who(id, "name", false),
      ...(office ? { office: read.fact(office) } : {}),
      ...(acts.includes("bribe-taken") ? { bribe: read.yes() } : {}),
      ...(acts.includes("conflict-of-interest")
        ? { conflict: read.yes() }
        : {}),
    },
    ["name"],
    id,
  );
};

/**
 * A recorded bribe that someone who learned of it took to the press (the
 * corruption engine reports only bribes): told as the exposure it is.
 */
const scandalReported: Builder = (read, f) =>
  exposed(read, { ...f, crime: "bribe-taken" });

/** An appointment to a public post. */
const appointed: Builder = (read, f) => {
  const id = read.first();
  return story(
    "appointed",
    {
      ...read.who(id, "name", false),
      ...(f.post ? { post: read.fact(spaced(f.post)) } : {}),
      ...read.who(f.appointedBy, "by"),
    },
    ["name", "post"],
    id,
  );
};

/** A chamber choosing who leads it: its presiding post first, else any post filled. */
const chamber: Builder = (read, f) => {
  const officeId = read.sourceId.match(
    /^chamber-organized:(.+):\d{4}-\d{2}-\d{2}$/,
  )?.[1];
  const body = read.body(officeId);
  const posts = Object.entries(f).filter(
    ([post, holder]) => post !== "level" && read.name(holder),
  );
  const [post, holder] =
    posts.find(([key]) => /^(?:speaker|president)$/.test(key)) ??
    posts[0] ??
    [];
  // The party leaders chosen with the presiding officer.
  const leader = (key: string) =>
    f[key] && f[key] !== holder && read.name(f[key])
      ? { text: read.name(f[key])!, id: f[key]! }
      : null;
  const majority = leader("majority-leader");
  const minority = leader("minority-leader");
  return story(
    "chamber",
    {
      ...read.who(holder, "name", false),
      ...(majority ? { majority: read.fact(majority.text, majority.id) } : {}),
      ...(minority ? { minority: read.fact(minority.text, minority.id) } : {}),
      ...(post ? { post: read.fact(spaced(post)) } : {}),
      ...(post && /^(?:speaker|president)$/.test(post)
        ? { presides: read.yes() }
        : {}),
      ...(body ? { body: read.fact(body, officeId ?? "") } : {}),
    },
    ["name", "post"],
    holder,
  );
};

/** A probate court closing an estate. */
const estate: Builder = (read, f) =>
  story(
    "estate",
    { ...read.who(f.decedentId, "name", false), date: read.date() },
    ["name"],
    f.decedentId,
  );

/** A recall petition filed, or a recall's outcome. */
const recall: Builder = (read, f) => {
  const outcome = f.outcome;
  // The petition's count on its due day: how many signed and how many the
  // law required, and, where the member's answer moved it, how many fewer
  // signed than would have without it (the count's reasons cite the answer).
  const signed = num(f.signatures);
  const required = num(f.required);
  const before = num(f.before);
  const answers = (f.answerIds ?? "").split(" ").filter(Boolean);
  const moved =
    signed !== undefined && before !== undefined && before > signed
      ? before - signed
      : undefined;
  return story(
    read.kind === "recall-petition" ? "recall-petition" : "recall",
    {
      ...read.who(f.memberId),
      ...(outcome === "removed" || outcome === "kept" || outcome === "on-ballot"
        ? { [outcome]: read.yes() }
        : outcome === "failed"
          ? { short: read.yes() }
          : {}),
      ...(num(f.remove) !== undefined && num(f.keep) !== undefined
        ? {
            count: read.fact(
              `${count(num(f.keep)!)} to ${count(num(f.remove)!)}`,
            ),
          }
        : {}),
      ...(signed !== undefined && required !== undefined
        ? {
            signatures: read.fact(count(signed)),
            required: read.fact(count(required)),
          }
        : {}),
      ...(moved !== undefined && answers.length
        ? {
            "answer-moved": read.fact("yes", ...answers),
            fewer: read.fact(count(moved), ...answers),
          }
        : {}),
    },
    ["name"],
    f.memberId,
  );
};

/** A party choosing its chair. */
const partyChair: Builder = (read, f) => {
  const label = f.partyId?.split(":").at(-1);
  const party = label
    ? partyName(spaced(label).replace(/^./, (c) => c.toUpperCase()))
    : null;
  return story(
    "party-chair",
    {
      ...read.who(f.chosenId, "name", false),
      ...(party ? { party: read.fact(party, f.partyId ?? "") } : {}),
    },
    ["name", "party"],
    f.chosenId,
  );
};

/** A step in a criminal case: charged, held or released, convicted, sentenced. */
const court: Builder = (read, f) => {
  const id = read.first();
  const months = num(f.custodyMonths);
  const stage = read.kind.slice("justice.".length);
  const bail =
    stage === "bail-set" ||
    stage === "pretrial" ||
    stage === "held-before-trial";
  return story(
    bail ? "bail" : (stage as StoryKind),
    {
      ...read.who(id, "name", false),
      ...(f.offense ? { crime: read.fact(spaced(f.offense)) } : {}),
      ...(months ? { term: read.fact(`${count(months)} months`) } : {}),
      ...(bail
        ? /released/.test(f.decision ?? "")
          ? { released: read.yes() }
          : f.decision === "held"
            ? { held: read.yes() }
            : num(f.bailMinor)
              ? { money: read.fact(dollars(num(f.bailMinor)!)) }
              : {}
        : {}),
    },
    ["name"],
    id,
  );
};

/** An officeholder's act in office: a session attended, an order, an address, clemency. */
const officeAct: Builder = (read, f) => {
  const id = read.first();
  let choice: Record<string, unknown> = {};
  try {
    choice = JSON.parse(f.choice ?? "{}") as Record<string, unknown>;
  } catch {
    choice = {};
  }
  const flags: Record<string, boolean> = {
    [f.entry ?? "act"]: true,
    attended: choice.attend === true,
    missed: choice.attend === false,
    granted: choice.grant === true,
    denied: choice.grant === false,
    revoked: choice.revoke === true,
    issued: choice.kind === "order" && choice.revoke === false,
  };
  return story(
    "office-act",
    {
      ...read.who(id),
      ...Object.fromEntries(
        Object.entries(flags)
          .filter(([, on]) => on)
          .map(([key]) => [key, read.yes()]),
      ),
    },
    ["name"],
    id,
  );
};

/** A business's record: closed, cut staff, changed hands, opened. */
const business =
  (kind: StoryKind): Builder =>
  (read, f) => {
    const id =
      f.organizationId ??
      Object.keys(f)
        .find((k) => k.startsWith("organization:organization_"))
        ?.split(":")[1] ??
      read.story.topic ??
      "";
    const name = read.organization(id);
    const jobs = num(f.jobsLost);
    return story(
      kind,
      {
        ...(name ? { subject: read.fact(name, id) } : {}),
        ...(jobs ? { number: read.fact(count(jobs)) } : {}),
        year: read.fact(read.story.date.slice(0, 4)),
        ...businessExtras(read, kind, id, f),
      },
      ["subject"],
    );
  };

/** Why a business closed, as a flag the banks read, from the reason its books kept. */
function closingWhy(reason: string | undefined): string | null {
  if (reason === "owner-retiring") return "retiring";
  if (reason === "no-successor") return "no-successor";
  if (reason === "losses-kept") return "losses";
  return reason?.startsWith("finance.unfunded") ? "broke" : null;
}

/**
 * What else the books say of a business, by the kind of story: what it does,
 * how many still work there, who owns it now, how long it was open.
 */
function businessExtras(
  read: Reader,
  kind: StoryKind,
  id: string,
  f: Record<string, string>,
): Facts {
  const industry = read.industry(id);
  const extras: Facts = industry ? { industry: read.fact(industry, id) } : {};
  if (kind === "staff-cut") {
    // The staff the employer plans for after the cut, which its staffing
    // review kept on the record (the staff it has changes day to day).
    const planned = Math.round(num(f.targetStaff) ?? 0);
    if (planned > 1) extras.staff = read.fact(count(planned), id);
  }
  if (kind === "owner-changed") {
    const handover = read.row<{
      fromId: string;
      toId: string;
      cause: string;
    }>(BUSINESS_MODULE_ID, "successions", `succession:${id}:${read.happened}`);
    const owner = read.name(handover?.toId);
    const previous = read.name(handover?.fromId);
    if (handover && owner) extras.owner = read.fact(owner, handover.toId);
    if (handover && previous) {
      extras.previous = read.fact(previous, handover.fromId);
      if (handover.cause === "died") extras.died = read.yes();
    }
  }
  if (kind === "closing") {
    const founded =
      read.row<{ foundedAt: string }>(BUSINESS_MODULE_ID, "ages", id)
        ?.foundedAt ??
      read.row<{ date: string }>(BUSINESS_MODULE_ID, "foundings", id)?.date;
    const years = founded
      ? yearsBetween(founded, read.happened || read.story.date)
      : 0;
    if (years >= 2) extras.years = read.fact(count(years), id);
    // Why it closed, as the business's books recorded it, and who owned it.
    const why = closingWhy(
      read.core.finance.businesses.get(id)?.closingReasonKey,
    );
    if (why) extras[why] = read.yes();
    const owner = read.name(
      read.row<{ ownerId: string }>(
        BUSINESS_MODULE_ID,
        "closures",
        `closure:${id}`,
      )?.ownerId,
    );
    if (owner) extras.owner = read.fact(owner, id);
  }
  if (kind === "opening") {
    const staff = read.row<{ staff: number }>(
      BUSINESS_MODULE_ID,
      "foundings",
      id,
    )?.staff;
    if (staff && staff > 1) extras.staff = read.fact(count(staff), id);
  }
  return extras;
}

/**
 * A public employer's staffing that a law's budget changed (a school system
 * posting teaching jobs, or laying staff off): told as a layoff where it
 * laid people off, else as hiring.
 */
const staffing: Builder = (read, f) => {
  const name = read.organization(f.organizationId);
  const laidOff = num(f.laidOff) ?? 0;
  const posted = num(f.posted) ?? 0;
  const jobs = laidOff > 0 ? laidOff : posted;
  if (!(jobs > 0)) return null;
  return story(
    laidOff > 0 ? "staff-cut" : "hiring",
    {
      ...(name ? { subject: read.fact(name, f.organizationId ?? "") } : {}),
      number: read.fact(count(jobs), f.lawId ?? ""),
    },
    ["subject"],
  );
};

/** The clerk's check of a candidate's petition: on the ballot, or short of it. */
const petitionChecked: Builder = (read, f) => {
  const id = read.first();
  const valid = num(f.valid);
  const needed = num(f.needed);
  return story(
    "petition-check",
    {
      ...read.who(id, "name", false),
      ...(f.office ? { office: read.fact(f.office, f.contestId ?? "") } : {}),
      ...(f.status === "on-ballot" || f.status === "short"
        ? { [f.status]: read.yes() }
        : {}),
      ...(valid !== undefined && needed !== undefined
        ? {
            signatures: read.fact(count(valid), f.petitionId ?? ""),
            required: read.fact(count(needed), f.petitionId ?? ""),
          }
        : {}),
    },
    ["name", "office"],
    id,
  );
};

/** A budget line's name as a sentence says it ("public welfare"). */
const lineWords = (line: string) => {
  const name = lineName(line);
  return name ? name.charAt(0).toLowerCase() + name.slice(1) : undefined;
};

/** The President's budget request: the line it changes most, by its sign. */
const budgetRequest: Builder = (read, f) => {
  const id = read.first();
  const [line, delta] =
    Object.entries(f)
      .map(([key, value]) => [key, num(value)] as const)
      .filter(([key, value]) => lineWords(key) && value)
      .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))[0] ?? [];
  return story(
    "budget-request",
    {
      ...read.who(id, "name", false),
      ...(line && delta
        ? {
            purpose: read.fact(lineWords(line)!),
            [delta < 0 ? "cut" : "added"]: read.yes(),
          }
        : {}),
    },
    ["name"],
    id,
  );
};

/** The President's address to Congress: the stand it takes most firmly. */
const jointAddress: Builder = (read, f) => {
  const id = read.first();
  const [question, position] =
    Object.entries(f)
      .map(([key, value]) => [key, num(value)] as const)
      .filter(([key, value]) => POLICIES[key] && value)
      .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))[0] ?? [];
  return story(
    "joint-address",
    {
      ...read.who(id, "name", false),
      ...(question && position
        ? {
            purpose: read.fact(
              position > 0
                ? POLICIES[question]!.purpose
                : POLICIES[question]!.repealPurpose,
            ),
          }
        : {}),
    },
    ["name"],
    id,
  );
};

/** An official's trip to a town, and whether they met people there. */
const officialTrip: Builder = (read, f) => {
  const id = f.travelerId;
  const state = read.place(f.state);
  const town = f.town?.split(",")[0];
  return story(
    "trip",
    {
      ...read.who(id, "name", false),
      ...(town ? { place: read.fact(state ? `${town}, ${state}` : town) } : {}),
      ...(read.people.length > 1 ? { met: read.yes() } : {}),
    },
    ["name", "place"],
    id,
  );
};

/** A public works project finished: what it was for, who built it, what it cost. */
const ribbonCut: Builder = (read, f) => {
  const purpose = lineWords(f.line ?? "");
  const builder = read.organization(f.contractorId);
  const paid = num(f.paidMinor);
  return story(
    "ribbon-cut",
    {
      ...(purpose ? { purpose: read.fact(purpose, f.projectId ?? "") } : {}),
      ...(builder ? { subject: read.fact(builder, f.contractorId ?? "") } : {}),
      ...(paid ? { money: read.fact(dollars(paid)) } : {}),
    },
    ["purpose"],
  );
};

/** A governor's emergency declaration: the hazard, and the money moved. */
const emergency: Builder = (read, f) => {
  const id = read.first();
  const title = f.title ?? "";
  // A federal disaster title is kept in capitals ("SEVERE STORMS").
  const incident = title === title.toUpperCase() ? title.toLowerCase() : title;
  const moved = num(f.deltaMinor);
  return story(
    "emergency",
    {
      ...read.who(id, "name", false),
      ...(incident
        ? { incident: read.fact(incident, f.hazardRecordId ?? "") }
        : {}),
      ...(moved ? { money: read.fact(dollars(Math.abs(moved))) } : {}),
    },
    ["name"],
    id,
  );
};

/** Who took an office by the line of succession, and whether as acting. */
const succession: Builder = (read, f) => {
  const id = read.first();
  return story(
    "succession",
    {
      ...read.who(id, "name", false),
      ...(f.title ? { office: read.fact(f.title, f.seatId ?? "") } : {}),
      ...(f.acting === "true" ? { acting: read.yes() } : {}),
    },
    ["name", "office"],
    id,
  );
};

/** An official's answer to the people behind a recall petition. */
const recallReply: Builder = (read, f) =>
  story(
    "recall-reply",
    {
      ...read.who(f.memberId, "name", false),
      ...(f.answer === "answered" || f.answer === "dismissed"
        ? { [f.answer]: read.yes() }
        : {}),
    },
    ["name"],
    f.memberId,
  );

/** A ballot measure's count: approved or turned down, and the yes share. */
const measureResult: Builder = (read, f) => {
  const purpose = POLICIES[f.question ?? ""]?.purpose;
  const share = num(f.yesShare);
  const approved = f.approved === "true";
  return story(
    "measure-result",
    {
      ...(purpose ? { purpose: read.fact(purpose, f.measureId ?? "") } : {}),
      ...(share !== undefined
        ? { percent: read.fact(percent(share * 100)) }
        : {}),
      ...(approved
        ? { approved: read.yes(), passed: read.yes() }
        : { rejected: read.yes(), failed: read.yes() }),
    },
    ["purpose"],
  );
};

/** A bill sent to the executive's desk, and the day a decision is due. */
const presented: Builder = (read, f) =>
  story(
    "presented",
    {
      ...read.billFacts(f.billId, f.number),
      ...read.who(f.executiveId, "name", false),
      ...(f.signBy ? { date: read.fact(spokenDate(f.signBy)) } : {}),
    },
    ["designation", "name"],
    f.executiveId,
  );

/** An executive's line-item veto: how many items struck from which bill. */
const itemVeto: Builder = (read, f) => {
  const id = read.first();
  const items = (f.items ?? "").split(",").filter(Boolean).length;
  return story(
    "item-veto",
    {
      ...read.who(id, "name", false),
      ...read.billFacts(f.billId),
      ...(items ? { number: read.fact(count(items)) } : {}),
    },
    ["name", "designation"],
    id,
  );
};

/** A cause group's ad on a question: the group by its name, else by who formed it. */
const causeAd: Builder = (read, f) => {
  const name = read.organization(f.organizationId);
  const founder = f.organizationId?.match(
    /^organization:cause-group:([^:]+):/,
  )?.[1];
  // A group whose topic is no policy question is told by who paid.
  const facts = {
    ...(name ? { subject: read.fact(name, f.organizationId ?? "") } : {}),
    ...(name ? {} : read.who(founder, "name", false)),
    ...read.purpose(read.story.topic ?? ""),
  };
  return story("ad", facts, [facts.subject ? "subject" : "name"]);
};

/** What the project row says of homes finished: what kind, who built them, when work began, how many are below market. */
function builtExtras(
  read: Reader,
  f: Record<string, string>,
  units: number | undefined,
): Facts {
  const project = read.row<{
    id: string;
    kind: string;
    startedAt: string;
    builderId: string;
  }>(
    HOUSING_MODULE_ID,
    "projects",
    read.sourceId.replace(/^event:housing\.completed:/, ""),
  );
  const builder = read.organization(project?.builderId);
  const below = num(f.affordableUnits) ?? 0;
  const cite = project?.id ?? "";
  return {
    ...(project?.kind === "multi" && units && units > 1
      ? { apartments: read.fact("yes", cite) }
      : {}),
    ...(builder
      ? { subject: read.fact(builder, project?.builderId ?? "") }
      : {}),
    ...(project?.startedAt
      ? { began: read.fact(monthYear(project.startedAt), cite) }
      : {}),
    ...(units && below > 0 && below < units
      ? { affordable: read.fact(count(below), cite) }
      : {}),
    ...(units && units > 1 && below === units
      ? { "all-affordable": read.fact("yes", cite) }
      : {}),
  };
}

/** What the purchase row says of a home sold: the price, the down payment, the mortgage rate, and that the family had been renting. */
function saleExtras(read: Reader): Facts {
  const bought = /^event:housing\.purchase:(.+):(\d{4}-\d{2}-\d{2})$/.exec(
    read.sourceId,
  );
  const purchase = bought
    ? read.row<{
        id: string;
        priceMinor: number;
        downMinor: number;
        loanMinor: number;
        rate: number;
        rentBeforeMinor: number;
      }>(HOUSING_MODULE_ID, "purchases", `purchase:${bought[1]}:${bought[2]}`)
    : undefined;
  if (!purchase) return {};
  return {
    ...(purchase.priceMinor > 0
      ? { money: read.fact(dollars(purchase.priceMinor), purchase.id) }
      : {}),
    ...(purchase.downMinor > 0
      ? { down: read.fact(dollars(purchase.downMinor), purchase.id) }
      : {}),
    ...(purchase.loanMinor > 0 && purchase.rate > 0
      ? { percent: read.fact(percent(purchase.rate * 100), purchase.id) }
      : {}),
    ...(purchase.rentBeforeMinor > 0
      ? { renting: read.fact("yes", purchase.id) }
      : {}),
  };
}

/** A town's housing record: an eviction, a sale, homes built, a homeless count. */
const housing =
  (kind: StoryKind): Builder =>
  (read, f) => {
    const place = read.place();
    const family = read.first();
    const person = family
      ? read.core.people.get(family as EntityId)
      : undefined;
    const units = num(f.units);
    const homeless = num(f.homeless);
    return story(
      kind,
      {
        ...(place ? { place: read.fact(place) } : {}),
        date: read.date(),
        ...(kind === "home-sale" && person
          ? { family: read.fact(person.familyName, person.id) }
          : {}),
        ...(units ? { number: read.fact(count(units)) } : {}),
        ...(units && units > 1 ? { several: read.yes() } : {}),
        ...(homeless !== undefined
          ? { number: read.fact(count(homeless)) }
          : {}),
        ...(kind === "homes-built" ? builtExtras(read, f, units) : {}),
        ...(kind === "home-sale" ? saleExtras(read) : {}),
      },
      kind === "home-sale"
        ? ["family"]
        : kind === "eviction"
          ? ["place"]
          : ["number"],
    );
  };

/** A gift to a campaign, a public record: who gave how much, to whom. */
const campaignGift: Builder = (read, f) => {
  const amount = num(f.amountMinor);
  if (!amount) return null;
  // The race, what the campaign has raised in all, and the donor's own total.
  const office = read.contestTitle(f.contestId);
  const raised = num(f.raisedMinor);
  const given = num(f.totalMinor);
  return story(
    "campaign-gift",
    {
      ...read.who(f.donorId, "name", false),
      ...read.who(f.candidateId, "candidate", false),
      money: read.fact(dollars(amount)),
      ...(office ? { office: read.fact(office, f.contestId ?? "") } : {}),
      ...(raised && raised > amount
        ? { raised: read.fact(dollars(raised)) }
        : {}),
      ...(given && given > amount ? { total: read.fact(dollars(given)) } : {}),
    },
    ["name", "candidate", "money"],
  );
};

/** A birth in the town. */
const birth: Builder = (read, f) => {
  const town = read.residence(f.childId);
  return story(
    "birth",
    {
      ...read.who(f.childId, "name", false),
      ...read.who(f.motherId, "parent"),
      ...read.who(f.otherParentId, "other"),
      ...(town ? { place: read.fact(town, f.childId ?? "") } : {}),
      date: read.date(),
    },
    ["name", "parent"],
    f.childId,
  );
};

/** A death: who, the age they reached, and the town they lived in. */
const death: Builder = (read) => {
  const id = read.first();
  const person = id ? read.core.people.get(id as EntityId) : undefined;
  const town = read.residence(id);
  const age =
    person && read.happened
      ? yearsBetween(person.birthDate, read.happened)
      : undefined;
  return story(
    "death",
    {
      ...read.who(id, "name", false),
      date: read.date(),
      ...(age !== undefined && age > 0
        ? { age: read.fact(String(age), id ?? "") }
        : {}),
      ...(town ? { place: read.fact(town, id ?? "") } : {}),
    },
    ["name"],
    id,
  );
};

/** A member agreeing to carry a bill a citizen asked for (an ask turned down stays private). */
const carry: Builder = (read, f) => {
  if (f.carried !== "yes") return null;
  return story(
    "carry",
    {
      ...read.who(f.memberId),
      ...read.who(f.askerId, "asker", false),
      ...read.billFacts(f.billId, f.number),
    },
    ["name", "asker", "designation"],
    f.memberId,
  );
};

/** The crimes the victimization records name, each a flag the banks read. */
const CRIME_FLAGS: Readonly<Record<string, string>> = {
  burglary: "burglary",
  "other-property": "property",
  vandalism: "vandalism",
  robbery: "robbery",
  assault: "assault",
};
/** One victimization the town's records hold: what kind, where, which of the month's it was. */
const crime: Builder = (read) => {
  const hit =
    /^(?:event:)?crime\.victimized:([a-z-]+):[^:]+:\d{4}-\d{2}-\d{2}(?::\d+)?$/.exec(
      read.sourceId,
    );
  const flag = hit ? CRIME_FLAGS[hit[1]!] : undefined;
  const place = read.place();
  if (!hit || !flag || !place || !read.happened) return null;
  // Which one it was among the month's records of its kind, as the crime
  // engine listed them (a counted household's are tallied, not listed).
  const month = read.row<{
    id: string;
    victims: readonly { type: string; eventId: string }[];
    types: Record<string, { count: number }>;
  }>(
    CRIME_MODULE_ID,
    "months",
    `${read.townPlaceId()}:${read.happened.slice(0, 7)}`,
  );
  const same = month?.victims.filter((v) => v.type === hit[1]) ?? [];
  const at = same.findIndex(
    (v) => v.eventId === read.sourceId.replace(/^event:/, ""),
  );
  return story(
    "crime",
    {
      [flag]: read.yes(),
      place: read.fact(place),
      date: read.date(),
      ...(month && at >= 0
        ? { ordinal: read.fact(ordinal(at + 1), month.id) }
        : {}),
    },
    ["place"],
  );
};

/** The year's graduation: how many seniors there were and how many graduated. */
const graduation: Builder = (read) => {
  const year = /^graduation:(\d{4})$/.exec(read.sourceId)?.[1];
  const place = read.place();
  const row = read.row<{
    id: string;
    value: number;
    students: number;
    passed: number;
  }>(
    SCHOOL_MODULE_ID,
    "measures",
    `${read.townPlaceId()}:school.graduation-pct:${year}`,
  );
  if (!row || !place || row.students < 1) return null;
  const graduates = Math.round(row.passed);
  return story(
    "graduation",
    {
      place: read.fact(place),
      number: read.fact(count(row.students), row.id),
      ...(graduates > 0
        ? {
            graduates: read.fact(count(graduates), row.id),
            percent: read.fact(percent(row.value), row.id),
          }
        : { none: read.fact("yes", row.id) }),
    },
    ["place", "number"],
  );
};

/** The spring tests: how many tested students were proficient in math and in reading. */
const schoolTests: Builder = (read) => {
  const year = /^tests:(\d{4})$/.exec(read.sourceId)?.[1];
  const place = read.place();
  const measure = (name: string) =>
    read.row<{ id: string; value: number; students: number }>(
      SCHOOL_MODULE_ID,
      "measures",
      `${read.townPlaceId()}:school.${name}-proficient-pct:${year}`,
    );
  const math = measure("math");
  const reading = measure("reading");
  if (!place || !math || !reading || math.students < 1) return null;
  return story(
    "school-tests",
    {
      place: read.fact(place),
      number: read.fact(count(math.students), math.id),
      math: read.fact(percent(math.value), math.id),
      reading: read.fact(percent(reading.value), reading.id),
    },
    ["place", "math", "reading"],
  );
};

/** The president's address. */
const address: Builder = (read, f) => {
  const id = f["address:president"];
  return story(
    "address",
    {
      ...read.who(id, "name", false),
      ...(f["address:kind"] === "inaugural"
        ? { inaugural: read.yes() }
        : { "joint-session": read.yes() }),
      date: read.date(),
    },
    ["name"],
    id,
  );
};

/**
 * The stories the press archived from the year before day one, told from the
 * record each was kept from: the same facts the paper's stories in play are
 * told with, so an archived story has the body a printed one has.
 */
const ARCHIVED: Readonly<Record<string, Builder>> = {
  "election-result": (read, f) => {
    const office = read.officeTitle(f.officeId);
    return story(
      "election",
      {
        ...read.who(f.winnerId, "name", false),
        ...(office ? { office: read.fact(office, f.officeId ?? "") } : {}),
        won: read.yes(),
        ...voteFacts(read, num(f.winnerVotes), num(f.totalVotes), f.recordId),
      },
      ["name"],
      f.winnerId,
    );
  },
  "budget-adopted": (read, f) =>
    budgetStory(read, f.recordId ?? "", f.governmentId ?? "", f),
  "legislative-vote": (read, f) => {
    const yes = num(f.yes);
    const no = num(f.no);
    const body = read.body(f.body);
    ISSUES ??= policyNames();
    // The measure is told by what it is for ("protection of farmland from
    // development"), which reads after "approves"; the catalog's name is the
    // fallback.
    const measure =
      POLICIES[f.question ?? ""]?.purpose ?? ISSUES[f.question ?? ""];
    if (yes === undefined || no === undefined || !body || !measure) return null;
    const margin = Math.abs(yes - no);
    return story(
      "vote-or-law",
      {
        body: read.fact(body, f.body ?? ""),
        measure: read.fact(measure),
        count: read.fact(`${yes} to ${no}`),
        date: read.date(),
        [f.passed === "true" ? "passed" : "failed"]: read.yes(),
        ...(margin === 1
          ? { "one-vote": read.yes() }
          : margin > 1
            ? { margin: read.fact(count(margin)) }
            : {}),
      },
      ["body", "measure"],
    );
  },
  "business.closed": (read, f) => {
    const name = f.name;
    const workers = num(f.workers) ?? 0;
    const industry = industryWords(KIND_INDUSTRIES.get(f.kindId ?? ""));
    const why = closingWhy(f[`organization:${f.recordId}:closing-reason`]);
    const owner = read.name(f.ownerId);
    return story(
      "closing",
      {
        ...(name ? { subject: read.fact(name, f.recordId ?? "") } : {}),
        year: read.fact(read.story.date.slice(0, 4)),
        ...(industry
          ? { industry: read.fact(industry, f.recordId ?? "") }
          : {}),
        ...(workers > 1 ? { number: read.fact(count(workers)) } : {}),
        ...(why ? { [why]: read.yes() } : {}),
        ...(owner ? { owner: read.fact(owner, f.ownerId ?? "") } : {}),
      },
      ["subject"],
    );
  },
  // Reported once, to the survivor: the parent is named from the fact's own names.
  "parent-died": (read, f) => {
    const name = [f.givenName, f.familyName].filter(Boolean).join(" ");
    const survivor = read.name(f.survivorId);
    return story(
      "death",
      {
        ...(name ? { name: read.fact(name, f.survivorId ?? "") } : {}),
        date: read.date(),
        ...(survivor && f.relation
          ? {
              relation: read.fact(f.relation, f.survivorId ?? ""),
              survivor: read.fact(survivor, f.survivorId ?? ""),
            }
          : {}),
      },
      ["name"],
      f.survivorId,
    );
  },
};

/** The facts for a story archived from the year before day one, or null when its record can't be said. */
export function archivedFacts(
  core: CoreState,
  story: PrintedStory,
): PrintedFacts | null {
  const f: Record<string, string> = {};
  for (const [key, value] of Object.entries(story.facts))
    if (typeof value === "string") f[key] = value;
  const read = new Reader(
    core,
    story,
    f.recordId ?? "",
    f.recordKind ?? "",
    [],
    story.date,
  );
  return ARCHIVED[f.recordKind ?? ""]?.(read, f) ?? null;
}

const BUILDERS: Readonly<Record<string, Builder>> = {
  "law-took-effect": lawTookEffect,
  "legislative-vote": rollCall,
  "bill-vote": rollCall,
  "committee-hearing": committee,
  "bill-held-in-committee": committee,
  committee,
  "veto-override": override,
  "bill-amendment": amendment,
  "office.voted": memberVote,
  "justice.held-before-trial": court,
  "executive-action": signed,
  "public-comment": hearing,
  "budget-hearing": budgetHearing,
  "office.introduced": introduced,
  "budget-line-changed": budgetLine,
  "budget-adopted": budgetAdopted,
  "hazard.disaster": disaster,
  "economy.state-jobs-report": jobsReport,
  "outcome-web.month": conditions,
  "central-bank-rate-decision": rateDecision,
  meeting: rateDecision,
  "town-hall": townHall,
  "public-meeting": publicMeeting,
  "meeting-held": publicMeeting,
  profile,
  interview,
  claim: claimCheck,
  "claim-checked": claimCheck,
  debate,
  "candidate-filed": filing,
  "election-result": electionResult,
  "primary-result": primary,
  "took-office": tookOffice,
  "seat-vacated": vacancy,
  "press.exposed": exposed,
  "scandal.reported": scandalReported,
  "bill-failed": billFailed,
  "public-staffing-changed": staffing,
  "petition-checked": petitionChecked,
  "budget-request": budgetRequest,
  "joint-address": jointAddress,
  "official-trip": officialTrip,
  "ribbon-cut": ribbonCut,
  "emergency-declared": emergency,
  succession,
  "recall-answer": recallReply,
  "ballot-measure-result": measureResult,
  "bill-presented": presented,
  "item-veto": itemVeto,
  "campaign-gift": campaignGift,
  "official-appointed": appointed,
  appointed,
  "chamber-organized": chamber,
  "recall-petition": recall,
  "recall-outcome": recall,
  "party-chair-chosen": partyChair,
  "party-chair": partyChair,
  "justice.charged": court,
  "justice.bail-set": court,
  "justice.pretrial": court,
  "justice.convicted": court,
  "justice.imprisoned": court,
  "office-act": officeAct,
  "organization.closed": business("closing"),
  "business.closed": business("closing"),
  "employer-closed": business("closing"),
  "business.staff-reduced": business("staff-cut"),
  "organization.owner-changed": business("owner-changed"),
  "organization.founded": (read, f) => {
    // A business too new for its own name is told by who started it, and
    // what kind of business the founding record says it is.
    const kind = read.row<{ kindId: string }>(
      BUSINESS_MODULE_ID,
      "foundings",
      read.story.topic,
    )?.kindId;
    const industry = industryWords(KIND_INDUSTRIES.get(kind ?? ""));
    return (
      business("opening")(read, f) ??
      story(
        "founded",
        {
          ...read.who(read.first(), "name", false),
          date: read.date(),
          ...(read.place() ? { place: read.fact(read.place()!) } : {}),
          ...(industry
            ? { industry: read.fact(industry, read.story.topic ?? "") }
            : {}),
        },
        ["name"],
        read.first(),
      )
    );
  },
  "cause-group.ad-ran": causeAd,
  "cause-group.ad": causeAd,
  "housing.eviction": housing("eviction"),
  "housing.purchase": housing("home-sale"),
  "housing.completed": housing("homes-built"),
  "housing.homeless-count": housing("homeless-count"),
  "person-birth": birth,
  "life.death": death,
  "president.address": address,
  "estate.settled": estate,
  "carry-asked": carry,
  "crime.victimized": crime,
  graduation,
  tests: schoolTests,
};
