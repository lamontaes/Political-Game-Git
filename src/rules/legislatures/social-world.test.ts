import { recordRelationshipInteraction } from "../../simulation/records";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  recordFavor,
  favorStandingBetween as nativeFavor,
} from "../../simulation/favors";
import { favorNeed as nativeNeed } from "../../simulation/favor-collection";
import { recordWorldEvent } from "../../simulation/world";
import { personTrait } from "../../simulation/people-traits";
import { personName } from "../../simulation/people";
import { publicPartyOf } from "../../simulation/governing/chamber-votes";
import { readRelationshipStanding } from "../../simulation/relationship-standing";
import { publicOfficesHeldBy } from "../../simulation/crisis/offices";
import * as nativeAppointment from "../../simulation/patronage/appointments";
import { inferredProtegeOf as nativeProtege } from "../../simulation/person-context";
import {
  strongestOfficialStanding as nativeStanding,
  townSupportFromViews as nativeSupport,
  groupsAgainst as nativeGroups,
} from "../../simulation/official-view-reads";
import {
  recordPrivateBelief,
  createFormationContext,
} from "../../simulation/politics";
import { activeWorkRelationshipsAt } from "../../simulation/life-queries";
import { addDays } from "../../simulation/dates";
import { favorStandingBetween, type FavorFacts } from "./favor-standing";
import { favorNeed } from "./favor-need";
import { inferredProtegeOf } from "./protege-inference";
import {
  rankAppointmentCandidates,
  scoreOf,
  appointmentMotive,
  wasPersonalAppointment,
  type AppointmentFacts,
} from "./appointments";
import {
  strongestOfficialStanding,
  townSupportFromViews,
  groupsAgainst,
  type OfficialStandingFacts,
} from "./official-standing";
import type { World, EntityId } from "../../simulation/types";
function favors(world: World): FavorFacts {
  return {
    onDate: world.currentDate,
    favors: world.history.favors ?? [],
    reliability: new Map(
      world.personOrder.map((id) => [
        id,
        personTrait(world, id, "reliability").value,
      ]),
    ),
    people: world.people,
    interactions: world.history.relationshipInteractions,
    events: world.history.events,
    knowledge: world.history.knowledge,
  };
}
function views(world: World): OfficialStandingFacts {
  return {
    onDate: world.currentDate,
    beliefs: world.history.privateBeliefs,
    legacyViews: world.history.officialViews ?? [],
    personOrder: world.personOrder,
    people: world.people,
    organizations: world.history.organizations,
    participations: world.history.organizationParticipations,
  };
}
describe("legislatures: private social rule closures through native public callers", () => {
  it.each(Object.keys(STATES))(
    "matches favor decay, appointment ranking and official standing in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-social:${place}`,
        offices: ["congress"],
      }).world;
      const [giver, receiver] = world.personOrder.slice(3, 5) as [
        EntityId,
        EntityId,
      ];
      world = recordWorldEvent(world, {
        stableKey: `rules2:${place}:help`,
        type: "life.conversation",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [giver, receiver],
        participants: [
          { personId: giver, role: "agency:actor", detail: "Helped" },
          {
            personId: receiver,
            role: "focus:subject",
            detail: "Received help",
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [],
        summary: "Help between the people.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      for (const [index, weight] of (
        ["slight", "moderate", "great", "life-changing"] as const
      ).entries())
        world = recordFavor(world, {
          stableKey: `rules2:${place}:favor:${index}`,
          giverPersonId: giver,
          receiverPersonId: receiver,
          kind: "personal:help",
          description: "gave help",
          givenAt: world.currentDate,
          eventId: world.history.events.at(-1)!.id,
          subject: { kind: "none" },
          motive: index % 2 ? "trade" : "kindness",
          weight,
          audience: "public",
          witnessPersonIds: [],
          inReturnForFavorId: null,
          undertakingId: null,
        });
      for (const days of [0, 10, 52, 210, 420])
        for (const [a, b] of [
          [receiver, giver],
          [giver, receiver],
        ] as const) {
          const date = addDays(world.currentDate, days);
          expect(favorStandingBetween(favors(world), a, b, date)).toEqual(
            nativeFavor(world, a, b, date),
          );
          expect(inferredProtegeOf(favors(world), a, b, date)).toEqual(
            nativeProtege(world, a, b, date),
          );
        }
      const candidateIds = world.personOrder
        .slice(2, 12)
        .filter((id) => id !== receiver);
      world = recordRelationshipInteraction(
        { ...world, control: { kind: "observer" } },
        {
          stableKey: `rules2:${place}:help-standing`,
          personIds: [giver, receiver],
          eventId: null,
          occurredAt: world.currentDate,
          kind: "support:helped-through-a-hard-time",
          change: "strengthened",
          significance: "major",
          summary: "One helped the other through a hard time.",
          tags: [`relationship.actor:${giver}`],
        },
      );
      const choice = nativeAppointment.chooseAppointee(world, {
        stableKey: `rules2:${place}:appointment`,
        appointerPersonId: receiver,
        post: {
          officeKey: `fixture:council:${place}`,
          title: "Council member",
        },
        circle: candidateIds,
        eligible: () => true,
      });
      expect(choice).not.toBeNull();
      world = choice!.world;
      const facts: AppointmentFacts = {
        ...favors(world),
        names: new Map(
          world.personOrder.map((id) => [id, personName(world.people[id]!)]),
        ),
        traits: new Map(
          world.personOrder.flatMap((id) =>
            (["reliability", "deliberation", "conflict"] as const).map(
              (trait) =>
                [`${id}:${trait}`, personTrait(world, id, trait)] as const,
            ),
          ),
        ),
        relationships: new Map(
          candidateIds.flatMap(
            (id) =>
              [
                [
                  `${receiver}:${id}`,
                  readRelationshipStanding(world, receiver, id),
                ],
                [
                  `${id}:${receiver}`,
                  readRelationshipStanding(world, id, receiver),
                ],
              ] as const,
          ),
        ),
        parties: new Map(
          world.personOrder.map((id) => [id, publicPartyOf(world, id)]),
        ),
        offices: new Map(
          world.personOrder.map((id) => [id, publicOfficesHeldBy(world, id)]),
        ),
        decisionTraces: world.history.decisionTraces,
      };
      const ranked = rankAppointmentCandidates(
        facts,
        receiver,
        candidateIds,
        `appointments-v1:rules2:${place}:appointment`,
      );
      expect([
        choice!.personId,
        ...ranked
          .map((row) => row.personId)
          .filter((id) => id !== choice!.personId),
      ]).toEqual(choice!.shortList);
      const picked = ranked.find((row) => row.personId === choice!.personId)!;
      expect(
        picked.considerations
          .filter((row) => row.direction === "supports")
          .sort((a, b) => scoreOf([b]) - scoreOf([a]))
          .map((row) => row.explanation),
      ).toEqual(choice!.reasons);
      const trace = world.history.decisionTraces.find(
        (row) => row.id === choice!.decisionTraceId,
      )!;
      const byKey = (a: (typeof picked.considerations)[number], b: typeof a) =>
        a.stableKey.localeCompare(b.stableKey);
      // The native decision writer canonicalizes source references (set + order).
      const canonical = (
        rows: readonly (typeof picked.considerations)[number][],
      ) =>
        rows
          .map((row) => ({
            ...row,
            sourceRefs: [
              ...new Map(
                row.sourceRefs.map((ref) => [JSON.stringify(ref), ref]),
              ).values(),
            ].sort((a, b) =>
              JSON.stringify(a).localeCompare(JSON.stringify(b)),
            ),
          }))
          .sort(byKey);
      expect(canonical(ranked.flatMap((row) => row.considerations))).toEqual(
        canonical(trace.context.considerations),
      );
      expect(appointmentMotive(facts, receiver, choice!.personId)).toEqual(
        nativeAppointment.appointmentMotive(world, receiver, choice!.personId),
      );
      expect(
        wasPersonalAppointment(
          trace.context.considerations,
          trace.selectedOptionKey!,
        ),
      ).toEqual(
        nativeAppointment.wasPersonalAppointment(
          trace.context.considerations,
          trace.selectedOptionKey!,
        ),
      );
      const town = world.people[receiver]!.homeJurisdictionId;
      for (const [index, id] of world.personOrder
        .slice(0, 6)
        .filter((id) => id !== giver)
        .entries())
        world = recordPrivateBelief(world, {
          stableKey: `rules2:${place}:view:${index}`,
          personId: id,
          propositionId: null,
          subject: { kind: "official", personId: giver },
          formedAt: world.currentDate,
          position: index % 2 ? "oppose" : "support",
          conviction: "strong",
          salience: index % 2 ? "high" : "moderate",
          flexibility: "firm",
          rationale: null,
          formation: createFormationContext("reflection:initial"),
          supersedesBeliefId: null,
        });
      for (const id of world.personOrder.slice(0, 5))
        expect(strongestOfficialStanding(views(world), id)).toEqual(
          nativeStanding(world, id),
        );
      expect(
        townSupportFromViews(views(world), town, giver, world.currentDate),
      ).toEqual(nativeSupport(world, town, giver, world.currentDate));
      // A labeled history edge exercises the private negative-net group calculation without claiming a new group producer.
      const organization = world.history.organizations[0];
      if (organization) {
        const edge = {
          ...world,
          history: {
            ...world.history,
            organizations: world.history.organizations.map((row) =>
              row.id === organization.id
                ? { ...row, stableKey: `law-interest:${town}:fixture` }
                : row,
            ),
          },
        };
        expect(groupsAgainst(views(edge), town, giver)).toEqual(
          nativeGroups(edge, town, giver),
        );
        expect(
          townSupportFromViews(views(edge), town, giver, edge.currentDate),
        ).toEqual(nativeSupport(edge, town, giver, edge.currentDate));
      }
      for (const id of world.personOrder.slice(0, 5))
        expect(
          favorNeed(
            {
              onDate: world.currentDate,
              people: new Map(
                world.personOrder.map((personId) => [
                  personId,
                  world.people[personId]!,
                ]),
              ),
              campaign: null,
              campaignStatus: null,
              contestStatus: null,
              electionDate: null,
              activeWorkRelationships: activeWorkRelationshipsAt(world, id),
            },
            id,
          ),
        ).toEqual(nativeNeed(world, id));
    },
    30000,
  );
});
