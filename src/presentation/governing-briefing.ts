import {
  chiefOfStaffFor,
  governingMatters,
  governingOfficeForPerson,
  governingOutcomes,
  personName,
  staffAssessment,
  staffRecommendation,
  STATE_EXECUTIVE_GAME_PROFILE_NOTE,
  type EntityId,
  type GoverningMatter,
  type World,
} from "../simulation";

/**
 * The staff briefing for a governorship: the few matters that need the
 * officeholder now, everything else still browseable, and what recently came
 * of earlier decisions. Reading it writes nothing and spends no time.
 *
 * The cap on significant matters is a presentation limit, not a quota: an
 * office with nothing open shows nothing open.
 */

export const BRIEFING_SIGNIFICANT_LIMIT = 5;

export interface BriefingOption {
  readonly key: string;
  readonly label: string;
  readonly effect: string;
  readonly tradeoff: string;
  readonly recommended: boolean;
}

export interface BriefingMatter {
  readonly id: EntityId;
  readonly title: string;
  readonly ask: string;
  readonly deadline: string;
  readonly daysLeft: number;
  readonly ifIgnored: string;
  readonly options: readonly BriefingOption[];
  readonly recommendation: {
    readonly byName: string;
    readonly optionLabel: string;
    readonly reason: string;
  } | null;
  readonly canDelegate: boolean;
}

export interface GoverningBriefing {
  readonly officeTitle: string;
  readonly termLine: string;
  /** Shown in an inspection detail, never as a recurring caveat. */
  readonly calendarNote: string | null;
  readonly chiefOfStaff: {
    readonly name: string;
    readonly background: string;
  } | null;
  readonly significant: readonly BriefingMatter[];
  readonly more: readonly BriefingMatter[];
  readonly recent: readonly { readonly date: string; readonly text: string }[];
}

export function americanDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function view(world: World, matter: GoverningMatter): BriefingMatter {
  const recommendation = staffRecommendation(world, matter);
  const recommendedOption = recommendation
    ? matter.options.find((o) => o.key === recommendation.optionKey)
    : undefined;
  const adviser = recommendation
    ? world.people[recommendation.byPersonId]
    : undefined;
  return {
    id: matter.id,
    title: matter.title,
    ask: matter.ask,
    deadline: americanDate(matter.deadline),
    daysLeft: daysUntil(world.currentDate, matter.deadline),
    ifIgnored: matter.ifIgnored,
    options: matter.options.map((option) => ({
      key: option.key,
      label: option.label,
      effect: option.effect,
      tradeoff: option.tradeoff,
      recommended: option.key === recommendation?.optionKey,
    })),
    recommendation:
      recommendation && recommendedOption && adviser
        ? {
            byName: personName(adviser),
            optionLabel: recommendedOption.label,
            reason: recommendation.reason,
          }
        : null,
    canDelegate: recommendation !== null,
  };
}

export function projectGoverningBriefing(
  world: World,
  personId: EntityId,
): GoverningBriefing | null {
  const office = governingOfficeForPerson(world, personId);
  if (!office) return null;
  const open = governingMatters(world, office.officeKey)
    .filter(
      (matter) =>
        matter.status === "open" && matter.holderPersonId === personId,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((matter) => view(world, matter));
  const chief = chiefOfStaffFor(world, office);
  const chiefPerson = chief ? world.people[chief] : undefined;
  return {
    officeTitle: office.title,
    termLine: office.termEndsAt
      ? `Your term runs until ${americanDate(office.termEndsAt)}.`
      : "Your term's end date is not established.",
    calendarNote:
      office.calendarBasis === "verified"
        ? null
        : STATE_EXECUTIVE_GAME_PROFILE_NOTE,
    chiefOfStaff:
      chief && chiefPerson
        ? {
            name: personName(chiefPerson),
            background: staffAssessment(chief).background,
          }
        : null,
    significant: open.slice(0, BRIEFING_SIGNIFICANT_LIMIT),
    more: open.slice(BRIEFING_SIGNIFICANT_LIMIT),
    recent: governingOutcomes(world, office.officeKey)
      .slice(0, 5)
      .map((event) => ({
        date: americanDate(event.occurredAt),
        text: event.summary,
      })),
  };
}
