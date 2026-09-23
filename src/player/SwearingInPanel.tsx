import { useState } from "react";

import type { EntityId, World } from "../simulation";
import type { SwearingInView } from "../presentation/office-transition";
import { takeOathForHeldOffice } from "../presentation/office-transition";
import { proseDate } from "../presentation/prose-dates";

export interface SwearingInPanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly swearingIn: SwearingInView;
  readonly onWorldChange: (world: World) => void;
}

/** The first days of the term: the oath, taken once, as a public event. */
export function SwearingInPanel({
  world,
  personId,
  swearingIn,
  onWorldChange,
}: SwearingInPanelProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div data-testid="swearing-in">
      {swearingIn.swornInOn ? (
        <p className="game-note" data-testid="swearing-in-done">
          You raised your right hand and took the oath of office as{" "}
          {swearingIn.officeTitle}.
        </p>
      ) : (
        <>
          <p className="game-note">
            Your term as {swearingIn.officeTitle} began{" "}
            {proseDate(swearingIn.startedOn)}. {swearingIn.ceremony}
          </p>
          <button
            type="button"
            data-testid="swearing-in-take-oath"
            onClick={() => {
              try {
                onWorldChange(takeOathForHeldOffice(world, personId));
                setError(null);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Refused.");
              }
            }}
          >
            Take the oath
          </button>
        </>
      )}
      {error ? (
        <p className="game-note" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
