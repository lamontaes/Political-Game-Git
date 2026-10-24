/**
 * Checks the legislature research tables of Oct 23, 2026 against the tables
 * the engines read today, and reports where a chamber's own rule differs from
 * the stand-in the engine uses. Exit 1 on any mismatch.
 *
 * - data/research/gov/chamber-committee-appointment-2026.json: who appoints
 *   each chamber's standing committees. One row per chamber row of
 *   chamber-leadership.json (Congress aside); a SOURCED row quotes the
 *   chamber's rule; an ESTIMATED row must equal its template's default, so a
 *   stand-in never drifts from the table it names.
 * - data/research/gov/local-ordinance-style-2026.json: the enacting clause
 *   and numbering state law gives a town's or county's ordinances, all 56
 *   places; an ESTIMATED row must equal bill-forms.json's national default.
 *   A clause that quotes a statute also names the kinds of place it covers
 *   (`kinds`: city, town, village, county), and the quote must support that
 *   scope: a clause that names a city's council cannot be scoped to villages,
 *   and a village clause must name the village's own board.
 * - data/research/gov/local-executive-introduction-2026.json: how a mayor or
 *   county executive brings a bill of their own, all 56 places; an ESTIMATED
 *   county row must follow from county-governing-bodies.json, and an
 *   ESTIMATED mayor row from executive-proposal.json.
 *
 *   node --import tsx scripts/research/legislature-local-rules-check.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

export const COMMITTEE_APPOINTMENT_PATH =
  "data/research/gov/chamber-committee-appointment-2026.json";
const LEADERSHIP_PATH = "data/research/legislature/chamber-leadership.json";
export const ORDINANCE_STYLE_PATH =
  "data/research/gov/local-ordinance-style-2026.json";
export const EXECUTIVE_INTRODUCTION_PATH =
  "data/research/gov/local-executive-introduction-2026.json";
const BILL_FORMS_PATH = "src/core2/data/legislature/bill-forms.json";
const EXECUTIVE_PROPOSAL_PATH =
  "src/core2/data/legislature/executive-proposal.json";
const COUNTY_BODIES_PATH =
  "data/research/local-government/county-governing-bodies.json";

/** The 56 places: 50 states, D.C. and the five inhabited territories. */
const PLACES = [
  ..."AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
  "DC",
  "PR",
  "GU",
  "VI",
  "AS",
  "MP",
];

const errors: string[] = [];
const fail = (message: string) => errors.push(message);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const APPOINTERS = new Set([
  "speaker",
  "senate-president",
  "president-pro-tempore",
  "majority-leader",
  "party-caucuses",
  "committee-on-committees",
  "chamber-election",
  "seniority",
  "council-chair",
  "committee-chair",
  "council-president",
  "presiding-officer",
]);
/** Chairs may also be chosen by a vote of the chamber, the council or the majority caucus. */
const CHAIR_PICKERS = new Set([
  ...APPOINTERS,
  "chamber-vote",
  "council-vote",
  "majority-caucus",
]);
const MINORITY = new Set([
  "minority-leader",
  "minority-leader-nominates",
  "minority-leader-approves",
]);

interface LeadershipData {
  readonly tables: Record<string, readonly { id: string; value: unknown }[]>;
  readonly rows: readonly {
    jurisdictionKey: string;
    chamberKey: string;
    templateId: string;
  }[];
}
interface AppointmentRow {
  readonly jurisdictionKey?: unknown;
  readonly chamberKey?: unknown;
  readonly templateId?: unknown;
  readonly membersAppointedBy?: unknown;
  readonly minorityMembersBy?: unknown;
  readonly chairsAppointedBy?: unknown;
  readonly tag?: unknown;
  readonly rule?: unknown;
  readonly sourceUrl?: unknown;
  readonly quote?: unknown;
  readonly estimatedFrom?: unknown;
}

/** The engine's stand-in: what leadership.ts reads for each chamber template. */
function templateDefaults(lead: LeadershipData): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of lead.tables.assignmentAuthority ?? [])
    out.set(row.id.split(":")[0]!, String(row.value));
  return out;
}

/** How leadership.ts `assigner()` treats an appointer: the presiding officer, or the majority leader. */
const engineSide = (appointer: string) =>
  /^(speaker|senate-president|president-pro-tempore|council-president|council-chair|presiding-officer)$/.test(
    appointer,
  )
    ? "presiding officer"
    : "majority leader or a panel";

function checkCommittees(): void {
  const lead = read(LEADERSHIP_PATH) as LeadershipData;
  const data = read(COMMITTEE_APPOINTMENT_PATH) as {
    readonly retrievedOn?: unknown;
    readonly rows?: readonly AppointmentRow[];
  };
  const defaults = templateDefaults(lead);
  if (data.retrievedOn !== "2026-10-23") fail("committees: retrievedOn");
  const expected = new Map(
    lead.rows
      .filter((r) => r.jurisdictionKey !== "US")
      .map((r) => [`${r.jurisdictionKey}:${r.chamberKey}`, r.templateId]),
  );
  const seen = new Set<string>();
  let sourced = 0;
  const differs: string[] = [];
  for (const row of data.rows ?? []) {
    const key = `${String(row.jurisdictionKey)}:${String(row.chamberKey)}`;
    const where = `committees ${key}`;
    if (seen.has(key)) fail(`${where}: listed twice`);
    seen.add(key);
    const template = expected.get(key);
    if (!template) {
      fail(`${where}: no such chamber in ${LEADERSHIP_PATH}`);
      continue;
    }
    if (row.templateId !== template)
      fail(`${where}: templateId ${String(row.templateId)}, not ${template}`);
    const by = String(row.membersAppointedBy);
    if (!APPOINTERS.has(by)) fail(`${where}: appointer ${by}`);
    if (
      row.chairsAppointedBy !== null &&
      row.chairsAppointedBy !== undefined &&
      !CHAIR_PICKERS.has(String(row.chairsAppointedBy))
    )
      fail(`${where}: chair appointer ${String(row.chairsAppointedBy)}`);
    if (
      row.minorityMembersBy !== undefined &&
      !MINORITY.has(String(row.minorityMembersBy))
    )
      fail(`${where}: minority appointer ${String(row.minorityMembersBy)}`);
    if (row.tag === "SOURCED") {
      sourced += 1;
      if (!text(row.rule) || !text(row.quote))
        fail(`${where}: SOURCED without its rule and quote`);
      if (!text(row.sourceUrl) || !row.sourceUrl.startsWith("https://"))
        fail(`${where}: SOURCED without an https sourceUrl`);
      if (engineSide(by) !== engineSide(defaults.get(template) ?? ""))
        differs.push(
          `${key} (${by}; the engine uses ${defaults.get(template)})`,
        );
    } else if (row.tag === "ESTIMATED") {
      if (!text(row.estimatedFrom))
        fail(`${where}: ESTIMATED without estimatedFrom`);
      if (by !== defaults.get(template))
        fail(
          `${where}: ESTIMATED ${by} is not the ${template} default ${defaults.get(template)}`,
        );
    } else fail(`${where}: tag ${String(row.tag)}`);
  }
  for (const key of expected.keys())
    if (!seen.has(key)) fail(`committees ${key}: missing`);
  console.log(
    `committees: ${seen.size} chambers, ${sourced} from their own rule; ${differs.length} seat committees through a different hand than the engine's stand-in:`,
  );
  for (const line of differs) console.log(`  ${line}`);
}

interface SourcedRow {
  readonly tag?: unknown;
  readonly statute?: unknown;
  readonly sourceUrl?: unknown;
  readonly quote?: unknown;
  readonly estimatedFrom?: unknown;
}

/** A SOURCED row names its statute and URL and quotes it; an ESTIMATED row says what it stands in for. */
function checkSourced(where: string, row: SourcedRow): boolean {
  if (row.tag === "SOURCED") {
    if (!text(row.statute) || !text(row.quote))
      fail(`${where}: SOURCED without its statute and quote`);
    if (!text(row.sourceUrl) || !row.sourceUrl.startsWith("https://"))
      fail(`${where}: SOURCED without an https sourceUrl`);
    return true;
  }
  if (row.tag !== "ESTIMATED") fail(`${where}: tag ${String(row.tag)}`);
  else if (!text(row.estimatedFrom))
    fail(`${where}: ESTIMATED without estimatedFrom`);
  return false;
}

/** The clause's fixed words (its blanks aside) must appear in the statute it quotes. */
const fixedWords = (clause: string) =>
  clause
    .split(/\{[a-z]+\}/)
    .map((part) =>
      part
        .replace(/[^A-Za-z ]/g, " ")
        .trim()
        .toLowerCase(),
    )
    .filter((part) => part.length > 0);

/**
 * A quoted statute may give the shared lead once and then a form for each
 * kind of place, joined by "or" ("Be it ordained by the mayor and city
 * council of the city of ..., or the chairperson and board of trustees of the
 * village of ..."). The clause's words are in the quote when they are one
 * stretch of it, or the lead of the quote followed by one of its "or" forms.
 */
function wordsInQuote(words: string, squeezed: string): boolean {
  const wanted = words.replace(/\s+/g, " ");
  if (squeezed.includes(wanted)) return true;
  const parts = wanted.split(" ");
  for (let i = 3; i < parts.length; i += 1) {
    const lead = parts.slice(0, i).join(" ");
    const form = ` or ${parts.slice(i).join(" ")}`;
    const at = squeezed.indexOf(lead);
    if (at >= 0 && squeezed.indexOf(form, at + lead.length) >= 0) return true;
  }
  return false;
}

/** The kinds of place an enacting clause can cover; a county's own clause covers counties only. */
const PLACE_KINDS = ["city", "town", "village", "county"] as const;
const KIND_WORDS: Record<string, string> = {
  city: "city",
  cities: "city",
  town: "town",
  towns: "town",
  village: "village",
  villages: "village",
  county: "county",
  counties: "county",
};
/** The kinds of place a piece of text names ("city council" and "cities" both name the city). */
const kindsNamed = (value: string): Set<string> =>
  new Set(
    (value.toLowerCase().match(/[a-z]+/g) ?? [])
      .map((word) => KIND_WORDS[word])
      .filter((kind): kind is string => kind !== undefined),
  );
/** A quote that speaks of the whole class ("each local government") does not list its kinds. */
const WHOLE_CLASS = /local government|municipal corporation|municipality/;

/**
 * A clause that quotes a statute covers exactly the kinds of place its quote
 * gives those words. Three ways it can be wrong, each a failure: the clause
 * names one kind of place ("mayor and city council of the city of") and is
 * scoped to another, the appliesTo note and the kinds disagree, or the clause
 * leaves the kind to a blank ("of the {kind} of") or says nothing about it and
 * the quote never mentions a kind it is scoped to.
 */
function checkScope(
  where: string,
  level: "municipal" | "county",
  entry: {
    clause: string;
    kinds?: readonly string[];
    appliesTo?: string;
    quote: string;
  },
): void {
  const { kinds } = entry;
  if (
    !Array.isArray(kinds) ||
    kinds.length === 0 ||
    new Set(kinds).size !== kinds.length ||
    kinds.some((kind) => !(PLACE_KINDS as readonly string[]).includes(kind))
  ) {
    fail(
      `${where}: kinds must list the kinds of place (${PLACE_KINDS.join(", ")}) the clause covers`,
    );
    return;
  }
  const scope = new Set(kinds);
  if (level === "county" && (scope.size !== 1 || !scope.has("county")))
    fail(`${where}: a county clause covers counties only`);
  if (level === "municipal" && scope.has("county"))
    fail(`${where}: a municipal clause cannot cover counties`);
  const listed = (set: ReadonlySet<string>) => [...set].sort().join(", ");
  const note = kindsNamed(entry.appliesTo ?? "");
  if (note.size > 0 && listed(note) !== listed(scope))
    fail(
      `${where}: appliesTo names ${listed(note)} but kinds is ${listed(scope)}`,
    );
  const named = kindsNamed(fixedWords(entry.clause).join(" "));
  if (named.size > 0) {
    if (listed(named) !== listed(scope))
      fail(
        `${where}: the clause names the ${listed(named)} but is scoped to ${listed(scope)}`,
      );
  } else {
    const quoted = kindsNamed(entry.quote);
    for (const kind of scope)
      if (!quoted.has(kind) && !WHOLE_CLASS.test(entry.quote.toLowerCase()))
        fail(`${where}: the quoted statute never mentions a ${kind}`);
  }
}

function checkOrdinanceStyle(): void {
  const local = (
    read(BILL_FORMS_PATH) as {
      local: { enactingClause: string; template: string; period: string };
    }
  ).local;
  const data = read(ORDINANCE_STYLE_PATH) as {
    retrievedOn?: unknown;
    places?: Record<
      string,
      Record<
        "municipal" | "county" | "numbering",
        SourcedRow & {
          clause?: string;
          kinds?: readonly string[];
          appliesTo?: string;
          template?: string;
          period?: string;
          alsoSourced?: readonly (SourcedRow & {
            clause?: string;
            kinds?: readonly string[];
            appliesTo?: string;
          })[];
        }
      >
    >;
  };
  if (data.retrievedOn !== "2026-10-23") fail("ordinance style: retrievedOn");
  const differs: string[] = [];
  for (const place of PLACES) {
    const row = data.places?.[place];
    if (!row) {
      fail(`ordinance style ${place}: missing`);
      continue;
    }
    for (const level of ["municipal", "county"] as const) {
      const entry = row[level];
      const where = `ordinance style ${place} ${level}`;
      for (const each of [entry, ...(entry?.alsoSourced ?? [])]) {
        if (!each || !text(each.clause)) {
          fail(`${where}: no clause`);
          continue;
        }
        const sourced = checkSourced(where, each);
        if (text(each.quote)) {
          const quote = each.quote.replace(/[^A-Za-z ]/g, " ").toLowerCase();
          const squeezed = quote.replace(/\s+/g, " ");
          for (const words of fixedWords(each.clause))
            if (!wordsInQuote(words, squeezed))
              fail(`${where}: "${words}" is not in the quoted statute`);
          checkScope(where, level, {
            ...each,
            clause: each.clause,
            quote: each.quote,
          });
        } else if (!sourced && each.clause !== local.enactingClause)
          fail(`${where}: ESTIMATED clause is not the national default`);
        if (sourced && each === entry)
          differs.push(`${place} ${level}: ${each.clause}`);
      }
    }
    const numbering = row.numbering;
    const sourced =
      numbering &&
      checkSourced(`ordinance style ${place} numbering`, numbering);
    if (
      numbering &&
      !sourced &&
      (numbering.template !== local.template ||
        numbering.period !== local.period)
    )
      fail(
        `ordinance style ${place} numbering: ESTIMATED is not the national default`,
      );
    if (sourced) differs.push(`${place} numbering: ${numbering.template}`);
  }
  console.log(
    `ordinance style: 56 places; ${differs.length} read from their own law instead of the national "${local.enactingClause}" / "${local.template}":`,
  );
  for (const line of differs) console.log(`  ${line}`);
}

const EXECUTIVE_MODES = new Set(["by-request", "member", "presides", "none"]);

function checkExecutiveIntroduction(): void {
  const national = (
    read(EXECUTIVE_PROPOSAL_PATH) as {
      kinds: Record<string, { mode: string }>;
    }
  ).kinds;
  const counties = (
    read(COUNTY_BODIES_PATH) as {
      structure: {
        states: Record<
          string,
          { electedExecutive: string; executivePresidesOverBody: boolean }
        >;
      };
    }
  ).structure.states;
  const data = read(EXECUTIVE_INTRODUCTION_PATH) as {
    retrievedOn?: unknown;
    places?: Record<
      string,
      Record<"mayor" | "countyExecutive", SourcedRow & { mode?: unknown }>
    >;
  };
  if (data.retrievedOn !== "2026-10-23") fail("executive: retrievedOn");
  const differs: string[] = [];
  for (const place of PLACES) {
    const row = data.places?.[place];
    if (!row) {
      fail(`executive ${place}: missing`);
      continue;
    }
    const mayor = row.mayor;
    if (!EXECUTIVE_MODES.has(String(mayor?.mode)))
      fail(`executive ${place} mayor: mode ${String(mayor?.mode)}`);
    if (mayor && !checkSourced(`executive ${place} mayor`, mayor)) {
      if (mayor.mode !== national.mayor?.mode)
        fail(
          `executive ${place} mayor: ESTIMATED mode is not executive-proposal.json's`,
        );
    } else if (mayor && mayor.mode !== national.mayor?.mode)
      differs.push(`${place} mayor: ${String(mayor.mode)}`);
    const county = row.countyExecutive;
    if (!EXECUTIVE_MODES.has(String(county?.mode)))
      fail(`executive ${place} county: mode ${String(county?.mode)}`);
    if (county && !checkSourced(`executive ${place} county`, county)) {
      const c = counties[place];
      const derived = !c
        ? "none"
        : c.electedExecutive === "none"
          ? "none"
          : c.executivePresidesOverBody
            ? "presides"
            : "by-request";
      if (county.mode !== derived)
        fail(
          `executive ${place} county: ${String(county.mode)}, but county-governing-bodies.json gives ${derived}`,
        );
    }
  }
  console.log(
    `executive: 56 places; ${differs.length} mayors read from their own law bring bills otherwise than by request:`,
  );
  for (const line of differs) console.log(`  ${line}`);
}

checkCommittees();
checkOrdinanceStyle();
checkExecutiveIntroduction();
if (errors.length) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log("legislature local rules: ok");
