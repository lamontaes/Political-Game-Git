import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { PublicServiceView } from "../../presentation/public-service-conditions";
import type { EntityId, MoneyAmount, World } from "../../simulation";

const views: PublicServiceView[] = [];

vi.mock("../../presentation/public-service-conditions", () => ({
  projectPublicServiceConditions: () => views,
}));

const { PublicServicePanel, formatServiceMoney } =
  await import("./PublicServicePanel");

const usd = (minorUnits: number) =>
  ({ minorUnits, currency: "USD" }) as unknown as MoneyAmount;

function render() {
  return renderToStaticMarkup(
    <PublicServicePanel
      world={{} as World}
      jurisdictionId={"place:x" as EntityId}
      placeLabel="Anchorage, Alaska"
    />,
  );
}

describe("PublicServicePanel", () => {
  it("says plainly when the place keeps no service records", () => {
    views.length = 0;
    const html = render();
    expect(html).toContain('data-testid="public-services-none"');
    expect(html).toContain("No public service records are kept for Anchorage");
  });

  it("shows recorded capacity, backlog and funding in American dates", () => {
    views.length = 0;
    views.push({
      programKey: "bus",
      serviceLabel: "City buses",
      unitLabel: "buses",
      basis: { kind: "authored-fixture" } as PublicServiceView["basis"],
      basisLabel: "Illustrative figures",
      capacity: [
        {
          date: "2026-03-06" as PublicServiceView["capacity"][number]["date"],
          unitsOperational: 10,
          unitsTotal: 10,
          outOfService: 0,
          source: "after-delivered-work",
          restoredUnits: 2,
          eventId: "event:1" as EntityId,
        },
      ],
      backlog: { declared: 2, now: 0, change: "reduced" },
      completedPermille: null,
      funding: {
        appropriated: usd(125_000_00),
        committed: usd(100_000_00),
        uncommitted: usd(25_000_00),
        posted: usd(50_000_00),
        pendingInstallments: 1,
        operatingMonthsPosted: null,
      },
      failures: [
        {
          date: "2026-02-01" as PublicServiceView["capacity"][number]["date"],
          reason: "The payment could not be made.",
          eventId: "event:2" as EntityId,
        },
      ],
      summary: "All 10 buses were in service as of March 6, 2026.",
    });
    const html = render();
    expect(html).toContain("City buses");
    expect(html).toContain("10 of 10 buses, as of March 6, 2026");
    expect(html).toContain("fewer out of service than when first recorded");
    expect(html).toContain("$125,000 appropriated");
    expect(html).toContain("February 1, 2026: The payment could not be made.");
    expect(html).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(html).not.toContain("Trips completed");
  });

  it("formats other currencies with their code", () => {
    expect(
      formatServiceMoney({ minorUnits: 1050, currency: "CAD" } as never),
    ).toBe("10.5 CAD");
  });
});
