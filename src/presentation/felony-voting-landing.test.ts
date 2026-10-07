import { describe, expect, it } from "vitest";

import { lawInForce } from "../simulation/governing/law-in-force";
import { PROSECUTION_SENTENCED_EVENT } from "../simulation/justice/jail-terms";
import { applyVotingRightLanding } from "../simulation/law-consequences/modules/justice-sentencing-landings";
import {
  recordVotingRightForSentence,
  votingStandingOn,
} from "../simulation/justice/voting-standing";
import { addDays } from "../simulation/dates";
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
  "us-policy-positions:justice-public-safety.restore-voting-after-sentence";
const BASE_SEED = "lw18-voting-20261006";

/**
 * A mandatory-minimum law, enacted in a random state of the 56 places, binds
 * the judge in a violent case; the sentence the court then saves lands the law
 * on the named defendant, and a sentence the law in force did not bind writes nothing.
 */

/**
 * A felony jail sentence suspends the defendant's vote; the state's restore-
 * voting law in force (the starting law, or one enacted in play) decides
 * whether it returns when the sentence ends, and lands on the named person.
 */
describe("a felony sentence puts the state's restore-voting law on the defendant", () => {
  const rng = new SeededRng(BASE_SEED);
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

  function open(): { world: World; personId: EntityId } {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: town.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    return { world: game.world, personId: game.playerPersonId };
  }

  function sentence(
    world: World,
    personId: EntityId,
    months: number,
    key: string,
  ): { world: World; id: EntityId } {
    const written = recordWorldEvent(world, {
      stableKey: key,
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: stateJurisdictionForKey(state.jurisdictionKey)!.id,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:defendant", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "justice.sentence:jail",
        `justice.sentence-months:${months}`,
        "justice.offense:crime:robbery",
      ],
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
    return { world: written, id: written.history.events.at(-1)!.id };
  }

  const stateLaw = (world: World) => {
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === QUESTION_KEY,
    )!;
    return lawInForce(
      world,
      stateJurisdictionForKey(state.jurisdictionKey)!.id,
      proposition.id,
    )!;
  };

  it(`suspends the vote, lands the law and returns or withholds it by the law in force (${state.jurisdictionKey}, seed ${SEED})`, () => {
    const { world, personId } = open();
    const long = sentence(world, personId, 36, "lw18:felony");
    const recorded = recordVotingRightForSentence(long.world, long.id);
    const vote = recorded.history.events.at(-1)!;
    expect(vote.type).toBe("justice.voting-right-set");
    expect(recordVotingRightForSentence(recorded, long.id)).toBe(recorded);
    const landed = applyVotingRightLanding(recorded, vote.id);
    const law = stateLaw(landed);
    const exposures = lawExposuresOf(landed, personId).filter(
      (row) => row.channel === "voting-rule",
    );
    expect(exposures).toMatchObject([
      {
        measureId: law.measureId,
        direction: law.answer === "yes" ? "gain" : "cost",
        sourceRecordId: vote.id,
      },
    ]);
    expect(lawExposureSentence(landed, personId, exposures[0]!)).toMatch(
      law.answer === "yes"
        ? /law gave you the vote back when the sentence ended\.$/
        : /law kept you from voting after the sentence ended\.$/,
    );
    expect(votingStandingOn(landed, personId).standing).toBe(
      "suspended-serving",
    );
    const after = addDays(landed.currentDate, 36 * 31 + 1);
    expect(votingStandingOn(landed, personId, after).standing).toBe(
      law.answer === "yes" ? "restored" : "withheld-after-sentence",
    );
    const restored = deserializeWorld(serializeWorld(landed));
    expect(
      lawExposuresOf(restored, personId).filter(
        (row) => row.channel === "voting-rule",
      ),
    ).toEqual(exposures);
    expect(votingStandingOn(restored, personId, after).standing).toBe(
      votingStandingOn(landed, personId, after).standing,
    );
  }, 600_000);

  it("changes who gets the vote back when the state enacts the opposite law", () => {
    const { world, personId } = open();
    const before = stateLaw(world).answer;
    const flipped = before === "yes" ? "no" : "yes";
    const enacted = enactLawFixture(
      world,
      stateJurisdictionForKey(state.jurisdictionKey)!.id,
      null,
      QUESTION_KEY,
      flipped,
    );
    const long = sentence(enacted, personId, 36, "lw18:felony-after-enactment");
    const after = addDays(long.world.currentDate, 36 * 31 + 1);
    expect(votingStandingOn(long.world, personId, after).standing).toBe(
      flipped === "yes" ? "restored" : "withheld-after-sentence",
    );
  }, 600_000);

  it("writes nothing for a misdemeanor-length sentence", () => {
    const { world, personId } = open();
    const short = sentence(world, personId, 6, "lw18:misdemeanor");
    expect(recordVotingRightForSentence(short.world, short.id)).toBe(
      short.world,
    );
    expect(votingStandingOn(short.world, personId).standing).toBe("votes");
  }, 600_000);
});
