import { useState } from "react";
import type { World } from "../simulation/types";
import {
  answerJobOffer,
  applyForJob,
  leaveJob,
  startJob,
  type JobMarketResult,
} from "../simulation/job-market";
import { projectJobMarket } from "../presentation/job-listings-view";

/**
 * Jobs in the player's town: real openings at the town's own employers, with
 * the pay and hours each one offers. Applying, being put forward by someone
 * who works there, answering an offer and starting are the player's; the
 * employer's answer, a lapsed offer and a missed start come as time passes.
 */
export function JobListingsPanel({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
}) {
  const [notice, setNotice] = useState("");
  if (world.control.kind !== "person") return null;
  const personId = world.control.personId;
  const view = projectJobMarket(world, personId);
  const act = (result: JobMarketResult) => {
    setNotice(result.message);
    if (result.ok) onWorldChange(result.world);
  };
  return (
    <section aria-label="Jobs" data-testid="job-listings">
      <h3>{view.townName ? `Jobs in ${view.townName}` : "Jobs"}</h3>
      <p role="status" aria-live="polite">
        {notice}
      </p>
      {view.heldJobs.map((job) => (
        <article key={job.workRelationshipId} data-testid="held-job">
          <h4>{job.heading}</h4>
          <p>{job.status}</p>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            onClick={() => act(leaveJob(world, job.workRelationshipId))}
          >
            Leave this job
          </button>
        </article>
      ))}
      {view.applications.length > 0 ? (
        <>
          <h4>Your applications</h4>
          {view.applications.map((application) => (
            <article
              key={application.applicationId}
              data-testid="job-application"
            >
              <h5>{application.heading}</h5>
              <p>{application.status}</p>
              {application.actions.includes("accept") ? (
                <button
                  type="button"
                  className="ui-action"
                  onClick={() =>
                    act(answerJobOffer(world, application.applicationId, true))
                  }
                >
                  Accept the offer
                </button>
              ) : null}
              {application.actions.includes("refuse") ? (
                <button
                  type="button"
                  className="ui-action ui-action--subtle"
                  onClick={() =>
                    act(answerJobOffer(world, application.applicationId, false))
                  }
                >
                  Turn it down
                </button>
              ) : null}
              {application.actions.includes("start") ? (
                <>
                  <button
                    type="button"
                    className="ui-action"
                    disabled={application.startBlocked !== null}
                    onClick={() =>
                      act(startJob(world, application.applicationId))
                    }
                  >
                    Start work
                  </button>
                  {application.startBlocked ? (
                    <small> {application.startBlocked}</small>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
        </>
      ) : null}
      <h4>Hiring now</h4>
      {view.listings.length === 0 ? (
        <p>Nobody here is advertising an opening right now.</p>
      ) : null}
      {view.listings.map((listing) => (
        <article key={listing.openingId} data-testid="job-listing">
          <h5>{listing.title}</h5>
          <p>{listing.employerLine}</p>
          <p>{listing.termsLine}</p>
          {listing.details.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>{listing.closesLine}</p>
          <button
            type="button"
            className="ui-action"
            disabled={listing.applyBlocked !== null}
            onClick={() => act(applyForJob(world, personId, listing.openingId))}
          >
            Apply
          </button>
          {listing.introducers.map((introducer) => (
            <button
              type="button"
              className="ui-action ui-action--subtle"
              key={introducer.personId}
              onClick={() =>
                act(
                  applyForJob(
                    world,
                    personId,
                    listing.openingId,
                    introducer.personId,
                  ),
                )
              }
            >
              {introducer.label}
            </button>
          ))}
          {listing.applyBlocked ? <small> {listing.applyBlocked}</small> : null}
          {listing.nationalMedian ? (
            <details>
              <summary>About this kind of work</summary>
              <p>{listing.nationalMedian}</p>
            </details>
          ) : null}
        </article>
      ))}
    </section>
  );
}
