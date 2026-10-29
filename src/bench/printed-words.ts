/**
 * What a story the press printed during play says, as facts for the English
 * engine. The press keeps the record it printed from (a law taking effect, a
 * vote, a charge); this reads that record and the records it names (the bill,
 * the person, the office, the law in force) and hands the English engine the
 * facts its news banks word. Every fact cites the printed story and the record
 * it came from. A record whose facts can't be said is left unworded here.
 */
import billNames from "../../data/english/bill-names.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate, spokenDate } from "../core2/kernel/dates";
import { partyName } from "../core2/appointments";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
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
} from "../core2/modules/offices";
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
  const read = new Reader(core, story, sourceId, kind, source?.personIds ?? []);
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
  date(): Fact {
    return this.fact(spokenDate(this.story.date));
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
const budgetAdopted: Builder = (read, f) => {
  const minor = num(f.largestLineMinor);
  const name = lineName(f.largestLine ?? "");
  const place = read.place(f.governmentId);
  return story(
    "budget-adopted",
    {
      ...(minor !== undefined && name
        ? {
            money: read.fact(dollars(minor), f.governmentId ?? ""),
            purpose: read.fact(name.toLowerCase()),
          }
        : {}),
      ...(f.fiscalYear ? { year: read.fact(f.fiscalYear) } : {}),
      passed: read.yes(),
      ...(place ? { place: read.fact(place) } : {}),
      // The nation's budget is Congress's, with no place of its own.
      ...(f.governmentId === "US" ? { federal: read.yes() } : {}),
    },
    [f.governmentId === "US" ? "federal" : "place"],
  );
};

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
/** The town's month: the measure that moved most, and which way. */
const conditions: Builder = (read, f) => {
  let best: { measure: string; now: number; was: number; move: number } | null =
    null;
  for (const [measure, flag] of Object.entries(CONDITIONS)) {
    const now = num(f[`web:${measure}`]);
    const was = num(f[`web:${measure}:was`]);
    if (now === undefined || was === undefined || now === was || !flag)
      continue;
    const move = Math.abs(now - was) / Math.max(Math.abs(was), 1);
    if (!best || move > best.move) best = { measure, now, was, move };
  }
  if (!best) return null;
  const place = read.place();
  const record = f[`web:${best.measure}:record`] ?? f.webRecordId ?? "";
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
  return story(
    "body-meeting",
    {
      ...(body ? { body: read.fact(body, f.officeId ?? "") } : {}),
      date: read.date(),
      ...(items > 0
        ? { number: read.fact(count(items)) }
        : { none: read.yes() }),
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
  return story("profile", read.who(subject), ["name"], subject);
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
  // Nobody filed: the count names no winner and no votes.
  if (!f.winnerId && !Object.keys(totals).length)
    return story(
      "unfilled",
      f.office ? { office: read.fact(f.office, f.contestId ?? "") } : {},
      ["office"],
      f.contestId,
    );
  const rival = Object.entries(totals)
    .filter(([id]) => id !== f.winnerId && read.name(id))
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  return story(
    "election",
    {
      ...read.who(f.winnerId, "name", false),
      ...read.who(rival, "opponent"),
      ...(f.office ? { office: read.fact(f.office, f.contestId ?? "") } : {}),
      won: read.yes(),
    },
    ["name"],
    f.winnerId,
  );
};

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
  return story(
    "took-office",
    {
      ...named,
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
  return story(
    "vacancy",
    {
      ...read.who(holder, "name", false),
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
  return story(
    "chamber",
    {
      ...read.who(holder, "name", false),
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
      },
      ["subject"],
    );
  };

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
  return story(
    "campaign-gift",
    {
      ...read.who(f.donorId, "name", false),
      ...read.who(f.candidateId, "candidate", false),
      money: read.fact(dollars(amount)),
    },
    ["name", "candidate", "money"],
  );
};

/** A birth in the town. */
const birth: Builder = (read, f) =>
  story(
    "birth",
    {
      ...read.who(f.childId, "name", false),
      ...read.who(f.motherId, "parent"),
      ...read.who(f.otherParentId, "other"),
      date: read.date(),
    },
    ["name", "parent"],
    f.childId,
  );

/** A death. */
const death: Builder = (read) => {
  const id = read.first();
  return story(
    "death",
    { ...read.who(id, "name", false), date: read.date() },
    ["name"],
    id,
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
  "organization.founded": (read, f) =>
    business("opening")(read, f) ??
    // A business too new for its own name is told by who started it.
    story(
      "founded",
      {
        ...read.who(read.first(), "name", false),
        date: read.date(),
        ...(read.place() ? { place: read.fact(read.place()!) } : {}),
      },
      ["name"],
      read.first(),
    ),
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
};
