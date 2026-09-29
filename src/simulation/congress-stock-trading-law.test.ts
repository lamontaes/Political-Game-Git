import { describe, expect, it } from "vitest";
import { openWatchedWorld } from "../../scripts/dev-lab/world-aging";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../presentation/observer-world";
import { US_CONGRESS_PACK_ID } from "./congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import {
  applyCongressStockBan,
  CONGRESS_STOCK_BAN_QUESTION,
  CONGRESS_STOCK_VIOLATION_EVENT,
  ensureCongressInvestments,
} from "./congress-stock-trading-law";

describe("congressional stocks use funded financial records", () => {
  it("moves holdings or pays fines, preserves cash records and enforces once per month after reopening", () => {
    const opened = openWatchedWorld(
      "congress-stock-financial-records",
      "1700113",
    );
    const base = ensureCongressInvestments(opened.world);
    const proposition = Object.values(base.policyCatalog.propositions).find(
      (p) => p.stableKey === CONGRESS_STOCK_BAN_QUESTION,
    )!;
    const pair = prepareLawPair(base, {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      propositionId: proposition.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
      policyTerms: [
        {
          questionKey: CONGRESS_STOCK_BAN_QUESTION,
          values: { deadlineDays: 0, fineCents: 1450000 },
          reason:
            "Controlled immediate compliance deadline for the financial integration test.",
          principleRecordIds: [],
        },
      ],
    });
    const treated = applyCongressStockBan(pair.treated);
    const stock = (w: typeof treated) =>
      Object.values(w.congressInvestments!.portfolios).reduce(
        (n, p) => n + p.individualStockCents,
        0,
      );
    const funds = Object.values(treated.congressInvestments!.portfolios).reduce(
      (n, p) => n + p.diversifiedFundCents,
      0,
    );
    expect(stock(treated)).toBeLessThan(stock(pair.control));
    expect(funds).toBeGreaterThan(0);
    expect(treated.congressInvestments!.charges.length).toBeGreaterThan(0);
    const violations = treated.history.events.filter(
      (r) => r.type === CONGRESS_STOCK_VIOLATION_EVENT,
    );
    for (const event of violations)
      expect(
        event.involvedEntityIds.some((id) =>
          treated.history.resourceFlows.some((r) => r.id === id),
        ),
      ).toBe(true);
    const reopened = deserializeWorld(serializeWorld(treated));
    const repeated = applyCongressStockBan(reopened);
    expect(repeated.congressInvestments!.charges).toEqual(
      reopened.congressInvestments!.charges,
    );
    expect(repeated.congressInvestments!.portfolios).toEqual(
      reopened.congressInvestments!.portfolios,
    );
    assertWorldIntegrity(repeated);
  }, 180000);
});
