/**
 * How the outcome web reaches a voter's turnout: the factor the voting
 * engine multiplies a voter's own propensity by, for one voter in one place.
 * The engine keeps deciding turnout from the voter's duty, stakes, habit and
 * cost; the web adds the links the engine does not already read.
 *
 * The election laws (photo ID, automatic and same-day registration, all-mail
 * voting, restoring the vote, term limits) already act on turnout through the
 * law reach (`electionLawTurnoutCost`, `barredFromVoting`), sized from the
 * same research. Their web links are left out of this factor so no law moves
 * turnout twice; they stay in the web's own ledger as the researched size the
 * law reach is checked against.
 */
import {
  ALL_MAIL,
  AUTO_REGISTRATION,
  PHOTO_ID,
  RESTORE_VOTE,
  SAME_DAY,
  TERM_LIMITS,
} from "./law-reach/group-a-voting";
import { webReach, type Subject, type WebPart } from "./outcome-web-reach";
import { WEB_LINKS } from "./outcome-web-model";
import type { CoreAPI, CoreState } from "./types";

const LAW_REACH_LAWS = [
  PHOTO_ID,
  AUTO_REGISTRATION,
  SAME_DAY,
  ALL_MAIL,
  RESTORE_VOTE,
  TERM_LIMITS,
];

/** Link keys whose law the law reach already applies to turnout. */
const LAW_REACH_LINKS: ReadonlySet<string> = new Set(
  WEB_LINKS.filter((link) =>
    LAW_REACH_LAWS.some((law) => link.from === `law:${law}`),
  ).map((link) => link.key),
);

export interface TurnoutWeb {
  /** The multiplier on the voter's propensity. */
  readonly factor: number;
  /** The web month row it stands on, or null. */
  readonly recordId: string | null;
  /** The link keys that moved it. */
  readonly links: readonly string[];
}

const NONE: TurnoutWeb = { factor: 1, recordId: null, links: [] };

const cache = new WeakMap<
  object,
  { date: string; hits: Map<string, TurnoutWeb> }
>();

const product = (parts: readonly WebPart[]) =>
  parts
    .filter((p) => !LAW_REACH_LINKS.has(p.link))
    .reduce((n, p) => n * (1 + p.effect * p.weight), 1);

/** The age a voter counts as on an election day (years between birth and election years). */
export function ageOnElection(birthDate: string, date: string): number {
  return Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
}

/**
 * The web's factor on one voter's propensity: the place's turnout links,
 * and for ages 18 to 24 the youth-turnout links too. Cached by place and age
 * for the day.
 */
export function turnoutWeb(
  api: CoreAPI,
  placeId: string,
  age: number,
  incomeFifth?: number,
): TurnoutWeb {
  const core = api.state as CoreState;
  let c = cache.get(core);
  if (!c || c.date !== core.date) {
    c = { date: core.date, hits: new Map() };
    cache.set(core, c);
  }
  const key = `${placeId}|${age}|${incomeFifth ?? ""}`;
  const hit = c.hits.get(key);
  if (hit) return hit;
  const subject: Subject = {
    age,
    ...(incomeFifth === undefined ? {} : { incomeFifth }),
  };
  const all = webReach(api, placeId, "voting.turnout-pct", subject);
  const parts = [...all.parts];
  let recordId = all.recordId;
  if (age >= 18 && age <= 24) {
    const youth = webReach(api, placeId, "voting.youth-turnout", subject);
    parts.push(...youth.parts);
    recordId = recordId ?? youth.recordId;
  }
  const live = parts.filter((p) => !LAW_REACH_LINKS.has(p.link));
  const result: TurnoutWeb = live.length
    ? {
        factor: Math.max(0, product(parts)),
        recordId,
        links: live.map((p) => p.link),
      }
    : NONE;
  c.hits.set(key, result);
  return result;
}

// stopgapId: SG-WEB-voting-graduation-cause (the graduation link's cause is the web's own ledger number)
// stopgapId: SG-WEB-voting-newspaper-closure (no outlet closes, so there is no cause to read)
// stopgapId: SG-WEB-voting-corruption-reelection (the voting engine already reads scandals into the appeal)
// stopgapId: SG-WEB-voting-relief-approval (no relief dollars or approval series is recorded)
