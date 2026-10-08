import research from "../../data/research/legislature/chamber-leadership.json" with { type: "json" };
import { municipalRulePackById } from "./municipal-rule-registry";
import type { DecisionConsideration } from "./types";

export type SeniorityImportance = NonNullable<
  DecisionConsideration["importance"]
>;
export type CommitteeAssignmentAuthority =
  | "speaker"
  | "senate-president"
  | "committee-on-committees"
  | "party-caucuses"
  | "council-president"
  | "presiding-officer";
export type ChairSelectionAuthority =
  | "speaker"
  | "senate-president"
  | "party-caucuses-and-chamber"
  | "chamber-vote"
  | "council-vote";

interface LeadershipFields {
  readonly assignmentAuthority: CommitteeAssignmentAuthority;
  readonly chairSelectionAuthority: ChairSelectionAuthority;
  readonly posts: readonly {
    readonly key: string;
    readonly title: string;
    readonly selection: "floor-vote" | "caucus-vote" | "direct-election";
  }[];
  readonly partyRatioRule:
    "proportional" | "party-agreement" | "nonpartisan" | "not-applicable";
  readonly chairMayDeclineBill: boolean;
  readonly seniorityImportance: SeniorityImportance;
}

export interface ChamberLeadershipProfile extends LeadershipFields {
  readonly jurisdictionKey: string;
  readonly chamberKey: string;
  readonly status: "researched" | "estimated-from-average";
  readonly citations: Readonly<Record<keyof LeadershipFields, string>>;
  readonly estimatedFields: readonly (keyof LeadershipFields)[];
  readonly estimatedFrom: Readonly<
    Partial<Record<keyof LeadershipFields, string>>
  >;
  readonly committeeChairRules: readonly {
    readonly committeeKey: string;
    readonly mayDecline: boolean;
    readonly citation: string;
  }[];
}

interface FieldReading {
  readonly id: string;
  readonly value: unknown;
  readonly sourceId: string;
  readonly estimatedFrom: string | null;
}
interface Research {
  readonly sources: Readonly<
    Record<
      string,
      {
        readonly title: string;
        readonly url: string;
        readonly citation: string;
      }
    >
  >;
  readonly tables: Readonly<
    Record<keyof LeadershipFields, readonly FieldReading[]>
  >;
  readonly templates: Readonly<
    Record<string, Readonly<Record<keyof LeadershipFields, string>>>
  >;
  readonly councilForms: Readonly<Record<string, string>>;
  readonly defaultCouncilTemplate: string;
  readonly rows: readonly {
    readonly jurisdictionKey: string;
    readonly chamberKey: string;
    readonly templateId: string;
  }[];
}
const data = research as Research;
const rows = new Map(
  data.rows.map((row) => [`${row.jurisdictionKey}|${row.chamberKey}`, row]),
);
const fieldReadings = new Map(
  Object.values(data.tables)
    .flat()
    .map((row) => [row.id, row]),
);

/** PLACEHOLDER: unread chamber customs use the named public practice in the field table, never silent permission. */
export function chamberLeadershipProfileFor(input: {
  readonly jurisdictionKey: string;
  readonly chamberKey: string;
  readonly form?: "state" | "territory" | "council" | "federal";
  readonly councilForm?:
    "council-manager" | "mayor-council" | "elected-president";
  readonly councilRulePackId?: string;
}): ChamberLeadershipProfile {
  const row = rows.get(`${input.jurisdictionKey}|${input.chamberKey}`);
  const templateId =
    input.form === "council"
      ? (data.councilForms[input.councilForm ?? ""] ??
        data.defaultCouncilTemplate)
      : row?.templateId;
  if (!templateId)
    throw new Error(
      `No leadership chamber row: ${input.jurisdictionKey}|${input.chamberKey}`,
    );
  const template = data.templates[templateId]!;
  const values: Partial<LeadershipFields> = {};
  const citations = {} as Record<keyof LeadershipFields, string>;
  const estimatedFields: (keyof LeadershipFields)[] = [];
  const estimatedFrom: Partial<Record<keyof LeadershipFields, string>> = {};
  for (const key of Object.keys(template) as (keyof LeadershipFields)[]) {
    const reading = fieldReadings.get(template[key])!;
    Object.assign(values, { [key]: reading.value });
    const source = data.sources[reading.sourceId]!;
    citations[key] = `${source.title}; ${source.citation}; ${source.url}`;
    if (reading.estimatedFrom) {
      estimatedFields.push(key);
      estimatedFrom[key] = reading.estimatedFrom;
    }
  }
  const pack = input.councilRulePackId
    ? municipalRulePackById(input.councilRulePackId)
    : null;
  const committees =
    pack?.chambers.find((chamber) => chamber.chamberKey === input.chamberKey)
      ?.committees ?? [];
  const committeeChairRules = committees.flatMap((committee) =>
    committee.chairMayDeclineToHear.kind === "known"
      ? [
          {
            committeeKey: committee.committeeKey,
            mayDecline: committee.chairMayDeclineToHear.value,
            citation: committee.chairMayDeclineToHear.source.citation,
          },
        ]
      : [],
  );
  return {
    ...(values as LeadershipFields),
    jurisdictionKey: input.jurisdictionKey,
    chamberKey: input.chamberKey,
    status: estimatedFields.length ? "estimated-from-average" : "researched",
    citations,
    estimatedFields,
    estimatedFrom,
    committeeChairRules,
  };
}

export function leadershipProfilesForJurisdiction(
  jurisdictionKey: string,
): readonly ChamberLeadershipProfile[] {
  return data.rows
    .filter((row) => row.jurisdictionKey === jurisdictionKey)
    .map((row) => chamberLeadershipProfileFor(row));
}

/** A committee's recorded rule wins over the chamber's disclosed estimate. */
export function chairMayDeclineFor(
  profile: ChamberLeadershipProfile,
  committeeKey: string,
): boolean {
  return (
    profile.committeeChairRules.find((row) => row.committeeKey === committeeKey)
      ?.mayDecline ?? profile.chairMayDeclineBill
  );
}
