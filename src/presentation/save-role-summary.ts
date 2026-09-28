import { activeCampaignForCandidate } from "../simulation/campaign-queries";
import { officesHeldBy } from "../simulation/governing/office-consequence";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import type { EntityId, World } from "../simulation/types";

/**
 * THE ROLE A SAVED LIFE HOLDS, FOR THE TITLE SCREEN.
 *
 * The title screen reads a save summary and never the world, so what it can
 * show a returning player is only what the summary carries. It carried a name,
 * an age and a town, which is why a returning player always arrived at home:
 * nothing told the title they sat in a chamber, a courtroom or a campaign
 * office. This reads that one fact from the canonical records when the game is
 * saved: offices held (officesHeldBy), seats on a city council or county
 * commission (organization participations), a judgeship, an active campaign,
 * or a job in government. The first that applies wins, in that order.
 *
 * Null means the life holds no civic role today, which is an ordinary state
 * and never a guess.
 */

export type SavedRoleKind =
  | "president"
  | "member-of-congress"
  | "governor"
  | "state-executive"
  | "state-legislator"
  | "mayor"
  | "council-member"
  | "county-commissioner"
  | "judge"
  | "candidate"
  | "public-servant";

export interface SavedRoleSummary {
  readonly kind: SavedRoleKind;
  /** Plain words for the save list: "State Senator", "Judge". */
  readonly title: string;
  /** The postal code of the character's home state, when it is known. */
  readonly stateUsps: string | null;
  /** For a legislator: which chamber, when the record says. */
  readonly chamber?: "house" | "senate" | "unicameral";
  /** For a judge: which kind of court, when the record says. */
  readonly court?: "supreme" | "appellate" | "trial";
  /** For a public servant: where the work is done. */
  readonly workplace?: "legislature" | "city-hall" | "county" | "court";
}

const GOVERNMENT_ORGANIZATIONS =
  /^(sector:government|service:(municipal-government|municipal-office|county-government|court-workplace|elected-legislator))$/;

function chamberOf(text: string): SavedRoleSummary["chamber"] | undefined {
  if (/unicameral|legislature$|:legislature\b/i.test(text)) return "unicameral";
  if (/senat/i.test(text)) return "senate";
  if (/house|assembly|representative|delegate/i.test(text)) return "house";
  return undefined;
}

function courtOf(text: string): SavedRoleSummary["court"] {
  if (/supreme|chief justice/i.test(text)) return "supreme";
  if (/appeal|appellate/i.test(text)) return "appellate";
  return "trial";
}

function withOptional(
  base: Omit<SavedRoleSummary, "chamber" | "court" | "workplace">,
  extra: Partial<Pick<SavedRoleSummary, "chamber" | "court" | "workplace">>,
): SavedRoleSummary {
  return {
    ...base,
    ...(extra.chamber ? { chamber: extra.chamber } : {}),
    ...(extra.court ? { court: extra.court } : {}),
    ...(extra.workplace ? { workplace: extra.workplace } : {}),
  };
}

/** One office, classified from its recorded key and title. */
function officeRole(
  officeKey: string,
  title: string,
  stateUsps: string | null,
): SavedRoleSummary | null {
  const text = `${officeKey} ${title}`;
  const base = { title, stateUsps };
  if (/president/i.test(text) && !/presiding|pro tem|senate/i.test(text))
    return { ...base, kind: "president" };
  if (/chief-justice|chief justice|judicial|judge|justice/i.test(text))
    return withOptional({ ...base, kind: "judge" }, { court: courtOf(text) });
  if (/^us-(house|senate)|U\.S\. (Senator|Representative)/.test(text))
    return withOptional(
      { ...base, kind: "member-of-congress" },
      { chamber: /senat/i.test(text) ? "senate" : "house" },
    );
  if (/governor/i.test(text) && !/lieutenant/i.test(text))
    return { ...base, kind: "governor" };
  if (/legislat|senator|representative|assembly|delegate/i.test(text))
    return withOptional(
      { ...base, kind: "state-legislator" },
      { chamber: chamberOf(text) },
    );
  return { ...base, kind: "state-executive" };
}

/**
 * The civic role `personId` holds today, or null. Read-only: it writes
 * nothing and consumes no randomness.
 */
export function savedRoleSummary(
  world: World,
  personId: EntityId,
): SavedRoleSummary | null {
  const stateUsps = homeStateUsps(world, personId);

  const offices = officesHeldBy(world, personId);
  if (offices.length > 0) {
    const roles = offices.flatMap(
      (office) => officeRole(office.officeKey, office.title, stateUsps) ?? [],
    );
    // The highest office wins when a record lists more than one.
    const rank: readonly SavedRoleKind[] = [
      "president",
      "member-of-congress",
      "governor",
      "judge",
      "state-legislator",
      "state-executive",
    ];
    const best = [...roles].sort(
      (a, b) => rank.indexOf(a.kind) - rank.indexOf(b.kind),
    )[0];
    if (best) return best;
  }

  for (const { participation, state } of activeOrganizationParticipationsAt(
    world,
    personId,
  )) {
    const roleKind = state.roleKind ?? "";
    if (!roleKind.startsWith("leader:municipal-")) continue;
    if (roleKind === "leader:municipal-mayor")
      return { kind: "mayor", title: "Mayor", stateUsps };
    if (
      roleKind === "leader:municipal-member" ||
      roleKind === "leader:municipal-presiding-member"
    ) {
      const county =
        organizationProfileAt(world, participation.organizationId)
          ?.classification === "service:county-government";
      return county
        ? {
            kind: "county-commissioner",
            title: "County commissioner",
            stateUsps,
          }
        : { kind: "council-member", title: "Council member", stateUsps };
    }
  }

  const work = activeWorkRelationshipsAt(world, personId);
  const judge = work.find((entry) =>
    (entry.role.occupationClassification ?? "").startsWith(
      "profession:judicial-office",
    ),
  );
  if (judge) {
    const title = judge.role.title || "Judge";
    return withOptional(
      { kind: "judge", title, stateUsps },
      { court: courtOf(title) },
    );
  }

  if (activeCampaignForCandidate(world, personId))
    return { kind: "candidate", title: "Running for office", stateUsps };

  for (const entry of work) {
    const organizationId = entry.relationship.organizationId;
    const classification = organizationId
      ? (organizationProfileAt(world, organizationId)?.classification ?? "")
      : "";
    const kind = entry.relationship.kind;
    const government =
      GOVERNMENT_ORGANIZATIONS.test(classification) ||
      /^employment:(legislative-staff|executive-staff|civil-service|public-service)$/.test(
        kind,
      );
    if (!government) continue;
    const workplace: SavedRoleSummary["workplace"] =
      classification === "service:court-workplace"
        ? "court"
        : classification === "service:county-government"
          ? "county"
          : /legislat/.test(`${kind} ${classification}`)
            ? "legislature"
            : "city-hall";
    return withOptional(
      {
        kind: "public-servant",
        title: entry.role.title || "Public servant",
        stateUsps,
      },
      { workplace },
    );
  }

  return null;
}
