import { describe, expect, it } from "vitest";

import { lawInForce } from "../simulation/governing/law-in-force";
import { PROSECUTION_SENTENCED_EVENT } from "../simulation/justice/jail-terms";
import { applySentencingLawLandings } from "../simulation/law-consequences/modules/justice-sentencing-landings";
import { lawExposuresOf } from "../simulation/law-exposure";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { enactLawFixture } from "./enact-law-fixture";
import { lawExposureSentence } from "./law-exposure-lines";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

const QUESTION_KEY =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const BASE_SEED = "team9-pretrial-stamp-20260930-five";

/**
 * A mandatory-minimum law, enacted in a random state of the 56 places, binds
 * the judge in a violent case; the sentence the court then saves lands the law
 * on the named defendant, and a sentence the law in force did not bind writes nothing.
 */
describe("a mandatory minimum reaches the defendant it binds", () => {
  const rng = new SeededRng(BASE_SEED);
  // A random state of the 56, drawn by seed.
  const state = pickDistinct(rng, lifePlaceStateIdentities(), 5)[0]!;
  const SEED = `${BASE_SEED}:${state.jurisdictionKey}`;
  const towns = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  const town = towns.length
    ? rng.pick(towns)
    : searchLifePlaces("", 5, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "state",
      })[0]!;

  function sentenced(): {
    world: World;
    personId: EntityId;
    sentenceId: EntityId;
    measureId: EntityId;
  } {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: town.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    const opened = { world: game.world, anchorPersonId: game.playerPersonId };
    const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
    const enacted = enactLawFixture(
      opened.world,
      jurisdiction.id,
      null,
      QUESTION_KEY,
      "yes",
    );
    const personId = opened.anchorPersonId;
    // The court's saved sentence, written through the canonical event
    // writer; the prosecution route that saves it is covered by its own
    // tests, and the judge's decision is not under test here.
    const written = recordWorldEvent(enacted, {
      stableKey: "lw17b:sentenced",
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: enacted.currentDate,
      recordedAt: enacted.currentDate,
      jurisdictionId: enacted.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:defendant", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      tags: ["justice.offense:crime:robbery"],
      summary: "A jail sentence.",
      context: {
        location: null,
        socialContext: "Criminal case",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sentence = written.history.events.at(-1)!;
    const proposition = Object.values(written.policyCatalog.propositions).find(
      (row) => row.stableKey === QUESTION_KEY,
    )!;
    const law = lawInForce(written, sentence.jurisdictionId!, proposition.id)!;
    return {
      world: written,
      personId,
      sentenceId: sentence.id,
      measureId: law.measureId,
    };
  }

  it(`lands a bound jail sentence on the defendant and survives save/continue (${state.jurisdictionKey}, seed ${SEED})`, () => {
    const { world, personId, sentenceId, measureId } = sentenced();
    const landed = applySentencingLawLandings(world, sentenceId, measureId);
    const exposures = lawExposuresOf(landed, personId).filter(
      (row) => row.channel === "sentence-rule",
    );
    expect(exposures).toMatchObject([
      {
        measureId,
        direction: "cost",
        relation: "own",
        sourceRecordId: sentenceId,
      },
    ]);
    expect(lawExposureSentence(landed, personId, exposures[0]!)).toMatch(
      /law set a jail term for you that the judge could not go below\.$/,
    );
    expect(applySentencingLawLandings(landed, sentenceId, measureId)).toBe(
      landed,
    );
    const restored = deserializeWorld(serializeWorld(landed));
    expect(
      lawExposuresOf(restored, personId).filter(
        (row) => row.channel === "sentence-rule",
      ),
    ).toEqual(exposures);
  }, 600_000);

  it("writes nothing when the sentence was not bound by the law in force", () => {
    const { world, personId, sentenceId } = sentenced();
    const other = applySentencingLawLandings(
      world,
      sentenceId,
      "measure:not-in-force" as EntityId,
    );
    expect(other).toBe(world);
    expect(lawExposuresOf(world, personId)).toEqual([]);
  }, 600_000);
});
