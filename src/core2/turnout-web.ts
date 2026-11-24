/**
 * How the outcome web reaches a voter's turnout: the factor the voting
 * engine multiplies a voter's own propensity by, for one voter in one place.
 * The engine keeps deciding turnout from the voter's duty, stakes, habit and
 * cost; the web adds the links the engine does not already read.
 *
 * A local race adds its own links: a day whose ballot carries a municipal or
 * county race (or a recall of a town seat) also moves a voter's propensity by
 * the web's local-turnout links, such as a local newspaper closing.
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
 * for ages 18 to 24 the youth-turnout links too, and on a day whose ballot
 * carries a local race (`local`) the local-turnout links. Cached by place,
 * age and ballot for the day.
 */
export function turnoutWeb(
  api: CoreAPI,
  placeId: string,
  age: number,
  incomeFifth?: number,
  local = false,
): TurnoutWeb {
  const core = api.state as CoreState;
  let c = cache.get(core);
  if (!c || c.date !== core.date) {
    c = { date: core.date, hits: new Map() };
    cache.set(core, c);
  }
  const key = `${placeId}|${age}|${incomeFifth ?? ""}|${local}`;
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
  if (local) {
    const here = webReach(api, placeId, "voting.local-turnout", subject);
    parts.push(...here.parts);
    recordId = recordId ?? here.recordId;
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
// stopgapId: SG-WEB-voting-relief-approval (the relief dollars are recorded, but no engine credits the president's party for them)
