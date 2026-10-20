/**
 * Ballot measures (M3-10): a question put to a state's voters, where the
 * state's law allows one (a citizen initiative, a referendum on a law, or an
 * amendment the legislature refers).
 *
 * On the measure's election day every adult in town decides for themselves:
 * whether to vote (the same duty, interest and cost as any race; someone who
 * turned out for a race that day votes on the measures too) and how (their
 * own view of the question, their lean plus how popular the policy is; someone
 * with no view leaves it blank). The rest
 * of the state votes as groups spread across the left-right scale around the
 * state's real 2024 lean, each group voting its own view. The measure passes
 * by the state's own rule (a simple majority unless the data says
 * otherwise), and an approved measure becomes the state's law on its
 * effective date, reaching named residents through the law-effects module.
 */
import measuresData from "../data/elections/ballot-measures.json" with { type: "json" };
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { personLean, personStance, publicOffset } from "../campaign-views";
import { viewOn } from "./views";
import { enactLaw, lawChain } from "./laws";
import { turnoutOn, VOTING_MODULE_ID } from "./voting";
import { stateActEffectiveDate } from "../state-effective-date";

export const BALLOT_MEASURES_MODULE_ID = "core2-ballot-measures-v1";

export interface MeasureRow {
  readonly id: string;
  readonly stateKey: string;
  readonly title: string;
  readonly kind: string;
  /** The recorded policy question it settles, and which way a yes vote settles it. */
  readonly question: string;
  readonly yesMeans: "enact" | "repeal";
  readonly electionDate: string;
  /** Share of yes votes (of those voting on it) needed to pass; 0.5 means a simple majority. */
  readonly passShare: number;
  readonly passRule: string;
  /** False where the law needs a second approval at a later election before it takes effect. */
  readonly enactsOnApproval: boolean;
  readonly source: string;
  readonly status: "on-ballot" | "approved" | "defeated";
}

export interface MeasureResult {
  readonly id: string;
  readonly measureId: string;
  readonly named: {
    readonly yes: number;
    readonly no: number;
    readonly blank: number;
  };
  readonly groups: { readonly yes: number; readonly no: number };
  readonly yesShare: number;
  readonly approved: boolean;
  readonly effectiveDate: string | null;
}

export const BALLOT_MEASURES_MODULE: CoreModule = {
  id: BALLOT_MEASURES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      measures: { indexes: { byState: { fields: ["stateKey"] } } },
      votes: { indexes: { byMeasure: { fields: ["measureId"] } } },
      results: {},
    },
  },
  onCalendarWork: (api, work) => countMeasure(api, work),
};

/** Register the module and put the state's real upcoming measures on its ballot. */
export function openBallotMeasures(core: CoreState): void {
  if (!core.modules.has(BALLOT_MEASURES_MODULE_ID))
    registerModule(core, BALLOT_MEASURES_MODULE);
  const api = coreAPI(core);
  const stateKey = lawChain(api).stateKey;
  for (const m of realMeasures)
    if (
      m.stateKey === stateKey &&
      m.electionDate > core.date &&
      !table(api, "measures").get(m.id)
    )
      putOnBallot(api, {
        id: m.id,
        stateKey: m.stateKey,
        title: m.title,
        kind: m.kind,
        question: m.question,
        yesMeans: m.yesMeans,
        electionDate: m.electionDate,
        passShare: m.passShare,
        passRule: m.passRule,
        enactsOnApproval: m.enactsOnApproval,
        source: m.source,
      });
}

const realMeasures = (
  measuresData as unknown as {
    measures: (Omit<MeasureRow, "status"> & { matchNote: string | null })[];
  }
).measures;

const table = (api: CoreAPI, name: string) =>
  api.moduleState(BALLOT_MEASURES_MODULE_ID).table(name);

/** Put a measure on the state's ballot for its election day. */
export function putOnBallot(
  api: CoreAPI,
  input: Omit<MeasureRow, "status">,
): MeasureRow {
  const row: MeasureRow = { ...input, status: "on-ballot" };
  table(api, "measures").put(row as unknown as ModuleRow);
  api.moduleCalendar(BALLOT_MEASURES_MODULE_ID).schedule({
    key: `count:${row.id}`,
    date: row.electionDate,
    kind: "measure-count",
    source: { tag: "SOURCED", citation: row.source, asOf: api.state.date },
    sourceRecordIds: [row.id],
  });
  return row;
}

const ageOn = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

const stateRows = new Map(
  (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        totalVotes: number;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s]),
);

function townLean(api: CoreAPI): number {
  return (
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0
  );
}

/** Who turned out for a race today. */
function votedToday(api: CoreAPI): ReadonlySet<string> {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return new Set();
  return new Set(
    (
      api.moduleState(VOTING_MODULE_ID).table("ballots").rows() as unknown as {
        voterId: string;
        date: string;
        voted: boolean;
      }[]
    )
      .filter((b) => b.date === api.state.date && b.voted)
      .map((b) => b.voterId),
  );
}

function countMeasure(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "measure-count") return;
  const measure = table(api, "measures").get(
    work.sourceRecordIds[0]!,
  ) as unknown as MeasureRow | undefined;
  if (!measure || measure.status !== "on-ballot") return;
  const date = api.state.date;
  const direction = measure.yesMeans === "enact" ? 1 : -1;
  const { townPlaceId } = lawChain(api);
  const named = { yes: 0, no: 0, blank: 0 };
  let voted = 0;
  const adults = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const turnedOut = votedToday(api);
  const lean0 = townLean(api);
  for (const voter of adults) {
    const lean = personLean(api.state.people, voter, lean0);
    // Their traits' lean toward change over keeping things as they are, at the decision's weight.
    const trait =
      decisionTraitWeight(api.state, "ballot-measures.vote") *
      decisionLean(api.state, voter, "ballot-measures.vote", "yes", "no");
    const support =
      (viewOn(api, voter.id, measure.question, lean) +
        publicOffset(measure.question)) *
        direction +
      trait;
    const t = turnoutOn(api, voter, {
      yes: { total: support },
      no: { total: -support },
    });
    const votes = turnedOut.has(voter.id) || t.votes;
    const choice = !votes
      ? null
      : support > 0
        ? "yes"
        : support < 0
          ? "no"
          : "blank";
    if (choice) {
      voted += 1;
      named[choice] += 1;
    }
    table(api, "votes").put({
      id: `measure-vote:${measure.id}:${voter.id}`,
      measureId: measure.id,
      voterId: voter.id,
      voted: votes,
      choice,
      reasons: {
        lean,
        support,
        trait,
        duty: t.duty,
        interest: t.interest,
        cost: t.cost,
      },
    } as unknown as ModuleRow);
  }
  // The rest of the state: lean bands around the state's 2024 lean, sized by
  // its 2024 vote, each band voting its own view of the question.
  // stopgapId: SG-GOV-measure-groups-stand-in
  api.stopgap("SG-GOV-measure-groups-stand-in");
  const row = stateRows.get(measure.stateKey.slice(3));
  const groups = { yes: 0, no: 0 };
  const unnamed = Math.max(0, (row?.totalVotes ?? voted) - voted);
  const rightShare = row?.democraticTwoPartyShare
    ? 1 - row.democraticTwoPartyShare
    : (1 + townLean(api)) / 2;
  // Leans spread evenly from 2·right − 2 to 2·right (as named people's do);
  // the share voting yes is the part of that range whose view favors it.
  const low = 2 * rightShare - 2;
  const slope = personStance(1, measure.question) * direction;
  const yesFraction = shareFavoring(
    low,
    low + 2,
    slope,
    publicOffset(measure.question) * direction,
  );
  groups.yes = Math.round(unnamed * yesFraction);
  groups.no = unnamed - groups.yes;
  const yes = named.yes + groups.yes;
  const no = named.no + groups.no;
  const yesShare = yes + no ? yes / (yes + no) : 0;
  const approved =
    measure.passShare > 0.5 ? yesShare >= measure.passShare : yesShare > 0.5;
  const effective = approved
    ? (stateActEffectiveDate(measure.stateKey, date)?.date ?? date)
    : null;
  const result: MeasureResult = {
    id: `measure-result:${measure.id}`,
    measureId: measure.id,
    named,
    groups,
    yesShare,
    approved,
    effectiveDate: effective,
  };
  table(api, "results").put(result as unknown as ModuleRow);
  table(api, "measures").put({
    ...measure,
    status: approved ? "approved" : "defeated",
  } as unknown as ModuleRow);
  if (approved && measure.enactsOnApproval)
    enactLaw(api, {
      jurisdiction: measure.stateKey,
      level: "state",
      series: measure.question,
      value: direction > 0 ? 1 : 0,
      effectiveDate: effective!,
      measureId: measure.id,
      citation: measure.source,
    });
  api.emit({
    id: `measure-result:${measure.id}`,
    date,
    kind: "ballot-measure-result",
    personIds: [],
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Count of ${measure.title}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: {
      measureId: measure.id,
      question: measure.question,
      approved: approved ? "yes" : "no",
      yesShare: String(Math.round(yesShare * 1000) / 10),
    },
  });
}

/**
 * The share of a lean range [low, high] (spread evenly) whose support,
 * slope × lean + offset, is above zero.
 */
function shareFavoring(
  low: number,
  high: number,
  slope: number,
  offset: number,
): number {
  if (slope === 0) return offset > 0 ? 1 : 0;
  const cut = -offset / slope;
  const above = (high - Math.min(high, Math.max(low, cut))) / (high - low);
  return slope > 0 ? above : 1 - above;
}

export function measuresOf(api: CoreAPI): readonly MeasureRow[] {
  return table(api, "measures").rows() as unknown as MeasureRow[];
}

export function measureResult(
  api: CoreAPI,
  measureId: string,
): MeasureResult | null {
  return (
    (table(api, "results").get(`measure-result:${measureId}`) as unknown as
      MeasureResult | undefined) ?? null
  );
}

/** One voter's measure vote and its reasons. */
export function measureVoteOf(
  api: CoreAPI,
  measureId: string,
  personId: string,
) {
  return (
    table(api, "votes").get(`measure-vote:${measureId}:${personId}`) ?? null
  );
}

export { coreAPI };
