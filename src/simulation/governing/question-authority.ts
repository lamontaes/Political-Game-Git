import catalog from "../../../data/research/powers-catalog/catalog.json" with { type: "json" };
import questionPowers from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import type { EntityId, World } from "../types";

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
 * what settles it.
 *
 * One rule for every place. The 50 states answer through the catalog's state
 * column, D.C. through its own (the Council also holds the District's city
 * and county powers), the five territories through theirs, and a local
 * government through the county or city column; a consolidated city-county
 * holds both. Every producer that files a bill on a question, and the law in
 * force that reads enacted ones, asks here.
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
}

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
} {
  const catalogRow = world.policyCatalog?.propositions?.[propositionId];
  if (!catalogRow) return { reach: null, dial: null, stableKey: null };
  const row = QUESTIONS[catalogRow.stableKey];
  if (row)
    return {
      reach: row.levels,
      dial: row.dial,
      stableKey: catalogRow.stableKey,
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
  world: Pick<World, "policyCatalog" | "jurisdictions">,
  jurisdictionId: EntityId,
  propositionId: EntityId,
): QuestionAuthority {
  const levels = jurisdictionPowersLevels(world, jurisdictionId);
  const { reach, dial, stableKey } = questionReach(world, propositionId);
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

/** Whether a jurisdiction's law may answer the question at all. */
export function mayAnswerQuestion(
  world: Pick<World, "policyCatalog" | "jurisdictions">,
  jurisdictionId: EntityId,
  propositionId: EntityId,
): boolean {
  return questionAuthority(world, jurisdictionId, propositionId).may !== "no";
}

/** The mapped row for a qualified question key, for checks and reports. */
export function questionPowersRow(
  stableKey: string,
): QuestionPowersRow | undefined {
  return QUESTIONS[stableKey];
}

/** Every question key the powers file maps. */
export const QUESTION_POWERS_KEYS: readonly string[] = Object.keys(QUESTIONS);
