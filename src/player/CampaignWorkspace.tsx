import { useMemo, useState } from "react";

import "./campaign-workspace.css";
import { projectCampaignOffices } from "../presentation/campaign-office-discovery";

import {
  campaignElectionDate,
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../presentation/campaign-projection";
import {
  commitCampaignStrategy,
  projectCampaignStrategy,
  projectLatestCampaignStrategyReport,
} from "../presentation/campaign-strategy";
import type {
  CampaignActionKind,
  DistrictSeatBinding,
  EntityId,
  FutureTransitionHandlerRegistry,
  MoneyAmount,
  World,
} from "../simulation";
import { districtSeatMustBeNamed } from "../simulation";
import { CampaignLifePanel } from "./CampaignLifePanel";
import { DistrictResidencePanel } from "./DistrictResidencePanel";
import { CampaignWeekPanel } from "./CampaignWeekPanel";
import { projectCampaignWeekPanel } from "../presentation/campaign-life-surface";
import {
  campaignPlanningLayout,
  isPrimaryCampaignPlanningSlot,
} from "./campaign-planning-layout";
import { DIAGNOSTICS } from "./diagnostics-profile";
import { OpponentActivityPanel } from "./OpponentActivityPanel";

/**
 * Running for something.
 *
 * The screen answers, in order: is there anything here to run for, what is the
 * committee's position, what could this afternoon be spent on, what did the
 * last one come to, and how long is left. It shows the campaign's own field
 * memo and never anything stronger — there is no bar filling up, no percentage
 * to beat, and no way to tell from this screen whether the memo is right.
 *
 * Where the game cannot honestly offer a candidacy it says so in a sentence and
 * shows nothing else, which is the only decent alternative to inventing an
 * office.
 *
 * One control per intent (UI FINISH). The plan section only edits how the next
 * piece of work is carried out — where, and how much the committee may spend
 * on advertising. Doing the work is one row of buttons, one per kind. Before
 * this there were two ways to run the same afternoon (the plan's own "carry
 * out" button and the row beneath it), and pressing both could book two.
 */

export interface CampaignWorkspaceProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  /** Passed through to party and community work; the default registry otherwise. */
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}

function money(amount: MoneyAmount): string {
  return `${amount.currency} ${(amount.minorUnits / 100).toFixed(2)}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

/** "2026-02-02" as a person would write it; anything else is left alone. */
export function readableCampaignDate(text: string): string {
  return text.replace(new RegExp(ISO_DATE.source, "g"), (whole, y, m, d) => {
    const month = MONTHS[Number(m) - 1];
    return month ? `${month} ${Number(d)}, ${y}` : whole;
  });
}

/**
 * A joined eligibility explanation as the sentences a player reads.
 *
 * Two rule checks can return the same reason, so a repeated sentence is shown
 * once. Nothing is filtered: every sentence a producer wrote is a sentence
 * about the office and the character, because a reason that needed hiding
 * behind "Sources and detail" was a reason written for the wrong reader, and
 * those are now written for this one.
 */
export function splitEligibilityText(text: string): {
  readonly reasons: readonly string[];
} {
  return {
    reasons: [
      ...new Set(
        text
          .split(/(?<=\.)\s+/)
          .map((sentence) => sentence.trim())
          .filter(Boolean),
      ),
    ],
  };
}

export function CampaignWorkspace({
  world,
  personId,
  onWorldChange,
  transitionHandlers,
}: CampaignWorkspaceProps) {
  const [selectedOfficeKey, setSelectedOfficeKey] = useState<string | null>(
    null,
  );
  const offices = useMemo(
    () => projectCampaignOffices(world, personId),
    [world, personId],
  );
  const selectedOffice =
    offices.find((office) => office.officeKey === selectedOfficeKey) ?? null;
  const view = useMemo(
    () => projectCampaign(world, personId, selectedOfficeKey),
    [world, personId, selectedOfficeKey],
  );
  const strategy = useMemo(
    () => projectCampaignStrategy(world, personId),
    [world, personId],
  );
  const strategyReport = useMemo(
    () => projectLatestCampaignStrategyReport(world, personId),
    [world, personId],
  );
  // Asked of the same projection the week panel draws from, so "is there a
  // week to plan" is the panel's own answer rather than a guess from the phase.
  const weekPanel = useMemo(
    () => projectCampaignWeekPanel(world, personId),
    [world, personId],
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedGeography, setSelectedGeography] = useState<string | null>(
    null,
  );
  const [selectedSpending, setSelectedSpending] = useState<string | null>(null);
  // Which numbered seat the player has named. A seat whose rules ask where the
  // candidate lives cannot be filed for from a state-wide choice alone, so the
  // filing button waits for this rather than sending null and being refused.
  const [districtBinding, setDistrictBinding] =
    useState<DistrictSeatBinding | null>(null);
  const person = world.people[personId] ?? null;
  const needsDistrict =
    person !== null &&
    selectedOffice !== null &&
    districtSeatMustBeNamed(
      person.homeJurisdictionId,
      selectedOffice.officeKey,
      world.currentDate,
    );

  function run<T>(work: () => T, apply: (value: T) => void) {
    try {
      apply(work());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }

  function file() {
    run(
      () =>
        fileForOffice(
          world,
          personId,
          needsDistrict ? districtBinding : null,
          selectedOfficeKey,
        ),
      (next) => {
        // The choice is spent on this filing. Picking an office again once the
        // race is over is what offers the next filing.
        setSelectedOfficeKey(null);
        onWorldChange(next);
      },
    );
  }

  const geographyKey = strategy?.geographyChoices.some(
    (choice) => choice.key === selectedGeography,
  )
    ? selectedGeography!
    : (strategy?.geographyChoices[0]?.key ?? null);
  const advertising = strategy?.priorityChoices.find(
    (choice) => choice.key === "advertising",
  );
  const advertisingSpendingKey = advertising?.spendingChoices.some(
    (choice) => choice.key === selectedSpending,
  )
    ? selectedSpending!
    : (advertising?.spendingChoices[0]?.key ?? null);

  /*
   * The single way to do a piece of campaign work. With a plan on the table it
   * is committed through the plan, so the recorded strategy carries the chosen
   * geography and, for advertising, the approved ceiling. Without one it is the
   * ordinary afternoon. Either way the canonical writer refuses a full day or an
   * empty account and hands back the unchanged world.
   */
  function doNow(kind: CampaignActionKind) {
    const priority = strategy?.priorityChoices.find(
      (choice) => choice.key === kind,
    );
    const spendingKey =
      kind === "advertising"
        ? advertisingSpendingKey
        : (priority?.spendingChoices[0]?.key ?? null);
    run(
      () =>
        strategy && priority && geographyKey && spendingKey
          ? commitCampaignStrategy(world, personId, {
              campaignId: strategy.campaignId,
              proposerPersonId: strategy.proposerPersonId,
              priorityKey: kind,
              geographyKey,
              spendingKey,
            })
          : spendAnAfternoon(world, personId, kind),
      (next) => {
        if (next === world) {
          setProblem("Something already on the calendar has to happen first.");
          return;
        }
        setSelectedSpending(null);
        onWorldChange(next);
      },
    );
  }

  if (view.phase === "unavailable" && offices.length === 0) {
    return (
      <section className="game-campaign" data-testid="campaign-section">
        <h2>Standing for something</h2>
        <p className="game-note" data-testid="campaign-unavailable">
          {view.unavailableReason}
        </p>
        <CampaignLifePanel
          world={world}
          personId={personId}
          onWorldChange={onWorldChange}
          transitionHandlers={transitionHandlers}
        />
      </section>
    );
  }

  const proposedLabel =
    strategy?.priorityChoices.find(
      (choice) => choice.key === strategy.proposedPriorityKey,
    )?.label ?? null;
  const unavailable =
    view.phase === "unavailable" && view.unavailableReason
      ? splitEligibilityText(view.unavailableReason)
      : null;
  const authorityDetail = [
    ...(view.officeAuthority ? [view.officeAuthority] : []),
    ...view.openQuestions,
  ];

  /*
   * One planning region, and one primary control in it.
   *
   * CRUNCH47 EXPERIENCE decision: the campaign's weekly plan leads. What used
   * to sit above it — the per-action plan editor and the one "do this now" row
   * — are the same region's detailed editing and its explicit immediate
   * action, drawn after the week rather than in front of it. The week is no
   * longer a collapsed block a player has to find.
   */
  const planning = campaignPlanningLayout({
    weekPlanAvailable: view.phase === "active" && Boolean(weekPanel),
    detailedEditingAvailable: Boolean(strategy) && view.offers.length > 0,
    immediateActionsAvailable: view.offers.length > 0,
  });

  return (
    <section className="game-campaign" data-testid="campaign-section">
      {/* The surface around this panel already titles it "Running for office". */}
      <h2 className="sr-only">Standing for something</h2>

      {offices.length ? (
        <section
          className="game-campaign-strategy"
          data-testid="campaign-office-browser"
        >
          <h3>Offices you could run for</h3>
          <p>
            Looking at an office, or selecting one, does not start a campaign or
            spend money.
          </p>
          {[...new Set(offices.map((office) => office.governmentLevel))].map(
            (level) => (
              <fieldset key={level}>
                <legend>{level}</legend>
                {offices
                  .filter((office) => office.governmentLevel === level)
                  .map((office) => {
                    const status = office.eligible
                      ? { reasons: [office.eligibility] }
                      : splitEligibilityText(office.eligibility);
                    const [electionOn, ...timingDetail] = office.timing
                      .split(" — ")
                      .map((part) => part.trim());
                    const hasElection = ISO_DATE.test(office.timing);
                    /*
                     * What is left to say about the office, beyond its status
                     * and its date. The unresolved research gaps are notes to
                     * whoever reads the authorities next, written in their
                     * terms and citing them, so they belong to the developer
                     * surface rather than to a player choosing an office.
                     */
                    const detail = [
                      ...(hasElection ? timingDetail : []),
                      ...(DIAGNOSTICS ? office.gaps : []),
                    ];
                    return (
                      <label
                        key={office.officeKey}
                        data-eligible={office.eligible ? "true" : "false"}
                      >
                        <input
                          type="radio"
                          name="campaign-office"
                          value={office.officeKey}
                          checked={selectedOfficeKey === office.officeKey}
                          onChange={() => {
                            setSelectedOfficeKey(office.officeKey);
                            setDistrictBinding(null);
                            setProblem(null);
                          }}
                        />
                        <span className="game-campaign-office">
                          <span className="game-campaign-office-title">
                            {office.title}
                          </span>
                          <span className="game-campaign-office-body">
                            {office.provider}
                          </span>
                          <span
                            className="game-campaign-office-status"
                            data-testid={`campaign-office-status-${office.officeKey}`}
                          >
                            {office.eligible
                              ? office.eligibility
                              : status.reasons.length > 0
                                ? status.reasons.join(" ")
                                : "You can't file for this office right now."}
                          </span>
                          <span className="game-campaign-office-line">
                            {hasElection
                              ? `Election: ${readableCampaignDate(electionOn ?? "")}`
                              : office.timing}
                          </span>
                          {office.connections.map((line) => (
                            <span
                              key={line}
                              className="game-campaign-office-line"
                            >
                              {line}
                            </span>
                          ))}
                          {detail.length > 0 ? (
                            <details className="game-campaign-detail">
                              <summary>More about the timing</summary>
                              <ul>
                                {[...new Set(detail)].map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
              </fieldset>
            ),
          )}
          {DIAGNOSTICS ? (
            <details className="game-campaign-detail">
              <summary>About election dates here</summary>
              <p>
                A state legislative seat is elected at the state's next regular
                legislative election under the game's calendar profile, not a
                sourced per-state calendar; staggered senate seats and primaries
                are not modelled. A town's own body still uses a 28-day authored
                schedule.
              </p>
            </details>
          ) : null}
        </section>
      ) : null}
      {unavailable ? (
        <div data-testid="campaign-unavailable" className="game-note">
          <p>
            {unavailable.reasons.length > 0
              ? unavailable.reasons.join(" ")
              : "There is no office here you can file for right now."}
          </p>
        </div>
      ) : null}

      {view.phase === "can-file" ? (
        <div data-testid="campaign-offer" className="game-campaign-offer">
          <p>
            {selectedOffice
              ? `There is a ${selectedOffice.title} to be filled${view.placeName ? ` in ${view.placeName}` : ""}. Nobody has asked ${view.candidateName} to stand for it. That is not usually how it starts.`
              : "Choose one of the offices above to see whether you can file for it."}
          </p>
          {needsDistrict && selectedOffice ? (
            <DistrictResidencePanel
              world={world}
              personId={personId}
              officeKey={selectedOffice.officeKey}
              onWorldChange={onWorldChange}
              onBindingChange={setDistrictBinding}
            />
          ) : null}
          <button
            type="button"
            data-testid="file-candidacy"
            className="game-campaign-action"
            disabled={
              !selectedOffice?.eligible || (needsDistrict && !districtBinding)
            }
            onClick={file}
          >
            {/*
             * Named for the same reason as the state-executive control on
             * this screen: two buttons reading "Put your name in" are two
             * different filings, and which one a player gets should not
             * depend on which section they happen to be under.
             */}
            <span className="game-campaign-action-label">
              {selectedOffice
                ? `Put your name in for the ${selectedOffice.title}`
                : "Put your name in"}
            </span>
            <span className="game-campaign-action-note">
              {selectedOffice && person
                ? `The election is ${readableCampaignDate(campaignElectionDate(world, person.homeJurisdictionId, selectedOffice.officeKey))}. `
                : ""}
              The committee opens with nothing in it.
            </span>
          </button>
          {DIAGNOSTICS && authorityDetail.length > 0 ? (
            <details className="game-campaign-gaps game-campaign-detail">
              <summary>What the game does not know about this</summary>
              <ul>
                {[...new Set(authorityDetail)].map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {view.campaignId ? (
        <>
          <p className="game-band" data-testid="campaign-band">
            {view.committeeName}
            {view.daysLeft !== null
              ? ` · ${view.daysLeft} ${view.daysLeft === 1 ? "day" : "days"} to go`
              : ` · decided ${readableCampaignDate(view.electionDate ?? "")}`}
          </p>
          <p data-testid="campaign-opponents">
            Running against {view.opponentNames.join(", ")}.
          </p>
          <p data-testid="campaign-treasury">
            The committee has {money(view.treasury)}.
          </p>

          {view.reading ? (
            <p className="game-campaign-memo" data-testid="campaign-memo">
              {view.reading.summary}
              {view.reading.marginPercent !== null ? (
                <small>
                  Somebody&rsquo;s estimate from the calls they made. The margin
                  is what they are willing to claim, and some weeks it is
                  further out than that.
                </small>
              ) : null}
            </p>
          ) : view.phase === "active" ? (
            <p className="game-note" data-testid="campaign-no-memo">
              Nobody has counted anything yet.
            </p>
          ) : null}

          {/*
            The planning region. Exactly one child carries data-primary="true",
            which is the property campaign-planning holds the layout to.
          */}
          <div
            className="game-campaign-planning"
            data-testid="campaign-planning"
            data-primary-slot={planning.primary ?? "none"}
          >
            {planning.slots.includes("week") ? (
              <div
                className="game-campaign-planning-slot"
                data-testid="campaign-planning-week"
                data-primary={
                  isPrimaryCampaignPlanningSlot(planning, "week")
                    ? "true"
                    : "false"
                }
              >
                <CampaignWeekPanel
                  world={world}
                  personId={personId}
                  onWorldChange={onWorldChange}
                />
              </div>
            ) : null}

            {planning.slots.includes("detail") && strategy ? (
              <section
                className="game-campaign-strategy game-campaign-planning-slot"
                data-testid="campaign-strategy"
                aria-labelledby="campaign-strategy-title"
                data-primary={
                  isPrimaryCampaignPlanningSlot(planning, "detail")
                    ? "true"
                    : "false"
                }
              >
                <h3 id="campaign-strategy-title">Edit the plan</h3>
                <p data-testid="campaign-strategy-attribution">
                  <strong>{strategy.attribution}</strong>
                </p>
                {proposedLabel ? (
                  <p data-testid="campaign-strategy-proposal">
                    Proposed next: {proposedLabel}.
                  </p>
                ) : null}
                <ul>
                  {strategy.knownSituation.map((fact) => (
                    <li key={fact}>{readableCampaignDate(fact)}</li>
                  ))}
                </ul>
                <p className="game-note">{strategy.caveat}</p>

                <fieldset>
                  <legend>Represented geography</legend>
                  {strategy.geographyChoices.map((choice) => (
                    <label key={choice.key}>
                      <input
                        type="radio"
                        name="campaign-strategy-geography"
                        value={choice.key}
                        checked={geographyKey === choice.key}
                        onChange={() => setSelectedGeography(choice.key)}
                      />
                      <span>
                        {choice.label}
                        <small>{choice.explanation}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {/* No affordable buy means no ceiling to set; the advertising
                  button below already says why. An empty legend is not a control. */}
                {advertising && advertising.spendingChoices.length > 0 ? (
                  <fieldset>
                    <legend>Advertising spending ceiling</legend>
                    {advertising.spendingChoices.map((choice) => (
                      <label key={choice.key}>
                        <input
                          type="radio"
                          name="campaign-strategy-spending"
                          value={choice.key}
                          checked={advertisingSpendingKey === choice.key}
                          onChange={() => setSelectedSpending(choice.key)}
                        />
                        <span>
                          {choice.label}
                          <small>{choice.explanation}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <p className="game-hint">
                  Changing the plan does not use any time. The work happens when
                  you choose it below.
                </p>
              </section>
            ) : null}

            {planning.slots.includes("immediate") ? (
              <section
                className="game-campaign-now game-campaign-planning-slot"
                aria-labelledby="campaign-now-title"
                data-primary={
                  isPrimaryCampaignPlanningSlot(planning, "immediate")
                    ? "true"
                    : "false"
                }
              >
                <h3 id="campaign-now-title">Do this now</h3>
                <div
                  className="game-choices"
                  data-testid="campaign-offers"
                  role="group"
                  aria-labelledby="campaign-now-title"
                >
                  {view.offers.map((offer) => (
                    <button
                      key={offer.kind}
                      type="button"
                      className="game-campaign-action"
                      data-testid={`campaign-${offer.kind}`}
                      data-proposed={
                        strategy?.proposedPriorityKey === offer.kind
                          ? "true"
                          : "false"
                      }
                      disabled={offer.unavailable !== null}
                      title={offer.unavailable ?? undefined}
                      onClick={() => doNow(offer.kind)}
                    >
                      <span className="game-campaign-action-label">
                        {offer.label}
                      </span>
                      <span className="game-campaign-action-note">
                        {offer.unavailable ??
                          (strategy?.proposedPriorityKey === offer.kind
                            ? `Proposed. ${offer.cost}`
                            : offer.cost)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {strategyReport ? (
            <section
              className="game-campaign-strategy-report"
              data-testid="campaign-strategy-report"
            >
              <h3>What happened</h3>
              <p>{strategyReport.attribution}</p>
              <p>
                The player chose {strategyReport.chosenPriorityLabel} for{" "}
                {strategyReport.geographyLabel}, with a ceiling of{" "}
                {money(strategyReport.approvedSpendCeiling)}.
              </p>
              <p>{strategyReport.outcome}</p>
              {strategyReport.observedResult ? (
                <p className="game-note">{strategyReport.observedResult}</p>
              ) : null}
            </section>
          ) : null}

          {view.phase === "active" ? (
            <OpponentActivityPanel world={world} personId={personId} />
          ) : null}

          {view.sessions.length > 0 ? (
            <ul className="game-campaign-log" data-testid="campaign-log">
              {view.sessions.map((session) => (
                <li key={session.id}>
                  <strong>{session.title}</strong> ·{" "}
                  {readableCampaignDate(session.on)}
                  {session.outcome ? <span> — {session.outcome}</span> : null}
                  {session.blockedBy.length > 0 ? (
                    <span> — waiting on {session.blockedBy.join(", ")}.</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {view.tallies.length > 0 ? (
            <div data-testid="campaign-result">
              <p className="game-scene" data-testid="campaign-afterword">
                {view.afterword}
              </p>
              <ul className="game-campaign-tallies">
                {view.tallies.map((tally) => (
                  <li key={tally.candidatePersonId}>
                    {tally.candidateName}
                    {tally.isThisCandidate ? " (them)" : ""} —{" "}
                    {tally.displayedSharePercent}%
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      <CampaignLifePanel
        world={world}
        personId={personId}
        onWorldChange={onWorldChange}
        transitionHandlers={transitionHandlers}
      />

      {problem ? (
        <p className="game-problem" data-testid="campaign-problem">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
