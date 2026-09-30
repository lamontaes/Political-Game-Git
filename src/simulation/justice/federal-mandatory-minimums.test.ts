import { describe, expect, it } from "vitest";
import { openWatchedWorld } from "../../../scripts/dev-lab/world-aging";
import { prepareLawPair } from "../../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../../presentation/observer-world";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { makeIsoDate, ageOnDate } from "../dates";
import { recordWorldEvent, assertWorldIntegrity } from "../world";
import { jailTermOn } from "./jail-terms";
import {
  federalMinimumMonths,
  isFederalOffense,
  reviewFederalMinimumSentences,
  FEDERAL_MINIMUM_QUESTION,
} from "./federal-mandatory-minimums";
import { serializeWorld, deserializeWorld } from "../serialization";

describe("federal minima follow recorded offense facts", () => {
  it("does not turn a state offense into a federal case by a rate", () => {
    expect(
      isFederalOffense({
        cocaineGrams: 500,
        trafficking: true,
        interstateConduct: false,
        firearmInFurtherance: false,
      }),
    ).toBe(false);
    expect(
      isFederalOffense({
        cocaineGrams: 500,
        trafficking: true,
        interstateConduct: true,
        firearmInFurtherance: false,
      }),
    ).toBe(true);
  });
  it("releases an actual covered resident from the recorded retroactive sentence and preserves it on reopening", () => {
    const opened = openWatchedWorld("federal-minimum-release", "1700113");
    let base = ensureNationalElectionJurisdiction(opened.world);
    const person = base.personOrder
      .map((id) => base.people[id]!)
      .find(
        (p) =>
          p.birthDate &&
          ageOnDate(p.birthDate, base.currentDate) >= 30 &&
          ageOnDate(p.birthDate, base.currentDate) <= 55,
      )!;
    expect(person).toBeDefined();
    const facts = {
      cocaineGrams: 500,
      trafficking: true,
      interstateConduct: true,
      firearmInFurtherance: false,
    };
    expect(federalMinimumMonths(base, facts)).toBe(60);
    base = recordWorldEvent(base, {
      stableKey: "federal-release-fixture:sentence",
      type: "justice.sentenced",
      occurredAt: makeIsoDate("2022-01-05"),
      recordedAt: base.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [person.id],
      participants: [
        {
          personId: person.id,
          role: "focus:defendant",
          detail: "Defendant in controlled fictional federal case",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        "justice.sentence:jail",
        "justice.sentence-months:60",
        "justice.cocaine-grams:500",
        "justice.drug-trafficking",
        "justice.interstate-conduct",
      ],
      summary:
        "A controlled fictional resident was sentenced to 60 months for recorded interstate cocaine trafficking.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation:
          "Matched fictional sentence fixture; no actual person's guilt is inferred.",
        immediateReaction: null,
      },
    });
    const proposition = Object.values(base.policyCatalog.propositions).find(
      (p) => p.stableKey === FEDERAL_MINIMUM_QUESTION,
    )!;
    const pair = prepareLawPair(base, {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      propositionId: proposition.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
      policyTerms: [
        {
          questionKey: FEDERAL_MINIMUM_QUESTION,
          values: {
            drugMinimumMonths: 30,
            higherDrugMinimumMonths: 60,
            firearmMinimumMonths: 30,
            retroactive: 1,
          },
          reason:
            "Controlled statutory-minimum reduction with explicit retroactivity.",
          principleRecordIds: [],
        },
      ],
    });
    expect(jailTermOn(pair.control, person.id)).not.toBeNull();
    const treated = reviewFederalMinimumSentences(pair.treated);
    expect(jailTermOn(treated, person.id)).toBeNull();
    const review = treated.history.events.find(
      (e) => e.type === "justice.federal-sentence-reduced",
    )!;
    expect(review.tags).toContain("justice.months-removed:30");
    expect(review.context?.motivation).toContain("60 to 30");
    const reopened = deserializeWorld(serializeWorld(treated));
    expect(reviewFederalMinimumSentences(reopened)).toBe(reopened);
    expect(jailTermOn(reopened, person.id)).toBeNull();
    assertWorldIntegrity(reopened);
  }, 180000);
});
