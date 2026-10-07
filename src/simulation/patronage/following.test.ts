import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../../tests/fixtures/campaign-fixture";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { campaigns } from "../campaign-queries";
import { electionContestById } from "../election-contests";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { favorRecords, recordFavor } from "../favors";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, FavorKind, World } from "../types";
import { recordWorldEvent } from "../world";
import { townFollowing, townSupportFromFavors } from "./following";

const seed = "a117-patronage-recorded-help";
const place = drawRandomPlace(seed);
const small = smallWorld({
  place: place.key,
  people: 8,
  household: true,
  seed,
});
const base = fileForOffice(small.world, small.personId);
const candidate = small.personId;
const campaign = campaigns(base).find(
  (row) => row.candidatePersonId === candidate,
)!;
const town = campaign.jurisdictionId;
const adults = base.personOrder.filter(
  (id) =>
    id !== candidate &&
    ageOnDate(base.people[id]!.birthDate, base.currentDate) >= 18,
);
const debtor = adults[0]!;
const helper = adults[1]!;

// Explicit event/favor controls use the existing writers. They test the
// reader's contract, not natural campaign-help production or secret ballots.
function favor(
  world: World,
  key: string,
  giver: EntityId,
  receiver: EntityId,
  kind: FavorKind = "personal:help",
  campaignHelp = false,
  inReturnForFavorId: EntityId | null = null,
) {
  const next = recordWorldEvent(world, {
    stableKey: `fixture:${key}`,
    type: "fixture.helped",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [giver, receiver],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture"],
    summary: "One person helped another.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordFavor(next, {
    stableKey: `fixture:${key}:favor`,
    giverPersonId: giver,
    receiverPersonId: receiver,
    kind,
    description: "helped with the recorded work",
    givenAt: next.currentDate,
    eventId: next.history.events.at(-1)!.id,
    subject: campaignHelp
      ? { kind: "organization", organizationId: campaign.organizationId }
      : { kind: "none" },
    motive: "shared-belief",
    weight: giver === candidate ? "life-changing" : "slight",
    audience: "public",
    witnessPersonIds: [],
    inReturnForFavorId,
    undertakingId: null,
  });
}
const debt = () => favor(base, "debt", candidate, debtor);
const read = (world: World, date = world.currentDate) =>
  townFollowing(world, town, candidate, date);
const shift = (world: World, date = world.currentDate) =>
  townSupportFromFavors(world, town, candidate, date);

describe("patronage support reads completed campaign help instead of debt weights", () => {
  it("does not invent support from debt or household membership", () => {
    const world = debt();
    expect(read(world).debtors).toContain(debtor);
    expect(read(world).households).toContain(helper);
    expect(read(world).supporters).toEqual([]);
    expect(shift(world)).toBe(1);
  });
  it("counts one adult once despite repeated campaign-help records", () => {
    let world = favor(
      debt(),
      "field",
      helper,
      candidate,
      "political:campaign-volunteering",
      true,
    );
    world = favor(
      world,
      "donation",
      helper,
      candidate,
      "political:campaign-donation",
      true,
    );
    expect(read(world).supporters).toEqual([helper]);
    expect(read(world).supportRecordIds).toEqual(
      favorRecords(world)
        .slice(-2)
        .map((row) => row.id)
        .sort(),
    );
    expect(read(world).weighted).toBe(1);
    expect(shift(world)).toBe(1 + 1 / read(world).residents);
  });
  it("uses the actual adult share without a half-share cap", () => {
    let world = debt();
    const cohort = read(world).households;
    expect(cohort.length / read(world).residents).toBeGreaterThan(0.5);
    for (const id of cohort)
      world = favor(
        world,
        `backing:${id}`,
        id,
        candidate,
        "political:chapter-backing",
        true,
      );
    expect(read(world).weighted).toBe(cohort.length);
    expect(shift(world)).toBe(1 + cohort.length / read(world).residents);
    expect(shift(world)).toBeGreaterThan(1.5);
  });
  it("excludes ordinary favors and unbound campaign-shaped favors", () => {
    let world = favor(debt(), "ordinary", helper, candidate);
    world = favor(
      world,
      "unbound",
      helper,
      candidate,
      "political:campaign-volunteering",
    );
    expect(read(world).supporters).toEqual([]);
    expect(shift(world)).toBe(1);
  });
  it("excludes help recorded after the election cutoff", () => {
    const earlier = debt();
    const future = {
      ...earlier,
      currentDate: makeIsoDate(addDays(earlier.currentDate, 1)),
      currentMoment: {
        ...earlier.currentMoment,
        date: makeIsoDate(addDays(earlier.currentDate, 1)),
      },
    };
    const world = favor(
      future,
      "later",
      helper,
      candidate,
      "political:campaign-volunteering",
      true,
    );
    expect(read(world, earlier.currentDate).supporters).toEqual([]);
    expect(read(world).supporters).toEqual([helper]);
  });
  it("requires an outstanding patronage debt instead of all campaign helpers", () => {
    let world = favor(
      base,
      "no-debt",
      helper,
      candidate,
      "political:campaign-volunteering",
      true,
    );
    expect(shift(world)).toBe(1);
    world = debt();
    const original = favorRecords(world).at(-1)!.id;
    world = favor(
      world,
      "repaid",
      debtor,
      candidate,
      "personal:help",
      false,
      original,
    );
    world = favor(
      world,
      "backed",
      helper,
      candidate,
      "political:chapter-backing",
      true,
    );
    expect(read(world).debtors).toEqual([]);
    expect(shift(world)).toBe(1);
  });
  it("does not carry completed campaign backing into a later race", () => {
    const world = favor(
      debt(),
      "old-campaign",
      helper,
      candidate,
      "political:campaign-volunteering",
      true,
    );
    const date = makeIsoDate(
      addDays(electionContestById(world, campaign.contestId)!.electionDate, 1),
    );
    const later = {
      ...world,
      currentDate: date,
      currentMoment: { ...world.currentMoment, date },
    };
    expect(read(later).supporters).toEqual([]);
    expect(shift(later)).toBe(1);
  });
  it("preserves the world and reads the same canonical records after reload", () => {
    const world = favor(
      debt(),
      "saved",
      helper,
      candidate,
      "political:campaign-volunteering",
      true,
    );
    const saved = serializeWorld(world);
    const expected = read(world);
    expect(serializeWorld(world)).toBe(saved);
    expect(read(deserializeWorld(saved))).toEqual(expected);
    expect(expected.residents).toBe(adults.length);
  });
});
