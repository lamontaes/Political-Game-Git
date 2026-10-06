import { expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { applyLawConsequences } from "../enacted-law-effects";
import { lawInForce } from "../governing/law-in-force";
import { householdMembershipsAt } from "../life-queries";
import { loadedPolicyRegistry } from "../policy-pack-registry";
import { personName } from "../people";
import { INFRASTRUCTURE_EXPOSURE_ROWS } from "./infrastructure-exposure-rows";

const QUESTION =
  "us-policy-positions:transportation-infrastructure.public-broadband";

it("admits WHO / WHAT / HOW MUCH rows for all three LW-22 laws", () => {
  const registry = loadedPolicyRegistry();
  expect(Object.keys(INFRASTRUCTURE_EXPOSURE_ROWS)).toHaveLength(3);
  for (const [questionKey, row] of Object.entries(
    INFRASTRUCTURE_EXPOSURE_ROWS,
  )) {
    const proposition = registry.propositions.find(
      (entry) => entry.stableKey === questionKey,
    );
    expect(proposition?.consequences).toContainEqual(row);
    expect(row.who.selector).toBe("infrastructure.recorded-residents");
    expect(row.what).toMatch(/^record-/);
    expect(row.amount).toMatchObject({
      op: "constant",
      value: 1,
      unit: "count",
    });
  }
});

it("lands an infrastructure law on a named person in a random generated place", () => {
  const seed = "lw-22-random-generated-place";
  const answers = startingLaw.questions[QUESTION].answers;
  let place = drawRandomPlace(seed);
  for (
    let attempt = 1;
    answers[place.stateJurisdictionKey!]?.answer !== "yes";
    attempt += 1
  )
    place = drawRandomPlace(`${seed}:${attempt}`);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed: `${seed}:${place.key}`,
  });
  const residence = householdMembershipsAt(game.world, game.playerPersonId)[0]!
    .location!;
  const proposition = Object.values(game.world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === QUESTION,
  )!;
  const law = lawInForce(
    game.world,
    residence.jurisdictionId!,
    proposition.id,
    game.world.currentDate,
  )!;
  expect(law.answer).toBe("yes");
  const before = game.world.history.lawExposures?.length ?? 0;
  const after = applyLawConsequences(game.world, {
    onDate: game.world.currentDate,
    activity: "effective",
    activityId: law.measureId,
    subjectIds: [game.playerPersonId],
    governingLawId: law.measureId,
    questionKey: QUESTION,
  });
  const exposure = after.history.lawExposures?.at(-1);
  expect(after.history.lawExposures).toHaveLength(before + 1);
  expect(exposure).toMatchObject({
    personId: game.playerPersonId,
    measureId: law.measureId,
    sourceRecordId: law.measureId,
    channel: "public-service",
    direction: "none",
  });
  console.info(
    "LW22_LAW_EFFECT_PERSON",
    JSON.stringify({
      seed,
      place: place.key,
      jurisdictionId: residence.jurisdictionId,
      law: law.measureId,
      effect: exposure!.sourceRecordId,
      person: personName(game.world.people[game.playerPersonId]!),
      personId: game.playerPersonId,
    }),
  );
});
