import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { decidePromiseRenegotiation } from "./people-promise";
import { PEOPLE_TRAITS, recordTraitChange } from "./people-traits";
import type { PeopleTrait, TraitValue } from "./people-trait-definitions";
import type { EntityId, World } from "./types";

/**
 * The deliberation trait, read at the surface a player actually meets.
 *
 * Its poles were inverted against every one of its nine consumers, so the
 * person the game labelled "Acts on impulse" was the one who insisted on an
 * answer before agreeing to anything. That is the same fault as Q47-004,
 * which was found and fixed for `reliability` and left standing here.
 *
 * The test sits at `decidePromiseRenegotiation` rather than at the trait
 * table on purpose. A table test would have passed happily through the whole
 * inversion, because each half was self-consistent; only the outcome shows
 * it. Q47-004 recurred because nothing watched the outcome.
 *
 * Both arms leave every other trait balanced so that exactly one trait is
 * arguing. A single trait at a pole contributes four points and the rest
 * contribute nothing, which is outside the close-choice window, so neither
 * arm depends on the tie-breaking jitter.
 */
describe("a promise renegotiation reads deliberation the way its own words read", () => {
  /**
   * Five worlds rather than one. A single consideration at full strength and
   * nothing else standing against it decides on its own; with nothing at all
   * standing, every option ties and the seeded jitter picks. One world could
   * therefore pass through the inversion by luck of the draw, and across five
   * seeds it cannot.
   */
  const seeds = ["a", "b", "c", "d", "e"].map((suffix) => {
    const life = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `deliberation-poles-${suffix}`,
        startAge: 34,
      }),
    ).game!;
    const player = life.playerPersonId;
    const counterpart = life.world.personOrder.find(
      (id) =>
        id !== player &&
        life.world.history.events.some((event) =>
          event.involvedEntityIds.includes(id),
        ),
    )!;
    const requestEventId = [...life.world.history.events]
      .reverse()
      .find((event) => event.involvedEntityIds.includes(counterpart))!.id;
    return { world: life.world, player, counterpart, requestEventId };
  });

  function temperament(
    world: World,
    personId: EntityId,
    eventId: EntityId,
    values: Partial<Record<PeopleTrait, TraitValue>>,
  ): World {
    let next = world;
    for (const trait of PEOPLE_TRAITS) {
      next = recordTraitChange(next, {
        personId,
        trait,
        value: values[trait] ?? 0,
        eventId,
        reason: "Set for this test, so one trait argues at a time.",
      });
    }
    return next;
  }

  function answerIn(
    seed: (typeof seeds)[number],
    values: Partial<Record<PeopleTrait, TraitValue>>,
  ): string {
    const world = temperament(
      seed.world,
      seed.counterpart,
      seed.requestEventId,
      values,
    );
    return decidePromiseRenegotiation(world, {
      personId: seed.player,
      counterpartPersonId: seed.counterpart,
      requestEventId: seed.requestEventId,
      revisionId: "more-time",
    }).outcome;
  }

  it("somebody who thinks things through wants an answer before agreeing", () => {
    expect(seeds.map((seed) => answerIn(seed, { deliberation: -2 }))).toEqual(
      seeds.map(() => "needs-answer"),
    );
  });

  it("somebody who acts on impulse is not the one asking to leave it open", () => {
    // Impulsiveness argues for no option here, so the only trait with
    // anything to say is the dependable one, and it says hold the
    // arrangement. Before the fix this was a tie, because impulsiveness was
    // the thing asking for an answer first.
    expect(
      seeds.map((seed) => answerIn(seed, { deliberation: 2, reliability: 2 })),
    ).toEqual(seeds.map(() => "holds-boundary"));
  });
});
