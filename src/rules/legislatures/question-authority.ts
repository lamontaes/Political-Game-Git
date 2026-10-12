import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  PolicyCatalog,
} from "../../simulation/types";
/** Laws are another engine's dated output; this kernel owns the level, gate and home-rule verdict. */
export interface QuestionAuthorityFacts {
  readonly onDate: IsoDate;
  readonly policyCatalog: PolicyCatalog;
  readonly questions: Readonly<Record<string, QuestionPowersRow>>;
  readonly dials: ReadonlyMap<string, Readonly<Record<string, CatalogCell>>>;
  readonly federalJurisdictionId: EntityId;
  readonly stateKinds: ReadonlyMap<EntityId, string>;
  readonly placeContexts: ReadonlyMap<
    EntityId,
    {
      readonly stateJurisdictionKey: string | null;
      readonly kind: string | null;
    }
  >;
  readonly federalDistrictStateKeys: ReadonlySet<string>;
  readonly jurisdictionKinds: ReadonlyMap<EntityId, string>;
  readonly cachedLevels: ReadonlyMap<EntityId, readonly PowersLevel[]>;
  readonly stateKeys: ReadonlyMap<EntityId, string>;
  readonly states: ReadonlyMap<
    string,
    { readonly id: EntityId; readonly name: string }
  >;
  readonly laws: ReadonlyMap<
    string,
    { readonly answer: "yes" | "no"; readonly preempts?: boolean }
  >;
}
export type PowersLevel =
  | "federal"
  | "state"
  | "dc"
  | "territory"
  | "county"
  | "city"
  | "school-district"
  | "special-district";

export type QuestionReach =
  "federal" | "state" | "county" | "city" | "school-district";

export type QuestionAuthorityVerdict = "yes" | "unknown" | "no";

export interface QuestionAuthority {
  readonly may: QuestionAuthorityVerdict;
  readonly levels: readonly PowersLevel[];
  readonly dial: string | null;
  readonly reason: string;
}

interface QuestionPowersRow {
  readonly dial: string;
  readonly levels: readonly QuestionReach[];
  readonly why?: string;
  readonly gate?: {
    readonly question: string;
    readonly noBars: "always" | "when-preempting";
  };
}

interface CatalogCell {
  readonly may: string;
  readonly status?: string;
}

const REACH_OF: Readonly<Record<PowersLevel, readonly QuestionReach[]>> = {
  federal: ["federal"],
  state: ["state"],
  territory: ["state"],
  dc: ["state", "county", "city"],
  county: ["county"],
  city: ["city"],
  "school-district": ["school-district"],
  "special-district": [],
};

const ISSUE_LEVEL_REACH: Readonly<Record<string, QuestionReach>> = {
  federal: "federal",
  state: "state",
  county: "county",
  municipality: "city",
  "school-district": "school-district",
};

function questionReach(
  facts: QuestionAuthorityFacts,
  propositionId: EntityId,
): {
  readonly reach: readonly QuestionReach[] | null;
  readonly dial: string | null;
  readonly stableKey: string | null;
  readonly gate?: QuestionPowersRow["gate"];
} {
  const catalogRow = facts.policyCatalog?.propositions?.[propositionId];
  if (!catalogRow) return { reach: null, dial: null, stableKey: null };
  const row = facts.questions[catalogRow.stableKey];
  if (row)
    return {
      reach: row.levels,
      dial: row.dial,
      stableKey: catalogRow.stableKey,
      gate: row.gate,
    };
  const issueLevels =
    facts.policyCatalog?.issues?.[catalogRow.issueId]?.levels ?? [];
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

export function questionAuthority(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate?: IsoDate,
  cutoff?: HistoricalCutoff,
): QuestionAuthority {
  const levels = jurisdictionPowersLevels(facts, jurisdictionId);
  const { reach, dial, stableKey, gate } = questionReach(facts, propositionId);
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
  const cells = facts.dials.get(dial);
  const verdicts = own.map((level) => cellVerdict(cells?.[level]));
  const may: QuestionAuthorityVerdict = verdicts.includes("yes")
    ? "yes"
    : verdicts.includes("unknown")
      ? "unknown"
      : "no";
  const gated =
    gate && may !== "no" && own.every((l) => l === "county" || l === "city")
      ? stateGate(facts, jurisdictionId, gate, onDate, cutoff)
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
        leftToStateLaw(cells?.[level]),
    )
      ? homeRuleVerdict(facts, jurisdictionId, onDate, cutoff)
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

function leftToStateLaw(
  cell:
    | {
        readonly may: string;
        readonly status?: string;
      }
    | undefined,
): boolean {
  return (
    cell?.may === "UNKNOWN" ||
    (cell?.may === "varies by state" && cell.status === "game-profile")
  );
}

export const HOME_RULE_QUESTION =
  "us-policy-positions:government-operations.broaden-local-authority";

function homeRuleVerdict(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
  onDate: IsoDate | undefined,
  cutoff?: HistoricalCutoff,
): {
  readonly may: QuestionAuthorityVerdict;
  readonly reason: string;
} | null {
  void onDate;
  void cutoff; // Law facts are selected for the caller’s requested cutoff.
  const stateKey = facts.stateKeys.get(jurisdictionId);
  const state = stateKey ? facts.states.get(stateKey) : null;
  const question = Object.values(facts.policyCatalog?.propositions ?? {}).find(
    (row) => row.stableKey === HOME_RULE_QUESTION,
  );
  if (!state || !question) return null;
  const law = facts.laws.get(`${state.id}:${question.id}`) ?? null;
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

function stateGate(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
  gate: NonNullable<QuestionPowersRow["gate"]>,
  onDate: IsoDate | undefined,
  cutoff?: HistoricalCutoff,
): {
  readonly may: QuestionAuthorityVerdict;
  readonly reason: string;
} | null {
  void onDate;
  void cutoff; // Law facts are selected for the caller’s requested cutoff.
  const stateKey = facts.stateKeys.get(jurisdictionId);
  const state = stateKey ? facts.states.get(stateKey) : null;
  const question = Object.values(facts.policyCatalog?.propositions ?? {}).find(
    (row) => row.stableKey === gate.question,
  );
  if (!state || !question) return null;
  const law = facts.laws.get(`${state.id}:${question.id}`) ?? null;
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

export function mayAnswerQuestion(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate?: IsoDate,
  cutoff?: HistoricalCutoff,
): boolean {
  return (
    questionAuthority(facts, jurisdictionId, propositionId, onDate, cutoff)
      .may !== "no"
  );
}

export function jurisdictionPowersLevels(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
): readonly PowersLevel[] {
  return (
    facts.cachedLevels.get(jurisdictionId) ??
    computeLevels(facts, jurisdictionId)
  );
}
function computeLevels(
  facts: QuestionAuthorityFacts,
  jurisdictionId: EntityId,
): readonly PowersLevel[] {
  if (jurisdictionId === facts.federalJurisdictionId) return ["federal"];
  const kindOfState = facts.stateKinds.get(jurisdictionId);
  const column: PowersLevel | undefined =
    kindOfState === "federal-district"
      ? "dc"
      : kindOfState === "state" || kindOfState === "territory"
        ? kindOfState
        : undefined;
  if (column) return [column];
  const place = facts.placeContexts.get(jurisdictionId);
  if (
    place?.stateJurisdictionKey &&
    facts.federalDistrictStateKeys.has(place.stateJurisdictionKey)
  )
    return ["dc"];
  const kind =
    facts.jurisdictionKinds.get(jurisdictionId) ?? place?.kind ?? null;
  if (!kind) return [];
  if (kind === "census-county") return ["county"];
  if (kind.includes("city-county")) return ["county", "city"];
  return ["city"];
}
