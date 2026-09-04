import { describe, expect, it } from "vitest";

import {
  AFTERMATH_FIRMNESS,
  ADJACENT_OVERLAP_PENALTY,
  DIMENSION_POLES,
  EVIDENCE_WEIGHT,
  PLAYER_MODEL_DIMENSIONS,
  SETUP_BANK_VERSION,
  adultSituationBank,
  applyPlayerEvidence,
  auditPlayerModel,
  availableAdultSituations,
  buildAdultLifeContext,
  createPlayerModel,
  createSetupPriorStore,
  crossPressure,
  decideAftermath,
  dimensionSalience,
  disambiguationValue,
  isPlayerModelDimension,
  liveAmbiguities,
  modelFromSetupPriors,
  nextQuestionnaireStep,
  projectQuestionnaireSequence,
  questionnaireItem,
  questionnaireLength,
  rankSituations,
  selectSituation,
  serializeWorld,
  setupContentShortfall,
  setupPriorEvidence,
  setupQuestionnaireBank,
  sha256Hex,
  situationProfile,
  standingCommitmentsFor,
  standingFromDueItemState,
  relationshipLeverage,
  askingWouldCost,
} from "./index";
import type {
  AdultSituation,
  AdultSituationOption,
  LifeSituationKey,
  PlayerEvidence,
  PlayerModelDimension,
  SetupAnswerRecord,
  SituationCandidate,
} from "./index";
import { createDemoWorld } from "./demo";

/**
 * The wave's own acceptance criteria, as tests.
 *
 * Each block below is one of the properties the packet asked to be proven
 * rather than asserted, and several of them are properties about what the code
 * does *not* do — no outcome preview, no stakes tier on any surface, no path
 * from "the selector found this interesting" to "this will matter". Those are
 * the ones most worth pinning, because nothing fails when they quietly stop
 * being true.
 */

const WORLD_SEED = "setup-v3:abcdef:{}";
const PERSON_KEY = "person_test";

function answerAll(
  depth: "short" | "deep",
  chooser: (optionKeys: readonly string[], ordinal: number) => string | null,
): readonly SetupAnswerRecord[] {
  const answers: SetupAnswerRecord[] = [];
  for (let ordinal = 1; ordinal <= questionnaireLength(depth); ordinal += 1) {
    const step = nextQuestionnaireStep({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth,
      answers,
    });
    if (!step) break;
    answers.push({
      ordinal,
      questionKey: step.item.key,
      choiceId: chooser(
        step.item.options.map((option) => option.key),
        ordinal,
      ),
    });
  }
  return answers;
}

/* -------------------------------------------------------------------------- */

describe("The setup bank is authored, and says what it is short of", () => {
  it("carries a source for every question and every option", () => {
    for (const item of setupQuestionnaireBank()) {
      expect(item.source.sourceDocument, item.key).not.toBe("");
      expect(item.source.reference, item.key).not.toBe("");
      expect(item.prompt.length, item.key).toBeGreaterThan(40);
      expect(item.options.length, item.key).toBeGreaterThanOrEqual(3);
      for (const option of item.options) {
        // A floor that catches a stub, and nothing more. It used to be
        // fifteen characters, which was a reasonable guard against empty copy
        // and became a rule against the thing the playtest asked for: "Say
        // yes" is seven characters and is exactly the register the authority
        // wants an option written in. The mini-essay end is guarded below,
        // where it belongs.
        expect(option.text.length, `${item.key}:${option.key}`).toBeGreaterThan(
          3,
        );
      }
    }
  });

  it("writes the lived opening as actions rather than as arguments", () => {
    // The playtest's option rule, as a test. An option says what the character
    // does; it does not also supply the reasoning, the ideology and the
    // consequence, which is what a hundred-and-eighty character option ends up
    // doing.
    //
    // Scoped to the copy authored under that rule rather than to a register,
    // because the register says what kind of moment an item is and this is a
    // claim about how it is written. The research-derived items predate the
    // rule and carry their own review verdict; holding them to it here would
    // either fail forever or push somebody into rewriting copy this lane did
    // not author.
    const lived = setupQuestionnaireBank().filter(
      (item) =>
        item.source.reference.startsWith("Opening ") ||
        item.source.reference.startsWith("Personal —") ||
        item.source.reference.startsWith("Relational —") ||
        item.source.reference.startsWith("Moral —") ||
        item.source.reference.startsWith("Civic —") ||
        item.source.reference.startsWith("Policy —"),
    );
    expect(lived.length).toBeGreaterThanOrEqual(25);
    for (const item of lived) {
      for (const option of item.options) {
        expect(
          option.text.length,
          `${item.key}:${option.key} reads as an essay rather than an action`,
        ).toBeLessThanOrEqual(60);
        expect(
          option.text,
          `${item.key}:${option.key} explains itself`,
        ).not.toMatch(/ because | in order to | since it /i);
      }
    }
  });

  it("opens on lived registers before it reaches a policy docket", () => {
    const sequence = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: [],
    });
    const registers = sequence.map(
      (key) => questionnaireItem(key)?.register ?? "policy-docket",
    );
    expect(registers.slice(0, 5)).not.toContain("policy-docket");
    expect(
      registers
        .slice(0, 5)
        .every((register) =>
          ["lived-personal", "lived-relational", "lived-moral"].includes(
            register,
          ),
        ),
    ).toBe(true);
  });

  it("states the deep path's content shortfall in numbers rather than running short quietly", () => {
    const shortfall = setupContentShortfall();
    expect(shortfall.authoredItems).toBe(setupQuestionnaireBank().length);
    expect(
      shortfall.nonTransparentItems +
        shortfall.flaggedItems +
        shortfall.abstractionFlaggedItems,
    ).toBe(shortfall.authoredItems);
    // The gap is closed. This assertion used to require it to be open, with a
    // note saying that whoever closed it should come here and say so — which
    // is what this is. The lived opening bank takes the authored supply past
    // the lower target, so what the report now has to be honest about is the
    // items still ranked last rather than a shortfall that no longer exists.
    expect(shortfall.shortOfMinimumBy).toBe(0);
    expect(shortfall.authoredItems).toBeGreaterThanOrEqual(
      shortfall.deepTargetMinimum,
    );
    expect(shortfall.livedRegisterItems).toBeGreaterThan(
      shortfall.flaggedItems + shortfall.abstractionFlaggedItems,
    );
    expect(shortfall.note).toContain("no longer bounded by authored supply");
  });

  it("keeps the short path entirely inside the copy that passed review", () => {
    const sequence = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "short",
      answers: [],
    });
    expect(sequence).toHaveLength(5);
    for (const key of sequence) {
      expect(questionnaireItem(key)?.review.verdict, key).toBe(
        "non-transparent",
      );
    }
  });

  it("is not capped at ten on the deep path", () => {
    expect(questionnaireLength("deep")).toBeGreaterThan(10);
    expect(
      projectQuestionnaireSequence({
        worldSeed: WORLD_SEED,
        personKey: PERSON_KEY,
        depth: "deep",
        answers: [],
      }).length,
    ).toBeGreaterThan(10);
  });

  it("has no question whose options all load one dimension the same way", () => {
    // The "one question equals one trait" shape the semantics forbid. Every
    // item has to leave at least two dimensions in play across its options.
    for (const item of setupQuestionnaireBank()) {
      const dimensions = new Set<PlayerModelDimension>();
      for (const option of item.options) {
        for (const nudge of option.nudges) dimensions.add(nudge.dimension);
      }
      expect(dimensions.size, item.key).toBeGreaterThanOrEqual(2);
    }
  });

  it("nudges only dimensions the model actually has", () => {
    for (const item of setupQuestionnaireBank()) {
      for (const option of item.options) {
        for (const nudge of option.nudges) {
          expect(isPlayerModelDimension(nudge.dimension)).toBe(true);
          expect(Math.abs(nudge.magnitude)).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(Object.keys(DIMENSION_POLES).sort()).toEqual(
      [...PLAYER_MODEL_DIMENSIONS].sort(),
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 1 — the same world asks the same questions in the same order", () => {
  it("reproduces a whole deep sequence exactly", () => {
    const first = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: [],
    });
    const second = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: [],
    });
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it("asks a different sequence of somebody who answers differently", () => {
    // This is the adaptive claim, and it is the one worth making. The order is
    // decided by what the game still needs to know, so two players in the same
    // world who answer differently are asked different things — while two runs
    // of the same answers are identical, which is the previous test.
    const oneWay = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: answerAll("deep", (keys) => keys[0] ?? null),
    });
    const another = projectQuestionnaireSequence({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: answerAll("deep", (keys) => keys.at(-1) ?? null),
    });
    expect(oneWay.slice(0, 3)).toEqual(another.slice(0, 3));
    expect(oneWay).not.toEqual(another);
  });

  it("uses the world seed to break a tie, rather than an arbitrary order", () => {
    // Two candidates level on score is exactly when the digest decides, so the
    // property is stated where it applies: the same seed always resolves the
    // same way, and a different seed is allowed to resolve differently.
    const material = (seed: string, key: string) =>
      sha256Hex(`situation-tie-break ${seed} p 0 ${key}`);
    expect(material("one", "a")).toBe(material("one", "a"));
    expect(material("one", "a")).not.toBe(material("two", "a"));
  });

  it("computes the same digest for the same tie-break material anywhere", () => {
    // The known SHA-256 of "abc". If this changes, every world's question and
    // situation order changes with it, which is why it is pinned rather than
    // assumed.
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("keeps the fixed openers fixed and in order on both paths", () => {
    for (const depth of ["short", "deep"] as const) {
      const sequence = projectQuestionnaireSequence({
        worldSeed: WORLD_SEED,
        personKey: PERSON_KEY,
        depth,
        answers: [],
      });
      // The openers moved. They used to be a civic organization's policy
      // initiative, a professional event and an inside-or-outside question
      // about an institution, which opened a life with a political survey.
      // They are now a kitchen, a hallway and a reference somebody asked for.
      expect(sequence.slice(0, 3)).toEqual([
        "kitchen_late",
        "marcus_and_the_trip_fund",
        "priya_reference",
      ]);
    }
  });

  it("penalises repeating the previous item's subject", () => {
    // The settled 0.25 per shared dimension. Pinned because it is a contract
    // rather than a tuning knob.
    expect(ADJACENT_OVERLAP_PENALTY).toBe(0.25);
    const step = nextQuestionnaireStep({
      worldSeed: WORLD_SEED,
      personKey: PERSON_KEY,
      depth: "deep",
      answers: answerAll("deep", (keys) => keys[0] ?? null).slice(0, 4),
    });
    expect(step).not.toBeNull();
    const penalised = step!.candidates.filter(
      (candidate) => candidate.components.overlapPenalty > 0,
    );
    expect(penalised.length).toBeGreaterThan(0);
    for (const candidate of penalised) {
      expect(candidate.components.overlapPenalty % 0.25).toBeCloseTo(0, 10);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("A skip is an answer that says nothing", () => {
  it("advances the ordinal, is never asked again, and moves no dimension", () => {
    const skipped = answerAll("short", () => null);
    expect(skipped).toHaveLength(5);
    expect(new Set(skipped.map((answer) => answer.questionKey)).size).toBe(5);
    const priors = createSetupPriorStore("short", SETUP_BANK_VERSION, skipped);
    expect(setupPriorEvidence(priors)).toHaveLength(0);
    const model = modelFromSetupPriors(priors);
    for (const dimension of PLAYER_MODEL_DIMENSIONS) {
      expect(model.dimensions[dimension]).toEqual({ mean: 0, weight: 0 });
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 8 — two explanations stay alive, and something separates them", () => {
  it("keeps the fiscal ambiguity open after the answer that creates it", () => {
    const item = questionnaireItem("municipal_fiscal_shortfall");
    const freeze = item?.options.find((option) => option.key === "b");
    expect(freeze?.ambiguity?.key).toBe("fiscal.why-the-freeze");
    expect(freeze?.ambiguity?.hypothesisKeys).toEqual([
      "econ.market-autonomy-conviction",
      "trust.government-competence-doubt",
    ]);

    const model = applyPlayerEvidence(createPlayerModel(), {
      key: "test:freeze",
      strength: "setup",
      observationWeight: 1,
      nudges: freeze!.nudges,
      hypotheses: freeze!.hypotheses,
      ambiguity: freeze!.ambiguity,
      recordedAt: null,
      source: "test",
    });
    const open = liveAmbiguities(model);
    expect(open.map((entry) => entry.key)).toContain("fiscal.why-the-freeze");
    // Both explanations are still standing. A single mean could not say this.
    expect(open[0]!.openness).toBeGreaterThan(0.9);
  });

  it("finds a later authored item that would tell the two apart", () => {
    const freeze = questionnaireItem(
      "municipal_fiscal_shortfall",
    )!.options.find((option) => option.key === "b")!;
    const model = applyPlayerEvidence(createPlayerModel(), {
      key: "test:freeze",
      strength: "setup",
      observationWeight: 1,
      nudges: freeze.nudges,
      hypotheses: freeze.hypotheses,
      ambiguity: freeze.ambiguity,
      recordedAt: null,
      source: "test",
    });

    const separators = setupQuestionnaireBank().filter(
      (item) =>
        disambiguationValue(
          model,
          item.options.map((option) => option.hypotheses),
        ) > 0.5,
    );
    expect(separators.map((item) => item.key)).toContain(
      "administrative_whistleblower",
    );
    expect(separators.map((item) => item.key)).toContain(
      "public_debt_infrastructure",
    );
    // And an item that says nothing about either explanation separates nothing.
    expect(
      disambiguationValue(
        model,
        [
          questionnaireItem("safe_or_risky")!.options.map(
            (option) => option.hypotheses,
          ),
        ].flat(),
      ),
    ).toBeLessThan(0.5);
  });

  it("lets the selector choose an item because it separates rather than covers", () => {
    // Answered so the fiscal ambiguity is open early, then asked what comes
    // next. Somewhere in the remaining sequence the disambiguation term has to
    // be what decides, or the extension is decoration.
    const answers: SetupAnswerRecord[] = [];
    const reasons: string[] = [];
    for (
      let ordinal = 1;
      ordinal <= questionnaireLength("deep");
      ordinal += 1
    ) {
      const step = nextQuestionnaireStep({
        worldSeed: WORLD_SEED,
        personKey: PERSON_KEY,
        depth: "deep",
        answers,
      });
      if (!step) break;
      reasons.push(step.reason);
      answers.push({
        ordinal,
        questionKey: step.item.key,
        choiceId: step.item.options[0]?.key ?? null,
      });
    }
    expect(reasons).toContain("disambiguation");
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 3 — what was played outweighs what was said, without erasing it", () => {
  function setupLeaning(direction: number): PlayerEvidence[] {
    return [1, 2, 3].map((ordinal) => ({
      key: `setup:${ordinal}`,
      strength: "setup" as const,
      observationWeight: 1,
      nudges: [
        { dimension: "econ-distribution" as const, magnitude: direction },
      ],
      hypotheses: [],
      ambiguity: null,
      recordedAt: null,
      source: `Setup questionnaire, item ${ordinal}`,
    }));
  }

  it("turns a settled setup prior around inside three consequential actions", () => {
    let model = createPlayerModel();
    for (const evidence of setupLeaning(0.8)) {
      model = applyPlayerEvidence(model, evidence);
    }
    expect(model.dimensions["econ-distribution"].mean).toBeGreaterThan(0.7);

    for (const index of [1, 2]) {
      model = applyPlayerEvidence(model, {
        key: `played:${index}`,
        strength: "enacted",
        observationWeight: 1,
        nudges: [{ dimension: "econ-distribution", magnitude: -0.8 }],
        hypotheses: [],
        ambiguity: null,
        recordedAt: null,
        source: `Played ${index}`,
      });
    }
    // Two actions have already carried it past neutral and out the other side.
    expect(model.dimensions["econ-distribution"].mean).toBeLessThan(-0.2);

    // And every setup answer is still exactly where it was.
    const setupEntries = model.trail.filter(
      (entry) => entry.strength === "setup",
    );
    expect(setupEntries).toHaveLength(3);
    expect(setupEntries.map((entry) => entry.source)).toEqual([
      "Setup questionnaire, item 1",
      "Setup questionnaire, item 2",
      "Setup questionnaire, item 3",
    ]);
    const audit = auditPlayerModel(model).find(
      (entry) => entry.dimension === "econ-distribution",
    );
    expect(audit?.fromSetup).toBe(3);
    expect(audit?.fromGameplay).toBe(2);
  });

  it("weights a played choice around five times a setup answer", () => {
    const ratio = EVIDENCE_WEIGHT.enacted / EVIDENCE_WEIGHT.setup;
    expect(ratio).toBeGreaterThanOrEqual(4);
    expect(ratio).toBeLessThanOrEqual(6);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 4 — an option cannot preview its outcome", () => {
  const ALLOWED_OPTION_FIELDS = new Set([
    "key",
    "label",
    "description",
    "memory",
    "witnessed",
    "stance",
    "relationalChange",
    "interactionKind",
    // Adult options additionally carry what the choice teaches the adaptive
    // layer and what kind of thing it may leave behind. Neither is an outcome:
    // the first is about the player, and the second is a question the world
    // answers later.
    "nudges",
    "hypotheses",
    "aftermath",
    "writes",
  ]);

  it("adds no field to any authored option that could hold a forecast", () => {
    for (const situation of adultSituationBank()) {
      for (const option of situation.options) {
        for (const field of Object.keys(option)) {
          expect(
            ALLOWED_OPTION_FIELDS.has(field),
            `${situation.key}:${option.key} has an unexpected field '${field}'`,
          ).toBe(true);
        }
      }
    }
  });

  it("puts no number on an option that describes what happens to anybody else", () => {
    // The magnitudes an option does carry are the adaptive layer's, and they
    // are about the player rather than about the world. Nothing else on an
    // option is numeric, so there is nowhere for "+10 with the neighbours" to
    // live without a schema change that this test would fail.
    for (const situation of adultSituationBank()) {
      for (const option of situation.options) {
        const record = option as unknown as Record<string, unknown>;
        for (const [field, value] of Object.entries(record)) {
          if (field === "nudges" || field === "hypotheses") continue;
          expect(
            typeof value,
            `${situation.key}:${option.key}:${field}`,
          ).not.toBe("number");
        }
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 5 — the stakes tier is internal", () => {
  it("appears on no situation the engine hands out", () => {
    const world = createDemoWorld();
    const personId = world.personOrder[0]!;
    const context = buildAdultLifeContext(world, personId);
    for (const situation of availableAdultSituations(context)) {
      const projected = JSON.parse(
        JSON.stringify({
          key: situation.key,
          prose: situation.prose,
          options: situation.options.map((option) => ({
            key: option.key,
            label: option.label,
            description: option.description,
          })),
        }),
      ) as unknown;
      expect(JSON.stringify(projected)).not.toContain("stakes");
      expect(JSON.stringify(projected)).not.toMatch(/\bpressing\b/);
    }
  });

  it("is nowhere in a serialized world", () => {
    const world = createDemoWorld();
    const written = serializeWorld(world);
    expect(written).not.toContain('"stakes"');
    expect(written).not.toContain("cross-pressure");
    expect(written).not.toContain("selectionReason");
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 6 and 7 — why a situation was offered cannot decide what follows", () => {
  const world = createDemoWorld();
  const personId = world.personOrder[0]!;
  const otherId = world.personOrder[1]!;
  const eventId = world.history.events[0]!.id;

  function decisionFor(
    situation: AdultSituation,
    option: AdultSituationOption,
  ) {
    return decideAftermath({
      world,
      personId,
      situationKey: situation.key,
      optionKey: option.key,
      aftermath: option.aftermath,
      counterpartPersonId: otherId,
      occurredAt: world.currentDate,
      eventId,
      stableKey: `test:${situation.key}:${option.key}`,
    });
  }

  it("gives the same answer for the same aftermath whatever tier the situation was", () => {
    const byAftermath = new Map<string, Set<string>>();
    for (const situation of adultSituationBank()) {
      for (const option of situation.options) {
        const decision = decisionFor(situation, option);
        const key = String(option.aftermath);
        const shape =
          decision.kind === "schedule"
            ? "schedule"
            : `nothing:${decision.reason}`;
        byAftermath.set(
          key,
          (byAftermath.get(key) ?? new Set<string>()).add(shape),
        );
      }
    }
    // One aftermath kind, one answer — across situations tiered ordinary,
    // notable and pressing alike. If the tier were an input, at least one of
    // these sets would have two members.
    for (const [aftermath, shapes] of byAftermath) {
      expect(shapes.size, `aftermath ${aftermath}`).toBe(1);
    }
    expect(byAftermath.get("null")).toEqual(
      new Set(["nothing:life:issue-overtaken"]),
    );
  });

  it("lets a genuinely hard choice schedule nothing at all while still teaching the model", () => {
    const situation = adultSituationBank().find(
      (candidate) => candidate.key === "adult.local-issue-position",
    );
    expect(situation?.stakes).toBe("notable");
    // Every way of taking this one is finished when it is made. Nothing about
    // it is scheduled, and that is authored rather than accidental.
    for (const option of situation!.options) {
      expect(option.aftermath, option.key).toBeNull();
      expect(decisionFor(situation!, option).kind).toBe("nothing-follows");
      expect(option.nudges.length, option.key).toBeGreaterThan(0);
    }
  });

  it("decides from the world rather than from the row, for one and the same option", () => {
    const situation = adultSituationBank().find(
      (candidate) => candidate.key === "adult.friend-favour",
    )!;
    const option = situation.options.find(
      (candidate) => candidate.key === "do-it",
    )!;
    const withSomebody = decideAftermath({
      world,
      personId,
      situationKey: situation.key,
      optionKey: option.key,
      aftermath: option.aftermath,
      counterpartPersonId: otherId,
      occurredAt: world.currentDate,
      eventId,
      stableKey: "test:connected",
    });
    const withNobody = decideAftermath({
      world,
      personId,
      situationKey: situation.key,
      optionKey: option.key,
      aftermath: option.aftermath,
      counterpartPersonId: null,
      occurredAt: world.currentDate,
      eventId,
      stableKey: "test:alone",
    });
    expect(withNobody).toEqual({
      kind: "nothing-follows",
      reason: "life:nobody-to-carry-it",
    });
    expect(withSomebody.kind).not.toBe(withNobody.kind);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 9 — a situation can rank highly because two priorities collide", () => {
  function modelCaring(): ReturnType<typeof createPlayerModel> {
    let model = createPlayerModel();
    for (const index of [1, 2, 3, 4]) {
      model = applyPlayerEvidence(model, {
        key: `played:ties:${index}`,
        strength: "enacted",
        observationWeight: 1,
        nudges: [
          { dimension: "personal-ties", magnitude: 0.85 },
          { dimension: "achievement-ambition", magnitude: 0.8 },
        ],
        hypotheses: [],
        ambiguity: null,
        recordedAt: null,
        source: "test",
      });
    }
    return model;
  }

  it("reads both sides as salient before calling it a collision", () => {
    const model = modelCaring();
    expect(dimensionSalience(model, "personal-ties")).toBeGreaterThan(0.6);
    expect(dimensionSalience(model, "achievement-ambition")).toBeGreaterThan(
      0.6,
    );
    const family = adultSituationBank().find(
      (situation) => situation.key === "adult.family-request",
    )!;
    expect(crossPressure(model, family.tensions).strength).toBeGreaterThan(0.6);

    // Somebody with no observed view on either is not cross-pressured by the
    // same situation. The collision is about this player, not about the row.
    expect(crossPressure(createPlayerModel(), family.tensions).strength).toBe(
      0,
    );
  });

  it("puts the colliding situation first, and says the collision is why", () => {
    const model = modelCaring();
    const candidates: SituationCandidate[] = adultSituationBank()
      .filter((situation) =>
        [
          "adult.family-request",
          "adult.ordinary-good-day",
          "adult.household-repair",
        ].includes(situation.key),
      )
      .map((situation) => ({
        key: situation.key,
        band: "adulthood" as const,
        stakes: situation.stakes,
        tensions: situation.tensions,
        relevance: 0.5,
        followsFromHistory: false,
      }));

    const selection = selectSituation({
      selectionSeed: "seed",
      personKey: PERSON_KEY,
      ordinal: 0,
      model,
      candidates,
      recentKeys: [],
      recentStakes: ["notable", "notable", "notable"],
    });
    expect(selection?.chosen.candidate.key).toBe("adult.family-request");
    expect(selection?.reason).toBe("cross-pressure");
    expect(selection?.chosen.components.crossPressure).toBeGreaterThan(
      selection!.chosen.components.relevance,
    );
  });

  it("ranks nothing on collision for a player who has shown nothing", () => {
    const candidates: SituationCandidate[] = adultSituationBank()
      .slice(0, 6)
      .map((situation) => ({
        key: situation.key,
        band: "adulthood" as const,
        stakes: situation.stakes,
        tensions: situation.tensions,
        relevance: 0.5,
        followsFromHistory: false,
      }));
    for (const ranked of rankSituations({
      selectionSeed: "seed",
      personKey: PERSON_KEY,
      ordinal: 0,
      model: createPlayerModel(),
      candidates,
      recentKeys: [],
      recentStakes: [],
    })) {
      expect(ranked.components.crossPressure).toBe(0);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 10 — adult situations are keyed to opportunity, never to a rate", () => {
  it("has no arrival-rate field anywhere in the bank", () => {
    const written = JSON.stringify(
      adultSituationBank().map((situation) => ({
        key: situation.key,
        stakes: situation.stakes,
        options: situation.options,
      })),
    );
    for (const forbidden of [
      "annualOccurrenceRate",
      "occurrenceRate",
      "arrivalRate",
      "probability",
      "hazard",
      "perYear",
      "frequency",
    ]) {
      expect(written).not.toContain(forbidden);
    }
  });

  it("offers a sparse life less than a full one, from world state alone", () => {
    const world = createDemoWorld();
    const populated = buildAdultLifeContext(world, world.personOrder[0]!);
    const available = availableAdultSituations(populated);
    expect(available.length).toBeGreaterThan(4);

    // The same bank against a context with nothing in it: only the situations
    // that need nothing survive, and they survive because they need nothing
    // rather than because a die came up.
    const empty = {
      ...populated,
      householdIds: [],
      householdCompanionIds: [],
      kinIds: [],
      partnerIds: [],
      colleagueIds: [],
      communityMemberIds: [],
      otherHouseholdMemberIds: [],
      familiarPersonIds: [],
      workCount: 0,
      careCount: 0,
      commitmentCount: 0,
      playerMadeCommitmentCount: 0,
      obligationCount: 0,
      civicParticipationCount: 0,
      hasDwelling: false,
      hasHousingTenure: false,
      hasPostedMeeting: false,
      hasHouseholdWorkItem: false,
      activeIncidentCount: 0,
    };
    const bare = availableAdultSituations(empty);
    expect(bare.length).toBeGreaterThan(0);
    expect(bare.length).toBeLessThan(available.length);
  });

  it("only offers an incident aftermath when an incident already exists", () => {
    const world = createDemoWorld();
    const context = buildAdultLifeContext(world, world.personOrder[0]!);
    const aftermath = adultSituationBank().find(
      (situation) => situation.key === "adult.incident-aftermath",
    )!;
    expect(aftermath.available({ ...context, activeIncidentCount: 0 })).toBe(
      false,
    );
    expect(aftermath.available({ ...context, activeIncidentCount: 1 })).toBe(
      true,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 13 — an adult life is not one long dilemma", () => {
  it("has enough undemanding content to be somebody's ordinary week", () => {
    const tiers = adultSituationBank().map((situation) => situation.stakes);
    const ordinary = tiers.filter((tier) => tier === "ordinary").length;
    expect(ordinary).toBeGreaterThanOrEqual(8);
    expect(ordinary / tiers.length).toBeGreaterThan(0.2);
  });

  it("penalises another hard moment after a hard run, and relieves a quiet one", () => {
    const candidates: SituationCandidate[] = [
      {
        key: "adult.family-request" as LifeSituationKey,
        band: "adulthood",
        stakes: "pressing",
        tensions: [],
        relevance: 0.5,
        followsFromHistory: false,
      },
      {
        key: "adult.ordinary-good-day" as LifeSituationKey,
        band: "adulthood",
        stakes: "ordinary",
        tensions: [],
        relevance: 0.5,
        followsFromHistory: false,
      },
    ];
    const afterHardRun = selectSituation({
      selectionSeed: "seed",
      personKey: PERSON_KEY,
      ordinal: 3,
      model: createPlayerModel(),
      candidates,
      recentKeys: [],
      recentStakes: ["pressing", "pressing", "pressing"],
    });
    expect(afterHardRun?.chosen.candidate.stakes).toBe("ordinary");

    const afterQuietRun = selectSituation({
      selectionSeed: "seed",
      personKey: PERSON_KEY,
      ordinal: 3,
      model: createPlayerModel(),
      candidates,
      recentKeys: [],
      recentStakes: ["ordinary", "ordinary", "ordinary"],
    });
    expect(afterQuietRun?.chosen.candidate.stakes).toBe("pressing");
  });

  it("gives every formative situation a profile the selector can read", () => {
    for (const key of [
      "formative.lunch-table",
      "formative.caring-for-someone",
      "formative.small-money",
    ] as LifeSituationKey[]) {
      const profile = situationProfile(key);
      expect(profile.tensions.length, key).toBeGreaterThan(0);
      expect(["ordinary", "notable", "pressing"]).toContain(profile.stakes);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("The adult bank holds the content the wave was asked for", () => {
  it("has a four-option cross-pressure situation with no obvious answer", () => {
    const situation = adultSituationBank().find(
      (candidate) => candidate.key === "adult.community-building",
    )!;
    expect(situation.options).toHaveLength(4);
    expect(situation.tensions.length).toBeGreaterThanOrEqual(2);
    // No option is the safe one: every one of them is somebody's loss.
    const aftermaths = new Set(
      situation.options.map((option) => String(option.aftermath)),
    );
    expect(aftermaths.size).toBeGreaterThan(2);
  });

  it("covers household, work, money, housing, friendship, civic and political life", () => {
    const keys = adultSituationBank().map((situation) => situation.key);
    for (const family of [
      "adult.household-",
      "adult.family-",
      "adult.care-",
      "adult.work-",
      "adult.housing-",
      "adult.debt-",
      "adult.friend-",
      "adult.community-",
      "adult.local-",
      "adult.petition-",
      "adult.candidacy-",
      "adult.incident-",
    ]) {
      expect(
        keys.some((key) => key.startsWith(family)),
        family,
      ).toBe(true);
    }
    expect(keys.length).toBeGreaterThanOrEqual(30);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("says what somebody else saw whenever somebody else is in the scene", () => {
    for (const situation of adultSituationBank()) {
      if (situation.companion === null) continue;
      for (const option of situation.options) {
        expect(
          "witnessed" in option,
          `${situation.key}:${option.key} must say what was witnessed, or say null`,
        ).toBe(true);
      }
    }
  });

  it("keeps most choices free of any consequence at all", () => {
    const options = adultSituationBank().flatMap(
      (situation) => situation.options,
    );
    const finished = options.filter((option) => option.aftermath === null);
    // Not a majority requirement, but a real share: a bank where everything
    // came back would be a bank of promises.
    expect(finished.length / options.length).toBeGreaterThan(0.3);
  });
});

/* -------------------------------------------------------------------------- */

describe("Scope E — one commitment vocabulary, and leverage that is not a meter", () => {
  it("reads a terminal due-item state as a commitment standing, in one place", () => {
    expect(standingFromDueItemState("scheduled", null)).toBe("outstanding");
    expect(standingFromDueItemState("resolved", "life:came-back")).toBe("met");
    expect(
      standingFromDueItemState("blocked", "life:actor-lost-standing"),
    ).toBe("withdrawn");
    expect(standingFromDueItemState("cancelled", "life:issue-overtaken")).toBe(
      "superseded",
    );
    expect(standingFromDueItemState("cancelled", "life:attention-moved")).toBe(
      "withdrawn",
    );
    expect(standingFromDueItemState("cancelled", "life:nobody-heard")).toBe(
      "moot",
    );
    // Every aftermath kind has a firmness said in words rather than in odds.
    for (const firmness of Object.values(AFTERMATH_FIRMNESS)) {
      expect([
        "explicit",
        "qualified",
        "provisional",
        "noncommittal",
      ]).toContain(firmness);
    }
  });

  it("reads what somebody is on the hook for out of the records that exist", () => {
    const world = createDemoWorld();
    for (const personId of world.personOrder) {
      for (const entry of standingCommitmentsFor(world, personId)) {
        expect(entry.record.personId).toBe(personId);
        expect([
          "outstanding",
          "met",
          "broken",
          "superseded",
          "withdrawn",
          "moot",
        ]).toContain(entry.standing);
        // Nothing generated says it was said plainly, because nobody said it.
        expect(entry.firmness).toBe("provisional");
      }
    }
  });

  it("adds no second commitment store beside the one that exists", () => {
    const world = createDemoWorld();
    const store = world.history as unknown as Record<string, unknown>;
    // One place where an undertaking lives, and it predates this wave.
    expect(Array.isArray(store.lifeCommitments)).toBe(true);
    for (const invented of [
      "adultCommitments",
      "lifePromises",
      "playerCommitments",
      "obligationRecords",
    ]) {
      expect(store[invented]).toBeUndefined();
    }
  });

  it("derives leverage from the world and keeps no score anywhere", () => {
    const world = createDemoWorld();
    const [first, second] = world.personOrder;
    const reading = relationshipLeverage(world, first!, second!);
    // Symmetric by construction: one relationship, two readings of it.
    expect(relationshipLeverage(world, second!, first!).imbalance).toBeCloseTo(
      -reading.imbalance,
      10,
    );
    expect(reading.theirs.reliance).toBeGreaterThanOrEqual(0);
    expect(reading.theirs.reliance).toBeLessThanOrEqual(1);
    // Every strand it reports is a fact somewhere else in the world, not a
    // number this module has been accumulating.
    for (const strand of reading.theirs.through) {
      expect([
        "shares-their-household",
        "works-where-they-work",
        "depends-on-their-care",
        "belongs-to-their-group",
        "owes-money",
      ]).toContain(strand);
    }
    expect(askingWouldCost(world, first!, first!)).toBe(false);
    // And nothing about it is written down.
    expect(serializeWorld(world)).not.toContain("leverage");
    expect(serializeWorld(world)).not.toContain("reliance");
  });

  it("only offers the uncomfortable-help situation when somebody is actually relied on", () => {
    const world = createDemoWorld();
    const context = buildAdultLifeContext(world, world.personOrder[0]!);
    const situation = adultSituationBank().find(
      (candidate) => candidate.key === "adult.help-with-strings",
    )!;
    expect(situation.available({ ...context, strongestDependency: 0 })).toBe(
      false,
    );
    expect(situation.available({ ...context, strongestDependency: 0.5 })).toBe(
      true,
    );
    // And it is more relevant the more lopsided the relationship is.
    expect(situation.relevance!({ ...context, strongestDependency: 0.6 })).toBe(
      1,
    );
  });
});
