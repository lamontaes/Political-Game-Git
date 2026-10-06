import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import type { EntityId, World } from "../types";
import {
  currentPriority,
  considerExecutiveOrderCondition,
  decideGoverningMatter,
  enforcementPriorityForLaw,
  governingMatters,
  governorOfficeForJurisdiction,
  openDelegatedRuleDraftMatters,
  openTransitionMatters,
  orderDelegatedRuleDrafts,
} from "./state-governing";

describe("executive priority drives delegated drafting", () => {
  it("moves the chosen rule ahead on a generated governor's desk", () => {
    const seed = "session38-priority-drives-desk-new-game-20261006";
    const opening = smallWorld({
      place: "US-NH",
      seed,
      offices: ["governor", "state-legislature"],
    });
    const office = governorOfficeForJurisdiction(opening.world, "US-NH");
    expect(office).not.toBeNull();
    if (!office) throw new Error("No governor desk was generated.");
    let world: World = {
      ...opening.world,
      control: { kind: "person" as const, personId: office.holderPersonId },
    };
    world = openTransitionMatters(world, office.officeKey);
    const agenda = governingMatters(world, office.officeKey).find(
      (matter) => matter.family === "agenda" && matter.status === "open",
    );
    const staff = governingMatters(world, office.officeKey).find(
      (matter) =>
        matter.family === "chief-of-staff" && matter.status === "open",
    );
    if (staff?.options[0]) {
      const hired = decideGoverningMatter(
        world,
        staff.id,
        staff.options[0].key,
      );
      expect(hired.ok).toBe(true);
      world = hired.world;
    }
    expect(agenda).toBeDefined();
    if (!agenda) throw new Error("The governor has no priority matter.");
    const chosen = agenda.options.find(
      (option) =>
        option.key.startsWith("priority:") && option.key !== "priority:none",
    );
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error("No agenda option can set a priority.");
    const decision = decideGoverningMatter(world, agenda.id, chosen.key);
    expect(decision.ok).toBe(true);
    world = decision.world;
    const priority = currentPriority(world, office);
    expect(priority).toBe(chosen.key.slice("priority:".length));
    const implementation = governingMatters(world, office.officeKey).find(
      (matter) =>
        matter.family === "implementation" && matter.status === "open",
    );
    if (implementation?.options[0]) {
      const directed = decideGoverningMatter(
        world,
        implementation.id,
        implementation.options[0].key,
      );
      expect(directed.ok).toBe(true);
      world = directed.world;
    }

    const drafts = [
      { subjectKey: "health", measureId: "measure-health" },
      { subjectKey: priority!, measureId: "measure-priority" },
      { subjectKey: "housing", measureId: "measure-housing" },
    ];
    const ordered = orderDelegatedRuleDrafts(world, office.officeKey, drafts);
    expect(ordered[0]?.subjectKey).toBe(priority);
    expect(enforcementPriorityForLaw(world, office.officeKey, priority!)).toBe(
      "first",
    );
    expect(
      enforcementPriorityForLaw(world, office.officeKey, "another-topic"),
    ).toBe("lowest");
    const sourceEventId = world.history.events.at(-1)!.id;
    const openedRules = openDelegatedRuleDraftMatters(world, office.officeKey, [
      {
        instance: "other-rule",
        subjectKey: "other-topic",
        title: "another rule",
        sourceEventId,
        measureId: "measure-other-rule" as EntityId,
      },
      {
        instance: "priority-rule",
        subjectKey: priority!,
        title: "the priority rule",
        sourceEventId,
        measureId: "measure-priority-rule" as EntityId,
      },
    ]);
    const openedRegulations = governingMatters(
      openedRules,
      office.officeKey,
    ).filter((matter) => matter.family === "regulation");
    expect(openedRegulations[0]?.subjectKey).toBe(priority);
    const npcWorld: World = {
      ...world,
      control: { kind: "observer" },
    };
    const conditionSource = world.history.events.find(
      (event) =>
        event.type === "governing.matter-decided" &&
        event.tags.includes(`matter:${agenda.id}`),
    )!.id;
    const npcDecision = considerExecutiveOrderCondition(
      npcWorld,
      office.officeKey,
      {
        instance: "priority-condition",
        subject: "the office's first priority",
        subjectKey: priority!,
        sourceEventId: conditionSource,
        principleAnswers: [],
      },
    );
    const npcMeasure = npcDecision.history.legislativeMeasures?.find(
      (measure) => measure.governmentInstrument === "executive-order",
    );
    expect(npcMeasure).toBeDefined();
    const npcMatter = governingMatters(npcDecision, office.officeKey).find(
      (matter) =>
        matter.family === "executive-order" && matter.status === "decided",
    );
    expect(npcMatter?.decision?.tags).toContain("decided-by:officeholder");
    console.info(
      "Priority desk proof",
      JSON.stringify({
        seed,
        place: "US-NH",
        office: office.officeKey,
        matterId: agenda.id,
        choice: chosen.key,
        priority,
        draftsBefore: drafts.map((draft) => draft.subjectKey),
        draftsAfter: ordered.map((draft) => draft.subjectKey),
        npcConditionEventId: conditionSource,
        npcOrderMatterId: npcMatter?.id,
        npcOrderDecisionId: npcMatter?.decision?.id,
        npcMeasureId: npcMeasure?.id,
      }),
    );
  });
});
