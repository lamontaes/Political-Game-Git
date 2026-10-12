import type {
  MunicipalReading,
  MunicipalPassageInterval,
} from "../../simulation/municipal-government";
import type {
  RuleSourceRef,
  UnknownRuleValue,
  LegislativeRulePack,
  FloorStageRule,
  VoteThresholdRule,
} from "../../simulation/legislature-rules";
const LOCAL_ORDINANCE_GAME_PROFILE_VERSION = "local-ordinance-game/v1";
import { knownRule } from "./pack-queries";
function unknownRule(note: string): UnknownRuleValue {
  return { kind: "unknown", note };
}
export function municipalRuleSourceRef(
  reading: MunicipalReading,
  citation: string,
): RuleSourceRef {
  if (reading.evidence === "game-profile") {
    return {
      authority: "game-profile",
      citation: LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
      sourceTitle: "Our Civic Duty local ordinance game profile",
      sourceUrl: null,
      retrievedAt: null,
      verification: "game-profile",
      note: `${citation} is a fictional game rule, not a claim about ${reading.displayName}'s law.`,
    };
  }
  const paths: Record<string, string> = {
    "body size": "electedStructure.bodySize",
    quorum: "legislativeProcedure.quorum",
    amendment: "legislativeProcedure.amendment",
    origination: "legislativeProcedure.introductionSponsorship",
    referral: "legislativeProcedure.committeeReferral",
    "effective date": "legislativeProcedure.effectivePublication",
    session: "legislativeProcedure.session",
  };
  const fact =
    reading.facts.find((candidate) => candidate.value === citation) ??
    reading.facts.find(
      (candidate) => candidate.path === (paths[citation] ?? citation),
    );
  const evidence = fact?.evidence?.[0];
  const source = reading.sources.find(
    (candidate) => candidate.key === evidence?.artifactId,
  );
  return {
    authority:
      reading.evidence === "enacted-text" ? "statute" : "research-reference",
    citation: evidence?.locator.citation ?? citation,
    sourceTitle: source?.title ?? reading.displayName,
    sourceUrl: source?.url ?? null,
    retrievedAt: source?.retrievedDate ?? null,
    verification: !source
      ? "unresolved"
      : reading.evidence === "enacted-text"
        ? "verified"
        : "partial",
    note: !source
      ? "No field-specific source is resolved."
      : reading.evidence === "enacted-text"
        ? null
        : reading.evidence === "reference-observation"
          ? "Dated meeting reference; not operative legal authority."
          : "Research transcription; not independently verified operative law.",
  };
}

function municipalIntervalRule(
  reading: MunicipalReading,
  interval: MunicipalPassageInterval,
  path:
    | "legislativeProcedure.betweenReadings"
    | "legislativeProcedure.introductionToPassage",
) {
  const fact = reading.facts.find((candidate) => candidate.path === path);
  const evidence = fact?.evidence?.[0];
  const source = reading.sources.find(
    (candidate) => candidate.key === evidence?.artifactId,
  );
  const ruleSource: RuleSourceRef = {
    authority:
      reading.evidence === "enacted-text" ? "statute" : "research-reference",
    citation: evidence?.locator.citation ?? path,
    sourceTitle: source?.title ?? reading.displayName,
    sourceUrl: source?.url ?? null,
    retrievedAt: source?.retrievedDate ?? null,
    verification: !source
      ? "unresolved"
      : reading.evidence === "enacted-text"
        ? "verified"
        : "partial",
    note: !source
      ? "No field-specific interval source is resolved."
      : reading.evidence === "enacted-text"
        ? null
        : "Research transcription; not independently verified operative law.",
  };
  if (fact?.state !== "KNOWN" || !source) {
    return unknownRule(
      fact?.reason ?? "No field-specific source establishes this interval.",
    );
  }
  return knownRule(
    interval.basis === "ELAPSED_DAYS"
      ? interval.minimumElapsedDays
      : interval.minimumInterveningDays + 1,
    ruleSource,
  );
}

export function buildFloorStages(
  reading: MunicipalReading,
  passage: VoteThresholdRule,
  passageSource: RuleSourceRef,
  everyReadingVoted = false,
): LegislativeRulePack["chambers"][number]["floorStages"] {
  const readings = reading.procedure.readings;
  if (readings === null)
    throw new Error("Cannot build an unsupported reading sequence.");
  const stages: FloorStageRule[] = [];
  for (let index = 1; index < readings; index += 1) {
    stages.push({
      stageKey: `reading-${index}`,
      label: `Reading ${index}`,
      amendable:
        index === readings - 1 && reading.procedure.amendment !== null
          ? knownRule(true, municipalRuleSourceRef(reading, "amendment"))
          : unknownRule(
              "No instrument read establishes whether this reading takes amendments.",
            ),
      separateLegislativeDayRequired: true,
      ...(index > 1 && reading.procedure.betweenReadings
        ? {
            readingIntervalDays: municipalIntervalRule(
              reading,
              reading.procedure.betweenReadings,
              "legislativeProcedure.betweenReadings",
            ),
          }
        : {}),
      vote: everyReadingVoted
        ? knownRule(passage, passageSource)
        : unknownRule(
            "This reading decides nothing; the instrument puts the vote at the final reading.",
          ),
      source: municipalRuleSourceRef(reading, `reading ${index}`),
    });
  }
  stages.push({
    stageKey: "final-passage",
    label: readings > 1 ? `Reading ${readings} and final passage` : "Adoption",
    amendable:
      reading.procedure.amendment === null
        ? unknownRule(
            "No instrument read establishes whether this body amends at final passage.",
          )
        : knownRule(true, municipalRuleSourceRef(reading, "amendment")),
    separateLegislativeDayRequired: readings > 1,
    ...(readings > 1 && reading.procedure.betweenReadings
      ? {
          readingIntervalDays: municipalIntervalRule(
            reading,
            reading.procedure.betweenReadings,
            "legislativeProcedure.betweenReadings",
          ),
        }
      : {}),
    ...(reading.procedure.introductionToPassage
      ? {
          minimumDaysFromIntroduction: municipalIntervalRule(
            reading,
            reading.procedure.introductionToPassage,
            "legislativeProcedure.introductionToPassage",
          ),
        }
      : {}),
    vote: knownRule(passage, passageSource),
    source: passageSource,
  });
  return stages;
}
