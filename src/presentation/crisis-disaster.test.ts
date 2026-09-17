import { beforeAll, describe, expect, it } from "vitest";
import {
  createDemoWorld,
  createWorld,
  crisisEnvelopesBetween,
  crisisProtectedDecisions,
  crisisRecords,
  currentGovernorOf,
  currentPresidentOf,
  declareHazardEpisode,
  decideStateDisasterRequest,
  deserializeWorld,
  disasterAssessment,
  disasterRepairQueue,
  disasterResponses,
  homeStateUsps,
  householdLocationAt,
  serializeWorld,
} from "../simulation";
import type {
  DeclareHazardEpisodeInput,
  EntityId,
  HazardMagnitude,
  IsoDate,
  Person,
  World,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

const SLOW = 900_000;
let opening: World;
let player: EntityId;
let state: string;
let home: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "crisis-k4",
      startAge: 34,
    }),
  ).game!;
  opening = game.world;
  player = game.playerPersonId;
  state = homeStateUsps(opening, player)!;
  home = householdLocationAt(
    opening,
    opening.history.households[0]!.id,
  )!.jurisdictionId;
}, SLOW);

function input(
  key: string,
  magnitude: HazardMagnitude,
): DeclareHazardEpisodeInput {
  return {
    stableKey: key,
    family: "flood",
    magnitude,
    stateUsps: state,
    jurisdictionIds: [home],
    durationDays: 4,
    basis: "Declared test episode; not a local hazard prediction.",
    sourceReference: null,
  };
}

/** The first declared episode, by key, whose damage matches the predicate. */
function declareWhere(
  world: World,
  magnitude: HazardMagnitude,
  accept: (w: World, episodeId: EntityId) => boolean,
) {
  for (let i = 0; i < 200; i += 1) {
    const next = declareHazardEpisode(
      world,
      input(`${magnitude}-${i}`, magnitude),
    );
    const episode = crisisRecords(next).find(
      (r) => r.kind === "hazard-episode",
    )!;
    if (accept(next, episode.id)) return { world: next, episodeId: episode.id };
  }
  throw new Error("No declared episode matched.");
}

const stages = (world: World, episodeId: EntityId) =>
  disasterResponses(world, episodeId).map((r) => [r.stage, r.decidedBy]);

const homesHit = (w: World, id: EntityId) => {
  const a = disasterAssessment(w, id)!;
  return a.damaged.household + a.destroyed.household;
};

describe("CRISIS K4 flood chain through ordinary time", () => {
  it(
    "runs damage → request → declaration → funded repair → follow-up",
    () => {
      const { world, episodeId } = declareWhere(
        opening,
        "major",
        (w, id) => disasterAssessment(w, id)!.destroyed.household > 0,
      );
      const assessment = disasterAssessment(world, episodeId)!;
      expect(assessment.exposed.household).toBe(2);
      // Damage is bound to represented records only.
      const damages = crisisRecords(world).filter(
        (r) => r.kind === "disaster-damage",
      );
      for (const damage of damages)
        expect(
          world.history.households.some(
            (h) => h.id === (damage as { targetId: EntityId }).targetId,
          ) ||
            world.history.organizations.some(
              (o) => o.id === (damage as { targetId: EntityId }).targetId,
            ),
        ).toBe(true);
      expect(stages(world, episodeId)).toEqual([
        ["local-response", "institution"],
      ]);

      const requested = passOrdinaryDays(world, 4);
      expect(stages(requested, episodeId)).toContainEqual([
        "state-request",
        "npc-rule",
      ]);
      const governor = currentGovernorOf(opening, state)!;
      expect(
        disasterResponses(requested, episodeId).find(
          (r) => r.stage === "state-request",
        )?.actorPersonId,
      ).toBe(governor.personId);

      const declared = passOrdinaryDays(requested, 12);
      const decision = disasterResponses(declared, episodeId).find(
        (r) => r.stage === "federal-declared",
      )!;
      expect(decision.actorPersonId).toBe(
        currentPresidentOf(opening)!.personId,
      );
      expect(decision.programs).toContain("public-assistance");
      // A declaration creates no damage and repairs nothing by itself.
      expect(disasterAssessment(declared, episodeId)).toEqual(assessment);
      expect(disasterRepairQueue(requested, episodeId).length).toBeGreaterThan(
        0,
      );

      const recovered = passOrdinaryDays(declared, 40);
      expect(disasterRepairQueue(recovered, episodeId)).toEqual([]);
      expect(stages(recovered, episodeId).at(-1)).toEqual([
        "follow-up",
        "institution",
      ]);
      const progress = crisisRecords(recovered).filter(
        (r) => r.kind === "repair-progress",
      );
      expect(
        progress.some(
          (r) => (r as { funding: string }).funding === "federal-assisted",
        ),
      ).toBe(true);
      for (const record of progress)
        expect(
          record.sequence > decision.sequence ||
            (record as { funding: string }).funding === "local",
        ).toBe(true);

      // Public events for the press, envelopes for CHANGE, no money amounts.
      const publicTypes = recovered.history.events
        .filter(
          (e) =>
            e.tags.includes("crisis.disaster") && e.visibility === "public",
        )
        .map((e) => e.type);
      expect(publicTypes).toEqual([
        "crisis.hazard-occurred",
        "crisis.disaster-local-response",
        "crisis.disaster-federal-request",
        "crisis.disaster-declared",
        "crisis.disaster-recovery-reviewed",
      ]);
      const envelopes = crisisEnvelopesBetween(
        recovered,
        "2026-01-01" as IsoDate,
        "2027-01-01" as IsoDate,
      );
      const kinds = envelopes.map((e) => e.kind);
      expect(kinds).toContain("disaster-damage");
      expect(kinds).toContain("aid-decision");
      expect(kinds).toContain("repair-progress");
      const aid = envelopes.find((e) => e.kind === "aid-decision")!;
      expect(aid.payload.amount).toBeNull();
      const damage = envelopes.find((e) => e.kind === "disaster-damage")!;
      expect(damage.geographyIds).toEqual([home]);
      expect(damage.payload.householdsDamaged).toBe(
        assessment.damaged.household,
      );

      // Save and reopen mid-chain, then continue: identical outcome.
      const reopened = deserializeWorld(serializeWorld(requested));
      const again = passOrdinaryDays(passOrdinaryDays(reopened, 12), 40);
      expect(crisisRecords(again).map((r) => r.stableKey)).toEqual(
        crisisRecords(recovered).map((r) => r.stableKey),
      );
    },
    SLOW,
  );

  it(
    "is partition invariant across a long skip",
    () => {
      const { world } = declareWhere(
        opening,
        "major",
        (w, id) => homesHit(w, id) > 0,
      );
      const whole = passOrdinaryDays(world, 70);
      let stepped = world;
      for (const days of [1, 2, 5, 9, 13, 17, 23])
        stepped = passOrdinaryDays(stepped, days);
      const view = (w: World) =>
        crisisRecords(w).map(
          (r) => `${r.kind}|${r.stableKey}|${r.effectiveAt}`,
        );
      expect(view(stepped)).toEqual(view(whole));
      expect(stepped.history.personDeaths).toEqual(whole.history.personDeaths);
    },
    SLOW,
  );

  it(
    "keeps the event when no federal request is made, and repairs only locally",
    () => {
      const { world, episodeId } = declareWhere(
        opening,
        "moderate",
        (w, id) => {
          const a = disasterAssessment(w, id)!;
          return a.damaged.household > 0 && a.destroyed.household === 0;
        },
      );
      const later = passOrdinaryDays(world, 60);
      expect(stages(later, episodeId).map(([stage]) => stage)).toEqual([
        "local-response",
        "no-state-request",
        "follow-up",
      ]);
      const progress = crisisRecords(later).filter(
        (r) => r.kind === "repair-progress",
      );
      expect(
        progress.every((r) => (r as { funding: string }).funding === "local"),
      ).toBe(true);
      expect(crisisRecords(later).some((r) => r.id === episodeId)).toBe(true);
    },
    SLOW,
  );

  it(
    "records a denial without erasing the disaster",
    () => {
      const { world, episodeId } = declareWhere(
        opening,
        "moderate",
        (w, id) => {
          const a = disasterAssessment(w, id)!;
          return a.destroyed.household > 0;
        },
      );
      const later = passOrdinaryDays(world, 20);
      expect(stages(later, episodeId).map(([stage]) => stage)).toEqual([
        "local-response",
        "state-request",
        "federal-denied",
      ]);
      expect(disasterAssessment(later, episodeId)).toEqual(
        disasterAssessment(world, episodeId),
      );
      expect(disasterRepairQueue(later, episodeId).length).toBeGreaterThan(0);
    },
    SLOW,
  );

  it(
    "waits for a player governor and lapses when the window closes",
    () => {
      const governor = currentGovernorOf(opening, state)!;
      const asGovernor: World = {
        ...opening,
        control: { kind: "person", personId: governor.personId },
      };
      const before = asGovernor.history.nextSequence;
      const { world, episodeId } = declareWhere(
        asGovernor,
        "major",
        () => true,
      );
      expect(
        crisisProtectedDecisions(world, before - 1).map((d) => d.kind),
      ).toContain("disaster-state-request");
      const waited = passOrdinaryDays(world, 10);
      expect(stages(waited, episodeId).map(([s]) => s)).toEqual([
        "local-response",
      ]);
      const chosen = decideStateDisasterRequest(waited, episodeId, "request");
      expect(stages(chosen, episodeId).at(-1)).toEqual([
        "state-request",
        "player",
      ]);
      expect(() =>
        decideStateDisasterRequest(chosen, episodeId, "decline"),
      ).toThrow();
      expect(() =>
        decideStateDisasterRequest(
          { ...world, control: { kind: "person", personId: player } },
          episodeId,
          "request",
        ),
      ).toThrow(/Only the governor/);
      const lapsed = passOrdinaryDays(world, 35);
      expect(
        stages(lapsed, episodeId).map(([s, by]) => `${s}:${by}`),
      ).toContain("no-state-request:lapse");
    },
    SLOW,
  );

  it(
    "says so truthfully when no governor or President is recorded",
    () => {
      const demo = createDemoWorld("crisis-k4-bare");
      const bare = createWorld({
        seed: "crisis-k4-bare",
        currentDate: demo.currentDate,
        jurisdictions: demo.jurisdictionOrder.map(
          (id) => demo.jurisdictions[id]!,
        ),
        people: demo.personOrder.map((id) => demo.people[id] as Person),
      });
      const declared = declareHazardEpisode(bare, {
        ...input("bare", "catastrophic"),
        stateUsps: "KY",
        jurisdictionIds: [bare.jurisdictionOrder[0]!],
      });
      const episodeId = crisisRecords(declared).find(
        (r) => r.kind === "hazard-episode",
      )!.id;
      expect(disasterAssessment(declared, episodeId)!.exposed).toEqual({
        household: 0,
        dwelling: 0,
        organization: 0,
      });
      const later = passOrdinaryDays(declared, 10);
      const noRequest = disasterResponses(later, episodeId).find(
        (r) => r.stage === "no-state-request",
      )!;
      expect(noRequest.reason).toMatch(/No governor is recorded/);
      expect(stages(later, episodeId).at(-1)?.[0]).toBe("follow-up");
    },
    SLOW,
  );
});
