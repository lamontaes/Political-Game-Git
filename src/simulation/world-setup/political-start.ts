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
import {
  clampShare,
  logistic,
  logit,
  openUniform,
  roundTo,
  standardNormal,
} from "./deterministic-math";
import { worldSetupRng } from "./conditions";
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
  readonly regime: StartingRegime;
  readonly nationalSwingPp: number;
  readonly regionSwingPp: Readonly<Record<CensusRegion, number>>;
  readonly stateSwingPp: Readonly<Record<string, number>>;
}

/** Every effect zero: the diagnostic that must reconstruct the input rows. */
export function zeroPoliticalLatents(regime: StartingRegime): PoliticalLatents {
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

/** Shared national, Census-region and state effects: never independent flips. */
export function drawPoliticalLatents(
  world: World,
  regime: StartingRegime,
): PoliticalLatents {
  const policy = CRUNCH46_POLICY.political;
  const national =
    policy.nationalSwingSd[regime] *
    standardNormal(worldSetupRng(world, "politics:national"));
  const regionSwingPp = Object.fromEntries(
    CENSUS_REGION_ORDER.map((region) => [
      region,
      roundTo(
        policy.censusRegionResidualSd[regime] *
          standardNormal(worldSetupRng(world, `politics:region:${region}`)),
      ),
    ]),
  ) as Record<CensusRegion, number>;
  const stateSwingPp = Object.fromEntries(
    censusRegionStates().map((usps) => [
      usps,
      roundTo(
        policy.stateResidualSd[regime] *
          standardNormal(worldSetupRng(world, `politics:state:${usps}`)),
      ),
    ]),
  );
  return {
    regime,
    nationalSwingPp: roundTo(national),
    regionSwingPp,
    stateSwingPp,
  };
}

function sharedSwing(latents: PoliticalLatents, stateUsps: string): number {
  return (
    latents.nationalSwingPp +
    latents.regionSwingPp[censusRegionOf(stateUsps)] +
    (latents.stateSwingPp[stateUsps] ?? 0)
  );
}

function zeroed(latents: PoliticalLatents): boolean {
  return (
    latents.nationalSwingPp === 0 &&
    CENSUS_REGION_ORDER.every(
      (region) => latents.regionSwingPp[region] === 0,
    ) &&
    Object.values(latents.stateSwingPp).every((value) => value === 0)
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

function decide(
  world: World,
  key: string,
  share: number,
): "democratic" | "republican" {
  if (share > 0.5) return "democratic";
  if (share < 0.5) return "republican";
  // An exact tie is a mathematical boundary, resolved by an authored even draw.
  return openUniform(worldSetupRng(world, `tie:${key}`)) < 0.5
    ? "democratic"
    : "republican";
}

/**
 * One contest's starting affiliation.
 *
 * With a certified two-major-party margin the shared swings and this contest's
 * own residual move the share. Without one the office's recorded affiliation
 * is preserved exactly, with the compiler's reason for the missing margin: a
 * bounded calibration limitation, never a substituted number from another
 * office and never an invented neutral share.
 */
export function generateContest(
  world: World,
  latents: PoliticalLatents,
  row: CalibrationRow,
): GeneratedSeatCondition {
  const policy = CRUNCH46_POLICY.political;
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
  // Rounded before use, so a later reader recomputing from the saved record
  // lands on exactly the saved share.
  const residual = zeroed(latents)
    ? 0
    : roundTo(
        policy.seatResidualSd[latents.regime] *
          standardNormal(
            worldSetupRng(world, `politics:seat:${row.contestKey}`),
          ),
      );
  const generated = applySwing(
    baselineShare,
    sharedSwing(latents, row.stateUsps) + residual,
  );
  const affiliation = decide(world, row.contestKey, generated);
  return {
    seatKey: row.contestKey,
    baselineKind: "certified-two-party",
    baselineShare: roundTo(baselineShare),
    seatResidualPp: residual,
    generatedShare: roundTo(generated),
    affiliation,
    caucus: affiliation,
    referenceWinner: reference,
    uncertaintyReason: null,
  };
}

const UNIT_RULE_NOTE =
  "Statewide electors follow the generated statewide presidential share. Maine and Nebraska award district electors separately, but this compiled source has no certified presidential result by congressional district, so those electors follow their state's generated result and are recorded as an unmet unit-rule input. A House district's vote share is not a presidential vote share and is not used here.";

export function generatePresidency(
  world: World,
  latents: PoliticalLatents,
): GeneratedPresidency {
  const electoralVotes: Record<string, number> = {};
  const stateWinners: Record<string, string> = {};
  const add = (party: string, votes: number) => {
    electoralVotes[party] = (electoralVotes[party] ?? 0) + votes;
  };
  for (const usps of Object.keys(ELECTORAL_ALLOCATION).sort()) {
    const row = calibrationRow(`us-president:${usps}`);
    const baseline = row?.democraticTwoPartyShare ?? null;
    const winner =
      baseline === null
        ? (row?.referenceAffiliation ?? decide(world, `president:${usps}`, 0.5))
        : decide(
            world,
            `president:${usps}`,
            applySwing(baseline, sharedSwing(latents, usps)),
          );
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
  regime: StartingRegime,
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
    presidency: generatePresidency(world, latents),
  };
}

export function generatePoliticalStartingConditions(
  world: World,
  regime: StartingRegime,
): Draft {
  return conditionsFor(world, regime, drawPoliticalLatents(world, regime));
}

/**
 * The zero-perturbation diagnostic: with every effect zero the generated
 * world must reconstruct the compiled input identities and affiliations.
 * Normal saves are not required to copy them.
 */
export function referenceReconstruction(
  world: World,
  regime: StartingRegime = "near-reference",
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
