import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  agreementsKnownTo,
  mediaOutlets,
  peopleSpokenWith,
  pressRecordsOfKind,
  reporterRoles,
} from "../simulation/press";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import {
  agreePressTerms,
  projectDisclosure,
  tellReporter,
} from "./press-disclosure";

/**
 * CRUNCH47 B2: taking something to a reporter. Terms first, in the exact words
 * of the arrangement; then only what the player actually holds.
 */

function life(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  return {
    player: game.playerPersonId,
    world: openOrdinaryLife(game.world, game.playerPersonId),
  };
}

describe("PEOPLE B2: the player's side of a disclosure", () => {
  const { player, world } = life("press-disclose-a");
  const view = projectDisclosure(world, player);

  /**
   * CRUNCH47, answering A: the list is every reporter at every outlet, because
   * anybody can write to a newspaper and requiring an acquaintance would model
   * the world worse. Having met one is a fact shown about them, never a
   * condition of reaching them.
   */
  it("lists every reporter, and says which of them the character has met", () => {
    expect(view.contacts.length).toBeGreaterThan(0);
    // Nobody is filtered out for being a stranger.
    const listed = view.contacts.map((contact) => contact.reporterPersonId);
    const everyReporter = mediaOutlets(world)
      .flatMap((outlet) => reporterRoles(world, outlet.id))
      .map((role) => role.personId)
      .filter((id) => id !== player);
    for (const reporterId of everyReporter) {
      expect(listed).toContain(reporterId);
    }
    // The flag is the same fact the desk shows, computed the same way.
    const spokenWith = peopleSpokenWith(world, player);
    for (const contact of view.contacts) {
      expect(contact.knownToYou).toBe(spokenWith.has(contact.reporterPersonId));
    }
  });

  it("names real reporters and says what each arrangement means", () => {
    expect(view.contacts.length).toBeGreaterThan(0);
    for (const contact of view.contacts) {
      expect(world.people[contact.reporterPersonId]).toBeTruthy();
      expect(contact.outletName).toBeTruthy();
      expect(contact.terms.map((entry) => entry.terms)).toEqual([
        "on-record",
        "background",
        "deep-background",
        "off-record",
      ]);
      const offRecord = contact.terms.find(
        (entry) => entry.terms === "off-record",
      )!;
      expect(offRecord.publiclyUsable).toBe(false);
      expect(offRecord.meaning).toBeTruthy();
      const background = contact.terms.find(
        (entry) => entry.terms === "background",
      )!;
      expect(background.needsAttributionLabel).toBe(true);
      for (const entry of contact.terms) {
        if (!entry.available) expect(entry.unavailableReason).toBeTruthy();
      }
    }
    expect(view.note).toMatch(/Terms are agreed before anything is said/);
    // Reading writes nothing.
    expect(serializeWorld(world)).toBe(serializeWorld(world));
  });

  it("offers only what this character actually knows or holds", () => {
    for (const record of view.tellable) {
      const event = world.history.events.find(
        (candidate) => candidate.id === record.id,
      )!;
      const known =
        event.involvedEntityIds.includes(player) ||
        world.history.knowledge.some(
          (entry) => entry.personId === player && entry.eventId === event.id,
        );
      expect(known).toBe(true);
    }
    // This character has discovered no records, so there is nothing to leak.
    expect(view.leakable).toEqual([]);
  });

  it("background without the agreed description is refused", () => {
    const contact = view.contacts[0]!;
    expect(() =>
      agreePressTerms(world, {
        personId: player,
        reporterPersonId: contact.reporterPersonId,
        outletId: contact.outletId,
        terms: "background",
      }),
    ).toThrow(/exact attribution/);
  });

  it("terms are agreed first, and only then is anything said", () => {
    const contact = view.contacts[0]!;
    const agreed = agreePressTerms(world, {
      personId: player,
      reporterPersonId: contact.reporterPersonId,
      outletId: contact.outletId,
      terms: "background",
      attributionLabel: "a person familiar with the matter",
    });
    expect(agreed.accepted).toBe(true);
    const agreementId = agreed.agreementId!;
    const agreement = agreementsKnownTo(agreed.world, player).find(
      (entry) => entry.id === agreementId,
    )!;
    expect(agreement.attributionLabel).toBe(
      "a person familiar with the matter",
    );
    expect(agreement.publiclyUsable).toBe(true);
    expect(agreement.attributable).toBe(true);
    // Nobody else is party to it.
    const reporterSees = agreementsKnownTo(
      agreed.world,
      contact.reporterPersonId,
    );
    expect(reporterSees.map((entry) => entry.id)).toContain(agreementId);
    const other = agreed.world.personOrder.find(
      (id) => id !== player && id !== contact.reporterPersonId,
    )!;
    expect(agreementsKnownTo(agreed.world, other)).toEqual([]);

    const told = tellReporter(agreed.world, {
      personId: player,
      agreementId,
      statement: "There is something worth looking at here.",
      subjectPersonIds: [],
      openLead: false,
    });
    const contributions = pressRecordsOfKind(told.world, "source-contribution");
    expect(contributions).toHaveLength(1);
    expect(contributions[0]!.leak).toBe(false);
    expect(contributions[0]!.agreementId).toBe(agreementId);
    assertWorldIntegrity(told.world);
  });

  it("nobody can hand over a record they have never seen", () => {
    const contact = view.contacts[0]!;
    const agreed = agreePressTerms(world, {
      personId: player,
      reporterPersonId: contact.reporterPersonId,
      outletId: contact.outletId,
      terms: "on-record",
    });
    const strangerArtifact = "evidence-artifact_not-theirs" as EntityId;
    expect(() =>
      tellReporter(agreed.world, {
        personId: player,
        agreementId: agreed.agreementId!,
        evidenceArtifactIds: [strangerArtifact],
      }),
    ).toThrow(/records they actually hold/);
    const strangerEvent = agreed.world.history.events.find(
      (event) =>
        !event.involvedEntityIds.includes(player) &&
        !agreed.world.history.knowledge.some(
          (entry) => entry.personId === player && entry.eventId === event.id,
        ),
    )!;
    expect(() =>
      tellReporter(agreed.world, {
        personId: player,
        agreementId: agreed.agreementId!,
        eventIds: [strangerEvent.id],
      }),
    ).toThrow(/only what they actually know/);
  });

  it("only the character being played talks to the press this way", () => {
    const contact = view.contacts[0]!;
    const observing: World = { ...world, control: { kind: "observer" } };
    expect(() =>
      agreePressTerms(observing, {
        personId: player,
        reporterPersonId: contact.reporterPersonId,
        outletId: contact.outletId,
        terms: "on-record",
      }),
    ).toThrow(/being played/);
  });
});
