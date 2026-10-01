import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { addDays } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { courtFor } from "../judiciary/court-for";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import { pickDistinct, SeededRng } from "../rng";
import { personName } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import type { CourtCase } from "./court-reasoning";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_SENTENCED_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import {
  sentencingApplicabilityOf,
  sentencingApplicabilityTags,
} from "./sentencing-applicability";
import { sentencingRangeForCase } from "./sentencing-ranges";
import { sentencesOf, jailTermOn, SENTENCE_LIFE_TAG } from "./jail-terms";
import type { EntityId, World } from "../types";
import { projectLegalRecord } from "../../presentation/legal-record";
import { fileClemencyPetition } from "./clemency";
import { advanceProsecutions } from "./prosecution";

const SEED = "team9-a100-saved-court-finder-20261001";
let opened: World | null = null;
function world(): World {
  return (opened ??= openObserverWorld(observerSetup(SEED)).world);
}
const receipts: unknown[] = [];
let lifeCaseBase: { world: World; personId: EntityId; venue: EntityId } | null =
  null;
afterAll(() => {
  if (process.env.A103_PROOF_PATH)
    writeFileSync(
      process.env.A103_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

function caseFor(stateKey: string): CourtCase {
  const base = world();
  const court = courtFor(
    base,
    stateJurisdictionForKey(stateKey)!.id,
    "local-general-trial",
    "criminal",
  )!;
  return {
    caseKey: `range:${stateKey}`,
    defendantId: base.personOrder[0]!,
    offenseKey: "crime:robbery",
    offenseLabel: "robbery",
    evidence: "documentary",
    standingFindings: 1,
    venueJurisdictionId: court.jurisdictionId,
    stateKey,
  };
}

describe("recorded applicability and sourced sentencing options", () => {
  it("reads all 56 base robbery rows without turning missing facts into a grade", () => {
    for (const state of lifePlaceStateIdentities()) {
      const input = caseFor(state.jurisdictionKey);
      const range = sentencingRangeForCase(input);
      expect(range, state.jurisdictionKey).not.toBeNull();
      expect(range!.basis).toMatch(/SOURCED|ESTIMATED FROM AVERAGE/);
      expect(
        sentencingRangeForCase({ ...input, offenseKey: "crime:assault" }),
      ).toBeNull();
      expect(
        sentencingRangeForCase({ ...input, offenseKey: "crime:burglary" }),
      ).toBeNull();
    }
  }, 30_000);

  it("does not accept unsupported fact provenance or substitute findings for convictions", () => {
    const base = world();
    const person = base.personOrder[0]!;
    expect(() =>
      sentencingApplicabilityTags(base, person, [], {
        weapon: { value: true, sourceEventIds: ["event_missing" as never] },
      }),
    ).toThrow("actual case-basis");
    const referred = referForProsecution(base, {
      stableKey: "a103:no-prior-substitution",
      subjectPersonId: person,
      jurisdictionId: caseFor("US-IA").venueJurisdictionId,
      offenseKey: "crime:robbery",
      evidence: "documentary",
      standingFindings: 9,
      basisEventIds: [],
      referredBy: { kind: "police", label: "police", personId: null },
    });
    const referral = referred.world.history.events.find(
      (e) => e.id === referred.referralId,
    )!;
    expect(
      sentencingApplicabilityOf(referred.world, referral)
        .priorConvictionEventIds,
    ).toHaveLength(0);
    expect(
      sentencingApplicabilityOf(referred.world, referral).allegations,
    ).toEqual({});
  }, 30_000);

  const states = pickDistinct(
    new SeededRng(SEED),
    lifePlaceStateIdentities(),
    5,
  );
  for (const state of states)
    it(`saves an actual bounded term for the named defendant in ${state.jurisdictionKey}`, () => {
      let base = world();
      for (const item of base.history.futureDueItems)
        if (
          futureDueItemStateAt(base, item.id, currentLifeCutoff(base))
            ?.status === "scheduled"
        )
          base = cancelFutureDueItem(base, {
            stableKey: `a103-isolate:${item.id}`,
            dueItemId: item.id,
            effectiveAt: base.currentDate,
            reasonKey: "fixture:isolated-court",
            context:
              "Preserve commitments while isolating this saved sentencing case.",
          });
      const court = courtFor(
        base,
        stateJurisdictionForKey(state.jurisdictionKey)!.id,
        "local-general-trial",
        "criminal",
      )!;
      const person = base.personOrder.find(
        (id) =>
          !seatsForCourt(base, court.courtId).some(
            (seat) => seatHolderAt(base, seat.seatId)?.personId === id,
          ),
      )!;
      const referred = referForProsecution(base, {
        stableKey: `a103:${state.jurisdictionKey}`,
        subjectPersonId: person,
        jurisdictionId: court.jurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: { kind: "police", label: "police", personId: null },
      });
      const chargedAt = addDays(
        base.currentDate,
        UNRESEARCHED_PROSECUTION.chargeDecisionDays,
      );
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        chargedAt,
        createProsecutionTransitionRegistry(),
      );
      const plea = enterPlea(charged, {
        personId: person,
        referralId: referred.referralId,
        plea: "guilty",
      });
      expect(plea.ok).toBe(true);
      const trialAt = addDays(
        chargedAt,
        UNRESEARCHED_PROSECUTION.resolveAfterDays,
      );
      const sentenced = resolveFutureDueItemsThrough(
        plea.world,
        trialAt,
        createProsecutionTransitionRegistry(),
      );
      const events = sentenced.history.events.filter(
        (e) =>
          e.type === PROSECUTION_SENTENCED_EVENT &&
          e.tags.includes(`justice.referral:${referred.referralId}`),
      );
      expect(events).toHaveLength(1);
      const event = events[0]!;
      const term = sentencesOf(sentenced, person).find(
        (t) => t.sentencedEventId === event.id,
      )!;
      const range = sentencingRangeForCase({
        ...caseFor(state.jurisdictionKey),
        defendantId: person,
      })!;
      expect(event.tags).toContain(`justice.sentence-range:${range.rowId}`);
      expect(event.tags).toContain(`justice.sentence-basis:${range.basis}`);
      const decision = sentenced.history.decisionTraces.find((d) =>
        d.context.stableKey.endsWith(
          `a103:${state.jurisdictionKey}:custody-term`,
        ),
      );
      expect(decision).toBeDefined();
      expect(decision!.context.randomness).toBe("none");
      if (term.life) {
        expect(range.maxLife).toBe(true);
        expect(event.tags).toContain(SENTENCE_LIFE_TAG);
        expect(term.months).toBeNull();
        expect(term.until).toBeNull();
        expect(
          jailTermOn(sentenced, person, addDays(trialAt, 1000))
            ?.sentencedEventId,
        ).toBe(event.id);
      } else {
        expect(term.months).toBeGreaterThanOrEqual(range.minMonths);
        if (range.maxMonths !== null)
          expect(term.months).toBeLessThanOrEqual(range.maxMonths);
        const options = [
          range.minMonths,
          range.presumptiveMonths,
          range.maxMonths,
        ].filter((v): v is number => v !== null);
        expect(options).toContain(term.months);
      }
      if (term.months === 0) {
        const request = fileClemencyPetition(sentenced, {
          personId: person,
          sentencedEventId: event.id,
        });
        expect(request.ok).toBe(false);
        if (!request.ok)
          expect(request.reason).toContain("already been served");
      }
      const saved = deserializeWorld(serializeWorld(sentenced));
      assertWorldIntegrity(saved);
      expect(
        resolveFutureDueItemsThrough(
          saved,
          trialAt,
          createProsecutionTransitionRegistry(),
        ).history.events,
      ).toEqual(sentenced.history.events);
      if (state.jurisdictionKey === "US-MA")
        lifeCaseBase = {
          world: saved,
          personId: person,
          venue: court.jurisdictionId!,
        };
      receipts.push({
        seed: SEED,
        state: state.jurisdictionKey,
        personId: person,
        name: personName(sentenced.people[person]!),
        referralId: referred.referralId,
        sentence: event,
        term,
        range,
        decision,
      });
    }, 30_000);
  it("keeps an actual life sentence indefinite through priors, readers and SaveContinue", () => {
    expect(lifeCaseBase).not.toBeNull();
    const base = lifeCaseBase!;
    const referred = referForProsecution(base.world, {
      stableKey: "a103:life-from-saved-prior",
      subjectPersonId: base.personId,
      jurisdictionId: base.venue,
      offenseKey: "crime:robbery",
      evidence: "documentary",
      standingFindings: 6,
      basisEventIds: [],
      referredBy: { kind: "police", label: "police", personId: null },
    });
    const referral = referred.world.history.events.find(
      (e) => e.id === referred.referralId,
    )!;
    const applicability = sentencingApplicabilityOf(referred.world, referral);
    expect(applicability.priorConvictionEventIds).toHaveLength(1);
    const prior = referred.world.history.events.find(
      (e) => e.id === applicability.priorConvictionEventIds[0],
    )!;
    expect(prior.tags).toContain("justice.outcome:plea");
    const chargeAt = addDays(
      base.world.currentDate,
      UNRESEARCHED_PROSECUTION.chargeDecisionDays,
    );
    const charged = resolveFutureDueItemsThrough(
      referred.world,
      chargeAt,
      createProsecutionTransitionRegistry(),
    );
    const plea = enterPlea(charged, {
      personId: base.personId,
      referralId: referred.referralId,
      plea: "guilty",
    });
    expect(plea.ok).toBe(true);
    const trialAt = addDays(
      chargeAt,
      UNRESEARCHED_PROSECUTION.resolveAfterDays,
    );
    const sentenced = resolveFutureDueItemsThrough(
      plea.world,
      trialAt,
      createProsecutionTransitionRegistry(),
    );
    const event = sentenced.history.events.find(
      (e) =>
        e.type === PROSECUTION_SENTENCED_EVENT &&
        e.tags.includes(`justice.referral:${referral.id}`),
    )!;
    expect(event).toBeDefined();
    expect(event.tags).toContain(SENTENCE_LIFE_TAG);
    expect(
      event.tags.some((t) => t.startsWith("justice.sentence-months:")),
    ).toBe(false);
    const term = sentencesOf(sentenced, base.personId).find(
      (t) => t.sentencedEventId === event.id,
    )!;
    expect(term.life).toBe(true);
    expect(term.months).toBeNull();
    expect(term.until).toBeNull();
    expect(
      jailTermOn(sentenced, base.personId, addDays(trialAt, 1000))
        ?.sentencedEventId,
    ).toBe(event.id);
    const displayed = projectLegalRecord(
      sentenced,
      base.personId,
    ).sentences.find((s) => s.sentencedEventId === event.id)!;
    expect(displayed.term).toContain("life imprisonment");
    expect(displayed.term).toContain("no fixed end date");
    expect(displayed.servingNow).toBe(true);
    const saved = deserializeWorld(serializeWorld(sentenced));
    assertWorldIntegrity(saved);
    expect(advanceProsecutions(saved, referral.id).history.events).toEqual(
      saved.history.events,
    );
    receipts.push({
      seed: SEED,
      state: "US-MA",
      name: personName(saved.people[base.personId]!),
      prior,
      referral,
      applicability,
      sentence: event,
      term,
      displayed,
    });
  }, 30_000);
});
