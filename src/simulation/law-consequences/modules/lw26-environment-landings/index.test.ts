import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../../../../presentation/new-game";
import { drawRandomPlace } from "../../../../../tests/support/random-place";
import { ensureWorldStartingConditions } from "../../../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../../../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../../world-setup/types";
import { stateJurisdictionForKey } from "../../../life-places";
import { lawInForce } from "../../../governing/law-in-force";
import {
  ensurePlaceOutcomes,
  placeOutcomeRecords,
} from "../../../outcome-web/place-outcomes";
import type { EntityId } from "../../../types";
import {
  LW26_ENVIRONMENT_LANDING_ROWS,
  rankAsthmaRecipientsByRecordedExposure,
  rankByRecordedExposure,
  rankRecordedExposureEvent,
} from "./rows";

describe("LW-26 environment landing rows", () => {
  it("prints a named exposure chain from a new game in a random California place", () => {
    const seed = `lw26-random-place-${Date.now()}`;
    const place = drawRandomPlace(
      seed,
      (candidate) => candidate.stateJurisdictionKey === "US-CA",
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
    });
    const conditioned = ensureWorldStartingConditions(game.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    const proposition = Object.values(
      conditioned.policyCatalog?.propositions ?? {},
    ).find(
      (candidate) =>
        candidate.stableKey ===
        "us-policy-positions:environment-energy.bottle-deposit",
    );
    expect(proposition).toBeDefined();
    const state = stateJurisdictionForKey("US-CA")!;
    const activeLaw = lawInForce(
      conditioned,
      state.id,
      proposition!.id,
      conditioned.currentDate,
    );
    expect(activeLaw).toBeTruthy();

    const opened = ensurePlaceOutcomes(conditioned);
    const exposure = (opened.history.lawExposures ?? []).find(
      (row) =>
        row.personId === game.playerPersonId &&
        row.measureId === activeLaw!.measureId &&
        row.outcome?.kind === "EXPOSURE",
    );
    expect(exposure).toBeDefined();
    const cause = placeOutcomeRecords(opened).find(
      (record) => record.id === exposure!.sourceRecordId,
    );
    expect(cause).toMatchObject({ measure: "env.litter", placeKey: "US-CA" });
    console.log(
      `LW-26 new-game proof — seed: ${seed}; month: ${cause!.month}; place: ${place.displayName}; law: ${activeLaw!.measureId}; effect: ${cause!.measure}=${cause!.value}; person: ${game.world.people[game.playerPersonId]!.givenName} ${game.world.people[game.playerPersonId]!.familyName} (${game.playerPersonId}); cause: ${cause!.id}`,
    );
  }, 120_000);

  it("covers each running place effect as a dated exposure row", () => {
    expect(LW26_ENVIRONMENT_LANDING_ROWS.map((row) => row.outcomeLink)).toEqual(
      [
        "emission-rules-to-particulates",
        "container-deposit-to-litter",
        "flood-zone-limits-to-damage",
      ],
    );
    expect(
      LW26_ENVIRONMENT_LANDING_ROWS.every((row) => row.kind === "EXPOSURE"),
    ).toBe(true);
  });

  it("ranks event recipients only from recorded exposure, with stable ties", () => {
    const exposure = [
      { personId: "person-c", exposure: 3.4 },
      { personId: "person-b", exposure: 8.1 },
      { personId: "person-a", exposure: 8.1 },
    ];
    expect(rankByRecordedExposure(exposure).map((row) => row.personId)).toEqual(
      ["person-a", "person-b", "person-c"],
    );
    expect(rankRecordedExposureEvent(exposure, 1 / 3)).toEqual([
      { personId: "person-a", exposure: 8.1 },
    ]);
  });

  it("writes no ranked event when the dated measure has zero effect", () => {
    expect(rankRecordedExposureEvent([], 0)).toEqual([]);
  });

  it("ranks asthma recipients from each named person's saved particulates", () => {
    const causes = [
      { id: "cause-a1", measure: "env.particulates" },
      { id: "cause-a2", measure: "env.particulates" },
      { id: "cause-b1", measure: "env.particulates" },
      { id: "cause-other", measure: "env.litter" },
    ] as never[];
    const exposures = [
      {
        personId: "person-a",
        sourceRecordId: "cause-a1",
        outcome: { kind: "EXPOSURE", value: 2 },
      },
      {
        personId: "person-a",
        sourceRecordId: "cause-a2",
        outcome: { kind: "EXPOSURE", value: 4 },
      },
      {
        personId: "person-b",
        sourceRecordId: "cause-b1",
        outcome: { kind: "EXPOSURE", value: 8 },
      },
      {
        personId: "person-c",
        sourceRecordId: "cause-other",
        outcome: { kind: "EXPOSURE", value: 100 },
      },
    ] as never[];
    expect(
      rankAsthmaRecipientsByRecordedExposure(
        exposures,
        causes,
        new Set<EntityId>(["person-a" as EntityId, "person-b" as EntityId]),
        0.34,
      ),
    ).toEqual([{ personId: "person-b", exposure: 8 }]);
  });
});
