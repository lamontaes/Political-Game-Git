/**
 * The District of Columbia's institution identity and the Home Rule Act's
 * procedure for an act: §§ 1-204.04(e), 1-204.12 and 1-206.02(c)(1).
 * Filing, officeholders and the Council's own rules are not compiled.
 */
import { packForResearchGovernment } from "./national-packs";
import type { ResearchGovernment } from "./national-research";
import type { Cell, MunicipalPackInput } from "./parse";
import type { MayoralActionWindow, PowerRule, VoteThreshold } from "./types";
const government: ResearchGovernment = {
  key: "us-dc-washington",
  state: "DC",
  displayName: "District of Columbia",
  residentName: "District of Columbia",
  attestedAsOf: "2026-09-19",
  packetId: "dc-code-1-204-01",
  sources: [],
  form: null,
  body: {
    name: null,
    size: null,
    composition: null,
    presidingOffice: null,
    executiveSelection: null,
    sourceKey: "dc-code-1-204-01",
  },
  separation: null,
  mayor: null,
  manager: null,
  partisanship: null,
  terms: [],
  powers: [],
  consolidation: null,
  meetingPlaces: [],
  meetingSeries: [],
  placeCrosswalk: null,
  unresolved: [],
};
function unestablished(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(unestablished);
  if (!node || typeof node !== "object") return node;
  if ("status" in node)
    return {
      status: "UNKNOWN",
      reason:
        "Not established by the scoped D.C. institution-identity provisions.",
    };
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, unestablished(value)]),
  );
}
const base = unestablished(
  packForResearchGovernment(government),
) as MunicipalPackInput;
const excerpts = {
  "dc-code-1-204-01":
    "There is established a Council of the District of Columbia; and the members of the Council shall be elected by the registered qualified electors of the District.\nThe Council established under subsection (a) of this section shall consist of 13 members elected on a partisan basis. The Chairman and 4 members shall be elected at large in the District, and 8 members shall be elected 1 each from the 8 election wards established, from time to time, under Chapter 10 of this title .",
  "dc-code-1-204-21":
    "There is established the Office of Mayor of the District of Columbia; and the Mayor shall be elected by the registered qualified electors of the District.",
  "dc-code-1-204-22":
    "The executive power of the District shall be vested in the Mayor who shall be the chief executive officer of the District government.",
} as const;
function fact(
  value: unknown,
  sourceKey: keyof typeof excerpts,
  section: string,
): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey,
    legalLocator: `D.C. Code § ${section}`,
    excerpt:
      sourceKey === "dc-code-1-204-01"
        ? excerpts[sourceKey].split("\n")[section === "1-204.01(a)" ? 0 : 1]!
        : excerpts[sourceKey],
    // § 1-207.71(b)/(c); original §§ 401, 421 and 422 are visually
    // verified in the preserved 1973 Act. Ratification is separately recorded.
    effectiveDate: section === "1-204.01(b)(1)" ? "1974-07-01" : "1975-01-02",
  };
}
/** The date the procedure sections below were retrieved and read. */
const DC_PROCEDURE_READ_ON = "2026-09-23";
/** A fact one of the procedure sections states, quoted from it. */
function said(
  value: unknown,
  sourceKey: string,
  section: string,
  excerpt: string,
): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey,
    legalLocator: `D.C. Code § ${section}`,
    excerpt,
    effectiveDate: DC_PROCEDURE_READ_ON,
  };
}
const DC_PASSAGE_EXCERPT =
  "The Council, to discharge the powers and duties imposed herein, shall pass acts and adopt resolutions, upon a vote of a majority of the members of the Council present and voting, unless otherwise provided in this chapter or by the Council.";
const DC_READINGS_EXCERPT =
  "Each proposed act shall be read twice in substantially the same form, with at least 13 days intervening between each reading.";
const DC_QUORUM_EXCERPT =
  "A majority of the Council shall constitute a quorum for the lawful convening of any meeting and for the transaction of business of the Council, except a lesser number may hold hearings.";
const DC_VETO_EXCERPT =
  "An act passed by the Council shall be presented by the Chairman of the Council to the Mayor, who shall, within 10 calendar days (excluding Saturdays, Sundays, and holidays) after the act is presented to him, either approve or disapprove such act.";
const DC_DEEMED_EXCERPT =
  "If any act so passed shall not be returned to the Council by the Mayor within 10 calendar days after it shall have been presented to him, the Mayor shall be deemed to have approved it,";
const DC_OVERRIDE_EXCERPT =
  "If, within 30 calendar days after an act has been timely returned by the Mayor to the Council with his disapproval, two-thirds of the members of the Council present and voting vote to reenact such act, the act so reenacted shall become law subject to the provisions of § 1-206.02(c) .";
const DC_REVIEW_EXCERPT =
  "such act shall take effect upon the expiration of the 30-calendar-day period (excluding Saturdays, Sundays, and holidays, and any day on which neither House is in session because of an adjournment sine die, a recess of more than 3 days, or an adjournment of more than 3 days) beginning on the day such act is transmitted by the Chairman to the Speaker of the House of Representatives and the President of the Senate, or upon the date prescribed by such act, whichever is later, unless during such 30-day period, there has been enacted into law a joint resolution disapproving such act.";
export const DC_PRODUCTION_PACK: MunicipalPackInput = {
  ...base,
  electedStructure: {
    ...base.electedStructure,
    bodyName: fact(
      "Council of the District of Columbia",
      "dc-code-1-204-01",
      "1-204.01(a)",
    ),
    bodySize: fact(13, "dc-code-1-204-01", "1-204.01(b)(1)"),
    composition: fact(
      {
        pattern: "HYBRID_DISTRICT_AT_LARGE",
        districtSeats: null,
        atLargeSeats: 5,
        wardSeats: 8,
        note: "Chairman and four other members elected at large; one member from each of eight wards.",
      },
      "dc-code-1-204-01",
      "1-204.01(b)(1)",
    ),
    executiveSelection: fact(
      "The Mayor is elected by the registered qualified electors of the District.",
      "dc-code-1-204-21",
      "1-204.21(a)",
    ),
  },
  administrativeStructure: {
    ...base.administrativeStructure,
    mayor: fact(
      {
        title: "Mayor of the District of Columbia",
        structuralPosition: "SEPARATE_CHIEF_EXECUTIVE",
      },
      "dc-code-1-204-22",
      "1-204.22",
    ),
  },
  enumeratedPowers: [
    {
      power: "ORDINANCE_ADOPTION",
      heldByRole: "COUNCIL",
      capability: said(
        true,
        "dc-code-1-204-12",
        "1-204.12(a)",
        DC_PASSAGE_EXCERPT,
      ),
      details: said(
        {
          allowed: true,
          target: "Acts of the Council, used for all legislative purposes",
          conditions: [
            "A majority of the members present and voting.",
            "Each proposed act is read twice in substantially the same form, with at least 13 days intervening between each reading.",
          ],
          threshold: {
            numerator: 1,
            denominator: 2,
            denominatorBasis: "MEMBERS_PRESENT_AND_VOTING",
            fixedVotesRequired: null,
          },
          exceptions: [
            "An act the Council finds, by two-thirds of the members, must pass after a single reading for emergency circumstances is effective for no more than 90 days.",
          ],
        } satisfies PowerRule,
        "dc-code-1-204-12",
        "1-204.12(a)",
        DC_PASSAGE_EXCERPT,
      ),
    },
    {
      power: "VETO",
      heldByRole: "MAYOR",
      capability: said(
        true,
        "dc-code-1-204-04",
        "1-204.04(e)",
        DC_VETO_EXCERPT,
      ),
      details: said(
        {
          allowed: true,
          target: "Acts passed by the Council",
          conditions: [
            "Within 10 calendar days (excluding Saturdays, Sundays, and holidays) after the act is presented, the Mayor approves it or returns it with written reasons.",
          ],
          threshold: null,
          exceptions: [
            "An act not returned in time is deemed approved, unless a Council recess of 10 days or more prevents its return.",
          ],
        } satisfies PowerRule,
        "dc-code-1-204-04",
        "1-204.04(e)",
        DC_VETO_EXCERPT,
      ),
    },
    {
      power: "OVERRIDE",
      heldByRole: "COUNCIL",
      capability: said(
        true,
        "dc-code-1-204-04",
        "1-204.04(e)",
        DC_OVERRIDE_EXCERPT,
      ),
      details: said(
        {
          allowed: true,
          target: "An act the Mayor timely returned with disapproval",
          conditions: [
            "Within 30 calendar days after the return, two-thirds of the members present and voting vote to reenact it.",
          ],
          threshold: {
            numerator: 2,
            denominator: 3,
            denominatorBasis: "MEMBERS_PRESENT_AND_VOTING",
            fixedVotesRequired: null,
          },
          exceptions: [],
        } satisfies PowerRule,
        "dc-code-1-204-04",
        "1-204.04(e)",
        DC_OVERRIDE_EXCERPT,
      ),
    },
  ],
  legislativeProcedure: {
    ...base.legislativeProcedure,
    measureTypes: said(
      ["act", "resolution"],
      "dc-code-1-204-12",
      "1-204.12(a)",
      DC_PASSAGE_EXCERPT,
    ),
    // The Home Rule Act leaves who introduces an act to the Council's own
    // rules (§ 1-204.04(c)), which were not read. UNKNOWN here; the game's
    // placeholder lives in municipal-procedure-placeholders.ts.
    introductionSponsorship: {
      status: "UNKNOWN",
      reason:
        "The Home Rule Act does not say who introduces an act; the Council's Rules of Organization and Procedure, which § 1-204.04(c) requires it to adopt, were not read.",
    },
    readings: said(2, "dc-code-1-204-12", "1-204.12(a)", DC_READINGS_EXCERPT),
    betweenReadings: said(
      { minimumInterveningDays: 13, sameDayException: null },
      "dc-code-1-204-12",
      "1-204.12(a)",
      DC_READINGS_EXCERPT,
    ),
    committeeReferral: {
      status: "NO_REQUIREMENT_FOUND",
      sourceKey: "dc-code-1-204-12",
      legalLocator: "D.C. Code § 1-204.12(a)",
      excerpt: DC_READINGS_EXCERPT,
      reason:
        "The Home Rule Act's procedure for an act is two readings and a vote; it names no committee stage. The Council's own rules, which may, were not read.",
    },
    quorum: said(
      "A majority of the Council constitutes a quorum for the lawful convening of any meeting and for the transaction of business; a lesser number may hold hearings.",
      "dc-code-1-204-12",
      "1-204.12(c)",
      DC_QUORUM_EXCERPT,
    ),
    quorumRule: said(
      {
        numerator: 1,
        denominator: 2,
        denominatorBasis: "TOTAL_MEMBERSHIP",
        fixedVotesRequired: null,
      } satisfies VoteThreshold,
      "dc-code-1-204-12",
      "1-204.12(c)",
      DC_QUORUM_EXCERPT,
    ),
    passageThreshold: said(
      "The Council passes an act by a majority of the members present and voting, unless the Home Rule Act or the Council provides otherwise.",
      "dc-code-1-204-12",
      "1-204.12(a)",
      DC_PASSAGE_EXCERPT,
    ),
    mayoralAction: said(
      "The Chairman presents an act the Council passes to the Mayor, who approves it by signing it or returns it to the Council with written reasons for disapproval.",
      "dc-code-1-204-04",
      "1-204.04(e)",
      DC_VETO_EXCERPT,
    ),
    mayoralActionWindow: said(
      {
        daysToAct: 10,
        dayBasis: "BUSINESS",
        inactionOutcome: "BECOMES_LAW_WITHOUT_SIGNATURE",
      } satisfies MayoralActionWindow,
      "dc-code-1-204-04",
      "1-204.04(e)",
      DC_DEEMED_EXCERPT,
    ),
    override: said(
      "Within 30 calendar days after the Mayor returns an act, two-thirds of the members present and voting may reenact it.",
      "dc-code-1-204-04",
      "1-204.04(e)",
      DC_OVERRIDE_EXCERPT,
    ),
    effectivePublication: said(
      "The Chairman transmits the act to the Speaker of the House and the President of the Senate, and it takes effect after a 30-day review period (excluding Saturdays, Sundays, holidays and days neither House is in session) unless Congress enacts a joint resolution disapproving it.",
      "dc-code-1-206-02",
      "1-206.02(c)(1)",
      DC_REVIEW_EXCERPT,
    ),
  },
  unresolved: [
    "Officeholders, filing/qualification, appointments and public-meeting details remain uncompiled. The House Delegate and statehood Senator/Representative offices are distinct and are not created by this pack.",
    "Who may introduce an act, committee referral and any vote at first reading are set by the Council's Rules of Organization and Procedure, which were not read.",
    "Emergency acts (one reading, two-thirds of the members, effective no more than 90 days), temporary acts, budget acts and the 60-day review for criminal-law acts are not compiled.",
  ],
};
