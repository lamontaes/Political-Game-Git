import houseCohortJson from "./house-opening-cohort.generated.json" with { type: "json" };
import { worldSetupRng } from "./conditions";
import { canonicalJson } from "../canonical-json";
import { ELECTORAL_ALLOCATION } from "../national-election-rules";
import { sha256Hex } from "../sha256";
import type { World } from "../types";
import calibrationJson from "./electoral-calibration.generated.json" with { type: "json" };
import {
  CENSUS_REGION_ORDER,
  censusRegionOf,
  censusRegionStates,
} from "./census-regions";
import type { CensusRegion } from "./census-regions";
import { clampShare, logistic, logit, roundTo } from "./deterministic-math";
import { CRUNCH46_POLICY } from "./policy";
import type {
  GeneratedPresidency,
  GeneratedSeatCondition,
  PoliticalStartingConditionsRecord,
  StartingRegime,
} from "./types";

/**
 * Compiled reference observations (political-geography-v1).
 *
 * Every office keeps its own evidence. A state presidential result is not a
 * House district result and not a governor result, so nothing here ever
 * borrows one office's margin for another (CRUNCH47 C1). Where the compiled
 * source has no two-major-party margin, the row carries the office's recorded
 * affiliation and the reason the margin is missing, and this initializer
 * preserves that affiliation instead of inventing a number for it.
 */
export type CalibrationOffice =
  "us-house" | "us-senate" | "us-president" | "state-governor";

export interface CalibrationRow {
  readonly office: CalibrationOffice;
  readonly contestKey: string;
  readonly stateUsps: string;
  readonly referenceDate: string;
  readonly referenceAffiliation: string | null;
  readonly observedContestType: string;
  readonly totalVotes: number | null;
  readonly twoPartyMargin: number | null;
  readonly democraticTwoPartyShare: number | null;
  readonly sourceRef: string;
  readonly uncertaintyReason: string | null;
}

export interface ElectoralCalibration {
  readonly schema: string;
  readonly asOfDate: string;
  readonly calibrationRows: readonly CalibrationRow[];
  /** Each state's certified 2024 presidential ballots, by the party printed. */
  readonly presidentialByState?: readonly {
    readonly stateUsps: string;
    readonly totalVotes: number | null;
    readonly totalsByParty: Readonly<Record<string, number>>;
  }[];
}

export const ELECTORAL_CALIBRATION =
  calibrationJson as unknown as ElectoralCalibration;

let calibrationDigest: string | null = null;
export function electoralCalibrationSha256(): string {
  calibrationDigest ??= sha256Hex(canonicalJson(ELECTORAL_CALIBRATION));
  return calibrationDigest;
}

const MAJOR = new Set(["democratic", "republican"]);

export function calibrationRows(
  office: CalibrationOffice,
): readonly CalibrationRow[] {
  return ELECTORAL_CALIBRATION.calibrationRows.filter(
    (row) => row.office === office,
  );
}

export function calibrationRow(contestKey: string): CalibrationRow | null {
  return (
    ELECTORAL_CALIBRATION.calibrationRows.find(
      (row) => row.contestKey === contestKey,
    ) ?? null
  );
}

/**
 * Caucus of the non-major members the certified record seats, as the Senate's
 * own party-division page lists them. Affiliation stays their own.
 */
export const RETAINED_CAUCUS_SOURCE =
  "https://www.senate.gov/history/partydiv.htm";
const RETAINED_CAUCUS: Readonly<Record<string, string>> = {
  "us-senate:ME:class-1": "democratic",
  "us-senate:VT:class-1": "democratic",
};

export interface PoliticalLatents {
  readonly regime: StartingRegime | null;
  readonly nationalSwingPp: number;
  readonly regionSwingPp: Readonly<Record<CensusRegion, number>>;
  readonly stateSwingPp: Readonly<Record<string, number>>;
}

/** Every effect zero: the diagnostic that must reconstruct the input rows. */
export function zeroPoliticalLatents(
  regime: StartingRegime | null,
): PoliticalLatents {
  return {
    regime,
    nationalSwingPp: 0,
    regionSwingPp: Object.fromEntries(
      CENSUS_REGION_ORDER.map((region) => [region, 0]),
    ) as Record<CensusRegion, number>,
    stateSwingPp: Object.fromEntries(
      censusRegionStates().map((usps) => [usps, 0]),
    ),
  };
}

export function sharedSwing(
  latents: PoliticalLatents,
  stateUsps: string,
): number {
  return (
    latents.nationalSwingPp +
    latents.regionSwingPp[censusRegionOf(stateUsps)] +
    (latents.stateSwingPp[stateUsps] ?? 0)
  );
}

/** Section 13: logit of the baseline, plus swing / 25, then back to a share. */
export function applySwing(baselineShare: number, swingPp: number): number {
  const policy = CRUNCH46_POLICY.political;
  return logistic(
    logit(clampShare(baselineShare, policy.logitEpsilon)) +
      swingPp / policy.swingToLogitDivisor,
  );
}

/** Copies this office's certified share and recorded affiliation without draws. */
export function generateContest(
  _world: World,
  _latents: PoliticalLatents,
  row: CalibrationRow,
): GeneratedSeatCondition {
  const reference = row.referenceAffiliation;
  const caucus = (affiliation: string) =>
    MAJOR.has(affiliation)
      ? affiliation
      : (RETAINED_CAUCUS[row.contestKey] ?? null);
  if (reference !== null && !MAJOR.has(reference)) {
    return {
      seatKey: row.contestKey,
      baselineKind: "retained-non-major",
      baselineShare: null,
      seatResidualPp: null,
      generatedShare: null,
      affiliation: reference,
      caucus: caucus(reference),
      referenceWinner: reference,
      uncertaintyReason: row.uncertaintyReason,
    };
  }
  if (row.democraticTwoPartyShare === null) {
    return {
      seatKey: row.contestKey,
      baselineKind: "reference-affiliation-preserved",
      baselineShare: null,
      seatResidualPp: null,
      generatedShare: null,
      affiliation: reference ?? "unrecorded",
      caucus: reference === null ? null : caucus(reference),
      referenceWinner: reference,
      uncertaintyReason:
        row.uncertaintyReason ?? "no-two-major-party-margin-in-the-source",
    };
  }
  const baselineShare = row.democraticTwoPartyShare;
  const affiliation = reference ?? "unrecorded";
  return {
    seatKey: row.contestKey,
    baselineKind: "certified-two-party",
    baselineShare: roundTo(baselineShare),
    seatResidualPp: 0,
    generatedShare: roundTo(baselineShare),
    affiliation,
    caucus: reference === null ? null : caucus(reference),
    referenceWinner: reference,
    uncertaintyReason: row.uncertaintyReason,
  };
}

const UNIT_RULE_NOTE =
  "Statewide electors follow the recorded statewide presidential winner. Maine and Nebraska award district electors separately, but this compiled source has no certified presidential result by congressional district, so those electors follow their state's recorded result and are recorded as an unmet unit-rule input. A House district's vote share is not a presidential vote share and is not used here.";

export function generatePresidency(): GeneratedPresidency {
  const electoralVotes: Record<string, number> = {};
  const stateWinners: Record<string, string> = {};
  const add = (party: string, votes: number) => {
    electoralVotes[party] = (electoralVotes[party] ?? 0) + votes;
  };
  for (const usps of Object.keys(ELECTORAL_ALLOCATION).sort()) {
    const row = calibrationRow(`us-president:${usps}`);
    const winner = row?.referenceAffiliation ?? "unrecorded";
    stateWinners[usps] = winner;
    add(winner, ELECTORAL_ALLOCATION[usps]!);
  }
  const totalElectors = Object.values(ELECTORAL_ALLOCATION).reduce(
    (sum, value) => sum + value,
    0,
  );
  const majority = Math.floor(totalElectors / 2) + 1;
  const reference = referencePresidentialWinner();
  for (const [party, votes] of Object.entries(electoralVotes)) {
    if (votes >= majority) {
      return {
        baselineKind: "certified-state-presidential",
        electoralVotes,
        winner: party,
        decidedBy: "electoral-majority",
        referenceWinner: reference,
        stateWinners,
        unitRuleNote: UNIT_RULE_NOTE,
      };
    }
  }
  const ranked = Object.entries(electoralVotes).sort((a, b) => b[1] - a[1]);
  return {
    baselineKind: "certified-state-presidential",
    electoralVotes,
    winner: ranked[0]![0],
    decidedBy: "electoral-plurality-no-majority",
    referenceWinner: reference,
    stateWinners,
    unitRuleNote: UNIT_RULE_NOTE,
  };
}

function referencePresidentialWinner(): string | null {
  let democratic = 0;
  let republican = 0;
  for (const [usps, votes] of Object.entries(ELECTORAL_ALLOCATION)) {
    const row = calibrationRow(`us-president:${usps}`);
    if (!row?.referenceAffiliation) return null;
    if (row.referenceAffiliation === "democratic") democratic += votes;
    else republican += votes;
  }
  return democratic > republican ? "democratic" : "republican";
}

/**
 * The affiliation this world's first executive in a state starts with.
 *
 * The compiled window has a dated governor snapshot and no governor contest
 * tally, so this preserves the recorded affiliation. It never reads the
 * state's presidential margin, which belongs to a different office.
 */
export function generateStateExecutiveAffiliation(
  world: World,
  latents: PoliticalLatents,
  stateUsps: string,
): GeneratedSeatCondition {
  const row = calibrationRow(`state-governor:${stateUsps}`);
  if (!row) {
    return {
      seatKey: `state-governor:${stateUsps}`,
      baselineKind: "unrecorded",
      baselineShare: null,
      seatResidualPp: null,
      generatedShare: null,
      affiliation: "unrecorded",
      caucus: null,
      referenceWinner: null,
      uncertaintyReason: "no-governor-row-for-this-state",
    };
  }
  return generateContest(world, latents, row);
}

type Draft = Omit<
  PoliticalStartingConditionsRecord,
  | "id"
  | "sequence"
  | "recordedAt"
  | "effectiveDate"
  | "policyVersion"
  | "provenanceClass"
>;

function conditionsFor(
  world: World,
  regime: StartingRegime | null,
  latents: PoliticalLatents,
): Draft {
  const seats = [
    ...calibrationRows("us-house"),
    ...calibrationRows("us-senate"),
  ]
    .slice()
    .sort((a, b) => a.contestKey.localeCompare(b.contestKey))
    .map((row) => generateContest(world, latents, row));
  return {
    kind: "political-starting-conditions",
    stableKey: "world-setup:crunch46-v1:political-starting-conditions",
    contractVersion: "crunch46-political-start/v1",
    regime,
    calibrationSchema: ELECTORAL_CALIBRATION.schema,
    calibrationSha256: electoralCalibrationSha256(),
    nationalSwingPp: latents.nationalSwingPp,
    regionSwingPp: latents.regionSwingPp,
    stateSwingPp: latents.stateSwingPp,
    seats,
    presidency: generatePresidency(),
  };
}

export function generatePoliticalStartingConditions(
  world: World,
  regime: StartingRegime | null,
): Draft {
  const reference = referenceReconstruction(world, regime);
  // One whole observed House roster is a starting circumstance, selected
  // among retained real options. No seat is independently flipped and no
  // authored swing or probability decides an election or affiliation.
  const cohort = worldSetupRng(world, "politics:observed-house-cohort").pick([
    "current-reference",
    "historical-reference",
  ] as const);
  if (cohort === "current-reference") {
    return {
      ...reference,
      houseOpeningReference: {
        basis: "estimated-from-recorded-cohort",
        electionDate: calibrationRows("us-house")[0]!.referenceDate,
        sourceSha256: electoralCalibrationSha256(),
      },
    };
  }
  const historical = new Map(
    houseCohortJson.seats.map((seat) => [seat.seatKey, seat]),
  );
  return {
    ...reference,
    houseOpeningReference: {
      basis: "estimated-from-recorded-cohort",
      electionDate: houseCohortJson.electionDate,
      sourceSha256: sha256Hex(canonicalJson(houseCohortJson)),
    },
    seats: reference.seats.map((seat) => {
      const recorded = historical.get(seat.seatKey);
      if (!recorded) return seat;
      return {
        ...seat,
        baselineKind: "reference-affiliation-preserved" as const,
        baselineShare: null,
        seatResidualPp: null,
        generatedShare: null,
        affiliation: recorded.affiliation,
        caucus: MAJOR.has(recorded.affiliation) ? recorded.affiliation : null,
        referenceWinner: recorded.affiliation,
        uncertaintyReason: `${houseCohortJson.limitation} Recorded affiliation: ${recorded.sourceRef}; ${recorded.winnerBasis}.`,
      };
    }),
  };
}

/**
 * Reconstructs the compiled input identities, shares and affiliations.
 * The diagnostic always uses the current compiled certified-record projection.
 */
export function referenceReconstruction(
  world: World,
  regime: StartingRegime | null = "near-reference",
): Draft {
  return conditionsFor(world, regime, zeroPoliticalLatents(regime));
}

export function latentsFromRecord(
  record: PoliticalStartingConditionsRecord,
): PoliticalLatents {
  return {
    regime: record.regime,
    nationalSwingPp: record.nationalSwingPp,
    regionSwingPp: record.regionSwingPp,
    stateSwingPp: record.stateSwingPp,
  };
}
