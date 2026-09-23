import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId } from "../simulation";
import {
  BEREAVEMENT_NOTICE_EVENT,
  applyDeathNotices,
  relationWord,
} from "../simulation/people-bereavement";
import type { PersonDeathRecipientNotice } from "../simulation/people-bereavement";
import { recordFamilyAddition } from "../simulation/people-family";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { recordPersonDeath } from "../simulation/vitality";
import { letAdultTimePass } from "./adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * CRUNCH47 B1: a death in the family. CRISIS says who died; this proves what
 * the family comes to know, what is offered to the player, and what stays
 * private.
 *
 * The notices here are built by hand in the shape CRISIS publishes, so this
 * file proves B's own consumer without merging C's branch. The composed proof
 * against the real reader runs on the seam branch.
 */

function life(seed: string, startAge: number) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge }),
  ).game!;
}

function yearsBefore(date: string, years: number) {
  const [y, m, d] = date.split("-");
  return `${Number(y) - years}-${m}-${d === "29" && m === "02" ? "28" : d}`;
}

function notice(
  overrides: Partial<PersonDeathRecipientNotice> &
    Pick<
      PersonDeathRecipientNotice,
      "deathEventId" | "deathRecordId" | "personId" | "recipientPersonId"
    >,
): PersonDeathRecipientNotice {
  return {
    effectKey: `crisis:person-death:${overrides.deathRecordId}:${overrides.recipientPersonId}:${overrides.relationKind ?? "lineal:child"}`,
    sequence: 1,
    diedAt: "2026-01-01" as never,
    relationKind: "lineal:child",
    controlledPerson: false,
    causeKey: "cause:people-fixture",
    causeResolved: false,
    disclosable: false,
    disclosureRecordId: null,
    alreadyKnew: false,
    ...overrides,
  };
}

describe("PEOPLE B1: what a family learns when somebody dies", () => {
  const start = life("people-grief-a", 60);
  const player = start.playerPersonId;
  const opened = openOrdinaryLife(start.world, player);
  const first = recordFamilyAddition(opened, {
    kind: "birth",
    stableKey: "fixture:grief-child-1",
    occurredAt: yearsBefore(opened.currentDate, 34) as never,
    parentPersonIds: [player],
  });
  const second = recordFamilyAddition(first.world, {
    kind: "birth",
    stableKey: "fixture:grief-child-2",
    occurredAt: yearsBefore(opened.currentDate, 31) as never,
    parentPersonIds: [player],
  });
  const sibling = first.childPersonId;
  const other = second.childPersonId;
  const stranger = second.world.personOrder.find(
    (id) => id !== player && id !== sibling && id !== other,
  )!;
  const dead = recordPersonDeath(second.world, {
    stableKey: "fixture:grief-death",
    personId: sibling,
    diedAt: second.world.currentDate,
    causeKey: "cause:people-fixture",
    sourceEntityIds: [second.world.id],
    summary: "Died of a privately disclosed illness.",
    provenance: { kind: "authored", note: "PEOPLE bereavement fixture." },
  });
  const death = dead.history.personDeaths.find((d) => d.personId === sibling)!;
  const notices = [player, other].map((recipientPersonId) =>
    notice({
      deathEventId: death.eventId,
      deathRecordId: death.id,
      personId: sibling,
      recipientPersonId,
      diedAt: dead.currentDate,
      relationKind:
        recipientPersonId === player ? "lineal:parent" : "collateral:sibling",
    }),
  );
  const told = applyDeathNotices(dead, notices);

  it("tells each relative once, and nobody else", () => {
    const learned = told.history.events.filter(
      (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
    );
    expect(learned).toHaveLength(2);
    const knows = (personId: EntityId) =>
      told.history.knowledge.some(
        (entry) =>
          entry.personId === personId && entry.eventId === death.eventId,
      );
    expect(knows(player)).toBe(true);
    expect(knows(other)).toBe(true);
    expect(knows(stranger)).toBe(false);
    assertWorldIntegrity(told);
    // Re-reading the same notices writes nothing.
    expect(serializeWorld(applyDeathNotices(told, notices))).toBe(
      serializeWorld(told),
    );
  });

  it("keeps a private cause private, and says so where it was disclosed", () => {
    const believed = told.history.knowledge.find(
      (entry) => entry.personId === other && entry.eventId === death.eventId,
    )!;
    expect(believed.believedSummary).not.toContain("illness");
    expect(believed.believedSummary).toContain("died on");
    const openly = applyDeathNotices(
      dead,
      notices.map((entry) => ({
        ...entry,
        effectKey: `${entry.effectKey}:disclosed`,
        disclosable: true,
        causeResolved: true,
        disclosureRecordId: death.id,
      })),
    );
    const heard = openly.history.knowledge.find(
      (entry) => entry.personId === other && entry.eventId === death.eventId,
    )!;
    expect(heard.believedSummary).toContain("illness");
  });

  it("offers something to say, and nothing is required or measured", () => {
    const offered = letAdultTimePass(told, 1);
    const bound = sceneBindingsFor(offered, player, "home-evening").find(
      (entry) => entry.binding.variant === "bereaved",
    )!;
    expect(bound, "a bereavement scene is offered").toBeTruthy();
    const view = projectPlayerConversation(
      offered,
      player,
      "scene-home-evening",
    )!;
    expect(view.openingLine).toMatch(/keep thinking|doesn’t seem real/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "remember-them",
      "offer-help",
      "nothing-to-say",
      "leave-it",
    ]);
    // Nothing marked as a lie, nothing that costs time, nothing compulsory.
    expect(view.intents.every((intent) => !intent.truthIntent)).toBe(true);
    const said = commitConversationTurn(offered, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: view.addressee,
      audibility: view.audibility,
      intent: "remember-them",
    }).world;
    expect(said.currentMoment).toEqual(offered.currentMoment);
    const interaction = said.history.relationshipInteractions.at(-1)!;
    expect(interaction.kind).toBe("support:grieved-together");
    expect(interaction.change).toBe("strengthened");
    // Walking away from it leaves the world alone.
    const ignored = letAdultTimePass(offered, 3);
    expect(
      availablePlayerConversations(ignored, player).some(
        (entry) => entry.subject === "scene-home-evening",
      ),
    ).toBe(true);
    expect(serializeWorld(deserializeWorld(serializeWorld(said)))).toBe(
      serializeWorld(said),
    );
  });

  it("says a relation the way a person would", () => {
    expect(relationWord("lineal:parent")).toBe("parent");
    expect(relationWord("collateral:sibling")).toBe("sibling");
    expect(relationWord("household:member")).toBe("someone in the household");
  });

  it("a dead recipient is not told, and an already-told one is left alone", () => {
    const already = applyDeathNotices(
      told,
      notices.map((entry) => ({ ...entry, alreadyKnew: true })),
    );
    expect(serializeWorld(already)).toBe(serializeWorld(told));
    const gone = recordPersonDeath(told, {
      stableKey: "fixture:grief-death-2",
      personId: other,
      diedAt: told.currentDate,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [told.id],
      summary: "Also died.",
      provenance: { kind: "authored", note: "PEOPLE bereavement fixture." },
    });
    const late = applyDeathNotices(gone, [
      notice({
        deathEventId: death.eventId,
        deathRecordId: death.id,
        personId: sibling,
        recipientPersonId: other,
        effectKey: "crisis:person-death:late",
        diedAt: gone.currentDate,
      }),
    ]);
    expect(
      late.history.events.filter(
        (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
      ),
    ).toHaveLength(2);
  });

  it("tells the family by itself when days pass, so the grief scene can come", () => {
    // No hand-built notices: the death alone, then an ordinary day.
    const passed = letAdultTimePass(dead, 1);
    const learned = passed.history.events.filter(
      (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
    );
    const told = new Set(learned.flatMap((event) => event.involvedEntityIds));
    expect(told.has(player)).toBe(true);
    expect(told.has(other)).toBe(true);
    expect(
      sceneBindingsFor(passed, player, "home-evening").some(
        (entry) => entry.binding.variant === "bereaved",
      ),
      "a bereavement scene is offered",
    ).toBe(true);
    // Another day tells nobody twice.
    expect(
      letAdultTimePass(passed, 1).history.events.filter(
        (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
      ),
    ).toHaveLength(learned.length);
    assertWorldIntegrity(passed);
  });

  it("does not announce a death from before the game began", () => {
    const history = recordPersonDeath(second.world, {
      stableKey: "fixture:grief-old-death",
      personId: sibling,
      diedAt: yearsBefore(second.world.startedAt, 1) as never,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [second.world.id],
      summary: "Died the year before.",
      provenance: { kind: "authored", note: "PEOPLE bereavement fixture." },
    });
    expect(
      letAdultTimePass(history, 1).history.events.filter(
        (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
      ),
    ).toHaveLength(0);
  });
});
