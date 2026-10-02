import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "./character-history";
import { campaigns } from "./campaign-queries";
import { doorKnockingReturn } from "./campaign-recognition";
import { requestedCampaignFieldGainBasisPoints } from "./campaigns";
import { addDays, ageOnDate, makeIsoDate } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import { recordRelationshipInteraction } from "./records";
import { pickDistinct, SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  CampaignActionResultRecord,
  EntityId,
  ElectionContestResultRecord,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

const seed = "a117-recorded-standing";
const [place] = pickDistinct(
  new SeededRng(seed),
  lifePlaceStateIdentities(),
  1,
);
const small = smallWorld({
  place: place!.jurisdictionKey,
  seed,
  people: 8,
  offices: ["governor"],
});
const base = fileForOffice(small.world, small.personId);
const campaign = campaigns(base).find(
  (row) => row.candidatePersonId === small.personId,
)!;
const residents = doorKnockingReturn(base, campaign).adultResidentIds;
const person = residents[0]!;
const read = (world: World) => doorKnockingReturn(world, campaign);

// Authored encounter controls written through the existing event/PEOPLE writers.
// They prove the reader, not natural canvass production or voter persuasion.
function contact(
  world: World,
  other: EntityId,
  key: string,
  tagged = true,
  candidatePresent = true,
) {
  let next = recordWorldEvent(world, {
    stableKey: key + ":event",
    type: "campaign.fixture-contact",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [small.personId, other],
    participants: [
      {
        personId: small.personId,
        role: candidatePresent ? "presence:participant" : "focus:subject",
        detail: "Explicit reader control",
      },
      {
        personId: other,
        role: "presence:participant",
        detail: "Explicit reader control",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["fixture:authored-contact"],
    summary: "Controlled campaign contact reader fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = recordRelationshipInteraction(next, {
    stableKey: key + ":contact",
    personIds: [small.personId, other],
    eventId: next.history.events.at(-1)!.id,
    occurredAt: next.currentDate,
    kind: "contact:met-at-party-event",
    change: "formed",
    significance: "minor",
    summary: "Explicit contact reader control.",
    tags: tagged ? ["campaign.contact"] : [],
  });
  return next;
}

describe(`recognition from recorded contacts (${place!.name}; seed ${seed})`, () => {
  it("has no invented recognition before recorded contacts and exposes its actual adult cohort", () => {
    expect(residents.length).toBeGreaterThan(1);
    expect(read(base)).toMatchObject({
      percent: 0,
      recognizedPersonIds: [],
      contactRecordIds: [],
      afternoonsBefore: 0,
      racesWonBefore: 0,
      basis: "recorded-campaign-contact-share/v1",
    });
    expect(new Set(residents).size).toBe(residents.length);
    for (const id of residents) {
      expect(id).not.toBe(small.personId);
      expect(base.people[id]!.homeJurisdictionId).toBe(campaign.jurisdictionId);
      expect(
        ageOnDate(base.people[id]!.birthDate, base.currentDate),
      ).toBeGreaterThanOrEqual(18);
    }
  });
  it("counts named residents once, exposes actual encounter rows, and changes the existing field consumer", () => {
    const met = contact(base, person, "recognition:first");
    expect(read(met).percent).toBe(100 / residents.length);
    expect(read(met).recognizedPersonIds).toEqual([person]);
    expect(read(met).contactRecordIds).toEqual([
      met.history.relationshipInteractions.at(-1)!.id,
    ]);
    const again = contact(met, person, "recognition:again");
    expect(read(again).percent).toBe(read(met).percent);
    expect(read(again).contactRecordIds).toHaveLength(2);
    const another = contact(again, residents[1]!, "recognition:second-person");
    expect(read(another).percent).toBe(200 / residents.length);
    expect(requestedCampaignFieldGainBasisPoints(base, campaign, 180, 1)).toBe(
      0,
    );
    expect(
      requestedCampaignFieldGainBasisPoints(another, campaign, 180, 1),
    ).toBeGreaterThan(0);
    expect(
      read({ ...another, personOrder: [...another.personOrder, ...residents] }),
    ).toEqual(read(another));
  });
  it("does not turn an untagged relationship or a mention into a campaign encounter", () => {
    const untagged = contact(base, person, "recognition:untagged", false);
    const mention = contact(
      untagged,
      residents[1]!,
      "recognition:mention",
      true,
      false,
    );
    expect(read(mention).percent).toBe(0);
    expect(read(mention).contactRecordIds).toEqual([]);
  });
  it("excludes children and adults outside the campaign's recorded resident cohort", () => {
    // The small scenario has adults only: use the existing person writer for
    // this explicit age control, without changing an existing person's state.
    const withChild = createCharacterHistoryContextPerson(base, {
      stableKey: "recognition:child-fixture",
      givenName: "Reader",
      familyName: "Child",
      birthDate: addDays(base.currentDate, -3650),
      homeJurisdictionId: campaign.jurisdictionId,
    });
    const child = characterHistoryContextPersonId(
      withChild,
      "recognition:child-fixture",
    );
    const outside = base.personOrder.find(
      (id) =>
        id !== small.personId &&
        base.people[id]!.homeJurisdictionId !== campaign.jurisdictionId &&
        ageOnDate(base.people[id]!.birthDate, base.currentDate) >= 18,
    )!;
    expect(child).toBeDefined();
    expect(outside).toBeDefined();
    const met = contact(
      contact(withChild, child, "recognition:child"),
      outside,
      "recognition:outside",
    );
    expect(read(met).percent).toBe(0);
  });
  it("reads dated encounters on their day and keeps the same result after Save/Continue", () => {
    const date = addDays(base.currentDate, 1);
    const tomorrow = {
      ...base,
      currentDate: date,
      currentMoment: { ...base.currentMoment, date },
    };
    const met = contact(tomorrow, person, "recognition:tomorrow");
    const earlier = {
      ...met,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
    };
    expect(read(earlier).percent).toBe(0);
    expect(read(met).percent).toBe(100 / residents.length);
    expect(read(deserializeWorld(serializeWorld(met)))).toEqual(read(met));
  });
  it("retains prior-win diagnostics without inventing a recognition bonus", () => {
    const own = base.history.electionContests!.find(
      (row) => row.id === campaign.contestId,
    )!;
    // Explicit result-shaped reader fixture; not proof of a naturally won race.
    const win: ElectionContestResultRecord = {
      id: own.id,
      stableKey: "recognition:prior-win",
      sequence: 0,
      contestId: small.personId,
      resolvedAt: makeIsoDate("2020-11-03"),
      winnerPersonId: small.personId,
      tallies: [],
      outcomeEventId: campaign.filingEventId,
      provenance: own.provenance,
    };
    const withWin = {
      ...base,
      history: {
        ...base.history,
        electionContestResults: [
          ...(base.history.electionContestResults ?? []),
          win,
        ],
      },
    };
    expect(read(withWin).racesWonBefore).toBe(1);
    expect(read(withWin).percent).toBe(read(base).percent);
  });
  it("excludes contacts attributed to the current action from prior recognition", () => {
    const met = contact(base, person, "recognition:current-action");
    const event = met.history.events.at(-1)!;
    // Explicit result-shaped exclusion control; event/contact rows are canonical.
    const result: CampaignActionResultRecord = {
      id: event.id,
      stableKey: "recognition:action-result",
      sequence: met.history.nextSequence,
      campaignActionId: campaign.filingEventId,
      completedAt: met.currentDate,
      outcomeEventId: event.id,
      resourceFlowId: null,
      resourceOutcomeId: null,
      raisedAmount: null,
      spentAmount: null,
      supportStateIds: [],
      observationId: event.id,
      feedbackEventId: event.id,
      feedbackKnowledgeId: event.id,
    };
    const attributed = {
      ...met,
      history: {
        ...met.history,
        campaignActionResults: [
          ...(met.history.campaignActionResults ?? []),
          result,
        ],
      },
    };
    expect(read(attributed).percent).toBe(100 / residents.length);
    expect(
      doorKnockingReturn(attributed, campaign, result.campaignActionId).percent,
    ).toBe(0);
  });
});
