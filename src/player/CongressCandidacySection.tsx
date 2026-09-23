import { useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "../presentation/congress-candidacy";
import type { CongressSeatStatus } from "../presentation/congress-candidacy";
import { readableCampaignDate } from "./CampaignWorkspace";

/**
 * Standing for the U.S. House or Senate from the state this life lives in.
 * Seats, eligibility and dates come from `congressCandidacyForPerson`; filing
 * goes through the same campaign route as every other office, and the seat is
 * taken on January 3 by the same Congress record the overview shows.
 */
export function CongressCandidacySection({
  world,
  personId,
  campaignActive,
  onWorldChange,
}: {
  world: World;
  personId: EntityId;
  campaignActive: boolean;
  onWorldChange: (world: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const candidacy = congressCandidacyForPerson(world, personId, campaignActive);
  const status = congressSeatStatus(world, personId);
  if (!candidacy)
    return (
      <p className="game-note" data-testid="congress-unavailable">
        This life is not set in one of the fifty states, so there is no voting
        seat in Congress to stand for.
      </p>
    );
  const seat =
    candidacy.seats.find((entry) => entry.identity.officeKey === chosen) ??
    candidacy.seats.find((entry) => entry.eligible) ??
    candidacy.seats[0]!;
  const canStand =
    !campaignActive &&
    status.kind !== "pending-election" &&
    status.kind !== "won-awaiting-term";
  const act = (change: () => World) => {
    try {
      onWorldChange(change());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section
      className="game-campaign-strategy"
      data-testid="congress-candidacy"
      data-state={candidacy.stateUsps}
    >
      <h3>Congress</h3>
      <CongressStatusLine status={status} />
      {canStand ? (
        <>
          <label className="game-campaign-detail">
            <span>Seat</span>{" "}
            <select
              data-testid="congress-seat"
              value={seat.identity.officeKey}
              onChange={(event) => setChosen(event.target.value)}
            >
              {candidacy.seats.map((entry) => (
                <option
                  key={entry.identity.officeKey}
                  value={entry.identity.officeKey}
                >
                  {entry.identity.displayName}
                </option>
              ))}
            </select>
          </label>
          {seat.eligible ? (
            <p>
              {seat.identity.title === "U.S. Senator"
                ? "You may stand for this seat. A Senator represents the whole state."
                : "You may stand here. A Representative need only live in the state, so every district in it is open to you."}
            </p>
          ) : (
            <div className="game-note" data-testid="congress-blocks">
              <p>{seat.blocks.map((block) => block.reason).join(" ")}</p>
            </div>
          )}
          <button
            type="button"
            className="game-campaign-action"
            data-testid="file-congress"
            data-office-key={seat.identity.officeKey}
            disabled={!seat.eligible}
            onClick={() =>
              act(() =>
                fileForCongressSeat(world, personId, seat.identity.officeKey),
              )
            }
          >
            <span className="game-campaign-action-label">Put your name in</span>
            <span className="game-campaign-action-note">
              {`The election is ${readableCampaignDate(seat.calendar.nextElection)}. The winner takes the seat ${readableCampaignDate(seat.calendar.termStartsAt)} for ${seat.identity.termYears} years.`}
            </span>
          </button>
        </>
      ) : null}
      {problem ? (
        <p className="game-note" role="alert" data-testid="congress-problem">
          {problem}
        </p>
      ) : null}
    </section>
  );
}

function CongressStatusLine({ status }: { status: CongressSeatStatus }) {
  const text = congressStatusText(status);
  return text ? (
    <p data-testid="congress-status" data-status={status.kind}>
      {text}
    </p>
  ) : null;
}

export function congressStatusText(status: CongressSeatStatus): string | null {
  switch (status.kind) {
    case "none":
      return null;
    case "pending-election":
      return `You are on the ballot for ${status.identity.displayName} on ${readableCampaignDate(status.electionDate)}. The campaign itself is run from your office and campaigns.`;
    case "lost":
      return `The election for ${status.identity.displayName} on ${readableCampaignDate(status.electionDate)} went to someone else.`;
    case "won-awaiting-term":
      return `You won. You take the seat on ${readableCampaignDate(status.startsAt)}, and the term runs until ${readableCampaignDate(status.endsAt)}.`;
    case "in-office":
      return `You are the ${status.identity.displayName} until ${readableCampaignDate(status.endsAt)}.`;
  }
}
