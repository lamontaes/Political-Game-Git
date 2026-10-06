import { recordsWithFieldValue } from "../simulation/history-index";
import { recordWorldEvent } from "../simulation/world";
import type { EntityId, World } from "../simulation/types";
import { councilElectionNightRoomPacket } from "./election-night-scene";
import { electionNightReports } from "./election-night-reporting";

/** Saved viewing position. It never changes or resolves an election count. */
export function electionNightViewedBeat(
  world: World,
  playerPersonId: EntityId,
  contestId: EntityId,
): number {
  const reports = electionNightReports(world, contestId);
  if (!reports) return 0;
  const viewed = recordsWithFieldValue(
    world.history.events,
    "type",
    "election.night-report-viewed",
  )
    .filter(
      (event) =>
        event.occurredAt <= world.currentDate &&
        event.recordedAt <= world.currentDate &&
        event.sequence < world.history.nextSequence &&
        event.tags.includes(`result:${reports.resultId}`) &&
        event.participants.some((person) => person.personId === playerPersonId),
    )
    .at(-1);
  const index = Number(
    viewed?.tags.find((tag) => tag.startsWith("beat:"))?.slice(5) ?? 0,
  );
  return Number.isSafeInteger(index) &&
    index >= 0 &&
    index <= reports.finalBeatIndex
    ? index
    : 0;
}

/** An actual viewing choice, admitted against the current recorded room/result. */
export function recordElectionNightReportView(
  world: World,
  playerPersonId: EntityId,
  contestId: EntityId,
  action: "next" | "skip",
): World {
  if (action !== "next" && action !== "skip")
    throw new Error("Choose the next returns or skip to the result.");
  const packet = councilElectionNightRoomPacket(
    world,
    playerPersonId,
    contestId,
  );
  if (!packet?.reports)
    throw new Error("These returns are no longer here to watch.");
  const current = electionNightViewedBeat(world, playerPersonId, contestId);
  const index =
    action === "skip"
      ? packet.reports.finalBeatIndex
      : Math.min(current + 1, packet.reports.finalBeatIndex);
  if (index === current) return world;
  return recordWorldEvent(world, {
    stableKey: `election-night:view:${packet.resultId}:${playerPersonId}:${index}`,
    type: "election.night-report-viewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: packet.venue.location.jurisdictionId,
    involvedEntityIds: [playerPersonId, packet.contestId, packet.resultId],
    participants: [
      { personId: playerPersonId, role: "other:result-viewer", detail: action },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `result:${packet.resultId}`,
      `contest:${contestId}`,
      `presence:${packet.presenceEventId}`,
      `beat:${index}`,
    ],
    summary:
      action === "skip"
        ? "The candidate skipped to the saved final election return."
        : "The candidate watched the next saved election return.",
    context: {
      location: packet.venue.location,
      socialContext: null,
      pressure: null,
      choice: action,
      motivation: null,
      immediateReaction: null,
    },
  });
}
