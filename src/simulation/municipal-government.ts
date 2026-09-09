/**
 * The municipal government a life actually lives under.
 *
 * This module is the game side of the municipal-governance corpus. It reads the
 * generated projection, groups the readings of one government together, and
 * answers the questions a player's city raises: what is this government, who
 * sits in it, who presides, is there a manager, when does it meet in public,
 * and — the question everything else turns on — is what it does next actually
 * established by something somebody read.
 *
 * ## Two readings, never merged
 *
 * A government can carry two readings. `law` is enacted text this repository
 * retrieved and hash-locked; `reported` is a research pass's transcription of
 * official municipal pages. Both are shown, both are labelled, and no field is
 * ever taken from one to fill a hole in the other. Carson City has both, and
 * the difference is exactly the interesting part: the charter fixes the quorum
 * and the two readings an ordinance takes, and the research pass is where the
 * board's current meeting room comes from. Neither is a substitute for the
 * other and the player can see which is which.
 *
 * ## Procedure is a capability, not a presumption
 *
 * A council can only carry an ordinance where an instrument establishes how.
 * `municipalRulePackFor` builds a runtime rule pack out of a reading, and
 * returns a refusal naming the missing fields where it cannot. Nothing here
 * borrows a neighbour's procedure, and nothing falls back to a default: a city
 * whose passage threshold nobody read is a city where the vote step is not on
 * offer, and the player is told which instrument would have to say what.
 */

import {
  MUNICIPAL_GOVERNMENTS_JSON,
  MUNICIPAL_GOVERNMENTS_META,
} from "./municipal-governments.generated";
import {
  fractionOf,
  knownRule,
  majorityOf,
  notApplicableRule,
  unknownRule,
} from "./legislature-rules";
import type {
  FloorStageRule,
  LegislativeRulePack,
  RuleSourceRef,
  VoteThresholdRule,
} from "./legislature-rules";

// ---------------------------------------------------------------------------
// The projection, as the generated file carries it
// ---------------------------------------------------------------------------

export type MunicipalEvidenceClass =
  "enacted-text" | "research-transcription" | "reference-observation";

export interface MunicipalCompositionValue {
  readonly pattern: string;
  readonly districtSeats: number | null;
  readonly atLargeSeats: number | null;
  readonly wardSeats: number | null;
  readonly note: string;
}

export interface MunicipalVoteThreshold {
  readonly numerator: number;
  readonly denominator: number;
  readonly denominatorBasis: string;
  readonly fixedVotesRequired: number | null;
}

export interface MunicipalPowerRow {
  readonly power: string;
  readonly heldByRole: string;
  readonly held: boolean | null;
  readonly heldState: string;
  readonly target: string | null;
  readonly conditions: readonly string[];
  readonly exceptions: readonly string[];
  readonly threshold: MunicipalVoteThreshold | null;
}

export interface MunicipalCadence {
  readonly kind: string;
  readonly ordinals: readonly string[];
  readonly weekday: string | null;
  readonly startTime: string | null;
  readonly note: string;
}

export interface MunicipalPublicAttendance {
  readonly openToPublic: boolean;
  readonly publicCommentOffered: boolean | "UNKNOWN";
  readonly note: string;
}

export interface MunicipalMeetingSeries {
  readonly seriesKey: string;
  readonly kind: string;
  readonly bodyName: string | null;
  readonly cadence: MunicipalCadence | null;
  readonly venue: string | null;
  readonly publicAttendance: MunicipalPublicAttendance | null;
}

export interface MunicipalProcedure {
  readonly measureTypes: readonly string[] | null;
  readonly introductionSponsorship: string | null;
  readonly readings: number | null;
  readonly quorumText: string | null;
  readonly quorumRule: MunicipalVoteThreshold | null;
  readonly passageText: string | null;
  readonly passageAbsence: string | null;
  readonly amendment: string | null;
  readonly publicHearing: string | null;
  readonly mayoralAction: string | null;
  readonly mayoralActionState: string;
  readonly mayoralActionWindow: {
    readonly daysToAct: number;
    readonly dayBasis: string;
    readonly inactionOutcome: string;
  } | null;
  readonly override: string | null;
  readonly overrideState: string;
  readonly overrideAbsence: string | null;
  readonly effectivePublication: string | null;
  readonly committeeReferral: string | null;
}

export interface MunicipalBudget {
  readonly fiscalYear: {
    readonly beginsMonthDay: string;
    readonly endsMonthDay: string;
  } | null;
  readonly prepares: readonly string[] | null;
  readonly proposes: string | null;
  readonly amends: string | null;
  readonly adopts: string | null;
  readonly submissionDeadline: {
    readonly monthDay: string;
    readonly minimumDaysBeforeFiscalYear: number | null;
  } | null;
  readonly adoptionDeadline: {
    readonly monthDay: string;
    readonly minimumDaysBeforeFiscalYear: number | null;
  } | null;
  readonly balancedBudgetConstraint: string | null;
}

export interface MunicipalCitedSource {
  readonly key: string;
  readonly title: string;
  readonly issuingAuthority: string;
  readonly url: string;
  readonly authorityType: string;
  readonly retrievedDate: string;
  readonly retrievable: boolean;
}

export interface MunicipalReading {
  readonly key: string;
  readonly state: string;
  readonly displayName: string;
  readonly evidence: MunicipalEvidenceClass;
  readonly facts: readonly {
    readonly path: string;
    readonly state: string;
    readonly value?: unknown;
    readonly reason?: string;
    readonly asOf?: string;
    readonly evidence?: readonly {
      readonly artifactId: string;
      readonly locator: { readonly citation?: string };
    }[];
  }[];
  readonly asOf: string;
  readonly form: string | null;
  readonly basisType: string | null;
  readonly controllingAuthority: string | null;
  readonly formEffectiveDate: string | null;
  readonly bodyName: string | null;
  readonly bodySize: number | null;
  readonly composition: MunicipalCompositionValue | null;
  readonly presidingOffice: string | null;
  readonly executiveSelection: string | null;
  readonly presidingRules: readonly {
    readonly context: string;
    readonly presidingRole: string;
    readonly legislativeVoteRole: string;
    readonly conditions: readonly string[];
  }[];
  readonly partisanship: readonly string[];
  readonly terms: readonly {
    readonly seatClass: string;
    readonly years: number | null;
  }[];
  readonly vacancyMechanism: string | null;
  readonly separation: string | null;
  readonly mayor: {
    readonly title: string;
    readonly structuralPosition: string;
  } | null;
  readonly manager: {
    readonly title: string;
    readonly appointedByRole: string;
    readonly removableByRole: string;
    readonly confirmationRequired: boolean;
    readonly removalConditions: readonly string[];
    readonly statedRole: string;
  } | null;
  readonly departmentHeadAuthority: string | null;
  readonly consolidationType: string | null;
  readonly predecessorUnits: readonly {
    readonly name: string;
    readonly unitKind: string;
  }[];
  readonly powers: readonly MunicipalPowerRow[];
  readonly procedure: MunicipalProcedure;
  readonly budget: MunicipalBudget;
  readonly meetingSeries: readonly MunicipalMeetingSeries[];
  readonly meetingPlaces: readonly {
    readonly kind: string;
    readonly location: string;
  }[];
  readonly sources: readonly MunicipalCitedSource[];
  readonly unresolved: readonly string[];
}

export interface MunicipalGovernment {
  readonly key: string;
  readonly state: string;
  readonly displayName: string;
  /** The Census place this government was declared to sit at, identity only. */
  readonly placeGeoid: string | null;
  readonly placeName: string | null;
  readonly identity: {
    readonly countyEquivalentGeoid: string | null;
    readonly countyAreaGeoid?: string | null;
    readonly censusGovernmentUnitId: string | null;
    readonly publisherId: string;
    readonly publisherUnitName: string;
    readonly governmentUnit: {
      readonly unitType: string;
      readonly functionalActive: boolean;
      readonly webAddress: string | null;
      readonly countyAreaName: string | null;
      readonly evidence: { readonly asOf: string; readonly row: number };
    };
    readonly basis: string;
  } | null;
  readonly candidatePlace: {
    readonly geoid: string;
    readonly name: string;
    readonly status: "UNVERIFIED_NAME_MATCH";
  } | null;
  readonly readings: readonly MunicipalReading[];
}

interface RawGovernment {
  readonly key: string;
  readonly state: string;
  readonly displayName: string;
  readonly placeGeoid: string | null;
  readonly placeName: string | null;
  readonly identity: {
    readonly countyEquivalentGeoid: string | null;
    readonly countyAreaGeoid?: string | null;
    readonly censusGovernmentUnitId: string | null;
    readonly publisherId: string;
    readonly publisherUnitName: string;
    readonly governmentUnit: {
      readonly unitType: string;
      readonly functionalActive: boolean;
      readonly webAddress: string | null;
      readonly countyAreaName: string | null;
      readonly evidence: { readonly asOf: string; readonly row: number };
    };
    readonly basis: string;
  } | null;
  readonly candidatePlace: {
    readonly geoid: string;
    readonly name: string;
    readonly status: "UNVERIFIED_NAME_MATCH";
  } | null;
  readonly readings: readonly MunicipalReading[];
}

let cache: readonly MunicipalGovernment[] | null = null;

/** Every government the corpus carries, in key order. Parsed once. */
export function municipalGovernments(): readonly MunicipalGovernment[] {
  if (cache) return cache;
  const parsed = JSON.parse(MUNICIPAL_GOVERNMENTS_JSON) as RawGovernment[];
  cache = parsed;
  return cache;
}

export function municipalCorpusMeta(): typeof MUNICIPAL_GOVERNMENTS_META {
  return MUNICIPAL_GOVERNMENTS_META;
}

export function municipalGovernmentByKey(
  key: string,
): MunicipalGovernment | null {
  return municipalGovernments().find((entry) => entry.key === key) ?? null;
}

/**
 * The government whose declared place is this one.
 *
 * A GEOID and not a name, because the crosswalk was resolved once at export
 * against the accepted place corpus and a name match here would reopen exactly
 * the join this design closed.
 */
export function municipalGovernmentForPlaceGeoid(
  geoid: string,
): MunicipalGovernment | null {
  const matches = municipalGovernments().filter(
    (entry) => entry.placeGeoid === geoid,
  );
  return matches.length === 1 ? matches[0]! : null;
}

/** The enacted-text reading, where one exists. */
export function lawReading(
  government: MunicipalGovernment,
): MunicipalReading | null {
  return (
    government.readings.find((entry) => entry.evidence === "enacted-text") ??
    null
  );
}

/** The research pass's reading, where one exists. */
export function reportedReading(
  government: MunicipalGovernment,
): MunicipalReading | null {
  return (
    government.readings.find(
      (entry) => entry.evidence === "research-transcription",
    ) ?? null
  );
}

/**
 * The reading a surface should lead with.
 *
 * Enacted text first where there is any, because that is what the government's
 * own law says. The other reading is never dropped — `reportedReading` is
 * beside it — but it is not what a claim about the law rests on.
 */
export function primaryReading(
  government: MunicipalGovernment,
): MunicipalReading {
  const law = lawReading(government);
  if (law) return law;
  const reported = reportedReading(government);
  if (!reported) {
    throw new Error(`Government "${government.key}" carries no reading.`);
  }
  return reported;
}

/** Meeting evidence is selected independently of an unrelated partial charter.
 * A law reading that names a series takes precedence for that series; research
 * is still labeled research and never fills missing ordinance procedure.
 */
export function municipalMeetingReading(
  government: MunicipalGovernment,
  seriesKey?: string,
): MunicipalReading {
  const first = primaryReading(government);
  const ordered = [
    ...government.readings.filter(
      (reading) => reading.evidence === "enacted-text",
    ),
    ...government.readings.filter(
      (reading) => reading.evidence === "reference-observation",
    ),
    ...government.readings.filter(
      (reading) => reading.evidence === "research-transcription",
    ),
  ];
  return (
    ordered.find((reading) =>
      reading.meetingSeries.some((series) =>
        seriesKey
          ? series.seriesKey === seriesKey
          : series.publicAttendance?.openToPublic === true,
      ),
    ) ??
    ordered.find((reading) => reading.meetingSeries.length > 0) ??
    first
  );
}

/** Every supported public series, retaining the selected reading's own fields. */
export function municipalPublicMeetingSeries(
  government: MunicipalGovernment,
): readonly MunicipalMeetingSeries[] {
  const keys = [
    ...new Set(
      government.readings.flatMap((reading) =>
        reading.meetingSeries.map((series) => series.seriesKey),
      ),
    ),
  ];
  return keys.flatMap((key) => {
    const series = municipalMeetingReading(government, key).meetingSeries.find(
      (entry) => entry.seriesKey === key,
    );
    return series?.publicAttendance?.openToPublic === true ? [series] : [];
  });
}

// ---------------------------------------------------------------------------
// Runtime rule packs derived from a reading
// ---------------------------------------------------------------------------

/** Why this government cannot carry an ordinance through the engine. */
export interface MunicipalRulePackRefusal {
  readonly ok: false;
  readonly governmentKey: string;
  /** Named fields, so a surface can say which instrument would have to speak. */
  readonly missing: readonly {
    readonly field: string;
    readonly reason: string;
  }[];
}

export interface MunicipalRulePackResolution {
  readonly ok: true;
  readonly pack: LegislativeRulePack;
  /** Where the pack's facts came from. Never mixed. */
  readonly evidence: MunicipalEvidenceClass;
  /**
   * Facts the government has that this vocabulary cannot express, and so are
   * enforced beside the pack rather than inside it.
   */
  readonly carriedOutsideThePack: readonly string[];
}

export type MunicipalRulePackResult =
  MunicipalRulePackResolution | MunicipalRulePackRefusal;

export function municipalRuleSourceRef(
  reading: MunicipalReading,
  citation: string,
): RuleSourceRef {
  const paths: Record<string, string> = {
    quorum: "legislativeProcedure.quorum",
    amendment: "legislativeProcedure.amendment",
    origination: "legislativeProcedure.introductionSponsorship",
    referral: "legislativeProcedure.committeeReferral",
    "effective date": "legislativeProcedure.effectivePublication",
    session: "legislativeProcedure.session",
  };
  const fact =
    reading.facts.find((candidate) => candidate.value === citation) ??
    reading.facts.find((candidate) => candidate.path === paths[citation]);
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

/**
 * A municipal threshold in the runtime vocabulary.
 *
 * A charter states a threshold one of two ways. "A majority of those present
 * and voting" is a fraction and travels straight across. "Six or more of the
 * currently filled seats" is an absolute count, and it travels as the same
 * fraction of the full body plus the floor the charter actually names — so the
 * rule stays exact when a seat is vacant instead of quietly dropping a vote.
 */
function thresholdRule(
  threshold: MunicipalVoteThreshold,
  label: string,
  source: RuleSourceRef,
): VoteThresholdRule {
  const countedAgainst =
    threshold.denominatorBasis === "MEMBERS_PRESENT_AND_VOTING"
      ? "members-voting"
      : threshold.denominatorBasis === "MEMBERS_PRESENT"
        ? "members-present"
        : "members-elected";
  if (threshold.denominatorBasis === "FIXED_COUNT") {
    const floor = threshold.fixedVotesRequired ?? threshold.numerator;
    return fractionOf(
      threshold.numerator,
      threshold.denominator,
      "members-elected",
      label,
      source,
      floor,
    );
  }
  if (threshold.numerator === 1 && threshold.denominator === 2) {
    return majorityOf(countedAgainst, label, source);
  }
  return fractionOf(
    threshold.numerator,
    threshold.denominator,
    countedAgainst,
    label,
    source,
  );
}

function powerRow(
  reading: MunicipalReading,
  power: string,
  role?: string,
): MunicipalPowerRow | null {
  return (
    reading.powers.find(
      (entry) =>
        entry.power === power &&
        (role === undefined || entry.heldByRole === role),
    ) ?? null
  );
}

/** The pack id a government's council plays under. */
export function municipalRulePackId(reading: MunicipalReading): string {
  return `${reading.key}-council-v1`;
}

/**
 * Build a runtime rule pack for one government's council, or refuse.
 *
 * The engine that moves state bills is the engine that moves ordinances; what
 * differs is the pack, and a pack is only constructible where the instruments
 * establish a body, a size, a passage threshold and what becomes of a measure
 * after the body adopts it. Anything short of that is a refusal naming the gap.
 */
export function municipalRulePackFor(
  government: MunicipalGovernment,
): MunicipalRulePackResult {
  const reading = primaryReading(government);
  const missing: { field: string; reason: string }[] = [];
  const outside: string[] = [];

  if (reading.bodyName === null) {
    missing.push({
      field: "elected body",
      reason: "No instrument read names this government's legislative body.",
    });
  }
  if (reading.bodySize === null) {
    missing.push({
      field: "body size",
      reason:
        "No instrument read fixes how many seats this body has, and a threshold cannot be counted against a number nobody established.",
    });
  }

  const adoption = powerRow(reading, "ORDINANCE_ADOPTION");
  const passageThreshold = adoption?.threshold ?? null;
  if (!passageThreshold) {
    missing.push({
      field: "passage threshold",
      reason:
        reading.procedure.passageAbsence ??
        "No instrument read states the vote an ordinance needs to pass here.",
    });
  }

  const presentment =
    reading.procedure.mayoralActionState === "KNOWN" &&
    powerRow(reading, "VETO", "MAYOR")?.held === true;
  const noPresentment =
    reading.procedure.mayoralActionState === "NOT_APPLICABLE";
  if (!presentment && !noPresentment) {
    missing.push({
      field: "what happens after adoption",
      reason:
        reading.procedure.overrideAbsence ??
        "No instrument read establishes whether an adopted ordinance goes to the mayor, so the engine cannot know when the measure is finished.",
    });
  }

  if (reading.evidence !== "enacted-text")
    missing.push({
      field: "operative source",
      reason:
        "Research reports are inspectable evidence, not operative procedure.",
    });
  if (reading.procedure.introductionSponsorship === null)
    missing.push({
      field: "introduction",
      reason: "Introduction authority is UNKNOWN.",
    });
  if (reading.procedure.readings === null)
    missing.push({
      field: "readings",
      reason: "The required floor sequence is UNKNOWN.",
    });
  if (reading.procedure.publicHearing !== null)
    missing.push({
      field: "hearing and notice enforcement",
      reason:
        "The sourced hearing and notice conditions require a canonical procedure adapter before ordinance progression is enabled.",
    });
  if (missing.length > 0) {
    return { ok: false, governmentKey: government.key, missing };
  }

  const bodyName = reading.bodyName!;
  const bodySize = reading.bodySize!;
  const passageSource = municipalRuleSourceRef(
    reading,
    reading.procedure.passageText ?? "ordinance adoption",
  );
  const passage = thresholdRule(
    passageThreshold!,
    reading.procedure.passageText ?? "The vote an ordinance needs.",
    passageSource,
  );

  const quorumThreshold = reading.procedure.quorumRule;
  const quorum =
    quorumThreshold === null
      ? unknownRule(
          "No instrument read states this body's quorum, so no meeting can be proved lawful from the pack.",
        )
      : (() => {
          const rule = thresholdRule(
            quorumThreshold,
            reading.procedure.quorumText ?? "Quorum.",
            municipalRuleSourceRef(
              reading,
              reading.procedure.quorumText ?? "quorum",
            ),
          );
          if (rule.minimumVotes !== undefined) {
            outside.push(
              `Quorum is an absolute count the charter names: ${reading.procedure.quorumText ?? "see the instrument"}`,
            );
          }
          return knownRule(rule, rule.source);
        })();

  const overrideRow = powerRow(reading, "OVERRIDE", "COUNCIL");
  const vetoRow = powerRow(reading, "VETO", "MAYOR");
  const executiveTitle = reading.mayor?.title ?? "Mayor";
  const executiveSource = municipalRuleSourceRef(
    reading,
    reading.procedure.mayoralAction ?? "executive action on an ordinance",
  );

  const override =
    presentment && overrideRow?.threshold
      ? (() => {
          const rule = thresholdRule(
            overrideRow.threshold!,
            reading.procedure.override ?? "Override.",
            executiveSource,
          );
          if (rule.minimumVotes !== undefined) {
            outside.push(
              `Override is an absolute number of seats the charter names: ${reading.procedure.override ?? "see the instrument"}`,
            );
          }
          return { kind: "each-chamber" as const, threshold: rule };
        })()
      : {
          kind: "not-applicable" as const,
          note:
            reading.procedure.overrideAbsence ??
            "No instrument read establishes a veto here, so there is nothing to reconsider.",
          source: executiveSource,
        };

  const presentmentRule = presentment
    ? knownRule(true, executiveSource)
    : knownRule(false, executiveSource);

  const pack: LegislativeRulePack = {
    packId: municipalRulePackId(reading),
    jurisdictionKey: `US-${reading.state}`,
    displayName: `${reading.displayName} — ${bodyName}`,
    structure: "unicameral",
    chambers: [
      {
        chamberKey: "council",
        name: bodyName,
        seats: knownRule(
          bodySize,
          municipalRuleSourceRef(reading, `${bodyName} membership`),
        ),
        quorum,
        introductionAllowed: true,
        referral: {
          authorityLabel: `${bodyName} presiding officer`,
          multipleReferralAllowed: unknownRule(
            "No instrument read establishes a committee system for this body.",
          ),
          everyMeasureMustBeHeard: unknownRule(
            "No instrument read guarantees a hearing for every measure here.",
          ),
          source: municipalRuleSourceRef(reading, "referral"),
        },
        committees: [],
        floorStages: buildFloorStages(reading, passage, passageSource),
        amendments: {
          floorAmendmentsAllowed:
            reading.procedure.amendment === null
              ? unknownRule(
                  "No instrument read establishes whether this body amends a measure on the floor.",
                )
              : knownRule(true, municipalRuleSourceRef(reading, "amendment")),
          germanenessStandard: unknownRule(
            "No instrument read states a germaneness standard for this body.",
          ),
          source: municipalRuleSourceRef(reading, "amendment"),
        },
      },
    ],
    chamberOrder: ["council"],
    origination: {
      generalOrigination: knownRule(
        ["council"],
        municipalRuleSourceRef(reading, "origination"),
      ),
      subjectRestrictions: [],
      source: municipalRuleSourceRef(reading, "origination"),
    },
    interChamber: {
      kind: "not-applicable",
      note: "A municipal legislative body sits as one chamber.",
    },
    executive: {
      titleLabel: executiveTitle,
      presentmentRequired: presentmentRule,
      actionWindowDaysInSession: reading.procedure.mayoralActionWindow
        ? knownRule(
            reading.procedure.mayoralActionWindow.daysToAct,
            executiveSource,
          )
        : presentment
          ? unknownRule(
              "No instrument read fixes how long this executive has to act on an adopted ordinance.",
            )
          : notApplicableRule(
              "Nothing is presented to this executive, so no period runs.",
            ),
      actionWindowDaysAfterAdjournment: notApplicableRule(
        "A municipal body sits continuously here; no instrument read establishes an adjournment window.",
      ),
      inactionOutcomeInSession: reading.procedure.mayoralActionWindow
        ? knownRule(
            reading.procedure.mayoralActionWindow.inactionOutcome ===
              "POCKET_VETO"
              ? "pocket-veto"
              : "becomes-law-without-signature",
            executiveSource,
          )
        : presentment
          ? unknownRule(
              "No instrument read says what becomes of an ordinance this executive neither returns nor signs.",
            )
          : notApplicableRule(
              "Nothing is presented to this executive, so silence decides nothing.",
            ),
      lineItemVeto:
        vetoRow === null
          ? unknownRule(
              "No instrument read establishes any veto here, so a line-item veto is not established either.",
            )
          : unknownRule(
              "No instrument read establishes whether this veto reaches single items.",
            ),
      override,
      source: executiveSource,
    },
    enactment: {
      effectiveDateDistinctFromEnactment:
        reading.procedure.effectivePublication === null
          ? unknownRule(
              "No instrument read separates adoption from taking effect here.",
            )
          : knownRule(true, municipalRuleSourceRef(reading, "effective date")),
      defaultEffectiveRule:
        reading.procedure.effectivePublication === null
          ? unknownRule(
              "No instrument read states when an ordinance takes effect here.",
            )
          : knownRule(
              reading.procedure.effectivePublication,
              municipalRuleSourceRef(reading, "effective date"),
            ),
      source: municipalRuleSourceRef(reading, "effective date"),
    },
    session: {
      sessionLabel: `${reading.displayName} legislative year`,
      adjournmentRule: unknownRule(
        "No instrument read establishes an adjournment rule for this body.",
      ),
      measuresDieAtAdjournment: unknownRule(
        "No instrument read establishes whether a measure dies when this body's year ends.",
      ),
      source: municipalRuleSourceRef(reading, "session"),
    },
    sources: [
      municipalRuleSourceRef(
        reading,
        reading.controllingAuthority ?? "charter",
      ),
    ],
    unresolvedGaps: [...reading.unresolved],
  };

  return {
    ok: true,
    pack,
    evidence: reading.evidence,
    carriedOutsideThePack: outside,
  };
}

/**
 * The stages a measure passes on this body's floor.
 *
 * Where an instrument fixes a number of readings, that many stages exist and
 * only the last carries the passage vote — Carson City's first reading is by
 * title and decides nothing. An unknown sequence prevents pack construction;
 * a passage threshold does not establish the preceding procedural steps.
 */
function buildFloorStages(
  reading: MunicipalReading,
  passage: VoteThresholdRule,
  passageSource: RuleSourceRef,
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
      vote: unknownRule(
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
    vote: knownRule(passage, passageSource),
    source: passageSource,
  });
  return stages;
}

/**
 * The government of the place a life is lived in, if the corpus has one.
 *
 * Reached through the place's own GEOID rather than its name, and deliberately
 * a function here rather than a field on `LifePlaceCapabilities`: a place's
 * capability list is the place layer's, and a city's government is a separate
 * corpus that can widen without that layer changing at all.
 */
export function municipalGovernmentForLifePlace(place: {
  readonly sourceGeoid?: string;
}): MunicipalGovernment | null {
  if (!place.sourceGeoid) return null;
  return municipalGovernmentForPlaceGeoid(place.sourceGeoid);
}

/** Every government whose council can carry an ordinance through the engine. */
export function municipalGovernmentsWithProcedure(): readonly MunicipalGovernment[] {
  return municipalGovernments().filter(
    (government) => municipalRulePackFor(government).ok,
  );
}

/** Every derivable municipal pack, for the runtime pack registry. */
export function municipalCouncilRulePacks(): readonly LegislativeRulePack[] {
  const packs: LegislativeRulePack[] = [];
  for (const government of municipalGovernments()) {
    const result = municipalRulePackFor(government);
    if (result.ok) packs.push(result.pack);
  }
  return packs;
}

/** One municipal pack by id, or null when this id is not a municipal one. */
export function municipalRulePackById(
  packId: string,
): LegislativeRulePack | null {
  return (
    municipalCouncilRulePacks().find((pack) => pack.packId === packId) ?? null
  );
}
