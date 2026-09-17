import { canonicalJson } from "../canonical-json";
import { ELECTORAL_ALLOCATION } from "../national-election-rules";
import { sha256Hex } from "../sha256";
import type { World } from "../types";
import calibrationJson from "./electoral-calibration.generated.json";
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
  SeatBaselineKind,
  StartingRegime,
} from "./types";

/** The compiled reference observations (political-geography-v1). */
export interface CalibrationContest {
  readonly seatKey: string;
  readonly stateUsps: string;
  readonly certifiedWinnerParty: string | null;
  readonly democraticTwoPartyShare: number | null;
  readonly uncontested: boolean;
  readonly ambiguous: boolean;
}

export interface ElectoralCalibration {
  readonly schema: string;
  readonly asOfDate: string;
  readonly house: readonly CalibrationContest[];
  readonly senate: readonly (CalibrationContest & {
    readonly senateClass: 1 | 2 | 3;
  })[];
  readonly presidentialByState: readonly {
    readonly stateUsps: string;
    readonly democraticTwoPartyShare: number | null;
  }[];
  readonly governors: readonly {
    readonly stateUsps: string;
    readonly party: string | null;
    readonly status: string;
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

/** Section 13: logit of the baseline, plus swing / 25, then back to a share. */
export function applySwing(baselineShare: number, swingPp: number): number {
  const policy = CRUNCH46_POLICY.political;
  return logistic(
    logit(clampShare(baselineShare, policy.logitEpsilon)) +
      swingPp / policy.swingToLogitDivisor,
  );
}

const presidentialShare = new Map(
  ELECTORAL_CALIBRATION.presidentialByState.map((row) => [
    row.stateUsps,
    row.democraticTwoPartyShare,
  ]),
);

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

export function generateContest(
  world: World,
  latents: PoliticalLatents,
  contest: CalibrationContest,
  residualKey: string,
): GeneratedSeatCondition {
  const policy = CRUNCH46_POLICY.political;
  const winner = contest.certifiedWinnerParty;
  if (winner !== null && !MAJOR.has(winner)) {
    return {
      seatKey: contest.seatKey,
      baselineKind: "retained-non-major",
      baselineShare: null,
      seatResidualPp: null,
      generatedShare: null,
      affiliation: winner,
      caucus: RETAINED_CAUCUS[contest.seatKey] ?? null,
      referenceWinner: winner,
    };
  }
  let baselineKind: SeatBaselineKind;
  let baselineShare: number;
  if (contest.democraticTwoPartyShare !== null && !contest.ambiguous) {
    baselineKind = "certified-two-party";
    baselineShare = contest.democraticTwoPartyShare;
  } else {
    const proxy = presidentialShare.get(contest.stateUsps) ?? null;
    if (proxy !== null) {
      baselineKind = "state-presidential-proxy";
      baselineShare = proxy;
    } else {
      baselineKind = "authored-neutral";
      baselineShare = 0.5;
    }
  }
  // Rounded before use, so a later reader recomputing from the saved record
  // lands on exactly the saved share.
  const residual = roundTo(
    policy.seatResidualSd[latents.regime] *
      standardNormal(worldSetupRng(world, `politics:seat:${residualKey}`)),
  );
  const generated = applySwing(
    baselineShare,
    sharedSwing(latents, contest.stateUsps) + residual,
  );
  const affiliation = decide(world, contest.seatKey, generated);
  return {
    seatKey: contest.seatKey,
    baselineKind,
    baselineShare: roundTo(baselineShare),
    seatResidualPp: roundTo(residual),
    generatedShare: roundTo(generated),
    affiliation,
    caucus: affiliation,
    referenceWinner: winner,
  };
}

const UNIT_RULE_NOTE =
  "Statewide electors follow the generated statewide presidential share. Maine and Nebraska district electors follow the generated House two-party share of the same district: the compiled source has no certified district presidential result, so this is a labeled proxy.";

export function generatePresidency(
  world: World,
  latents: PoliticalLatents,
  seats: readonly GeneratedSeatCondition[],
): GeneratedPresidency {
  const electoralVotes: Record<string, number> = {};
  const stateWinners: Record<string, string> = {};
  const add = (party: string, votes: number) => {
    electoralVotes[party] = (electoralVotes[party] ?? 0) + votes;
  };
  const houseByKey = new Map(seats.map((seat) => [seat.seatKey, seat]));
  for (const usps of Object.keys(ELECTORAL_ALLOCATION).sort()) {
    const baseline = presidentialShare.get(usps) ?? null;
    const share =
      baseline === null
        ? 0.5
        : applySwing(baseline, sharedSwing(latents, usps));
    const winner = decide(world, `president:${usps}`, share);
    stateWinners[usps] = winner;
    const total = ELECTORAL_ALLOCATION[usps]!;
    if (usps === "ME" || usps === "NE") {
      add(winner, 2);
      for (let district = 1; district <= total - 2; district += 1) {
        const seat = houseByKey.get(
          `us-house:${usps}-${String(district).padStart(2, "0")}`,
        );
        add(seat && MAJOR.has(seat.affiliation) ? seat.affiliation : winner, 1);
      }
    } else {
      add(winner, total);
    }
  }
  const totalElectors = Object.values(ELECTORAL_ALLOCATION).reduce(
    (sum, value) => sum + value,
    0,
  );
  const majority = Math.floor(totalElectors / 2) + 1;
  const reference = ELECTORAL_CALIBRATION.presidentialByState.length
    ? referencePresidentialWinner()
    : null;
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
  // Twelfth Amendment: one vote per state delegation, majority of states.
  const delegations: Record<string, number> = {};
  const byState = new Map<string, Record<string, number>>();
  for (const seat of seats) {
    if (!seat.seatKey.startsWith("us-house:")) continue;
    const usps = seat.seatKey.slice("us-house:".length, "us-house:".length + 2);
    const tally = byState.get(usps) ?? {};
    tally[seat.affiliation] = (tally[seat.affiliation] ?? 0) + 1;
    byState.set(usps, tally);
  }
  for (const tally of byState.values()) {
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0]![1] > ranked[1]![1]) {
      delegations[ranked[0]![0]] = (delegations[ranked[0]![0]] ?? 0) + 1;
    }
  }
  const statesNeeded = Math.floor(byState.size / 2) + 1;
  const contingent = Object.entries(delegations).find(
    ([, count]) => count >= statesNeeded,
  );
  return {
    baselineKind: "certified-state-presidential",
    electoralVotes,
    winner: contingent
      ? contingent[0]
      : openUniform(worldSetupRng(world, "president:unresolved")) < 0.5
        ? "democratic"
        : "republican",
    decidedBy: contingent
      ? "contingent-house-delegations"
      : "authored-even-draw",
    referenceWinner: reference,
    stateWinners,
    unitRuleNote: UNIT_RULE_NOTE,
  };
}

function referencePresidentialWinner(): string | null {
  let democratic = 0;
  let republican = 0;
  for (const [usps, votes] of Object.entries(ELECTORAL_ALLOCATION)) {
    const share = presidentialShare.get(usps);
    if (share === null || share === undefined) return null;
    if (share > 0.5) democratic += votes;
    else republican += votes;
  }
  return democratic > republican ? "democratic" : "republican";
}

/** The affiliation this world's first executive in a state starts with. */
export function generateStateExecutiveAffiliation(
  world: World,
  latents: PoliticalLatents,
  stateUsps: string,
): GeneratedSeatCondition {
  const reference =
    ELECTORAL_CALIBRATION.governors.find((row) => row.stateUsps === stateUsps)
      ?.party ?? null;
  return generateContest(
    world,
    latents,
    {
      seatKey: `state-executive:${stateUsps}`,
      stateUsps,
      // A governor's own margin is not in the compiled source: the state's
      // certified presidential share is the labeled baseline.
      certifiedWinnerParty:
        reference !== null && !MAJOR.has(reference) ? reference : null,
      democraticTwoPartyShare: null,
      uncontested: false,
      ambiguous: false,
    },
    `state-executive:${stateUsps}`,
  );
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

export function generatePoliticalStartingConditions(
  world: World,
  regime: StartingRegime,
): Draft {
  const latents = drawPoliticalLatents(world, regime);
  const seats = [
    ...ELECTORAL_CALIBRATION.house,
    ...ELECTORAL_CALIBRATION.senate,
  ]
    .slice()
    .sort((a, b) =>
      a.seatKey < b.seatKey ? -1 : a.seatKey > b.seatKey ? 1 : 0,
    )
    .map((contest) =>
      generateContest(world, latents, contest, contest.seatKey),
    );
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
    presidency: generatePresidency(world, latents, seats),
  };
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
