import { mostLeanYes, mostLeanNo } from "./article-v-leaning";
import { ARTICLE_V_STATE_KEYS } from "../../simulation/constitutional-process";
import {
  stateVoice,
  CONVENTION_APPLICATION_EVENT,
  CONVENTION_RESCISSION_EVENT,
} from "../../simulation/governing/article-v";
import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  recordPrinciples,
  createFormationContext,
} from "../../simulation/politics";
import { ensureOfficeholderPrinciples } from "../../simulation/governing/officeholder-principles";
import {
  congressVoters,
  articleVReviewHandler,
  ARTICLE_V_REVIEW,
} from "../../simulation/governing/article-v";
import * as writer from "../../simulation/governing/constitutional-amendments";
import { scheduleFutureDueItem } from "../../simulation/future-transitions";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { congressRoute, type CongressRouteFacts } from "./congress-route";
import type { World } from "../../simulation/types";
describe("legislatures: Article V routing through the native review caller", () => {
  it.each(Object.keys(STATES))(
    "matches the public caller’s positive proposal request in %s",
    (place) => {
      let world = ensureNationalElectionJurisdiction(
        smallWorld({
          place: `US-${place}`,
          seed: `rules2-leg-route:${place}`,
          offices: ["congress"],
        }).world,
      );
      world = { ...world, control: { kind: "observer" } };
      const voters = [
        ...congressVoters(world, "house"),
        ...congressVoters(world, "senate"),
      ];
      world = ensureOfficeholderPrinciples(
        world,
        voters.map((row) => row.personId),
      );
      const question = world.policyCatalog.propositionOrder
        .map((id) => world.policyCatalog.propositions[id]!)
        .find(
          (row) =>
            row.principles?.length &&
            world.policyCatalog.issues[row.issueId]?.levels?.includes(
              "federal",
            ),
        )!;
      // Labeled belief control creates support through the existing principle writer.
      world = recordPrinciples(
        world,
        voters.flatMap((voter) =>
          question.principles!.map((bearing) => ({
            stableKey: `rules2:${place}:route:${voter.personId}:${bearing.principleId}`,
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
              note: "Authored support edge for native routing equivalence.",
            }),
            supersedesPrincipleRecordId:
              [...world.history.principles]
                .reverse()
                .find(
                  (row) =>
                    row.personId === voter.personId &&
                    row.principleId === bearing.principleId,
                )?.id ?? null,
          })),
        ),
      );
      const year = Number(world.currentDate.slice(0, 4));
      world = scheduleFutureDueItem(world, {
        stableKey: `article-v/v1:US:${year}:review`,
        dueAt: world.currentDate,
        transitionKey: ARTICLE_V_REVIEW,
        entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        provenance: { kind: "authored", note: "Authored review trigger." },
      });
      const requests: {
        world: World;
        input: Parameters<typeof writer.proposeAndVoteAmendment>[1];
      }[] = [];
      // A writer-boundary golden: the native caller computes the request; no
      // assertion below claims this stub produced an ordinary constitutional event.
      const capture = vi
        .spyOn(writer, "proposeAndVoteAmendment")
        .mockImplementation((at, input) => {
          requests.push({ world: at, input });
          return at;
        });
      try {
        const reviewed = articleVReviewHandler(
          world,
          world.history.futureDueItems.at(-1)!,
        ).world;
        const leaningFacts = {
          onDate: reviewed.currentDate,
          policyCatalog: reviewed.policyCatalog,
          principles: reviewed.history.principles,
          playerPersonId: null,
        };
        for (const state of ARTICLE_V_STATE_KEYS) {
          const voice = stateVoice(reviewed, state.slice(3));
          expect(
            reviewed.history.events.some(
              (event) =>
                event.type === CONVENTION_APPLICATION_EVENT &&
                event.tags.includes(`state:${state}`) &&
                event.tags.includes(`proposition:${question.id}`),
            ),
          ).toBe(mostLeanYes(leaningFacts, voice.personIds, question.id));
        }
        // Supersede the same native records with the opposing stance. The
        // unchanged review caller now reaches private mostLeanNo to rescind.
        const opposed = recordPrinciples(
          reviewed,
          voters.flatMap((voter) =>
            question.principles!.map((bearing) => ({
              stableKey: `rules2:${place}:rescind:${voter.personId}:${bearing.principleId}`,
              personId: voter.personId,
              principleId: bearing.principleId,
              formedAt: reviewed.currentDate,
              stance:
                bearing.bearing === "consistent-with"
                  ? ("rejects" as const)
                  : ("endorses" as const),
              strength: 1,
              conviction: "settled" as const,
              flexibility: "firm" as const,
              qualification: null,
              formation: createFormationContext("experience:life", {
                note: "Authored opposition/rescission edge.",
              }),
              supersedesPrincipleRecordId:
                [...reviewed.history.principles]
                  .reverse()
                  .find(
                    (row) =>
                      row.personId === voter.personId &&
                      row.principleId === bearing.principleId,
                  )?.id ?? null,
            })),
          ),
        );
        const rescinded = articleVReviewHandler(
          opposed,
          world.history.futureDueItems.at(-1)!,
        ).world;
        for (const state of ARTICLE_V_STATE_KEYS) {
          const voice = stateVoice(rescinded, state.slice(3));
          expect(
            rescinded.history.events.some(
              (event) =>
                event.type === CONVENTION_RESCISSION_EVENT &&
                event.tags.includes(`state:${state}`) &&
                event.tags.includes(`proposition:${question.id}`),
            ),
          ).toBe(
            mostLeanNo(
              { ...leaningFacts, principles: rescinded.history.principles },
              voice.personIds,
              question.id,
            ),
          );
        }
        expect(requests.length).toBeGreaterThan(0);
        const request = requests.find((row) =>
          row.input.proposal.stableKey.endsWith(":congress"),
        )!;
        expect(request).toBeDefined();
        const at = request.world;
        const facts: CongressRouteFacts = {
          onDate: at.currentDate,
          policyCatalog: at.policyCatalog,
          principles: at.history.principles,
          playerPersonId: null,
          measures: at.history.constitutionalMeasures ?? [],
          positions: new Map(),
          actions: at.history.constitutionalActions ?? [],
          federalJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          house: congressVoters(at, "house"),
          senate: congressVoters(at, "senate"),
          ballots: new Map(),
        };
        const plan = congressRoute(facts, year);
        expect(plan.kind).toBe("applied");
        const command = plan.commands![0]!;
        expect(command.command).toBe("proposeAndVoteAmendment");
        const input = command.input as {
          proposal: typeof request.input.proposal;
          stateSchedule: typeof request.input.stateSchedule;
          proposalBodies: unknown;
        };
        expect(input.proposal).toEqual(request.input.proposal);
        expect(input.stateSchedule).toEqual(request.input.stateSchedule);
        expect(input.proposalBodies).toEqual([
          { bodyKey: "house", voters: facts.house },
          { bodyKey: "senate", voters: facts.senate },
        ]);
      } finally {
        capture.mockRestore();
      }
    },
    30000,
  );
});
