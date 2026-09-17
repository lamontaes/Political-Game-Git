import { beforeAll, describe, expect, it } from "vitest";
import {
  certifyWarPowersExtension,
  createDemoWorld,
  createWorld,
  crisisEnvelopesBetween,
  crisisOfficeContinuityNotices,
  crisisProtectedDecisions,
  crisisRecords,
  currentPresidentOf,
  declareInternationalCrisis,
  decideInternationalCrisis,
  deserializeWorld,
  internationalCrisisState,
  recordViolenceAttempt,
  serializeWorld,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  Person,
  TensionLevel,
  World,
} from "../simulation";
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

function firstWhere(
  world: World,
  tension: TensionLevel,
  accept: (w: World, id: EntityId) => boolean,
) {
  for (let i = 0; i < 300; i += 1) {
    const found = declare(world, `${tension}-${i}`, tension);
    if (accept(found.world, found.crisisId)) return found;
  }
  throw new Error("No declared crisis matched.");
}

const recommended = (w: World, id: EntityId) =>
  internationalCrisisState(w, id).options.at(-1)!.recommended;

describe("CRISIS K5 international crisis, first depth", () => {
  it(
    "runs a non-force route with imperfect intelligence and an independent response",
    () => {
      const { world, crisisId } = firstWhere(
        opening,
        "low",
        (w, id) => recommended(w, id) === "diplomatic",
      );
      const start = internationalCrisisState(world, crisisId);
      expect(start.assessments).toHaveLength(1);
      expect(start.assessments[0]!.visibility).toBe("limited");
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
      expect(state.ended).toBe(true);
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
      const { world, crisisId } = firstWhere(
        opening,
        "severe",
        (w, id) => recommended(w, id) === "force-posture",
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
      expect(introduced.effectiveAt > day0).toBe(true);
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
        expect(withdrawn.effectiveAt).toBe(certified.terminationAt);
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
    "records abstract attempts with survival, injury and death outcomes",
    () => {
      const president = currentPresidentOf(opening)!.personId;
      const { world } = declare(opening, "threat-context", "high");
      const evidence = world.history.events.at(-1)!.id;
      expect(() =>
        recordViolenceAttempt(world, {
          stableKey: "no-evidence",
          targetPersonId: president,
          threatEvidenceIds: [],
          basis: "Test.",
        }),
      ).toThrow(/threat evidence/);
      const outcomes = new Map<string, World>();
      for (let i = 0; i < 80 && outcomes.size < 3; i += 1) {
        const next = recordViolenceAttempt(world, {
          stableKey: `attempt-${i}`,
          targetPersonId: president,
          threatEvidenceIds: [evidence],
          basis: "Declared test attempt; represented threat evidence.",
        });
        const attempt = crisisRecords(next).at(-1)!;
        const outcome =
          crisisRecords(next).find((r) => r.kind === "violence-attempt") &&
          (
            crisisRecords(next).find((r) => r.kind === "violence-attempt") as {
              outcome: string;
            }
          ).outcome;
        if (outcome && !outcomes.has(outcome)) outcomes.set(outcome, next);
        expect(attempt).toBeDefined();
      }
      expect([...outcomes.keys()].sort()).toEqual([
        "injured",
        "killed",
        "unharmed",
      ]);
      const killed = outcomes.get("killed")!;
      expect(
        killed.history.personDeaths.find((d) => d.personId === president)
          ?.causeKey,
      ).toBe("crisis-violence:attempt");
      expect(
        crisisOfficeContinuityNotices(killed).map((n) => [n.kind, n.personId]),
      ).toEqual([["death", president]]);
      const injured = outcomes.get("injured")!;
      expect(crisisOfficeContinuityNotices(injured).map((n) => n.kind)).toEqual(
        ["incapacity-began"],
      );
      const events = killed.history.events.filter((e) =>
        e.tags.includes("crisis.violence"),
      );
      expect(events.map((e) => e.visibility)).toEqual(["public"]);
      expect(events[0]!.summary).not.toMatch(/gun|shot|bomb|knife|poison/i);
    },
    SLOW,
  );
});
