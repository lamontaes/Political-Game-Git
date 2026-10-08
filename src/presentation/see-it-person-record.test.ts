import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeardOfficialViewsList } from "../player/HeardOfficialViewsList";
import { heardViewsHeldBy } from "../simulation/heard-official-views";
import { personName } from "../simulation/people";
import { recordEventKnowledge } from "../simulation/records";
import type { EntityId, World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { smallWorld } from "../../tests/fixtures/small-world";
import { observerPlace } from "./observer-world";
import { projectPersonDossier } from "./person-dossier";

/**
 * SEE-IT, person record: what the player was told about whom, on the record of
 * the person who said it and the record of the official it is about. The place
 * is drawn from all 56 by the seed, and the test names it.
 *
 * The told views are written in the shape `tellViewToHearers` saves for a
 * hearer (`official-views.ts:724`). The real route needs a person to form a
 * view through the reflection that AU4-07 is repairing, so this is edge-case
 * evidence, not a generated-world proof.
 */
const SEED = "see-it-person-record-1";
const place = observerPlace(SEED);
const small = smallWorld({ place: place.key, seed: SEED, people: 6 });
const playerId = small.personId;
const [teller, official, otherOfficial, stranger] = Object.keys(
  small.world.people,
).filter((id) => id !== playerId) as [EntityId, EntityId, EntityId, EntityId];

function tell(
  world: World,
  holder: EntityId,
  aboutOfficial: EntityId,
  position: "support" | "oppose",
  key: string,
): World {
  const withEvent = recordWorldEvent(world, {
    stableKey: `see-it-person-record:${key}:event`,
    type: "people.law-reflection",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [holder],
    participants: [{ personId: holder, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: ["people.official-view"],
    summary: "Thought over what a law did to them, and who was behind it.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordEventKnowledge(withEvent, {
    stableKey: `see-it-person-record:${key}:knowledge`,
    personId: playerId,
    eventId: withEvent.history.events.at(-1)!.id,
    learnedAt: world.currentDate,
    believedSummary: `told-view:${holder}:${aboutOfficial}:${position}`,
    accuracy: "accurate",
    confidence: "medium",
    source: { kind: "told-by", sourcePersonId: holder, claimId: null },
  });
}

describe(`what a neighbor told the player reaches the person record (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  const told = tell(
    tell(small.world, teller, official, "oppose", "blame"),
    teller,
    otherOfficial,
    "support",
    "credit",
  );

  it("lists, on the teller's record, each official they credited or blamed", () => {
    const dossier = projectPersonDossier(told, playerId, teller)!;
    expect(dossier.viewsTheyHold.map((view) => view.officialId).sort()).toEqual(
      [official, otherOfficial].sort(),
    );
    const blame = dossier.viewsTheyHold.find(
      (view) => view.officialId === official,
    )!;
    expect(blame).toMatchObject({
      holderId: teller,
      holderName: personName(told.people[teller]!),
      officialName: personName(told.people[official]!),
      position: "oppose",
      learnedAt: told.currentDate,
    });
    expect(
      dossier.viewsTheyHold.find((view) => view.officialId === otherOfficial)!
        .position,
    ).toBe("support");
    // The same views, read by the reader the directory already uses.
    expect(heardViewsHeldBy(told, playerId, teller)).toHaveLength(2);
  });

  it("lists, on the official's record, the people who credited or blamed them", () => {
    const dossier = projectPersonDossier(told, playerId, official)!;
    expect(dossier.viewsOfThem).toHaveLength(1);
    expect(dossier.viewsOfThem[0]).toMatchObject({
      holderId: teller,
      officialId: official,
      position: "oppose",
    });
    // Blaming one official says nothing about the other.
    expect(
      projectPersonDossier(told, playerId, otherOfficial)!.viewsOfThem[0],
    ).toMatchObject({ holderId: teller, position: "support" });
  });

  it("shows a person nobody told the player about nothing", () => {
    const dossier = projectPersonDossier(told, playerId, stranger)!;
    expect(dossier.viewsTheyHold).toEqual([]);
    expect(dossier.viewsOfThem).toEqual([]);
  });

  it("keeps the player's own record free of views they hold themselves", () => {
    const dossier = projectPersonDossier(told, playerId, playerId)!;
    expect(dossier.viewsTheyHold).toEqual([]);
  });

  it("shows nothing to an observer, who was told nothing", () => {
    const dossier = projectPersonDossier(told, playerId, teller, {
      observer: true,
    })!;
    expect(dossier.viewsTheyHold).toEqual([]);
    expect(dossier.viewsOfThem).toEqual([]);
  });

  it("renders each view as a name, the record's position word and a date", () => {
    const dossier = projectPersonDossier(told, playerId, teller)!;
    const html = renderToStaticMarkup(
      createElement(HeardOfficialViewsList, {
        views: dossier.viewsTheyHold,
        shows: "official",
        testid: "views-held",
        onSelectPerson: () => undefined,
      }),
    );
    expect(html).toContain('data-testid="views-held"');
    expect(html).toContain(
      `<strong>${personName(told.people[official]!)}</strong>`,
    );
    expect(html).toContain("<small>oppose</small>");
    expect(html).toContain("<small>support</small>");
    expect(html).toContain(`<time dateTime="${told.currentDate}">`);
    expect(html).not.toContain("told-view");
  });
});
