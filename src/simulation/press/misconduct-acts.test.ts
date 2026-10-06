import { describe, expect, it } from "vitest";

import { createScenarioWorld, makeCurrencyCode } from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { pressRecordsOfKind } from "./store";
import { MISCONDUCT_FAMILIES, MISCONDUCT_FAMILY_ROWS } from "./records";
import { recordMisconductAct } from "./matters";

describe("recordMisconductAct", () => {
  it.each(MISCONDUCT_FAMILIES)(
    "%s writes one occurrence and knowledge for exactly its participants",
    (family) => {
      const world = createScenarioWorld(
        `misconduct-act:${family}`,
        KENTUCKY_CONTEXT,
        { peopleCount: 3 },
      );
      const actorPersonId = world.personOrder[0]!;
      const participantPersonIds = world.personOrder.slice(0, 2);
      const row = MISCONDUCT_FAMILY_ROWS[family];
      const result = recordMisconductAct(world, {
        stableKey: `misconduct-act:${family}:occurrence`,
        family,
        actorPersonIds: [actorPersonId],
        participantPersonIds,
        flows:
          family === "M1" || family === "M4" || family === "M7"
            ? [
                {
                  flow: {
                    stableKey: `misconduct-act:${family}:flow`,
                    source: { kind: "person", personId: actorPersonId },
                    recipient: {
                      kind: "person",
                      personId: participantPersonIds[1]!,
                    },
                    startsAt: world.currentDate,
                    initialStatus: "active",
                    amount: {
                      minorUnits: 1,
                      currency: makeCurrencyCode("USD"),
                    },
                    cadenceKind: "schedule:one-time",
                    basisKind: "custom:campaign-expenditure",
                    basisReference: { kind: "general" },
                    restrictionKind: null,
                    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
                  },
                  outcome: null,
                },
              ]
            : [],
        artifacts: row.actArtifactKinds.map((evidenceKind, index) => ({
          stableKey: `misconduct-act:${family}:artifact:${index}`,
          evidenceKind,
          createdAt: world.currentDate,
          recordedAt: world.currentDate,
          access: "restricted",
          description: `${row.label} record left by the act.`,
        })),
        jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
        summary: `${row.label} was carried out.`,
        choice: row.label,
      });

      const occurrences = pressRecordsOfKind(
        result.world,
        "financial-occurrence",
      );
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0]).toMatchObject({
        family,
        actorPersonIds: [actorPersonId],
        dutyReference: row.dutyReference,
      });
      expect(row.dutySources.length).toBeGreaterThan(0);
      const artifactIds = new Set(occurrences[0]!.recordEvidenceArtifactIds);
      expect(
        result.world.history.evidenceArtifacts
          .filter((artifact) => artifactIds.has(artifact.id))
          .map((artifact) => artifact.evidenceKind)
          .sort(),
      ).toEqual([...row.actArtifactKinds].sort());
      expect(
        result.world.history.knowledge
          .filter((knowledge) => knowledge.eventId === result.event.id)
          .map((knowledge) => knowledge.personId)
          .sort(),
      ).toEqual([...participantPersonIds].sort());
      expect(result.event.visibility).toBe("private");
      expect(result.occurrence.occurrenceEventId).toBe(result.event.id);
    },
  );
});
