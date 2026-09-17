import { projectCongress } from "../living-world/congress";
import type { EntityId, IsoDate, World } from "../types";

/**
 * Whether an accountability institution may take an action against a person,
 * answered only from authority the game has compiled.
 *
 * `available` names its source. `unavailable` means the source says no, or the
 * person is not someone the institution acts on. `unknown` means nobody has
 * compiled the rule, which a consumer must treat as "nothing happens", never
 * as permission.
 */

export const INSTITUTION_AUTHORITY_VERSION = "institution-authority/v1";

export type AccountableInstitution =
  | "fec"
  | "us-house-ethics"
  | "us-senate-ethics"
  | `state-legislative-ethics:${string}`
  | `state-executive-ethics:${string}`
  | `state-auditor:${string}`
  | "chamber-floor"
  | "party-conference";

export type InstitutionAction =
  | "receive-complaint"
  | "open-inquiry"
  | "dismiss"
  | "issue-finding"
  | "admonish"
  | "reprimand"
  | "censure"
  | "expel"
  | "remove-from-office"
  | "strip-committee-assignment"
  | "civil-penalty"
  | "refer-for-prosecution"
  | "audit-agency";

export interface InstitutionActionAnswer {
  readonly status: "available" | "unavailable" | "unknown";
  readonly sourceRefs: readonly string[];
  readonly note: string;
}

const SOURCES = {
  fecProcedure:
    "https://www.fec.gov/legal-resources/enforcement/complaints-process/how-to-file-complaint-with-fec/",
  fecEnforcement: "https://www.law.cornell.edu/uscode/text/52/30109",
  klec: [
    "https://klec.ky.gov/Forms/Pages/Complaints-and-Investigations.aspx",
    "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=55533",
  ],
  articleOneFive:
    "https://constitution.congress.gov/browse/article-1/section-5/clause-2/",
  houseRuleXI: "https://ethics.house.gov/about/committee-rules",
  senateEthics: "https://www.ethics.senate.gov/public/index.cfm/about",
} as const;

const PROCEDURE: readonly InstitutionAction[] = [
  "receive-complaint",
  "open-inquiry",
  "dismiss",
  "issue-finding",
];

const answer = (
  status: InstitutionActionAnswer["status"],
  sourceRefs: readonly string[],
  note: string,
): InstitutionActionAnswer => ({ status, sourceRefs, note });

const unknown = (note: string) => answer("unknown", [], note);

function congressChamberOf(
  world: World,
  personId: EntityId,
): "us-house" | "us-senate" | null {
  const congress = projectCongress(world);
  if (!congress) return null;
  for (const chamber of [congress.house, congress.senate])
    if (
      chamber.seats.some(
        (seat) =>
          seat.occupant.kind === "member" &&
          seat.occupant.member.personId === personId,
      )
    )
      return chamber.chamberKey;
  return null;
}

export function canInstitutionAct(
  world: World,
  input: {
    readonly institution: AccountableInstitution;
    readonly action: InstitutionAction;
    readonly subjectPersonId: EntityId;
    readonly onDate: IsoDate;
  },
): InstitutionActionAnswer {
  if (input.onDate !== world.currentDate)
    return unknown("The game answers only for the current date.");
  if (!world.people[input.subjectPersonId])
    return answer("unavailable", [], "No such person.");
  const { institution, action } = input;

  if (institution === "fec") {
    if (PROCEDURE.includes(action))
      return answer(
        "available",
        [SOURCES.fecProcedure],
        "FEC complaint procedure step; not a finding of guilt.",
      );
    if (action === "civil-penalty" || action === "refer-for-prosecution")
      return answer(
        "available",
        [SOURCES.fecEnforcement],
        "52 U.S.C. § 30109: conciliation with civil penalties, and referral of knowing and willful violations to the Attorney General.",
      );
    return answer(
      "unavailable",
      [SOURCES.fecEnforcement],
      "The FEC enforces campaign finance law; it cannot discipline or remove an officeholder.",
    );
  }

  if (institution === "state-legislative-ethics:ky") {
    if (PROCEDURE.includes(action) || action === "reprimand")
      return answer(
        "available",
        SOURCES.klec,
        "Kentucky Legislative Ethics Commission procedure.",
      );
    return unknown(
      "Other Kentucky Legislative Ethics Commission sanctions are not compiled.",
    );
  }

  if (
    institution === "us-house-ethics" ||
    institution === "us-senate-ethics" ||
    institution === "chamber-floor"
  ) {
    const chamber = congressChamberOf(world, input.subjectPersonId);
    const wanted =
      institution === "us-house-ethics"
        ? "us-house"
        : institution === "us-senate-ethics"
          ? "us-senate"
          : chamber;
    if (!chamber || chamber !== wanted)
      return answer(
        "unavailable",
        [SOURCES.articleOneFive],
        "Congress disciplines only its own sitting members; this person is not one.",
      );
    if (institution === "chamber-floor") {
      if (action === "reprimand" || action === "censure" || action === "expel")
        return answer(
          "available",
          [SOURCES.articleOneFive],
          action === "expel"
            ? "U.S. Const. art. I, § 5, cl. 2: expulsion needs two thirds of the chamber."
            : "U.S. Const. art. I, § 5, cl. 2: each chamber may punish its members.",
        );
      if (action === "remove-from-office")
        return answer(
          "unavailable",
          [SOURCES.articleOneFive],
          "A member of Congress leaves office against their will only by expulsion.",
        );
      return unknown("This chamber action is not compiled.");
    }
    if (PROCEDURE.includes(action))
      return answer(
        "available",
        [chamber === "us-house" ? SOURCES.houseRuleXI : SOURCES.senateEthics],
        "Ethics committee procedure; the committee recommends and the chamber decides any punishment.",
      );
    if (
      action === "reprimand" ||
      action === "censure" ||
      action === "expel" ||
      action === "remove-from-office"
    )
      return answer(
        "unavailable",
        [SOURCES.articleOneFive],
        "The committee can only recommend this; the full chamber decides.",
      );
    return unknown("This committee action is not compiled.");
  }

  return unknown(
    `What ${institution} may do is not compiled (${INSTITUTION_AUTHORITY_VERSION}).`,
  );
}
