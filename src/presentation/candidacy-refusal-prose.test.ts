import { describe, expect, it } from "vitest";

import {
  GAME_ADULT_CANDIDACY_AGE,
  advanceWorld,
  ageOnDate,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  createScenarioWorld,
  lifePlaces,
} from "../simulation";
import { resolvePlayerCapabilities } from "./player-capabilities";
import type { World } from "../simulation";

/**
 * A character who cannot stand for office is told why, not which statute.
 *
 * The sentence that explains it is the one on screen: a candidacy block's
 * reason becomes the withheld reason for the campaign surface, which
 * `PlayerGame` renders into the `no-campaign` note. Several of those sentences
 * used to open with the chapter and section the rule was read from, which is
 * provenance and belongs on the record beside them rather than in front of the
 * player.
 *
 * The sweep runs over every state that has a candidacy pack and over dates on
 * both sides of when the rules were read, because the sentences that quoted a
 * statute hardest were the ones about not knowing — a rule whose commencement
 * is later than the date being asked about. A sweep that only asked about
 * today would never reach them.
 *
 * What it deliberately cannot reach: `NEVADA_RULE_PACK.unresolvedGaps` in
 * `legislature-rule-packs.ts`, which keeps its citations on purpose. That is
 * research for whoever reads the authorities next, and only the diagnostics
 * gate renders it — but its entries read almost identically to the seat-count
 * notes in the same file, which do reach a player. One lane rewrote an entry,
 * broke `legislature-rule-packs-matrix.test.ts`, and reverted. This sweep runs
 * `candidacyEligibility` → `resolvePlayerCapabilities` → the withheld reason
 * and never touches that file, so it cannot make that mistake; a sweep that
 * does reach it has to tell the two apart before asserting anything.
 */

const CITATION_SHAPE = /Const\.|art\.|§|Stat\.|Rev\.|Ann\.|U\.S\.C\.|http/;

function scenarioAt(
  place: ReturnType<typeof lifePlaces>[number],
  days: number,
) {
  const created = createScenarioWorld(
    `candidacy-prose-${place.stateJurisdictionKey}-${days}`,
    place.context,
    { peopleCount: 4 },
  );
  const scenario = days === 0 ? created : advanceWorld(created, days);
  const personId = scenario.personOrder.find(
    (candidate) =>
      ageOnDate(scenario.people[candidate]!.birthDate, scenario.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  );
  if (!personId) return null;
  const world: World = {
    ...scenario,
    control: { kind: "person", personId },
  };
  return { world, personId };
}

describe("a refusal to put someone on a ballot is written for a player", () => {
  it("quotes no statute in any candidacy block, in any state, before or after the rules were read", () => {
    const states = lifePlaces().filter((place) => place.scope === "state");
    expect(states.length).toBeGreaterThan(1);

    const sentences: { where: string; reason: string }[] = [];
    let blocksReached = 0;

    for (const place of states) {
      // Day zero sits before the date several sourced rules were read on,
      // which is what reaches the "cannot say what applied then" sentences.
      // The later date reaches the ordinary refusals.
      for (const days of [0, 400]) {
        const built = scenarioAt(place, days);
        if (!built) continue;
        const pack = candidacyPackForJurisdiction(
          built.world.people[built.personId]!.homeJurisdictionId,
        );
        for (const option of pack?.offices ?? [{ officeKey: "" }]) {
          const eligibility = candidacyEligibility(built.world, {
            personId: built.personId,
            jurisdictionId:
              built.world.people[built.personId]!.homeJurisdictionId,
            officeKey: option.officeKey,
            alreadyACandidate: false,
          });
          for (const block of eligibility.blocks) {
            blocksReached += 1;
            sentences.push({
              where: `${place.stateJurisdictionKey}/+${days}d/${option.officeKey}/${block.kind}`,
              reason: block.reason,
            });
          }
        }

        // The sentence as the player actually meets it, one step further on.
        for (const withheld of resolvePlayerCapabilities(built.world)
          .withheld) {
          sentences.push({
            where: `${place.stateJurisdictionKey}/+${days}d/withheld:${withheld.surface}`,
            reason: withheld.reason,
          });
        }
      }
    }

    /*
     * The teeth. An earlier sweep in this repository passed against an unfixed
     * file because its fixture reached no rule at all, so this one refuses to
     * be green on an empty sample.
     */
    expect(blocksReached).toBeGreaterThan(0);
    expect(sentences.length).toBeGreaterThan(10);

    const offending = sentences.filter((entry) =>
      CITATION_SHAPE.test(entry.reason),
    );
    expect(offending).toEqual([]);
  });

  it("still records the citation on the assessments behind those sentences", () => {
    // The over-correction guard. The provenance has to survive the prose fix,
    // or the sentence stops being checkable by a person later.
    const states = lifePlaces().filter((place) => place.scope === "state");
    let cited = 0;
    for (const place of states) {
      const built = scenarioAt(place, 400);
      if (!built) continue;
      const pack = candidacyPackForJurisdiction(
        built.world.people[built.personId]!.homeJurisdictionId,
      );
      for (const option of pack?.offices ?? [{ officeKey: "" }]) {
        const eligibility = candidacyEligibility(built.world, {
          personId: built.personId,
          jurisdictionId:
            built.world.people[built.personId]!.homeJurisdictionId,
          officeKey: option.officeKey,
          alreadyACandidate: false,
        });
        for (const assessment of eligibility.qualificationAssessments) {
          const citation = assessment.source?.citation;
          if (citation === undefined || citation === null) continue;
          cited += 1;
          expect(citation.trim().length).toBeGreaterThan(0);
        }
      }
    }
    expect(cited).toBeGreaterThan(0);
  });
});
