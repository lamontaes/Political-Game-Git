/**
 * Boasts, threats and alarms. A person raises one from a recorded moment of
 * their own: a rival who won the count boasts, one who lost to the listener
 * threatens, one whose health took a serious turn raises the alarm. How
 * sharply they say it slides with their traits, read through the shared
 * trait-act table (`traitLeanBetween`), never rolled: the lean picks one of
 * the bands of authored wordings in `data/english/parts/stance.json`.
 * Structure is `data/stance.json`; no sentence is typed here.
 */
import pulls from "../../data/content/trait-act-pulls.json" with { type: "json" };
import { traitLeanBetween } from "../core2/trait-decisions";
import { winningPersonId, resultOf } from "../core2/modules/voting";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import stanceJson from "./data/stance.json" with { type: "json" };
import type { Moment } from "./types";

const zero = P.zero;
const one = P.one;
const two = P.two;

interface StanceRow {
  toward: readonly string[];
  over: readonly string[];
  momentLabels: readonly string[];
  reply: string;
}
export const STANCE_DATA = stanceJson as unknown as {
  levels: number;
  stances: Record<string, StanceRow>;
};

export interface StanceRaise {
  kind: "boast" | "threat" | "alarm";
  /** The edge band, `edge-0` (plain) to `edge-3` (rude), as the bank's stage. */
  stage: string;
  /** The records that stand behind it: the moment's cause, the speaker, the traits that set the edge. */
  sourceRecordIds: string[];
  /** The speaker's lean, -1 to 1, that chose the band. */
  lean: number;
}

type TraitPull = {
  high?: { toward?: string[] };
  low?: { toward?: string[] };
};
const PULLS = pulls.pulls as unknown as Record<string, TraitPull>;

/** The speaker's traits that pull toward any of the act kinds, by trait id. */
export function traitsPulling(
  traits: Readonly<Record<string, number>>,
  kinds: readonly string[],
): string[] {
  return Object.entries(traits)
    .filter(([id, value]) => {
      const pull = PULLS[id];
      const side = value > zero ? pull?.high : value < zero ? pull?.low : null;
      return !!side?.toward?.some((kind) => kinds.includes(kind));
    })
    .map(([id]) => id)
    .sort();
}

/** The band a lean in -1..1 falls in: a slide of `levels` bands, never a flip at one value. */
export function edgeBand(lean: number): string {
  const levels = STANCE_DATA.levels;
  const at = Math.floor(((lean + one) / two) * levels);
  return `edge-${Math.min(levels - one, Math.max(zero, at))}`;
}

function contestOf(moment: Moment): string | undefined {
  const prefix = "election-result:";
  return moment.causeId.startsWith(prefix)
    ? moment.causeId.slice(prefix.length)
    : undefined;
}

/**
 * The stances a speaker raises with a listener, from the speaker's recent
 * moments (newest first). Each names the record that caused it and the
 * traits that set its edge.
 */
export function stanceRaises(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  moments: readonly Moment[],
): StanceRaise[] {
  const speaker = core.people.get(speakerId);
  if (!speaker) return [];
  const api = coreAPI(core as CoreState);
  const out: StanceRaise[] = [];
  const raise = (kind: StanceRaise["kind"], moment: Moment) => {
    const row = STANCE_DATA.stances[kind]!;
    const lean = traitLeanBetween(core, speaker, row.toward, row.over);
    out.push({
      kind,
      stage: edgeBand(lean),
      lean,
      sourceRecordIds: [
        moment.causeId,
        speakerId,
        ...traitsPulling(speaker.traits, row.toward),
      ],
    });
  };
  for (const moment of moments) {
    if (STANCE_DATA.stances.alarm!.momentLabels.includes(moment.label)) {
      raise("alarm", moment);
      continue;
    }
    if (!moment.label.startsWith("cause:event:election-result")) continue;
    const contestId = contestOf(moment);
    const result = contestId ? resultOf(api, contestId) : null;
    if (!result?.winnerId) continue;
    const winnerId = winningPersonId(api, result.winnerId);
    if (winnerId === speakerId) {
      raise("boast", moment);
      continue;
    }
    // The speaker stood in this count and lost it to the person they talk to.
    const stood = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[]
    ).some((f) => f.contestId === contestId && f.personId === speakerId);
    if (stood && winnerId === listenerId) raise("threat", moment);
  }
  return out;
}
