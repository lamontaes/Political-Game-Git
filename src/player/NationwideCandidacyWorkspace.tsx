import { useState } from "react";
import {
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
} from "../simulation";
import type { CandidacyBlock, EntityId, World } from "../simulation";
import {
  displayedSharePercents,
  projectCampaign,
} from "../presentation/campaign-projection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  recoverOffCycleStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "../presentation/nationwide-candidacy";
import type { StateExecutiveEntryStatus } from "../simulation";
import { readableCampaignDate } from "./CampaignWorkspace";

/**
 * Feature-local Politics mount for NATIONWIDE's home-government and state
 * executive readers. It owns no rule and no storage: who governs home comes
 * from the Census government-unit relation, eligibility and blocks from RULES
 * through `stateExecutiveCandidacyForPerson`, and filing goes through the same
 * campaign route the Work surface then runs.
 */
export function NationwideCandidacyWorkspace({
  world,
  personId,
  onWorldChange,
  onOpenCampaign,
}: {
  world: World;
  personId: EntityId;
  onWorldChange: (world: World) => void;
  onOpenCampaign: () => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const home = homeLocalGovernmentUnits(world, personId);
  const campaignPhase = projectCampaign(world, personId).phase;
  const candidacy = stateExecutiveCandidacyForPerson(
    world,
    personId,
    campaignPhase === "active",
  );
  const status = stateExecutiveEntryStatus(world, personId);
  const calendar = candidacy
    ? stateExecutiveOfficeCalendar(world, candidacy.identity.stateUsps)
    : null;
  // Rounded together, not one by one: Columbus's three counties printed
  // 98 + 2 + 1 = 101 percent when each share was rounded on its own.
  const measured = home.counties.flatMap((unit) => {
    const landAreaShare = home.countyShares?.find(
      (entry) => entry.unitId === unit.id,
    )?.landAreaShare;
    return landAreaShare === undefined
      ? []
      : [{ unitId: unit.id, landAreaShare }];
  });
  const printed = displayedSharePercents(
    measured.map((entry) => entry.landAreaShare),
    0,
  );
  const landPercents = new Map(
    measured.map((entry, index) => [entry.unitId, printed[index]!]),
  );
  const act = (change: () => World) => {
    try {
      onWorldChange(change());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };
  const canStand =
    campaignPhase !== "active" &&
    (status.kind === "none" ||
      status.kind === "lost" ||
      status.kind === "term-over-or-not-entered");

  return (
    <section className="game-campaign" data-testid="candidacy-section">
      <section
        className="game-campaign-strategy"
        data-testid="home-governments"
        data-place-scope={home.placeScope ?? "none"}
        data-county-status={home.countyStatus}
      >
        <h3>Who governs where you live</h3>
        {home.placeScope === "locality" ? (
          home.municipal.length > 0 ? (
            <ul data-testid="home-municipal">
              {home.municipal.map((unit) => (
                <li key={unit.id} data-unit-id={unit.id}>
                  {localGovernmentDisplayName(unit)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="game-note" data-testid="home-no-municipal">
              No city or town government is recorded for this place.
            </p>
          )
        ) : null}
        {home.counties.length > 0 ? (
          <ul data-testid="home-counties">
            {home.counties.map((unit) => {
              const landShare = landPercents.get(unit.id) ?? null;
              return (
                <li key={unit.id} data-unit-id={unit.id}>
                  {localGovernmentDisplayName(unit)}
                  {landShare !== null && home.counties.length > 1
                    ? ` — ${landShare} percent of this place's land`
                    : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {home.countyReason ? (
          <p className="game-note" data-testid="home-county-reason">
            {home.countyReason}
          </p>
        ) : null}
        {home.placeScope === "state" || home.placeScope === null ? (
          <p className="game-note" data-testid="home-no-local">
            This life is not set in a particular city or county, so no local
            government is named.
          </p>
        ) : null}
        <p className="game-note" data-testid="home-county-spread">
          A place that lies across several counties keeps every one of them;
          none is chosen for it.
        </p>
      </section>

      {candidacy ? (
        <section
          className="game-campaign-strategy"
          data-testid="state-executive-candidacy"
          data-office-key={candidacy.identity.officeKey}
          data-eligible={candidacy.eligible ? "true" : "false"}
        >
          <h3>{candidacy.identity.displayName}</h3>
          <StatusLine status={status} />
          {canStand ? (
            <>
              {candidacy.eligible ? (
                <p>
                  You may stand for {candidacy.identity.title} of your state
                  today. Filing opens a campaign with nothing in it.
                </p>
              ) : (
                <BlockList blocks={candidacy.blocks} />
              )}
              <button
                type="button"
                className="game-campaign-action"
                data-testid="file-state-executive"
                disabled={!candidacy.eligible}
                onClick={() =>
                  act(() => fileForStateExecutiveOffice(world, personId))
                }
              >
                <span className="game-campaign-action-label">
                  Put your name in
                </span>
                <span className="game-campaign-action-note">
                  {calendar
                    ? `The next regular election is ${readableCampaignDate(calendar.nextElection)}. The winner takes office ${readableCampaignDate(calendar.termStartsAt)}.`
                    : null}
                </span>
              </button>
            </>
          ) : null}
          {calendar ? (
            <details
              className="game-campaign-detail"
              data-testid="state-executive-calendar"
              data-basis={calendar.basis}
            >
              <summary>How this office's calendar works</summary>
              <p>{calendar.note}</p>
            </details>
          ) : null}
          {status.kind === "won-off-cycle" ? (
            <button
              type="button"
              className="game-campaign-action"
              data-testid="recover-state-executive-term"
              onClick={() =>
                act(() => recoverOffCycleStateExecutiveTerm(world, personId))
              }
            >
              <span className="game-campaign-action-label">
                Take up the next full term
              </span>
              <span className="game-campaign-action-note">
                {`From ${readableCampaignDate(status.recovery.startsAt)} to ${readableCampaignDate(status.recovery.endsAt)}. Your recorded victory stays as it happened.`}
              </span>
            </button>
          ) : null}
          {campaignPhase === "active" ? (
            <button
              type="button"
              className="game-campaign-action"
              data-testid="open-campaign"
              onClick={onOpenCampaign}
            >
              <span className="game-campaign-action-label">
                Go to the campaign
              </span>
            </button>
          ) : null}
          {status.kind === "awaiting-qualification" ? (
            <>
              <BlockList blocks={status.qualificationBlocks} />
              <button
                type="button"
                className="game-campaign-action"
                data-testid="qualify-state-executive"
                disabled={status.qualificationBlocks.length > 0}
                onClick={() =>
                  act(() => qualifyForStateExecutiveTerm(world, personId))
                }
              >
                <span className="game-campaign-action-label">
                  Qualify for the term
                </span>
              </button>
            </>
          ) : null}
          {problem ? (
            <p
              className="game-note"
              role="alert"
              data-testid="candidacy-problem"
            >
              {problem}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="game-note" data-testid="state-executive-unavailable">
          This life is not set in one of the fifty states, so there is no state
          executive office to stand for.
        </p>
      )}
    </section>
  );
}

function BlockList({ blocks }: { blocks: readonly CandidacyBlock[] }) {
  if (blocks.length === 0) return null;
  /*
   * The block's own reason is the whole of what a player is told. The
   * citations behind it stay on the record, where a reviewer can read them,
   * and never on this panel.
   */
  return (
    <div className="game-note" data-testid="state-executive-blocks">
      <p>{blocks.map((block) => block.reason).join(" ")}</p>
    </div>
  );
}

function StatusLine({ status }: { status: StateExecutiveEntryStatus }) {
  const text = statusText(status);
  return text ? (
    <p data-testid="state-executive-status" data-status={status.kind}>
      {text}
    </p>
  ) : null;
}

function statusText(status: StateExecutiveEntryStatus): string | null {
  switch (status.kind) {
    case "none":
      return null;
    case "pending-election":
      return "You are on the ballot. The campaign itself is run from your office and campaigns.";
    case "lost":
      return "The last election for this office went to someone else.";
    case "won-term-unavailable":
      return `You won the election. ${status.reason}`;
    case "won-off-cycle":
      return `You won. ${status.reason}`;
    case "awaiting-qualification":
      return `You won. The term runs from ${readableCampaignDate(status.startsAt)} to ${readableCampaignDate(status.endsAt)}, and you must qualify before it begins.`;
    case "qualified-awaiting-entry":
      return `You have qualified. The term begins ${readableCampaignDate(status.startsAt)}.`;
    case "in-office":
      return `You hold this office until ${readableCampaignDate(status.endsAt)}.`;
    case "term-over-or-not-entered":
      return `The term that ran from ${readableCampaignDate(status.startsAt)} to ${readableCampaignDate(status.endsAt)} is over or was never entered.`;
  }
}
