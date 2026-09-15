import { useState } from "react";
import {
  prepareRecordedLegislativeSitting,
  recordedSittingOffer,
  type RecordedPlayerBallot,
} from "../presentation/legislative-authored-sitting";
import type { EntityId, World } from "../simulation/types";

const BALLOTS = [
  ["yea", "Yea"],
  ["nay", "Nay"],
  ["present-not-voting", "Present, not voting"],
] as const;

/**
 * The one admission control for an authored recorded sitting, shared by the
 * Docket and Tax work. It discloses the content before the choice, and the
 * player's ballot is chosen rather than defaulted. Unsupported bills render
 * nothing; the caller decides whether an admission is still pending.
 */
export function RecordedSittingAdmission({
  world,
  measureId,
  playerPersonId,
  name,
  testIdPrefix,
  onWorldChange,
  onAdmitted,
  onError,
}: {
  readonly world: World;
  readonly measureId: EntityId;
  readonly playerPersonId: EntityId;
  readonly name: string;
  readonly testIdPrefix: string;
  readonly onWorldChange: (world: World) => void;
  readonly onAdmitted: () => void;
  readonly onError: (message: string) => void;
}) {
  const [ballot, setBallot] = useState<RecordedPlayerBallot | "">("");
  const offer = recordedSittingOffer(world, { measureId, playerPersonId });
  if (!offer) return null;
  return (
    <div data-testid={`${testIdPrefix}-recorded-sitting`}>
      <p>{offer.notice}</p>
      <fieldset>
        <legend>{offer.ballotScope}</legend>
        {BALLOTS.map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name={name}
              data-testid={`${testIdPrefix}-recorded-player-ballot-${value}`}
              checked={ballot === value}
              onChange={() => setBallot(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="ui-action"
        data-testid={`${testIdPrefix}-use-recorded-sitting`}
        disabled={ballot === ""}
        onClick={() => {
          try {
            if (ballot === "")
              throw new Error("Choose your recorded ballot first.");
            onWorldChange(
              prepareRecordedLegislativeSitting(world, {
                measureId,
                playerPersonId,
                playerBallot: ballot,
              }),
            );
            onAdmitted();
          } catch (error) {
            onError(
              error instanceof Error
                ? error.message
                : "The recorded sitting could not be opened.",
            );
          }
        }}
      >
        Use the recorded fictional Alaska sitting
      </button>
    </div>
  );
}
