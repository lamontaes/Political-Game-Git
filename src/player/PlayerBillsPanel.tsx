import { dollars } from "../presentation/campaign-life-surface";
import { playerMoneySchedule } from "../simulation/player-monthly-money";
import type { EntityId, World } from "../simulation/types";
import { useCalendarDateOrder } from "./UX39CalendarGrid";
import { calendarDisplayDate } from "./ux39-calendar-dates";

/** Display only: rendering never schedules a bill or settles a payment. */
export function PlayerBillsPanel({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const [dateOrder] = useCalendarDateOrder();
  const reviews = playerMoneySchedule(world, personId).filter(
    (review) => review.bills.length > 0,
  );
  return (
    <section aria-label="Upcoming bills" data-testid="player-bills">
      <h3>What's next</h3>
      {reviews.length === 0 ? (
        <p className="game-note">No upcoming bills are recorded.</p>
      ) : (
        reviews.map((review) => (
          <div key={review.dueItemId}>
            <h4>
              <time dateTime={review.dueAt}>
                {calendarDisplayDate(review.dueAt, dateOrder)}
              </time>
            </h4>
            <ul>
              {review.bills.map((bill) => (
                <li key={bill.flowId}>
                  {bill.label}: {dollars(bill.amount)}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
