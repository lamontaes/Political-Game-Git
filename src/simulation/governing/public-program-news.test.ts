import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  FIXTURE,
  NO_ACTION,
} from "../../../tests/fixtures/public-program-fixture";
import { addDays } from "../dates";
import { introduceMeasure } from "../legislation";
import { legislatureForState } from "../legislature-game-profile";
import { createOrganization } from "../life";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../nationwide-world/state-executives";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import type { EntityId, World } from "../types";
import { PROGRAM_FAMILIES, programFamilyTitle } from "./program-families";
import {
  PUBLIC_PROGRAM_INSTALLMENT,
  commitPublicProgram,
  declareProgramCapacity,
  programCommitments,
  programPosition,
  recordProgramAppropriation,
} from "./public-program";

const seen = new Set<string>();
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `public-program-news:${index}`;
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      candidate.stateJurisdictionKey !== null &&
      !seen.has(candidate.stateJurisdictionKey),
  );
  seen.add(place.stateJurisdictionKey!);
  return { seed, place };
});
const RAW_PROGRAM_KEY = /\b[\w-]+:us-[a-z]{2}\b/i;
const FAMILY = PROGRAM_FAMILIES.find(
  (family) => family.familyKey !== "appropriations",
)!;

function officialFixture(
  seed: string,
  place: (typeof samples)[number]["place"],
) {
  const fixture = smallWorld({ place: place.key, seed });
  let world = ensureStateExecutiveIncumbent(
    fixture.world,
    fixture.personId,
    fixture.stateUsps,
  );
  const official = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === fixture.stateUsps,
  );
  expect(official).toBeDefined();
  if (!official)
    throw new Error(
      "The canonical incumbent writer did not establish an executive.",
    );
  world = ensurePublicGovernmentAccount(world, {
    kind: "jurisdiction",
    jurisdictionId: fixture.stateJurisdictionId,
  });
  const account = publicTaxAccountForJurisdiction(
    world,
    fixture.stateJurisdictionId,
  )!;
  expect(account).toBeDefined();
  return { ...fixture, world, official, account };
}

function capacity(
  world: World,
  programKey: string,
  jurisdictionId: EntityId,
  serviceLabel: string,
  edition: string,
) {
  return declareProgramCapacity(world, {
    edition,
    programKey,
    jurisdictionId,
    publicGovernmentIdentity: { kind: "jurisdiction", jurisdictionId },
    serviceLabel,
    unitLabel: "service units",
    unitsTotal: 2,
    unitsOperational: 1,
    monthlyOperatingNeed: money(100, "USD"),
    completedPermille: null,
    restorationCostPerUnit: money(100, "USD"),
    basis: FIXTURE,
  }).world;
}

function appropriation(
  world: World,
  fixture: ReturnType<typeof officialFixture>,
  programKey: string,
  sourceMeasureId?: EntityId,
) {
  return recordProgramAppropriation(world, {
    edition: "news-fixture",
    programKey,
    jurisdictionId: fixture.stateJurisdictionId,
    accountOrganizationId: fixture.account.organizationId,
    amount: money(100_000, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 30),
    basis: FIXTURE,
    ...(sourceMeasureId ? { sourceMeasureId } : {}),
  });
}

function decide(
  world: World,
  fixture: ReturnType<typeof officialFixture>,
  appropriationId: EntityId,
  programKey: string,
) {
  const result = commitPublicProgram(world, {
    appropriationId,
    alternative: NO_ACTION,
    personId: fixture.official.personId,
    office: { kind: "state-executive" },
    recipientOrganizationId: null,
  });
  if (!result.ok) throw new Error(result.reason);
  const commitment = programCommitments(result.world, programKey).find(
    (record) => record.id === result.recordId,
  )!;
  const event = result.world.history.events.find(
    (record) => record.id === commitment.eventId,
  )!;
  expect(event.summary).not.toMatch(RAW_PROGRAM_KEY);
  return { world: result.world, commitment, event };
}

describe.each(samples)(
  "public-program news in $place.displayName (seed $seed)",
  ({ seed, place }) => {
    it("uses the appropriation identity's actual service label, preserving zero budget records and refusing replay", () => {
      const fixture = officialFixture(seed, place);
      const programKey = `appropriations:${place.stateJurisdictionKey!.toLowerCase()}`;
      let world = capacity(
        fixture.world,
        programKey,
        fixture.stateJurisdictionId,
        "Recorded state bus service",
        "right-identity",
      );
      world = capacity(
        world,
        programKey,
        fixture.jurisdictionId,
        "Competing local label",
        "other-identity",
      );
      const adopted = appropriation(world, fixture, programKey);
      const before = programPosition(adopted.world, programKey, adopted.id);
      const result = decide(adopted.world, fixture, adopted.id, programKey);
      expect(result.event.summary).toContain("Recorded state bus service");
      expect(result.event.summary).not.toContain("Competing local label");
      expect(result.commitment.alternativeTitle).toBe(NO_ACTION.title);
      expect(result.event.summary).toMatch(/^Decided not to commit money/);
      expect(programPosition(result.world, programKey, adopted.id)).toEqual(
        before,
      );
      expect(result.world.history.resourcePositions).toEqual(
        adopted.world.history.resourcePositions,
      );
      expect(result.world.history.resourceTransferOutcomes).toEqual(
        adopted.world.history.resourceTransferOutcomes,
      );
      expect(result.world.history.futureDueItems).toEqual(
        adopted.world.history.futureDueItems,
      );
      const loaded = deserializeWorld(serializeWorld(result.world));
      const repeated = commitPublicProgram(loaded, {
        appropriationId: adopted.id,
        alternative: NO_ACTION,
        personId: fixture.official.personId,
        office: { kind: "state-executive" },
        recipientOrganizationId: null,
      });
      expect(repeated.ok).toBe(false);
      expect(repeated.world).toBe(loaded);
      expect(programCommitments(loaded, programKey)).toEqual(
        programCommitments(result.world, programKey),
      );
      expect(
        loaded.history.events.find((event) => event.id === result.event.id),
      ).toEqual(result.event);
    });

    it("uses an actual saved source measure title when no service label exists", () => {
      const fixture = officialFixture(seed, place);
      const pack = legislatureForState(place.stateJurisdictionKey!);
      if (!pack)
        throw new Error(
          `No canonical legislature pack for source-measure fixture in ${place.displayName}.`,
        );
      const chamber = pack.chambers.find(
        (candidate) => candidate.introductionAllowed,
      )!;
      const world = introduceMeasure(fixture.world, {
        stableKey: "fixture:program-source",
        jurisdictionId: fixture.stateJurisdictionId,
        rulePackId: pack.packId,
        designation: "Fixture 1",
        shortTitle: "Recorded regional service plan",
        summary:
          "Authored source-measure title control, not enacted program authority.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: chamber.chamberKey,
      });
      const source = world.history.legislativeMeasures!.at(-1)!;
      const programKey = `appropriations:${place.stateJurisdictionKey!.toLowerCase()}`;
      const adopted = appropriation(world, fixture, programKey, source.id);
      const result = decide(adopted.world, fixture, adopted.id, programKey);
      expect(result.event.summary).toContain(source.shortTitle);
      expect(result.commitment.appropriationId).toBe(adopted.id);
    });

    it("falls back to a specific program family and omits unknown or generic program phrases", () => {
      const fixture = officialFixture(seed, place);
      const programKey = `${FAMILY.familyKey}:${place.stateJurisdictionKey!.toLowerCase()}`;
      const adopted = appropriation(fixture.world, fixture, programKey);
      expect(
        decide(adopted.world, fixture, adopted.id, programKey).event.summary,
      ).toContain(programFamilyTitle(FAMILY.familyKey)!);
      for (const family of ["appropriations", "unrecognized-fixture"]) {
        const key = `${family}:${place.stateJurisdictionKey!.toLowerCase()}`;
        // A capacity belonging to another actual jurisdiction must not supply this label.
        const competing = capacity(
          fixture.world,
          key,
          fixture.jurisdictionId,
          "Wrong place's service",
          `competing:${family}`,
        );
        const generic = appropriation(competing, fixture, key);
        const result = decide(generic.world, fixture, generic.id, key);
        expect(result.event.summary).not.toContain("Wrong place's service");
        expect(result.event.summary).not.toContain(" for ");
        expect(result.commitment.alternativeTitle).toBe(NO_ACTION.title);
        expect(result.event.summary).toMatch(/^Decided not to commit money/);
      }
    });

    it("keeps actual nonzero money, alternative title, saved IDs, and installment scheduling", () => {
      const fixture = officialFixture(seed, place);
      const programKey = `appropriations:${place.stateJurisdictionKey!.toLowerCase()}`;
      let world = capacity(
        fixture.world,
        programKey,
        fixture.stateJurisdictionId,
        "Recorded repair service",
        "nonzero",
      );
      world = createOrganization(world, {
        stableKey: "fixture:recipient",
        formedAt: world.currentDate,
        provenance: { kind: "authored", note: FIXTURE.note },
        initialProfile: {
          name: "Fixture service operator",
          classification: "sector:private",
          locationJurisdictionId: fixture.stateJurisdictionId,
        },
      });
      const recipient = world.history.organizations.at(-1)!;
      const adopted = appropriation(world, fixture, programKey);
      const alternative = {
        key: "repair",
        title: "One recorded repair payment",
        installments: [
          {
            afterDays: 1,
            amount: money(12_345, "USD"),
            purpose: "maintenance" as const,
          },
        ],
        deliveryLeadDays: 1,
      };
      const result = commitPublicProgram(adopted.world, {
        appropriationId: adopted.id,
        alternative,
        personId: fixture.official.personId,
        office: { kind: "state-executive" },
        recipientOrganizationId: recipient.id,
      });
      if (!result.ok) throw new Error(result.reason);
      const commitment = programCommitments(result.world, programKey).find(
        (record) => record.id === result.recordId,
      )!;
      const event = result.world.history.events.find(
        (record) => record.id === commitment.eventId,
      )!;
      expect(event.summary).toContain("$123.45");
      expect(event.summary).toContain(alternative.title);
      expect(event.summary).not.toMatch(RAW_PROGRAM_KEY);
      expect(commitment).toMatchObject({
        programKey,
        appropriationId: adopted.id,
        alternativeKey: alternative.key,
        decidedByPersonId: fixture.official.personId,
        recipientOrganizationId: recipient.id,
      });
      expect(commitment.installments).toEqual([
        {
          dueAt: addDays(world.currentDate, 1),
          amount: alternative.installments[0]!.amount,
          purpose: "maintenance",
        },
      ]);
      expect(
        result.world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === PUBLIC_PROGRAM_INSTALLMENT &&
            item.provenance.kind === "simulated" &&
            item.provenance.sourceEntityIds.includes(event.id),
        )?.dueAt,
      ).toBe(addDays(world.currentDate, 1));
      expect(
        programCommitments(
          deserializeWorld(serializeWorld(result.world)),
          programKey,
        ),
      ).toEqual(programCommitments(result.world, programKey));
    });
  },
);
