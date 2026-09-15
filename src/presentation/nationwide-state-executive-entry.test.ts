import { afterEach, describe, expect, it } from "vitest";
import {
  US_STATE_USPS,
  bindRuleCapabilityResolver,
  candidacyEligibility,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import type { EntityId, RuleCapabilityResolver, World } from "../simulation";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { receiveExecutiveWork } from "../simulation/executive-work";
import { receiveExecutiveWorkIfCurrentOffice } from "../simulation/incident-response";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
} from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

function adultLifeIn(usps: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: firstLocality(usps).key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function runToElection(world: World, personId: EntityId): World {
  let next = world;
  for (
    let day = 0;
    day < 40 && projectCampaign(next, personId).phase === "active";
    day += 1
  )
    next = passOrdinaryDays(next);
  return next;
}

function passUntil(world: World, date: string): World {
  let next = world;
  while (next.currentDate < date) next = passOrdinaryDays(next);
  return next;
}

/** Test fixture only. Not a sourced term rule for any state. */
const FIXTURE_TERM_FACTS: RuleCapabilityResolver = (request) => ({
  ...unadmittedRuleCapabilityResolver(request),
  refusal: null,
  fields: request.fields.map((field) =>
    field === "term.years" || field === "term.start"
      ? {
          field,
          state: "ADMITTED" as const,
          value:
            field === "term.years"
              ? 4
              : {
                  kind: "reference-start",
                  referenceStart: "2022-03-01",
                  cycleYears: 4,
                },
          ruleScope: "state-constitution" as const,
          ruleVersion: "test-fixture-not-law-v1",
          validFrom: null,
          validThrough: null,
          source: null,
          reason: "Test fixture only; not a sourced rule.",
        }
      : unadmittedRuleCapabilityResolver({ ...request, fields: [field] })
          .fields[0]!,
  ),
});

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

const outcomes: Record<string, string> = {};

describe("NATIONWIDE ordinary state executive entry, current composition data", () => {
  it.each([...US_STATE_USPS])(
    "%s: filing, a real contest and the honest term outcome, through reopen",
    (usps) => {
      const { world, personId } = adultLifeIn(usps, `nationwide-entry-${usps}`);
      const identity = stateExecutiveIdentity(usps)!;
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      expect(candidacy.identity.officeKey).toBe(identity.officeKey);

      if (!candidacy.eligible) {
        // Refused with the RULES sentence, and nothing is written.
        expect(candidacy.blocks.length).toBeGreaterThan(0);
        expect(() => fileForStateExecutiveOffice(world, personId)).toThrow(
          candidacy.blocks[0]!.reason,
        );
        outcomes[usps] = `refused:${candidacy.blocks[0]!.kind}`;
        return;
      }

      const filed = fileForStateExecutiveOffice(world, personId);
      expect(projectCampaign(filed, personId).phase).toBe("active");
      expect(stateExecutiveEntryStatus(filed, personId).kind).toBe(
        "pending-election",
      );

      const decided = runToElection(filed, personId);
      const status = stateExecutiveEntryStatus(decided, personId);
      const phase = projectCampaign(decided, personId).phase;
      expect(["won", "lost"]).toContain(phase);
      // Never occupied on election night, whoever won.
      expect(
        decided.history.workRelationships.some(
          (relationship) => relationship.kind === "employment:executive-office",
        ),
      ).toBe(false);
      if (phase === "lost") {
        expect(status.kind).toBe("lost");
        outcomes[usps] = "lost";
      } else {
        expect(status.kind).toBe("won-term-unavailable");
        if (status.kind === "won-term-unavailable") {
          expect(status.missing.length).toBeGreaterThan(0);
          outcomes[usps] = `won; missing ${status.missing.join(",")}`;
        }
      }

      // The opening governor still holds the office.
      expect(
        currentPublicOfficeholders(decided).find(
          (holder) => holder.officeKey === identity.officeKey,
        )?.personId,
      ).not.toBe(personId);

      const reopened = deserializeWorld(serializeWorld(decided));
      expect(stateExecutiveEntryStatus(reopened, personId)).toEqual(status);
      expect(() => qualifyForStateExecutiveTerm(reopened, personId)).toThrow(
        /no planned state executive term/,
      );
    },
    60_000,
  );

  it("refuses another state's governorship as living elsewhere", () => {
    const { world, personId } = adultLifeIn("NV", "nationwide-entry-wrong");
    const kentucky = stateExecutiveIdentity("KY")!;
    const eligibility = candidacyEligibility(world, {
      personId,
      jurisdictionId: stateJurisdictionForKey("US-KY")!.id,
      officeKey: kentucky.officeKey,
      alreadyACandidate: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blocks.map((block) => block.kind)).toContain(
      "lives-elsewhere",
    );
  });

  it("reports the per-state outcome summary", () => {
    console.info(`[nationwide-entry outcomes] ${JSON.stringify(outcomes)}`);
    expect(Object.keys(outcomes)).toHaveLength(50);
  });
});

/** A campaign actually won on the shared clock; seeds are tried, results are never supplied. */
function wonKentuckyCampaign() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { world, personId } = adultLifeIn(
      "KY",
      `nationwide-dated-${attempt}`,
    );
    let next = fileForStateExecutiveOffice(world, personId);
    next = spendAnAfternoon(next, personId, "fundraising");
    for (let day = 0; day < 3; day += 1) {
      next = passOrdinaryDays(next);
      next = spendAnAfternoon(next, personId, "outreach");
    }
    next = runToElection(next, personId);
    if (projectCampaign(next, personId).phase === "won")
      return { world: next, personId, attempt };
  }
  throw new Error("No tried seed produced a simulated Kentucky win.");
}

describe("NATIONWIDE ordinary state executive entry once term facts are admitted (test fixture, not law)", () => {
  it("won contest -> dated term -> qualification -> entry -> governed action -> reopen", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    const { world, personId, attempt } = wonKentuckyCampaign();
    console.info(
      `[nationwide-entry dated route] won on seed attempt ${attempt}`,
    );
    const kentucky = stateExecutiveIdentity("KY")!;

    const planned = stateExecutiveEntryStatus(world, personId);
    expect(planned.kind).toBe("awaiting-qualification");
    if (planned.kind !== "awaiting-qualification") return;
    expect(planned.startsAt).toBe("2026-03-01");
    expect(planned.endsAt).toBe("2030-03-01");
    expect(planned.qualificationBlocks).toEqual([]);
    expect(resolveExecutiveOffice(world)).toBeNull();

    // Control: without recorded qualification the term is not entered.
    const unqualified = passUntil(world, planned.startsAt);
    expect(resolveExecutiveOffice(unqualified)).toBeNull();
    expect(stateExecutiveEntryStatus(unqualified, personId).kind).toBe(
      "term-over-or-not-entered",
    );

    const qualified = qualifyForStateExecutiveTerm(world, personId);
    expect(stateExecutiveEntryStatus(qualified, personId).kind).toBe(
      "qualified-awaiting-entry",
    );
    expect(qualifyForStateExecutiveTerm(qualified, personId)).toBe(qualified);

    const entered = passUntil(qualified, planned.startsAt);
    expect(stateExecutiveEntryStatus(entered, personId).kind).toBe("in-office");
    const office = resolveExecutiveOffice(entered)!;
    expect(office.origin).toBe("elected-term");
    expect(office.pack.office.officeKey).toBe(kentucky.officeKey);
    expect(office.relationship.startedAt).toBe(planned.startsAt);
    const holder = currentPublicOfficeholders(entered).find(
      (record) => record.officeKey === kentucky.officeKey,
    )!;
    expect(holder.personId).toBe(personId);
    expect(holder.startedAt).toBe(planned.startsAt);

    // A governed action through the office the ordinary route produced.
    const reopened = deserializeWorld(serializeWorld(entered));
    expect(resolveExecutiveOffice(reopened)?.relationship.id).toBe(
      office.relationship.id,
    );
    const outcome = reopened.history.events.find(
      (event) =>
        event.type === "election.contest-resolved" &&
        event.jurisdictionId === office.jurisdictionId,
    )!;
    const governed = receiveExecutiveWork(
      reopened,
      outcome.id,
      "Transition briefing",
      outcome.summary,
    );
    const inboxKey = `executive-inbox:${office.relationship.id}:${outcome.id}`;
    expect(
      governed.history.workItems.filter((item) => item.stableKey === inboxKey),
    ).toHaveLength(1);
    // Receiving again is the same work, not a second item.
    expect(
      receiveExecutiveWork(
        governed,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(governed);
    // Control: the same public event gives a non-holder nothing.
    expect(
      receiveExecutiveWorkIfCurrentOffice(
        unqualified,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(unqualified);
  }, 240_000);

  it("a lost contest never produces a term for the loser", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { world, personId } = adultLifeIn(
        "KY",
        `nationwide-lost-${attempt}`,
      );
      const decided = runToElection(
        fileForStateExecutiveOffice(world, personId),
        personId,
      );
      if (projectCampaign(decided, personId).phase !== "lost") continue;
      expect(stateExecutiveEntryStatus(decided, personId).kind).toBe("lost");
      expect(() => qualifyForStateExecutiveTerm(decided, personId)).toThrow();
      expect(
        resolveExecutiveOffice(passUntil(decided, "2026-03-02")),
      ).toBeNull();
      return;
    }
    throw new Error("No tried seed produced a simulated Kentucky loss.");
  }, 240_000);
});
