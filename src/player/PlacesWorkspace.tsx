import "./PlacesWorkspace.css";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { attendMunicipalPublicMeeting } from "../simulation/municipal-public-work";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  describePlacesOutcome,
  projectPlacesWorkspace,
  type PlacesOfferView,
} from "../presentation/player-places";
import { walkOpeningNeighborhood } from "../presentation/life-scene-flow";
import {
  declineVenueActivity,
  performVenueActivity,
} from "../presentation/venue-activity";

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
  onWorldChange,
  transitionHandlers = createCampaignElectionTransitionRegistry(),
}: PlacesWorkspaceProps): ReactNode {
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
      commit(() =>
        walkOpeningNeighborhood(
          world,
          personId,
          fresh.walkDestination!,
          transitionHandlers,
        ),
      );
      return;
    }
    if (fresh.activityId) {
      commit(() =>
        performVenueActivity(
          world,
          personId,
          fresh.activityId!,
          transitionHandlers,
        ),
      );
      return;
    }
    if (fresh.governmentKey && fresh.meetingId) {
      commit(() => {
        const result = attendMunicipalPublicMeeting(
          world,
          fresh.governmentKey!,
          fresh.meetingId!,
          transitionHandlers,
        );
        if (!result.ok) throw new Error(result.reason);
        return result.world;
      });
      return;
    }
    setOutcome(null);
    setProblem("That offer is not supported.");
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
            {model.current.sceneNote}
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
                    aria-label={`${actionLabel(offer)}: ${offer.title}`}
                    data-testid={`places-offer-${offer.id}-action`}
                    onClick={() => runOffer(offer)}
                  >
                    {actionLabel(offer)}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
