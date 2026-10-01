import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { dollars } from "../presentation/campaign-life-surface";
import { initializeLivingCostsFlow } from "../simulation/cost-of-living";
import { cancelFutureDueItem } from "../simulation/future-transitions";
import { createHousehold, startHouseholdMembership } from "../simulation/life";
import {
  ensurePlayerMonthlyMoneySchedule,
  playerMoneySchedule,
} from "../simulation/player-monthly-money";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { PlayerBillsPanel } from "./PlayerBillsPanel";
import { calendarDisplayDate } from "./ux39-calendar-dates";

let world: World;
let personId: EntityId;

beforeAll(() => {
  const seed = "c9-monthly-money-routes";
  const place = drawRandomPlace(seed);
  console.info(
    `Bills panel: seed=${seed}, place=${place.displayName} (${place.key})`,
  );
  const fixture = smallWorld({ seed, place: place.key, people: 3 });
  personId = fixture.personId;
  world = createResourcePosition(fixture.world, {
    stableKey: "bills-panel:player-account",
    owner: { kind: "person", personId },
    openedAt: fixture.world.currentDate,
    openingBalance: money(100_000, "USD"),
    provenance: { kind: "authored", note: "Recorded panel fixture account." },
  });
  const provenance = {
    kind: "authored" as const,
    note: "Recorded panel fixture household.",
  };
  world = createHousehold(world, {
    stableKey: "bills-panel:household",
    formedAt: world.currentDate,
    label: "Panel fixture household",
    provenance,
  });
  world = startHouseholdMembership(world, {
    stableKey: "bills-panel:household-member",
    personId,
    householdId: world.history.households.at(-1)!.id,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = ensurePlayerMonthlyMoneySchedule(
    initializeLivingCostsFlow(world, personId),
    personId,
  );
}, 30_000);

afterEach(() => vi.unstubAllGlobals());

describe("the read-only upcoming bills panel", () => {
  it("shows a saved monthly bill date and amount without changing the world", () => {
    const saved = serializeWorld(world);
    const continued = deserializeWorld(saved);
    const review = playerMoneySchedule(continued, personId)[0]!;
    expect(review.bills).toHaveLength(1);
    const html = renderToStaticMarkup(
      <PlayerBillsPanel world={continued} personId={personId} />,
    );
    expect(html).toContain("What&#x27;s next");
    expect(html).toContain(`dateTime="${review.dueAt}"`);
    expect(html).toContain(calendarDisplayDate(review.dueAt, "month-day"));
    expect(html).toContain(`Living costs: ${dollars(review.bills[0]!.amount)}`);
    expect(html).not.toMatch(/<(button|input|form)\b/);
    expect(serializeWorld(continued)).toBe(saved);
  });

  it("uses the existing date-order preference without writing it", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => "day-month", setItem });
    const dueAt = playerMoneySchedule(world, personId)[0]!.dueAt;
    const html = renderToStaticMarkup(
      <PlayerBillsPanel world={world} personId={personId} />,
    );
    expect(html).toContain(calendarDisplayDate(dueAt, "day-month"));
    expect(setItem).not.toHaveBeenCalled();
  });

  it("shows no recorded bill for a cancelled review without restoring it", () => {
    const review = playerMoneySchedule(world, personId)[0]!;
    const cancelled = cancelFutureDueItem(world, {
      stableKey: "bills-panel:cancelled-review",
      dueItemId: review.dueItemId,
      effectiveAt: world.currentDate,
      reasonKey: "player-monthly-money:cancelled",
      context: null,
    });
    const saved = serializeWorld(cancelled);
    const html = renderToStaticMarkup(
      <PlayerBillsPanel world={cancelled} personId={personId} />,
    );
    expect(html).toContain("No upcoming bills are recorded.");
    expect(html).not.toContain("<time");
    expect(serializeWorld(cancelled)).toBe(saved);
  });

  it("does not show the controlled player's bills under another person's panel", () => {
    const other = world.personOrder.find((id) => id !== personId)!;
    const html = renderToStaticMarkup(
      <PlayerBillsPanel world={world} personId={other} />,
    );
    expect(html).toContain("No upcoming bills are recorded.");
    expect(html).not.toContain("Living costs:");
  });
});
