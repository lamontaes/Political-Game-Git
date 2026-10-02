import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { legacyTermLimitBallot } from "../../../tests/fixtures/legacy-term-limit-ballot";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import {
  stateRatificationChambers,
  stateRatificationRule,
} from "../constitutional-ratification-rules";
import { currentPresidentOf } from "../crisis/offices";
import { createOrganizationParticipations } from "../life";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../living-world/opening";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { SeededRng } from "../rng";
import { personName } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import {
  decideArticleVStateMemberVotes as decideWrapped,
  recordArticleVStateMemberVote as recordWrapped,
  termLimitConsiderations,
  termLimitCount,
  type FederalReformCause,
} from "../living-world/federal-reform";
import { seatedCongressChamber } from "./congress-chambers";
import { stateConstitutionalRoster } from "./chamber-votes";
import {
  decideArticleVStateMemberVotes as decideLeaf,
  recordArticleVStateMemberVote as recordLeaf,
} from "./constitutional-state-votes";

const seed = "A79 saved term-limit state leaf parity";
const home = new SeededRng(seed).pick(lifePlaceStateIdentities());
const candidates = ARTICLE_V_STATE_KEYS.filter((key) =>
  stateRatificationChambers(key),
);
const rng = new SeededRng(seed).fork("sourced state chambers");
const states = Array.from(
  { length: 5 },
  () => candidates.splice(rng.integer(0, candidates.length), 1)[0]!,
);
let world: World;

beforeAll(() => {
  world = ensureNationalElectionJurisdiction(
    smallWorld({ place: home.jurisdictionKey, seed, offices: ["congress"] })
      .world,
  );
  if (world.control.kind !== "person")
    throw Error("Actual controlled person required.");
  const subject = world.control.personId;
  for (const stateKey of states)
    world = ensureStateLegislatureOpening(
      world,
      subject,
      stateKey.slice(3),
    );
  // Supplied non-neutral affiliations on the actual saved President and
  // members exercise both directions without supplying any state ballot.
  const affiliations = [
    { personId: currentPresidentOf(world)!.personId, party: "democratic" },
    ...states.flatMap((stateKey) => {
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      return stateRatificationChambers(stateKey)!.flatMap((bodyKey) =>
        stateConstitutionalRoster(
          world,
          jurisdiction.id,
          bodyKey,
          "ratification",
        )!
          .seated.body.members.filter((member) => member.personId !== null)
          .slice(0, 2)
          .map((member, index) => ({
            personId: member.personId!,
            party: index === 0 ? "democratic" : "republican",
          })),
      );
    }),
  ];
  world = createOrganizationParticipations(
    world,
    affiliations.map(({ personId, party }) => ({
      stableKey: `${seed}:supplied-party:${personId}`,
      personId,
      organizationId: livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty(party),
      ),
      startedAt: world.currentDate,
      initialStatus: "active",
      kind: "affiliation:political-party",
      roleKind: "member:public-affiliation",
      context: "Supplied non-neutral state parity affiliation.",
      provenance: {
        kind: "authored",
        note: "Same supplied actual-person inputs in leaf, wrapper and oracle.",
      },
    })),
  );
});

describe("saved presidential term-limit state votes survive the shared leaf extraction", () => {
  it.each(["extend", "restore"] as const)(
    "preserves %s ballots, reasons, sourced records and Continue in five seeded states",
    (direction) => {
      const cause: FederalReformCause = {
        direction,
        holderPersonId: currentPresidentOf(world)!.personId,
        value: {
          maxConsecutiveTerms: null,
          maxLifetimeTerms: 3,
          lookbackYears: null,
        },
        reason:
          "Supplied comparison on the actual saved President, not a natural filing cause.",
      };
      // The real term-limit producer saves its proposal first. Only Congress's
      // admission is authored here, on its actual saved roster, to isolate states.
      const proposal = termLimitCount(world, 2027, cause);
      let admitted = proposal.world;
      for (const bodyKey of ["house", "senate"] as const) {
        const members = seatedCongressChamber(admitted, bodyKey)!.body.members;
        admitted = recordConstitutionalProposalVote(
          admitted,
          proposal.measureId,
          bodyKey,
          members.map((member) => ({
            memberKey: member.memberKey,
            personId: member.personId,
            disposition: "yea",
            reason: "fixture:supplied-congressional-admission",
          })),
          members.length,
          {
            method: "authored-fixture",
            note: "Supplied congressional approval on actual members; state votes remain unsupplied.",
            sourceEntityIds: [],
          },
        );
      }
      expect(constitutionalPosition(admitted, proposal.measureId).phase).toBe(
        "ratification",
      );
      const considerations = (
        current: World,
        member: { memberKey: string; personId: EntityId },
      ) => termLimitConsiderations(current, member, cause);
      let compared = 0;
      const examples: unknown[] = [];
      for (const stateKey of states) {
        const jurisdiction = stateJurisdictionForKey(stateKey)!;
        const wrapped = decideWrapped(
          admitted,
          proposal.measureId,
          jurisdiction.id,
        )!;
        const leaf = decideLeaf(
          admitted,
          proposal.measureId,
          jurisdiction.id,
          considerations,
        )!;
        expect(wrapped).not.toBeNull();
        expect(leaf.chambers).toEqual(wrapped.chambers);
        expect(leaf.chambers).toHaveLength(
          stateRatificationChambers(stateKey)!.length,
        );
        for (const chamber of leaf.chambers) {
          expect(chamber.sourceRecordIds).toContain(proposal.measureId);
          for (const row of chamber.dispositions) {
            expect(row.personId).not.toBeNull();
            const old = legacyTermLimitBallot(
              leaf.world,
              `old:${stateKey}:${row.memberKey}`,
              { memberKey: row.memberKey, personId: row.personId! },
              cause,
            );
            expect(row.disposition).toBe(old.ballot);
            expect(row.reason).toBe(old.reason);
            compared++;
            if (row.reason?.includes("party"))
              examples.push({
                stateKey,
                body: chamber.bodyKey,
                person: personName(leaf.world.people[row.personId!]!),
                ballot: row.disposition,
                reason: row.reason,
              });
          }
        }
        const recorded = recordWrapped(admitted, proposal.measureId, stateKey)!;
        const leafRecorded = recordLeaf(
          admitted,
          proposal.measureId,
          stateKey,
          considerations,
        )!;
        expect(recorded).not.toBeNull();
        expect(serializeWorld(leafRecorded)).toBe(serializeWorld(recorded));
        const action = constitutionalActions(recorded, proposal.measureId).find(
          (row) =>
            row.detail.kind === "state-ratification" &&
            row.detail.stateKey === stateKey,
        )!;
        if (action.detail.kind !== "state-ratification")
          throw Error("Actual state action required.");
        for (const chamber of action.detail.chamberVotes!) {
          const rule = stateRatificationRule(stateKey, chamber.bodyKey)!;
          expect(chamber.vote.dispositions).toEqual(
            wrapped.chambers.find((row) => row.bodyKey === chamber.bodyKey)!
              .dispositions,
          );
          expect(chamber.vote.thresholdLabel).toBe(rule.threshold.label);
          expect(chamber.vote.denominatorKind).toBe(
            rule.threshold.countedAgainst,
          );
        }
        expect(recordWrapped(recorded, proposal.measureId, stateKey)).toBe(
          recorded,
        );
        const continued = deserializeWorld(serializeWorld(recorded));
        expect(constitutionalActions(continued, proposal.measureId)).toEqual(
          constitutionalActions(recorded, proposal.measureId),
        );
        expect(recordWrapped(continued, proposal.measureId, stateKey)).toBe(
          continued,
        );
        expect(
          recordLeaf(continued, proposal.measureId, stateKey, considerations),
        ).toBe(continued);
        expect(
          decideWrapped(
            deserializeWorld(serializeWorld(admitted)),
            proposal.measureId,
            jurisdiction.id,
          )?.chambers,
        ).toEqual(wrapped.chambers);
      }
      console.info(
        "A79 saved state leaf parity",
        JSON.stringify({
          seed,
          home: home.jurisdictionKey,
          states,
          direction,
          compared,
          changed: 0,
          examples: examples.slice(0, 2),
        }),
      );
    },
  );
});
