import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  CONGRESS_COMMITTEE_BY_DOMAIN,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import {
  applyInstitutionSessionEnd,
  applyInstitutionStep,
  referralCommittee,
} from "../simulation/governing/legislative-clock";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import {
  introduceMeasure,
  measureActions,
  measurePosition,
} from "../simulation/legislation";
import type { LegislativeProcedureContext } from "../simulation/legislation-scenarios";
import type { LegislativeRulePack } from "../simulation/legislature-rules";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../simulation/national-election-geography";
import { pickDistinct, SeededRng } from "../simulation/rng";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { applyLegislativeStep } from "./legislation-session";

const seed = "team1-a78-player-referral-20261002";
const places = pickDistinct(new SeededRng(seed), lifePlaceStateIdentities(), 5);

function context(
  pack: LegislativeRulePack,
  measureId: EntityId,
): LegislativeProcedureContext {
  return {
    pack,
    measureId,
    bodies: [],
    committeeMemberCount: null,
    votePlan: {},
    governorAction: null,
    governorRationale: "No executive decision is requested by referral.",
  };
}

function file(
  world: World,
  pack: LegislativeRulePack,
  jurisdictionId: EntityId,
  chamberKey: string,
  propositionId: EntityId,
) {
  const filed = introduceMeasure(world, {
    stableKey: `a78:referral:${pack.packId}:${chamberKey}`,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "Referral driver fixture bill",
    shortTitle: "The recorded policy question's referral",
    summary:
      "A real filed catalog question, with no authored votes or fiscal clauses.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamberKey,
    propositionIds: [propositionId],
  });
  return {
    world: filed,
    measureId: filed.history.legislativeMeasures!.at(-1)!.id,
  };
}

function expectSavedReferral(
  world: World,
  measureId: EntityId,
  committeeKey: string,
) {
  expect(measurePosition(world, measureId)).toMatchObject({
    phase: "in-committee",
    committeeKey,
  });
  const actions = measureActions(world, measureId);
  expect(actions.filter((action) => action.kind === "referred")).toEqual([
    expect.objectContaining({ committeeKey }),
  ]);
  const reloaded = deserializeWorld(serializeWorld(world));
  expect(measurePosition(reloaded, measureId)).toEqual(
    measurePosition(world, measureId),
  );
  expect(measureActions(reloaded, measureId)).toEqual(actions);
}

describe.each(places.map((place) => [place.jurisdictionKey]))(
  `shared referral driver in %s (sample seed ${seed})`,
  (place) => {
    it("records a mapped non-first committee through both player and clock in each federal chamber", () => {
      const small = smallWorld({ place, seed, offices: ["congress"] });
      const prepared = ensureNationalElectionJurisdiction(small.world);
      const pack = US_CONGRESS_RULE_PACK;
      // Select an actual catalog question whose documented domain mapping is
      // non-first in both Houses, so the old player fallback cannot pass.
      const proposition = prepared.policyCatalog.propositionOrder
        .map((id) => prepared.policyCatalog.propositions[id]!)
        .find((question) => {
          const issue = prepared.policyCatalog.issues[question.issueId];
          if (!issue?.stableKey.startsWith("us-federal:")) return false;
          const domain = issue.stableKey
            .slice("us-federal:".length)
            .split(".")[0]!;
          const mapping = CONGRESS_COMMITTEE_BY_DOMAIN[domain];
          return (
            mapping &&
            pack.chambers.every((chamber) => {
              const expected =
                mapping[chamber.chamberKey as "house" | "senate"];
              return (
                chamber.committees.some(
                  (committee) => committee.committeeKey === expected,
                ) && expected !== chamber.committees[0]?.committeeKey
              );
            })
          );
        });
      if (!proposition)
        throw new Error(
          "No actual question maps to non-first committees in both chambers.",
        );
      const issue = prepared.policyCatalog.issues[proposition.issueId]!;
      const domain = issue.stableKey.slice("us-federal:".length).split(".")[0]!;
      const mapping = CONGRESS_COMMITTEE_BY_DOMAIN[domain]!;
      for (const chamber of pack.chambers) {
        const expected = mapping[chamber.chamberKey as "house" | "senate"];
        const filed = file(
          prepared,
          pack,
          NATIONAL_ELECTION_JURISDICTION.id,
          chamber.chamberKey,
          proposition.id,
        );
        expect(measurePosition(filed.world, filed.measureId).phase).toBe(
          "awaiting-referral",
        );
        expect(
          referralCommittee(filed.world, filed.measureId, chamber.chamberKey)
            ?.committeeKey,
        ).toBe(expected);
        const history = filed.world.history;
        const player = applyLegislativeStep(
          context(pack, filed.measureId),
          filed.world,
          "request-referral",
        );
        const clock = applyInstitutionStep(
          filed.world,
          filed.measureId,
          (unchanged) => unchanged,
        );
        expect(clock.kind).toBe("applied");
        if (clock.kind !== "applied")
          throw new Error(`Clock did not refer: ${clock.kind}`);
        expect(clock.step).toBe("request-referral");
        expectSavedReferral(player.world, filed.measureId, expected);
        expectSavedReferral(clock.world, filed.measureId, expected);
        expect(measurePosition(player.world, filed.measureId)).toEqual(
          measurePosition(clock.world, filed.measureId),
        );
        expect(filed.world.history).toBe(history);
        expect(measurePosition(filed.world, filed.measureId).phase).toBe(
          "awaiting-referral",
        );
      }
    });

    it("retains the first declared state committee and honors canonical session refusals", () => {
      const small = smallWorld({ place, seed });
      const base = legislativePackForJurisdiction(small.stateJurisdictionId);
      if (!base)
        throw new Error("Sampled jurisdiction has no legislative pack.");
      const pack = legislativeRulePackForWorld(small.world, base.packId);
      const proposition = small.world.policyCatalog.propositionOrder
        .map((id) => small.world.policyCatalog.propositions[id]!)
        .find((question) =>
          small.world.policyCatalog.issues[question.issueId]?.levels?.includes(
            "state",
          ),
        );
      if (!proposition)
        throw new Error("No actual state policy question is recorded.");
      for (const chamber of pack.chambers) {
        if (!chamber.introductionAllowed) continue;
        const filed = file(
          small.world,
          pack,
          small.stateJurisdictionId,
          chamber.chamberKey,
          proposition.id,
        );
        const expected = chamber.committees[0];
        expect(
          referralCommittee(filed.world, filed.measureId, chamber.chamberKey),
        ).toEqual(expected ?? null);
        const sessionEnd = applyInstitutionSessionEnd(
          filed.world,
          filed.measureId,
        );
        if (sessionEnd) {
          // An actual closed session is not a routing success. Both drivers
          // must preserve the guard's own recorded outcome or refusal.
          const player = applyLegislativeStep(
            context(pack, filed.measureId),
            filed.world,
            "request-referral",
          );
          const clock = applyInstitutionStep(
            filed.world,
            filed.measureId,
            (unchanged) => unchanged,
          );
          expect(clock.kind).toBe(sessionEnd.kind);
          if (sessionEnd.kind === "blocked") {
            expect(player.message).toBe(sessionEnd.reason);
            expect(player.world).toBe(filed.world);
          }
          expect(
            measureActions(player.world, filed.measureId).filter(
              (action) => action.kind === "referred",
            ),
          ).toEqual([]);
          continue;
        }
        if (!expected) {
          // A chamber without compiled committees supplies no committee;
          // no invented referral or dummy committee is admitted here.
          expect(
            referralCommittee(filed.world, filed.measureId, chamber.chamberKey),
          ).toBeNull();
          continue;
        }
        const player = applyLegislativeStep(
          context(pack, filed.measureId),
          filed.world,
          "request-referral",
        );
        const clock = applyInstitutionStep(
          filed.world,
          filed.measureId,
          (unchanged) => unchanged,
        );
        expect(clock.kind).toBe("applied");
        if (clock.kind !== "applied")
          throw new Error(`Clock did not refer: ${clock.kind}`);
        expect(clock.step).toBe("request-referral");
        expectSavedReferral(
          player.world,
          filed.measureId,
          expected.committeeKey,
        );
        expectSavedReferral(
          clock.world,
          filed.measureId,
          expected.committeeKey,
        );
      }
    });
  },
);
