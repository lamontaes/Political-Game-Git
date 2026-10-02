import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { nationalPlacePlan } from "../../../scripts/engine-proof/places";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { DecisionEvaluation, EntityId, World } from "../types";
import { recordPrinciples, createFormationContext } from "../politics";
import { npcEligibleProgramConfigurations } from "../legislation-program-families";
import { considerationScore } from "../decisions";
import { personName } from "../people";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";
import { daysBetween } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { advanceWorld, advanceWithWorldIntegrityAtEnd } from "../world";
import {
  chiefOfStaffFor,
  currentGoverningOffices,
  currentPriority,
  decideGoverningMatter,
  governingMatterById,
  governingMatters,
  openTransitionMatters,
  staffRecommendation,
  evaluateAgendaPriority,
  GOVERNING_NPC_DECISION,
  governingNpcDecisionHandler,
} from "./state-governing";

const seed = "a92-recorded-agenda-priority";
const plan = nationalPlacePlan(seed, 56);

describe("A92 advice follows an actual saved agenda choice", () => {
  it("admits actual saved offices across all 56 seeded jurisdictions", () => {
    expect(plan.jurisdictions).toHaveLength(56);
    for (const row of plan.jurisdictions) {
      const fixture = smallWorld({
        place: row.placeKey,
        seed: row.seed,
        offices: ["governor"],
      });
      const office = currentGoverningOffices(fixture.world).find(
        (candidate) => candidate.stateUsps === fixture.stateUsps,
      );
      expect(office, row.jurisdictionKey).toBeDefined();
      expect(fixture.world.people[office!.holderPersonId]).toBeDefined();
      const opened = openTransitionMatters(fixture.world, office!.officeKey);
      const agenda = governingMatters(opened).find(
        (matter) =>
          matter.officeKey === office!.officeKey && matter.family === "agenda",
      )!;
      expect(agenda).toBeDefined();
      expect(staffRecommendation(opened, agenda)).toBeNull();
      const due = opened.history.futureDueItems.find(
        (item) =>
          item.transitionKey === GOVERNING_NPC_DECISION &&
          item.entityIds.includes(agenda.id),
      )!;
      const considered = governingNpcDecisionHandler(opened, due).world;
      const result = governingMatterById(considered, agenda.id)!;
      if (result.status === "decided") {
        const trace = considered.history.decisionTraces.find(
          (record) =>
            record.context.actorPersonId === office!.holderPersonId &&
            record.context.subject.key === agenda.stableKey,
        )!;
        expect(trace).toBeDefined();
        expect(trace.context.considerations.length).toBeGreaterThan(0);
        expect(
          trace.context.considerations.some((reason) =>
            reason.sourceRefs.some(
              (source) => source.kind === "political-principle",
            ),
          ),
        ).toBe(true);
      } else {
        expect(result.status).toBe("open");
        expect(result.decision).toBeNull();
      }
    }
  });

  for (const row of plan.watched.slice(0, 5)) {
    it(`preserves recorded priority advice through SaveContinue in ${row.jurisdictionKey}`, () => {
      const fixture = smallWorld({
        place: row.placeKey,
        seed: row.seed,
        offices: ["governor"],
      });
      const office = currentGoverningOffices(fixture.world).find(
        (candidate) => candidate.stateUsps === fixture.stateUsps,
      )!;
      expect(office).toBeDefined();
      const opened = openTransitionMatters(fixture.world, office.officeKey);
      const controlled: World = {
        ...opened,
        control: { kind: "person", personId: office.holderPersonId },
      };
      const chiefMatter = governingMatters(controlled).find(
        (matter) =>
          matter.officeKey === office.officeKey &&
          matter.family === "chief-of-staff",
      )!;
      const candidate = chiefMatter.options.find(
        (option) => option.personId !== null,
      )!;
      expect(candidate).toBeDefined();
      const hired = decideGoverningMatter(
        controlled,
        chiefMatter.id,
        candidate.key,
      );
      expect(hired.ok).toBe(true);
      expect(chiefOfStaffFor(hired.world, office)).toBe(candidate.personId);
      const agenda = governingMatters(hired.world).find(
        (matter) =>
          matter.officeKey === office.officeKey && matter.family === "agenda",
      )!;
      expect(agenda.status).toBe("open");
      expect(currentPriority(hired.world, office)).toBeNull();
      // Each branch selects a real option through the actual controlled writer.
      // Branches test different saved choices, not sequential revisions.
      for (const chosen of agenda.options.filter(
        (option) => option.key !== "priority:none",
      )) {
        const selected = decideGoverningMatter(
          hired.world,
          agenda.id,
          chosen.key,
        );
        expect(selected.ok).toBe(true);
        const savedMatter = governingMatterById(selected.world, agenda.id)!;
        expect(savedMatter.status).toBe("decided");
        expect(savedMatter.decision).not.toBeNull();
        expect(currentPriority(selected.world, office)).toBe(
          chosen.key.slice("priority:".length),
        );
        const saved = serializeWorld(selected.world);
        const advice = staffRecommendation(selected.world, savedMatter);
        expect(advice?.optionKey).toBe(chosen.key);
        expect(advice?.byPersonId).toBe(candidate.personId);
        expect(staffRecommendation(selected.world, savedMatter)).toEqual(
          advice,
        );
        expect(serializeWorld(selected.world)).toBe(saved);
        const continued = deserializeWorld(saved);
        const loadedMatter = governingMatterById(continued, agenda.id)!;
        expect(staffRecommendation(continued, loadedMatter)).toEqual(advice);
        expect(currentPriority(continued, office)).toBe(
          chosen.key.slice("priority:".length),
        );
        expect(openTransitionMatters(continued, office.officeKey)).toBe(
          continued,
        );
        expect(serializeWorld(continued)).toBe(saved);
      }
    });
  }
});

// Canonical bank search is fixture selection only. Every candidate is an
// explicitly authored saved view on an existing principle; production weights
// and the actual evaluation decide whether it is a uniquely positive choice.
describe("A92 actual NPC agenda callback from recorded chief principles", () => {
  for (const row of plan.watched.slice(0, 5)) {
    it(`records supported chief advice once in ${row.jurisdictionKey}`, () => {
      const fixture = smallWorld({
        place: row.placeKey,
        seed: `${row.seed}:npc`,
        offices: ["governor"],
      });
      const office = currentGoverningOffices(fixture.world).find(
        (candidate) => candidate.stateUsps === fixture.stateUsps,
      )!;
      expect(office).toBeDefined();
      const opened = openTransitionMatters(fixture.world, office.officeKey);
      const chiefMatter = governingMatters(opened).find(
        (matter) =>
          matter.officeKey === office.officeKey &&
          matter.family === "chief-of-staff",
      )!;
      const candidate = chiefMatter.options.find(
        (option) => option.personId !== null,
      )!;
      const hired = decideGoverningMatter(
        {
          ...opened,
          control: { kind: "person", personId: office.holderPersonId },
        },
        chiefMatter.id,
        candidate.key,
      );
      expect(hired.ok).toBe(true);
      const chiefId = chiefOfStaffFor(hired.world, office)!;
      expect(chiefId).toBe(candidate.personId);
      const base = ensureOfficeholderPrinciples(
        { ...hired.world, control: fixture.world.control },
        [office.holderPersonId, chiefId],
      );
      const agenda = governingMatters(base).find(
        (matter) =>
          matter.officeKey === office.officeKey && matter.family === "agenda",
      )!;
      const due = base.history.futureDueItems.find(
        (item) =>
          item.transitionKey === GOVERNING_NPC_DECISION &&
          item.entityIds.includes(agenda.id),
      )!;
      expect(due).toBeDefined();

      const authoredViews: {
        principleId: EntityId;
        stance: "endorses" | "rejects";
      }[][] = [];
      for (const declaration of npcEligibleProgramConfigurations()) {
        if (declaration.governmentLevel !== "state") continue;
        if (
          !agenda.options.some(
            (option) => option.key === `priority:${declaration.familyKey}`,
          )
        )
          continue;
        const question = Object.values(base.policyCatalog.propositions).find(
          (proposition) => proposition.stableKey === declaration.propositionKey,
        );
        const bearings = question?.principles ?? [];
        const aligned = bearings
          .filter((bearing) => (bearing.weight ?? 1) !== 0)
          .map((bearing) => ({
            principleId: bearing.principleId,
            stance: ((bearing.bearing === "consistent-with") ===
            (declaration.answer === "yes")
              ? "endorses"
              : "rejects") as "endorses" | "rejects",
          }));
        for (const view of aligned) {
          authoredViews.push([view]);
          authoredViews.push([
            {
              ...view,
              stance: view.stance === "endorses" ? "rejects" : "endorses",
            },
          ]);
        }
        if (aligned.length > 1) authoredViews.push(aligned);
      }
      let admitted: {
        world: World;
        evaluation: DecisionEvaluation;
        chosenKey: string;
        sourceIds: EntityId[];
      } | null = null;
      for (const [index, views] of authoredViews.entries()) {
        const uniqueViews = [
          ...new Map(views.map((view) => [view.principleId, view])).values(),
        ];
        const written = recordPrinciples(
          base,
          uniqueViews.map((view) => ({
            stableKey: `a92:authored-chief-view:${index}:${view.principleId}`,
            personId: chiefId,
            principleId: view.principleId,
            formedAt: base.currentDate,
            stance: view.stance,
            strength: 1,
            conviction: "settled" as const,
            flexibility: "firm" as const,
            qualification: null,
            formation: createFormationContext("reflection:test", {
              note: "Explicit fictional A92 chief view on an existing canonical principle.",
            }),
            supersedesPrincipleRecordId:
              base.history.principles
                .filter(
                  (record) =>
                    record.personId === chiefId &&
                    record.principleId === view.principleId,
                )
                .at(-1)?.id ?? null,
          })),
        );
        const evaluation = evaluateAgendaPriority(written, agenda, chiefId);
        if (!evaluation || evaluation.outcomeKind !== "selected") continue;
        const scores = evaluation.context.options.map((option) => ({
          key: option.key,
          value: evaluation.context.considerations
            .filter((reason) => reason.optionKey === option.key)
            .reduce((sum, reason) => sum + considerationScore(reason), 0),
        }));
        const selected = scores.find(
          (score) => score.key === evaluation.selectedOptionKey,
        )!;
        if (
          selected.value <= 0 ||
          scores.some(
            (score) =>
              score.key !== selected.key && score.value >= selected.value,
          )
        )
          continue;
        // Require actual callback choice to be chief-led, not an unrelated
        // uniquely supported holder choice from their independently saved life.
        const holderEvaluation = evaluateAgendaPriority(
          written,
          agenda,
          office.holderPersonId,
        );
        if (holderEvaluation) {
          const holderScores = holderEvaluation.context.options.map(
            (option) => ({
              key: option.key,
              value: holderEvaluation.context.considerations
                .filter((reason) => reason.optionKey === option.key)
                .reduce((sum, reason) => sum + considerationScore(reason), 0),
            }),
          );
          const holderSelected = holderScores.find(
            (score) => score.key === holderEvaluation.selectedOptionKey,
          );
          if (
            holderSelected &&
            holderSelected.value > 0 &&
            holderScores.every(
              (score) =>
                score.key === holderSelected.key ||
                score.value < holderSelected.value,
            ) &&
            holderSelected.key !== selected.key
          )
            continue;
        }
        const sourceIds = written.history.principles
          .filter(
            (record) =>
              record.personId === chiefId &&
              record.stableKey.startsWith(`a92:authored-chief-view:${index}:`),
          )
          .map((record) => record.id);
        const referenced = evaluation.context.considerations
          .flatMap((reason) => reason.sourceRefs)
          .some(
            (ref) =>
              ref.kind === "political-principle" &&
              sourceIds.includes(ref.principleRecordId),
          );
        if (!referenced) continue;
        admitted = {
          world: written,
          evaluation,
          chosenKey: selected.key,
          sourceIds,
        };
        break;
      }
      expect(
        admitted,
        `Canonical bank has no admitted unique view for ${row.jurisdictionKey}`,
      ).not.toBeNull();
      const input = admitted!.world;
      const advice = staffRecommendation(input, agenda);
      expect(advice?.optionKey).toBe(admitted!.chosenKey);
      const result = advanceWithWorldIntegrityAtEnd(
        () =>
          advanceWorld(
            input,
            daysBetween(input.currentDate, due.dueAt),
            createCampaignElectionTransitionRegistry(),
          ),
        input,
      );
      const decided = governingMatterById(result, agenda.id)!;
      expect(decided.status).toBe("decided");
      expect(currentPriority(result, office)).toBe(
        admitted!.chosenKey.slice("priority:".length),
      );
      const trace = result.history.decisionTraces.find(
        (record) =>
          record.context.actorPersonId === chiefId &&
          record.context.decisionType === "governing:agenda-priority" &&
          record.context.subject.key === agenda.stableKey,
      )!;
      expect(trace).toBeDefined();
      expect(trace.selectedOptionKey).toBe(admitted!.chosenKey);
      expect(trace.context.randomness).toBe("none");
      expect(
        trace.context.considerations
          .flatMap((reason) => reason.sourceRefs)
          .some(
            (ref) =>
              ref.kind === "political-principle" &&
              admitted!.sourceIds.includes(ref.principleRecordId),
          ),
      ).toBe(true);
      const adviceEvent = result.history.events.find(
        (event) =>
          event.type === "governing.staff-advice" &&
          event.tags.includes(`matter:${agenda.id}`),
      )!;
      expect(adviceEvent.tags).toContain(`decision-trace:${trace.id}`);
      expect(adviceEvent.tags).toContain(`choice:${admitted!.chosenKey}`);
      const saved = serializeWorld(result);
      expect(
        serializeWorld(governingNpcDecisionHandler(result, due).world),
      ).toBe(saved);
      const continued = deserializeWorld(saved);
      expect(
        serializeWorld(governingNpcDecisionHandler(continued, due).world),
      ).toBe(saved);
      expect(
        staffRecommendation(
          continued,
          governingMatterById(continued, agenda.id)!,
        )?.optionKey,
      ).toBe(admitted!.chosenKey);
      console.info(
        "A92 ordinary clock",
        JSON.stringify({
          seed: input.seed,
          place: fixture.place.displayName,
          state: row.jurisdictionKey,
          chief: personName(result.people[chiefId]!),
          holder: personName(result.people[office.holderPersonId]!),
          choice: admitted!.chosenKey,
          observedAt: result.currentDate,
          dueAt: due.dueAt,
          adviceEventId: adviceEvent.id,
          chiefTraceId: trace.id,
          principleSourceIds: admitted!.sourceIds,
          decisionEventId: decided.decision!.id,
        }),
      );
    });
  }
});
