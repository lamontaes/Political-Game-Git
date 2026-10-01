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
import { stateJurisdictionForKey } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { seatedChamberForPack } from "./chamber-votes";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { SeededRng, pickDistinct } from "../rng";
import {
  legislativeRulePackForWorld,
  regularSessionRefusalText,
} from "../legislative-procedure-world";

const receipts: unknown[] = [];
const statePlaces = pickDistinct(
  new SeededRng("team1-distinct-member-intakes"),
  US_STATE_USPS,
  5,
);
const filingCases = [
  { place: null, mode: "strong" },
  { place: null, mode: "below-old-threshold" },
  ...statePlaces.map((place) => ({ place, mode: "strong" })),
] as const;

describe("individual member agendas", () => {
  it.each(filingCases)(
    "lets an actual minority member file distinct bills without majority agreement: $place / $mode",
    ({ place, mode }) => {
      const demo = createDemoWorld("minority-member-filing");
      // Fresh controlled fixture dates only: no local clock/year advancement.
      // State cases start in 2027; the saved regular-session gate is asserted below.
      const filingYear = place ? 2027 : 2026;
      let world = createWorld({
        seed: demo.seed,
        currentDate: makeIsoDate(`${filingYear}-02-01`),
        people: demo.personOrder.map((id) => demo.people[id]!),
        jurisdictions: [
          ...demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
          ...(place ? [stateJurisdictionForKey(`US-${place}`)!] : []),
        ],
        policyCatalog: createProductionPolicyCatalog(),
      });
      world = ensureLivingWorldOpening(
        ensureNationalElectionJurisdiction(world),
        world.personOrder[0]!,
      );
      const jurisdictionId = place
        ? stateJurisdictionForKey(`US-${place}`)!.id
        : NATIONAL_ELECTION_JURISDICTION.id;
      const pack = legislativePackForJurisdiction(jurisdictionId)!;
      const chamberKey = pack.chamberOrder[0]!;
      if (place) {
        world = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
          political: generatePoliticalStartingConditions,
        });
        world = ensureStateLegislatureOpening(
          world,
          world.personOrder[0]!,
          place,
        );
      }
      const members = place
        ? seatedChamberForPack(
            world,
            pack.packId,
            chamberKey,
            pack.chambers[0]!.name,
          )!.body.members
        : seatedCongressChamber(world, "house")!.body.members;
      const settings = place
        ? MEMBER_AGENDA_LEVEL_SETTINGS.state
        : MEMBER_AGENDA_LEVEL_SETTINGS.federal;
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
      expect(
        regularSessionRefusalText(
          legislativeRulePackForWorld(world, pack.packId),
          world.currentDate,
        ),
      ).toBeNull();
      const input = {
        jurisdictionId,
        chamberKey,
        intakeKey: "minority-filing",
      };
      const next = fileMemberAgendaBills(world, input);
      const bills = next.history.legislativeMeasures ?? [];
      expect(bills.length).toBeGreaterThan(1);
      expect(new Set(bills.map((bill) => bill.stableKey)).size).toBe(
        bills.length,
      );
      expect(new Set(bills.flatMap((bill) => bill.propositionIds!)).size).toBe(
        bills.length,
      );
      for (const bill of bills) {
        expect(bill.sponsorPersonId).toBe(minority.personId);
        expect(majorityIds.has(bill.sponsorPersonId)).toBe(false);
        const answer = bill.propositionAnswers![0]!;
        const score = Math.abs(
          principledLeaning(world, minority.personId!, answer.propositionId)
            .score,
        );
        expect(score).toBeGreaterThanOrEqual(settings.filingThreshold);
        // Preserve the original strong-case check on the leading proposal; the new
        // distinct proposals also include scores admitted by the calibrated gate.
        if (mode === "strong" && bill === bills[0])
          expect(score).toBeGreaterThanOrEqual(3);
        if (mode === "below-old-threshold") expect(score).toBeLessThan(3);
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
        place: place ?? "US Congress",
        placeSelectionSeed: "team1-distinct-member-intakes",
        jurisdictionId,
        chamberKey,
        mode,
        personId: minority.personId,
        personName: personName(world.people[minority.personId!]!),
        partyKey: minority.partyKey,
        minority: true,
        filingThreshold: settings.filingThreshold,
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
