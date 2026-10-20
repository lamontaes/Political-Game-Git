/**
 * Laws have histories, and officeholders have records (owner, Oct 14, 2026).
 *
 * Prior term: each chamber covering the town recorded votes on contested
 * questions in the years before day one: the questions its members ran on
 * first, then the bill catalog's for its level. Each bill's sponsor is the
 * member standing most strongly on it then; each member's vote follows their
 * own stance; a seat its holder didn't yet hold votes by the seat's lean.
 * Votes go to the record engine's table, which the voting engine weighs and
 * which marks the members' campaign promises kept or broken.
 *
 * Laws in force: every law row gets a history. Rows that take effect
 * together (one series' tiers, one date) are one enactment. It was passed
 * before its effective date by the enactment lag; a law the research records
 * only as in force at the opening was passed some years before. Its roll
 * call is the members who served then voting their stance, the rest of the
 * seats generated predecessors; a law the current members serving then would
 * have voted down was passed before they took their seats. The sponsor is the
 * strongest yes voter, the signer the executive who held office then, and
 * each phase points at the one it amends.
 */
import provisionQuestions from "../../data/research/legislature/provision-questions.json" with { type: "json" };
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import { POLICY_QUESTIONS } from "./policy-answers";
import { questionAxis } from "./campaign-views";
import { memberSupportAt } from "./officials-roster";
import { LAWS_MODULE_ID } from "./modules/laws";
import { members } from "./modules/legislature";
import { RECORD_MODULE_ID, type VoteRecordRow } from "./modules/record";
import type { LawRowInput } from "./laws-starting";
import type { ModuleRow } from "./module-data";
import type { TermRow } from "./modules/offices";
import {
  CHAMBER_KINDS,
  chamberMembers,
  chamberSeats,
  pastIdentityName,
  personName,
  SIGNER_KINDS,
  seatLean,
  supportOn,
  townOffices,
  type PastOffice,
  type PastTown,
} from "./past-bodies";
import {
  pastParameter,
  putPast,
  seededBetween,
  seededUnit,
  shiftDays,
  type LawHistoryRow,
  type PastBillRow,
  type PastElectionRow,
  type RollCall,
} from "./past-module";
import { daysBetweenText } from "./kernel/dates";
import type { CoreAPI } from "./types";

const SERIES_QUESTION = (
  provisionQuestions as unknown as {
    series: Record<string, { question: string; raiseIs: number }>;
  }
).series;

type Level = "federal" | "state" | "city";
type CatalogPolicy = {
  question?: string;
  series?: string;
  levels: Level[];
};
const CATALOG_QUESTIONS: Readonly<Record<Level, readonly string[]>> = (() => {
  const out: Record<Level, string[]> = { federal: [], state: [], city: [] };
  const subjects = (
    catalog as unknown as {
      subjects: {
        topics?: { policies: CatalogPolicy[] }[];
        policies?: CatalogPolicy[];
      }[];
    }
  ).subjects;
  for (const subject of subjects)
    for (const topic of subject.topics ?? [subject])
      for (const policy of topic.policies ?? []) {
        // A policy question, or the question an amount's series speaks to.
        const question =
          policy.question ??
          (policy.series
            ? SERIES_QUESTION[policy.series]?.question
            : undefined);
        if (question && questionAxis(question) !== 0)
          for (const level of policy.levels) out[level].push(question);
      }
  return out;
})();

const catalogLevel = (level: string): Level =>
  level === "federal" || level === "state" ? level : "city";

function serviceStart(term: TermRow): string {
  return term.serviceStart ?? term.startDate;
}

interface Chamber {
  readonly office: PastOffice;
  readonly body: string;
  readonly members: readonly TermRow[];
  readonly seats: number;
}

function chambersOf(api: CoreAPI): readonly Chamber[] {
  const out: Chamber[] = [];
  const seen = new Set<string>();
  for (const office of townOffices(api)) {
    if (!CHAMBER_KINDS.has(office.kind)) continue;
    const body =
      office.kind === "us-house" || office.kind === "us-senate"
        ? `US:${office.kind}`
        : office.id;
    if (seen.has(body)) continue;
    seen.add(body);
    const held = chamberMembers(api, office);
    out.push({
      office,
      body,
      members: held,
      seats: chamberSeats(api, office, held.length),
    });
  }
  return out;
}

/**
 * One chamber's roll call on a question in a direction, on a date: the
 * members serving then by their own stance, the other seats by their lean.
 */
function rollCall(
  api: CoreAPI,
  seed: string,
  chamber: Chamber,
  date: string,
  question: string,
  position: number,
  /** A law in force passed: the seats held by others then carried it. */
  enacted = false,
): RollCall & { readonly passes: boolean } {
  const yesIds: string[] = [];
  const noIds: string[] = [];
  let predecessorsYes = 0;
  let predecessors = 0;
  for (const term of chamber.members) {
    const id = term.personId!;
    if (serviceStart(term) <= date) {
      if (supportOn(api, id, question) * position > 0) yesIds.push(id);
      else noIds.push(id);
    } else {
      predecessors += 1;
      if (memberSupportAt(seatLean(api, id), question) * position > 0)
        predecessorsYes += 1;
    }
  }
  // Seats with no holder in the world (Congress beyond the officials
  // engine's roster) vote as the held seats' predecessors did, in proportion.
  const unheld = chamber.seats - chamber.members.length;
  const heldShare =
    chamber.members.length > 0
      ? (yesIds.length + predecessorsYes) / chamber.members.length
      : 0;
  let unheldYes = Math.round(unheld * heldShare);
  const others = predecessors + unheld;
  const majority = Math.floor(chamber.seats / 2) + 1;
  if (enacted && yesIds.length + predecessorsYes + unheldYes < majority) {
    // The others' votes are generated: as many as the law needed, and more
    // within its usual margin.
    const needed = Math.min(others, majority - yesIds.length);
    const extra = Math.floor(
      (others - needed) *
        seededUnit(seed, `${chamber.body}:${question}:${date}:margin`),
    );
    predecessorsYes = Math.min(predecessors, needed + extra);
    unheldYes = Math.min(unheld, needed + extra - predecessorsYes);
  }
  const yes = yesIds.length + predecessorsYes + unheldYes;
  const no = chamber.seats - yes;
  return {
    body: chamber.body,
    yes,
    no,
    yesIds,
    noIds,
    predecessors: predecessors + unheld,
    passes: yes > no,
  };
}

function recordVotes(
  api: CoreAPI,
  measureId: string,
  body: string,
  date: string,
  question: string,
  position: number,
  call: RollCall,
  passed: boolean,
): number {
  if (!api.state.modules.has(RECORD_MODULE_ID)) return 0;
  const votes = api.moduleState(RECORD_MODULE_ID).table("votes");
  let count = 0;
  for (const [ids, way] of [
    [call.yesIds, 1],
    [call.noIds, -1],
  ] as const)
    for (const personId of ids) {
      const row: VoteRecordRow = {
        id: `vote:${measureId}:${personId}`,
        personId,
        date,
        body,
        measureId,
        stance: { question, position: way * position },
        passed,
      };
      votes.put(row as unknown as ModuleRow);
      count += 1;
    }
  return count;
}

/** The strongest supporter among yes voters, else a named predecessor. */
function sponsorOf(
  api: CoreAPI,
  town: PastTown,
  call: RollCall,
  question: string,
  position: number,
  key: string,
  date: string,
): { id: string | null; name: string } {
  const best = [...call.yesIds].sort(
    (a, b) =>
      supportOn(api, b, question) * position -
        supportOn(api, a, question) * position || a.localeCompare(b),
  )[0];
  return best
    ? { id: best, name: personName(api, best) }
    : { id: null, name: pastIdentityName(town, `${key}:sponsor`, date) };
}

/** The prior term's recorded bills of every chamber covering the town. */
export function buildPriorTerms(
  api: CoreAPI,
  town: PastTown,
  elections: readonly PastElectionRow[],
): { bills: readonly PastBillRow[]; votes: number } {
  const perYear = pastParameter(api, "pastRollCallsPerBodyYear");
  const promised = new Map<string, string[]>();
  for (const election of elections) {
    const list = promised.get(election.winnerId) ?? [];
    list.push(...election.promiseQuestions);
    promised.set(election.winnerId, list);
  }
  const bills: PastBillRow[] = [];
  let votes = 0;
  for (const chamber of chambersOf(api)) {
    const years = chamber.office.termYears ?? 2;
    const start = shiftDays(
      town.opening,
      -Math.round(years * pastParameter(api, "pastDaysPerYear")),
    );
    // Questions the members ran on, then the catalog's, in a seeded order.
    const own = chamber.members.flatMap(
      (term) => promised.get(term.personId!) ?? [],
    );
    const pool = [
      ...new Set([
        ...own,
        ...[...CATALOG_QUESTIONS[catalogLevel(chamber.office.level)]].sort(
          (a, b) =>
            seededUnit(town.seed, `${chamber.body}:${a}`) -
            seededUnit(town.seed, `${chamber.body}:${b}`),
        ),
      ]),
    ];
    const count = Math.min(pool.length, Math.round(perYear * years));
    for (let index = 0; index < count; index += 1) {
      const question = pool[index]!;
      const date = shiftDays(
        start,
        Math.floor(
          seededBetween(
            town.seed,
            `${chamber.body}:${question}:date`,
            0,
            years * pastParameter(api, "pastDaysPerYear"),
          ),
        ),
      );
      if (date >= town.opening) continue;
      // The sponsor stands most strongly on it among members serving then.
      const serving = chamber.members.filter((t) => serviceStart(t) <= date);
      const lead = serving
        .map((t) => ({
          id: t.personId!,
          s: supportOn(api, t.personId!, question),
        }))
        .sort(
          (a, b) => Math.abs(b.s) - Math.abs(a.s) || a.id.localeCompare(b.id),
        )[0];
      // A chamber whose members all took their seats since: the seats'
      // earlier holders brought it, the way the seats lean.
      const seatsLean = chamber.members.reduce(
        (sum, t) => sum + memberSupportAt(seatLean(api, t.personId!), question),
        0,
      );
      const position = Math.sign(lead?.s || seatsLean);
      if (position === 0) continue;
      const call = rollCall(api, town.seed, chamber, date, question, position);
      const id = `past-bill:${chamber.body}:${date}:${question}`;
      const bill: PastBillRow = {
        id,
        body: chamber.body,
        date,
        question,
        position,
        sponsorId: lead?.s ? lead.id : null,
        sponsorName: lead?.s
          ? personName(api, lead.id)
          : pastIdentityName(town, `${id}:sponsor`, date),
        rollCall: stripPasses(call),
        passed: call.passes,
        lawIds: [],
      };
      putPast(api, "bills", bill);
      bills.push(bill);
      votes += recordVotes(
        api,
        id,
        chamber.office.id,
        date,
        question,
        position,
        call,
        call.passes,
      );
    }
  }
  return { bills, votes };
}

function stripPasses(call: RollCall & { passes: boolean }): RollCall {
  return {
    body: call.body,
    yes: call.yes,
    no: call.no,
    yesIds: call.yesIds,
    noIds: call.noIds,
    predecessors: call.predecessors,
  };
}

/** The question a law row speaks to and which way this phase moved it. */
function lawStance(
  row: LawRowInput,
  previous: LawRowInput | undefined,
): { question: string; position: number } | null {
  if (POLICY_QUESTIONS[row.series] && questionAxis(row.series) !== 0)
    return { question: row.series, position: (row.value ?? 0) > 0 ? 1 : -1 };
  const map = SERIES_QUESTION[row.series];
  if (!map || questionAxis(map.question) === 0) return null;
  const before = previous?.value ?? null;
  const direction =
    before === null || row.value === null
      ? 1
      : Math.sign(row.value - before) || 1;
  return { question: map.question, position: direction * map.raiseIs };
}

/** Every law row's history, with the members' votes on it. */
export function buildLawHistories(
  api: CoreAPI,
  town: PastTown,
): { histories: readonly LawHistoryRow[]; votes: number } {
  const laws = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as LawRowInput[];
  const chambers = chambersOf(api);
  const offices = townOffices(api);
  const chambersFor = (level: string): readonly Chamber[] =>
    chambers.filter((c) =>
      level === "federal"
        ? c.office.level === "federal"
        : level === "state"
          ? c.office.level === "state"
          : level === "county"
            ? c.office.kind === "county-board"
            : c.office.kind === "council",
    );
  const signerOf = (level: string): TermRow | undefined => {
    const kind = SIGNER_KINDS[level];
    const office = kind && offices.find((o) => o.kind === kind);
    return office ? members(api, office.id)[0] : undefined;
  };
  // One enactment per jurisdiction, series and phase: a carried row belongs
  // to the phase it was carried back from.
  const phaseOf = (row: LawRowInput): string =>
    row.id.endsWith(":from-start") && row.endDate
      ? row.endDate
      : row.effectiveDate;
  const groups = new Map<string, LawRowInput[]>();
  for (const row of laws) {
    const key = `${row.jurisdiction}|${row.level}|${row.series}|${phaseOf(row)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const series = new Map<string, string[]>();
  for (const key of [...groups.keys()].sort()) {
    const seriesKey = key.split("|").slice(0, 3).join("|");
    series.set(seriesKey, [...(series.get(seriesKey) ?? []), key]);
  }
  const lagLow = pastParameter(api, "pastLawEnactmentLagDaysLow");
  const lagHigh = pastParameter(api, "pastLawEnactmentLagDaysHigh");
  const histories: LawHistoryRow[] = [];
  let votes = 0;
  for (const keys of series.values()) {
    keys.sort((a, b) => a.split("|")[3]!.localeCompare(b.split("|")[3]!));
    const ids = keys.map(
      (key) =>
        `law-history:${
          groups
            .get(key)!
            .map((r) => r.id)
            .sort()[0]
        }`,
    );
    keys.forEach((key, index) => {
      const rows = groups.get(key)!;
      const row = rows.slice().sort((a, b) => a.id.localeCompare(b.id))[0]!;
      const id = ids[index]!;
      const phase = phaseOf(row);
      // Answers read as in force at the opening carry no enactment date.
      const undated =
        phase === town.opening ||
        (row.id.endsWith(":starting") && !!POLICY_QUESTIONS[row.series]);
      let enactedOn = undated
        ? shiftDays(
            town.opening,
            -Math.round(
              pastParameter(api, "pastDaysPerYear") *
                seededBetween(
                  town.seed,
                  `${id}:age`,
                  pastParameter(api, "pastUndatedLawAgeYearsLow"),
                  pastParameter(api, "pastUndatedLawAgeYearsHigh"),
                ),
            ),
          )
        : (() => {
            // A phase taking effect after day one was passed before it:
            // the lag is at least the days from day one to the phase.
            const ahead = daysBetweenText(town.opening, phase);
            const low = Math.max(lagLow, ahead + 1);
            return shiftDays(
              phase,
              -Math.round(
                seededBetween(
                  town.seed,
                  `${id}:lag`,
                  low,
                  Math.max(lagHigh, low + lagHigh - lagLow),
                ),
              ),
            );
          })();
      const previous = index
        ? groups.get(keys[index - 1]!)!.find((r) => r.tier === row.tier)
        : undefined;
      const stance = lawStance(row, previous);
      const level = row.level;
      const lawChambers = chambersFor(level);
      // A law its serving members would have voted down passed before them.
      let calls = stance
        ? lawChambers.map((c) =>
            rollCall(
              api,
              town.seed,
              c,
              enactedOn,
              stance.question,
              stance.position,
              true,
            ),
          )
        : [];
      // Each step moves the passage before an opposing member's first day,
      // so fewer serve each time and the loop ends.
      while (calls.some((c) => !c.passes)) {
        const opposed = calls
          .flatMap((c, i) =>
            c.passes
              ? []
              : lawChambers[i]!.members.filter((t) =>
                  c.noIds.includes(t.personId!),
                ),
          )
          .map(serviceStart)
          .sort()[0];
        if (!opposed) break;
        enactedOn = shiftDays(opposed, -lagLow);
        calls = lawChambers.map((c) =>
          rollCall(
            api,
            town.seed,
            c,
            enactedOn,
            stance!.question,
            stance!.position,
            true,
          ),
        );
      }
      // Without a question the record cannot read a stance from, the roll
      // call is the chambers' seats with a generated margin.
      const rollCalls: RollCall[] = stance
        ? calls.map(stripPasses)
        : lawChambers.map((c) => {
            const yes = Math.ceil(
              c.seats *
                seededBetween(
                  town.seed,
                  `${id}:${c.body}:margin`,
                  pastParameter(api, "pastLawMarginLow"),
                  pastParameter(api, "pastLawMarginHigh"),
                ),
            );
            return {
              body: c.body,
              yes: Math.max(yes, Math.floor(c.seats / 2) + 1),
              no: c.seats - Math.max(yes, Math.floor(c.seats / 2) + 1),
              yesIds: [],
              noIds: [],
              predecessors: c.seats,
            };
          });
      const sponsor = sponsorOf(
        api,
        town,
        {
          body: "",
          yes: 0,
          no: 0,
          yesIds: rollCalls.flatMap((c) => c.yesIds),
          noIds: [],
          predecessors: 0,
        },
        stance?.question ?? "",
        stance?.position ?? 1,
        id,
        enactedOn,
      );
      const signer = signerOf(level);
      const signedByHolder =
        signer && signer.personId && serviceStart(signer) <= enactedOn;
      const year = Number(enactedOn.slice(0, 4));
      const session: Record<string, string> =
        level === "federal"
          ? {
              congress: String(
                Math.floor(
                  (year - (enactedOn.slice(5) < "01-03" ? 1 : 0) - 1789) / 2,
                ) + 1,
              ),
              year: String(year),
            }
          : level === "state"
            ? { sessionYear: String(year), sessionKind: "regular" }
            : { meetingDate: enactedOn };
      const history: LawHistoryRow = {
        id,
        lawId: row.id,
        lawIds: rows.map((r) => r.id),
        jurisdiction: row.jurisdiction,
        level,
        series: row.series,
        effectiveDate: phase,
        enactedOn,
        enactedFrom: undated ? "undated" : "effective-date",
        body: lawChambers.map((c) => c.body).join(" "),
        session,
        billId: id.replace(/^law-history:/, "enacting-bill:"),
        rollCalls,
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        signedBy: signedByHolder ? signer!.personId : null,
        signerName: signedByHolder
          ? personName(api, signer!.personId!)
          : SIGNER_KINDS[level]
            ? pastIdentityName(town, `${id}:signer`, enactedOn)
            : "",
        amends: index ? ids[index - 1]! : null,
        amendedBy: ids[index + 1] ?? null,
        source: {
          tag: "ESTIMATED",
          citation: undated
            ? "Enactment year within pastUndatedLawAgeYearsLow..High before day one (stopgap SG-CORE-past-undated-law-age); roll call from the members serving then"
            : "Effective date from the law's research row; passage before it within pastLawEnactmentLagDaysLow..High; roll call from the members serving then",
        },
      };
      putPast(api, "laws", history);
      histories.push(history);
      if (stance)
        rollCalls.forEach((call, i) => {
          votes += recordVotes(
            api,
            id,
            lawChambers[i]!.office.id,
            enactedOn,
            stance.question,
            stance.position,
            call,
            true,
          );
        });
    });
  }
  return { histories, votes };
}
