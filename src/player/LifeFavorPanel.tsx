import { useState } from "react";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import {
  favorEntries,
  performFavor,
  cancelFavor,
} from "../simulation/life-favors";
import {
  describePersonContext,
  type EntityId,
  type World,
  type FutureTransitionHandlerRegistry,
} from "../simulation";
import { lifeActivityHandlers } from "../presentation/life-time-handlers";
import { chooseAdultOption } from "../presentation/adult-life";

/** Optional ordinary request, mounted by the existing life leaf, same World/save. */
export function LifeFavorPanel({
  world,
  personId,
  onWorldChange,
  transitionHandlers,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const open = lifeOpportunitiesFor(world, personId);
  const entry = favorEntries(world, personId).find(
    (entry) =>
      entry.status === "agreed" ||
      (entry.status === "asked" &&
        open.some((request) => request.eventId === entry.request.id)),
  );
  if (!entry) {
    const latest = favorEntries(world, personId).at(-1);
    return latest?.outcome?.occurredAt === world.currentDate ? (
      <p role="status" data-testid="favor-outcome">
        {latest.outcome.summary}
        {latest.status === "performed"
          ? ` Proofreading took ${latest.details.minutes} minutes.`
          : " No time passed."}
      </p>
    ) : null;
  }
  function run(action: () => World) {
    try {
      const next = action();
      setProblem(
        next === world
          ? "A current commitment prevents completing the proofreading. Resolve it first; no time was charged."
          : null,
      );
      if (next !== world) onWorldChange(next);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "That choice is unavailable.",
      );
    }
  }
  const relation = describePersonContext(
    world,
    personId,
    entry.counterpartId,
  )?.relationship;
  return (
    <details
      aria-label="Proofreading request"
      data-testid="life-favor"
      data-request-id={entry.request.id}
      data-status={entry.status}
    >
      <summary>
        {entry.name} · Picnic invitation{" "}
        {entry.status === "agreed" ? "commitment" : "request"}
      </summary>
      <p>
        {entry.name}
        {relation ? `, ${relation}` : ""}: “{entry.details.opening}”
      </p>
      {entry.status === "asked" ? (
        <>
          <p>
            Answering takes no time. Proofreading takes {entry.details.minutes}{" "}
            minutes; no journey is needed.
          </p>
          <button
            type="button"
            data-testid="favor-agree"
            onClick={() =>
              run(() =>
                chooseAdultOption(world, {
                  personId,
                  situationKey: "adult.friend-favour",
                  optionKey: "do-it",
                }),
              )
            }
          >
            Agree to proofread the invitation
          </button>
          <button
            type="button"
            data-testid="favor-condition"
            onClick={() =>
              run(() =>
                chooseAdultOption(world, {
                  personId,
                  situationKey: "adult.friend-favour",
                  optionKey: "conditions",
                }),
              )
            }
          >
            Agree: {entry.details.condition}
          </button>
          <button
            type="button"
            data-testid="favor-decline"
            onClick={() =>
              run(() =>
                chooseAdultOption(world, {
                  personId,
                  situationKey: "adult.friend-favour",
                  optionKey: "decline",
                }),
              )
            }
          >
            Decline the request
          </button>
        </>
      ) : (
        <>
          <p>{entry.response!.summary}</p>
          <p>{entry.response!.context.immediateReaction}</p>
          <button
            type="button"
            data-testid="favor-perform"
            onClick={() =>
              run(() =>
                performFavor(
                  world,
                  personId,
                  entry.request.id,
                  lifeActivityHandlers(transitionHandlers),
                ),
              )
            }
          >
            Proofread the invitation · {entry.details.minutes} minutes
          </button>
          <button
            type="button"
            data-testid="favor-cancel"
            onClick={() =>
              run(() => cancelFavor(world, personId, entry.request.id))
            }
          >
            Withdraw the commitment
          </button>
        </>
      )}
      {problem ? <p role="alert">{problem}</p> : null}
    </details>
  );
}
