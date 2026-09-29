import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import {
  answerFavorAsk,
  FAVOR_ASK_SPACING_DAYS,
  favorAsksOf,
  favorNeed,
  heardOfRefusalConsiderations,
  openFavorAsk,
  peopleTheyTalkTo,
  produceFavorCollection,
  WORD_OF_MOUTH_LISTENERS,
} from "./favor-collection";
import {
  addDays,
  assessUndertaking,
  feltDebtConsiderations,
  recordFavor,
  recordWorldEvent,
  undertakingsHeldBy,
} from "./index";
import type { EntityId, FavorMotive, FavorWeight, World } from "./types";

/**
 * Build 22, step 5: somebody who once helped, who still expects something
 * back and who needs something real, may come to ask; the answer is kept on
 * record and a yes is judged later like any other promise.
 */

function helped(
  seed: string,
  motive: FavorMotive,
  weight: FavorWeight = "moderate",
): { world: World; helper: EntityId; player: EntityId } {
  const base = createDemoWorld(seed);
  const player = base.personOrder[0]!;
  // The third person in the demo town is 28 and out of work.
  const helper = base.personOrder[2]!;
  const spoken = recordWorldEvent(base, {
    stableKey: `${seed}:help`,
    type: "life.conversation",
    occurredAt: base.currentDate,
    recordedAt: base.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [helper, player],
    participants: [
      { personId: helper, role: "focus:subject", detail: "Helped" },
      { personId: player, role: "presence:participant", detail: "Was helped" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["favor-collection-test"],
    summary: "They helped with the move.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const world = recordFavor(spoken, {
    stableKey: `${seed}:favor`,
    giverPersonId: helper,
    receiverPersonId: player,
    kind: "personal:help",
    description: "helped with the move",
    givenAt: spoken.currentDate,
    eventId: spoken.history.events.at(-1)!.id,
    subject: { kind: "none" },
    motive,
    weight,
    audience: "private",
    witnessPersonIds: [],
    inReturnForFavorId: null,
    undertakingId: null,
  });
  return { world, helper, player };
}

function later(world: World, days: number): World {
  const date = addDays(world.currentDate, days);
  return {
    ...world,
    currentDate: date,
    currentMoment: { ...world.currentMoment, date },
  };
}

/** Tries several demo towns so the test does not rest on one draw. */
function firstAsk(motive: FavorMotive, weight: FavorWeight = "moderate") {
  for (let index = 0; index < 8; index += 1) {
    const setup = helped(`favor-collect-${index}`, motive, weight);
    const asked = produceFavorCollection(later(setup.world, 1), setup.player);
    const ask = openFavorAsk(asked, setup.player);
    if (ask) return { ...setup, world: asked, ask };
  }
  return null;
}

describe("People come to collect", () => {
  it("reads a need only from the helper's own record", () => {
    const { world, helper, player } = helped("favor-need", "trade");
    expect(favorNeed(world, helper)).toMatchObject({ kind: "work" });
    // The player has a job and runs no campaign, so needs nothing.
    expect(favorNeed(world, player)).toBeNull();
  });

  it("lets a helper who expects something and needs work ask for it back", () => {
    const found = firstAsk("trade");
    expect(found).not.toBeNull();
    const { world, helper, player, ask } = found!;
    expect(ask).toMatchObject({
      askerPersonId: helper,
      askedPersonId: player,
      need: "work",
      needWords: "finding work",
      answer: null,
      open: true,
    });
    expect(world.history.events.at(-1)!.summary).toContain(
      "remembering the time they helped with the move",
    );
    // One ask at a time, and not again soon after.
    expect(produceFavorCollection(world, player)).toBe(world);
    const answered = answerFavorAsk(world, ask.eventId, "not-now");
    expect(
      produceFavorCollection(
        later(answered, FAVOR_ASK_SPACING_DAYS - 1),
        player,
      ),
    ).toEqual(later(answered, FAVOR_ASK_SPACING_DAYS - 1));
  });

  it("never has somebody who helped out of kindness come to collect", () => {
    for (let index = 0; index < 8; index += 1) {
      const { world, player } = helped(`favor-kind-${index}`, "kindness");
      const next = produceFavorCollection(later(world, 1), player);
      expect(favorAsksOf(next, player)).toEqual([]);
    }
  });

  it("makes a yes the player's promise to return the favor, kept by returning it", () => {
    const { world, helper, player, ask } = firstAsk("trade")!;
    const answered = answerFavorAsk(world, ask.eventId, "help");
    expect(favorAsksOf(answered, player).at(-1)!.answer).toBe("help");
    expect(openFavorAsk(answered, player)).toBeNull();
    const promise = undertakingsHeldBy(answered, player).find(
      (entry) => entry.source.store === "lifeCommitments",
    )!;
    expect(promise).toMatchObject({
      owedToPersonIds: [helper],
      statement: "Said they would help with finding work.",
      mattered: "moderate",
    });
    expect(assessUndertaking(answered, promise).standing).toBe("outstanding");

    const commitment = answered.history.lifeCommitments.at(-1)!;
    const returned = recordFavor(answered, {
      stableKey: "favor-collect:returned",
      giverPersonId: player,
      receiverPersonId: helper,
      kind: "personal:help",
      description: "put in a word at work for them",
      givenAt: answered.currentDate,
      eventId: answered.history.events.at(-1)!.id,
      subject: { kind: "none" },
      motive: "trade",
      weight: "moderate",
      audience: "private",
      witnessPersonIds: [],
      inReturnForFavorId: ask.favorId,
      undertakingId: commitment.id,
    });
    expect(assessUndertaking(returned, promise)).toMatchObject({
      standing: "kept",
      account: "They returned it: put in a word at work for them.",
    });
    expect(() => answerFavorAsk(returned, ask.eventId, "refuse")).toThrow(
      "already been answered",
    );
  });

  it("strains things between them when the player says no", () => {
    const { world, helper, player, ask } = firstAsk("trade")!;
    const refused = answerFavorAsk(world, ask.eventId, "refuse");
    const strain = refused.history.relationshipInteractions.find(
      (interaction) => interaction.kind === "conflict:favor-refused",
    )!;
    expect(strain).toMatchObject({ change: "strained" });
    expect([...strain.personIds].sort()).toEqual([helper, player].sort());
    expect(
      undertakingsHeldBy(refused, player).filter(
        (entry) => entry.source.store === "lifeCommitments",
      ),
    ).toEqual([]);
  });

  it("lets an unanswered ask pass after a week", () => {
    const { world, player, ask } = firstAsk("trade")!;
    const passed = later(world, 8);
    expect(openFavorAsk(passed, player)).toBeNull();
    expect(() => answerFavorAsk(passed, ask.eventId, "help")).toThrow(
      "That ask has passed.",
    );
  });

  it("takes something smaller as a hedged promise worth one size less", () => {
    const { world, helper, player, ask } = firstAsk("trade")!;
    const offered = answerFavorAsk(world, ask.eventId, "offer-less");
    const promise = undertakingsHeldBy(offered, player).find(
      (entry) => entry.source.store === "lifeCommitments",
    )!;
    expect(promise).toMatchObject({
      owedToPersonIds: [helper],
      firmness: "qualified",
      mattered: "slight",
      statement: "Said they could help a little with finding work.",
    });
  });
});

describe("What the person asked still feels they owe", () => {
  it("is a reason to say yes while it lasts, and none once it has faded", () => {
    const { world, helper, player } = helped("felt-debt", "trade", "slight");
    const now = feltDebtConsiderations(world, player, helper, "ask", "accept");
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({
      optionKey: "accept",
      sourceType: "social:favor",
      importance: "slight",
      explanation:
        "The one asking once helped with the move, and it still feels owed.",
    });
    // Nothing is owed the other way.
    expect(
      feltDebtConsiderations(world, helper, player, "ask", "accept"),
    ).toEqual([]);
    expect(
      feltDebtConsiderations(
        later(world, 365),
        player,
        helper,
        "ask",
        "accept",
      ),
    ).toEqual([]);
  });

  it("lets the one turned down decide to tell the people they talk to", () => {
    let told = 0;
    let kept = 0;
    for (let index = 0; index < 8; index += 1) {
      const setup = helped(`favor-word-${index}`, "trade", "great");
      const asked = produceFavorCollection(later(setup.world, 1), setup.player);
      const ask = openFavorAsk(asked, setup.player);
      if (!ask) continue;
      const refused = answerFavorAsk(asked, ask.eventId, "refuse");
      const answerEvent = refused.history.events.find(
        (event) =>
          event.type === "favor.ask-answered" &&
          event.tags.includes(`favor.ask:${ask.eventId}`),
      )!;
      const heard = refused.history.knowledge.filter(
        (record) => record.eventId === answerEvent.id,
      );
      const circle = peopleTheyTalkTo(refused, setup.helper).filter(
        (id) => id !== setup.player,
      );
      if (heard.length === 0) {
        // Keeping it to themselves is their own choice, and leaves nobody
        // holding it against the player.
        kept += 1;
        continue;
      }
      told += 1;
      const claim = refused.history.claims.at(-1)!;
      expect(claim).toMatchObject({
        speakerPersonId: setup.helper,
        eventId: answerEvent.id,
        audience: "limited",
      });
      expect(heard.length).toBeLessThanOrEqual(WORD_OF_MOUTH_LISTENERS);
      for (const record of heard) {
        expect(record.personId).not.toBe(setup.player);
        expect(circle).toContain(record.personId);
        expect(record).toMatchObject({
          confidence: "medium",
          source: {
            kind: "told-by",
            sourcePersonId: setup.helper,
            claimId: claim.id,
          },
        });
        const reason = heardOfRefusalConsiderations(
          refused,
          record.personId,
          setup.player,
          "test",
          "accept",
        );
        expect(reason).toHaveLength(1);
        expect(reason[0]).toMatchObject({
          direction: "opposes",
          importance: "slight",
        });
        expect(reason[0]!.explanation).toMatch(
          /^They heard that .+ would not help /,
        );
      }
      const stranger = refused.personOrder.find(
        (id) =>
          id !== setup.player &&
          id !== setup.helper &&
          !heard.some((record) => record.personId === id),
      )!;
      expect(
        heardOfRefusalConsiderations(refused, stranger, setup.player, "t", "a"),
      ).toEqual([]);
    }
    expect(told, `told in ${told}, kept quiet in ${kept}`).toBeGreaterThan(0);
  });
});
