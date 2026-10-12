import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as native from "../../simulation/constitutional-process";
import { constitutionalPosition } from "./constitutional-position";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { addDays } from "../../simulation/dates";
import type { World } from "../../simulation/types";
const provenance = {
  method: "authored-fixture" as const,
  note: "Authored constitutional roll-call edge; not a new actor chooser.",
  sourceEntityIds: [],
};
describe("legislatures: constitutional replay through native public writers", () => {
  it.each(Object.keys(STATES))(
    "matches state and federal constitutional stages in %s",
    (place) => {
      const generated = ensureNationalElectionJurisdiction(
        smallWorld({
          place: `US-${place}`,
          seed: `rules2-leg-constitution:${place}`,
          offices: ["congress", "state-legislature"],
        }).world,
      );
      const date = addDays(generated.currentDate, 300);
      const base = {
        ...generated,
        currentDate: date,
        currentMoment: { ...generated.currentMoment, date },
      };
      for (const federal of [false, true]) {
        const stateKey = `US-${place}` as const,
          profile = native.stateAmendmentProfile(stateKey);
        if (
          !federal &&
          (!profile || !native.ARTICLE_V_STATE_KEYS.includes(stateKey))
        )
          continue;
        let world = native.proposeConstitutionalMeasure(base, {
          stableKey: `rules2:${place}:constitution:${federal}`,
          jurisdictionId: federal
            ? NATIONAL_ELECTION_JURISDICTION.id
            : stateJurisdictionForKey(stateKey)!.id,
          jurisdictionKey: federal ? "US" : stateKey,
          processKind: federal ? "federal-amendment" : "state-amendment",
          designation: "Authored golden amendment",
          shortTitle: "Threshold amendment",
          text: "Authored amendment fixture for native replay.",
          textVersion: "v1",
          sponsoringAuthority: federal ? "Congress" : "State legislature",
          sponsorPersonId: null,
          ratificationMode: federal
            ? "state-legislatures"
            : "statewide-electors",
          deadlineAt: federal ? addDays(base.currentDate, 10) : null,
          delayedOperativeAt: addDays(base.currentDate, 20),
          ruleDelta: {
            kind: "proposal-threshold",
            numerator: 3,
            denominatorParts: 4,
          },
          ordinaryMeasureId: null,
        });
        const measure = world.history.constitutionalMeasures!.at(-1)!;
        const compare = (at: World) => {
          const facts = {
            onDate: at.currentDate,
            measure,
            actions: at.history.constitutionalActions ?? [],
            enactments: at.history.legislativeEnactments ?? [],
            articleVStateKeys: native.ARTICLE_V_STATE_KEYS,
            conventionBodyKey: native.ARTICLE_V_CONVENTION_BODY,
            stateProfile: profile,
          };
          for (const date of [
            at.currentDate,
            addDays(at.currentDate, 11),
            addDays(at.currentDate, 21),
          ])
            for (const cutoff of [
              undefined,
              {
                asOfDate: date,
                historySequenceExclusive: measure.sequence + 1,
              },
            ])
              expect(
                constitutionalPosition(facts, measure.id, date, cutoff),
              ).toEqual(
                native.constitutionalPosition(at, measure.id, date, cutoff),
              );
        };
        compare(world);
        const bodies = federal
          ? [
              { bodyKey: "house", members: 435 },
              { bodyKey: "senate", members: 100 },
            ]
          : profile!.bodies;
        for (const body of bodies) {
          const n = body.members ?? 7,
            rows = Array.from({ length: n }, (_, index) => ({
              memberKey: `fixture:${index}`,
              personId: null,
              disposition: "yea" as const,
            }));
          world = native.recordConstitutionalProposalVote(
            world,
            measure.id,
            body.bodyKey,
            rows,
            n,
            provenance,
          );
          compare(world);
        }
        if (federal) {
          compare({ ...world, currentDate: addDays(world.currentDate, 11) });
          for (const stateKey of native.ARTICLE_V_STATE_KEYS.slice(
            0,
            Math.ceil((native.ARTICLE_V_STATE_KEYS.length * 3) / 4),
          )) {
            world = native.recordArticleVRatification(world, measure.id, {
              kind: "state-ratification",
              stateKey,
              body: "state-legislature",
              approved: true,
              authenticationKey: `fixture:${place}:${stateKey}`,
            });
            compare(world);
          }
        } else {
          world = native.recordStatewideRatification(world, measure.id, {
            kind: "statewide-vote",
            yes: 100,
            no: 50,
            statementFiledAt: world.currentDate,
            electionAt: world.currentDate,
          });
          compare(world);
        }
      }
    },
    30000,
  );
});
