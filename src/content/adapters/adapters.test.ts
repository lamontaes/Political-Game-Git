import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
import { queryContentItems } from "../content-registry";
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
      expect(item.lifeStages).toStrictEqual({
        kind: "declared",
        value: [situation.band],
      });
      expect(
        declaredList(item.options).map((option) => option.key),
      ).toStrictEqual(situation.options.map((option) => option.key));
      // Casting is read from the source's own `needsCompanion` alone: a generic
      // required `companion` where one is needed, undeclared where none is. The
      // specific part comes from a presentation-layer mapping the source does
      // not own, so it is not reported here.
      if (situation.needsCompanion) {
        expect(declaredList(item.roles).map((role) => role.key)).toStrictEqual([
          "companion",
        ]);
        expect(declaredList(item.roles)[0]?.required).toBe(true);
      } else {
        expect(item.roles.kind).toBe("undeclared");
      }
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
      // The commit contract is the vocabulary a turn is RECORDED in. It is
      // reported as declared structure, not as a canonical fact a world has to
      // show before the subject may be offered — the contract states no such
      // condition, and claiming one made the index read as if a conversation
      // required its own event type to already exist.
      expect(
        declaredList(item.attributes).map((attribute) => attribute.key),
      ).toContain(`event-type:${contract.eventType}`);
      expect(item.requiredFacts.kind).toBe("undeclared");
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
      // The notice describes the measure — the bill is not a real one — and is
      // carried as declared structure and as provenance. It is not a fact a
      // world has to show for the measure to be offered.
      expect(
        declaredList(item.attributes).map((attribute) => attribute.description),
      ).toContain(AUTHORED_MEASURE_NOTICE);
      expect(item.requiredFacts.kind).toBe("undeclared");
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
      // Every cited instrument survives, and survives as PROVENANCE. A
      // citation is evidence of where a value came from; reporting it as a
      // required fact said the legislature needed its own footnote to be true.
      expect(
        item.provenance.sources.length,
        "every cited source is reported",
      ).toBe(pack.sources.length);
      expect(
        item.provenance.sources.map((source) => source.citation),
      ).toStrictEqual(pack.sources.map((source) => source.citation));
      for (const [index, source] of pack.sources.entries()) {
        const reported = item.provenance.sources[index]!;
        expect(reported.sourceTitle).toBe(source.sourceTitle);
        expect(reported.sourceUrl).toBe(source.sourceUrl);
        expect(reported.retrievedAt).toBe(source.retrievedAt);
        expect(reported.authority).toBe(source.authority);
        expect(reported.verification).toBe(source.verification);
      }
      expect(item.requiredFacts.kind).toBe("undeclared");
    }
  });

  it("carries a rule pack's unresolved research forward as unresolved", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = itemOf(`content.legislative-rule-packs/${pack.packId}`);
      // Unresolved research is reported under its own name. It is not a
      // follow-up: nothing leads to a gap in what anybody knows, and calling it
      // one said the game had somewhere to go where the research had stopped.
      expect(
        declaredList(item.unresolvedResearch).map((gap) => gap.description),
      ).toStrictEqual([...pack.unresolvedGaps]);
      expect(item.followUps.kind).toBe("undeclared");
      if (pack.unresolvedGaps.length > 0) {
        expect(item.unresolvedResearch.kind).toBe("declared");
      }
    }
  });

  it("does not offer a floor stage as a choice anybody makes", () => {
    // A floor stage is procedure the chamber runs a measure through. Reporting
    // it as an option said a player picks one off a list, which no surface in
    // the game does. It survives as declared institutional structure.
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = itemOf(`content.legislative-rule-packs/${pack.packId}`);
      expect(item.options.kind).toBe("undeclared");
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      for (const chamber of pack.chambers) {
        expect(attributeKeys).toContain(`chamber:${chamber.chamberKey}`);
        for (const stage of chamber.floorStages) {
          expect(attributeKeys).toContain(
            `floor-stage:${chamber.chamberKey}:${stage.stageKey}`,
          );
        }
      }
    }
  });

  it("does not offer an authored vote plan as a choice anybody makes", () => {
    // votePlan is how the seated members are authored to vote. It is data about
    // what the NPCs do, not a menu the player is given.
    for (const key of legislativeScenarioKeys()) {
      const blueprint = legislativeBlueprint(key);
      const item = itemOf(`content.legislative-measures/${key}`);
      expect(item.options.kind).toBe("undeclared");
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      for (const question of Object.keys(blueprint.votePlan)) {
        expect(attributeKeys).toContain(`vote-plan:${question}`);
      }
      // The executive disposition is an outcome the measure is written to
      // reach, not a link to further content.
      expect(item.followUps.kind).toBe("undeclared");
      expect(attributeKeys).toContain(
        `executive-disposition:${blueprint.governorAction}`,
      );
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

  it("claims no household-obligation follow-up for the public meeting", () => {
    // The link was invented. `household-obligation` appears nowhere in
    // src/presentation/ordinary-life.ts, and it was reported as a follow-up of
    // BOTH work items — which was plainly false of a public meeting somebody
    // can attend or skip.
    const meeting = itemOf(
      "content.ordinary-life/ordinary-life:public-meeting",
    );
    expect(meeting.followUps.kind).toBe("undeclared");
    expect(JSON.stringify(meeting)).not.toContain("household-obligation");
  });

  it("claims nothing for the ordinary week that the authored item does not say", () => {
    // OrdinaryLifeWorkItemDefinition declares a key, a title and a summary.
    // The formative gate, the assignment, the decision requirement and the
    // effort are all written by openOrdinaryLife from a world at creation
    // time — the same class of procedural fact as formative eligibility, and
    // held to the same rule.
    for (const definition of ORDINARY_LIFE_WORK_ITEMS) {
      const item = itemOf(`content.ordinary-life/${definition.key}`);
      expect(item.followUps.kind).toBe("undeclared");
      expect(item.lifeStages.kind).toBe("undeclared");
      expect(item.roles.kind).toBe("undeclared");
      expect(item.prerequisites.kind).toBe("undeclared");
      expect(item.requiredFacts.kind).toBe("undeclared");
      if (item.prerequisites.kind === "undeclared") {
        expect(item.prerequisites.reason).toContain("ordinaryLifeAvailableFor");
      }
      if (item.lifeStages.kind === "undeclared") {
        expect(item.lifeStages.reason).toContain("formativeIntervalAt");
      }
    }
  });

  it("declares a questionnaire item's bands whenever its source declares any", () => {
    // `eligibility.bands` is a SET on the source type. Every item in the bank
    // happens to name one band today, and nothing here asserts that: the rule
    // is that whatever the source declares is reported as declared, so an item
    // authored into two bands tomorrow stays declared and stays findable
    // rather than silently becoming undeclared and unreachable by either band.
    for (const authored of SETUP_QUESTIONNAIRE_BANK) {
      const item = itemOf(`content.setup-questionnaire/${authored.key}`);
      if (authored.eligibility.bands.length === 0) {
        expect(item.lifeStages.kind).toBe("undeclared");
        continue;
      }
      expect(item.lifeStages).toStrictEqual({
        kind: "declared",
        value: [...authored.eligibility.bands].sort(),
      });
      for (const band of authored.eligibility.bands) {
        const found = queryContentItems(index.items, { lifeStages: [band] });
        expect(
          found.map((candidate) => candidate.id),
          `${authored.key} is findable under ${band}`,
        ).toContain(item.id);
      }
    }
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

  it("reports an episode stage's own declared requirements", () => {
    // `stage.requires` is data — the bank's own header says so — and every
    // member of EpisodeRequirement names a role, an age, a capability, a fact
    // key or an earlier stage. Reading it is not evaluating it: nothing here
    // builds a world or asks whether a requirement holds.
    let sawOne = false;
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        const reported = new Set([
          ...declaredList(item.prerequisites).map((rule) => rule.key),
          ...declaredList(item.requiredFacts).map((rule) => rule.key),
        ]);
        for (const requirement of stage.requires) {
          sawOne = true;
          const prefix = `${requirement.kind}:`;
          expect(
            [...reported].some((key) => key.startsWith(prefix)),
            `${family.key}/${stage.key} reports its ${requirement.kind} requirement`,
          ).toBe(true);
        }
        if (stage.requires.length === 0) {
          expect(item.prerequisites.kind).toBe("undeclared");
        }
      }
    }
    expect(sawOne).toBe(true);
  });

  it("keeps a fact requirement apart from every other kind", () => {
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        const factKeys = stage.requires.flatMap((requirement) =>
          requirement.kind === "fact"
            ? [`fact:${requirement.fact}`]
            : requirement.kind === "absent"
              ? [`absent:${requirement.fact}`]
              : [],
        );
        expect(
          [...declaredList(item.requiredFacts)].map((rule) => rule.key).sort(),
        ).toStrictEqual([...factKeys].sort());
      }
    }
  });

  it("distinguishes two stages whose requirements differ", () => {
    // The point of reading requirements at all: two stages of one family must
    // not read identically when the bank wrote them differently.
    const requirementSets = new Map<string, string>();
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        const signature = [
          ...declaredList(item.prerequisites).map((rule) => rule.key),
          ...declaredList(item.requiredFacts).map((rule) => rule.key),
        ]
          .sort()
          .join("|");
        requirementSets.set(`${family.key}/${stage.key}`, signature);
      }
    }
    for (const family of EPISODE_FAMILIES) {
      for (const left of family.stages) {
        for (const right of family.stages) {
          if (left.key === right.key) continue;
          const sameSource =
            JSON.stringify([...left.requires].sort()) ===
            JSON.stringify([...right.requires].sort());
          if (sameSource) continue;
          expect(
            requirementSets.get(`${family.key}/${left.key}`),
            `${family.key}: ${left.key} and ${right.key} declare different requirements and must not read the same`,
          ).not.toBe(requirementSets.get(`${family.key}/${right.key}`));
        }
      }
    }
  });

  it("never labels a role an episode stage cannot open without as optional", () => {
    // Two things make a role required and both are read off the stage: a role
    // requirement, or a slot in the authored copy. substituteSlots throws on a
    // role the beat did not bind, so a named role is not optional.
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        const roles = declaredList(item.roles);
        const requiredByRule = stage.requires.flatMap((requirement) =>
          requirement.kind === "role" ||
          requirement.kind === "role-age-at-least"
            ? [requirement.role]
            : [],
        );
        for (const role of requiredByRule) {
          const reported = roles.find((candidate) => candidate.key === role);
          expect(
            reported,
            `${family.key}/${stage.key} reports ${role}`,
          ).toBeDefined();
          expect(
            reported!.required,
            `${family.key}/${stage.key} requires ${role}`,
          ).toBe(true);
        }
        const copy = [
          ...stage.lines,
          ...stage.options.flatMap((option) => [
            option.label,
            option.description,
            option.memory,
          ]),
        ].join(" ");
        for (const role of family.roles) {
          if (!copy.includes(`:${role}}`)) continue;
          const reported = roles.find((candidate) => candidate.key === role);
          expect(
            reported!.required,
            `${family.key}/${stage.key} names ${role} in its copy and cannot render without it`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps a role-age-at-least requirement from reading as a plain role", () => {
    // The whole reason that kind exists is that `role` was not enough: a young
    // sibling was cast as an independently mobile teenager. The age has to
    // survive into the index or the distinction is lost again.
    const aged = EPISODE_FAMILIES.flatMap((family) =>
      family.stages.flatMap((stage) =>
        stage.requires
          .filter((requirement) => requirement.kind === "role-age-at-least")
          .map((requirement) => ({ family, stage, requirement })),
      ),
    );
    expect(aged.length).toBeGreaterThan(0);
    for (const { family, stage, requirement } of aged) {
      if (requirement.kind !== "role-age-at-least") continue;
      const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
      expect(
        declaredList(item.prerequisites).map((rule) => rule.key),
      ).toContain(`role-age-at-least:${requirement.role}:${requirement.age}`);
    }
  });

  it("leaves every world-evaluated dimension unknown across the whole index", () => {
    // The rule the lane turns on, checked in one place. Reading a declarative
    // requirement off a bank is not the same as deciding whether it holds, and
    // nothing here decides: formative eligibility, a conversation's available
    // intents and the ordinary week's gate are all predicates over a world, and
    // all three stay undeclared with the reason naming where the rule runs.
    const formative = itemOf(
      `content.life-situations/${lifeSituationCatalog()[0]!.key}`,
    );
    expect(formative.requiredFacts.kind).toBe("undeclared");
    if (formative.requiredFacts.kind === "undeclared") {
      expect(formative.requiredFacts.reason).toContain(
        "formativeEligibilityProvider",
      );
    }
    const subject = itemOf(
      "content.conversation-subjects/household-obligation",
    );
    expect(subject.options.kind).toBe("undeclared");
    if (subject.options.kind === "undeclared") {
      expect(subject.options.reason).toContain("availableIntents");
    }
    const week = itemOf(
      "content.ordinary-life/ordinary-life:household-errands",
    );
    expect(week.prerequisites.kind).toBe("undeclared");

    // And no adapter reports an eligibility VERDICT anywhere: the index never
    // says a stage is or is not offered, only what the stage asks for.
    for (const item of index.items) {
      for (const rule of declaredList(item.prerequisites)) {
        expect(rule.key).not.toMatch(/^(eligible|ineligible|offered):/);
      }
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
      // Every band the item declares is declared, however many there are.
      expect(item.lifeStages).toStrictEqual({
        kind: "declared",
        value: [...authored.eligibility.bands].sort(),
      });
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

describe("no adapter reports a concept its source does not declare", () => {
  it("keeps questionnaire relationship and setting assumptions out of requiredFacts", () => {
    // The source is explicit that these "cannot be checked against records" and
    // exist "for the audit, countable". requiredFacts means records a WORLD must
    // already show, and the questionnaire runs before a world exists — so they
    // must not appear there.
    for (const authored of SETUP_QUESTIONNAIRE_BANK) {
      const item = itemOf(`content.setup-questionnaire/${authored.key}`);
      expect(item.requiredFacts.kind).toBe("undeclared");
    }
  });

  it("keeps those assumptions present as declared structure", () => {
    // Removed from requiredFacts, not lost: each declared relationship and
    // setting survives as an attribute.
    for (const authored of SETUP_QUESTIONNAIRE_BANK) {
      const item = itemOf(`content.setup-questionnaire/${authored.key}`);
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      for (const relationship of authored.eligibility.relationships) {
        expect(attributeKeys).toContain(`relationship:${relationship}`);
      }
      for (const setting of authored.eligibility.settings) {
        expect(attributeKeys).toContain(`setting:${setting}`);
      }
    }
  });

  it("keeps questionnaire agency as a real offering gate", () => {
    // agency is "what has to be true of the character for an item to be honest
    // to ask" — a genuine precondition checked against the setup — so it stays a
    // prerequisite. It is not a world fact, and is not in requiredFacts.
    for (const authored of SETUP_QUESTIONNAIRE_BANK) {
      const item = itemOf(`content.setup-questionnaire/${authored.key}`);
      if (authored.eligibility.agency.length === 0) continue;
      const prerequisiteKeys = declaredList(item.prerequisites).map(
        (rule) => rule.key,
      );
      for (const agency of authored.eligibility.agency) {
        expect(prerequisiteKeys).toContain(`agency:${agency}`);
      }
    }
  });

  it("does not claim an invented ContentRole for a rule pack", () => {
    // LegislativeRulePack declares chambers, an executive rule, a session — not
    // a role list. Its members and executive office are institutional structure.
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = itemOf(`content.legislative-rule-packs/${pack.packId}`);
      expect(item.roles.kind).toBe("undeclared");
      // The executive office is not lost: it stays as declared structure.
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      expect(attributeKeys).toContain(`executive:${pack.executive.titleLabel}`);
    }
  });

  it("does not claim a sponsor role a measure blueprint never declares", () => {
    // ScenarioBlueprint has no sponsor field; the scenario builder introduces a
    // sponsor at construction time. That is runtime behaviour, not a declared
    // role, so roles is undeclared and no role key mentions a sponsor.
    for (const key of legislativeScenarioKeys()) {
      const item = itemOf(`content.legislative-measures/${key}`);
      expect(item.roles.kind).toBe("undeclared");
      expect(JSON.stringify(item)).not.toContain('"sponsor"');
    }
  });

  it("does not call a measure's rule pack or jurisdiction a prerequisite", () => {
    // Which pack a measure runs through and which jurisdiction it is filed in
    // are intrinsic to what the measure IS, not gates that must independently
    // become true. They are declared structure, not prerequisites.
    for (const key of legislativeScenarioKeys()) {
      const blueprint = legislativeBlueprint(key);
      const item = itemOf(`content.legislative-measures/${key}`);
      expect(item.prerequisites.kind).toBe("undeclared");
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      expect(attributeKeys).toContain(`rule-pack:${blueprint.pack.packId}`);
      expect(attributeKeys).toContain(
        `jurisdiction:${blueprint.context.jurisdiction.slug}`,
      );
    }
  });

  it("keeps episode age bounds in prerequisites without duplicating them into lifeStages", () => {
    // An arbitrary numeric age bound is a declarative requirement, not a named
    // life-stage classification. The episode bank declares no band, so lifeStages
    // is undeclared everywhere, and every age bound is a prerequisite instead.
    let sawAgeBound = false;
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const item = itemOf(`content.episodes/${family.key}/${stage.key}`);
        expect(item.lifeStages.kind).toBe("undeclared");
        const prerequisiteKeys = declaredList(item.prerequisites).map(
          (rule) => rule.key,
        );
        for (const requirement of stage.requires) {
          if (requirement.kind === "age-at-least") {
            sawAgeBound = true;
            expect(prerequisiteKeys).toContain(
              `age-at-least:${requirement.age}`,
            );
          }
          if (requirement.kind === "age-below") {
            sawAgeBound = true;
            expect(prerequisiteKeys).toContain(`age-below:${requirement.age}`);
          }
        }
      }
    }
    expect(sawAgeBound).toBe(true);
  });

  it("reads life-situation casting only from the source's own needsCompanion", () => {
    // The adapter must not depend on companionRoleFor: the specific companion
    // part (peer, teacher, household-adult) comes from a presentation-layer
    // runtime mapping, not from lifeSituationCatalog, which the item names as its
    // source. So the adapter file imports nothing from formative-context, and no
    // indexed life-situation role carries a specialised key.
    const adapterSource = readFileSync(
      fileURLToPath(new URL("./life-situations.ts", import.meta.url)),
      "utf8",
    );
    // No import statement pulls from the presentation layer, and the runtime
    // mapping is never called. (The doc comment may name them to explain why
    // they are avoided, so match import/call syntax rather than the bare word.)
    const importLines = adapterSource
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line));
    for (const line of importLines) {
      expect(line).not.toContain("formative-context");
      expect(line).not.toContain("companionRoleFor");
    }
    expect(adapterSource).not.toContain("companionRoleFor(");

    const SPECIFIC_ROLES = ["peer", "teacher", "household-adult"];
    for (const situation of lifeSituationCatalog()) {
      const item = itemOf(`content.life-situations/${situation.key}`);
      for (const role of declaredList(item.roles)) {
        expect(SPECIFIC_ROLES).not.toContain(role.key);
      }
      // needsCompanion is preserved, both as a role (when true) and as the
      // needs-companion attribute (always).
      const attributeKeys = declaredList(item.attributes).map(
        (attribute) => attribute.key,
      );
      expect(attributeKeys).toContain(
        `needs-companion:${situation.needsCompanion}`,
      );
      if (situation.needsCompanion) {
        expect(declaredList(item.roles).map((role) => role.key)).toStrictEqual([
          "companion",
        ]);
      } else {
        expect(item.roles.kind).toBe("undeclared");
      }
      // Band, prose and options remain source-identical.
      expect(item.lifeStages).toStrictEqual({
        kind: "declared",
        value: [situation.band],
      });
      expect(item.summary).toBe(situation.prose);
      expect(
        declaredList(item.options).map((option) => option.key),
      ).toStrictEqual(situation.options.map((option) => option.key));
    }
  });

  it("leaves the formative runtime companion mapping untouched", () => {
    // The specific casting is still valid runtime behaviour where it belongs:
    // companionRoleFor keeps returning the specialised roles. The repair only
    // stops the declarative bank from surfacing them.
    expect(companionRoleFor("formative.lunch-table")).toBe("peer");
    expect(companionRoleFor("formative.teacher-mentor")).toBe("teacher");
    expect(companionRoleFor("formative.broken-object")).toBe("household-adult");
  });

  it("keeps a formative situation's band in lifeStages and not restated as a gate", () => {
    // The band is the declared life-stage classification. It belongs in
    // lifeStages, and must not also be reported as a prerequisite or an
    // attribute — one source field, one semantic home.
    for (const situation of lifeSituationCatalog()) {
      const item = itemOf(`content.life-situations/${situation.key}`);
      expect(item.lifeStages).toStrictEqual({
        kind: "declared",
        value: [situation.band],
      });
      const found = queryContentItems(index.items, {
        lifeStages: [situation.band],
      });
      expect(found.map((candidate) => candidate.id)).toContain(item.id);
      expect(JSON.stringify(declaredList(item.prerequisites))).not.toContain(
        `band:${situation.band}`,
      );
      expect(JSON.stringify(declaredList(item.attributes))).not.toContain(
        `band:${situation.band}`,
      );
    }
  });
});
