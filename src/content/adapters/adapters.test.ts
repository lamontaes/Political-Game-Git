import { describe, expect, it } from "vitest";

import { conversationCommitContract } from "../../presentation/conversation-subjects";
import { companionRoleFor } from "../../presentation/formative-context";
import { ORDINARY_LIFE_WORK_ITEMS } from "../../presentation/ordinary-life";
import type { ConversationProgress } from "../../presentation/run-b-conversation-progress";
import { lifeSituationCatalog } from "../../simulation/character-history";
import { EPISODE_FAMILIES } from "../../simulation/episode-bank";
import {
  AUTHORED_MEASURE_NOTICE,
  legislativeBlueprint,
  legislativeScenarioKeys,
} from "../../simulation/legislation-scenarios";
import { LEGISLATIVE_RULE_PACKS } from "../../simulation/legislature-rule-packs";
import { SETUP_QUESTIONNAIRE_BANK } from "../../simulation/setup-questionnaire-bank";
import { createSyntheticVitalityCatalog } from "../../simulation/vitality-catalog";
import { declaredList } from "../content-bank";
import { contentIndex } from "../index";
import {
  conversationSubjectBank,
  legislativeMeasureBank,
  legislativeRulePackBank,
  lifeEpisodeBank,
  lifeSituationBank,
  ordinaryLifeBank,
  setupQuestionnaireBank,
  syntheticCatalogBank,
} from "./index";

const index = contentIndex();

function itemOf(id: string) {
  const found = index.items.find((item) => item.id === id);
  expect(found, `no indexed item ${id}`).toBeDefined();
  return found!;
}

describe("adapters report what their banks actually say", () => {
  it("reports each formative situation's own band, prose and options", () => {
    for (const situation of lifeSituationCatalog()) {
      const item = itemOf(`content.life-situations/${situation.key}`);
      expect(item.summary).toBe(situation.prose);
      expect(item.lifeStage).toStrictEqual({
        kind: "declared",
        value: situation.band,
      });
      expect(
        declaredList(item.options).map((option) => option.key),
      ).toStrictEqual(situation.options.map((option) => option.key));
      expect(declaredList(item.roles).map((role) => role.key)).toStrictEqual(
        companionRoleFor(situation.key)
          ? [companionRoleFor(situation.key)]
          : [],
      );
    }
  });

  it("does not paraphrase the world-evaluated formative eligibility rule", () => {
    const item = itemOf(
      "content.life-situations/formative.teen-work-opportunity",
    );
    expect(item.requiredFacts.kind).toBe("undeclared");
    if (item.requiredFacts.kind === "undeclared") {
      expect(item.requiredFacts.reason).toContain(
        "formativeEligibilityProvider",
      );
    }
  });

  it("reports each conversation subject's own canonical commit vocabulary", () => {
    for (const item of index.items.filter(
      (candidate) => candidate.bankId === "content.conversation-subjects",
    )) {
      const contract = conversationCommitContract({
        subject: item.itemKey,
      } as ConversationProgress);
      expect(item.summary).toBe(contract.socialContext);
      expect(item.family).toBe(contract.contextTag);
      expect(item.tags).toContain(contract.subjectTag);
      expect(
        declaredList(item.requiredFacts).map((fact) => fact.key),
      ).toContain(`event-type:${contract.eventType}`);
    }
  });

  it("says plainly that a subject's intents cannot be read without a world", () => {
    const item = itemOf("content.conversation-subjects/household-obligation");
    expect(item.options.kind).toBe("undeclared");
    if (item.options.kind === "undeclared") {
      expect(item.options.reason).toContain("availableIntents");
    }
  });

  it("keeps the authored-measure notice on every measure", () => {
    for (const key of legislativeScenarioKeys()) {
      const blueprint = legislativeBlueprint(key);
      const item = itemOf(`content.legislative-measures/${key}`);
      expect(item.summary).toBe(blueprint.summary);
      expect(item.authority).toBe("authored");
      expect(item.provenance.note).toBe(AUTHORED_MEASURE_NOTICE);
      expect(
        declaredList(item.requiredFacts).map((fact) => fact.description),
      ).toContain(AUTHORED_MEASURE_NOTICE);
    }
  });

  it("marks the measures authored and the procedure they run through sourced", () => {
    // The distinction is the point. Flattening them would let a reviewer read
    // an invented bill as a researched one.
    expect(legislativeMeasureBank().authority).toBe("authored");
    expect(legislativeRulePackBank().authority).toBe("sourced");
  });

  it("carries a rule pack's citation, retrieval date and verification through", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = itemOf(`content.legislative-rule-packs/${pack.packId}`);
      const primary = pack.sources[0]!;
      expect(item.provenance.citation).toBe(primary.citation);
      expect(item.provenance.retrievedAt).toBe(primary.retrievedAt);
      expect(item.provenance.verification).toBe(primary.verification);
      expect(
        declaredList(item.requiredFacts).length,
        "every cited source is reported",
      ).toBe(pack.sources.length);
    }
  });

  it("carries a rule pack's unresolved research forward as unresolved", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = itemOf(`content.legislative-rule-packs/${pack.packId}`);
      expect(
        declaredList(item.followUps).map((hook) => hook.description),
      ).toStrictEqual([...pack.unresolvedGaps]);
    }
  });

  it("quotes the ordinary week rather than retyping it", () => {
    for (const definition of ORDINARY_LIFE_WORK_ITEMS) {
      const item = itemOf(`content.ordinary-life/${definition.key}`);
      expect(item.title).toBe(definition.title);
      expect(item.summary).toBe(definition.summary);
    }
    expect(ordinaryLifeBank().items.length).toBe(
      ORDINARY_LIFE_WORK_ITEMS.length,
    );
  });

  it("indexes synthetic catalog definitions under their own stable keys", () => {
    const catalog = createSyntheticVitalityCatalog();
    for (const id of catalog.mortalityTableOrder) {
      const table = catalog.mortalityTables[id]!;
      const item = itemOf(
        `content.synthetic-catalogs/mortality-table/${table.stableKey}`,
      );
      expect(item.title).toBe(table.label);
      expect(item.summary).toBe(table.description);
      expect(item.tags).toContain(`vitality-source:${table.sourceKey}`);
    }
  });

  it("reports each episode stage's own lines, options and family without merging stages", () => {
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        expect(item.family).toBe(family.family);
        expect(item.summary).toBe(
          stage.lines.join(" ").trim() ||
            item.summary /* humanized fallback for a slotless empty stage */,
        );
        expect(
          declaredList(item.options).map((option) => option.key),
        ).toStrictEqual(stage.options.map((option) => option.key));
        expect(item.tags).toContain(`episode-family:${family.key}`);
      }
    }
  });

  it("does not paraphrase the world-evaluated episode eligibility rule", () => {
    const family = EPISODE_FAMILIES[0]!;
    const stage = family.stages[0]!;
    const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
    expect(item.prerequisites.kind).toBe("undeclared");
    if (item.prerequisites.kind === "undeclared") {
      expect(item.prerequisites.reason).toContain("eligibleEpisodeBeats");
    }
  });

  it("reads the slot tokens an episode stage actually carries", () => {
    // At least one stage across the bank uses a substitution slot; wherever one
    // does, the slot is declared from the literal token in the stage's own
    // authored text — its lines, and its options' label, description and
    // remembered sentence — rather than guessed.
    const withSlots = index.items.filter(
      (item) =>
        item.bankId === "content.episodes" && item.slots.kind === "declared",
    );
    expect(withSlots.length).toBeGreaterThan(0);
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        if (item.slots.kind !== "declared") continue;
        const authoredText = [
          ...stage.lines,
          ...stage.options.flatMap((option) => [
            option.label,
            option.description,
            option.memory,
          ]),
        ].join(" ");
        for (const slot of declaredList(item.slots)) {
          expect(authoredText).toContain(`{${slot.key}}`);
        }
      }
    }
  });

  it("reports each questionnaire item's own prompt, options and research provenance", () => {
    for (const authored of SETUP_QUESTIONNAIRE_BANK) {
      const item = itemOf(`content.setup-questionnaire/${authored.key}`);
      expect(item.summary).toBe(authored.prompt);
      expect(item.family).toBe(authored.register);
      expect(
        declaredList(item.options).map((option) => option.key),
      ).toStrictEqual(authored.options.map((option) => option.key));
      // The authored provenance is carried, not re-derived.
      expect(item.provenance.citation).toBe(authored.source.reference);
      expect(item.provenance.verification).toBe(authored.review.verdict);
      expect(item.provenance.note).toContain(authored.source.sourceDocument);
      // A single-band item declares its band; a multi-band one names the set.
      if (authored.eligibility.bands.length === 1) {
        expect(item.lifeStage).toStrictEqual({
          kind: "declared",
          value: authored.eligibility.bands[0],
        });
      } else {
        expect(item.lifeStage.kind).toBe("undeclared");
      }
    }
  });

  it("does not invent a follow-up the questionnaire never names", () => {
    const authored = SETUP_QUESTIONNAIRE_BANK[0]!;
    const item = itemOf(`content.setup-questionnaire/${authored.key}`);
    expect(item.followUps.kind).toBe("undeclared");
    if (item.followUps.kind === "undeclared") {
      expect(item.followUps.reason).toContain("setup-generation-inputs");
    }
  });

  it("registers every bank the repository has an adapter for", () => {
    const registered = index.banks.map((bank) => bank.id).sort();
    expect(registered).toStrictEqual(
      [
        lifeSituationBank(),
        lifeEpisodeBank(),
        ordinaryLifeBank(),
        conversationSubjectBank(),
        setupQuestionnaireBank(),
        legislativeMeasureBank(),
        legislativeRulePackBank(),
        syntheticCatalogBank(),
      ]
        .map((bank) => bank.id)
        .concat("content.production-catalogs")
        .sort(),
    );
  });
});
