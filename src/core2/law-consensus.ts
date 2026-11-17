/**
 * How widely the world's own governments have made a policy question's "yes"
 * law: the elite consensus a member of a legislature answers to beyond their
 * own lean (`memberSupportAt`). Everything is read from the world: each
 * state's own answer (`answerIn`, an act passed and waiting on its date
 * counted, since members answer to what passed), so an outside session's act,
 * a state's own bill or a dev-mode law moves it the day it is enacted. A
 * question only federal law answers reads the world's latest roll call on it,
 * else the share of the sitting members of Congress whose lean alone favors it.
 * Real data sets none of it; it is kept per world while the laws (and, for the
 * members' share, the officials) are unchanged. The stance rules that read it
 * live here too (`memberSupportAt`, `ownStance`, and voters' `supportAt`),
 * apart from the roster's draw of who an official is, so the roster stays
 * light enough for the engines that load it first.
 */
import type { CoreAPI, CoreState } from "./types";
import type { ModuleRow } from "./module-data";
import {
  answerIn,
  enactmentOf,
  lawRows,
  LAWS_MODULE_ID,
  POLICY_QUESTIONS,
  POLICY_SERIES_BY_LEVEL,
  type LawRowInput,
} from "./modules/laws";
import { placeStateKeys } from "./places";
import { axisOf } from "./campaign-data";
import { personStance, questionAxis } from "./modules/campaigns";
import { opinionRest } from "./modules/views";
import { officialsIn, OFFICIALS_MODULE_ID } from "./modules/officials";
import { OFFICIALS_DATA, type SignatureIssue } from "./officials-roster";
import { PAST_MODULE_ID } from "./past-module";

/** The world's consensus on a question: its "yes" share and what it was read from. */
export interface LawConsensus {
  /** The share of those read that favor "yes", 0 to 1. */
  readonly share: number;
  readonly from: "states" | "roll call" | "members' leans";
  /** States: those answering yes, and those answering at all. Roll call or members: the yes side and those counted. */
  readonly yes: number;
  readonly counted: number;
  /** The roll call's law row, for a federal question read from one. */
  readonly lawId?: string;
}

const FEDERAL_BODIES = ["US:us-house", "US:us-senate"];

interface Held {
  readonly key: string;
  readonly byQuestion: Map<string, LawConsensus | null>;
}
const held = new WeakMap<CoreState, Held>();

/**
 * What the consensus is read from changes only when a law is written, a
 * law's roll calls are (the past's law histories, built after the opening's
 * terms have read it), or, for the members' share, an official is.
 */
function keyOf(api: CoreAPI): string {
  const laws = api.moduleState(LAWS_MODULE_ID);
  const order = laws.table("chain").get("enactment-order") as unknown as
    { next?: number } | undefined;
  const officials = api.state.modules.has(OFFICIALS_MODULE_ID)
    ? api.moduleState(OFFICIALS_MODULE_ID).writes
    : 0;
  const histories = api.state.modules.has(PAST_MODULE_ID)
    ? api.moduleState(PAST_MODULE_ID).table("laws").size
    : 0;
  return `${laws.table("laws").size}:${order?.next ?? 0}:${officials}:${histories}`;
}

const isStateQuestion = (question: string): boolean =>
  POLICY_QUESTIONS[question] !== undefined;

/** The latest row a government has on a question, enacted and waiting counted. */
function latestRow(
  api: CoreAPI,
  question: string,
  jurisdiction: string,
): LawRowInput | undefined {
  return [...lawRows(api, question, jurisdiction)].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate),
  )[0];
}

function read(api: CoreAPI, question: string): LawConsensus | null {
  if (isStateQuestion(question)) {
    let yes = 0,
      counted = 0;
    for (const state of placeStateKeys()) {
      const answer = answerIn(api, state, question, true);
      if (answer === null) continue;
      counted += 1;
      if (answer === 1) yes += 1;
    }
    return counted
      ? { share: yes / counted, from: "states", yes, counted }
      : null;
  }
  // A question only federal law answers: the world's latest roll call on
  // it, where a vote count is on record (a law set without one, as dev
  // mode's, reads the sitting members' leans below).
  const row = latestRow(api, question, "US");
  const passed = row ? enactmentOf(api, row) : null;
  if (row && passed?.counted) {
    const forSide = (1 + passed.margin) / 2;
    const share = row.value === 1 ? forSide : 1 - forSide;
    return { share, from: "roll call", yes: share, counted: 1, lawId: row.id };
  }
  // Else the sitting members of Congress, each by their own lean alone.
  let yes = 0,
    counted = 0;
  const scale = OFFICIALS_DATA.ideology.leanScale.value;
  for (const body of FEDERAL_BODIES)
    for (const member of officialsIn(api, body)) {
      const lean = Math.max(-1, Math.min(1, member.ideal * scale));
      const stance = lean * questionAxis(question);
      if (stance === 0) continue;
      counted += 1;
      if (stance > 0) yes += 1;
    }
  return counted
    ? { share: yes / counted, from: "members' leans", yes, counted }
    : null;
}

/** The world's consensus on a question's "yes", or null where nothing in the world answers it. */
export function lawConsensus(
  api: CoreAPI,
  question: string,
): LawConsensus | null {
  if (!axisOf[question] || !api.state.modules.has(LAWS_MODULE_ID)) return null;
  const core = api.state as CoreState;
  const key = keyOf(api);
  let kept = held.get(core);
  if (kept?.key !== key)
    held.set(core, (kept = { key, byQuestion: new Map() }));
  if (!kept.byQuestion.has(question))
    kept.byQuestion.set(question, read(api, question));
  return kept.byQuestion.get(question)!;
}

/** The policy question a law series is the row of, at whatever level. */
function questionOfSeries(series: string): string | undefined {
  if (axisOf[series]) return series;
  for (const [question, byLevel] of Object.entries(POLICY_SERIES_BY_LEVEL))
    if (Object.values(byLevel).includes(series) && axisOf[question])
      return question;
  return undefined;
}

/**
 * Keep the consensus a law row just changed, for the trace: the
 * `consensus:<question>` row in the laws engine's `consensus` table, with the
 * law rows each state's answer was read from. Written when a law is enacted
 * (`enactLaw`), never on a read.
 */
export function recordLawConsensus(api: CoreAPI, series: string): void {
  const question = questionOfSeries(series);
  if (!question) return;
  const consensus = lawConsensus(api, question);
  if (!consensus) return;
  const lawIds: string[] = [];
  if (consensus.from === "states")
    for (const state of placeStateKeys()) {
      const row = latestRow(api, question, state);
      if (row) lawIds.push(row.id);
    }
  else if (consensus.lawId) lawIds.push(consensus.lawId);
  api
    .moduleState(LAWS_MODULE_ID)
    .table("consensus")
    .put({
      id: `consensus:${question}`,
      question,
      asOf: api.state.date,
      from: consensus.from,
      yes: consensus.yes,
      counted: consensus.counted,
      share: Math.round(consensus.share * 1e4) / 1e4,
      // The yes share's term in a member's stance: |axis| x (2 x share - 1).
      term:
        Math.round(
          Math.abs(axisOf[question]!.axis) * (2 * consensus.share - 1) * 1e4,
        ) / 1e4,
      lawIds,
    } as unknown as ModuleRow);
}

/**
 * How strongly voters at a lean (a district's, a state's) support a
 * question's "yes", read the way a voter's own stance is: their lean at the
 * question's strength (`personStance`) plus, where those voters include the
 * played area's people (`townOpinion`), what the played area's people's own
 * lives, faith, degree and news add beyond their leans this month
 * (`opinionRest`), so a policy they favor draws members of both parties. The
 * opinion row is read from the played area alone, so voters elsewhere read
 * their lean alone until outside places keep their own opinion.
 */
export function supportAt(
  api: CoreAPI,
  lean: number,
  question: string,
  townOpinion: boolean,
): number {
  return (
    personStance(lean, question) +
    (townOpinion ? opinionRest(api, question) : 0)
  );
}

/**
 * How strongly a member at a lean supports a question's "yes": their lean
 * along the question's axis plus how widely the world's own governments have
 * already made it law (`lawConsensus`: the share of the world's states whose
 * law answers yes, or for a question only federal law answers, the world's
 * latest roll call on it, else the sitting Congress's leans), the elite
 * consensus members answer to, where voters answer to the polls
 * (`supportAt`). A budget line has no such record and reads by lean alone.
 */
export function memberSupportAt(
  api: CoreAPI,
  lean: number,
  question: string,
): number {
  const row = axisOf[question];
  const consensus = row ? lawConsensus(api, question) : null;
  // A member's lean reads along the question's measured direction among
  // governments (what states enacted, how Congress voted), not the voters'.
  return (
    lean * questionAxis(question) +
    (row && consensus ? Math.abs(row.axis) * (2 * consensus.share - 1) : 0)
  );
}

/** A member's own stance on a question: their position, and their own tilt if it's one of their causes. */
export function ownStance(
  api: CoreAPI,
  ideal: number,
  signature: readonly SignatureIssue[],
  question: string,
): number {
  const tilt = signature.find((s) => s.question === question)?.tilt ?? 0;
  // On the voters' scale, no further out than the electorate's own ends.
  const lean = Math.max(
    -1,
    Math.min(1, (ideal + tilt) * OFFICIALS_DATA.ideology.leanScale.value),
  );
  return memberSupportAt(api, lean, question);
}
