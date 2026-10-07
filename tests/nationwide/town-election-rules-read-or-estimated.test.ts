import { describe, expect, it } from "vitest";

import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { addDays } from "../../src/simulation/dates";
import { governmentUnitsForState } from "../../src/simulation/government-units";
import {
  LOCAL_ELECTION_FILING,
  LOCAL_ELECTIONS_PROFILE,
  nextTownElectionDay,
} from "../../src/simulation/living-world/local-elections";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  municipalBallotRuleCoverage,
  resolveMunicipalBallotRule,
} from "../../src/simulation/municipal-ballot-rules";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { localGoverningBodyRules } from "../../src/simulation/nationwide-world/local-governing-body-rules";
import {
  FILING_LEAD_DAYS,
  FILING_LEAD_SOURCE,
} from "../../src/simulation/nationwide-world/town-election-calendar";
import {
  UNRESEARCHED_CAMPAIGN_FILING_RULE,
  unresearchedStatementDeadlineDays,
} from "../../src/simulation/campaign-compliance";

/**
 * A118: a town's election rules are read from data, or, where unread, the
 * modal national rule marked ESTIMATED FROM AVERAGE. No hash picks a council
 * size, a term, a counting rule, a filing lead or a committee deadline, so
 * every unread town in all 56 places gets the same answer through one path.
 *
 * The watched place is drawn by seed from all 56; set TOWN_RULES_SEED to
 * watch another.
 */

const SEED = process.env.TOWN_RULES_SEED ?? "town-election-rules-a118";

describe("one rule for every town in all 56 places", () => {
  it("covers all 56 places", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    expect(municipalBallotRuleCoverage()).toHaveLength(56);
  });

  it("gives the filing lead from the FEC filing table, not a blanket 28 days", () => {
    // Median of the 52 places with a usable 2026 row.
    expect(FILING_LEAD_DAYS).toBe(85);
    expect(LOCAL_ELECTIONS_PROFILE.filingLeadDays).toBe(FILING_LEAD_DAYS);
    expect(FILING_LEAD_SOURCE).toMatch(/^ESTIMATED FROM AVERAGE: .*FEC/);
  });

  it("asks two towns in one state the same estimated question the same way", () => {
    for (const state of lifePlaceStateIdentities()) {
      const a = resolveMunicipalBallotRule(state.usps, "town-a");
      const b = resolveMunicipalBallotRule(state.usps, "town-b");
      expect(b, state.usps).toEqual(a);
      expect(
        unresearchedStatementDeadlineDays(state.jurisdictionKey),
        state.usps,
      ).toBe(
        UNRESEARCHED_CAMPAIGN_FILING_RULE.statementOfOrganizationWithinDays,
      );
    }
  });
});

describe(`watched world, seed ${SEED}`, () => {
  const place = observerPlace(SEED);

  it(`opens in ${place.displayName} (${place.key}) and schedules its town races on read or estimated rules`, () => {
    console.log(
      `A118 watched place: ${place.displayName} (${place.key}), seed ${SEED}`,
    );
    const opened = openObserverWorld(observerSetup(SEED, place.key));
    const world = opened.world;
    const units = homeLocalGovernmentUnits(
      world,
      opened.anchorPersonId,
    ).municipal;
    const usps = (place.stateJurisdictionKey ?? "").replace(/^US-/, "");
    const rule = resolveMunicipalBallotRule(usps, place.key);
    expect([
      "state-law-unverified",
      "local-choice-estimated",
      "national-estimated",
    ]).toContain(rule.basis);

    if (units.length === 0) {
      // A place with no municipal government of its own (Hawaii, a
      // territory's municipio listing): the state still answers every rule,
      // and any town in the state uses the same path.
      const any = governmentUnitsForState(usps).find(
        (unit) => unit.unitType === "municipality" && unit.functionalActive,
      );
      if (any) expect(localGoverningBodyRules(any)).not.toBeNull();
      return;
    }

    const filings = world.history.futureDueItems.filter(
      (item) => item.transitionKey === LOCAL_ELECTION_FILING,
    );
    expect(filings.length).toBe(units.length);
    for (const unit of units) {
      const rules = localGoverningBodyRules(unit)!;
      // Read where the town's charter was compiled, otherwise ICMA's mode.
      if (rules.seats!.basis === "typical")
        expect(rules.seats!.value, unit.id).toBe(5);
      if (rules.termYears!.basis === "typical")
        expect(rules.termYears!.value, unit.id).toBe(4);
      // The field closes the estimated filing lead before the first vote.
      const day = nextTownElectionDay(unit, world.currentDate);
      expect(
        filings.some(
          (item) =>
            item.dueAt ===
            addDays(
              day.electionDate,
              -(
                LOCAL_ELECTIONS_PROFILE.filingLeadDays +
                LOCAL_ELECTIONS_PROFILE.primaryLeadDays
              ),
            ),
        ),
        `${unit.id} ${day.electionDate}`,
      ).toBe(true);
    }
  });
});
