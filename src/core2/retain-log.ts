import {
  keptDecision,
  isShortDetailKind,
  queueCampaignRecord,
  CAMPAIGN_RECORD_KINDS,
  queueCircleEntry,
  queueShortEntry,
  queueDecisionDetail,
} from "./decision-detail";
import { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";
import type { CoreState, LogRecord } from "./types";

export function index<K>(map: Map<K, Set<string>>, key: K, id: string): void {
  let ids = map.get(key);
  if (!ids) map.set(key, (ids = new Set()));
  ids.add(id);
}

export function retainLog(
  core: CoreState,
  event: LogRecord,
  /** A debug check (the audit's trait probe, off in play) asks for the record as the observer would keep it. */
  debugKeep = false,
): void {
  const circle = [...event.personIds, ...(event.witnessIds ?? [])].some(
    (id) =>
      core.focusPersonIds.has(id) ||
      id === core.playerId ||
      // The person the player controls is the player however they were
      // chosen (a new life, or an officeholder picked in Advanced): what
      // names them is theirs to keep, as for the generated player.
      isExplicitlyControlledPersonV1(core, id),
  );
  const publicRecord =
    event.publicRecord && core.visiblePlaceIds.has(event.placeId);
  const news = event.news;
  if (!core.observer && !debugKeep && !circle && !publicRecord && !news) return;
  if (core.durableLog.has(event.id)) return;
  const row: LogRecord = {
    ...event,
    ...(event.decision
      ? {
          decision: keptDecision(
            core,
            event.decision,
            isExplicitlyControlledPersonV1(core, event.decision.actorId),
          ),
        }
      : {}),
    visibility:
      core.observer || !(circle || publicRecord || news)
        ? "observer"
        : circle
          ? "circle"
          : publicRecord
            ? "public"
            : "news",
  };
  core.durableLog.set(row.id, row);
  // The circle's reasons are condensed once they're older than the detail
  // window, the player's own routine ones a year later (condenseCircleDecisions).
  if (row.decision) queueDecisionDetail(core, core.date, row.id);
  else if (row.visibility === "circle" && !row.publicRecord && !row.news)
    (isShortDetailKind(row.kind) ? queueShortEntry : queueCircleEntry)(
      core,
      core.date,
      row.id,
    );
  // A campaign gift or endorsement goes a year after its day whoever saw it:
  // one the player's circle saw is a public record too, so the circle's own
  // window above does not take it.
  else if (row.visibility !== "observer" && CAMPAIGN_RECORD_KINDS.has(row.kind))
    queueCampaignRecord(core, core.date, row.id);
  for (const id of new Set([...row.personIds, ...(row.witnessIds ?? [])]))
    index(core.logByPerson, id, row.id);
  index(core.logByKind, row.kind, row.id);
}
