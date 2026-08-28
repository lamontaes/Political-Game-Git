import type {
  ChamberStructure,
  ChamberType,
  DerivedLifecycleStatus,
  LegislativeActionSourceRecord,
  LegislativeLifecycleSummary,
  LegislativeVoteSourceRecord,
  SessionState,
  BecameLawEvidence,
  VetoEvidence,
  FailureEvidence
} from "./types.js";

export interface LifecycleInferenceContext {
  actions: Array<Partial<LegislativeActionSourceRecord> & { rawDescription?: string; description?: string; providerClassifications?: string[]; classification?: string[]; actionDate?: string; date?: string; actingBody?: ChamberType }>;
  votes?: Array<Partial<LegislativeVoteSourceRecord> & { passed?: boolean; motion?: string; date?: string; chamber?: ChamberType }>;
  sessionState?: SessionState;
  chamberStructure?: ChamberStructure;
}

const CHAPTER_PATTERN = /(?:Acts\s+Chapter|Chapter|Public\s+Act|Public\s+Law|Act\s+No\.|Ley\s+Núm\.|DC\s+Act)\s+([A-Za-z0-9-]+)/i;

/**
 * Derives a conservative, source-grounded lifecycle summary.
 * 
 * Invariants:
 * 1. became-law requires affirmative enactment evidence.
 * 2. explicitly-failed requires affirmative failure evidence.
 * 3. absence of action before session adjournment is session-ended-unresolved, NOT failure or passage.
 * 4. veto is distinguishable from final failure, and subsequent veto overrides transition to became-law.
 */
export function inferLegislativeLifecycle(context: LifecycleInferenceContext): LegislativeLifecycleSummary {
  const { actions = [], votes = [], sessionState = "unknown", chamberStructure = "bicameral" } = context;

  if (actions.length === 0 && votes.length === 0) {
    return {
      status: "unknown",
      stageDate: null,
      terminalState: false,
      becameLawEvidence: null,
      vetoEvidence: null,
      failureEvidence: null,
      rationale: "No source actions or votes recorded for measure."
    };
  }

  // Sort actions chronologically by sequence index or date
  const sortedActions = [...actions].sort((a, b) => {
    const seqA = a.sequenceIndex ?? 0;
    const seqB = b.sequenceIndex ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    const dateA = a.actionDate || a.date || "";
    const dateB = b.actionDate || b.date || "";
    return dateA.localeCompare(dateB);
  });

  let currentStatus: DerivedLifecycleStatus = "introduced";
  let lastStageDate: string | null = null;
  let becameLawEvidence: BecameLawEvidence | null = null;
  let vetoEvidence: VetoEvidence | null = null;
  let failureEvidence: FailureEvidence | null = null;
  const passedChambers = new Set<string>();

  for (const action of sortedActions) {
    const rawDesc = action.rawDescription ?? action.description ?? "";
    const desc = rawDesc.toLowerCase();
    const rawClassList = action.providerClassifications ?? action.classification ?? [];
    const classifications = rawClassList.map((c) => String(c).toLowerCase());
    const actionDate = action.actionDate ?? action.date ?? null;
    const actingBody = action.actingBody || "other";

    if (actionDate) {
      lastStageDate = actionDate;
    }

    // 1. Check for Chapter / Acts pattern in description
    const chapterMatch = rawDesc.match(CHAPTER_PATTERN);
    const chapterId = chapterMatch ? chapterMatch[0] : undefined;

    // 2. Check for Withdrawal
    if (
      classifications.includes("withdrawal") ||
      classifications.includes("withdrawn") ||
      desc.includes("withdrawn by author") ||
      desc.includes("withdrawn from further consideration")
    ) {
      currentStatus = "withdrawn";
      failureEvidence = {
        failureDate: actionDate || undefined,
        actingBody,
        stage: "withdrawn",
        description: rawDesc
      };
      continue;
    }

    // 3. Check for Affirmative Failure
    const isExplicitFailure =
      classifications.includes("failure") ||
      classifications.includes("committee-failure") ||
      classifications.includes("veto-override-failure") ||
      classifications.includes("defeated") ||
      desc.includes("failed on third reading") ||
      desc.includes("tabled indefinitely") ||
      desc.includes("defeated in committee") ||
      desc.includes("motion failed") ||
      desc.includes("failed in senate") ||
      desc.includes("failed in house") ||
      desc.includes("failed passage");

    if (isExplicitFailure) {
      currentStatus = "explicitly-failed";
      failureEvidence = {
        failureDate: actionDate || undefined,
        actingBody,
        stage: classifications.join(",") || "failure",
        description: rawDesc
      };
      continue;
    }

    // 4. Check for Veto Override
    const isVetoOverridePass =
      classifications.includes("veto-override-passage") ||
      desc.includes("veto overridden") ||
      desc.includes("passed over governor's veto") ||
      desc.includes("passed over veto") ||
      (desc.includes("overridden by senate") && desc.includes("overridden by house"));

    if (isVetoOverridePass) {
      currentStatus = "became-law";
      becameLawEvidence = {
        signedDate: actionDate || undefined,
        chapterOrActId: chapterId,
        vetoOverridden: true,
        description: rawDesc
      };
      continue;
    }

    // 5. Check for Executive Veto
    const isVeto =
      classifications.includes("executive-veto") ||
      classifications.includes("line-item-veto") ||
      desc.includes("vetoed by governor") ||
      desc.includes("governor vetoed") ||
      desc.includes("vetoed by mayor") ||
      desc.includes("disapproved by mayor");

    if (isVeto) {
      currentStatus = "vetoed";
      vetoEvidence = {
        vetoDate: actionDate || undefined,
        vetoType: classifications.includes("line-item-veto") || desc.includes("line-item") ? "line_item" : "full",
        description: rawDesc
      };
      continue;
    }

    // 6. Check for Became-Law / Enactment
    const isEnacted =
      classifications.includes("became-law") ||
      classifications.includes("executive-signature") ||
      classifications.includes("chaptered") ||
      desc.includes("signed by governor") ||
      desc.includes("approved by governor") ||
      desc.includes("signed by mayor") ||
      desc.includes("became law without signature") ||
      desc.includes("enacted") ||
      desc.includes("delivered to secretary of state; chapter") ||
      (chapterId !== undefined && (desc.includes("signed") || desc.includes("chapter") || desc.includes("acts")));

    if (isEnacted) {
      currentStatus = "became-law";
      becameLawEvidence = {
        signedDate: actionDate || undefined,
        chapterOrActId: chapterId || becameLawEvidence?.chapterOrActId,
        withoutSignature: desc.includes("without signature"),
        description: rawDesc
      };
      continue;
    }

    // 7. Check for Chamber Passage
    const isChamberPass =
      classifications.includes("passage") ||
      (classifications.includes("reading-3") && desc.includes("passed")) ||
      desc.includes("passed house") ||
      desc.includes("passed senate") ||
      desc.includes("concurred in senate amendments") ||
      desc.includes("concurred in house amendments") ||
      desc.includes("adopted");

    if (isChamberPass && currentStatus !== "became-law" && currentStatus !== "vetoed" && currentStatus !== "explicitly-failed") {
      passedChambers.add(actingBody);
      currentStatus = "chamber-passed";
      continue;
    }

    // 8. Check for Active Advance
    const isActive =
      classifications.includes("referral") ||
      classifications.includes("referral-committee") ||
      classifications.includes("committee-passage") ||
      classifications.includes("reading-2") ||
      classifications.includes("amendment-passage") ||
      desc.includes("referred to") ||
      desc.includes("reported favorably") ||
      desc.includes("second reading");

    if (isActive && currentStatus === "introduced") {
      currentStatus = "active";
    }
  }

  // Check votes for any definitive failure not captured in action classifications
  for (const vote of votes) {
    if (vote.passed === false && currentStatus !== "became-law" && currentStatus !== "explicitly-failed") {
      const motion = (vote.motion || "").toLowerCase();
      if (
        motion.includes("passage") ||
        motion.includes("third reading") ||
        motion.includes("override") ||
        motion.includes("concurrence")
      ) {
        currentStatus = "explicitly-failed";
        failureEvidence = {
          failureDate: vote.date,
          actingBody: vote.chamber,
          stage: vote.motion || "roll_call_vote",
          description: `Roll call vote failed: ${vote.yeas ?? 0} yeas, ${vote.nays ?? 0} nays.`
        };
      }
    }
  }

  // Handle sine die session end
  const isSessionEnded =
    sessionState === "adjourned_sine_die" ||
    sessionState === "completed" ||
    sessionState === "historical";

  if (
    isSessionEnded &&
    currentStatus !== "became-law" &&
    currentStatus !== "explicitly-failed" &&
    currentStatus !== "withdrawn"
  ) {
    currentStatus = "session-ended-unresolved";
  }

  const isTerminal =
    currentStatus === "became-law" ||
    currentStatus === "explicitly-failed" ||
    currentStatus === "withdrawn" ||
    currentStatus === "session-ended-unresolved";

  let rationale = "";
  switch (currentStatus) {
    case "became-law":
      rationale = `Enacted: ${becameLawEvidence?.description || "Signed or enacted with affirmative evidence."}`;
      break;
    case "vetoed":
      rationale = `Vetoed: ${vetoEvidence?.description || "Executive veto recorded without subsequent override."}`;
      break;
    case "explicitly-failed":
      rationale = `Failed: ${failureEvidence?.description || "Explicit defeat or rejection recorded."}`;
      break;
    case "withdrawn":
      rationale = `Withdrawn: ${failureEvidence?.description || "Withdrawn from consideration."}`;
      break;
    case "session-ended-unresolved":
      rationale = `Session adjourned sine die without final affirmative passage or explicit defeat. Status preserved as unresolved under jurisdiction rules.`;
      break;
    case "chamber-passed":
      rationale = `Passed chamber (${Array.from(passedChambers).join(", ") || chamberStructure}); awaiting further bicameral or executive action.`;
      break;
    case "active":
      rationale = `Active in committee or floor proceedings.`;
      break;
    case "introduced":
      rationale = `Introduced/filed; pending committee referral or initial action.`;
      break;
    default:
      rationale = `Status undetermined.`;
  }

  return {
    status: currentStatus,
    stageDate: lastStageDate,
    terminalState: isTerminal,
    becameLawEvidence,
    vetoEvidence,
    failureEvidence,
    rationale
  };
}
