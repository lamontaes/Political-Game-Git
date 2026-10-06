import { beforeAll, describe, expect, it } from "vitest";
import {
  certifyWarPowersExtension,
  createDemoWorld,
  createWorld,
  crisisEnvelopesBetween,
  crisisProtectedDecisions,
  crisisRecords,
  currentPresidentOf,
  declareInternationalCrisis,
  decideInternationalCrisis,
  deserializeWorld,
  internationalCrisisState,
  recordPoliticalAttackIntent,
  recordViolenceAttempt,
  recordWorldEvent,
  serializeWorld,
} from "../simulation";
import type { IsoDate, Person, TensionLevel, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

const SLOW = 900_000;
let opening: World;

beforeAll(() => {
  opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "crisis-k5",
      startAge: 34,
    }),
  ).game!.world;
}, SLOW);

function declare(world: World, key: string, tension: TensionLevel) {
  const next = declareInternationalCrisis(world, {
    stableKey: key,
    counterpartyLabel: "a foreign government",
    allyLabels: ["treaty allies"],
    subject: "access to a disputed shipping lane",
    tension,
    basis: "Declared test crisis; fictional counterparty.",
  });
  const crisisId = crisisRecords(next).find(
    (r) => r.kind === "international-crisis",
  )!.id;
  return { world: next, crisisId };
}

describe("CRISIS K5 international crisis, first depth", () => {
  it(
    "runs a non-force route without inventing missing intelligence",
    () => {
      const { world, crisisId } = declare(opening, "low", "low");
      const start = internationalCrisisState(world, crisisId);
      expect(start.assessments).toHaveLength(0);
      expect(start.options[0]!.causalParentIds).toEqual([crisisId]);
      expect(start.options[0]!.options.map((o) => o.key)).toEqual([
        "diplomatic",
        "economic",
        "force-posture",
      ]);
      const later = passOrdinaryDays(world, 60);
      const state = internationalCrisisState(later, crisisId);
      expect(state.decisions[0]).toMatchObject({
        option: "diplomatic",
        decidedBy: "npc-rule",
        deciderPersonId: currentPresidentOf(opening)!.personId,
      });
      expect(state.responses.length).toBeGreaterThan(0);
      expect(state.warPowers).toEqual([]);
      expect(state.ended).toBe(state.responses.some((record) => record.ended));
      // Decision and response are public; intelligence is not.
      const types = later.history.events
        .filter((e) => e.tags.includes("crisis.international"))
        .map((e) => [e.type, e.visibility]);
      expect(types[0]).toEqual(["crisis.international-incident", "public"]);
      expect(types).toContainEqual(["crisis.international-decision", "public"]);
      expect(types).toContainEqual(["crisis.international-response", "public"]);
    },
    SLOW,
  );

  it(
    "gives counterparties their own varied answers",
    () => {
      const answers = new Set<string>();
      for (let i = 0; i < 12; i += 1) {
        const { world, crisisId } = declare(opening, `vary-${i}`, "elevated");
        const state = internationalCrisisState(
          passOrdinaryDays(world, 8),
          crisisId,
        );
        answers.add(state.responses[0]!.counterparty);
      }
      expect(answers.size).toBeGreaterThan(1);
    },
    SLOW,
  );

  it(
    "starts War Powers clocks only on the force route, on their statutory days",
    () => {
      const president = currentPresidentOf(opening)!;
      const declared = declare(
        {
          ...opening,
          control: { kind: "person", personId: president.personId },
        },
        "severe",
        "severe",
      );
      const crisisId = declared.crisisId;
      const world = decideInternationalCrisis(
        declared.world,
        crisisId,
        "force-posture",
      );
      const day0 = world.currentDate;
      const run = passOrdinaryDays(world, 110);
      const state = internationalCrisisState(run, crisisId);
      expect(state.decisions[0]!.option).toBe("force-posture");
      const stages = state.warPowers.map((r) => [r.stage, r.effectiveAt]);
      const introduced = state.warPowers.find(
        (r) => r.stage === "forces-introduced",
      )!;
      const reported = state.warPowers.find(
        (r) => r.stage === "report-submitted",
      )!;
      expect(reported.effectiveAt <= introduced.reportDueAt).toBe(true);
      expect(introduced.effectiveAt).toBe(day0);
      expect(stages.at(-1)![0]).toBe("forces-withdrawn");
      if (stages.some(([s]) => s === "authorization-absent")) {
        const absent = state.warPowers.find(
          (r) => r.stage === "authorization-absent",
        )!;
        expect(absent.effectiveAt).toBe(reported.terminationAt);
        const certified = state.warPowers.find(
          (r) => r.stage === "withdrawal-extension-certified",
        )!;
        const withdrawn = state.warPowers.at(-1)!;
        expect(withdrawn.effectiveAt).toBe(
          certified?.terminationAt ?? reported.terminationAt,
        );
      }
      // CHANGE sees the force decision as spillover, without money.
      const spill = crisisEnvelopesBetween(
        run,
        "2026-01-01" as IsoDate,
        "2027-01-01" as IsoDate,
      ).filter((e) => e.kind === "international-conflict-spillover");
      expect(spill.length).toBeGreaterThan(0);
      expect(spill[0]!.payload.amount).toBeNull();
      // Partition invariance and save/reopen.
      let stepped = deserializeWorld(serializeWorld(world));
      for (const days of [3, 7, 11, 19, 29, 41])
        stepped = passOrdinaryDays(stepped, days);
      const view = (w: World) =>
        crisisRecords(w).map((r) => `${r.stableKey}|${r.effectiveAt}`);
      expect(view(stepped)).toEqual(view(run));
    },
    SLOW,
  );

  it(
    "waits for a player President, who can choose force and must act on the clock",
    () => {
      const president = currentPresidentOf(opening)!;
      const asPresident: World = {
        ...opening,
        control: { kind: "person", personId: president.personId },
      };
      const before = asPresident.history.nextSequence;
      const { world, crisisId } = declare(asPresident, "player", "high");
      expect(
        crisisProtectedDecisions(world, before - 1).map((d) => d.kind),
      ).toContain("international-decision");
      const waited = passOrdinaryDays(world, 6);
      expect(internationalCrisisState(waited, crisisId).decisions).toEqual([]);
      expect(() =>
        decideInternationalCrisis(
          { ...waited, control: { kind: "observer" } },
          crisisId,
          "diplomatic",
        ),
      ).toThrow(/Only the President/);
      const decided = decideInternationalCrisis(
        waited,
        crisisId,
        "force-posture",
      );
      expect(() =>
        decideInternationalCrisis(decided, crisisId, "economic"),
      ).toThrow();
      const reported = passOrdinaryDays(decided, 2);
      const certified = certifyWarPowersExtension(reported, crisisId);
      expect(
        internationalCrisisState(certified, crisisId).warPowers.map(
          (r) => r.stage,
        ),
      ).toContain("withdrawal-extension-certified");
      // Without a certification, forces leave when the 60 days run out.
      const uncertified = passOrdinaryDays(reported, 70);
      const clock = internationalCrisisState(uncertified, crisisId).warPowers;
      const stages = clock.map((r) => r.stage);
      expect(stages.at(-1)).toBe("forces-withdrawn");
      expect(stages).not.toContain("withdrawal-extension-certified");
    },
    SLOW,
  );

  it(
    "falls back truthfully when no President is recorded",
    () => {
      const demo = createDemoWorld("crisis-k5-bare");
      const bare = createWorld({
        seed: "crisis-k5-bare",
        currentDate: demo.currentDate,
        jurisdictions: demo.jurisdictionOrder.map(
          (id) => demo.jurisdictions[id]!,
        ),
        people: demo.personOrder.map((id) => demo.people[id] as Person),
      });
      const { world, crisisId } = declare(bare, "bare", "severe");
      const later = passOrdinaryDays(world, 8);
      expect(
        internationalCrisisState(later, crisisId).decisions[0],
      ).toMatchObject({
        option: "diplomatic",
        decidedBy: "institution",
        deciderPersonId: null,
      });
    },
    SLOW,
  );

  it(
    "requires a named actor's earlier recorded intent before an attempt",
    () => {
      const president = currentPresidentOf(opening)!.personId;
      const { world } = declare(opening, "threat-context", "high");
      const evidence = world.history.events.at(-1)!.id;
      expect(() =>
        recordViolenceAttempt(world, {
          stableKey: "no-intent",
          actorPersonId: president,
          targetPersonId: president,
          intentEventId: evidence,
          threatEvidenceIds: [evidence],
          basis: "Test.",
        }),
      ).toThrow(/earlier intent/);
      expect(
        crisisRecords(world).filter(
          (record) => record.kind === "violence-attempt",
        ),
      ).toEqual([]);
    },
    SLOW,
  );

  it(
    "records an NPC's own intent from prior evidence before evaluating an attempt",
    () => {
      const president = currentPresidentOf(opening)!.personId;
      const vice = Object.values(opening.people).find(
        (person) => person.id !== president,
      )!.id;
      let world: World = { ...opening, control: { kind: "observer" } };
      const threat = recordWorldEvent(world, {
        stableKey: "named-intent-prior-threat",
        type: "pressure.political-threat",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: world.people[president]!.homeJurisdictionId,
        involvedEntityIds: [vice, president],
        participants: [
          { personId: vice, role: "agency:threatener", detail: null },
          { personId: president, role: "impact:threatened", detail: null },
        ],
        personFactConstraints: [],
        visibility: "limited",
        tags: ["crisis", "crisis.political-threat"],
        summary: "A prior threat was recorded against the President.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      world = threat;
      const sourceEventId = world.history.events.at(-1)!.id;
      const intent = recordPoliticalAttackIntent(world, {
        stableKey: "named-intent-decision",
        actorPersonId: vice,
        targetPersonId: president,
        threatEventId: sourceEventId,
        actorStrain: {
          explanation: "Recorded strain supports acting on the threat.",
          importance: "decisive",
          confidence: "high",
          sourceEventIds: [sourceEventId],
        },
        actorMeans: {
          explanation: "Recorded means support acting on the threat.",
          importance: "decisive",
          confidence: "high",
          sourceEventIds: [sourceEventId],
        },
        targetSecurity: {
          explanation: "Recorded security weighs against an attempt.",
          importance: "slight",
          confidence: "low",
          sourceEventIds: [sourceEventId],
        },
        targetExposure: {
          explanation: "Recorded exposure supports an attempt.",
          importance: "decisive",
          confidence: "high",
          sourceEventIds: [sourceEventId],
        },
        basis:
          "The named actor weighed the recorded strain, means, security and exposure.",
      });
      expect(intent.intentId).not.toBeNull();
      const intentEventId = intent.world.history.events.at(-1)!.id;
      const attempt = recordViolenceAttempt(intent.world, {
        stableKey: "named-intent-attempt",
        actorPersonId: vice,
        targetPersonId: president,
        intentEventId,
        threatEvidenceIds: [sourceEventId],
        basis:
          "The actor's recorded intent and the earlier threat support this abstract attempt.",
      });
      expect(attempt.attemptId).not.toBeNull();
      expect(attempt.outcome).not.toBeNull();
      expect(
        crisisRecords(attempt.world).find(
          (record) => record.id === attempt.attemptId,
        ),
      ).toMatchObject({ actorPersonId: vice, targetPersonId: president });
    },
    SLOW,
  );
});
