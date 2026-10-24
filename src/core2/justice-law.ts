/**
 * The justice engine's reads of the place's law and records: which office
 * prosecutes, how long a charge and a trial take, the sentence range for
 * bribery, whether a conviction forfeits an office, and how prominent an
 * official is. One reader for every place: each answer comes from data by
 * state, never from a named place.
 */
import sentencing from "../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import disposition from "../../data/research/justice/time-to-disposition-2026.json" with { type: "json" };
import prisonVoting from "../../data/research/justice/prison-voting-2026.json" with { type: "json" };
import rows from "./data/justice/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import type { CoreAPI, PersonId, Source } from "./types";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import type { OfficeInput } from "./offices-local";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A justice parameter, marking its stopgap when it carries one. */
export function justiceParameter(api: CoreAPI, key: string): number {
  const row = PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

export interface ProsecutorOffice {
  /** The office that prosecutes, or a stand-in id where the data names none. */
  readonly officeId: string;
  readonly level: "county" | "state";
  readonly termId: string | null;
  readonly personId: PersonId | null;
  readonly party: string | null;
  readonly source: Source;
}

const offices = (api: CoreAPI) =>
  api.moduleState(OFFICES_MODULE_ID).table("offices");
const terms = (api: CoreAPI) =>
  api.moduleState(OFFICES_MODULE_ID).table("terms");

function servingTerm(api: CoreAPI, officeId: string): TermRow | undefined {
  return (terms(api).rows() as unknown as TermRow[]).find(
    (t) => t.officeId === officeId && t.status === "serving",
  );
}

/**
 * The town's prosecutor: the county's elected prosecutor where the offices
 * data has one, else the state attorney general (elected, or appointed where
 * the state appoints; who prosecutes statewide in the states with no county
 * prosecutor).
 */
export function prosecutorFor(api: CoreAPI): ProsecutorOffice {
  const chain = lawChain(api);
  const date = api.state.date;
  const county = api.state.modules.has(OFFICES_MODULE_ID)
    ? ((
        offices(api).rows() as unknown as (OfficeInput & {
          coversTown?: boolean;
        })[]
      ).find((o) => o.kind === "county-prosecutor" && o.coversTown) ??
      undefined)
    : undefined;
  const general = api.state.modules.has(OFFICES_MODULE_ID)
    ? (offices(api).get(
        `office:${chain.stateKey}:attorney-general`,
      ) as unknown as OfficeInput | undefined)
    : undefined;
  const office = county ?? general;
  if (office) {
    const term = servingTerm(api, office.id);
    return {
      officeId: office.id,
      level: office === county ? "county" : "state",
      termId: term?.id ?? null,
      personId: term?.personId ?? null,
      party: term?.party ?? null,
      source: office.estimate
        ? {
            tag: "ESTIMATED",
            citation: office.source,
            asOf: date,
            estimatedFrom: office.source,
          }
        : { tag: "SOURCED", citation: office.source, asOf: date },
    };
  }
  throw new Error(
    `No prosecutor office covers ${chain.stateKey}: the offices data has neither a county prosecutor nor an attorney general.`,
  );
}

interface DispositionRow {
  readonly status: string;
  readonly resolveAfterDays?: number | null;
  readonly method?: string;
}
const DISPOSITION = disposition as unknown as {
  readonly measure: string;
  readonly chargeDecisionDays: { readonly days: number; readonly note: string };
  readonly nationalResolveAfterDays: {
    readonly days: number;
    readonly method: string;
  };
  readonly places: Readonly<Record<string, DispositionRow>>;
};

/** Days from referral to the charging decision: one labeled estimate for every place. */
export function chargeDecisionDays(api: CoreAPI): {
  days: number;
  source: Source;
} {
  return {
    days: DISPOSITION.chargeDecisionDays.days,
    source: {
      tag: "ESTIMATED",
      citation: `data/research/justice/time-to-disposition-2026.json: ${DISPOSITION.chargeDecisionDays.note}`,
      asOf: api.state.date,
      estimatedFrom: "time-to-disposition-2026 chargeDecisionDays",
    },
  };
}

/** Days from a felony filing to its disposition in the state, else the median of the sourced states. */
export function dispositionDays(
  api: CoreAPI,
  stateKey: string,
): { days: number; source: Source } {
  const row = DISPOSITION.places[stateKey];
  const date = api.state.date;
  if (row?.status === "sourced" && row.resolveAfterDays)
    return {
      days: row.resolveAfterDays,
      source: {
        tag: "SOURCED",
        citation: `data/research/justice/time-to-disposition-2026.json ${stateKey}: ${DISPOSITION.measure}`,
        asOf: date,
      },
    };
  return {
    days: DISPOSITION.nationalResolveAfterDays.days,
    source: {
      tag: "ESTIMATED",
      citation: `data/research/justice/time-to-disposition-2026.json: ${DISPOSITION.nationalResolveAfterDays.method}`,
      asOf: date,
      estimatedFrom: "time-to-disposition-2026 nationalResolveAfterDays",
    },
  };
}

interface RangeRow {
  readonly class?: string;
  readonly minMonths?: number;
  readonly maxMonths?: number | null;
  readonly maxLife?: boolean;
  readonly citation?: string;
  readonly basis?: string;
}
const SENTENCING = sentencing as unknown as {
  readonly places: Readonly<
    Record<
      string,
      {
        readonly basis: string;
        readonly classes: Readonly<Record<string, RangeRow>>;
        readonly offenses: Readonly<Record<string, RangeRow>>;
      }
    >
  >;
  readonly estimateAverages: Readonly<
    Record<string, { minMonths: number; maxMonths: number }>
  >;
};

/** The offense row bribery is sentenced on: each place's own bribery statute. */
const BRIBERY_OFFENSE = "crime:bribery";

/**
 * The first-offense sentence range, in months, for bribing or taking a bribe
 * as a public official in the state: the grade and range of the place's own
 * bribery statute, or, where that statute could not be read, the mean of the
 * places read (marked ESTIMATED FROM AVERAGE in the research).
 */
export function briberyRange(
  api: CoreAPI,
  stateKey: string,
): { minMonths: number; maxMonths: number; source: Source } {
  const place = SENTENCING.places[stateKey];
  const offense = place?.offenses[BRIBERY_OFFENSE];
  const resolved =
    offense?.class && place?.classes[offense.class]
      ? place.classes[offense.class]!
      : offense;
  const average = SENTENCING.estimateAverages[BRIBERY_OFFENSE]!;
  const minMonths = resolved?.minMonths ?? average.minMonths;
  // A life maximum is read as the averaged maximum.
  const maxMonths = resolved?.maxMonths ?? average.maxMonths;
  const read = offense?.basis === "SOURCED";
  // stopgapId: SG-GOV-justice-bribery-grade
  if (!read) api.stopgap("SG-GOV-justice-bribery-grade");
  return {
    minMonths,
    maxMonths: Math.max(minMonths, maxMonths),
    source: {
      tag: read ? "SOURCED" : "ESTIMATED",
      citation: `data/research/justice/sentencing-ranges-2026.json ${stateKey} ${BRIBERY_OFFENSE}${offense?.citation ? ` (${offense.citation})` : ""}`,
      asOf: api.state.date,
      ...(read ? {} : { estimatedFrom: "SG-GOV-justice-bribery-grade" }),
    },
  };
}

/**
 * Whether a felony conviction forfeits an elected or appointed office. Every
 * place is read as yes until each state's forfeiture law is read: most state
 * constitutions or codes vacate an office on a felony conviction (for
 * example 5 U.S.C. 7313 for federal employees; state rules vary on timing).
 */
export function convictionForfeitsOffice(
  api: CoreAPI,
  stateKey: string,
): { forfeits: boolean; source: Source } {
  // stopgapId: SG-GOV-justice-forfeiture-by-place
  api.stopgap("SG-GOV-justice-forfeiture-by-place");
  return {
    forfeits: true,
    source: {
      tag: "ESTIMATED",
      citation: `A felony conviction vacates the office in ${stateKey}, the common rule in state law, until the state's forfeiture rule is read.`,
      asOf: api.state.date,
      estimatedFrom: "SG-GOV-justice-forfeiture-by-place",
    },
  };
}

interface PrisonVotingRow {
  readonly incarceratedMayVote: boolean;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly basis?: string;
}
const PRISON_VOTING = prisonVoting as unknown as {
  readonly source: string;
  readonly places: Readonly<Record<string, PrisonVotingRow>>;
};

/**
 * Whether a person serving a felony prison sentence in the state may vote.
 * Maine, Vermont, the District of Columbia and Puerto Rico let them; the
 * other places do not (data/research/justice/prison-voting-2026.json).
 */
export function incarceratedMayVote(
  api: CoreAPI,
  stateKey: string,
): { may: boolean; source: Source } {
  const row = PRISON_VOTING.places[stateKey];
  // A place with no row takes the rule of the 48 states that bar the vote.
  const may = row?.incarceratedMayVote ?? false;
  return {
    may,
    source: {
      tag: row?.tag ?? "ESTIMATED",
      citation: row?.basis ?? PRISON_VOTING.source,
      asOf: api.state.date,
      ...(row?.tag === "SOURCED"
        ? {}
        : { estimatedFrom: row?.basis ?? "the common rule of the states" }),
    } as Source,
  };
}

/**
 * The share of a bribe's proceeds a conviction forfeits to the treasury.
 * Every place is read as all of it until each state's forfeiture law is read:
 * criminal forfeiture of the proceeds of a bribe is the rule in federal law
 * (18 U.S.C. 981(a)(1)(C) with 28 U.S.C. 2461(c)) and in most states'
 * codes; what a court may reach and when varies by state.
 */
export function bribeProceedsForfeited(
  api: CoreAPI,
  stateKey: string,
): { share: number; source: Source } {
  // stopgapId: SG-GOV-justice-forfeiture-by-place
  api.stopgap("SG-GOV-justice-forfeiture-by-place");
  return {
    share: 1,
    source: {
      tag: "ESTIMATED",
      citation: `A bribery conviction forfeits the proceeds of the bribe in ${stateKey} (18 U.S.C. 981(a)(1)(C), the common rule in state law), until the state's forfeiture rule is read.`,
      asOf: api.state.date,
      estimatedFrom: "SG-GOV-justice-forfeiture-by-place",
    },
  };
}

/** The offices a person serves in now. */
export function servingTermsOf(
  api: CoreAPI,
  personId: PersonId,
): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return (
    terms(api).query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((t) => t.status === "serving");
}

/** How much a case about this person is worth to a prosecutor, from the highest office they hold. */
export function prominenceOf(api: CoreAPI, personId: PersonId): number {
  const p = (key: string) => justiceParameter(api, key);
  let best = p("prominencePrivate");
  for (const term of servingTermsOf(api, personId)) {
    const office = offices(api).get(term.officeId) as unknown as
      OfficeInput | undefined;
    if (!office) continue;
    const level =
      office.level === "federal" ||
      (office.level === "state" && !office.kind.startsWith("legislature-"))
        ? p("prominenceStatewide")
        : office.level === "state"
          ? p("prominenceState")
          : office.level === "county"
            ? p("prominenceCounty")
            : p("prominenceTown");
    best = Math.max(best, level);
  }
  return best;
}

/** The party of the office a person serves in, if any. */
export function partyOf(api: CoreAPI, personId: PersonId): string | null {
  return servingTermsOf(api, personId).find((t) => t.party)?.party ?? null;
}
