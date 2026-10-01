import { useState } from "react";
import { addSimulationMinutes } from "../simulation/dates";
import {
  residentTransitOffers,
  requestPublicServiceFromLife,
} from "../presentation/public-service-work";
import type { World } from "../simulation/types";

function serviceDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

/** Resident requests reuse the existing saved service and activity writers. */
export function PublicServiceRequestPanel({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
}) {
  const offers = residentTransitOffers(world);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [minutesAhead, setMinutesAhead] = useState("30");
  return (
    <section aria-label="Request a transit trip">
      <h3>Request a transit trip</h3>
      {offers.length === 0 ? (
        <p>
          No funded, paid transit operator is available to your character here.
        </p>
      ) : (
        <>
          <label>
            Start in how many minutes?
            <input
              type="number"
              min="0"
              step="1"
              value={minutesAhead}
              onChange={(event) => setMinutesAhead(event.target.value)}
            />
          </label>
          {offers.map((offer) => (
            <article key={offer.commitmentId}>
              <h4>{offer.operatorName}</h4>
              <p>
                {offer.title}. Trips can be requested through{" "}
                {serviceDate(offer.availableThrough)}.
              </p>
              <button
                type="button"
                onClick={() => {
                  const delay = Number(minutesAhead);
                  if (
                    !/^\d+$/.test(minutesAhead) ||
                    !Number.isSafeInteger(delay)
                  ) {
                    setFeedback(
                      "Enter a whole number of minutes, zero or more.",
                    );
                    return;
                  }
                  try {
                    const start = addSimulationMinutes(
                      world.currentMoment,
                      delay,
                    );
                    const result = requestPublicServiceFromLife(world, {
                      commitmentId: offer.commitmentId,
                      start,
                      end: addSimulationMinutes(start, offer.visitMinutes),
                    });
                    if (result.kind === "unsupported") {
                      setFeedback(result.reason);
                      return;
                    }
                    onWorldChange(result.world);
                    setFeedback(
                      `Your ${offer.visitMinutes}-minute trip is scheduled. Complete the activity on your calendar to record the ride.`,
                    );
                  } catch {
                    setFeedback(
                      "Choose a start time within the service's available dates.",
                    );
                  }
                }}
              >
                Request a {offer.visitMinutes}-minute trip
              </button>
            </article>
          ))}
        </>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}
