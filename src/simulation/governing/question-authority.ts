import catalog from "../../../data/research/powers-catalog/catalog.json" with { type: "json" };
import questionPowers from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";
import { lawInForce } from "./law-in-force";

/**
 * WHICH LEVEL MAY ANSWER A POLICY QUESTION.
 *
 * A level of government answers a question in the policy catalog only when
 * two things hold:
 *
 * - the question is that level's own (`question-powers.json`): "Should the
 *   state levy a personal income tax?" is the state's, however much a city
 *   may tax; and
 * - the powers catalog (`catalog.json`) does not say "no" for the dial the
 *   answer turns, at that level.
 *
 * Where the catalog says UNKNOWN or "varies by state", the level may act and
 * its authority stays unsettled: unknown is neither permission nor refusal
 * (Decision Register, Sept. 22), and the research question in the catalog is
 * what settles it. A county or city power the catalog leaves UNKNOWN to
 * "home rule or Dillon's rule" is settled by the state's law in force on
 * home rule (`broaden-local-authority`), so a state that adopts or repeals
 * home rule widens or narrows what its towns may pass.
 *
 * One rule for every place. The 50 states answer through the catalog's state
 * column, D.C. through its own (the Council also holds the District's city
 * and county powers), the five territories through theirs, and a local
 * government through the county or city column; a consolidated city-county
 * holds both. Every producer that files a bill on a question, and the law in
 * force that reads enacted ones, asks here.
 *
 * A local question may also be gated by a state question (`gate`): a city's
 * own minimum wage waits on whether its state lets cities set one. The gate
 * reads the state's law in force on that day, so a state that later bars its
 * towns ends their ordinances' force, and one that frees them opens the way.
 */

/** A column of the powers catalog. */
export type PowersLevel =
  | "federal"
  | "state"
  | "dc"
  | "territory"
  | "county"
  | "city"
  | "school-district"
  | "special-district";

/** Whose law a question is about, in `question-powers.json`. */
export type QuestionReach =
  "federal" | "state" | "county" | "city" | "school-district";

export type QuestionAuthorityVerdict = "yes" | "unknown" | "no";

export interface QuestionAuthority {
  readonly may: QuestionAuthorityVerdict;
  /** The catalog columns the jurisdiction answers through; empty if unknown. */
  readonly levels: readonly PowersLevel[];
  /** The powers-catalog dial the question turns, where it is mapped. */
  readonly dial: string | null;
  /** Developer wording; never shown on a player screen. */
  readonly reason: string;
}

interface QuestionPowersRow {
  readonly dial: string;
  readonly levels: readonly QuestionReach[];
  readonly why?: string;
  /**
   * The state question that decides whether a county or city may act at
   * all. "always": the question asks whether localities may act, so a state
   * "no" bars them and a "yes" settles that they may. "when-preempting": only
   * a state "no" that says it preempts bars them.
   */
  readonly gate?: {
    readonly question: string;
    readonly noBars: "always" | "when-preempting";
  };
}

/** The world a gate reads: the catalog, the places, and the law's history. */
type AuthorityWorld = Pick<World, "policyCatalog" | "jurisdictions"> &
  Partial<Pick<World, "history" | "currentDate">>;

interface CatalogCell {
  readonly may: string;
}

const QUESTIONS = questionPowers.questions as unknown as Readonly<
  Record<string, QuestionPowersRow>
>;

const DIALS: ReadonlyMap<
  string,
  Readonly<Record<string, CatalogCell>>
> = new Map(
  (
    catalog.dials as unknown as readonly {
      readonly id: string;
      readonly levels: Readonly<Record<string, CatalogCell>>;
    }[]
  ).map((dial) => [dial.id, dial.levels]),
);

/** The question keys each level's column counts as its own. */
const REACH_OF: Readonly<Record<PowersLevel, readonly QuestionReach[]>> = {
  federal: ["federal"],
  state: ["state"],
  territory: ["state"],
  // The Council is the District's legislature and its city council at once.
  dc: ["state", "county", "city"],
  county: ["county"],
  city: ["city"],
  "school-district": ["school-district"],
  "special-district": [],
};

/** The policy vocabulary's level names, in the catalog's words. */
const ISSUE_LEVEL_REACH: Readonly<Record<string, QuestionReach>> = {
  federal: "federal",
  state: "state",
  county: "county",
  municipality: "city",
  "school-district": "school-district",
};

const TERRITORIES = new Set(["PR", "GU", "VI", "AS", "MP"]);

/**
 * Each state-level jurisdiction's column. Built on first use: the places it
 * reads are not ready while modules load.
 */
let stateColumns: ReadonlyMap<EntityId, PowersLevel> | null = null;
function stateColumnOf(jurisdictionId: EntityId): PowersLevel | undefined {
  stateColumns ??= new Map(
    Object.keys(STATES).flatMap((usps): [EntityId, PowersLevel][] => {
      const id = stateJurisdictionForKey(`US-${usps}`)?.id;
      if (!id) return [];
      return [
        [
          id,
          usps === "DC" ? "dc" : TERRITORIES.has(usps) ? "territory" : "state",
        ],
      ];
    }),
  );
  return stateColumns.get(jurisdictionId);
}

const levelsCache = new Map<EntityId, readonly PowersLevel[]>();

/**
 * The catalog columns a jurisdiction's own law is made under: the United
 * States, a state, D.C., a territory, or a local government. Empty when the
 * jurisdiction is not a place the game knows.
 */
export function jurisdictionPowersLevels(
  world: Pick<World, "jurisdictions"> | null,
  jurisdictionId: EntityId,
): readonly PowersLevel[] {
  const cached = levelsCache.get(jurisdictionId);
  if (cached) return cached;
  const levels = computeLevels(world, jurisdictionId);
  // An unknown jurisdiction is not remembered: a later world may know it.
  if (levels.length > 0) levelsCache.set(jurisdictionId, levels);
  return levels;
}

function computeLevels(
  world: Pick<World, "jurisdictions"> | null,
  jurisdictionId: EntityId,
): readonly PowersLevel[] {
  if (jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id) return ["federal"];
  const column = stateColumnOf(jurisdictionId);
  if (column) return [column];
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  // Washington is the District: no city government sits under the Council.
  if (place?.stateJurisdictionKey === "US-DC") return ["dc"];
  const kind =
    world?.jurisdictions?.[jurisdictionId]?.kind ??
    place?.context.jurisdiction.kind ??
    null;
  if (!kind) return [];
  if (kind === "census-county") return ["county"];
  if (kind.includes("city-county")) return ["county", "city"];
  return ["city"];
}

/** The levels whose own law answers the question, and the dial it turns. */
function questionReach(
  world: Pick<World, "policyCatalog">,
  propositionId: EntityId,
): {
  readonly reach: readonly QuestionReach[] | null;
  readonly dial: string | null;
  readonly stableKey: string | null;
  readonly gate?: QuestionPowersRow["gate"];
} {
  const catalogRow = world.policyCatalog?.propositions?.[propositionId];
  if (!catalogRow) return { reach: null, dial: null, stableKey: null };
  const row = QUESTIONS[catalogRow.stableKey];
  if (row)
    return {
      reach: row.levels,
      dial: row.dial,
      stableKey: catalogRow.stableKey,
      gate: row.gate,
    };
  // A question the powers file does not map (a fixture's, or a later pack's):
  // its issue's levels say whose it is, and no dial is known.
  const issueLevels =
    world.policyCatalog?.issues?.[catalogRow.issueId]?.levels ?? [];
  return {
    reach: issueLevels.length
      ? issueLevels.flatMap((level) => {
          const reach = ISSUE_LEVEL_REACH[level];
          return reach ? [reach] : [];
        })
      : null,
    dial: null,
    stableKey: catalogRow.stableKey,
  };
}

function cellVerdict(cell: CatalogCell | undefined): QuestionAuthorityVerdict {
  if (!cell) return "unknown";
  if (cell.may === "yes" || cell.may === "limited") return "yes";
  if (cell.may === "no") return "no";
  return "unknown";
}

/**
 * Whether the jurisdiction's own law may answer the question: "yes" where the
 * question is its own and the catalog grants the power, "unknown" where the
 * question is its own and the catalog has not settled the power, "no" where
 * the question belongs to another level or the catalog withholds the power.
 */
export function questionAuthority(
  world: AuthorityWorld,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate?: IsoDate,
): QuestionAuthority {
  const levels = jurisdictionPowersLevels(world, jurisdictionId);
  const { reach, dial, stableKey, gate } = questionReach(world, propositionId);
  if (reach === null || levels.length === 0)
    return {
      may: "unknown",
      levels,
      dial,
      reason:
        reach === null
          ? "No level is recorded for this question."
          : "This jurisdiction's level of government is not known.",
    };
  const own = levels.filter((level) =>
    REACH_OF[level].some((kind) => reach.includes(kind)),
  );
  if (own.length === 0)
    return {
      may: "no",
      levels,
      dial,
      reason: `${stableKey} is answered by ${reach.join(", ")} law, not ${levels.join(" or ")} law.`,
    };
  if (!dial)
    return {
      may: "unknown",
      levels,
      dial,
      reason: "The question turns no dial the powers catalog maps.",
    };
  const cells = DIALS.get(dial);
  const verdicts = own.map((level) => cellVerdict(cells?.[level]));
  const may: QuestionAuthorityVerdict = verdicts.includes("yes")
    ? "yes"
    : verdicts.includes("unknown")
      ? "unknown"
      : "no";
  const gated =
    gate && may !== "no" && own.every((l) => l === "county" || l === "city")
      ? stateGate(world, jurisdictionId, gate, onDate)
      : null;
  if (gated)
    return {
      may: gated.may,
      levels,
      dial,
      reason: gated.reason,
    };
  const homeRule =
    may === "unknown" &&
    own.every(
      (level) =>
        (level === "county" || level === "city") &&
        cells?.[level]?.may === "UNKNOWN",
    )
      ? homeRuleVerdict(world, jurisdictionId, onDate)
      : null;
  if (homeRule)
    return {
      may: homeRule.may,
      levels,
      dial,
      reason: homeRule.reason,
    };
  return {
    may,
    levels,
    dial,
    reason:
      may === "yes"
        ? `The powers catalog grants ${own.join(" and ")} governments the ${dial} dial.`
        : may === "unknown"
          ? `Whether ${own.join(" and ")} governments hold the ${dial} dial is not settled.`
          : `The powers catalog withholds the ${dial} dial from ${own.join(" and ")} governments.`,
  };
}

/** The state question on home rule: may localities act unless barred? */
export const HOME_RULE_QUESTION =
  "us-policy-positions:government-operations.broaden-local-authority";

/**
 * Whether a county or city holds a power the catalog leaves to "State law:
 * home rule or Dillon's rule". Under home rule (the state's law in force on
 * `broaden-local-authority` says yes), a locality may act on any local matter
 * the state has not withdrawn. Under Dillon's rule (it says no), a locality
 * holds only the powers the legislature grants it, and none is granted for
 * this one. Null where the state's law is not known, which leaves the power
 * unsettled. Starting answers for all 56 places are in the starting-law file.
 */
function homeRuleVerdict(
  world: AuthorityWorld,
  jurisdictionId: EntityId,
  onDate: IsoDate | undefined,
): { readonly may: QuestionAuthorityVerdict; readonly reason: string } | null {
  const stateKey =
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
  const question = Object.values(world.policyCatalog?.propositions ?? {}).find(
    (row) => row.stableKey === HOME_RULE_QUESTION,
  );
  if (!state || !question) return null;
  const law = lawInForce(
    {
      ...world,
      history: world.history ?? ({} as World["history"]),
    } as World,
    state.id,
    question.id,
    onDate ?? world.currentDate,
  );
  if (!law) return null;
  return law.answer === "yes"
    ? {
        may: "yes",
        reason: `${state.name}'s home rule lets its localities act on local matters it has not withdrawn.`,
      }
    : {
        may: "no",
        reason: `${state.name} follows Dillon's rule: its localities hold only the powers its legislature grants, and none is granted for this.`,
      };
}

/**
 * What the state's law in force on the gate question says about its
 * localities acting, or null where it settles nothing either way.
 */
function stateGate(
  world: AuthorityWorld,
  jurisdictionId: EntityId,
  gate: NonNullable<QuestionPowersRow["gate"]>,
  onDate: IsoDate | undefined,
): { readonly may: QuestionAuthorityVerdict; readonly reason: string } | null {
  const stateKey =
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
  const question = Object.values(world.policyCatalog?.propositions ?? {}).find(
    (row) => row.stableKey === gate.question,
  );
  if (!state || !question) return null;
  const law = lawInForce(
    {
      ...world,
      history: world.history ?? ({} as World["history"]),
    } as World,
    state.id,
    question.id,
    onDate ?? world.currentDate,
  );
  if (!law) return null;
  if (law.answer === "yes")
    return gate.noBars === "always"
      ? { may: "yes", reason: `${state.name}'s law lets its localities act.` }
      : null;
  if (gate.noBars === "always" || law.preempts === true)
    return {
      may: "no",
      reason: `${state.name}'s law bars its localities from acting on this.`,
    };
  return null;
}

/** Whether a jurisdiction's law may answer the question at all. */
export function mayAnswerQuestion(
  world: AuthorityWorld,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate?: IsoDate,
): boolean {
  return (
    questionAuthority(world, jurisdictionId, propositionId, onDate).may !== "no"
  );
}

/** The mapped row for a qualified question key, for checks and reports. */
export function questionPowersRow(
  stableKey: string,
): QuestionPowersRow | undefined {
  return QUESTIONS[stableKey];
}

/** Every question key the powers file maps. */
export const QUESTION_POWERS_KEYS: readonly string[] = Object.keys(QUESTIONS);
