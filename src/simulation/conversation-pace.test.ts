import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { letAdultTimePass } from "../presentation/adult-life";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { latestPersonalityTendency } from "./queries";
import { ensurePeopleTraitCatalog } from "./people-traits";
import { peopleTraitId, TRAIT_SHAPES } from "./people-trait-definitions";
import { contactBases } from "./people-contact";
import { introductionSpacingDays } from "./social-introductions";
import type { EntityId, World } from "./types";

/**
 * BG-69: conversations were far too rare. A fresh adult life had three or four
 * new people and one or two phone calls in 56 days. Two causes, both measured:
 * a fixed fourteen-day pace for meeting new people regardless of the person,
 * and family with no recorded contact never being the one who rings.
 *
 * The place is drawn from every one of the 56 jurisdictions by the seed; the
 * seed and place are in each failure message.
 */
const SEED = "bg69-conversation-pace-1";

function drawnPlace(seed: string) {
  const states = lifePlaceStateIdentities();
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const state = states[h % states.length]!;
  const places = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  return { state, place: places[(h >>> 3) % places.length]! };
}

function newAdult(seed: string) {
  const { state, place } = drawnPlace(seed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    startAge: 35,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: place.key,
    household: "shares-a-home",
    seed,
  });
  return {
    label: `${state.usps} ${place.key} seed ${seed}`,
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function withSociability(
  world: World,
  personId: EntityId,
  pole: "low" | "high",
): World {
  const catalog = ensurePeopleTraitCatalog(world);
  const prior = latestPersonalityTendency(
    catalog,
    personId,
    peopleTraitId("sociability"),
  );
  return recordPersonalityTendency(catalog, {
    stableKey: `bg69-sociability:${pole}:${personId}`,
    personId,
    tendencyId: peopleTraitId("sociability"),
    recordedAt: world.currentDate,
    expressionKey: TRAIT_SHAPES.sociability[pole].key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["bg69.pace"],
    provenance: createMindProvenance("authored", {
      note: "Authored sociability control for the introduction pace.",
    }),
    supersedesTendencyId: prior?.id ?? null,
  });
}

describe("how often a life starts a conversation (BG-69)", () => {
  it("meets new people sooner when more sociable, on one smooth scale", () => {
    const { world, personId, label } = newAdult(SEED);
    // The player's own mind is only written by the player's choices, so the
    // same scale is checked on somebody else in the life.
    const other = world.personOrder.find((id) => id !== personId)!;
    const reserved = introductionSpacingDays(
      withSociability(world, other, "low"),
      other,
    );
    const outgoing = introductionSpacingDays(
      withSociability(world, other, "high"),
      other,
    );
    expect(outgoing, label).toBeLessThan(reserved);
    // Never the old single fourteen-day pace for everybody.
    expect(reserved, label).toBeLessThan(14);
  });

  it("lets family with no recorded contact be the ones who ring", () => {
    const { world: opened, personId, label } = newAdult(SEED);
    const kinWithoutRecord = contactBases(opened, personId).filter(
      (basis) =>
        basis.basis.includes("family") &&
        !basis.basis.includes("shares your home") &&
        basis.lastContactOn === null,
    );
    // The drawn life must actually have such kin, or the control proves nothing.
    expect(kinWithoutRecord.length, label).toBeGreaterThan(0);
    const kinIds = new Set(kinWithoutRecord.map((basis) => basis.personId));
    const start = opened.history.events.length;
    let world = opened;
    for (let day = 0; day < 56; day += 1) world = letAdultTimePass(world, 1);
    const proposals = world.history.events
      .slice(start)
      .filter(
        (event) =>
          event.type === "life.meeting-proposed" &&
          event.involvedEntityIds.includes(personId),
      );
    const fromKin = proposals.filter((event) =>
      event.participants.some(
        (entry) => entry.role === "agency:asked" && kinIds.has(entry.personId),
      ),
    );
    expect(fromKin.length, label).toBeGreaterThan(0);
    // Their reason does not claim a long gap nobody recorded.
    for (const event of fromKin) {
      expect(event.summary, label).not.toContain("after a long while");
    }
    // More than the two calls the old 45-day pace allowed in 56 days.
    expect(proposals.length, label).toBeGreaterThan(2);
  });
});
