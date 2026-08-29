/**
 * Federal Legislative Source Corpus - Conservative Derived Lifecycle Classifier
 *
 * Infers conservative derived lifecycles from chronological Congress.gov / GovInfo actions.
 * Grounded in federal constitutional mechanics (Article I, Section 7) without gameplay procedure.
 */

import type {
  FederalActionRecord,
  FederalDerivedLifecycle,
  FederalMeasureType,
  FederalTextVersionRecord,
} from "./types.js";

interface InferLifecycleOptions {
  measureType: FederalMeasureType;
  actions: FederalActionRecord[];
  textVersions?: FederalTextVersionRecord[];
  publicLawNumber?: string | null;
  congressSineDie?: boolean;
}

/**
 * Normalizes text for keyword and pattern matching.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Infers a conservative derived lifecycle status from federal source evidence.
 */
export function inferFederalLifecycle({
  measureType,
  actions,
  textVersions = [],
  publicLawNumber = null,
  congressSineDie = false,
}: InferLifecycleOptions): FederalDerivedLifecycle {
  // Sort actions chronologically by sequence and date
  const sortedActions = [...actions].sort((a, b) => {
    if (a.actionDate !== b.actionDate) {
      return a.actionDate.localeCompare(b.actionDate);
    }
    return a.sequence - b.sequence;
  });

  // Check for Public Law or Enacted text versions
  const hasPublicLawText = textVersions.some((tv) => tv.versionCode === "pl");
  const hasEnrolledText = textVersions.some((tv) => tv.versionCode === "enr");

  let passedHouse = false;
  let passedSenate = false;
  let bothChambersAgreed = false;
  let presentedToPresident = false;
  let presentationDate: string | null = null;
  let presidentialVeto = false;
  let vetoDate: string | null = null;
  let houseVetoOverridden = false;
  let senateVetoOverridden = false;
  let vetoOverrideDate: string | null = null;
  let signedByPresident = false;
  let becameLawDate: string | null = null;
  let explicitlyFailed = false;
  let failureReason: string | null = null;
  let isWithdrawn = false;
  let hasCommitteeActivity = false;

  for (const action of sortedActions) {
    const text = normalizeText(action.rawDescription);
    const code = action.actionCode || "";

    // 1. Explicit Failure or Withdrawal
    if (
      text.includes("failed of passage") ||
      text.includes("failed to pass") ||
      text.includes("motion to suspend the rules and pass the bill failed") ||
      text.includes(
        "on motion to suspend the rules and pass the bill failed",
      ) ||
      (text.includes("motion to suspend the rules") &&
        text.includes("failed")) ||
      text.includes("motion to override the veto of the president failed") ||
      (text.includes("override the veto") && text.includes("failed")) ||
      text.includes("cloture on the motion to proceed not invoked") ||
      text.includes("motion to table agreed to") ||
      text.includes("defeated")
    ) {
      explicitlyFailed = true;
      failureReason = action.rawDescription;
    }
    if (
      text.includes("withdrawn by sponsor") ||
      text.includes("withdrawn in house") ||
      text.includes("withdrawn in senate")
    ) {
      isWithdrawn = true;
      failureReason = action.rawDescription;
    }

    // 2. Committee Activity
    if (
      action.actionType === "Committee" ||
      text.includes("referred to the committee") ||
      text.includes("referred to committee") ||
      text.includes("committee on") ||
      text.includes("hearings held") ||
      text.includes("ordered to be reported") ||
      text.includes("reported by") ||
      text.includes("committee print")
    ) {
      hasCommitteeActivity = true;
    }

    // 3. Chamber Passage & Agreement
    if (
      text.includes("passed house") ||
      text.includes("passed the house") ||
      (text.includes("on passage passed") &&
        action.actingChamber === "house") ||
      text.includes("agreed to in house") ||
      code === "8000" ||
      code === "H37300" ||
      code === "H37100"
    ) {
      passedHouse = true;
    }

    if (
      text.includes("passed senate") ||
      text.includes("passed the senate") ||
      (text.includes("on passage passed") &&
        action.actingChamber === "senate") ||
      text.includes("agreed to in senate") ||
      code === "17000" ||
      code === "S17000"
    ) {
      passedSenate = true;
    }

    if (
      text.includes(
        "resolving differences - house actions: senate amendment agreed to",
      ) ||
      text.includes(
        "resolving differences - senate actions: house amendment agreed to",
      ) ||
      text.includes("house agreed to senate amendment") ||
      text.includes("senate agreed to house amendment") ||
      (text.includes("conference report agreed to in house") &&
        text.includes("senate")) ||
      (passedHouse && passedSenate)
    ) {
      bothChambersAgreed = true;
    }

    // 4. Presidential Presentation (only for bills and joint resolutions)
    if (
      measureType === "hr" ||
      measureType === "s" ||
      measureType === "hjres" ||
      measureType === "sjres"
    ) {
      if (
        text.includes("presented to president") ||
        text.includes("presented to the president") ||
        code === "28000" ||
        code === "E20000"
      ) {
        presentedToPresident = true;
        presentationDate = action.actionDate;
      }

      // 5. Presidential Veto
      if (
        text.includes("vetoed by president") ||
        text.includes("vetoed by the president") ||
        text.includes("pocket vetoed by president") ||
        code === "31000" ||
        (code === "E30000" && text.includes("veto"))
      ) {
        presidentialVeto = true;
        vetoDate = action.actionDate;
      }

      // 6. Veto Override Votes
      if (
        presidentialVeto &&
        (text.includes("passed house over veto") ||
          text.includes("passed over presidential veto") ||
          text.includes("passed the bill over presidential veto") ||
          text.includes("passed the bill over the veto") ||
          code === "H36100" ||
          (text.includes(
            "two-thirds of the members voting having responded in the affirmative",
          ) &&
            action.actingChamber === "house"))
      ) {
        houseVetoOverridden = true;
      }

      if (
        presidentialVeto &&
        (text.includes("passed senate over veto") ||
          text.includes("passed over presidential veto") ||
          text.includes("passed the bill over presidential veto") ||
          text.includes("passed the bill over the veto") ||
          code === "S36100" ||
          (text.includes(
            "two-thirds of the senators voting having responded in the affirmative",
          ) &&
            action.actingChamber === "senate"))
      ) {
        senateVetoOverridden = true;
      }

      if (
        (houseVetoOverridden && senateVetoOverridden) ||
        text.includes("became public law over presidential veto") ||
        (text.includes("became public law no:") && presidentialVeto) ||
        text.includes("enacted over veto") ||
        code === "36100"
      ) {
        vetoOverrideDate = action.actionDate;
        becameLawDate = action.actionDate;
      }

      // 7. Executive Signature & Enactment into Law
      if (
        text.includes("signed by president") ||
        text.includes("became public law") ||
        text.includes("became private law") ||
        code === "36000" ||
        code === "E40000" ||
        code === "37000"
      ) {
        signedByPresident = true;
        becameLawDate = action.actionDate;
      }
    }
  }

  // Final evaluation based on federal constitutional hierarchy:

  // --- RESOLUTIONS ---

  // Simple Resolutions (H.Res. / S.Res.) - Internal chamber rules / operations
  if (measureType === "hres" || measureType === "sres") {
    const passedOriginChamber =
      measureType === "hres" ? passedHouse : passedSenate;
    if (passedOriginChamber || bothChambersAgreed) {
      return {
        status: "chamber-passed",
        detail: `Agreed to in ${measureType === "hres" ? "House" : "Senate"} (Simple Resolution)`,
      };
    }
    if (explicitlyFailed || isWithdrawn) {
      return {
        status: "explicitly-failed-or-withdrawn",
        detail: isWithdrawn
          ? "Withdrawn"
          : `Defeated in chamber: ${failureReason}`,
        failureReason: failureReason || "Floor defeat or withdrawal",
      };
    }
    if (congressSineDie) {
      return {
        status: "unresolved",
        detail: "Congress adjourned sine die without adoption",
      };
    }
    if (hasCommitteeActivity) {
      return {
        status: "committee-activity",
        detail: "Referred to committee / Active committee consideration",
      };
    }
    return {
      status: "introduced",
      detail: "Introduced in chamber of origin",
    };
  }

  // Concurrent Resolutions (H.Con.Res. / S.Con.Res.) - Operations of both chambers
  if (measureType === "hconres" || measureType === "sconres") {
    if (bothChambersAgreed || (passedHouse && passedSenate)) {
      return {
        status: "both-chambers-passed",
        detail: "Agreed to in both House and Senate (Concurrent Resolution)",
      };
    }
    if (explicitlyFailed || isWithdrawn) {
      return {
        status: "explicitly-failed-or-withdrawn",
        detail: isWithdrawn ? "Withdrawn" : `Defeated: ${failureReason}`,
        failureReason: failureReason || "Floor defeat or withdrawal",
      };
    }
    if (congressSineDie) {
      return {
        status: "unresolved",
        detail: "Congress adjourned sine die without adoption",
      };
    }
    if (passedHouse || passedSenate) {
      return {
        status: "chamber-passed",
        detail: `Passed ${passedHouse ? "House" : "Senate"}; awaiting action in second chamber`,
      };
    }
    if (hasCommitteeActivity) {
      return {
        status: "committee-activity",
        detail: "Referred to committee / Active committee consideration",
      };
    }
    return {
      status: "introduced",
      detail: "Introduced in chamber of origin",
    };
  }

  // --- BILLS (H.R. / S.) AND JOINT RESOLUTIONS (H.J.Res. / S.J.Res.) ---

  // A. VETO OVERRIDE
  if (vetoOverrideDate || (houseVetoOverridden && senateVetoOverridden)) {
    return {
      status: "veto-override",
      detail: publicLawNumber
        ? `Enacted into law over Presidential veto (${publicLawNumber})`
        : "Passed both chambers over Presidential veto by two-thirds supermajority",
      vetoDate,
      vetoOverrideDate: vetoOverrideDate || vetoDate,
      enactmentDate: becameLawDate || vetoOverrideDate || vetoDate,
    };
  }

  // B. PRESIDENTIAL VETO (SUSTAINED / UNOVERRIDDEN)
  if (presidentialVeto) {
    return {
      status: "vetoed",
      detail: explicitlyFailed
        ? "Presidential veto sustained; override attempt defeated in Congress"
        : "Vetoed by President and returned to Congress",
      vetoDate,
      failureReason: failureReason || "Presidential veto",
    };
  }

  // C. SIGNED / BECAME LAW
  if (signedByPresident || publicLawNumber || hasPublicLawText) {
    return {
      status: "signed-became-law",
      detail: publicLawNumber
        ? `Became law (${publicLawNumber})`
        : "Signed by President / Became law",
      enactmentDate: becameLawDate,
    };
  }

  // D. PRESENTED TO PRESIDENT
  if (presentedToPresident || hasEnrolledText) {
    return {
      status: "presented-to-president",
      detail: presentationDate
        ? `Presented to the President on ${presentationDate}`
        : "Enrolled measure presented to the President",
    };
  }

  // E. EXPLICITLY FAILED OR WITHDRAWN
  if (explicitlyFailed || isWithdrawn) {
    return {
      status: "explicitly-failed-or-withdrawn",
      detail: isWithdrawn
        ? "Withdrawn"
        : `Explicitly failed of passage: ${failureReason}`,
      failureReason: failureReason || "Floor defeat or withdrawal",
    };
  }

  // F. SINE DIE ADJOURNMENT (UNRESOLVED)
  if (congressSineDie) {
    return {
      status: "unresolved",
      detail:
        "Congress adjourned sine die without final floor action or enactment",
    };
  }

  // G. BOTH CHAMBERS PASSED
  if (bothChambersAgreed || (passedHouse && passedSenate)) {
    return {
      status: "both-chambers-passed",
      detail: "Passed both House and Senate in identical form",
    };
  }

  // H. SINGLE CHAMBER PASSED
  if (passedHouse || passedSenate) {
    const chamberName = passedHouse ? "House" : "Senate";
    return {
      status: "chamber-passed",
      detail: `Passed ${chamberName}; awaiting action in second chamber`,
    };
  }

  // I. COMMITTEE ACTIVITY
  if (hasCommitteeActivity) {
    return {
      status: "committee-activity",
      detail: "Referred to committee / Active committee consideration",
    };
  }

  // J. INTRODUCED
  return {
    status: "introduced",
    detail: "Introduced in chamber of origin",
  };
}
