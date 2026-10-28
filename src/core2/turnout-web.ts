/**
 * How the outcome web reaches a voter's turnout: the factor the voting
 * engine multiplies a voter's own propensity by, for one voter in one place.
 * The engine keeps deciding turnout from the voter's duty, stakes, habit and
 * cost; the web adds the links the engine does not already read.
 *
 * The election laws that change a voter's cost of turning out or who may
 * vote (automatic and same-day registration, all-mail voting, restoring the
 * vote) act on turnout through the law reach (`electionLawTurnoutCost`,
 * `barredFromVoting`), sized from the same research: their links are carried
 * by it (`carriedBy` in the links), so the web does not run them and no law
 * moves turnout twice.
 */
import { webReach, type Subject, type WebPart } from "./outcome-web-reach";
import type { CoreAPI, CoreState } from "./types";
import { parameter } from "./parameters";

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
  parts.reduce((n, p) => n * (1 + p.effect * p.weight), 1);

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
  if (age >= parameter("votingAge") && age <= 24) {
    const youth = webReach(api, placeId, "voting.youth-turnout", subject);
    parts.push(...youth.parts);
    recordId = recordId ?? youth.recordId;
  }
  const result: TurnoutWeb = parts.length
    ? {
        factor: Math.max(0, product(parts)),
        recordId,
        links: parts.map((p) => p.link),
      }
    : NONE;
  c.hits.set(key, result);
  return result;
}

// stopgapId: SG-WEB-voting-graduation-cause (the graduation link's cause is the web's own ledger number)
// stopgapId: SG-WEB-voting-newspaper-closure (no outlet closes, so there is no cause to read)
// stopgapId: SG-WEB-voting-relief-approval (no relief dollars are recorded)
