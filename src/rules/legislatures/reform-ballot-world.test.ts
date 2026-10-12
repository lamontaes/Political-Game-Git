import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  stateJurisdictionForKey,
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../../simulation/life-places";
import { factsForPerson } from "../../simulation/people";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  householdMembershipStateHistory,
  householdLocationHistory,
} from "../../simulation/life-queries";
import { recordHouseholdLocation } from "../../simulation/life";
import { addDays } from "../../simulation/dates";
import {
  recordPrivateBelief,
  recordPrinciples,
  createFormationContext,
} from "../../simulation/politics";
import { ensureOfficeholderPrinciples } from "../../simulation/governing/officeholder-principles";
import { stateConstitutionalRoster } from "../../simulation/governing/chamber-votes";
import * as constitution from "../../simulation/constitutional-process";
import * as native from "../../simulation/living-world/constitutional-reform";
import * as writer from "../../simulation/governing/constitutional-amendments";
import { scheduleFutureDueItem } from "../../simulation/future-transitions";
import {
  principlesAmendment,
  constitutionalReformBallotHandler,
  recordedBallotTally,
  type ReformBallotFacts,
} from "./reform-ballots";
import type { EntityId, IsoDate, World } from "../../simulation/types";
function residenceFacts(
  world: World,
  id: EntityId,
  home: EntityId,
  date: IsoDate,
) {
  const person = world.people[id];
  const stateKey = stateKeyForJurisdiction(world.jurisdictions[home]!);
  const covered = (id: EntityId) =>
    stateKey
      ? stateJurisdictionForKey(stateKey)?.id === id ||
        lifePlaceByJurisdictionId(id)?.stateJurisdictionKey === stateKey
      : id === home;
  const base = currentLifeCutoff(world);
  const dates = new Set<IsoDate>();
  for (const membership of world.history.householdMemberships.filter(
    (m) => m.personId === id && m.sequence < base.historySequenceExclusive,
  )) {
    dates.add(membership.startedAt);
    for (const row of householdMembershipStateHistory(
      world,
      membership.id,
      base,
    ))
      dates.add(row.effectiveAt);
    for (const row of householdLocationHistory(
      world,
      membership.householdId,
      base,
    ))
      dates.add(row.effectiveAt);
  }
  const coverage = new Set<string>();
  for (const at of [date, ...dates, ...[...dates].map((d) => addDays(d, -1))])
    if (
      householdMembershipsAt(world, person!.id, { ...base, asOfDate: at }).some(
        (m) =>
          m.state.residenceRole === "primary" &&
          !!m.location &&
          covered(m.location.jurisdictionId),
      )
    )
      coverage.add(at);
  return {
    personExists: !!person,
    residences: person
      ? factsForPerson(person)
          .filter((f) => f.kind === "residence")
          .map((f) => ({
            ...f,
            covered: covered(f.jurisdictionId),
          }))
      : [],
    homeCoverage: coverage,
    changeDates: [...dates].sort(),
  };
}

function facts(world: World): ReformBallotFacts {
  const measures = world.history.constitutionalMeasures ?? [];
  const beliefs = world.history.privateBeliefs;
  return {
    onDate: world.currentDate,
    policyCatalog: world.policyCatalog,
    measures,
    positions: new Map(
      measures.map((measure) => [
        measure.id,
        {
          onDate: world.currentDate,
          measure,
          actions: world.history.constitutionalActions ?? [],
          enactments: world.history.legislativeEnactments ?? [],
          articleVStateKeys: constitution.ARTICLE_V_STATE_KEYS,
          conventionBodyKey: constitution.ARTICLE_V_CONVENTION_BODY,
          stateProfile: constitution.stateAmendmentProfile(
            measure.jurisdictionKey,
          ),
        },
      ]),
    ),
    playerPersonId:
      world.control.kind === "person" ? world.control.personId : null,
    principles: world.history.principles,
    beliefs,
    stateNames: new Map(
      Object.keys(STATES).map((place) => [
        place,
        world.jurisdictions[stateJurisdictionForKey(`US-${place}`)!.id]?.name ??
          place,
      ]),
    ),
    people: new Map(world.personOrder.map((id) => [id, world.people[id]!])),
    deaths: world.history.personDeaths,
    nextSequence: world.history.nextSequence,
    residence: new Map(
      [...new Set(beliefs.map((row) => row.personId))].flatMap((person) =>
        [...new Set(measures.map((row) => row.jurisdictionId))].map(
          (jurisdiction) => [
            `${person}:${jurisdiction}`,
            residenceFacts(world, person, jurisdiction, world.currentDate),
          ],
        ),
      ),
    ),
    jurisdictionIds: new Set(world.jurisdictionOrder),
  };
}
// Authored policy views and proposal roll calls exercise native request edges;
// no spontaneous proposal or synthetic voter cohort is claimed.
describe("legislatures: constitutional policy selection and ballot caller kernels", () => {
  let proposals = 0,
    ballots = 0;
  afterAll(() => {
    expect(proposals).toBeGreaterThan(0);
    expect(ballots).toBeGreaterThan(0);
  });
  it.each(Object.keys(STATES))(
    "matches policy and ballot requests in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        date: "2026-11-03",
        seed: `rules2-reform-ballot:${place}`,
        people: 8,
        household: true,
        offices: ["governor", "state-legislature"],
      });
      let world: World = { ...base.world, control: { kind: "observer" } };
      world = recordHouseholdLocation(world, {
        stableKey: `rules2:${place}:ballot-home`,
        householdId: world.history.households.at(-1)!.id,
        effectiveAt: world.currentDate,
        jurisdictionId: base.jurisdictionId,
        label: base.place.displayName,
        kind: "residence:primary",
        provenance: {
          kind: "authored",
          note: "Native saved home for ballot qualification.",
        },
        supersedesLocationId: null,
      });
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
      const profile = constitution.stateAmendmentProfile(`US-${place}`);
      const rosters =
        profile?.bodies.map((body) =>
          stateConstitutionalRoster(world, jurisdiction.id, body.bodyKey),
        ) ?? [];
      const voters = rosters.flatMap(
        (roster) =>
          roster?.seated.body.members.flatMap((member) =>
            member.personId
              ? [{ memberKey: member.memberKey, personId: member.personId }]
              : [],
          ) ?? [],
      );
      world = ensureOfficeholderPrinciples(
        world,
        voters.map((row) => row.personId),
      );
      const question = world.policyCatalog.propositionOrder
        .map((id) => world.policyCatalog.propositions[id]!)
        .find(
          (row) =>
            row.principles?.length &&
            world.policyCatalog.issues[row.issueId]?.levels?.includes("state"),
        )!;
      if (voters.length)
        world = recordPrinciples(
          world,
          voters.flatMap((voter) =>
            question.principles!.map((bearing) => ({
              stableKey: `rules2:${place}:principles:${voter.personId}:${bearing.principleId}`,
              personId: voter.personId,
              principleId: bearing.principleId,
              formedAt: world.currentDate,
              stance:
                bearing.bearing === "consistent-with"
                  ? ("endorses" as const)
                  : ("rejects" as const),
              strength: 1,
              conviction: "settled" as const,
              flexibility: "firm" as const,
              qualification: null,
              formation: createFormationContext("experience:life", {
                note: "Authored majority policy control.",
              }),
              supersedesPrincipleRecordId:
                world.history.principles
                  .filter(
                    (row) =>
                      row.personId === voter.personId &&
                      row.principleId === bearing.principleId,
                  )
                  .at(-1)?.id ?? null,
            })),
          ),
        );
      world = scheduleFutureDueItem(world, {
        stableKey: `constitutional-reform/v1:${place}:2026:review`,
        dueAt: world.currentDate,
        transitionKey: native.CONSTITUTIONAL_REFORM_REVIEW,
        entityIds: [jurisdiction.id],
        jurisdictionId: jurisdiction.id,
        provenance: { kind: "authored", note: "Authored review trigger." },
      });
      const requests: Parameters<typeof writer.proposeAndVoteAmendment>[] = [];
      const seam = vi
        .spyOn(writer, "proposeAndVoteAmendment")
        .mockImplementation((...args) => {
          requests.push(args);
          return args[0];
        });
      try {
        native.constitutionalReformReviewHandler(
          world,
          world.history.futureDueItems.at(-1)!,
        );
      } finally {
        seam.mockRestore();
      }
      const request = requests.find(
        ([, input]) => input.proposal.ruleDelta.kind === "policy-provision",
      );
      if (request) {
        const [at, input] = request,
          chosen = principlesAmendment(facts(at), place, 2026, voters);
        expect(chosen).not.toBeNull();
        expect(chosen).toEqual({
          key: input.proposal.stableKey,
          shortTitle: input.proposal.shortTitle,
          text: input.proposal.text,
          ruleDelta: input.proposal.ruleDelta,
        });
        proposals++;
      } else if (!voters.length)
        expect(principlesAmendment(facts(world), place, 2026, [])).toBeNull();
      if (
        !profile ||
        !constitution.ARTICLE_V_STATE_KEYS.includes(`US-${place}`)
      )
        return;
      world = constitution.proposeConstitutionalMeasure(world, {
        stableKey: `constitutional-reform/v1:${place}:2026:ballot-control`,
        jurisdictionId: jurisdiction.id,
        jurisdictionKey: `US-${place}`,
        processKind: "state-amendment",
        designation: "Authored policy amendment",
        shortTitle: question.name,
        text: "Authored policy ballot edge.",
        textVersion: "v1",
        sponsoringAuthority: "Authored legislature control",
        sponsorPersonId: null,
        ratificationMode: "statewide-electors",
        deadlineAt: null,
        delayedOperativeAt: null,
        ruleDelta: {
          kind: "policy-provision",
          propositionId: question.id,
          stance: "adopt",
        },
        ordinaryMeasureId: null,
      });
      const measure = world.history.constitutionalMeasures!.at(-1)!;
      for (const body of profile.bodies) {
        const n = body.members ?? 7;
        world = constitution.recordConstitutionalProposalVote(
          world,
          measure.id,
          body.bodyKey,
          Array.from({ length: n }, (_, index) => ({
            memberKey: `authored:${index}`,
            personId: null,
            disposition: "yea" as const,
          })),
          n,
          {
            method: "authored-fixture",
            note: "Explicit proposal roll call.",
            sourceEntityIds: [],
          },
        );
      }
      world = scheduleFutureDueItem(world, {
        stableKey: `${measure.stableKey}:ballot:2026`,
        dueAt: world.currentDate,
        transitionKey: native.CONSTITUTIONAL_REFORM_BALLOT,
        entityIds: [jurisdiction.id],
        jurisdictionId: jurisdiction.id,
        provenance: { kind: "authored", note: "Authored ballot trigger." },
      });
      const due = world.history.futureDueItems.at(-1)!;
      // No-view refusal is an actual native caller result, not an estimated vote.
      const unsupported = native.constitutionalReformBallotHandler(world, due);
      expect(constitutionalReformBallotHandler(facts(world), due)).toEqual({
        status: unsupported.status,
        reason: unsupported.context,
        commands: [],
      });
      for (const [index, personId] of base.world.personOrder
        .slice(0, 3)
        .entries())
        world = recordPrivateBelief(world, {
          stableKey: `rules2:${place}:ballot-view:${index}`,
          personId,
          propositionId: question.id,
          formedAt: world.currentDate,
          position: index < 2 ? "support" : "oppose",
          conviction: "settled",
          salience: "central",
          flexibility: "firm",
          rationale: "Authored ballot view.",
          formation: createFormationContext("experience:life", {
            note: "Authored ballot math control.",
          }),
          supersedesBeliefId:
            world.history.privateBeliefs
              .filter(
                (row) =>
                  row.personId === personId &&
                  row.propositionId === question.id,
              )
              .at(-1)?.id ?? null,
        });
      expect(recordedBallotTally(facts(world), measure)).toEqual(
        native.recordedBallotTally(world, measure),
      );
      const calls: Parameters<
        typeof constitution.recordStatewideRatification
      >[] = [];
      const original = constitution.recordStatewideRatification;
      const capture = vi
        .spyOn(constitution, "recordStatewideRatification")
        .mockImplementation((...args) => {
          calls.push(args);
          return original(...args);
        });
      let expected;
      try {
        expected = native.constitutionalReformBallotHandler(world, due);
      } finally {
        capture.mockRestore();
      }
      expect(calls).toHaveLength(1);
      const plan = constitutionalReformBallotHandler(facts(world), due);
      expect(plan.status).toBe(expected.status);
      expect(plan.reason).toBe(expected.context);
      expect(plan.commands).toEqual([
        {
          command: "recordStatewideRatification",
          input: { measureId: calls[0]![1], detail: calls[0]![2] },
        },
      ]);
      ballots++;
    },
    30000,
  );
});
