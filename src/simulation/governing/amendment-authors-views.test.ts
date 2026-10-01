import { describe, expect, it } from "vitest";

import { introduceMeasure } from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { defaultOriginChamber } from "../legislature-rules";
import { nextMeasureDesignation } from "../measure-numbering";
import { stateLegislators } from "../nationwide-world/state-legislature-opening";
import { createFormationContext, recordPrinciples } from "../politics";
import { latestPrivateBelief } from "../queries";
import type { EntityId, World } from "../types";
import { SeededRng } from "../rng";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  formAmendmentAuthorsViews,
  planFloorAmendment,
} from "./amendment-authors";
import { seatedChamberForPack } from "./chamber-votes";
import { floorStageTakesAmendments } from "./chamber-procedure";
import {
  ensureOfficeholderPrinciples,
  principleView,
  recordedPrinciplesForPerson,
} from "./officeholder-principles";

/**
 * N2: a legislator weighing an amendment plans from a view saved through the
 * one belief pipeline, never from a fresh reading of their principles. The
 * place is drawn by a named seed among the places whose legislature a new
 * game seats (the same list the watched amendment test draws from).
 */
const SEATED_PLACES = ["nebraska", "alaska", "kentucky"] as const;
const DRAW_SEED = "n2:amendment-views:1";

describe("amendment authors plan from saved views", () => {
  it("forms views only where principles weigh heavily, saves them with traces, and plans only from saved views", () => {
    // Only a chamber whose floor takes amendments; Alaska's pack reads its one
    // floor stage as closed.
    const amendable = SEATED_PLACES.filter((place) => {
      const origin = defaultOriginChamber(legislativeBlueprint(place).pack);
      return origin.floorStages.some((stage) =>
        floorStageTakesAmendments(origin, stage),
      );
    });
    const placeKey =
      amendable[new SeededRng(DRAW_SEED).integer(0, amendable.length)]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `${DRAW_SEED}:${placeKey}`,
        placeKey,
        startAge: 30,
        startingLife: "legislative-office",
      }),
    ).game!;
    const blueprint = legislativeBlueprint(placeKey);
    const pack = blueprint.pack;
    const chamber = defaultOriginChamber(pack);
    const members = stateLegislators(
      game.world,
      `${pack.packId}:candidacy`,
    ).filter(
      (member) =>
        member.officeKey === `${pack.packId}:${chamber.chamberKey}` &&
        member.personId !== game.playerPersonId,
    );
    let world = ensureOfficeholderPrinciples(
      game.world,
      members.map((member) => member.personId),
    );
    const seats = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body.members;
    const question = world.policyCatalog.propositionOrder.find(
      (id) =>
        (world.policyCatalog.propositions[id]!.principles?.length ?? 0) > 0,
    )!;
    world = introduceMeasure(world, {
      stableKey: "n2-amendment-views:bill",
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: pack.packId,
      designation: nextMeasureDesignation(world, {
        jurisdictionId: blueprint.context.jurisdiction.id,
        originChamber: chamber,
      }),
      shortTitle: "A member's bill",
      summary: "A member files a bill on a question they hold a view on.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: members[0]!.personId,
      originChamberKey: chamber.chamberKey,
      propositionIds: [question],
      propositionAnswers: [{ propositionId: question, answer: "yes" }],
    });
    const ask = {
      measureId: world.history.legislativeMeasures!.at(-1)!.id,
      chamber,
      stage: chamber.floorStages.find((stage) =>
        floorStageTakesAmendments(chamber, stage),
      )!,
      members: seats,
      stableKey: "n2-amendment-views:floor",
    };

    const principled = world.policyCatalog.propositionOrder.filter(
      (id) =>
        id !== question &&
        (world.policyCatalog.propositions[id]!.principles?.length ?? 0) > 0,
    );
    const npcIds = seats
      .map((seat) => seat.personId)
      .filter((id): id is EntityId => !!id && id !== game.playerPersonId);
    const strongPairs = (at: World) =>
      npcIds.flatMap((personId) =>
        principled
          .filter((q) => {
            const view = principleView(at, personId, q);
            return view?.salience === "high" || view?.salience === "central";
          })
          .map((q) => `${personId}:${q}`),
      );

    // 1. The world as opened: members form a view wherever their principles
    // weigh heavily, and nowhere else, so a world with none forms none.
    const opened = formAmendmentAuthorsViews(world, ask);
    expect(
      new Set(
        opened.history.privateBeliefs
          .slice(world.history.privateBeliefs.length)
          .map((belief) => `${belief.personId}:${belief.propositionId}`),
      ).size,
      `${placeKey} (${DRAW_SEED})`,
    ).toBeGreaterThanOrEqual(strongPairs(world).length);
    if (strongPairs(world).length === 0)
      expect(opened.history.privateBeliefs).toBe(world.history.privateBeliefs);

    // 2. Five members come to hold, at full strength, every principle another
    // question bears on (authored records, superseding what they held), so
    // their principles weigh heavily on it.
    const heavy = principled.find(
      (q) =>
        (world.policyCatalog.propositions[q]!.principles ?? []).reduce(
          (sum, bearing) => sum + (bearing.weight ?? 1),
          0,
        ) >= 1.5,
    )!;
    const committed = npcIds.slice(0, 5);
    const records = committed.flatMap((personId) =>
      world.policyCatalog.propositions[heavy]!.principles!.map((bearing) => ({
        stableKey: `n2-amendment-views:principle:${personId}:${bearing.principleId}`,
        personId,
        principleId: bearing.principleId,
        formedAt: world.currentDate,
        stance:
          bearing.bearing === "consistent-with"
            ? ("endorses" as const)
            : ("rejects" as const),
        strength: 1,
        conviction: "strong" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("reflection:initial"),
        supersedesPrincipleRecordId:
          [...recordedPrinciplesForPerson(world, personId)]
            .filter((record) => record.principleId === bearing.principleId)
            .sort((a, b) => a.sequence - b.sequence)
            .at(-1)?.id ?? null,
      })),
    );
    const convinced = recordPrinciples(world, records);
    for (const personId of committed)
      expect(principleView(convinced, personId, heavy)?.answer).toBe("yes");

    const before = convinced.history.privateBeliefs.length;
    const formed = formAmendmentAuthorsViews(convinced, ask);
    const added = formed.history.privateBeliefs.slice(before);
    for (const personId of committed)
      expect(
        latestPrivateBelief(formed, personId, heavy)?.position,
        `${placeKey} (${DRAW_SEED}): ${personId} formed no view`,
      ).toBe("support");
    for (const belief of added) {
      // Never the player; each view is the pipeline's, with its trace, and
      // says what the member's recorded principles say.
      expect(belief.personId).not.toBe(game.playerPersonId);
      expect(belief.formation.decisionTraceIds.length).toBeGreaterThan(0);
      const lean = principleView(
        convinced,
        belief.personId,
        belief.propositionId!,
      );
      expect(lean).not.toBeNull();
      expect(belief.position).toBe(
        lean!.answer === "yes" ? "support" : "oppose",
      );
    }
    // Every member whose principles bear on the question now in contention
    // has a saved view on it, as they would weigh it when it is offered.
    for (const personId of npcIds)
      if (principleView(convinced, personId, heavy))
        expect(latestPrivateBelief(formed, personId, heavy)).toBeDefined();
    // A second pass forms nothing: a saved view is kept.
    expect(formAmendmentAuthorsViews(formed, ask).history.privateBeliefs).toBe(
      formed.history.privateBeliefs,
    );
    // Without the saved views, nobody plans from principles alone.
    expect(planFloorAmendment(convinced, ask)).toBeNull();
    // Any plan names a part its author holds a saved view for.
    const plan = planFloorAmendment(formed, ask);
    if (plan)
      expect(
        latestPrivateBelief(
          formed,
          plan.authorPersonId,
          plan.part.propositionId,
        )?.position,
      ).toBe(plan.part.answer === "yes" ? "support" : "oppose");
  }, 300_000);
});
