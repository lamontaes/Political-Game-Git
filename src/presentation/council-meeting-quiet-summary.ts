import { composeGroundedLine } from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { meetingItemsThatMatter } from "../simulation/living-world/local-council-meetings";
import type {
  CouncilMeetingDepth,
  EntityId,
  LegislativeVoteRecord,
  World,
} from "../simulation/types";

const QUIET_SUMMARY_VERSION = "council-meeting-quiet-summary/v1";
const QUIET_SUMMARY_BANK = {
  key: QUIET_SUMMARY_VERSION,
  version: QUIET_SUMMARY_VERSION,
  surface: "journal",
  act: "tell",
  parts: {
    core: {
      required: true,
      variants: [
        {
          key: "quiet-vote-result",
          kind: "template",
          text: "{{designation}} — {{title}}: {{what-it-does}} The measure was {{outcome}} by {{tally}}; your recorded vote was {{player-vote}}.",
        },
      ],
    },
  },
} as const;

export interface CouncilMeetingQuietSummary {
  readonly heldEventId: EntityId;
  readonly dueItemId: EntityId;
  readonly items: readonly {
    readonly measureId: EntityId;
    readonly voteId: EntityId;
    readonly reasons: readonly [];
    readonly line: string;
    readonly sourceRecordIds: readonly EntityId[];
  }[];
}

function playerVoteText(
  vote: LegislativeVoteRecord,
  playerId: EntityId,
): string {
  const disposition = vote.dispositions.find(
    (entry) => entry.personId === playerId,
  )?.disposition;
  switch (disposition) {
    case "yea":
      return "yea";
    case "nay":
      return "nay";
    case "present-not-voting":
      return "present, not voting";
    case "absent":
      return "absent";
    case "excused":
      return "excused";
    default:
      return "not listed on the roll call";
  }
}

/**
 * Read a held council meeting event into one grounded journal line per quiet
 * roll call. The caller supplies the depth actually selected for this meeting;
 * this projection writes neither a vote nor a summary event.
 */
export function projectCouncilMeetingQuietSummary(
  world: World,
  playerId: EntityId,
  heldEventId: EntityId,
  meetingDepth: CouncilMeetingDepth,
): CouncilMeetingQuietSummary | null {
  const event = world.history.events.find(
    (entry) =>
      entry.id === heldEventId &&
      entry.type === "local.council-meeting-held" &&
      entry.stableKey.endsWith(":held"),
  );
  if (!event || !world.people[playerId]) return null;
  const dueStableKey = event.stableKey.slice(0, -":held".length);
  const due = world.history.futureDueItems.find(
    (item) => item.stableKey === dueStableKey,
  );
  if (!due) return null;

  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
  const agendaMeasureIds = event.involvedEntityIds.filter((id) =>
    measures.has(id),
  );
  const matters = new Map(
    meetingItemsThatMatter(world, playerId, due.id, agendaMeasureIds).map(
      (matter) => [matter.measureId, matter],
    ),
  );
  const votes = world.history.legislativeVotes ?? [];
  const items =
    meetingDepth === "everything"
      ? []
      : agendaMeasureIds.flatMap((measureId) => {
          const matter = matters.get(measureId);
          if (!matter || matter.reasons.length > 0) return [];
          const measure = measures.get(measureId);
          if (!measure) return [];
          const vote = [...votes]
            .reverse()
            .find(
              (row) =>
                row.measureId === measureId && row.takenAt === event.occurredAt,
            );
          if (!vote) return [];
          const facts: GroundedEnglishPacket["facts"] = {
            designation: {
              text: measure.designation,
              sourceRecordIds: [measure.id],
            },
            title: {
              text: measure.shortTitle,
              sourceRecordIds: [measure.id],
            },
            "what-it-does": {
              text: measure.summary.replace(/\s+/g, " ").trim(),
              sourceRecordIds: [measure.id],
            },
            outcome: {
              text: vote.outcome === "passed" ? "adopted" : "rejected",
              sourceRecordIds: [vote.id],
            },
            tally: {
              text: `${vote.tally.yea}-${vote.tally.nay}`,
              sourceRecordIds: [vote.id],
            },
            "player-vote": {
              text: playerVoteText(vote, playerId),
              sourceRecordIds: [vote.id],
            },
          };
          const packet: GroundedEnglishPacket = {
            surface: "journal",
            momentKey: `${event.stableKey}:quiet:${measureId}`,
            worldSeed: world.seed,
            bankVersion: QUIET_SUMMARY_VERSION,
            stage: "adult",
            sourceRecordIds: [event.id, measure.id, vote.id],
            facts,
            viewer: { personId: playerId, traits: {} },
            knowledge: Object.entries(facts).flatMap(([factKey, fact]) =>
              fact
                ? [
                    {
                      personId: playerId,
                      factKey,
                      sourceRecordIds: [event.id, ...fact.sourceRecordIds],
                    },
                  ]
                : [],
            ),
          };
          const composed = composeGroundedLine(packet, QUIET_SUMMARY_BANK);
          if (composed.kind !== "rendered") return [];
          return [
            {
              measureId,
              voteId: vote.id,
              reasons: [] as const,
              line: composed.text,
              sourceRecordIds: composed.sourceRecordIds,
            },
          ];
        });
  return { heldEventId, dueItemId: due.id, items };
}
