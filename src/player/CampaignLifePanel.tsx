import { useMemo, useState } from "react";

import "./campaign-workspace.css";
import {
  acceptPartyWork,
  attendPartyWork,
  declinePartyWork,
  partyWorkBlockedReason,
  requestPartyWork,
} from "../presentation/campaign-life-actions";
import {
  projectPartyAndCommunityWork,
  type PartyWorkAction,
  type PartyWorkRow,
} from "../presentation/campaign-life-surface";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";

/**
 * Party and community work (CRUNCH46 CAMPAIGN).
 *
 * The chapter organizer's offers and anything the player asked for, each an
 * ordinary calendar entry: say yes, decline, go, or go briefly. Going briefly is
 * the same outcome with less of the evening shown — never a different result.
 * Nothing here is joining, endorsing or voting, and nothing here is a meter.
 *
 * Standalone: the parties surface can mount it with one line, passing the same
 * World, person and change handler the Work surface uses.
 */

export interface CampaignLifePanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}

function actionLabel(action: PartyWorkAction, row: PartyWorkRow): string {
  switch (action) {
    case "accept":
      return "Say you'll do it";
    case "decline":
      return "Decline";
    case "attend":
      return "Go";
    case "attend-condensed":
      return row.awaitingRecord ? "Find out how it went" : "Go briefly";
    case "take-shift":
      return "Take the phone shift";
  }
}

export function CampaignLifePanel({
  world,
  personId,
  onWorldChange,
  transitionHandlers,
}: CampaignLifePanelProps) {
  const view = useMemo(
    () => projectPartyAndCommunityWork(world, personId, transitionHandlers),
    [world, personId, transitionHandlers],
  );
  const [message, setMessage] = useState<string | null>(null);

  function apply(
    work: () => World,
    blocked: () => string | null = () => null,
    after: (next: World) => string | null = () => null,
  ) {
    try {
      const next = work();
      if (next === world) {
        setMessage(
          blocked() ?? "Something already on the calendar has to happen first.",
        );
        return;
      }
      setMessage(after(next));
      onWorldChange(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function act(row: PartyWorkRow, action: PartyWorkAction) {
    const blocked = () =>
      partyWorkBlockedReason(
        world,
        personId,
        row.lifeActivityId,
        transitionHandlers,
      );
    // Time moved but the activity did not happen: the clock stopped for
    // something real on the way, and the World keeps what did happen.
    const arrived = (next: World) =>
      projectPartyAndCommunityWork(
        next,
        personId,
        transitionHandlers,
      ).rows.find(
        (candidate) => candidate.lifeActivityId === row.lifeActivityId,
      )?.state === "completed"
        ? null
        : "Something came up before you got there. The time that passed is kept; you can try again.";
    switch (action) {
      case "accept":
        return apply(() =>
          acceptPartyWork(world, personId, row.lifeActivityId),
        );
      case "decline":
        return apply(() =>
          declinePartyWork(world, personId, row.lifeActivityId),
        );
      case "attend":
      case "take-shift":
        return apply(
          () =>
            attendPartyWork(
              world,
              personId,
              row.lifeActivityId,
              "attended",
              transitionHandlers,
            ),
          blocked,
          arrived,
        );
      case "attend-condensed":
        return apply(
          () =>
            attendPartyWork(
              world,
              personId,
              row.lifeActivityId,
              "condensed",
              transitionHandlers,
            ),
          blocked,
          arrived,
        );
    }
  }

  const organizations = [
    ...new Map(
      view.requestable.map((option) => [
        option.hostOrganizationId,
        { name: option.organizationName, hostName: option.hostName },
      ]),
    ),
  ];

  return (
    <section
      className="game-campaign-life"
      data-testid="party-work"
      aria-labelledby="party-work-title"
    >
      <h3 id="party-work-title">Party and community work</h3>
      <p className="game-note">
        Coming to any of this is not joining, endorsing or voting.
      </p>

      {view.rows.length === 0 ? (
        <p data-testid="party-work-empty">
          Nothing is on your calendar from a party or campaign yet.
        </p>
      ) : (
        <ul className="game-campaign-life-list">
          {view.rows.map((row) => (
            <li
              key={row.lifeActivityId}
              data-testid={`party-work-${row.lifeActivityId}`}
              data-state={row.state}
            >
              <strong>{row.title}</strong>
              <span className="game-campaign-life-line">
                {row.familyLabel} · with {row.hostName} · {row.when}
              </span>
              <span className="game-campaign-life-line">{row.placeLabel}</span>
              {row.travelNote &&
              (row.state === "offered" || row.state === "accepted") ? (
                <span className="game-campaign-life-line">
                  {row.travelNote}
                </span>
              ) : null}
              <span
                className="game-campaign-life-state"
                data-testid={`party-work-state-${row.lifeActivityId}`}
              >
                {row.stateLabel}
              </span>
              {row.attendNote ? (
                <span className="game-campaign-life-line">
                  {row.attendNote}
                </span>
              ) : null}
              {row.actions.length > 0 ? (
                <span className="game-campaign-life-actions">
                  {row.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={
                        action === "decline"
                          ? "ui-action"
                          : "ui-action ui-action--primary"
                      }
                      data-testid={`party-work-${action}-${row.lifeActivityId}`}
                      onClick={() => act(row, action)}
                    >
                      {actionLabel(action, row)}
                    </button>
                  ))}
                </span>
              ) : null}
              {row.actions.includes("attend-condensed") &&
              !row.awaitingRecord ? (
                <small className="game-campaign-life-line">
                  Going briefly: same outcome, less of the evening shown.
                </small>
              ) : null}
              {row.outcomeLines.length > 0 ? (
                <div
                  className="game-campaign-life-outcome"
                  data-testid={`party-work-outcome-${row.lifeActivityId}`}
                >
                  {row.outcomeLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {row.guidanceFacts.length > 0 ? (
                    <ul data-testid="party-work-guidance">
                      {row.guidanceFacts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {organizations.length > 0 ? (
        <div className="game-campaign-life-requests">
          <h4>Ask for something</h4>
          <p className="game-hint">
            Asking puts it on the first evening in the next two weeks that you
            and the host both have free. No time passes now.
          </p>
          {organizations.map(([organizationId, organization]) => (
            <div
              key={organizationId}
              role="group"
              aria-label={`Ask ${organization.name}`}
              data-testid={`party-work-requests-${organizationId}`}
            >
              <p>
                {organization.name}, with {organization.hostName}
              </p>
              <span className="game-campaign-life-actions">
                {view.requestable
                  .filter(
                    (option) => option.hostOrganizationId === organizationId,
                  )
                  .map((option) => (
                    <button
                      key={option.form}
                      type="button"
                      className="ui-action"
                      data-testid={`party-work-request-${option.form}-${organizationId}`}
                      onClick={() =>
                        apply(() =>
                          requestPartyWork(
                            world,
                            personId,
                            option.form,
                            organizationId,
                          ),
                        )
                      }
                    >
                      {option.title}
                    </button>
                  ))}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {message ? (
        <p
          className="game-problem"
          role="status"
          data-testid="party-work-message"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
