import { useMemo } from "react";

import {
  projectPublicServiceConditions,
  type PublicServiceView,
} from "../../presentation/public-service-conditions";
import { proseDate } from "../../presentation/prose-dates";
import type { EntityId, MoneyAmount, World } from "../../simulation";
import "./politics-hub.css";

/**
 * How the place's public services are doing, read from the program records
 * CHANGE projects. Only recorded capacity is shown; a service with no record
 * is not listed, and nothing here forecasts or fills a gap.
 */
export function PublicServicePanel({
  world,
  jurisdictionId,
  placeLabel,
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
  readonly placeLabel: string;
}) {
  const services = useMemo(
    () => projectPublicServiceConditions(world, jurisdictionId),
    [world, jurisdictionId],
  );

  return (
    <section
      className="pg-public-services"
      aria-labelledby="pg-public-services-title"
      data-testid="public-services"
    >
      <h3 id="pg-public-services-title">Public services</h3>
      {services.length === 0 ? (
        <p className="game-note" data-testid="public-services-none">
          No public service records are kept for {placeLabel} in this game.
        </p>
      ) : (
        <ul className="pg-public-services-list">
          {services.map((service) => (
            <ServiceItem key={service.programKey} service={service} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function formatServiceMoney(amount: MoneyAmount): string {
  const whole = (amount.minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return amount.currency === "USD"
    ? `$${whole}`
    : `${whole} ${amount.currency}`;
}

const BACKLOG_WORDS: Readonly<
  Record<PublicServiceView["backlog"]["change"], string>
> = {
  reduced: "fewer out of service than when first recorded",
  unchanged: "no change since first recorded",
  grew: "more out of service than when first recorded",
};

function ServiceItem({ service }: { readonly service: PublicServiceView }) {
  const latest = service.capacity.at(-1);
  return (
    <li data-testid={`public-service-${service.programKey}`}>
      <p className="pg-public-services-name">
        <strong>{service.serviceLabel}</strong>
      </p>
      <p>{service.summary}</p>
      <details>
        <summary>Details</summary>
        <dl className="pg-public-services-facts">
          {latest ? (
            <>
              <dt>In service</dt>
              <dd>
                {latest.unitsOperational} of {latest.unitsTotal}{" "}
                {service.unitLabel}, as of {proseDate(latest.date)}
              </dd>
            </>
          ) : null}
          <dt>Out of service</dt>
          <dd>
            {service.backlog.now} ({BACKLOG_WORDS[service.backlog.change]})
          </dd>
          {service.completedPermille !== null ? (
            <>
              <dt>Trips completed</dt>
              <dd>{(service.completedPermille / 10).toFixed(1)}%</dd>
            </>
          ) : null}
          <dt>Funding</dt>
          <dd>
            {formatServiceMoney(service.funding.appropriated)} appropriated,{" "}
            {formatServiceMoney(service.funding.posted)} paid out,{" "}
            {formatServiceMoney(service.funding.uncommitted)} not yet committed
          </dd>
        </dl>
        {service.failures.length > 0 ? (
          <>
            <h4>Funding problems</h4>
            <ul>
              {service.failures.map((failure) => (
                <li key={failure.eventId}>
                  {proseDate(failure.date)}: {failure.reason}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </li>
  );
}
