import { describe, expect, it, vi } from "vitest";
import * as capReader from "./member-filing-caps";
const actualMemberFilingCap = capReader.memberFilingCap;
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
const filingCases = statePlaces.map((place) => ({ place, mode: "strong" }));

describe("admitted member caps in the existing filer", () => {
  it.each(filingCases)(
    "applies bound caps and preserves unread-limit explanations: $place",
    ({ place }) => {
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
      const authoredRow = {
        place: pack.jurisdictionKey,
        chamber: "joint" as const,
        limit: 1,
        period: "session" as const,
        exempts: [],
        applied: true,
        exemptionBindings: [
          { kind: "period" as const, window: "session" as const },
        ],
        status: "sourced" as const,
        citation: "Authored cap integration control",
        url: "https://example.com/test-rule",
        quote: "One controlled bill per member per session.",
        note: "Fictional test input, not researched production data.",
      };
      const spy = vi.spyOn(capReader, "memberFilingCap");
      const useRow = (row: capReader.MemberBillLimitRow) =>
        spy.mockImplementation((measures, context) =>
          actualMemberFilingCap(measures, context, {
            version: "member-bill-limits-2026-v1",
            rows: [row],
          }),
        );
      try {
        useRow({ ...authoredRow, limit: 0 });
        const stopped = fileMemberAgendaBills(world, input);
        expect(stopped.history.legislativeMeasures ?? []).toHaveLength(0);

        useRow(authoredRow);
        const admitted = fileMemberAgendaBills(world, input);
        const bills = admitted.history.legislativeMeasures!;
        expect(bills).toHaveLength(1);
        expect(bills[0]!.sponsorPersonId).toBe(minority.personId);
        const continued = deserializeWorld(serializeWorld(admitted));
        expect(fileMemberAgendaBills(continued, input)).toBe(continued);
        const later = fileMemberAgendaBills(continued, {
          ...input,
          intakeKey: "capped-later",
        });
        expect(later.history.legislativeMeasures).toEqual(bills);

        useRow({
          ...authoredRow,
          limit: 0,
          applied: false,
          unboundExemptions: ["Unrecorded special-bill exemption."],
          notAppliedReason: "limit not applied: exemption unread",
          quote: "A controlled exception that has no recorded binding.",
        });
        const unread = fileMemberAgendaBills(world, input);
        expect(unread.history.legislativeMeasures).toHaveLength(1);
        const explanation = unread.history.events.filter(
          (event) =>
            event.type === "legislation.member-filing-limit-not-applied",
        );
        expect(explanation).toHaveLength(1);
        expect(explanation[0]!.summary).toBe(
          "limit not applied: exemption unread",
        );
        expect(explanation[0]!.participants[0]!.personId).toBe(
          minority.personId,
        );
        expect(explanation[0]!.context.choice).toBe(
          "A controlled exception that has no recorded binding.",
        );
        const reloadedUnread = deserializeWorld(serializeWorld(unread));
        expect(fileMemberAgendaBills(reloadedUnread, input)).toBe(
          reloadedUnread,
        );
        receipts.push({
          seed: world.seed,
          place,
          placeSelectionSeed: "team1-distinct-member-intakes",
          personId: minority.personId,
          personName: personName(world.people[minority.personId!]!),
          filingThreshold: settings.filingThreshold,
          capZeroBills: 0,
          authoredLimit: 1,
          actualBillIds: bills.map((bill) => bill.id),
          repeatAndCanonicalReload: true,
          laterIntakeStillCapped: true,
          unreadBillIds: unread.history.legislativeMeasures!.map(
            (bill) => bill.id,
          ),
          explanationEventId: explanation[0]!.id,
          limits:
            "Controlled saved principles and authored cap input; no natural filing count or researched state limit inferred.",
        });
        if (process.env.TEAM1_CAP_READER_PROOF_PATH)
          writeFileSync(
            process.env.TEAM1_CAP_READER_PROOF_PATH,
            JSON.stringify(receipts, null, 2) + "\n",
          );
      } finally {
        spy.mockRestore();
      }
    },
  );
});
