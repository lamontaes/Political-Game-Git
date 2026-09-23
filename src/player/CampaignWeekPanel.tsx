import { useId, useMemo, useState } from "react";

import "./campaign-workspace.css";
import {
  commitWeek,
  doWeekSession,
  letWeekSessionGo,
  runWeekCondensed,
} from "../presentation/campaign-life-actions";
import {
  parseDollars,
  projectCampaignWeekPanel,
  type CampaignWeekPanelView,
  type WeekPlanCard,
} from "../presentation/campaign-life-surface";
import type {
  CampaignAdChannel,
  CampaignPlanEmphasis,
  EntityId,
  World,
} from "../simulation";

/**
 * This week's campaign plan (CRUNCH46 CAMPAIGN).
 *
 * A staff member proposes, or the candidate plans alone; either way the plan
 * cards carry only facts the campaign has on record. Committing books real
 * hours on the calendar and spends nothing; a buy is paid when it is signed
 * off. A plan the committee cannot pay for is recorded as refused and the
 * money is untouched. No win probability, support figure or reach estimate is
 * shown, because none is modeled.
 */

export interface CampaignWeekPanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}

interface Draft {
  /** The campaign this draft was written for; another campaign starts fresh. */
  readonly campaignId: EntityId;
  readonly emphasis: CampaignPlanEmphasis;
  readonly fieldShifts: number;
  readonly fundraisingSessions: number;
  readonly advertisingBuys: number;
  readonly channel: CampaignAdChannel;
  readonly amountText: string;
  readonly geographyKey: string;
}

function draftFrom(view: CampaignWeekPanelView, card: WeekPlanCard): Draft {
  const cheapest = [...view.channels].sort(
    (a, b) => a.minimumBuyMinorUnits - b.minimumBuyMinorUnits,
  )[0];
  const channel = card.suggestedAdvertising?.channel ?? cheapest?.channel;
  const minimum =
    view.channels.find((entry) => entry.channel === channel)
      ?.minimumBuyMinorUnits ?? 0;
  return {
    campaignId: view.campaignId,
    emphasis: card.emphasis,
    fieldShifts: card.suggestedAllocation.fieldShifts,
    fundraisingSessions: card.suggestedAllocation.fundraisingSessions,
    advertisingBuys: card.suggestedAllocation.advertisingBuys,
    channel: channel ?? "digital",
    amountText:
      card.suggestedAdvertising?.amountText ?? (minimum / 100).toFixed(2),
    geographyKey:
      card.suggestedAdvertising?.geographyKey ??
      view.geographyChoices[0]?.key ??
      "",
  };
}

function defaultCard(view: CampaignWeekPanelView): WeekPlanCard {
  return view.cards.find((card) => card.proposed) ?? view.cards[0]!;
}

const COUNTS = [
  ["fieldShifts", "Field shifts", "campaign-week-field"],
  [
    "fundraisingSessions",
    "Fundraising call sessions",
    "campaign-week-fundraising",
  ],
  ["advertisingBuys", "Advertising buys", "campaign-week-advertising"],
] as const;

export function CampaignWeekPanel({
  world,
  personId,
  onWorldChange,
}: CampaignWeekPanelProps) {
  const view = useMemo(
    () => projectCampaignWeekPanel(world, personId),
    [world, personId],
  );
  const [edited, setEdited] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Radio groups are named per panel so a second mount never shares a group.
  const groupId = useId();
  if (!view) return null;

  const draft =
    edited &&
    edited.campaignId === view.campaignId &&
    view.cards.some((card) => card.emphasis === edited.emphasis)
      ? edited
      : draftFrom(view, defaultCard(view));
  const total =
    draft.fieldShifts + draft.fundraisingSessions + draft.advertisingBuys;
  const channel = view.channels.find(
    (entry) => entry.channel === draft.channel,
  );
  const geography = view.geographyChoices.find(
    (choice) => choice.key === draft.geographyKey,
  );
  const change = (patch: Partial<Draft>) => setEdited({ ...draft, ...patch });

  function run(work: () => World, sameWorld: string) {
    try {
      const next = work();
      if (next === world) {
        setMessage(sameWorld);
        return;
      }
      setMessage(null);
      // A recorded plan (committed or refused) is the new starting point; a
      // later week begins from its own cards, not from this week's edits. A
      // refusal keeps the edits so the player can correct them.
      if (projectCampaignWeekPanel(next, personId)?.refusal === null) {
        setEdited(null);
      }
      onWorldChange(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function commit() {
    if (!view) return;
    let advertising = null;
    if (draft.advertisingBuys > 0) {
      const cents = parseDollars(draft.amountText);
      if (cents === null) {
        setMessage(
          "Enter what each advertising buy costs in dollars, like 50 or 50.00.",
        );
        return;
      }
      if (!geography || !channel?.geographyKinds.includes(geography.kind)) {
        setMessage("Choose a place that channel can reach.");
        return;
      }
      advertising = {
        channel: draft.channel,
        geographyKey: draft.geographyKey,
        amount: { minorUnits: cents, currency: view.currency },
      };
    }
    run(
      () =>
        commitWeek(world, personId, {
          campaignId: view.campaignId,
          weekStart: view.weekStart,
          proposerPersonId: view.proposerPersonId,
          revision: view.revision,
          emphasis: draft.emphasis,
          allocation: {
            fieldShifts: draft.fieldShifts,
            fundraisingSessions: draft.fundraisingSessions,
            advertisingBuys: draft.advertisingBuys,
          },
          advertising,
        }),
      "Nothing changed.",
    );
  }

  const committed = view.committed;
  const blocked = "Something already on the calendar has to happen first.";

  return (
    <section
      className="game-campaign-strategy game-campaign-week"
      data-testid="campaign-week"
      aria-labelledby="campaign-week-title"
    >
      <h3 id="campaign-week-title">This week&rsquo;s plan</h3>
      <p>
        {view.weekLabel} · {view.daysLeftLabel}
      </p>
      <p data-testid="campaign-week-attribution">
        <strong>{view.attribution}</strong>
      </p>
      {view.proposal ? (
        <p data-testid="campaign-week-proposal">{view.proposal}</p>
      ) : null}
      <p data-testid="campaign-week-treasury">{view.treasuryLabel}</p>

      {view.refusal && !committed ? (
        <div className="game-problem" data-testid="campaign-week-refusal">
          <p>{view.refusal.explanation}</p>
          <p>{view.refusal.moneyNote}</p>
        </div>
      ) : null}

      {committed ? (
        <div
          className="game-campaign-week-committed"
          data-testid="campaign-week-committed"
        >
          <p>{committed.summary}</p>
          <ul className="game-campaign-week-sessions">
            {committed.sessions.map((session) => (
              <li
                key={session.actionId}
                data-testid={`campaign-week-session-${session.actionId}`}
                data-holding={session.holding ? "true" : "false"}
              >
                <strong>{session.label}</strong>
                <span>
                  {session.when}
                  {session.spendLabel ? ` · ${session.spendLabel}` : ""}
                </span>
                <span>{session.statusLabel}</span>
                {session.canDo || session.canLetGo ? (
                  <span className="game-campaign-life-actions">
                    {session.canDo ? (
                      <button
                        type="button"
                        className="ui-action ui-action--primary"
                        data-testid={`campaign-week-do-${session.actionId}`}
                        onClick={() =>
                          run(
                            () =>
                              doWeekSession(world, personId, session.actionId),
                            blocked,
                          )
                        }
                      >
                        Do it now
                      </button>
                    ) : null}
                    {session.canLetGo ? (
                      <button
                        type="button"
                        className="ui-action"
                        data-testid={`campaign-week-let-go-${session.actionId}`}
                        onClick={() =>
                          run(
                            () =>
                              letWeekSessionGo(
                                world,
                                personId,
                                session.actionId,
                              ),
                            "Nothing changed.",
                          )
                        }
                      >
                        Let it go
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {committed.anyLeft ? (
            <button
              type="button"
              className="ui-action"
              data-testid="campaign-week-run-rest"
              onClick={() =>
                run(
                  () => runWeekCondensed(world, personId, committed.planId),
                  blocked,
                )
              }
            >
              <span className="game-campaign-action-label">
                Run the rest of the week
              </span>
              <span className="game-campaign-action-note">
                The same results as doing each session in turn, with less of it
                shown. It stops at anything already on your calendar.
              </span>
            </button>
          ) : null}
        </div>
      ) : view.electionPassed ? null : (
        <>
          <fieldset>
            <legend>What kind of week</legend>
            {view.cards.map((card) => (
              <label key={card.emphasis}>
                <input
                  type="radio"
                  name={`${groupId}-emphasis`}
                  value={card.emphasis}
                  data-testid={`campaign-week-plan-${card.emphasis}`}
                  checked={draft.emphasis === card.emphasis}
                  onChange={() => setEdited(draftFrom(view, card))}
                />
                <span>
                  {card.label}
                  {card.proposed ? " (proposed)" : ""}
                  <small data-testid={`campaign-week-reasons-${card.emphasis}`}>
                    {card.reasons.join(" ")}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="game-campaign-week-counts">
            <legend>How the week is spent</legend>
            {COUNTS.map(([key, label, testId]) => (
              <label key={key} className="game-campaign-week-count">
                <span>{label}</span>
                <input
                  type="number"
                  min={0}
                  max={view.maxSessions}
                  step={1}
                  inputMode="numeric"
                  data-testid={testId}
                  value={draft[key]}
                  onChange={(event) => {
                    const value = Math.max(
                      0,
                      Math.min(
                        view.maxSessions,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    );
                    change({ [key]: value } as Partial<Draft>);
                  }}
                />
              </label>
            ))}
            <p
              className={
                total > view.maxSessions ? "game-problem" : "game-hint"
              }
              data-testid="campaign-week-total"
            >
              {total} {total === 1 ? "session" : "sessions"} planned; a week
              holds at most {view.maxSessions}.
            </p>
          </fieldset>

          {draft.advertisingBuys > 0 ? (
            <>
              <fieldset>
                <legend>Advertising channel</legend>
                {view.channels.map((entry) => (
                  <label key={entry.channel}>
                    <input
                      type="radio"
                      name={`${groupId}-channel`}
                      value={entry.channel}
                      data-testid={`campaign-week-channel-${entry.channel}`}
                      checked={draft.channel === entry.channel}
                      onChange={() => {
                        const place = view.geographyChoices.find(
                          (choice) => choice.key === draft.geographyKey,
                        );
                        change({
                          channel: entry.channel,
                          geographyKey:
                            place && entry.geographyKinds.includes(place.kind)
                              ? place.key
                              : (view.geographyChoices.find((choice) =>
                                  entry.geographyKinds.includes(choice.kind),
                                )?.key ?? draft.geographyKey),
                        });
                      }}
                    />
                    <span>
                      {entry.label}
                      <small>
                        {entry.limitLabel}
                        {entry.affordable
                          ? ""
                          : " The committee cannot cover even one buy of this size today."}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label className="game-campaign-week-amount">
                <span>Each buy costs, in dollars</span>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="campaign-week-amount"
                  value={draft.amountText}
                  onChange={(event) =>
                    change({ amountText: event.target.value })
                  }
                />
                <small>{view.treasuryLabel}</small>
              </label>
              <fieldset>
                <legend>Where the advertising runs</legend>
                {view.geographyChoices.map((choice, index) => (
                  <label key={choice.key}>
                    <input
                      type="radio"
                      name={`${groupId}-geography`}
                      value={choice.key}
                      data-testid={`campaign-week-geography-${index}`}
                      disabled={!channel?.geographyKinds.includes(choice.kind)}
                      checked={draft.geographyKey === choice.key}
                      onChange={() => change({ geographyKey: choice.key })}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </fieldset>
            </>
          ) : null}
          <p className="game-note" data-testid="campaign-week-reach">
            {view.reachNote}
          </p>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="campaign-week-commit"
            disabled={total > view.maxSessions}
            onClick={commit}
          >
            Commit this week
          </button>
          <p className="game-hint">
            Committing puts the sessions on your calendar. No money is spent
            until a buy is signed off.
          </p>
        </>
      )}

      {message ? (
        <p
          className="game-problem"
          role="status"
          data-testid="campaign-week-message"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
