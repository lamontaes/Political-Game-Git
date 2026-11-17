/**
 * The century's law in force (owner, Nov 17, 2026, CTO line 6935086070 on #9747: "History is pure
 * simulation from 1925 ... That includes Presidents, Congress, governors, legislatures, party
 * control and laws"; History's family 4 plan). After each November the bodies the century elected
 * sit a session, and on each policy question each chamber votes by the one stance rule every
 * played legislator votes by (officials-roster.ts `memberSupportAt`). A law changes only when every
 * chamber passes the change and the executive signs it, or the chambers override the veto. What a
 * member supports comes from where they stand: their party's typical position in the body, moved
 * by how far their own seat stands from their party's other seats (`expectedIdeal`), never a roll.
 *
 * Sessions are the only process (stopgap SG-HIST-century-law-sessions): every question comes up
 * each session, with no drafting, committee or leadership, until the century runs the bill engine
 * for the played town's state.
 */
import { campaignParameter } from "./campaign-data";
import {
  expectedIdeal,
  memberSupportAt,
  stanceLean,
} from "./modules/officials";
import { POLICY_QUESTIONS } from "./modules/laws";

/** A law the century's bodies enacted or repealed: the last change on one question at one place. */
export interface CenturyLaw {
  /** `century:law:<place>:<question>:<year>`. */
  readonly id: string;
  /** `US` for the nation, `US-XX` for a state. */
  readonly place: string;
  readonly question: string;
  /** The year the session sat (the one after its November). */
  readonly year: number;
  /** 1: in force; 0: repealed. */
  readonly value: 0 | 1;
  /** Each chamber's votes for the change, and against it. */
  readonly chambers: readonly {
    readonly chamber: string;
    readonly yes: number;
    readonly no: number;
  }[];
  /** The executive's side: the governor's, or for the nation the President's. */
  readonly signerSide: number;
  /** The executive vetoed it, and the chambers overrode the veto. */
  readonly overridden: boolean;
}

/** One chamber at a session: its members' sides and where their seats stand (-1 left to 1 right). */
export interface SessionChamber {
  readonly chamber: string;
  readonly body: "us-house" | "us-senate" | "legislature";
  readonly members: readonly { readonly side: number; readonly lean: number }[];
}

const FEDERAL_PREFIX = "us-federal-positions:";

let questionLists: { federal: string[]; state: string[] } | undefined;
/** The policy questions a body of each level decides: the nation's federal ones, a state's the rest. */
export function sessionQuestions(federal: boolean): readonly string[] {
  questionLists ??= (() => {
    const all = Object.keys(POLICY_QUESTIONS).sort();
    return {
      federal: all.filter((q) => q.startsWith(FEDERAL_PREFIX)),
      state: all.filter((q) => !q.startsWith(FEDERAL_PREFIX)),
    };
  })();
  return federal ? questionLists.federal : questionLists.state;
}

/** Each member's lean on the voters' scale, sorted, from their party's typical position and their seat. */
function memberLeans(chamber: SessionChamber): number[] {
  const bySide = new Map<number, number[]>();
  for (const member of chamber.members)
    (
      bySide.get(member.side) ?? bySide.set(member.side, []).get(member.side)!
    ).push(member.lean);
  const stats = new Map<number, { mean: number; sd: number }>();
  for (const [side, leans] of bySide) {
    const mean = leans.reduce((a, b) => a + b, 0) / leans.length;
    const sd = Math.sqrt(
      leans.reduce((a, b) => a + (b - mean) ** 2, 0) / leans.length,
    );
    stats.set(side, { mean, sd });
  }
  return chamber.members
    .map((member) => {
      const { mean, sd } = stats.get(member.side)!;
      const z = sd > 0 ? (member.lean - mean) / sd : 0;
      return stanceLean(
        expectedIdeal(
          member.side > 0 ? "republican" : "democratic",
          chamber.body,
          z,
        ),
      );
    })
    .sort((a, b) => a - b);
}

/** How many sorted leans `x` satisfy `g x + h > 0`. */
function countFor(sorted: readonly number[], g: number, h: number): number {
  if (g === 0) return h > 0 ? sorted.length : 0;
  const cut = -h / g;
  // The first index whose lean is above the cut (or, with g < 0, not below it).
  let lo = 0,
    hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (g > 0 ? sorted[mid]! <= cut : sorted[mid]! < cut) lo = mid + 1;
    else hi = mid;
  }
  return g > 0 ? sorted.length - lo : lo;
}

/**
 * One session of a place's bodies after a November (`year`): on each question the chambers vote
 * to change the law in force (enact what is not in force, repeal what is); a change every chamber
 * passes takes force when the executive signs it or every chamber overrides the veto at the
 * body's override share. Each change replaces the place's record for that question.
 */
export function lawSession(
  place: string,
  year: number,
  chambers: readonly SessionChamber[],
  executiveSide: number,
  questions: readonly string[],
  laws: Map<string, CenturyLaw>,
): void {
  if (!chambers.length || chambers.some((c) => !c.members.length)) return;
  const leans = chambers.map(memberLeans);
  const executive = stanceLean(
    expectedIdeal(
      executiveSide > 0 ? "republican" : "democratic",
      "executive",
      0,
    ),
  );
  const override = campaignParameter("vetoOverrideShare");
  for (const question of questions) {
    const key = `${place}|${question}`;
    const current = laws.get(key)?.value ?? 0;
    // Support for "yes" is linear in a member's lean: f0 + slope x.
    const f0 = memberSupportAt(0, question);
    const slope = memberSupportAt(1, question) - f0;
    // For the change: enact (support above zero) or repeal (below).
    const direction = current === 1 ? -1 : 1;
    const votes = leans.map((sorted) => {
      const yes = countFor(sorted, direction * slope, direction * f0);
      return { yes, no: sorted.length - yes };
    });
    if (votes.some((v, i) => v.yes * 2 <= leans[i]!.length)) continue;
    const signs = direction * (f0 + slope * executive) > 0;
    const overridden =
      !signs &&
      votes.every((v, i) => v.yes >= Math.ceil(override * leans[i]!.length));
    if (!signs && !overridden) continue;
    const sat = year + 1;
    laws.set(key, {
      id: `century:law:${place}:${question}:${sat}`,
      place,
      question,
      year: sat,
      value: direction > 0 ? 1 : 0,
      chambers: chambers.map((c, i) => ({
        chamber: c.chamber,
        yes: votes[i]!.yes,
        no: votes[i]!.no,
      })),
      signerSide: executiveSide,
      overridden,
    });
  }
}
