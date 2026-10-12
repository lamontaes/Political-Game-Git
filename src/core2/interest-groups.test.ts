/**
 * M3-07 (first slice): when a bill would cost employers money, the employers
 * it costs decide for themselves to organize, pay dues that balance in the
 * cash journal, and lobby the members who vote; the lobbying is a recorded
 * reason in each member's position.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  draftBill,
  employerCosts,
  holdVote,
  openLegislature,
  votesOn,
} from "./modules/legislature";
import {
  groupsHere,
  meetingsOn,
  openInterestGroups,
} from "./modules/interest-groups";
import { campaignParameter } from "./campaign-views";
import { governmentUnitsForPlace } from "../simulation/government-units";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`groups:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
// States whose law lets a council set its own minimum wage; a bill in any
// other state is blocked before a vote, so no employer has a cost to organize on.
const authority = JSON.parse(
  readFileSync(
    "data/research/laws/starting-law-2026/labor-workforce.json",
    "utf8",
  ),
).questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]
  .answers as Record<string, { answer: string }>;
const allowing = states.filter((s) => authority[s]?.answer === "yes");

describe("M3-07 interest groups", () => {
  it("employers a wage bill would cost organize, pay dues that balance, and lobby the council", () => {
    let report: Record<string, unknown> | null = null;
    const tried: string[] = [];
    for (let attempt = 0; attempt < 14 && !report; attempt += 1) {
      // The first towns are random, so a blocked state is met too; later
      // ones come from states that allow the bill.
      const state = pick(attempt < 3 ? states : allowing, `state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ]
        .filter((p) =>
          governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
            (u) => u.unitType === "municipality",
          ),
        )
        .sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      tried.push(`${state} ${key}`);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openInterestGroups(core);
      const api = coreAPI(core);
      const council = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (!council) continue;
      const floor = lawInForce(api, "minimum-wage").value!;
      const bill = draftBill(api, {
        bodyOfficeId: council.office.id,
        sponsorId: council.holder!.personId!,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: floor + 500,
            unit: "minor/hour",
          },
        ],
      });
      if (bill.status === "blocked") continue;
      const costs = employerCosts(api, bill);
      const before = new Map(
        [...costs.keys()].map((id) => [
          id,
          core.organizations.get(id)?.liquidMinor ?? 0,
        ]),
      );
      holdVote(api, bill.id);
      const group = groupsHere(api)[0];
      if (!group) continue;
      // Every member is one of the bill's losers, and lost more than the dues.
      const dues = campaignParameter("groupDuesMinor");
      for (const orgId of group.memberOrganizationIds) {
        expect(costs.get(orgId)!.annualMinor).toBeGreaterThan(dues);
        expect(core.organizations.get(orgId)!.liquidMinor).toBe(
          before.get(orgId)! - dues,
        );
      }
      // Every dues dollar landed in the group's account.
      expect(core.organizations.get(group.organizationId)!.liquidMinor).toBe(
        dues * group.memberOrganizationIds.length,
      );
      const meetings = meetingsOn(api, bill.id);
      expect(meetings.length).toBeGreaterThan(0);
      const votes = votesOn(api, bill.id);
      for (const m of meetings) {
        const v = votes.find((x) => x.memberId === m.memberId);
        if (v) expect(v.position.lobby).toBeLessThan(0);
      }
      report = {
        seed,
        state,
        place: key,
        bill: bill.number,
        losers: costs.size,
        members: group.memberOrganizationIds.length,
        lobbyist: group.lobbyistId,
        meetings: meetings.length,
        share: meetings[0]?.share,
        votes: votes.map((v) => `${v.vote}:${v.position.lobby.toFixed(2)}`),
      };
    }
    expect(report, `no group formed in ${tried.join(", ")}`).not.toBeNull();
    govReport("interest-groups", JSON.stringify(report));
  });
});
