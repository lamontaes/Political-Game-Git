import type {
  EntityId,
  HistoricalEvent,
  LegislativeMemberDisposition,
  World,
} from "../simulation/types";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type ComposedPart,
} from "./english-composition";
import type { EnglishSurface, GroundedEnglishFact } from "./grounded-english";

const VERSION = "council-meeting-summary/v1";

export interface CouncilMeetingSummaryLine {
  readonly eventId: EntityId;
  readonly measureId: EntityId;
  readonly voteId: EntityId;
  readonly text: string;
  /** The English engine parts prove this is composed, not copied summary text. */
  readonly parts: readonly ComposedPart[];
}

function voteWords(
  disposition: LegislativeMemberDisposition | undefined,
): string {
  switch (disposition) {
    case "yea":
      return "you voted yes";
    case "nay":
      return "you voted no";
    case "present-not-voting":
      return "you were present and did not vote";
    case "absent":
      return "you were absent";
    case "excused":
      return "you were excused";
    default:
      return "you did not cast a vote";
  }
}

function bank(surface: EnglishSurface): ComposedLineBank {
  return {
    key: `council-meeting-summary:${surface}`,
    version: VERSION,
    surface,
    act: "tell",
    parts: {
      core: {
        required: true,
        variants: [
          {
            key: "item-tally-own-vote",
            kind: "template",
            text: "{{item}} The tally was {{tally}}; {{player-vote}}.",
            requiresFacts: ["item", "tally", "player-vote"],
          },
        ],
      },
    },
  };
}

/**
 * Compose one line for every quiet roll call recorded by a council meeting.
 * Both the Journal and the minutes use this reader; neither rewrites the
 * simulation event's authored summary or creates another summary record.
 */
export function composeCouncilMeetingLines(
  world: World,
  event: HistoricalEvent,
  playerPersonId: EntityId,
  surface: "journal" | "bill-document",
): readonly CouncilMeetingSummaryLine[] {
  if (event.type !== "local.council-meeting-held") return [];
  const measureIds = new Set(event.involvedEntityIds);
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );

  return (world.history.legislativeVotes ?? []).flatMap((vote) => {
    if (!measureIds.has(vote.measureId) || vote.votedAt !== event.occurredAt)
      return [];
    const measure = measures.get(vote.measureId);
    if (!measure) return [];
    const own = vote.dispositions.find(
      (row) => row.personId === playerPersonId,
    )?.disposition;
    const sourceRecordIds = [event.id, measure.id, vote.id];
    const fact = (text: string): GroundedEnglishFact => ({
      text,
      sourceRecordIds,
    });
    const result = composeGroundedLine(
      {
        surface,
        momentKey: `${event.id}:${vote.id}:${playerPersonId}`,
        worldSeed: world.seed,
        bankVersion: VERSION,
        stage: "adult",
        sourceRecordIds,
        facts: {
          item: fact(`${measure.designation}: ${measure.summary}.`),
          tally: fact(`${vote.tally.yea}-${vote.tally.nay}`),
          "player-vote": fact(voteWords(own)),
        },
        knowledge: [],
      },
      bank(surface),
    );
    return result.kind === "rendered"
      ? [
          {
            eventId: event.id,
            measureId: measure.id,
            voteId: vote.id,
            text: result.text,
            parts: result.parts,
          },
        ]
      : [];
  });
}

export function composeCouncilMeetingMinutes(
  world: World,
  event: HistoricalEvent,
  playerPersonId: EntityId,
): readonly CouncilMeetingSummaryLine[] {
  return composeCouncilMeetingLines(
    world,
    event,
    playerPersonId,
    "bill-document",
  );
}
