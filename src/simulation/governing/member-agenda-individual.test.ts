import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { personName } from "../people";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { makeIsoDate } from "../dates";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { seatedCongressChamber } from "./congress-chambers";
import { agendaCaucus } from "./majority-agenda";
import { createFormationContext, recordPrinciples } from "../politics";
import { fileMemberAgendaBills } from "./member-agenda";
import { serializeWorld, deserializeWorld } from "../serialization";
import { principledLeaning } from "./officeholder-principles";
import { MEMBER_AGENDA_LEVEL_SETTINGS } from "./member-agenda-settings";

const receipts: unknown[] = [];

describe("individual member agendas", () => {
  it.each(["strong", "below-old-threshold"] as const)(
    "lets an actual minority member file without majority agreement: %s",
    (mode) => {
      const demo = createDemoWorld("minority-member-filing");
      let world = createWorld({
        seed: demo.seed,
        currentDate: makeIsoDate("2026-02-01"),
        people: demo.personOrder.map((id) => demo.people[id]!),
        jurisdictions: demo.jurisdictionOrder.map(
          (id) => demo.jurisdictions[id]!,
        ),
        policyCatalog: createProductionPolicyCatalog(),
      });
      world = ensureLivingWorldOpening(
        ensureNationalElectionJurisdiction(world),
        world.personOrder[0]!,
      );
      const members = seatedCongressChamber(world, "house")!.body.members;
      const majorityIds = new Set(
        agendaCaucus(members).map((member) => member.personId),
      );
      const minority = members.find(
        (member) =>
          member.personId &&
          member.partyKey &&
          !majorityIds.has(member.personId),
      )!;
      expect(minority).toBeDefined();
      world = recordPrinciples(
        world,
        members.flatMap((member) =>
          member.personId
            ? world.policyCatalog.principleOrder.map((principleId) => ({
                stableKey: `minority-filing:${member.personId}:${principleId}`,
                personId: member.personId!,
                principleId,
                formedAt: world.currentDate,
                stance: "endorses" as const,
                strength: member.personId === minority.personId ? 1 : 0,
                conviction: "settled" as const,
                flexibility: "firm" as const,
                qualification: null,
                formation: createFormationContext("experience:life", {
                  note: "Controlled saved convictions: one minority sponsor; other members below the unchanged filing threshold.",
                }),
                supersedesPrincipleRecordId: null,
              }))
            : [],
        ),
      );
      if (mode === "below-old-threshold") {
        const questions = world.policyCatalog.propositionOrder.filter((id) =>
          world.policyCatalog.issues[
            world.policyCatalog.propositions[id]!.issueId
          ]!.stableKey.startsWith("us-federal:"),
        );
        const strongest = Math.max(
          ...questions.map((id) =>
            Math.abs(principledLeaning(world, minority.personId!, id).score),
          ),
        );
        // Controlled saved convictions keep every federal score below the old gate.
        const strength = (3 + 1.575) / 2 / strongest;
        const held = world.history.principles.filter(
          (record) =>
            record.personId === minority.personId &&
            record.stableKey.startsWith("minority-filing:"),
        );
        world = recordPrinciples(
          world,
          held.map((record) => ({
            stableKey: `minority-calibrated:${record.principleId}`,
            personId: minority.personId!,
            principleId: record.principleId,
            formedAt: world.currentDate,
            stance: record.stance,
            strength,
            conviction: record.conviction,
            flexibility: record.flexibility,
            qualification: record.qualification,
            formation: createFormationContext("experience:life", {
              note: "Controlled saved weaker convictions; no filing quota or random sponsor.",
            }),
            supersedesPrincipleRecordId: record.id,
          })),
        );
        expect(
          Math.max(
            ...questions.map((id) =>
              Math.abs(principledLeaning(world, minority.personId!, id).score),
            ),
          ),
        ).toBeLessThan(3);
      }
      const input = {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        chamberKey: "house",
        intakeKey: "minority-filing",
      };
      const next = fileMemberAgendaBills(world, input);
      const bills = next.history.legislativeMeasures ?? [];
      expect(bills.length).toBeGreaterThan(0);
      for (const bill of bills) {
        expect(bill.sponsorPersonId).toBe(minority.personId);
        expect(majorityIds.has(bill.sponsorPersonId)).toBe(false);
        const answer = bill.propositionAnswers![0]!;
        const score = Math.abs(
          principledLeaning(world, minority.personId!, answer.propositionId)
            .score,
        );
        if (mode === "strong") expect(score).toBeGreaterThanOrEqual(3);
        else {
          expect(score).toBeGreaterThanOrEqual(
            MEMBER_AGENDA_LEVEL_SETTINGS.federal.filingThreshold,
          );
          expect(score).toBeLessThan(3);
        }
      }
      const reloaded = deserializeWorld(serializeWorld(next));
      expect(fileMemberAgendaBills(reloaded, input)).toBe(reloaded);
      const later = fileMemberAgendaBills(reloaded, {
        ...input,
        intakeKey: "later-intake",
      });
      const pendingQuestions = bills.flatMap((bill) => bill.propositionIds!);
      expect(
        (later.history.legislativeMeasures ?? []).filter((bill) =>
          bill.propositionIds!.some((id) => pendingQuestions.includes(id)),
        ),
      ).toEqual(bills);
      receipts.push({
        seed: world.seed,
        mode,
        personId: minority.personId,
        personName: personName(world.people[minority.personId!]!),
        partyKey: minority.partyKey,
        minority: true,
        filingThreshold: MEMBER_AGENDA_LEVEL_SETTINGS.federal.filingThreshold,
        bills: bills.map((bill) => ({
          id: bill.id,
          designation: bill.designation,
          introducedAt: bill.introducedAt,
          answers: bill.propositionAnswers,
          score: principledLeaning(
            world,
            minority.personId!,
            bill.propositionAnswers![0]!.propositionId,
          ).score,
          principleRecordIds: principledLeaning(
            world,
            minority.personId!,
            bill.propositionAnswers![0]!.propositionId,
          ).recordIds,
        })),
        repeatAndCanonicalReload: true,
        pendingQuestionCapPreserved: true,
        limits:
          "Controlled saved convictions in a real seated minority member; not natural formation, session throughput, passage or delivered effects.",
      });
      if (process.env.TEAM1_FILING_CALIBRATION_PROOF_PATH)
        writeFileSync(
          process.env.TEAM1_FILING_CALIBRATION_PROOF_PATH,
          JSON.stringify(receipts, null, 2) + "\n",
        );
    },
  );
});
