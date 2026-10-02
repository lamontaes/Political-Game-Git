import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
} from "../constitutional-process";
import {
  stateRatificationChambers,
  stateRatificationRule,
} from "../constitutional-ratification-rules";
import { currentPresidentOf } from "../crisis/offices";
import { createOrganizationParticipations } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import {
  proposeAndVote,
  recordArticleVStateMemberVote,
  type FederalReformCause,
} from "../living-world/federal-reform";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../living-world/opening";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId } from "../types";
import { congressVoters } from "./article-v";
import { publicPartyOf, stateConstitutionalRoster } from "./chamber-votes";

const seed = "A79 actual shared member votes through 38 states";
const identities = lifePlaceStateIdentities();
const home = new SeededRng(seed).pick(identities);
// Explicit sourced supermajority and unicameral controls, then a seeded sample.
const states = ["US-AL", "US-CO", "US-NE"];
const pool = ARTICLE_V_STATE_KEYS.filter((key) => !states.includes(key));
const rng = new SeededRng(seed).fork("remaining 35 ratifying states");
while (states.length < 38)
  states.push(pool.splice(rng.integer(0, pool.length), 1)[0]!);

describe("Article V ratification through 38 actual state legislatures", () => {
  it("retains exact rules and labels source-silent thresholds ESTIMATE for all states", () => {
    expect(identities).toHaveLength(56);
    expect(ARTICLE_V_STATE_KEYS).toHaveLength(50);
    for (const stateKey of ARTICLE_V_STATE_KEYS) {
      const bodies = stateRatificationChambers(stateKey);
      expect(bodies, stateKey).not.toBeNull();
      for (const body of bodies!) {
        const rule = stateRatificationRule(stateKey, body)!;
        if (rule.basis === "estimate") {
          expect(rule.threshold.source.verification).toBe("partial");
          expect(rule.threshold.source.note).toContain("ESTIMATE");
        } else {
          expect(rule.threshold.source.verification).toBe("verified");
        }
      }
    }
    expect(stateRatificationChambers("US-NE")).toEqual(["legislature"]);
    expect(stateRatificationRule("US-CO", "house")).toMatchObject({
      basis: "sourced",
      threshold: {
        numerator: 2,
        denominatorParts: 3,
        countedAgainst: "members-elected",
        rounding: "at-least-fraction",
        source: { verification: "verified" },
      },
    });
    expect(stateRatificationRule("US-AL", "house")!.threshold).toMatchObject({
      numerator: 3,
      denominatorParts: 5,
      countedAgainst: "members-elected",
      rounding: "at-least-fraction",
    });
  });

  it("remains pending at 37 and becomes operative at 38 with saved shared ballots", () => {
    let world = ensureNationalElectionJurisdiction(
      smallWorld({
        place: home.jurisdictionKey,
        seed,
        offices: ["congress"],
      }).world,
    );
    if (world.control.kind !== "person")
      throw Error("Actual saved controlled person required.");
    const subject = world.control.personId;
    for (const stateKey of states)
      world = ensureStateLegislatureOpening(world, subject, stateKey.slice(3));

    const president = currentPresidentOf(world);
    if (!president) throw Error("Actual saved President required.");
    const people = new Set<EntityId>([
      president.personId,
      ...(["house", "senate"] as const).flatMap((body) =>
        congressVoters(world, body).map((member) => member.personId),
      ),
    ]);
    for (const stateKey of states) {
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      for (const bodyKey of stateRatificationChambers(stateKey)!) {
        const roster = stateConstitutionalRoster(
          world, jurisdiction.id, bodyKey, "ratification",
        );
        if (!roster) throw Error("Actual saved state roster required.");
        for (const member of roster.seated.body.members) {
          if (!member.personId) throw Error("Complete actual seating required.");
          expect(member.personId).not.toBe(subject);
          people.add(member.personId);
        }
      }
    }
    // Authored political inputs on actual people, not natural party formation.
    // Congress and state ballots are never supplied.
    const partyId = livingWorldOrganizationId(
      world, LIVING_WORLD_KEYS.nationalParty("democratic"),
    );
    world = createOrganizationParticipations(
      world,
      [...people]
        .filter((personId) => publicPartyOf(world, personId) !== "democratic")
        .map((personId) => ({
          stableKey: `${seed}:supplied-support:${personId}`,
          personId,
          organizationId: partyId,
          startedAt: world.currentDate,
          initialStatus: "active",
          kind: "affiliation:political-party",
          roleKind: "member:public-affiliation",
          context: "Supplied same-party support on an actual saved person.",
          provenance: {
            kind: "authored",
            note: "Political inputs supplied; ballots use the unchanged shared evaluator.",
          },
        })),
    );
    for (const personId of people)
      expect(publicPartyOf(world, personId)).toBe("democratic");

    const cause: FederalReformCause = {
      direction: "extend",
      holderPersonId: president.personId,
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: 3,
        lookbackYears: null,
      },
      reason: "Supplied supportive inputs on the actual President; not a natural filing cause.",
    };
    world = proposeAndVote(world, 2027, cause);
    const measure = world.history.constitutionalMeasures!.at(-1)!;
    expect(measure.jurisdictionId).toBe(NATIONAL_ELECTION_JURISDICTION.id);
    expect(constitutionalPosition(world, measure.id).phase).toBe("ratification");
    expect(constitutionalActions(world, measure.id).filter(
      (action) => action.detail.kind === "proposal-vote",
    )).toHaveLength(2);

    let memberComparisons = 0;
    for (const [index, stateKey] of states.entries()) {
      const before = world;
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      const bodies = stateRatificationChambers(stateKey)!;
      const next = recordArticleVStateMemberVote(world, measure.id, stateKey);
      if (!next) throw Error(`Actual ratification unavailable in ${stateKey}`);
      world = next;
      const action = constitutionalActions(world, measure.id).find(
        (row) => row.detail.kind === "state-ratification" && row.detail.stateKey === stateKey,
      );
      if (action?.detail.kind !== "state-ratification")
        throw Error("Actual state ratification action required.");
      expect(action.detail.approved, stateKey).toBe(true);
      expect(action.detail.jurisdictionId).toBe(jurisdiction.id);
      expect(action.detail.chamberVotes!.map((row) => row.bodyKey)).toEqual(bodies);
      for (const chamber of action.detail.chamberVotes!) {
        const roster = stateConstitutionalRoster(
          before, jurisdiction.id, chamber.bodyKey, "ratification",
        )!;
        const rule = stateRatificationRule(stateKey, chamber.bodyKey)!;
        expect(chamber.sourceRecordIds).toContain(chamber.organizationId);
        expect(roster.sourceRecordIds).toContain(chamber.organizationId);
        expect(chamber.vote.dispositions.map((row) => [row.memberKey, row.personId])).toEqual(
          roster.seated.body.members.map((row) => [row.memberKey, row.personId]),
        );
        expect(chamber.vote.purpose).toBe("constitutional-ratification");
        expect(chamber.vote.thresholdLabel).toBe(rule.threshold.label);
        expect(chamber.vote.denominatorKind).toBe(rule.threshold.countedAgainst);
        expect(chamber.vote.outcome, `${stateKey}:${chamber.bodyKey}`).toBe("passed");
        if (rule.basis === "estimate")
          expect(chamber.vote.provenance.note).toContain("ESTIMATE");
        for (const row of chamber.vote.dispositions) {
          expect(row.personId).not.toBeNull();
          expect(row.reason).toBeTruthy();
          memberComparisons++;
        }
      }
      const position = constitutionalPosition(world, measure.id);
      expect(position.ratifiedStates).toHaveLength(index + 1);
      if (index === 36) {
        expect(position.phase).toBe("ratification");
        expect(position.effectiveAt).toBeNull();
      }
      if (index === 37) {
        expect(position.phase).toBe("operative");
        expect(position.effectiveAt).toBe(action.occurredAt);
        expect(position.operativeAt).toBe(action.occurredAt);
      }
      expect(recordArticleVStateMemberVote(world, measure.id, stateKey)).toBe(world);
    }
    const saved = serializeWorld(world);
    const continued = deserializeWorld(saved);
    expect(constitutionalPosition(continued, measure.id)).toEqual(
      constitutionalPosition(world, measure.id),
    );
    expect(constitutionalActions(continued, measure.id)).toEqual(
      constitutionalActions(world, measure.id),
    );
    for (const stateKey of states)
      expect(recordArticleVStateMemberVote(continued, measure.id, stateKey)).toBe(continued);
    expect(serializeWorld(continued)).toBe(saved);
    console.info("A79 actual 38-state ratification", JSON.stringify({
      seed,
      home: home.jurisdictionKey,
      states,
      memberComparisons,
      ratifiedStates: constitutionalPosition(world, measure.id).ratifiedStates,
      politicalInputs: "authored actual-person affiliations",
      ballots: "unsupplied shared member decisions",
    }));
  });
});
