import { describe, it, expect, vi } from "vitest";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ensureJurisdiction } from "../../simulation/national-election-geography";
import {
  candidacyEligibility,
  electiveOfficesForJurisdiction,
} from "../../simulation/candidacy";
import * as candidacy from "../../simulation/candidacy";
import { namedSeatForFixture } from "../../../tests/fixtures/campaign-fixture";
import { municipalSeatChoices } from "../../simulation/municipal-seat-identity";
import {
  syncDistrictMembershipFromCanonicalHome,
  CONGRESSIONAL_HOME_JOIN_V1,
} from "../../simulation/district-residence";
import { fileCampaign } from "../../simulation/campaigns";
import { cancelFutureDueItem } from "../../simulation/future-transitions";
import { addDays, simulationMomentOnLocalDate } from "../../simulation/dates";
import * as compliance from "../../simulation/campaign-compliance";
import { canonicalStateJurisdictionId } from "../../simulation/state-jurisdiction-id";
import * as outlets from "../../simulation/press/outlets";
import * as contribution from "../../simulation/campaign-compliance-rules";
import * as native from "../../simulation/moguls";
import * as decisions from "../../simulation/decisions";
import * as press from "../../simulation/press/matters";
import {
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../../simulation/world";
import { recordEventKnowledge } from "../../simulation/records";
import { recordPublicPosition } from "../../simulation/politics";
import { recordGoalState } from "../../simulation/mind";
import * as resources from "../../simulation/resources";
import * as own from "./mogul-offers";
import { mogulFacts, type CommonMogulReply } from "./test-support/mogul-facts";
import type { World, EntityId } from "../../simulation/types";
function run(
  world: World,
  answer?: own.AnswerMogulOfferInput,
  deliverId?: EntityId,
) {
  const result = deliverId
      ? native.deliverMogulStance(world, deliverId)
      : answer
        ? native.answerMogulOffer(world, answer)
        : native.produceMogulOffers(world),
    expected = "world" in result ? result.world : result;
  const gen = deliverId
    ? own.deliverMogulStance(mogulFacts(world), deliverId)
    : answer
      ? own.answerMogulOffer(mogulFacts(world), answer)
      : own.produceMogulOffers(mogulFacts(world));
  let current = world,
    step = gen.next();
  writeWithWorldIntegrityOnce(world, () => {
    while (!step.done) {
      const r = step.value;
      let reply: CommonMogulReply | undefined;
      switch (r.kind) {
        case "recordWorldEvent":
          current = recordWorldEvent(current, r.input);
          break;
        case "recordEventKnowledge":
          current = recordEventKnowledge(current, r.input);
          break;
        case "recordDurableDecisionTrace":
          current = decisions.recordDurableDecisionTrace(current, r.input);
          break;
        case "recordPublicPosition":
          current = recordPublicPosition(current, r.input);
          break;
        case "recordGoalState":
          current = recordGoalState(current, r.input);
          break;
        case "createResourceFlow":
          current = resources.createResourceFlow(current, r.input);
          break;
        case "recordResourceTransferOutcome":
          current = resources.recordResourceTransferOutcome(current, r.input);
          break;
        case "evaluateDecision":
          reply = {
            kind: r.kind,
            value: decisions.evaluateDecision(current, r.input),
          };
          break;
        case "recordMisconductAct": {
          const value = press.recordMisconductAct(current, r.input);
          current = value.world;
          reply = { kind: r.kind, value };
          break;
        }
        case "openMatter": {
          const value = press.openMatter(current, r.input);
          current = value.world;
          reply = { kind: r.kind, value };
          break;
        }
        case "recordAllegation": {
          const value = press.recordAllegation(current, r.input);
          current = value.world;
          reply = { kind: r.kind, value };
          break;
        }
        case "fileComplaint": {
          const value = press.fileComplaint(current, r.input);
          current = value.world;
          reply = { kind: r.kind, value };
          break;
        }
      }
      step = gen.next(mogulFacts(current, reply));
    }
    return current;
  });
  expect(current).toEqual(expected);
  return current;
}
function qualifiedCampaign(world: World, person: EntityId, town: EntityId) {
  for (const id of world.personOrder)
    world = syncDistrictMembershipFromCanonicalHome(
      world,
      id,
      CONGRESSIONAL_HOME_JOIN_V1,
    );
  const choice = electiveOfficesForJurisdiction(town)
    .map((option) => {
      const districtBinding = namedSeatForFixture(
          world,
          person,
          option.officeKey,
        ),
        municipalSeatKey =
          municipalSeatChoices(world, person, option.officeKey).find(
            (r) => r.eligible,
          )?.key ?? null;
      return {
        option,
        districtBinding,
        municipalSeatKey,
        result: candidacyEligibility(world, {
          personId: person,
          jurisdictionId: town,
          officeKey: option.officeKey,
          alreadyACandidate: false,
          districtBinding,
          municipalSeatKey,
        }),
      };
    })
    .find((row) => row.result.eligible);
  if (!choice) return null;
  const input = {
    stableKey: "rules2:mogul:campaign",
    candidatePersonId: person,
    jurisdictionId: town,
    officeKey: choice.option.officeKey,
    districtBinding: choice.districtBinding,
    municipalSeatKey: choice.municipalSeatKey,
    electionDate: addDays(world.currentDate, 120),
    rivalPersonIds: [world.personOrder.find((id) => id !== person)!],
    existingContestId: null,
    committeeName: "Canonical campaign committee",
    donorPoolName: "Canonical campaign supporters",
    advertisingVendorName: "Canonical campaign vendor",
    staffPersonIds: [],
    treasuryCurrency: resources.makeCurrencyCode("USD"),
  };
  return { ...fileCampaign(world, input), choice, input };
}
describe.each(Object.keys(STATES))(
  "complete mogul public owner in US-%s",
  (usps) => {
    it("matches wealth/interest/committee/offer/decision/history/effect outputs with labeled upstream source controls", () => {
      const f = smallWorld({
        place: "US-" + usps,
        people: 8,
        date: "2026-01-05",
        seed: "rules2:moguls:" + usps,
      });
      run(f.world);
      const nativeCampaign = qualifiedCampaign(
        f.world,
        f.personId,
        f.jurisdictionId,
      );
      if (nativeCampaign) run(nativeCampaign.world);
      // A real eligible Colorado authority receipt supplies an explicitly labeled source control in every World; this does not establish eligibility, compliance or NPC activity in the original place.
      const reference = smallWorld({
          place: "US-CO",
          people: 8,
          date: "2026-01-05",
          seed: "rules2:mogul-authority-reference",
        }),
        legal = qualifiedCampaign(
          reference.world,
          reference.personId,
          reference.jurisdictionId,
        )!;
      expect(legal).toBeDefined();
      let base = ensureJurisdiction(
        f.world,
        smallWorldPlace("US-CO").context.jurisdiction,
      );
      const gate = vi
        .spyOn(candidacy, "candidacyEligibility")
        .mockReturnValue(legal.choice.result);
      let filed: ReturnType<typeof fileCampaign>;
      try {
        filed = fileCampaign(base, {
          ...legal.input,
          candidatePersonId: f.personId,
          stableKey: "rules2:mogul:controlled-campaign",
          rivalPersonIds: [base.personOrder.find((id) => id !== f.personId)!],
        });
      } finally {
        gate.mockRestore();
      }
      base = filed!.world;
      const mogul = base.personOrder.find((id) => id !== f.personId)!;
      const q = Object.values(base.policyCatalog.propositions)[0]!;
      base = resources.createResourcePosition(base, {
        stableKey: "rules2:mogul:wealth",
        owner: { kind: "person", personId: mogul },
        openedAt: base.currentDate,
        openingBalance: resources.money(200000000, "USD"),
        provenance: {
          kind: "authored",
          note: "Labeled canonical recorded wealth control",
        },
      });
      base = native.recordMogulInterest(base, {
        personId: mogul,
        propositionId: q.id,
        wants: "support",
        because: "Labeled canonical policy interest control",
      });
      base = recordPublicPosition(base, {
        stableKey: "rules2:mogul:alignment",
        personId: f.personId,
        propositionId: q.id,
        statedAt: base.currentDate,
        stance: "support",
        statement: "Labeled canonical aligned stance control",
        audience: "public",
        venue: null,
        sourceEventId: null,
        supersedesPublicPositionId: null,
      });
      run(base);
      const geography = vi
        .spyOn(outlets, "stateOfJurisdiction")
        .mockReturnValue(canonicalStateJurisdictionId("US-CO"));
      const pack = vi
          .spyOn(compliance, "campaignCompliancePackFor")
          .mockReturnValue(null),
        ruling = vi.spyOn(contribution, "assessContribution").mockReturnValue({
          decision: "unresolved",
          reason:
            "Labeled missing compiled compliance source, not an actual permission",
          citation: null,
          authorityUrl: null,
          obligation: null,
        });
      try {
        const offered = run(base);
        run(offered);
        expect(own.mogulOffers(mogulFacts(offered))).toEqual(
          native.mogulOffers(offered),
        );
        const offer = native.mogulOffers(offered)[0];
        expect(offer).toBeDefined();
        if (offer)
          run(offered, { offerEventId: offer.eventId, answer: "decline" });
        if (offer?.kind === "donation")
          run(offered, { offerEventId: offer.eventId, answer: "accept" });
        const source = offered.history.events.find(
          (e) => e.id === offer!.eventId,
        )!;
        const { id: sourceId, sequence: sourceSequence, ...input } = source;
        void sourceId;
        void sourceSequence;
        const dealWorld = recordWorldEvent(base, {
          ...input,
          stableKey: "rules2:mogul:saved-deal",
          tags: input.tags.map((tag) =>
            tag.startsWith("mogul.kind:") ? "mogul.kind:deal" : tag,
          ),
        });
        const deal = native
          .mogulOffers(dealWorld)
          .find((o) => o.kind === "deal")!;
        expect(deal).toBeDefined();
        const accepted = run(dealWorld, {
          offerEventId: deal.eventId,
          answer: "accept",
        });
        run(accepted, undefined, deal.eventId);
        let overdue = accepted;
        const date = addDays(overdue.currentDate, 91);
        for (const item of overdue.history.futureDueItems)
          if (item.dueAt < date)
            overdue = cancelFutureDueItem(overdue, {
              stableKey: item.stableKey + ":rules2-mogul-clock",
              dueItemId: item.id,
              effectiveAt: overdue.currentDate,
              reasonKey: "test:mogul-clock",
              context:
                "Labeled deal-review source date, not NPC clock activity.",
            });
        overdue = {
          ...overdue,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(
            overdue.currentMoment,
            date,
          ),
        };
        run(overdue);
      } finally {
        pack.mockRestore();
        ruling.mockRestore();
        geography.mockRestore();
      }
    }, 120000);
  },
);
