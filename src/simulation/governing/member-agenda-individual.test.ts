import { describe, expect, it } from "vitest";
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

describe("individual member agendas", () => {
  it("lets an actual minority member file without majority agreement", () => {
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
        member.personId && member.partyKey && !majorityIds.has(member.personId),
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
      expect(
        Math.abs(
          principledLeaning(world, minority.personId!, answer.propositionId)
            .score,
        ),
      ).toBeGreaterThanOrEqual(3);
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
  });
});
