import "./PlacesWorkspace.css";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { attendMunicipalPublicMeeting } from "../simulation/municipal-public-work";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import {
  describePlacesOutcome,
  projectPlacesWorkspace,
  type PlacesOfferView,
} from "../presentation/player-places";
import { labelForRef } from "../presentation/person-dossier";
import { PinToggle } from "./controls/PinToggle";
import { useTimeCommand, type TimeCommandReport } from "./time-command-runner";
import { previewTimeCommand } from "../presentation/time-command";
import { skipToLabel } from "../presentation/time-target-label";
import { declineVenueActivity } from "../presentation/venue-activity";
import { ordinaryGroceryRoute } from "../presentation/ordinary-grocery-route";
import { travelToPlace } from "../presentation/place-travel";

/** Entity references UI-core passes through `openEntity` / `togglePin`. */
export type PlacesEntityRef =
  | { readonly kind: "government"; readonly id: string }
  | { readonly kind: "person"; readonly id: EntityId }
  | { readonly kind: "commitment"; readonly id: EntityId }
  | { readonly kind: "measure"; readonly id: EntityId };

/** Typed mount contract aligned with ui-people11-leaf-mount-contract.md. */
export interface PlacesWorkspaceProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenEntity: (ref: PlacesEntityRef) => void;
  readonly onTogglePin: (ref: PlacesEntityRef) => void;
  /** Whether the shell already holds a pin for this reference. */
  readonly isPinned: (ref: PlacesEntityRef) => boolean;
  readonly onWorldChange: (world: World) => void;
  /** Campaign-aware handlers for canonical travel and attendance writers. */
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}

function actionLabel(offer: PlacesOfferView): string {
  switch (offer.kind) {
    case "inspect":
      return "Inspect";
    case "return-home":
      return "Return home";
    case "travel":
      return "Travel";
    case "attend":
      return "Attend";
  }
}

/** Feature-local Places, travel and attendance surface. Root integration is external. */
export function PlacesWorkspace({
  world,
  personId,
  onOpenEntity,
  onTogglePin,
  isPinned,
  onWorldChange,
}: PlacesWorkspaceProps): ReactNode {
  const runner = useTimeCommand({ world, personId, onWorldChange });
  const report = (result: TimeCommandReport) => {
    setProblem(result.status === "failed" ? result.outcome : null);
    setOutcome(result.outcome);
  };
  const [problem, setProblem] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const model = useMemo(
    () => projectPlacesWorkspace(world, personId),
    [world, personId],
  );

  if (!model) {
    return (
      <div className="places-workspace" data-testid="places-panel">
        <p>Places are unavailable for this life.</p>
      </div>
    );
  }

  function commit(run: () => World) {
    const before = world;
    try {
      const next = run();
      if (next === before) {
        setOutcome(null);
        setProblem("Nothing changed. No time passed.");
        return;
      }
      setProblem(null);
      setOutcome(describePlacesOutcome(before, next, personId));
      onWorldChange(next);
    } catch (error) {
      setOutcome(null);
      setProblem(
        error instanceof Error
          ? error.message
          : "That action is no longer available.",
      );
    }
  }

  function runOffer(offer: PlacesOfferView) {
    const fresh = projectPlacesWorkspace(world, personId)?.offers.find(
      (entry) => entry.id === offer.id,
    );
    if (!fresh || fresh.unavailable) {
      setOutcome(null);
      setProblem(fresh?.unavailable ?? "That offer is no longer available.");
      return;
    }
    if (fresh.kind === "inspect") {
      if (!fresh.inspectGovernmentKey) {
        setOutcome(null);
        setProblem("Inspection is not available from here.");
        return;
      }
      onOpenEntity({ kind: "government", id: fresh.inspectGovernmentKey });
      setProblem(null);
      setOutcome("Opened for inspection. No time passed.");
      return;
    }
    if (fresh.walkDestination) {
      runner.submit(
        { kind: "walk", destination: fresh.walkDestination },
        report,
      );
      return;
    }
    if (fresh.groceryDestination) {
      const destination = fresh.groceryDestination;
      runner.perform((current, handlers) => {
        const next = travelToPlace(
          current,
          personId,
          destination,
          ordinaryGroceryRoute,
          handlers,
        );
        return {
          world: next,
          outcome: describePlacesOutcome(current, next, personId),
        };
      }, report);
      return;
    }
    if (fresh.activityId) {
      runner.submit(
        { kind: "attend-activity", activityId: fresh.activityId },
        report,
      );
      return;
    }
    if (fresh.governmentKey && fresh.meetingId) {
      runner.perform((current, handlers) => {
        const result = attendMunicipalPublicMeeting(
          current,
          fresh.governmentKey!,
          fresh.meetingId!,
          handlers,
        );
        if (!result.ok) throw new Error(result.reason);
        return {
          world: result.world,
          outcome: describePlacesOutcome(current, result.world, personId),
        };
      }, report);
      return;
    }
    setOutcome(null);
    setProblem("That offer is not supported.");
  }

  /* The calendar entry an offer names, and the government on its inspect row. */
  function pinTargets(offer: PlacesOfferView) {
    const targets: {
      ref: PlacesEntityRef;
      name: string;
      noun: string;
      testid: string;
    }[] = [];
    const activityId = offer.activityId ?? offer.meetingId;
    const commitment: PlacesEntityRef | null = activityId
      ? { kind: "commitment", id: activityId }
      : null;
    const commitmentName = commitment ? labelForRef(world, commitment) : null;
    if (commitment && commitmentName !== null) {
      targets.push({
        ref: commitment,
        name: commitmentName,
        noun: offer.meetingId ? "meeting" : "activity",
        testid: `places-offer-${offer.id}-pin-commitment`,
      });
    }
    // Once per government: its own inspect row, not every meeting it holds.
    const governmentKey = offer.inspectGovernmentKey;
    if (governmentKey) {
      const ref: PlacesEntityRef = { kind: "government", id: governmentKey };
      const name = labelForRef(world, ref);
      if (name !== null) {
        targets.push({
          ref,
          name,
          noun: "government",
          testid: `places-offer-${offer.id}-pin-government`,
        });
      }
    }
    return targets;
  }

  function declineOffer(offer: PlacesOfferView) {
    if (!offer.declineActivityId) return;
    commit(() =>
      declineVenueActivity(world, personId, offer.declineActivityId!),
    );
  }

  return (
    <div className="places-workspace" data-testid="places-panel">
      <header className="places-workspace-header">
        <div>
          <p className="places-workspace-kicker">Where you are</p>
          <h3>Your location and reachable offers</h3>
        </div>
      </header>

      <section aria-labelledby="places-current-heading">
        <h3 id="places-current-heading">Current location</h3>
        <p data-testid="places-current-location">
          <strong>{model.current.label}</strong>
          {model.current.setting ? (
            <span>{` · ${model.current.setting}`}</span>
          ) : null}
        </p>
        {model.current.sceneNote ? (
          <p
            className="places-scene-note"
            data-testid="places-current-scene-note"
          >
            There isn’t a view of this place yet.
          </p>
        ) : null}
      </section>

      {model.completedHere ? (
        <p role="status" data-testid="places-completed-here">
          You have finished {model.completedHere.title} at{" "}
          {model.completedHere.locationLabel}.
        </p>
      ) : null}

      {problem ? (
        <p role="alert" data-testid="places-problem">
          {problem}
        </p>
      ) : null}
      {outcome ? (
        <p role="status" data-testid="places-outcome">
          {outcome}
        </p>
      ) : null}

      <section aria-labelledby="places-offers-heading">
        <h3 id="places-offers-heading">
          Supported destinations and activities
        </h3>
        {model.offers.length === 0 ? (
          <p data-testid="places-empty">
            Nothing reachable is recorded from here.
          </p>
        ) : (
          <ul className="places-offer-list">
            {model.offers.map((offer) => (
              <li key={offer.id} data-testid={`places-offer-${offer.id}`}>
                <div className="places-offer-copy">
                  <p className="places-offer-title">{offer.title}</p>
                  {offer.detail ? <p>{offer.detail}</p> : null}
                  {offer.companionLabel ? <p>{offer.companionLabel}</p> : null}
                  {offer.durationLabel ? <p>{offer.durationLabel}</p> : null}
                  {offer.unavailable ? (
                    <p data-testid={`places-offer-${offer.id}-reason`}>
                      {offer.unavailable}
                    </p>
                  ) : null}
                </div>
                <div>
                  <button
                    type="button"
                    disabled={offer.unavailable !== null}
                    aria-disabled={runner.pending || undefined}
                    aria-busy={runner.pending}
                    aria-label={`${actionLabel(offer)}: ${offer.title}`}
                    data-testid={`places-offer-${offer.id}-action`}
                    onClick={() => runOffer(offer)}
                  >
                    {actionLabel(offer)}
                    {(() => {
                      const command = offer.walkDestination
                        ? {
                            kind: "walk" as const,
                            destination: offer.walkDestination,
                          }
                        : offer.activityId
                          ? {
                              kind: "attend-activity" as const,
                              activityId: offer.activityId,
                            }
                          : null;
                      const preview = command
                        ? previewTimeCommand(world, personId, command)
                        : null;
                      return preview ? (
                        <small>{skipToLabel(preview.target)}</small>
                      ) : null;
                    })()}
                  </button>
                  {offer.declineActivityId ? (
                    <button
                      type="button"
                      aria-label={`Decline: ${offer.title}`}
                      data-testid={`places-offer-${offer.id}-decline`}
                      onClick={() => declineOffer(offer)}
                    >
                      Decline
                    </button>
                  ) : null}
                  {pinTargets(offer).map((target) => (
                    <PinToggle
                      key={target.testid}
                      className="ui-action ui-action--subtle"
                      pinned={isPinned(target.ref)}
                      name={target.name}
                      noun={target.noun}
                      testid={target.testid}
                      onToggle={() => onTogglePin(target.ref)}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
