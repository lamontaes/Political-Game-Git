/**
 * Compiles `src/core2/data/elections/term-rules.json`: for every one of the 56
 * states and territories and every office kind the game seats, the six rules
 * that date its contests and terms (term length, stagger, which years hold the
 * election and on what day, the primary, the filing deadline, the day the
 * winner takes office), each with its tag and citation.
 *
 * Every value is read from a research file already in the repository; this
 * script only lines them up by place and office kind. Regenerate with
 * `node --import tsx scripts/research/compile-term-rules.ts`; `--check` fails
 * when the committed file differs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { resolveMunicipalElectionTiming } from "../../src/core2/gov-rules/municipal-ballot-rules";

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const OUT = "src/core2/data/elections/term-rules.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const stateOffices = read("data/research/offices/state-offices.json").places;
const nomination = read(
  "data/research/elections/party-nomination-rules-2026.json",
).places;
const filing = read("data/research/elections/filing-requirements.json").places;
const county = new Map<string, any>(
  read(
    "data/research/government/county-election-schedule-by-state.json",
  ).states.map((row: any) => [`US-${row.stateUsps}`, row]),
);
const takeOffice = read(
  "data/research/elections/take-office-rules.json",
).places;
const municipal = new Map<string, any>(
  read(
    "data/municipal-elections/92O-national-state-baseline.json",
  ).jurisdictions.map((row: any) => [`US-${row.usps}`, row]),
);

const TERRITORIES = new Set(["US-PR", "US-GU", "US-VI", "US-AS", "US-MP"]);
const NO_SENATE = new Set([...TERRITORIES, "US-DC"]);

export const KINDS = [
  "president",
  "us-senate",
  "us-house",
  "governor",
  "statewide-executive",
  "state-upper",
  "state-lower",
  "county-board",
  "county-executive",
  "county-row",
  "council",
  "mayor",
  "township-board",
] as const;

type Tag = "SOURCED" | "ESTIMATED";
interface Field {
  readonly tag: Tag;
  readonly citation: string;
  readonly [key: string]: unknown;
}

const sourced = (citation: string, rest: object): Field => ({
  ...rest,
  tag: "SOURCED",
  citation,
});
const estimated = (
  citation: string,
  rest: object,
  spread?: unknown,
): Field => ({
  ...rest,
  tag: "ESTIMATED",
  citation,
  ...(spread !== undefined ? { spread } : {}),
});

const GENERAL_DAY = sourced(
  "2 U.S.C. §7 and 3 U.S.C. §1: the Tuesday after the first Monday in November; state general elections share the day by each state's election code",
  { kind: "general-november" },
);
const NOT_APPLICABLE = (citation: string) => ({ applies: false, citation });

/** The primary and filing rules of a place's party nominations. */
function primaryAndFiling(state: string, partisan: boolean) {
  const place = nomination[state] ?? {};
  if (!partisan)
    return {
      primary: estimated(
        "Nonpartisan local office: no party primary; a runoff where the state's municipal law sets one",
        { kind: "none" },
      ),
      filing: estimated(
        "ESTIMATED FROM AVERAGE: median candidate filing lead before the election (FEC 2026 Congressional Primary Dates and Candidate Filing Deadlines for Ballot Access); the local deadline is not read",
        { kind: "lead-days-before-election" },
        { days: [30, 120] },
      ),
    };
  const rule = place.primary?.rule ?? null;
  const verified = place.primary?.verification === "read";
  const primary = rule
    ? (verified ? sourced : estimated)(
        `${place.primary.cite ?? ""} ${place.source ?? ""}`.trim(),
        {
          kind: "rule",
          rule,
          evenYearsOnly: place.primary.evenYearsOnly ?? false,
          readDates2026: place.primary.dates2026 ?? null,
          ruleText: place.primary.ruleText ?? null,
        },
      )
    : estimated(
        place.primary?.cite ??
          `No standing primary date rule read for ${place.name ?? state}; the 2026 date as set where read`,
        {
          kind: "read-dates-only",
          readDates2026: place.primary?.dates2026 ?? null,
        },
      );
  const days = place.filing?.daysBeforePrimary ?? null;
  const filingRead = /^read/.test(place.filing?.verification ?? "");
  const filingRule = days
    ? (filingRead ? sourced : estimated)(
        `${place.filing.cite}; the 2026 deadline is read, and other years keep its lead before the primary`,
        {
          kind: "days-before-primary",
          days,
          readDeadlines2026: place.filing.deadlines2026 ?? null,
        },
        ...(filingRead ? [] : [{ days: [days - 14, days + 14] }]),
      )
    : estimated(
        "ESTIMATED FROM AVERAGE: median candidate filing lead before the primary (FEC 2026 Congressional Primary Dates and Candidate Filing Deadlines for Ballot Access)",
        { kind: "lead-days-before-primary" },
        { days: [30, 120] },
      );
  return { primary, filing: filingRule };
}

/** A machine take-office field from a take-office research entry. */
function takeOfficeField(entry: any, what: string) {
  const text = `${entry.text ?? ""}${entry.citation ? ` (${entry.citation})` : ""}`;
  const basis =
    entry.verified === "secondary"
      ? `inferred from observed term starts, ${entry.source}`
      : "the researcher's reading of the state constitution or code, not checked against a fetched page (data/research/elections/take-office-rules.json)";
  return estimated(
    `${what}: ${text}; ${basis}`,
    {
      rule: entry.rule,
      yearAfterElection: entry.yearAfterElection,
      ...(entry.note ? { note: entry.note } : {}),
    },
    { days: [-14, 14] },
  );
}

const rows: any[] = [];
const push = (state: string, kind: string, row: object) =>
  rows.push({ id: `${state}:${kind}`, state, kind, ...row });

/** The year a family of state offices is next on the ballot after 2026. */
function offered(state: string, family: string): number {
  const row = filing[state]?.[family];
  if (row?.offeredIn2026 === false && row.nextRegularElection)
    return Number(row.nextRegularElection);
  return 2026;
}

function rowTag(row: any): Tag {
  return [
    row.termYears,
    row.stagger,
    row.cycle,
    row.electionDay,
    row.primary,
    row.filing,
    row.takeOffice,
  ].every((f) => f?.tag === "SOURCED")
    ? "SOURCED"
    : "ESTIMATED";
}

for (const state of Object.keys(nomination).sort()) {
  const territory = TERRITORIES.has(state);
  const party = primaryAndFiling(state, true);
  const place = stateOffices[state] ?? {};

  // Federal offices.
  push(
    state,
    "president",
    territory
      ? NOT_APPLICABLE(
          "U.S. Const. art. II, §1 and amend. XXIII: electors come from the states and the District of Columbia; a territory casts no electoral vote",
        )
      : {
          applies: true,
          termYears: sourced("U.S. Const. art. II, §1", { value: 4 }),
          stagger: sourced("U.S. Const. art. II, §1", { kind: "none" }),
          cycle: sourced("U.S. Const. art. II, §1; 3 U.S.C. §1", {
            kind: "every",
            years: 4,
            residue: 0,
          }),
          electionDay: GENERAL_DAY,
          ...party,
          takeOffice: sourced("U.S. Const. amend. XX, §1: noon on January 20", {
            rule: { kind: "fixed", month: 1, day: 20 },
            yearAfterElection: true,
          }),
        },
  );
  push(
    state,
    "us-senate",
    NO_SENATE.has(state)
      ? NOT_APPLICABLE(
          "U.S. Const. art. I, §3 and amend. XVII: two senators from each state; the District of Columbia and the territories elect none",
        )
      : {
          applies: true,
          termYears: sourced("U.S. Const. amend. XVII", { value: 6 }),
          stagger: sourced(
            "U.S. Const. art. I, §3, cl. 2: three classes, one up every second year (each seat's class read from data/research/offices/senate-classes-2026.json)",
            { kind: "senate-class" },
          ),
          cycle: sourced("2 U.S.C. §7", {
            kind: "every",
            years: 2,
            residue: 0,
          }),
          electionDay: GENERAL_DAY,
          ...party,
          takeOffice: sourced("U.S. Const. amend. XX, §1: noon on January 3", {
            rule: { kind: "fixed", month: 1, day: 3 },
            yearAfterElection: true,
          }),
        },
  );
  const commissioner = state === "US-PR";
  push(state, "us-house", {
    applies: true,
    termYears: sourced(
      commissioner
        ? "48 U.S.C. §891: the Resident Commissioner serves four years"
        : territory || state === "US-DC"
          ? "2 U.S.C. §25a; 48 U.S.C. §§1711, 1731, 1751: delegates serve two years"
          : "U.S. Const. art. I, §2",
      { value: commissioner ? 4 : 2 },
    ),
    stagger: sourced("U.S. Const. art. I, §2: the whole House each cycle", {
      kind: "none",
    }),
    cycle: sourced(commissioner ? "48 U.S.C. §891" : "2 U.S.C. §7", {
      kind: "every",
      years: commissioner ? 4 : 2,
      residue: 0,
    }),
    electionDay: GENERAL_DAY,
    ...party,
    takeOffice: sourced("U.S. Const. amend. XX, §1: noon on January 3", {
      rule: { kind: "fixed", month: 1, day: 3 },
      yearAfterElection: true,
    }),
  });

  // The governor (the District's mayor) and the other statewide offices.
  const executives: any[] = place.executives ?? [];
  const governor =
    executives.find((e) => e.key === "governor") ??
    executives.find((e) => e.key === "mayor");
  const take = takeOffice[state];
  if (governor) {
    const year = governor.nextRegularElectionYear ?? 2026;
    const cite = [governor.citation, governor.source].filter(Boolean).join(" ");
    const tagged =
      governor.estimate || governor.sourceRetrieved === false
        ? estimated
        : sourced;
    push(state, "governor", {
      applies: true,
      termYears: tagged(cite, { value: governor.termYears }),
      stagger: sourced(cite, { kind: "none" }),
      cycle: tagged(
        `${cite}; next regular election ${year} (data/research/offices/state-offices.json)`,
        {
          kind: "every",
          years: governor.termYears,
          residue: year % governor.termYears,
        },
      ),
      electionDay: GENERAL_DAY,
      ...party,
      takeOffice: takeOfficeField(take.governor, "Governor's term starts"),
    });
  } else
    push(
      state,
      "governor",
      NOT_APPLICABLE(
        "No elected chief executive in data/research/offices/state-offices.json",
      ),
    );
  const others = executives.filter((e) => e !== governor);
  if (others.length) {
    const terms = new Map<number, number>();
    for (const e of others)
      terms.set(e.termYears, (terms.get(e.termYears) ?? 0) + 1);
    const usual = [...terms.entries()].sort(
      (a, b) => b[1] - a[1] || a[0] - b[0],
    )[0]![0];
    push(state, "statewide-executive", {
      applies: true,
      offices: others.map((e) => e.key),
      termYears: (others.every((e) => !e.estimate) ? sourced : estimated)(
        "Each office's own term in data/research/offices/state-offices.json; the value is the most common among them",
        {
          value: usual,
          byOffice: Object.fromEntries(others.map((e) => [e.key, e.termYears])),
        },
      ),
      stagger: estimated(
        "Each office's own next regular election (data/research/offices/state-offices.json)",
        { kind: "by-office-record" },
      ),
      cycle: estimated(
        "Each office's own term and next regular election (data/research/offices/state-offices.json)",
        {
          kind: "office-record",
          byOffice: Object.fromEntries(
            others.map((e) => [e.key, e.nextRegularElectionYear ?? null]),
          ),
        },
      ),
      electionDay: GENERAL_DAY,
      ...party,
      takeOffice: {
        ...takeOfficeField(
          take.governor,
          "Statewide officers start with the governor's term",
        ),
        citation: `ESTIMATED: statewide officers are commonly sworn in with the governor. ${takeOfficeField(take.governor, "Governor's term starts").citation}`,
      },
    });
  } else
    push(
      state,
      "statewide-executive",
      NOT_APPLICABLE(
        "No other elected statewide office in data/research/offices/state-offices.json",
      ),
    );

  // The legislature: the upper chamber row covers a one-house legislature.
  const chambers: any[] = place.legislature?.chambers ?? [];
  const first = offered(state, "stateLegislative");
  const governorYear = offered(state, "statewideExecutive");
  for (const [kind, keys] of [
    ["state-upper", ["upper", "unicameral"]],
    ["state-lower", ["lower"]],
  ] as const) {
    const chamber = chambers.find((c) =>
      (keys as readonly string[]).includes(c.chamber),
    );
    if (!chamber) {
      push(
        state,
        kind,
        NOT_APPLICABLE(
          kind === "state-lower"
            ? "A one-house legislature (data/research/offices/state-offices.json)"
            : "No legislature read",
        ),
      );
      continue;
    }
    const cite = [chamber.source, chamber.termLimitSource]
      .filter(Boolean)
      .join(" ");
    const term = chamber.termYears ?? 2;
    const tagged =
      chamber.estimate || chamber.sourceRetrieved === false
        ? estimated
        : sourced;
    const cycle =
      term <= 2 || chamber.staggered
        ? { kind: "every", years: 2, residue: first % 2 }
        : {
            kind: "every",
            years: 4,
            residue:
              (first !== 2026 ? first : governorYear === 2026 ? 2026 : 2028) %
              4,
          };
    push(state, kind, {
      applies: true,
      chamber: chamber.chamber,
      termYears: tagged(cite, { value: term }),
      stagger: tagged(cite, {
        kind: term > 2 && chamber.staggered ? "halves" : "none",
        ...(term > 2 && chamber.staggered
          ? {
              note: "Half the seats each cycle, by district number (estimated per seat: SG-GOV-term-end-estimate)",
            }
          : {}),
      }),
      cycle: estimated(
        `${cite}; the first regular year from data/research/elections/filing-requirements.json (stateLegislative, statewideExecutive)`,
        cycle,
      ),
      electionDay: GENERAL_DAY,
      ...party,
      takeOffice: takeOfficeField(take.legislature, "Legislators' terms start"),
    });
  }

  // County offices: the state's county election law.
  const schedule = county.get(state);
  const body = schedule?.countyGovernment === "full" ? schedule.body : null;
  for (const kind of ["county-board", "county-executive", "county-row"]) {
    if (state === "US-PR") {
      // Puerto Rico's municipios are its county-level governments.
      const cite =
        "Puerto Rico Municipal Code (Act 107-2020): mayors and municipal legislators are elected at the general election every four years (the governor's cycle); the code's text was not read";
      push(state, kind, {
        applies: true,
        termYears: estimated(cite, { value: 4 }),
        stagger: estimated(cite, { kind: "none" }),
        cycle: estimated(
          `${cite}; next general election 2028 (data/research/offices/state-offices.json)`,
          {
            kind: "every",
            years: 4,
            residue: 0,
          },
        ),
        electionDay: estimated(cite, { kind: "general-november" }),
        ...party,
        takeOffice: estimated(
          `${cite}; the second Monday of January after the election, the commonly reported start of municipal terms`,
          {
            rule: { kind: "nth-weekday", month: 1, weekday: 1, nth: 2 },
            yearAfterElection: true,
          },
          { days: [-14, 14] },
        ),
      });
      continue;
    }
    if (!body && schedule) {
      // Where the state's county row holds no general county election (no
      // county government, or one with only some elected officers) but a
      // county office is seated, the office goes with the general election.
      const cite = `ESTIMATED: ${schedule.note ?? "no county governing-body election"} (${schedule.citation ?? "data/research/government/county-election-schedule-by-state.json"}); a county office seated here is elected at the general election in the governor's midterm cycle and starts January 1`;
      push(state, kind, {
        applies: true,
        termYears: estimated(cite, { value: 4 }, { years: [2, 4] }),
        stagger: estimated(cite, { kind: "none" }),
        cycle: estimated(cite, { kind: "every", years: 4, residue: 2 }),
        electionDay: estimated(cite, { kind: "general-november" }),
        ...party,
        takeOffice: estimated(
          cite,
          {
            rule: { kind: "fixed", month: 1, day: 1 },
            yearAfterElection: true,
          },
          { days: [0, 45] },
        ),
      });
      continue;
    }
    if (!body) {
      push(
        state,
        kind,
        NOT_APPLICABLE(
          territory || state === "US-DC"
            ? "No county governments (Census Bureau 2025 government-units listing)"
            : "No county row in data/research/government/county-election-schedule-by-state.json",
        ),
      );
      continue;
    }
    const cite = `${schedule.citation} ${schedule.sourceUrls.join(" ")}`;
    const tagged = schedule.status === "SOURCED" ? sourced : estimated;
    const own = kind === "county-board";
    const start = body.termStart;
    const startRule = !start
      ? null
      : start.daysAfterElection !== undefined
        ? { kind: "days-after-election", days: start.daysAfterElection }
        : start.weekday !== undefined
          ? {
              kind: "nth-weekday",
              month: start.month ?? 1,
              weekday: start.weekday,
              nth: start.ordinal ?? 1,
            }
          : { kind: "fixed", month: start.month ?? 1, day: start.day ?? 1 };
    const startTagged =
      schedule.status === "SOURCED" && !schedule.termStartEstimated && startRule
        ? sourced
        : estimated;
    const note = own
      ? ""
      : "ESTIMATED: elected on the county governing body's calendar (src/core2/offices-local.ts seats county executives and row officers with the board's term). ";
    push(state, kind, {
      applies: true,
      termYears: (own ? tagged : estimated)(`${note}${cite}`, {
        value: body.termYears,
      }),
      stagger: (own ? tagged : estimated)(`${note}${cite}`, {
        kind: own && body.stagger === "staggered" ? "county-calendar" : "none",
      }),
      cycle: (own ? tagged : estimated)(`${note}${cite}`, {
        kind: "county-calendar",
        cycleYears: body.cycleYears,
        residues: body.electionYearResidues,
      }),
      electionDay: (own ? tagged : estimated)(`${note}${cite}`, {
        kind: "county-rule",
        ...body.election,
      }),
      ...(body.partisan === "nonpartisan"
        ? primaryAndFiling(state, false)
        : party),
      takeOffice: startRule
        ? (own ? startTagged : estimated)(
            `${note}${cite}`,
            {
              rule: startRule,
              yearAfterElection:
                startRule.kind !== "days-after-election" &&
                (start.month ?? 1) < body.election.month,
            },
            startTagged === sourced && own ? undefined : { days: [-14, 14] },
          )
        : estimated(
            "ESTIMATED: no county term start read; January 1 after the election, the most common county rule in data/research/government/county-election-schedule-by-state.json (20 of 46 rows)",
            {
              rule: { kind: "fixed", month: 1, day: 1 },
              yearAfterElection: true,
            },
            { days: [0, 14] },
          ),
      localityOverride:
        "A county-specific calendar in data/research/government/county-election-calendar-profiles.json replaces the election day and term start for that county",
    });
  }

  // City, town and township offices: the state's municipal election law.
  const found = resolveMunicipalElectionTiming(state.slice(3), "");
  const law = municipal.get(state);
  for (const kind of ["council", "mayor", "township-board"]) {
    if (!found) {
      push(state, kind, {
        applies: true,
        termYears: estimated(
          "ESTIMATED FROM AVERAGE: ICMA 2018 Municipal Form of Government Survey, modal at-large council term (src/core2/gov-rules/typical-council-size.ts)",
          { value: 4 },
          { years: [2, 4] },
        ),
        stagger: estimated(
          "ESTIMATED: the seats of a body take turns (ICMA 2018: most councils stagger)",
          { kind: "office-calendar" },
        ),
        cycle: estimated(
          "No municipal election timing read for this place (src/core2/gov-rules/municipal-ballot-rules.ts); local seats go with the general election",
          { kind: "every", years: 2, residue: 0 },
        ),
        electionDay: estimated(
          "No municipal timing read; the general election day",
          { kind: "general-november" },
        ),
        ...primaryAndFiling(state, false),
        takeOffice: estimated(
          "ESTIMATED: the new council is seated at its first meeting of the year; January 1 after a November election, the common municipal default",
          {
            rule: { kind: "fixed", month: 1, day: 1 },
            yearAfterElection: true,
          },
          { days: [0, 14] },
        ),
      });
      continue;
    }
    const november = /november|autumn-gubernatorial|odd-year-autumn/.test(
      found.timing,
    );
    const cite = law
      ? `${law.electionTimingCitation} (${found.basis})`
      : `State municipal election law: ${found.timing} (${found.basis})`;
    const partisan = law
      ? !/nonpartisan_mandatory/.test(law.ballotStructure ?? "")
      : false;
    push(state, kind, {
      applies: true,
      termYears: estimated(
        "ESTIMATED FROM AVERAGE: ICMA 2018 Municipal Form of Government Survey, modal at-large council term; a town's own reading replaces it (src/core2/gov-rules/typical-council-size.ts)",
        { value: 4 },
        { years: [2, 4] },
      ),
      stagger: estimated(
        "ESTIMATED: the seats of a body take turns over the years the municipal calendar holds elections (ICMA 2018: most councils stagger)",
        { kind: "office-calendar" },
      ),
      cycle: (found.basis === "state-law-unverified" ? estimated : estimated)(
        cite,
        {
          kind: "municipal",
          timing: found.timing,
        },
      ),
      electionDay: estimated(cite, { kind: "municipal", timing: found.timing }),
      ...(partisan && kind !== "township-board"
        ? party
        : primaryAndFiling(state, false)),
      takeOffice: november
        ? estimated(
            "ESTIMATED: the new council is seated at its first meeting of the year; January 1 after a November election, the common municipal default (not read for this state)",
            {
              rule: { kind: "fixed", month: 1, day: 1 },
              yearAfterElection: true,
            },
            { days: [0, 14] },
          )
        : estimated(
            "ESTIMATED: the new council is seated at its first meeting after the canvass, about four weeks after a spring or summer municipal election (not read for this state)",
            {
              rule: { kind: "days-after-election", days: 28 },
              yearAfterElection: false,
            },
            { days: [7, 60] },
          ),
    });
  }
}

for (const row of rows) if (row.applies) row.tag = rowTag(row);

const file = {
  id: "term-rules",
  about:
    "When each office's contests and terms fall, per state or territory and office kind: term length, stagger, the years and day of the regular election, the primary, the filing deadline and the day the winner takes office. Each field carries SOURCED (with its citation) or ESTIMATED (with its basis and spread); a row is SOURCED only when every field is. 'county-row' covers the clerk, sheriff, treasurer and every other elected county row office. Read by src/core2/elections-calendar.ts.",
  compiledBy: "scripts/research/compile-term-rules.ts",
  dateRuleKinds:
    "fixed (month, day); nth-weekday (month, weekday 0 Sunday to 6 Saturday, nth, -1 the last); weekday-after (first weekday after the anchorNth anchorWeekday of month); weekday-after-date (first weekday after month/day); days-after-election",
  kinds: KINDS,
  rows,
};
const text = await format(JSON.stringify(file), { parser: "json" });
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== text) {
    console.error(`${OUT} is out of date; rerun the compiler.`);
    process.exit(1);
  }
} else writeFileSync(OUT, text);
const applies = rows.filter((r) => r.applies);
console.log(
  `${rows.length} rows (${applies.length} apply); SOURCED ${applies.filter((r) => r.tag === "SOURCED").length}, ESTIMATED ${applies.filter((r) => r.tag === "ESTIMATED").length}`,
);
